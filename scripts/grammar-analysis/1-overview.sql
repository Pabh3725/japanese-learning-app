-- Tổng quan log Grammar theo chế độ.
select mode, count(*) as cau, count(distinct user_id) as nguoi, count(distinct point_id) as mau,
       min(study_date) as tu_ngay, max(study_date) as den_ngay
from grammar_logs group by mode order by cau desc;
