-- =============================================================================
-- Lộ trình mới: Từ vựng (1 → 2 → 5), Từ Kanji (3 → 4 → 6), Kanji. Mỗi từ tối đa 2 Card.
-- Không bỏ Card theo điểm, không còn điểm Card (các cột cũ giữ lại, không dùng nữa).
-- Chỉ thêm và mở rộng ràng buộc, chạy lại nhiều lần vẫn an toàn.
-- Xóa tiến độ thử nghiệm là bước riêng: supabase/scripts/path-v2-reset.sql.
-- =============================================================================
alter type public.card_type add value if not exists 'vocab.kana';
alter type public.card_type add value if not exists 'vocab.kanji';

alter table public.learner_stage_schedules drop constraint if exists learner_stage_schedules_stage_number_check;
alter table public.learner_stage_schedules add constraint learner_stage_schedules_stage_number_check check (stage_number in (2, 4, 5, 6));
alter table public.exercise_logs drop constraint if exists exercise_logs_stage_number_check;
alter table public.exercise_logs add constraint exercise_logs_stage_number_check check (stage_number between 1 and 6);

alter table public.learner_settings add column if not exists word_kanji_cap smallint not null default 100 check (word_kanji_cap between 10 and 1000);

-- Cấp đang học của từng kỹ năng. Không có dòng nghĩa là N5.
create table if not exists public.learner_skill_levels (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  skill      text not null check (skill in ('vocabulary', 'word_kanji', 'kanji')),
  jlpt_level smallint not null default 5 check (jlpt_level between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, skill)
);
comment on table public.learner_skill_levels is 'Mỗi kỹ năng có cấp riêng; học xong mục mới của cấp thì app hỏi rồi mới mở cấp sau.';

alter table public.learner_skill_levels enable row level security;
drop policy if exists "Owner can read own skill levels" on public.learner_skill_levels;
create policy "Owner can read own skill levels" on public.learner_skill_levels for select to authenticated
using ( (select auth.uid()) = user_id );
drop policy if exists "Owner can insert own skill levels" on public.learner_skill_levels;
create policy "Owner can insert own skill levels" on public.learner_skill_levels for insert to authenticated
with check ( (select auth.uid()) = user_id );
drop policy if exists "Owner can update own skill levels" on public.learner_skill_levels;
create policy "Owner can update own skill levels" on public.learner_skill_levels for update to authenticated
using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );
revoke all on public.learner_skill_levels from anon;
grant select, insert, update on public.learner_skill_levels to authenticated;

-- Từ đã đủ điều kiện: xem xong thẻ Kanji của từ thì mở Stage 4. Gọi lại vẫn chỉ áp dụng một lần.
create or replace function public.open_word_kanji(p_learner_vocabulary_id uuid, p_seen_at timestamptz)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'open_word_kanji: not authenticated' using errcode = '28000';
  end if;
  update public.learner_vocabulary
     set kanji_intro_seen_at = coalesce(kanji_intro_seen_at, p_seen_at),
         version = version + 1
   where id = p_learner_vocabulary_id and user_id = v_uid;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  insert into public.learner_stage_schedules (user_id, learner_vocabulary_id, stage_number, due_at)
  values (v_uid, p_learner_vocabulary_id, 4, p_seen_at)
  on conflict (learner_vocabulary_id, stage_number) do nothing;
  return jsonb_build_object('status', 'saved');
end;
$$;
revoke execute on function public.open_word_kanji from public, anon;
grant  execute on function public.open_word_kanji to authenticated;

-- current_stage chỉ theo kỹ năng Từ vựng (tối đa 5). Mở Stage 6 không đổi current_stage.
do $$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'submit_stage_exercise';
  v_def := replace(v_def,
    'greatest(current_stage, coalesce(p_unlocked_stage, current_stage))',
    'least(5, greatest(current_stage, coalesce(p_unlocked_stage, current_stage)))');
  execute v_def;
end;
$$;
