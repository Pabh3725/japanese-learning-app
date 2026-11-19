-- =============================================================================
-- Cân bằng mẫu ngữ pháp mới (chủ dự án chốt 2026-11-19): Grammar có mục tiêu riêng — số phút mỗi ngày hoặc ngày hoàn thành
-- cấp (N5 bài 1–25, rồi N4 bài 26–50). Bật thì số mẫu mới mỗi ngày tính tự động (1–10); tắt thì dùng grammar_new_per_day.
-- Điều kiện mở bài giữ nguyên (docs/grammar-rules.md §3): thiếu mẫu mở được thì các ngày sau tự bù.
-- Chỉ thêm cột; mặc định tắt để nhịp học hiện tại của mọi người không đổi.
-- =============================================================================
alter table public.learner_settings add column if not exists grammar_balance_on boolean not null default false;
alter table public.learner_settings add column if not exists grammar_balance_target text not null default 'minutes' check (grammar_balance_target in ('minutes', 'date'));
alter table public.learner_settings add column if not exists grammar_balance_minutes smallint not null default 15 check (grammar_balance_minutes between 5 and 240);
alter table public.learner_settings add column if not exists grammar_balance_date date;
comment on column public.learner_settings.grammar_balance_on is 'Grammar: bật cân bằng mẫu mới theo mục tiêu riêng (thay grammar_new_per_day).';
comment on column public.learner_settings.grammar_balance_target is 'Grammar: mục tiêu cân bằng — minutes (phút mỗi ngày) hoặc date (ngày hoàn thành cấp).';
comment on column public.learner_settings.grammar_balance_minutes is 'Grammar: số phút mỗi ngày cho mẫu mới (gồm các buổi học và lần ôn đầu).';
comment on column public.learner_settings.grammar_balance_date is 'Grammar: ngày muốn xong cấp đang học (từ ngày mai trở đi).';
