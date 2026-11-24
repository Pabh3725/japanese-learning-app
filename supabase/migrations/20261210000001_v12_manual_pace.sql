-- =============================================================================
-- Settings (chủ dự án chốt 2026-11-24): bỏ cân bằng — người học tự nhập số mục mới mỗi ngày của từng khu
-- (Settings đề xuất số chữ / từ Kanji để xong cùng lúc với Kana và ước tính bao lâu nữa xong); Grammar tự nhập số mẫu mỗi ngày.
-- Người đang cân bằng theo tổng số mục (balance_items) được đổi sang số riêng từng khu theo tỉ lệ khối lượng N5 còn lại
-- (~75% từ Kana, ~10% chữ Kanji, ~15% từ Kanji). Cột cân bằng giữ nguyên (không dùng nữa).
-- =============================================================================
update public.learner_settings
   set v12_new_kana       = greatest(1, least(50, round(balance_items * 0.75)::int)),
       v12_new_kanji      = greatest(1, least(50, round(balance_items * 0.10)::int)),
       v12_new_word_kanji = greatest(1, least(50, round(balance_items * 0.15)::int))
 where balance_on;

update public.learner_settings set balance_on = false where balance_on;
update public.learner_settings set grammar_balance_on = false where grammar_balance_on;

alter table public.learner_settings alter column balance_on set default false;
alter table public.learner_settings alter column v12_new_kana set default 10;
alter table public.learner_settings alter column v12_new_kanji set default 2;
alter table public.learner_settings alter column v12_new_word_kanji set default 2;
