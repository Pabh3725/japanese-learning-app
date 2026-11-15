-- =============================================================================
-- LISTENING_V2 (docs/listening-rules.md §V2, chủ dự án duyệt 2026-11-15): thêm kiểu phiên nghe số / giờ / ngày / giá
-- (numbers) và ôn câu nghe sai (mistakes). Danh sách câu nghe sai tính từ listening_logs, không cần bảng mới.
-- Chỉ nới ràng buộc; chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
alter table public.listening_sessions drop constraint if exists listening_sessions_kind_check;
alter table public.listening_sessions add constraint listening_sessions_kind_check check (kind in ('lesson', 'jlpt_mock', 'numbers', 'mistakes'));

alter table public.listening_logs drop constraint if exists listening_logs_kind_check;
alter table public.listening_logs add constraint listening_logs_kind_check check (kind in ('lesson', 'jlpt_mock', 'numbers', 'mistakes'));

-- Đề thi thử có cấp, phiên theo bài có số bài; numbers / mistakes không có cả hai
alter table public.listening_sessions drop constraint if exists listening_sessions_kind;
alter table public.listening_sessions add constraint listening_sessions_kind check (
  (kind = 'lesson') = (lesson is not null) and (kind = 'jlpt_mock') = (level is not null)
);

-- Tìm nhanh câu nghe sai: nhật ký theo người học, kiểu, thời điểm
create index if not exists listening_logs_mistakes_idx on public.listening_logs (user_id, answered_at) where kind <> 'jlpt_mock';
