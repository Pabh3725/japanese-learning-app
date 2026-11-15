-- =============================================================================
-- Review: số Card mỗi phiên chỉnh trong Settings, hoặc ôn hết trong một lần (chủ dự án yêu cầu 2026-11-15).
-- Trước đây cố định 20 Card mỗi phiên (lib/dal/review.ts). Áp dụng cho Review · Vocabulary và Review · Kanji words.
-- Chỉ thêm cột; chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
alter table public.learner_settings add column if not exists review_session_size smallint not null default 20 check (review_session_size between 10 and 100);
alter table public.learner_settings add column if not exists review_all_at_once boolean not null default false;
comment on column public.learner_settings.review_session_size is 'Review: số Card mỗi phiên (10–100). Làm xong có thể ôn tiếp phiên sau.';
comment on column public.learner_settings.review_all_at_once is 'Review: true = một phiên lấy hết Card đến hạn (tới trần trong ngày), bỏ qua review_session_size.';
