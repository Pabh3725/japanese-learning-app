-- =============================================================================
-- LISTENING_V1 (docs/listening-rules.md, chủ dự án duyệt 2026-11-15): luyện nghe theo bài và thi thử phần nghe JLPT.
-- Không đổi điểm, lịch hay FSRS nào. Phiên lưu câu hỏi đã dựng (chấm ở server); nhật ký mỗi câu để tính tỷ lệ đúng.
-- Chỉ thêm; chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
create table if not exists public.listening_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind            text not null check (kind in ('lesson', 'jlpt_mock')),
  -- Theo bài: số bài Minna; thi thử: null
  lesson          smallint check (lesson between 1 and 50),
  -- Thi thử: N5 / N4; theo bài: null
  level           text check (level in ('N5', 'N4')),
  -- Theo bài: mix / sentence_meaning / reply / dictation; thi thử: mock
  mode            text not null check (char_length(mode) between 1 and 40),
  questions       jsonb not null check (jsonb_typeof(questions) = 'array'),
  -- {thứ tự câu: lựa chọn (số) hoặc chữ gõ}
  answers         jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  status          text not null default 'active' check (status in ('active', 'finished')),
  correct         smallint check (correct >= 0),
  -- Thi thử: điểm từng 問題 [{section, total, correct}]
  summary         jsonb,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  constraint listening_sessions_kind check ((kind = 'lesson') = (lesson is not null) and (kind = 'jlpt_mock') = (level is not null)),
  constraint listening_sessions_finished check ((status = 'finished') = (finished_at is not null and correct is not null))
);
comment on table public.listening_sessions is 'Luyện nghe: một phiên theo bài hoặc một đề thi thử phần nghe JLPT. Chấm ở server. Không đổi điểm hay lịch.';
create index if not exists listening_sessions_user_idx on public.listening_sessions (user_id, kind, started_at desc);

create table if not exists public.listening_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id      uuid not null references public.listening_sessions (id) on delete cascade,
  question_index  smallint not null check (question_index >= 0),
  kind            text not null check (kind in ('lesson', 'jlpt_mock')),
  lesson          smallint check (lesson between 1 and 50),
  level           text check (level in ('N5', 'N4')),
  type            text not null check (char_length(type) between 1 and 40),
  ref             text not null,
  correct         boolean not null,
  -- false: thiết bị không có giọng Nhật, làm ở chế độ đọc chữ; không tính vào tỷ lệ đúng
  with_audio      boolean not null default true,
  study_date      date not null,
  answered_at     timestamptz not null default now(),
  constraint listening_logs_once unique (session_id, question_index)
);
comment on table public.listening_logs is 'Luyện nghe: nhật ký mỗi câu, chỉ thêm. Dùng để tính tỷ lệ đúng theo bài, theo dạng và chọn câu thi thử chưa gặp.';
create index if not exists listening_logs_user_idx on public.listening_logs (user_id, kind, answered_at desc);

alter table public.listening_sessions enable row level security;
alter table public.listening_logs enable row level security;

drop policy if exists "Owner can read own listening sessions" on public.listening_sessions;
create policy "Owner can read own listening sessions" on public.listening_sessions for select to authenticated
using ( (select auth.uid()) = user_id );
drop policy if exists "Owner can insert own listening sessions" on public.listening_sessions;
create policy "Owner can insert own listening sessions" on public.listening_sessions for insert to authenticated
with check ( (select auth.uid()) = user_id );
drop policy if exists "Owner can update own listening sessions" on public.listening_sessions;
create policy "Owner can update own listening sessions" on public.listening_sessions for update to authenticated
using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );

drop policy if exists "Owner can read own listening logs" on public.listening_logs;
create policy "Owner can read own listening logs" on public.listening_logs for select to authenticated
using ( (select auth.uid()) = user_id );
drop policy if exists "Owner can insert own listening logs" on public.listening_logs;
create policy "Owner can insert own listening logs" on public.listening_logs for insert to authenticated
with check ( (select auth.uid()) = user_id );

revoke all on public.listening_sessions, public.listening_logs from anon;
revoke delete, truncate on public.listening_sessions, public.listening_logs from authenticated;
grant select, insert, update on public.listening_sessions to authenticated;
grant select, insert on public.listening_logs to authenticated;
