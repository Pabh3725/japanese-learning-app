-- =============================================================================
-- Grammar: mẫu ngữ pháp mới mỗi ngày nới từ 1–3 lên 1–10 (chủ dự án duyệt 2026-11-14).
-- Chỉ đổi ràng buộc; dữ liệu cũ (1–3) vẫn hợp lệ. Chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
alter table public.learner_settings drop constraint if exists learner_settings_grammar_new_per_day_check;
alter table public.learner_settings add constraint learner_settings_grammar_new_per_day_check check (grammar_new_per_day between 1 and 10);
comment on column public.learner_settings.grammar_new_per_day is 'Grammar: số mẫu mới mỗi ngày (1–10).';
