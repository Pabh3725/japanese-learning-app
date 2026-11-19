-- =============================================================================
-- V12: nút "Learned" trên mỗi thẻ (chủ dự án yêu cầu 2026-11-19). Chọn "có ôn" thì đưa mục sang Card ngay
-- (Card đến hạn ngày học kế tiếp); chọn "không ôn" thì app đánh dấu "đã biết" (bảng exclusions / known_at), không qua hàm này.
-- Một transaction cho cả mục và Card. Chỉ thêm hàm.
-- =============================================================================
create or replace function public.v12_mark_item_learned(p_item_id uuid, p_cards text[], p_due timestamptz, p_stage_from date)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_type text;
begin
  if v_uid is null then
    raise exception 'v12_mark_item_learned: not authenticated' using errcode = '28000';
  end if;
  update public.learner_items
     set stage = 'review', stage_from = p_stage_from, known_at = null, intro_seen_at = coalesce(intro_seen_at, now()),
         version = version + 1, updated_at = now()
   where id = p_item_id and user_id = v_uid and stage <> 'review';
  if not found then
    return jsonb_build_object('status', 'unchanged');
  end if;
  foreach v_type in array p_cards loop
    insert into public.item_cards (user_id, learner_item_id, card_type, due_at)
    values (v_uid, p_item_id, v_type, p_due)
    on conflict (learner_item_id, card_type) do nothing;
  end loop;
  return jsonb_build_object('status', 'saved');
end;
$$;
comment on function public.v12_mark_item_learned is 'V12: nút Learned → có ôn: mục sang Card ngay (Card đến hạn ngày học kế tiếp).';
revoke execute on function public.v12_mark_item_learned from public, anon;
grant execute on function public.v12_mark_item_learned to authenticated;
