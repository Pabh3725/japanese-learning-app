-- =============================================================================
-- JLPT_V1 (docs/jlpt-rules.md, chủ dự án duyệt 2026-11-14): ôn thi JLPT N5/N4 theo dạng bài.
-- Không đổi điểm, lịch hay FSRS nào. Phiên lưu câu hỏi đã dựng (chấm ở server); nhật ký mỗi câu để tính tỷ lệ đúng.
-- Chỉ thêm; chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
create table if not exists public.jlpt_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  level           text not null check (level in ('N5', 'N4')),
  types           text[] not null check (cardinality(types) > 0),
  scope           text not null check (scope in ('all', 'learned')),
  -- [{type, ref, instruction, stem, options, answer, explanation, audio?}]
  questions       jsonb not null check (jsonb_typeof(questions) = 'array'),
  -- {thứ tự câu: lựa chọn đã chọn}
  answers         jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  status          text not null default 'active' check (status in ('active', 'finished')),
  correct         smallint check (correct >= 0),
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  constraint jlpt_sessions_finished check ((status = 'finished') = (finished_at is not null and correct is not null))
);
comment on table public.jlpt_sessions is 'JLPT: một phiên ôn. Câu hỏi dựng sẵn ở server, chấm ở server. Không đổi điểm hay lịch.';
create index if not exists jlpt_sessions_user_idx on public.jlpt_sessions (user_id, started_at desc);

create table if not exists public.jlpt_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id      uuid not null references public.jlpt_sessions (id) on delete cascade,
  question_index  smallint not null check (question_index >= 0),
  level           text not null check (level in ('N5', 'N4')),
  type            text not null check (char_length(type) between 1 and 40),
  ref             text not null,
  correct         boolean not null,
  study_date      date not null,
  answered_at     timestamptz not null default now(),
  constraint jlpt_logs_once unique (session_id, question_index)
);
comment on table public.jlpt_logs is 'JLPT: nhật ký mỗi câu, chỉ thêm. Dùng để tính tỷ lệ đúng từng dạng.';
create index if not exists jlpt_logs_user_idx on public.jlpt_logs (user_id, level, type, answered_at desc);

alter table public.jlpt_sessions enable row level security;
alter table public.jlpt_logs enable row level security;

drop policy if exists "Owner can read own jlpt sessions" on public.jlpt_sessions;
create policy "Owner can read own jlpt sessions" on public.jlpt_sessions for select to authenticated
using ( (select auth.uid()) = user_id );
drop policy if exists "Owner can insert own jlpt sessions" on public.jlpt_sessions;
create policy "Owner can insert own jlpt sessions" on public.jlpt_sessions for insert to authenticated
with check ( (select auth.uid()) = user_id );
drop policy if exists "Owner can update own jlpt sessions" on public.jlpt_sessions;
create policy "Owner can update own jlpt sessions" on public.jlpt_sessions for update to authenticated
using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );

drop policy if exists "Owner can read own jlpt logs" on public.jlpt_logs;
create policy "Owner can read own jlpt logs" on public.jlpt_logs for select to authenticated
using ( (select auth.uid()) = user_id );
drop policy if exists "Owner can insert own jlpt logs" on public.jlpt_logs;
create policy "Owner can insert own jlpt logs" on public.jlpt_logs for insert to authenticated
with check ( (select auth.uid()) = user_id );

revoke all on public.jlpt_sessions, public.jlpt_logs from anon;
revoke delete, truncate on public.jlpt_sessions, public.jlpt_logs from authenticated;
grant select, insert, update on public.jlpt_sessions to authenticated;
grant select, insert on public.jlpt_logs to authenticated;
