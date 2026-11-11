-- =============================================================================
-- Grammar G2 (docs/grammar-rules.md, GRAMMAR_V1): nội dung ngữ pháp, tiến độ, nhật ký, bài kiểm tra, cài đặt.
-- - grammar_points, grammar_sentences: nội dung, chỉ pnpm seed ghi; người đăng nhập chỉ đọc mẫu đã duyệt.
-- - learner_grammar: mỗi mẫu một dòng khi đã xem thẻ: giai đoạn Học (điểm, buổi) rồi Card FSRS.
-- - grammar_logs: mọi câu (Học, Ôn, Luyện thêm, Kiểm tra). Chỉ Học đổi điểm, chỉ Ôn đổi FSRS.
-- - grammar_tests: bài kiểm tra (câu đã chọn, đáp án, điểm). Không đổi điểm hay lịch.
-- Hàm lưu câu (RPC) làm ở G4 cùng engine. Chỉ thêm; chạy lại nhiều lần vẫn an toàn.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Nội dung
-- ---------------------------------------------------------------------------
create table if not exists public.grammar_points (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique check (code ~ '^g[0-9]{2}-[0-9]{2}$'),
  lesson       smallint not null check (lesson between 1 and 50),
  sort_order   smallint not null check (sort_order > 0),
  pattern      text not null check (char_length(pattern) > 0),
  meaning_vi   text not null check (char_length(meaning_vi) > 0),
  explanation  text not null check (char_length(explanation) > 0),
  notes        text,
  approved     boolean not null default false,
  constraint grammar_points_lesson_order_key unique (lesson, sort_order)
);
comment on table public.grammar_points is 'Grammar: mẫu ngữ pháp theo bài Minna (1–50). Giải thích do Claude soạn; chỉ mẫu approved hiện cho người học.';

create table if not exists public.grammar_sentences (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^g[0-9]{2}-[0-9]{2}-s[0-9]{2}$'),
  point_id    uuid not null references public.grammar_points (id) on delete cascade,
  level       smallint not null check (level between 1 and 3),
  japanese    text not null check (char_length(japanese) > 0),
  -- [{t: chữ, r: cách đọc khi có Kanji}], ghép lại ra japanese
  pieces      jsonb not null check (jsonb_typeof(pieces) = 'array' and jsonb_array_length(pieces) > 0),
  meaning_vi  text not null check (char_length(meaning_vi) > 0),
  -- Mẫu dùng trong câu (code), gồm mẫu chính và mẫu cũ kết hợp
  uses        text[] not null default '{}',
  -- [{kind: particle|word|form, piece, accepted?, distractors, form?, dict?}]
  slots       jsonb not null default '[]'::jsonb check (jsonb_typeof(slots) = 'array'),
  -- Mảnh đầu của vế sau (dạng ghép hai vế)
  split       smallint check (split > 0),
  -- Câu hỏi / lời nói đi trước (dạng chọn câu đáp): {pieces, meaning}
  prompt      jsonb,
  sample      boolean not null default false,
  hidden      boolean not null default false
);
comment on table public.grammar_sentences is 'Grammar: câu gốc có đánh dấu, sinh 13 dạng bài. sample = một trong 5 câu chủ dự án duyệt; hidden = bị ẩn (báo lỗi hoặc đã bỏ khỏi file).';
create index if not exists grammar_sentences_point_idx on public.grammar_sentences (point_id, level);

alter table public.grammar_points enable row level security;
alter table public.grammar_sentences enable row level security;

drop policy if exists "Authenticated users can read approved grammar_points" on public.grammar_points;
create policy "Authenticated users can read approved grammar_points" on public.grammar_points for select to authenticated
using ( approved );
drop policy if exists "Authenticated users can read grammar_sentences" on public.grammar_sentences;
create policy "Authenticated users can read grammar_sentences" on public.grammar_sentences for select to authenticated
using ( not hidden and exists (select 1 from public.grammar_points p where p.id = point_id and p.approved) );

