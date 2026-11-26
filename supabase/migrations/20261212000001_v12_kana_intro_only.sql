-- =============================================================================
-- Từ vựng Kana (chủ dự án chốt 2026-11-26): Intro 1 chỉ còn thẻ giới thiệu, không còn câu hỏi; Intro 2 giữ nguyên.
-- 1. Hàm v12_finish_intro: xem xong thẻ giới thiệu thì sang Stage 2 (từ ngày học kế tiếp) trong một transaction.
--    Luật tính ở lib/v12/stage.ts (finishIntro); hàm này chỉ ghi kết quả.
-- 2. Từ Kana đang ở Stage 1 đã xem thẻ giới thiệu: sang Stage 2 — từ hôm nay nếu đã xem trước hôm nay, từ ngày mai nếu
--    vừa xem hôm nay. Điểm Stage 1 cũ giữ trong bảng (app không đọc). Từ chưa xem thẻ giới thiệu giữ ở Stage 1.
-- =============================================================================
create or replace function public.v12_finish_intro(
  p_item_id          uuid,
  p_expected_version integer,
  p_at               timestamptz,
  p_stage_from       date,
  p_types            text[]
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'v12_finish_intro: not authenticated' using errcode = '28000';
  end if;
  update public.learner_items
     set stage = '2', stage_from = p_stage_from, intro_seen_at = coalesce(intro_seen_at, p_at), version = version + 1, updated_at = now()
   where id = p_item_id and user_id = v_uid and version = p_expected_version and stage = '1';
  if not found then
    return jsonb_build_object('status', 'conflict');
  end if;
  insert into public.learner_item_types (learner_item_id, user_id, stage, card_type)
  select p_item_id, v_uid, 2, t from unnest(coalesce(p_types, '{}'::text[])) as t
  on conflict (learner_item_id, stage, card_type) do nothing;
  return jsonb_build_object('status', 'saved');
end;
$$;
comment on function public.v12_finish_intro is 'V12: xem xong thẻ giới thiệu khi Stage 1 không có câu hỏi (Từ vựng Kana) — sang Stage 2 trong một transaction.';
revoke execute on function public.v12_finish_intro from public, anon;
grant execute on function public.v12_finish_intro to authenticated;

with today as (select (now() at time zone 'Asia/Ho_Chi_Minh')::date as d),
moved as (
  update public.learner_items li
     set stage = '2',
         stage_from = case when (li.intro_seen_at at time zone 'Asia/Ho_Chi_Minh')::date < today.d then today.d else today.d + 1 end,
         version = li.version + 1,
         updated_at = now()
    from today
   where li.area = 'kana' and li.stage = '1' and li.intro_seen_at is not null
  returning li.id, li.user_id
)
insert into public.learner_item_types (learner_item_id, user_id, stage, card_type)
select m.id, m.user_id, 2, t from moved m, unnest(array['listen_kana', 'meaning_kana']) as t
on conflict (learner_item_id, stage, card_type) do nothing;
