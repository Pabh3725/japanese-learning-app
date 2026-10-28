-- =============================================================================
-- DB-02 · Migration 1 — Schema cốt lõi
-- Nguồn: docs/database.md (DB-01, đã chốt 2026-10-23)
--
-- File này CHỈ tạo mới (create). Không có lệnh drop/xóa bảng nào.
-- RLS và policy nằm ở migration 2 (20261023000002_rls_policies.sql).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Hàm dùng chung: tự cập nhật cột updated_at mỗi khi một dòng bị sửa
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- =============================================================================
-- 1. NỘI DUNG (từ điển dùng chung, không có user_id)
-- =============================================================================

create table public.vocabularies (
  id            uuid primary key default gen_random_uuid(),
  expression    text not null check (char_length(expression) > 0),     -- 学校 hoặc これ
  reading_kana  text not null check (char_length(reading_kana) > 0),   -- がっこう
  meaning_vi    text not null check (char_length(meaning_vi) > 0),     -- Trường học
  romaji        text,                                                  -- gakkō (chỉ hỗ trợ phát âm)
  han_viet      text,                                                  -- HỌC HIỆU (cả từ)
  is_kana_only  boolean not null default false,
  jlpt_level    smallint not null check (jlpt_level between 1 and 5),  -- 5 = N5
  source        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Chống nhập trùng: cùng cách viết + cùng cách đọc là một từ
  constraint vocabularies_expression_reading_key unique (expression, reading_kana),
  -- Từ có Kanji bắt buộc có Hán Việt; từ chỉ có Kana thì không có Hán Việt
  constraint vocabularies_han_viet_required   check (is_kana_only or han_viet is not null),
  constraint vocabularies_kana_only_no_hanviet check (not is_kana_only or han_viet is null)
);
comment on table public.vocabularies is 'Từ điển từ vựng dùng chung. Không chứa tiến độ học.';


create table public.kanji (
  id            uuid primary key default gen_random_uuid(),
  character     text not null unique check (char_length(character) = 1),  -- 学
  han_viet      text not null,                                            -- HỌC
  meaning_vi    text not null,                                            -- Học tập
  onyomi        text[] not null default '{}',                             -- {ガク}
  kunyomi       text[] not null default '{}',                             -- {まな.ぶ}
  stroke_count  smallint check (stroke_count > 0),
  jlpt_level    smallint not null check (jlpt_level between 1 and 5),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.kanji is 'Từ điển Kanji dùng chung. Một Kanji có thể thuộc nhiều từ.';


create table public.vocabulary_kanji (
  vocabulary_id uuid not null references public.vocabularies (id) on delete cascade,
  position      smallint not null check (position >= 0),                  -- chữ thứ mấy trong từ (0, 1, ...)
  kanji_id      uuid not null references public.kanji (id) on delete restrict,
  primary key (vocabulary_id, position)
);
comment on table public.vocabulary_kanji is 'Nối từ với các Kanji của nó. 学校 → (0, 学), (1, 校).';

create index vocabulary_kanji_kanji_id_idx on public.vocabulary_kanji (kanji_id);


-- =============================================================================
-- 2. TIẾN ĐỘ CỦA NGƯỜI HỌC (mọi bảng có user_id để RLS hoạt động)
-- =============================================================================

create table public.learner_settings (
  user_id          uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  timezone         text not null default 'Asia/Ho_Chi_Minh',
  daily_new_limit  smallint check (daily_new_limit between 1 and 100),  -- giá trị mặc định chốt ở SET-01
  show_romaji      boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table public.learner_settings is 'Cài đặt của người học: quota từ mới, múi giờ, hiển thị romaji.';


create table public.learner_vocabulary (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vocabulary_id        uuid not null references public.vocabularies (id) on delete restrict,
  current_stage        smallint not null default 1 check (current_stage between 1 and 5),
  learning_status      text not null default 'learning'
                       check (learning_status in ('learning', 'initial_complete')),
  last_practiced_at    timestamptz,
  stage5_completed_at  timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint learner_vocabulary_user_vocabulary_key unique (user_id, vocabulary_id),
  -- "Hoàn thành vòng học đầu" khi và chỉ khi đã có thời điểm qua Stage 5
  constraint learner_vocabulary_complete_consistent
    check ((learning_status = 'initial_complete') = (stage5_completed_at is not null))
);
comment on table public.learner_vocabulary is 'Sổ theo dõi một từ của người học: Stage hiện tại. Chưa học = chưa có dòng.';

create index learner_vocabulary_user_status_idx on public.learner_vocabulary (user_id, learning_status);
create index learner_vocabulary_vocabulary_id_idx on public.learner_vocabulary (vocabulary_id);


create table public.learner_skill_progress (
  learner_vocabulary_id      uuid not null references public.learner_vocabulary (id) on delete cascade,
  skill_code                 text not null check (skill_code in ('meaning', 'kana', 'kanji', 'han_viet')),
  user_id                    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  attempts_total             integer not null default 0 check (attempts_total >= 0),
  correct_total              integer not null default 0 check (correct_total >= 0),
  independent_correct_total  integer not null default 0 check (independent_correct_total >= 0),
  weakness_score             numeric,                                  -- công thức chốt ở SMART-02
  updated_at                 timestamptz not null default now(),

  primary key (learner_vocabulary_id, skill_code),
  constraint learner_skill_progress_counts_valid
    check (correct_total <= attempts_total and independent_correct_total <= correct_total)
);
comment on table public.learner_skill_progress is 'Phong độ hiện tại của từng Skill (S1 meaning, S2 kana, S3 kanji, S4 han_viet). Số liệu tổng hợp; nguồn sự thật là lesson_attempts.';

create index learner_skill_progress_user_id_idx on public.learner_skill_progress (user_id);


create table public.checkpoint_completions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null default auth.uid() references auth.users (id) on delete cascade,
  learner_vocabulary_id  uuid not null references public.learner_vocabulary (id) on delete cascade,
  stage_number           smallint not null check (stage_number between 1 and 5),
  checkpoint_code        text not null check (checkpoint_code in (
                           'intro_viewed',                                   -- Stage 1
                           'kana_to_meaning', 'meaning_to_kana',             -- Stage 2
                           'kanji_hanviet_intro_viewed',                     -- Stage 3
                           'kanji', 'han_viet', 'reinforce_kana_meaning',    -- Stage 4
                           'recall_meaning', 'recall_kana',                  -- Stage 5
                           'recall_han_viet', 'recall_kanji'
                         )),
  rules_version          smallint not null default 1 check (rules_version >= 1),
  completed_at           timestamptz not null default now(),

  -- Không đạt cùng một checkpoint hai lần
  constraint checkpoint_completions_unique_key
    unique (learner_vocabulary_id, stage_number, checkpoint_code)
);
comment on table public.checkpoint_completions is 'Huy chương checkpoint đã đạt. Không sửa, không xóa.';

create index checkpoint_completions_user_id_idx on public.checkpoint_completions (user_id);


-- =============================================================================
-- 3. DAILY LESSONS
-- =============================================================================

create table public.lesson_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_goal   text,
  status        text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,

  constraint lesson_sessions_completed_has_time check (status <> 'completed' or completed_at is not null)
);
comment on table public.lesson_sessions is 'Một buổi Daily Lesson khoảng 5 phút.';

