-- =============================================================================
-- Từ vựng Kana (chủ dự án chốt 2026-11-26, lần 2): khôi phục Intro 1 (Kana → nghĩa · nghĩa → Kana); xong Intro 1 thì
-- Intro 2 học luôn trong ngày. Từ Kana đã bị chuyển thẳng sang Stage 2 hôm 2026-11-26 (migration 20261212000001 hoặc
-- v12_finish_intro) mà chưa đúng đủ hai câu Intro 1 thì trả về Stage 1 từ hôm nay. Không xóa dữ liệu: điểm Intro 1 đã có
-- giữ nguyên; dòng điểm Intro 2 vẫn nằm trong bảng.
-- Nhận diện: Stage 2, cập nhật từ 2026-11-26 (hai đường trên đặt updated_at; câu trả lời thường không đổi updated_at).
-- Hàm v12_finish_intro giữ lại (không còn dùng) để bản deploy cũ vẫn chạy được trong lúc chuyển.
-- =============================================================================
update public.learner_items li
   set stage = '1',
       stage_from = (now() at time zone 'Asia/Ho_Chi_Minh')::date,
       version = li.version + 1,
       updated_at = now()
 where li.area = 'kana'
   and li.stage = '2'
   and li.updated_at >= timestamptz '2026-11-26 00:00+07'
   and (select count(*) from public.learner_item_types t
         where t.learner_item_id = li.id and t.stage = 1 and t.points >= 1 and t.card_type in ('kana_meaning', 'meaning_kana')) < 2;
