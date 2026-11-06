-- =============================================================================
-- Chụp thêm số câu Stage đến hẹn đầu ngày (S), cố định cả ngày, để chặn từ mới đúng luật R7.
-- Chỉ thêm, chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
alter table public.learner_daily_plans
  add column if not exists stage_snapshot integer not null default 0 check (stage_snapshot >= 0);

comment on column public.learner_daily_plans.stage_snapshot is 'S: số câu Stage đến hẹn, chụp lần đầu trong ngày học.';
