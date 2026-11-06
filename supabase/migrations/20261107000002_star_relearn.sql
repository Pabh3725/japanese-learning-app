-- =============================================================================
-- Dấu sao và học lại, thay cho danh sách từ yếu (OD-10, 2026-11-07).
-- - learner_vocabulary_stars: từ người học muốn học lâu hơn; bỏ sao là xóa dòng.
-- - relearn_card: đưa Card về đến hạn ngay. Không đổi các trường FSRS khác và điểm Card.
-- - relearn_stage: mở lại stage đã hoàn tất, lùi điểm. Card đã có giữ nguyên.
-- Chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
create table if not exists public.learner_vocabulary_stars (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vocabulary_id  uuid not null references public.vocabularies (id) on delete restrict,
  starred_at     timestamptz not null default now(),

  primary key (user_id, vocabulary_id)
);
comment on table public.learner_vocabulary_stars is
  'Từ có dấu sao: Card ôn dày hơn và không bị bỏ. Có thể đánh dấu cả từ chưa gặp.';

alter table public.learner_vocabulary_stars enable row level security;

drop policy if exists "Owner can read own stars" on public.learner_vocabulary_stars;
create policy "Owner can read own stars"
on public.learner_vocabulary_stars for select to authenticated
using ( (select auth.uid()) = user_id );

drop policy if exists "Owner can insert own stars" on public.learner_vocabulary_stars;
create policy "Owner can insert own stars"
on public.learner_vocabulary_stars for insert to authenticated
with check ( (select auth.uid()) = user_id );

drop policy if exists "Owner can delete own stars" on public.learner_vocabulary_stars;
create policy "Owner can delete own stars"
on public.learner_vocabulary_stars for delete to authenticated
using ( (select auth.uid()) = user_id );

revoke all on public.learner_vocabulary_stars from anon;
grant select, insert, delete on public.learner_vocabulary_stars to authenticated;


create or replace function public.relearn_card(p_review_card_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'relearn_card: not authenticated' using errcode = '28000';
  end if;

  -- Card đã bỏ được đưa lại vào Review; đủ điểm thì sẽ bỏ lại sau lần ôn kế tiếp, trừ từ có sao
  update public.review_cards
     set due_at     = now(),
         retired_at = null,
         version    = version + 1
   where id = p_review_card_id
     and user_id = v_uid;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  return jsonb_build_object('status', 'saved');
end;
$$;

comment on function public.relearn_card is
  'Học lại Card: chỉ đổi due_at và retired_at, không đổi FSRS khác hay điểm Card.';

revoke execute on function public.relearn_card from public, anon;
grant  execute on function public.relearn_card to authenticated;


create or replace function public.relearn_stage(p_schedule_id uuid, p_stage_points integer)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_lv  uuid;
begin
  if v_uid is null then
    raise exception 'relearn_stage: not authenticated' using errcode = '28000';
  end if;

  update public.learner_stage_schedules
     set completed_at = null,
         stage_points = least(stage_points, p_stage_points),
         due_at       = now(),
         version      = version + 1
   where id = p_schedule_id
     and user_id = v_uid
     and completed_at is not null
  returning learner_vocabulary_id into v_lv;
  if not found then
    return jsonb_build_object('status', 'not_completed');
  end if;

  -- Từ đã xong lộ trình quay lại Learn. current_stage không lùi, Card đã có giữ nguyên.
  update public.learner_vocabulary
     set learning_status     = 'learning',
         stage5_completed_at = null,
         version             = version + 1
   where id = v_lv
     and user_id = v_uid;

  return jsonb_build_object('status', 'saved');
end;
$$;

comment on function public.relearn_stage is
  'Học lại Stage: mở lại stage đã hoàn tất và lùi điểm; không đổi current_stage và Card.';

revoke execute on function public.relearn_stage from public, anon;
grant  execute on function public.relearn_stage to authenticated;
