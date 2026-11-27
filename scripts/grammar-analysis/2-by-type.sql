-- Tỷ lệ đúng và thời gian trả lời theo dạng bài (Học + Ôn; Luyện thêm/Kiểm tra tách riêng).
select exercise_type,
       case when mode in ('learning','review') then 'hoc_on' else 'luyen_kt' end as nhom,
       count(*) as cau,
       round(avg((outcome = 'correct')::int) * 100, 1) as pct_dung,
       round(avg((outcome = 'hint')::int) * 100, 1) as pct_goi_y,
       percentile_cont(0.5) within group (order by response_time_ms) / 1000 as giay_trung_vi
from grammar_logs group by 1, 2 order by 2, 4;
