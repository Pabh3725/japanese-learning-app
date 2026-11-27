-- Dạng × mức câu gốc: mức 2–3 có thật sự khó hơn mức 1 không.
select l.exercise_type, s.level, count(*) as cau,
       round(avg((l.outcome = 'correct')::int) * 100, 1) as pct_dung,
       percentile_cont(0.5) within group (order by l.response_time_ms) / 1000 as giay_trung_vi
from grammar_logs l join grammar_sentences s on s.id = l.sentence_id
group by 1, 2 having count(*) >= 5 order by 1, 2;
