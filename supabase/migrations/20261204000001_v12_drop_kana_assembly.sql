-- =============================================================================
-- V12 (chủ dự án chốt 2026-11-19): bỏ loại thẻ ghép Kana (kana_assembly) ở Intro 2 của Từ vựng Kana;
-- ghép chữ chỉ còn ở Từ vựng Kanji (word_assembly, Intro 2 — app tự thêm cho mục đang ở Intro 2, bắt đầu 0 điểm).
-- Mục Kana đang ở Intro 2 đã đủ điểm ba loại còn lại (chỉ còn thiếu ghép Kana) thì sang Intro 3 từ ngày học kế tiếp,
-- như khi vừa xong Intro 2; nếu không sẽ kẹt vì không còn câu nào để trả lời. Dòng điểm kana_assembly giữ nguyên (chỉ đọc).
-- =============================================================================
with done as (
  select li.id, li.user_id
    from public.learner_items li
   where li.area = 'kana' and li.stage = '2' and li.known_at is null
     and (select count(*) from public.learner_item_types t
           where t.learner_item_id = li.id and t.stage = 2 and t.points >= 3
             and t.card_type in ('kana_meaning', 'meaning_kana', 'listen_kana')) = 3
), moved as (
  update public.learner_items li
     set stage = '3', stage_from = ((now() at time zone 'Asia/Ho_Chi_Minh')::date + 1), version = li.version + 1, updated_at = now()
    from done
   where li.id = done.id
  returning li.id, li.user_id
)
insert into public.learner_item_types (learner_item_id, user_id, stage, card_type)
select moved.id, moved.user_id, 3, t
  from moved, unnest(array['meaning_type_kana', 'listen_type_kana', 'kana_meaning']) as t
on conflict (learner_item_id, stage, card_type) do nothing;
