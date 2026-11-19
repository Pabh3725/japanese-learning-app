-- =============================================================================
-- V12 §8.1 (CONFIRMED): sau 14 ngày học, cân bằng dùng thời gian trả lời thật thay cho ước tính.
-- Hàm gom item_logs của chính người gọi theo (khu, loại thẻ, có phải Card không); app tự quy loại thẻ ra trắc nghiệm / gõ.
-- Mỗi câu tính tối đa 60 giây để lúc rời máy không làm lệch số đo. Câu sao (không tính điểm) không tính.
-- Chỉ thêm hàm, không đổi dữ liệu.
-- =============================================================================
create or replace function public.v12_time_stats()
returns table (area text, card_type text, is_card boolean, answers bigint, real_ms bigint, study_days bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select l.area, l.card_type, l.stage = 'review', count(*), sum(least(l.elapsed_ms, 60000)),
         (select count(distinct d.study_date) from public.item_logs d where d.user_id = (select auth.uid()))
    from public.item_logs l
   where l.user_id = (select auth.uid()) and l.stage <> 'star' and l.elapsed_ms is not null and l.elapsed_ms > 0
   group by l.area, l.card_type, l.stage = 'review'
$$;
comment on function public.v12_time_stats is 'V12 §8.1: tổng thời gian trả lời thật của người gọi theo khu / loại thẻ, để hiệu chỉnh thời gian ước tính của cân bằng.';
revoke execute on function public.v12_time_stats from public, anon;
grant execute on function public.v12_time_stats to authenticated;
