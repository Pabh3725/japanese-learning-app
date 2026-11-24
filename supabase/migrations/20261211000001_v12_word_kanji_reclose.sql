-- =============================================================================
-- Từ vựng Kanji (chủ dự án chốt 2026-11-24, phương án 1): thẻ Từ vựng Kanji còn đang học (Stage 1–3) được mở theo luật cũ
-- (chữ chỉ cần qua Stage 1) mà còn chữ N5–N4 chưa học xong thì trả về chưa mở; thẻ sẽ mở lại theo luật hiện tại khi mọi chữ
-- của từ học xong. Xóa mục kéo theo điểm loại thẻ và nhật ký trả lời của mục (on delete cascade).
-- Card ôn (stage 'review') không đổi: code tạm ẩn khỏi lượt ôn cho tới khi chữ học xong (wordKanjiWaiting, phương án b).
-- =============================================================================
-- Thẻ Từ vựng Kanji còn đang học (Stage 1–3) có chữ N5–N4 chưa học xong
with waiting as (
  select w.id
  from public.learner_items w
  join public.vocabulary_kanji vk on vk.vocabulary_id = w.vocabulary_id
  join public.kanji k on k.id = vk.kanji_id and k.jlpt_level in (4, 5)
  left join public.learner_items ki on ki.user_id = w.user_id and ki.area = 'kanji' and ki.kanji_id = k.id
  where w.area = 'word_kanji' and w.stage <> 'review' and w.known_at is null
    and not exists (select 1 from public.learner_vocabulary_exclusions e where e.user_id = w.user_id and e.vocabulary_id = w.vocabulary_id and e.excluded_at is not null)
    and not exists (select 1 from public.learner_kanji_exclusions e where e.user_id = w.user_id and e.kanji_id = k.id)
    and (ki.id is null or (ki.stage <> 'review' and ki.known_at is null))
  group by w.id
)
delete from public.learner_items where id in (select id from waiting);
