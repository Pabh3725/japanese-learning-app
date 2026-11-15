-- =============================================================================
-- Luyện nghe đợt B (docs/listening-rules.md §V2.4): phiên nghe hội thoại điền chỗ trống (kind 'conversation').
-- mode = mã hội thoại; questions = [{code, blanks: [{options, answer}]}]; answers = {số ô: lựa chọn}.
-- Chép chính tả theo đoạn dùng kiểu 'lesson' sẵn có. Chỉ nới ràng buộc; chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
alter table public.listening_sessions drop constraint if exists listening_sessions_kind_check;
alter table public.listening_sessions add constraint listening_sessions_kind_check check (kind in ('lesson', 'point', 'jlpt_mock', 'numbers', 'mistakes', 'conversation'));
alter table public.listening_logs drop constraint if exists listening_logs_kind_check;
alter table public.listening_logs add constraint listening_logs_kind_check check (kind in ('lesson', 'point', 'jlpt_mock', 'numbers', 'mistakes', 'conversation'));

alter table public.listening_sessions drop constraint if exists listening_sessions_kind;
alter table public.listening_sessions add constraint listening_sessions_kind check (
  (kind in ('lesson', 'point', 'conversation')) = (lesson is not null)
  and (kind = 'point') = (point_code is not null)
  and (kind = 'jlpt_mock') = (level is not null)
);

create index if not exists listening_sessions_conversation_idx on public.listening_sessions (user_id, mode) where kind = 'conversation';
