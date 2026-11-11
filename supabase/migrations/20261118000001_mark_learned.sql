-- =============================================================================
-- Đánh dấu "đã học" (chủ dự án yêu cầu 2026-11-12):
-- - Từ vựng: coi như đã xong nhánh Từ vựng Kana (Stage 1–3) và tạo Card Kana; nếu chính sách Kanji cho phép
--   thì xong luôn nhánh Từ vựng Kanji (Stage 4–6) và tạo Card Kanji. Từ không còn câu trong Learn.
--   Lần ôn đầu do server tính (rải từ ngày mai). Nút cũ "I already know these" (bỏ khỏi lộ trình, không Card) giữ nguyên.
-- - Ngữ pháp làm ở DAL (bảng learner_grammar), không cần hàm riêng.
-- Chỉ thêm; chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
create or replace function public.mark_words_learned(p_items jsonb, p_at timestamptz)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_item   jsonb;
  v_vocab  uuid;
  v_lv     uuid;
  v_kanji  boolean;
  v_count  integer := 0;
begin
  if v_uid is null then
    raise exception 'mark_words_learned: not authenticated' using errcode = '28000';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 1000 then
    raise exception 'mark_words_learned: p_items phải là mảng tối đa 1000 phần tử' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_vocab := (v_item ->> 'vocabulary_id')::uuid;
    v_kanji := coalesce((v_item ->> 'kanji')::boolean, false);
    continue when not exists (select 1 from public.vocabularies where id = v_vocab);

    -- Tiến độ của từ: nhánh Kana xong. Thêm mới với current_stage = 3 nên trigger mở Stage 2 không chạy.
    insert into public.learner_vocabulary (user_id, vocabulary_id, current_stage, learning_status, stage5_completed_at, kanji_intro_seen_at)
    values (v_uid, v_vocab, 3, 'initial_complete', p_at, case when v_kanji then p_at end)
    on conflict (user_id, vocabulary_id) do update
       set current_stage       = 3,
           learning_status     = 'initial_complete',
           stage5_completed_at = coalesce(public.learner_vocabulary.stage5_completed_at, p_at),
           kanji_intro_seen_at = case when v_kanji then coalesce(public.learner_vocabulary.kanji_intro_seen_at, p_at) else public.learner_vocabulary.kanji_intro_seen_at end,
           version             = public.learner_vocabulary.version + 1,
           updated_at          = p_at
    returning id into v_lv;

    -- Stage 2, 3 (và 5, 6 khi có Kanji) hoàn tất; stage đã có thì đóng lại, không đụng điểm cũ
    insert into public.learner_stage_schedules (user_id, learner_vocabulary_id, stage_number, unlocked_next_at, completed_at, due_at)
    select v_uid, v_lv, s, p_at, p_at, p_at
      from unnest(case when v_kanji then array[2, 3, 5, 6] else array[2, 3] end) as s
    on conflict (learner_vocabulary_id, stage_number) do update
       set unlocked_next_at = coalesce(public.learner_stage_schedules.unlocked_next_at, p_at),
           completed_at     = coalesce(public.learner_stage_schedules.completed_at, p_at),
           version          = public.learner_stage_schedules.version + 1,
           updated_at       = p_at;

    -- Card: chỉ tạo khi chưa có (Card đã có giữ nguyên lịch)
    insert into public.review_cards (user_id, learner_vocabulary_id, card_type, due_at)
    select v_uid, v_lv, 'vocab.kana', (v_item ->> 'kana_due')::timestamptz
     where not exists (select 1 from public.review_cards where learner_vocabulary_id = v_lv and card_type = 'vocab.kana');
    if v_kanji then
      insert into public.review_cards (user_id, learner_vocabulary_id, card_type, due_at)
      select v_uid, v_lv, 'vocab.kanji', (v_item ->> 'kanji_due')::timestamptz
       where not exists (select 1 from public.review_cards where learner_vocabulary_id = v_lv and card_type = 'vocab.kanji');
    end if;

    -- Từ đang bị loại khỏi lộ trình thì đưa về (giờ đã học, có Card)
    update public.learner_vocabulary_exclusions set excluded_at = null where user_id = v_uid and vocabulary_id = v_vocab and excluded_at is not null;
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('status', 'saved', 'marked', v_count);
end;
$$;

comment on function public.mark_words_learned is
  'Đánh dấu đã học: xong Stage 1–3 (và 4–6 nếu có Kanji), tạo Card Kana (và Card Kanji) với lần ôn đầu do server rải; một transaction.';

revoke execute on function public.mark_words_learned from public, anon;
grant execute on function public.mark_words_learned to authenticated;
