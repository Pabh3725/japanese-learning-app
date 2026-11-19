-- =============================================================================
-- V12: người học tự dừng mục mới của từng khu (chủ dự án chốt 2026-11-19). Khu dừng vẫn học Intro và ôn Card đang có,
-- chỉ không mở mục mới; khi bật cân bằng, thời gian của khu dừng chia cho các khu còn chạy. Chỉ thêm cột, mặc định không dừng.
-- =============================================================================
alter table public.learner_settings add column if not exists v12_pause_kana boolean not null default false;
alter table public.learner_settings add column if not exists v12_pause_kanji boolean not null default false;
alter table public.learner_settings add column if not exists v12_pause_word_kanji boolean not null default false;
comment on column public.learner_settings.v12_pause_kana is 'V12: dừng mở mục mới của khu Từ vựng Kana.';
comment on column public.learner_settings.v12_pause_kanji is 'V12: dừng mở mục mới của khu Kanji (bộ thủ và chữ).';
comment on column public.learner_settings.v12_pause_word_kanji is 'V12: dừng mở mục mới của khu Từ vựng Kanji.';
