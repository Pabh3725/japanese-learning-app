-- =============================================================================
-- Grammar G5: Thể động từ — nhật ký luyện chia (chỉ luyện, không lịch, không điểm; docs/grammar-rules.md §10).
-- Danh sách động từ / tính từ và quy tắc chia nằm trong code (data/n5/verbs.json, lib/verbs), không cần bảng nội dung.
-- Chỉ thêm; chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
create table if not exists public.verb_practice_logs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vocabulary_id    uuid not null references public.vocabularies (id) on delete cascade,
  form             text not null check (char_length(form) between 1 and 20),
  exercise_type    text not null check (exercise_type in ('type', 'choose', 'recognize', 'reverse')),
  outcome          text not null check (outcome in ('correct', 'wrong')),
  client_event_id  uuid not null,
  study_date       date not null,
  response_time_ms integer check (response_time_ms >= 0),
  answered_at      timestamptz not null default now(),
  constraint verb_practice_logs_event_key unique (user_id, client_event_id)
);
comment on table public.verb_practice_logs is 'Grammar G5: mỗi câu luyện chia động từ / tính từ. Chỉ thêm; không đổi điểm hay lịch nào.';
create index if not exists verb_practice_logs_user_idx on public.verb_practice_logs (user_id, answered_at desc);

alter table public.verb_practice_logs enable row level security;
drop policy if exists "Owner can read own verb_practice_logs" on public.verb_practice_logs;
create policy "Owner can read own verb_practice_logs" on public.verb_practice_logs for select to authenticated
using ( (select auth.uid()) = user_id );
drop policy if exists "Owner can insert own verb_practice_logs" on public.verb_practice_logs;
create policy "Owner can insert own verb_practice_logs" on public.verb_practice_logs for insert to authenticated
with check ( (select auth.uid()) = user_id );

revoke all on public.verb_practice_logs from anon;
revoke update, delete, truncate on public.verb_practice_logs from authenticated;
grant select, insert on public.verb_practice_logs to authenticated;
