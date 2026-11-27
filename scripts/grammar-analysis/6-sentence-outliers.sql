-- Câu gốc lệch mức: mức 1 mà sai nhiều, hoặc mức 3 mà luôn đúng (cần ≥ 4 lần làm).
select s.code, s.level, s.japanese, count(*) as lan,
       round(avg((l.outcome = 'correct')::int) * 100) as pct_dung
from grammar_logs l join grammar_sentences s on s.id = l.sentence_id
group by s.code, s.level, s.japanese
having count(*) >= 4 and ((s.level = 1 and avg((l.outcome = 'correct')::int) < 0.5)
                       or (s.level = 3 and avg((l.outcome = 'correct')::int) = 1))
order by s.level, pct_dung limit 40;