revoke all on public.grammar_points, public.grammar_sentences from anon;
revoke insert, update, delete, truncate on public.grammar_points, public.grammar_sentences from authenticated;
grant select on public.grammar_points, public.grammar_sentences to authenticated;

-- ---------------------------------------------------------------------------
-- Tiến độ
-- ---------------------------------------------------------------------------
create table if not exists public.learner_grammar (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  point_id        uuid not null references public.grammar_points (id) on delete restrict,
  phase           text not null default 'learning' check (phase in ('learning', 'review')),
  points          integer not null default 0 check (points >= 0),
  points_today    smallint not null default 0 check (points_today between 0 and 8),
  points_date     date,
  -- Lịch: giai đoạn Học là buổi kế tiếp (ngày 1, 2, 3, 5, 8); giai đoạn Ôn là FSRS tối đa 90 ngày
  state           smallint not null default 0 check (state between 0 and 3),
  due_at          timestamptz not null default now(),
  stability       double precision not null default 0 check (stability >= 0),
  difficulty      double precision not null default 0 check (difficulty >= 0),
  scheduled_days  integer not null default 0 check (scheduled_days >= 0),
  learning_steps  integer not null default 0 check (learning_steps >= 0),
  reps            integer not null default 0 check (reps >= 0),
  lapses          integer not null default 0 check (lapses >= 0),
  last_review_at  timestamptz,
  completed_at    timestamptz,
  archived_at     timestamptz,
  version         integer not null default 0,
  created_at      timestamptz not null default now(),

  constraint learner_grammar_user_point_key unique (user_id, point_id),
  constraint learner_grammar_learning_gap check (phase = 'review' or scheduled_days <= 3),
  constraint learner_grammar_review_completed check ((phase = 'review') = (completed_at is not null)),
  constraint learner_grammar_review_max_90 check (scheduled_days <= 90)
);
comment on table public.learner_grammar is 'Grammar: tiến độ từng mẫu. Có dòng nghĩa là đã xem thẻ giới thiệu.';
create index if not exists learner_grammar_user_due_idx on public.learner_grammar (user_id, due_at);

create table if not exists public.grammar_logs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  learner_grammar_id  uuid references public.learner_grammar (id) on delete cascade,
  point_id            uuid not null references public.grammar_points (id) on delete cascade,
  sentence_id         uuid not null references public.grammar_sentences (id) on delete cascade,
  client_event_id     uuid not null,
  mode                text not null check (mode in ('learning', 'review', 'practice', 'test')),
  exercise_type       text not null check (char_length(exercise_type) > 0),
  -- Bậc G1/G2/G3 khi Học (1–3)
  tier                smallint check (tier between 1 and 3),
  outcome             text not null check (outcome in ('correct', 'hint', 'wrong')),
  points              smallint not null default 0 check (points between -2 and 1),
  -- Ôn: các câu của một mẫu trong một lượt; Kiểm tra: id bài kiểm tra
  round_id            uuid,
  study_date          date not null,
  response_time_ms    integer check (response_time_ms >= 0),
  answered_at         timestamptz not null default now(),

  constraint grammar_logs_event_key unique (user_id, client_event_id),
  constraint grammar_logs_points_only_learning check (mode = 'learning' or points = 0),
  constraint grammar_logs_learner_required check (mode in ('practice', 'test') or learner_grammar_id is not null)
);
comment on table public.grammar_logs is 'Grammar: nhật ký mỗi câu. Chỉ thêm. Học đổi điểm, Ôn đổi FSRS (qua RPC ở G4); Luyện thêm và Kiểm tra không đổi gì.';
create index if not exists grammar_logs_point_idx on public.grammar_logs (user_id, point_id, answered_at desc);
create index if not exists grammar_logs_user_date_idx on public.grammar_logs (user_id, study_date);
create index if not exists grammar_logs_round_idx on public.grammar_logs (round_id) where round_id is not null;

