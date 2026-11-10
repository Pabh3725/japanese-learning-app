-- Xóa tiến độ thử nghiệm của từ vựng để bắt đầu lại theo lộ trình mới. KHÔNG hoàn tác được.
-- Giữ: khu Kanji (learner_kanji, kanji_logs), dấu sao, chữ và từ đã đánh dấu đã biết, Settings.
-- Xóa learner_vocabulary sẽ cascade xuống review_cards, review_logs, learner_stage_schedules, exercise_logs.
begin;
delete from public.practice_attempts;
delete from public.practice_sessions;
delete from public.learner_vocabulary;
delete from public.learner_daily_plans;
update public.learner_vocabulary_stars set round_answered = 0;
commit;