create index lesson_sessions_user_started_idx on public.lesson_sessions (user_id, started_at desc);


create table public.lesson_queue_items (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_session_id      uuid not null references public.lesson_sessions (id) on delete cascade,
  learner_vocabulary_id  uuid not null references public.learner_vocabulary (id) on delete cascade,
  position               integer not null check (position >= 0),
  stage_number           smallint not null check (stage_number between 1 and 5),
  skill_code             text check (skill_code in ('meaning', 'kana', 'kanji', 'han_viet')),  -- null với bài Introduction
  exercise_type          text not null check (exercise_type in
                           ('intro', 'choice', 'assembly', 'flashcard_recall', 'free_recall')),
  payload                jsonb not null default '{}'::jsonb,   -- đề + đáp án; server KHÔNG gửi đáp án xuống client
  status                 text not null default 'pending' check (status in ('pending', 'answered', 'skipped')),
  created_at             timestamptz not null default now(),

  constraint lesson_queue_items_session_position_key unique (lesson_session_id, position)
);
comment on table public.lesson_queue_items is 'Câu hỏi được Learning Queue giao trong một Lesson.';

create index lesson_queue_items_user_id_idx on public.lesson_queue_items (user_id);
create index lesson_queue_items_learner_vocabulary_id_idx on public.lesson_queue_items (learner_vocabulary_id);


create table public.lesson_attempts (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_queue_item_id   uuid not null references public.lesson_queue_items (id) on delete cascade,
  client_event_id        uuid not null,                                   -- chống bấm hai lần
  answer_text            text,
  is_correct             boolean not null,
  used_hint              boolean not null default false,
  revealed_answer        boolean not null default false,
  counts_as_independent  boolean not null default false,                  -- server tính
  response_time_ms       integer check (response_time_ms >= 0),
  attempted_at           timestamptz not null default now(),

  constraint lesson_attempts_event_key unique (user_id, client_event_id),
  -- Luật V6: lượt "đúng độc lập" phải đúng, không hint, không xem đáp án
  constraint lesson_attempts_independent_valid
    check (not counts_as_independent or (is_correct and not used_hint and not revealed_answer))
);
comment on table public.lesson_attempts is 'Mỗi lần trả lời trong Lesson. Chỉ thêm, không sửa.';

create index lesson_attempts_queue_item_id_idx on public.lesson_attempts (lesson_queue_item_id);
create index lesson_attempts_user_attempted_idx on public.lesson_attempts (user_id, attempted_at desc);