create table if not exists public.grammar_tests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lessons         smallint[] not null check (cardinality(lessons) > 0),
  question_count  smallint not null check (question_count between 1 and 50),
  -- [{point_id, sentence_id, exercise, ...dữ liệu câu đã dựng}]
  questions       jsonb not null check (jsonb_typeof(questions) = 'array'),
  -- {thứ tự câu: đáp án đã chọn}
  answers         jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  status          text not null default 'active' check (status in ('active', 'finished', 'abandoned')),
  correct         smallint check (correct >= 0),
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  constraint grammar_tests_finished check ((status = 'finished') = (finished_at is not null and correct is not null))
);
comment on table public.grammar_tests is 'Grammar §9a: bài kiểm tra. Chỉ câu mức 3 của bài đã học xong mọi mẫu. Không đổi điểm hay lịch.';
create index if not exists grammar_tests_user_idx on public.grammar_tests (user_id, started_at desc);

alter table public.learner_grammar enable row level security;
alter table public.grammar_logs enable row level security;
alter table public.grammar_tests enable row level security;

drop policy if exists "Owner can read own learner_grammar" on public.learner_grammar;
create policy "Owner can read own learner_grammar" on public.learner_grammar for select to authenticated
using ( (select auth.uid()) = user_id );
drop policy if exists "Owner can insert own learner_grammar" on public.learner_grammar;
create policy "Owner can insert own learner_grammar" on public.learner_grammar for insert to authenticated
with check ( (select auth.uid()) = user_id );
drop policy if exists "Owner can update own learner_grammar" on public.learner_grammar;
create policy "Owner can update own learner_grammar" on public.learner_grammar for update to authenticated
using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );

drop policy if exists "Owner can read own grammar_logs" on public.grammar_logs;
create policy "Owner can read own grammar_logs" on public.grammar_logs for select to authenticated
using ( (select auth.uid()) = user_id );
drop policy if exists "Owner can insert own grammar_logs" on public.grammar_logs;
create policy "Owner can insert own grammar_logs" on public.grammar_logs for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and (learner_grammar_id is null or exists (select 1 from public.learner_grammar lg where lg.id = learner_grammar_id and lg.user_id = (select auth.uid())))
);

drop policy if exists "Owner can read own grammar_tests" on public.grammar_tests;
create policy "Owner can read own grammar_tests" on public.grammar_tests for select to authenticated
using ( (select auth.uid()) = user_id );
drop policy if exists "Owner can insert own grammar_tests" on public.grammar_tests;
create policy "Owner can insert own grammar_tests" on public.grammar_tests for insert to authenticated
with check ( (select auth.uid()) = user_id );
drop policy if exists "Owner can update own grammar_tests" on public.grammar_tests;
create policy "Owner can update own grammar_tests" on public.grammar_tests for update to authenticated
using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );

revoke all on public.learner_grammar, public.grammar_logs, public.grammar_tests from anon;
revoke delete, truncate on public.learner_grammar, public.grammar_logs, public.grammar_tests from authenticated;
revoke update on public.grammar_logs from authenticated;
grant select, insert, update on public.learner_grammar, public.grammar_tests to authenticated;
grant select, insert on public.grammar_logs to authenticated;

-- ---------------------------------------------------------------------------
-- Cài đặt (§11)
-- ---------------------------------------------------------------------------
alter table public.learner_settings add column if not exists grammar_new_per_day smallint not null default 1 check (grammar_new_per_day between 1 and 3);
alter table public.learner_settings add column if not exists grammar_review_cap smallint not null default 20 check (grammar_review_cap between 5 and 50);
alter table public.learner_settings add column if not exists grammar_furigana boolean not null default true;
comment on column public.learner_settings.grammar_new_per_day is 'Grammar: số mẫu mới mỗi ngày (1–3).';
comment on column public.learner_settings.grammar_review_cap is 'Grammar: số mẫu ôn tối đa mỗi ngày (5–50).';
comment on column public.learner_settings.grammar_furigana is 'Grammar: hiện furigana trên Kanji.';
