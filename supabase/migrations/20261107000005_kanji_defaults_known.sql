-- =============================================================================
-- Khu Kanji: mặc định 10 chữ mới, trần 100 câu; thêm "đã biết chữ này".
-- Chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
alter table public.learner_settings alter column kanji_new_per_day set default 10;
alter table public.learner_settings alter column kanji_cap set default 100;
-- Tài khoản còn giữ mặc định cũ thì chuyển sang mặc định mới; ai đã tự chỉnh thì giữ
update public.learner_settings set kanji_new_per_day = 10 where kanji_new_per_day = 5;
update public.learner_settings set kanji_cap = 100 where kanji_cap = 50;

create table if not exists public.learner_kanji_exclusions (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kanji_id    uuid not null references public.kanji (id) on delete restrict,
  created_at  timestamptz not null default now(),
  primary key (user_id, kanji_id)
);
comment on table public.learner_kanji_exclusions is
  'Chữ người học đã biết: rời khỏi khu Kanji. Khôi phục là xóa dòng, điểm và lịch trong learner_kanji còn nguyên.';

alter table public.learner_kanji_exclusions enable row level security;
drop policy if exists "Owner can read own kanji exclusions" on public.learner_kanji_exclusions;
create policy "Owner can read own kanji exclusions" on public.learner_kanji_exclusions for select to authenticated
using ( (select auth.uid()) = user_id );
drop policy if exists "Owner can insert own kanji exclusions" on public.learner_kanji_exclusions;
create policy "Owner can insert own kanji exclusions" on public.learner_kanji_exclusions for insert to authenticated
with check ( (select auth.uid()) = user_id );
drop policy if exists "Owner can delete own kanji exclusions" on public.learner_kanji_exclusions;
create policy "Owner can delete own kanji exclusions" on public.learner_kanji_exclusions for delete to authenticated
using ( (select auth.uid()) = user_id );

revoke all on public.learner_kanji_exclusions from anon;
grant select, insert, delete on public.learner_kanji_exclusions to authenticated;
