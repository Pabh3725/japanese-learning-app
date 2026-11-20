-- =============================================================================
-- V12 (chủ dự án chốt 2026-11-20): cân bằng theo **số mục mới mỗi ngày** thay cho số phút.
-- Người học chọn tổng số mục mới mỗi ngày; app chia cho ba khu theo số mục còn lại để ba khu xong cấp cùng ngày
-- và hiện thời gian học ước tính. Vẫn chọn được "xong cấp vào ngày …".
-- Người đang dùng "phút mỗi ngày" được đổi sang số mục tương đương: phút × 60 ÷ 213 giây (thời gian trung bình một mục N5,
-- luật §8.1 sau khi Stage 2–3 chỉ cần 2 điểm), làm tròn, 1–100. Cột balance_minutes giữ nguyên (không còn dùng cho Vocab).
-- =============================================================================
alter table public.learner_settings add column if not exists balance_items smallint not null default 10 check (balance_items between 1 and 100);
comment on column public.learner_settings.balance_items is 'V12: tổng số mục mới mỗi ngày khi cân bằng theo số mục (chia cho ba khu).';

alter table public.learner_settings drop constraint if exists learner_settings_balance_target_check;
alter table public.learner_settings add constraint learner_settings_balance_target_check check (balance_target in ('items', 'minutes', 'date'));
alter table public.learner_settings alter column balance_target set default 'items';

update public.learner_settings
   set balance_items = greatest(1, least(100, round(balance_minutes * 60 / 213.0)::int)),
       balance_target = 'items'
 where balance_target = 'minutes';
