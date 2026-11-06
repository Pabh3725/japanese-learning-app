-- =============================================================================
-- VOC-05 · Xem xong Stage 3: mở Stage 4 và tạo card trong MỘT transaction
-- Nguồn: docs/learning-rules.md R1, R5; docs/PROJECT_SPEC.md §18.3.
--
-- Luật (stage mới, card nào) do lib/learning tính rồi truyền vào; hàm KHÔNG tự tính luật.
-- security invoker → RLS vẫn áp dụng. Chỉ thêm, chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
create or replace function public.complete_stage3(
  p_learner_vocabulary_id uuid,
  p_new_stage             smallint,
  p_answered_at           timestamptz,
  p_new_card_types        public.card_type[],
  p_new_cards_due_at      timestamptz
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
    raise exception 'complete_stage3: not authenticated' using errcode = '28000';
  end if;

  -- Chỉ từ của mình, đang ở đúng Stage 3. Gọi lại lần hai thì không còn khớp nên không ghi gì.
  update public.learner_vocabulary
     set current_stage = p_new_stage,
         last_practiced_at = p_answered_at,
         version = version + 1
   where id = p_learner_vocabulary_id
     and user_id = v_uid
     and learning_status = 'learning'
     and current_stage = 3;

  if not found then
    if exists (select 1 from public.learner_vocabulary
                where id = p_learner_vocabulary_id and user_id = v_uid) then
      return jsonb_build_object('status', 'stage_changed');
    end if;
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Lịch Stage 4: câu đầu đến hẹn ngay
  insert into public.learner_stage_schedules (user_id, learner_vocabulary_id, stage_number, due_at)
  values (v_uid, p_learner_vocabulary_id, p_new_stage, p_answered_at)
  on conflict (learner_vocabulary_id, stage_number) do nothing;

  insert into public.review_cards (user_id, learner_vocabulary_id, card_type, due_at)
  select v_uid, p_learner_vocabulary_id, t, p_new_cards_due_at
    from unnest(p_new_card_types) as t
  on conflict (learner_vocabulary_id, card_type) do nothing;

  return jsonb_build_object('status', 'saved');
end;
$$;

comment on function public.complete_stage3 is
  'VOC-05: xem xong thẻ Stage 3 → mở Stage 4 và tạo card trong một transaction.';

revoke execute on function public.complete_stage3 from public, anon;
grant  execute on function public.complete_stage3 to authenticated;
