-- Đổi dạng / đổi mẫu so với câu ngay trước (cùng người, cùng ngày, cùng chế độ):
-- kiểm tra giả thuyết "đổi dạng liên tục làm câu sau sai nhiều hơn, chậm hơn".
with x as (
  select l.*, lag(exercise_type) over w as prev_type, lag(point_id) over w as prev_point,
         lag(answered_at) over w as prev_at
  from grammar_logs l
  window w as (partition by user_id, study_date, mode order by answered_at)
)
select case when prev_type is null then 'cau_dau'
            when prev_type = exercise_type then 'cung_dang' else 'doi_dang' end as dang,
       case when prev_point is null then '-'
            when prev_point = point_id then 'cung_mau' else 'doi_mau' end as mau,
       count(*) as cau,
       round(avg((outcome = 'correct')::int) * 100, 1) as pct_dung,
       percentile_cont(0.5) within group (order by response_time_ms) / 1000 as giay_trung_vi
from x where mode in ('learning', 'review', 'practice')
group by 1, 2 order by 1, 2;