create table public.xp_events (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_session_id  uuid not null references public.lesson_sessions (id) on delete cascade,
  client_event_id    uuid not null,
  points             integer not null check (points >= 0),
  earned_at          timestamptz not null default now(),

  constraint xp_events_event_key unique (user_id, client_event_id)
);
comment on table public.xp_events is 'Các lần cộng XP từ Lesson. Chỉ thêm.';

create index xp_events_lesson_session_id_idx on public.xp_events (lesson_session_id);


-- =============================================================================
-- 4. FSRS REVIEW
-- =============================================================================

create table public.review_cards (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null default auth.uid() references auth.users (id) on delete cascade,
  learner_vocabulary_id  uuid not null references public.learner_vocabulary (id) on delete cascade,
  skill_code             text not null check (skill_code in ('meaning', 'kana', 'kanji', 'han_viet')),
  -- Trường FSRS (theo kiểu Card của ts-fsrs; xác minh lại ở SRS-01)
  state                  smallint not null default 0 check (state between 0 and 3),  -- 0 New, 1 Learning, 2 Review, 3 Relearning
  due_at                 timestamptz not null default now(),
  stability              double precision not null default 0 check (stability >= 0),
  difficulty             double precision not null default 0 check (difficulty >= 0),
  elapsed_days           integer not null default 0 check (elapsed_days >= 0),
  scheduled_days         integer not null default 0 check (scheduled_days >= 0),
  learning_steps         integer not null default 0 check (learning_steps >= 0),
  reps                   integer not null default 0 check (reps >= 0),
  lapses                 integer not null default 0 check (lapses >= 0),
  last_review_at         timestamptz,
  version                integer not null default 0 check (version >= 0),  -- chống hai thiết bị ghi đè nhau
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  -- Mỗi từ tối đa một thẻ cho mỗi Skill (số thẻ thật sự tạo: PENDING, OD-02)
  constraint review_cards_vocabulary_skill_key unique (learner_vocabulary_id, skill_code)
);
comment on table public.review_cards is 'Thẻ Official Review và lịch FSRS hiện tại. Chỉ Official Review được cập nhật.';

create index review_cards_user_due_idx on public.review_cards (user_id, due_at);


create table public.review_logs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  review_card_id    uuid not null references public.review_cards (id) on delete cascade,
  client_event_id   uuid not null,
  rating            smallint not null check (rating between 1 and 4),        -- 1 Again, 2 Hard, 3 Good, 4 Easy
  state_before      smallint not null check (state_before between 0 and 3),
  due_before        timestamptz,
  due_after         timestamptz not null,
  stability_after   double precision not null check (stability_after >= 0),
  difficulty_after  double precision not null check (difficulty_after >= 0),
  reviewed_at       timestamptz not null default now(),

  constraint review_logs_event_key unique (user_id, client_event_id)
);
comment on table public.review_logs is 'Nhật ký mỗi lần ôn. Chỉ thêm, ghi cùng transaction với review_cards.';

create index review_logs_card_reviewed_idx on public.review_logs (review_card_id, reviewed_at desc);


-- =============================================================================
-- 5. PRACTICE / MINI-GAMES (không có đường nối nào tới review_cards)
-- =============================================================================

create table public.practice_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  game_code         text not null check (game_code in (
                      'speed_matching', 'vocab_matching', 'kana_assembly',
                      'kanji_assembly', 'han_viet_assembly', 'recall_challenge'
                    )),
  focus_skill_code  text check (focus_skill_code in ('meaning', 'kana', 'kanji', 'han_viet')),
  settings          jsonb,
  score             integer check (score >= 0),
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,

  constraint practice_sessions_end_after_start check (ended_at is null or ended_at >= started_at)
);
comment on table public.practice_sessions is 'Một lần chơi mini-game. Không ảnh hưởng FSRS.';

create index practice_sessions_user_started_idx on public.practice_sessions (user_id, started_at desc);


create table public.practice_attempts (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  practice_session_id  uuid not null references public.practice_sessions (id) on delete cascade,
  vocabulary_id        uuid not null references public.vocabularies (id) on delete restrict,
  client_event_id      uuid not null,
  skill_code           text not null check (skill_code in ('meaning', 'kana', 'kanji', 'han_viet')),
  is_correct           boolean not null,
  response_time_ms     integer check (response_time_ms >= 0),
  attempted_at         timestamptz not null default now(),

  constraint practice_attempts_event_key unique (user_id, client_event_id)
);
comment on table public.practice_attempts is 'Mỗi lượt trong mini-game. Chỉ thêm.';

create index practice_attempts_session_id_idx on public.practice_attempts (practice_session_id);
create index practice_attempts_vocabulary_id_idx on public.practice_attempts (vocabulary_id);


-- =============================================================================
-- 6. Trigger updated_at
-- =============================================================================

create trigger set_updated_at before update on public.vocabularies
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.kanji
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.learner_settings
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.learner_vocabulary
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.learner_skill_progress
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.review_cards
  for each row execute function public.set_updated_at();
