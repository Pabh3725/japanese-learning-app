-- =============================================================================
-- Từ vựng Kanji trọng tâm Hán Việt (chủ dự án chốt 2026-11-26), loại câu ở lib/v12/card-types.ts:
--   Intro 1: từ → Hán Việt · từ → nghĩa (như cũ); xong thì Intro 2 học luôn trong ngày;
--   Intro 2: nghĩa → chọn Hán Việt · Hán Việt → chọn từ (bỏ "nghĩa → chọn từ" và ghép chữ);
--   Intro 3: nghĩa (kèm cách đọc) → gõ Hán Việt (thay cho "từ → gõ Hán Việt").
-- Từ đang ở Stage 3: điểm câu "từ → gõ Hán Việt" chuyển sang "nghĩa → gõ Hán Việt" (cùng kỹ năng gõ Hán Việt).
-- Loại câu cũ giữ trong bảng (app không đọc); "nghĩa → chọn Hán Việt" ở Stage 2 bắt đầu từ 0 điểm.
-- Từ chỉ gồm đúng 1 chữ Kanji không còn thẻ Từ vựng Kanji: app tạm ẩn, không đổi dữ liệu.
-- =============================================================================
insert into public.learner_item_types (learner_item_id, user_id, stage, card_type, points, seen_date, seen_today, wrong_today)
select t.learner_item_id, t.user_id, 3, 'meaning_type_hanviet', t.points, t.seen_date, t.seen_today, t.wrong_today
  from public.learner_item_types t
  join public.learner_items li on li.id = t.learner_item_id
 where li.area = 'word_kanji' and li.stage = '3' and t.stage = 3 and t.card_type = 'word_type_hanviet'
on conflict (learner_item_id, stage, card_type) do nothing;
