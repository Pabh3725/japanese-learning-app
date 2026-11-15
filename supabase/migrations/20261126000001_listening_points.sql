-- =============================================================================
-- Grammar · Listening theo từng mẫu (docs/listening-rules.md §V2.2b, chủ dự án duyệt 2026-11-16): mỗi mẫu 30 câu nghe,
-- 3 chặng × 10 câu (cơ bản → khó dần). Phiên kiểu 'point' ghi mã mẫu; tiến độ chặng tính từ phiên đã nộp.
-- Chỉ thêm / nới ràng buộc; chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
alter table public.listening_sessions add column if not exists point_code text check (point_code is null or char_length(point_code) between 1 and 40);
comment on column public.listening_sessions.point_code is 'Kiểu point: mã mẫu ngữ pháp (g05-01); mode là stage1 / stage2 / stage3.';

alter table public.listening_sessions drop constraint if exists listening_sessions_kind_check;
alter table public.listening_sessions add constraint listening_sessions_kind_check check (kind in ('lesson', 'point', 'jlpt_mock', 'numbers', 'mistakes'));
alter table public.listening_logs drop constraint if exists listening_logs_kind_check;
alter table public.listening_logs add constraint listening_logs_kind_check check (kind in ('lesson', 'point', 'jlpt_mock', 'numbers', 'mistakes'));

-- Theo bài và theo mẫu có số bài; theo mẫu có mã mẫu; thi thử có cấp
alter table public.listening_sessions drop constraint if exists listening_sessions_kind;
alter table public.listening_sessions add constraint listening_sessions_kind check (
  (kind in ('lesson', 'point')) = (lesson is not null)
  and (kind = 'point') = (point_code is not null)
  and (kind = 'jlpt_mock') = (level is not null)
);

create index if not exists listening_sessions_point_idx on public.listening_sessions (user_id, point_code) where kind = 'point';
