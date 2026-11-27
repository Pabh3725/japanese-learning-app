-- Lần đầu gặp mỗi dạng với một mẫu (đúng ngay hay không): đo độ khó "thật" của dạng khi còn mới.
with f as (
  select distinct on (user_id, point_id, exercise_type) *
  from grammar_logs where mode = 'learning'
  order by user_id, point_id, exercise_type, answered_at
)
select exercise_type, count(*) as lan_dau, round(avg((outcome = 'correct')::int) * 100, 1) as pct_dung_lan_dau
from f group by 1 order by 3;
