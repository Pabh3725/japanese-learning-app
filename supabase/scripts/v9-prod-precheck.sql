-- Chạy TRƯỚC khi lên V9 trên prod. CHỈ ĐỌC, không đổi gì.
-- Cột "bi_xoa" là số dòng supabase/scripts/path-v2-reset.sql sẽ xóa (trực tiếp hoặc kéo theo khi xóa learner_vocabulary).
-- Cột "giu_lai" là dữ liệu được giữ: tài khoản, Settings, dấu sao, từ đã biết, toàn bộ khu Kanji.
select 'bi_xoa' as nhom, 'learner_vocabulary (tiến độ từ vựng)' as bang, count(*) as so_dong from public.learner_vocabulary
union all select 'bi_xoa', 'learner_stage_schedules (lịch Stage)', count(*) from public.learner_stage_schedules
union all select 'bi_xoa', 'exercise_logs (log câu Learn)', count(*) from public.exercise_logs
union all select 'bi_xoa', 'review_cards (Card từ vựng)', count(*) from public.review_cards
union all select 'bi_xoa', 'review_logs (log ôn Card)', count(*) from public.review_logs
union all select 'bi_xoa', 'practice_attempts', count(*) from public.practice_attempts
union all select 'bi_xoa', 'practice_sessions', count(*) from public.practice_sessions
union all select 'bi_xoa', 'learner_daily_plans', count(*) from public.learner_daily_plans
union all select 'giu_lai', 'auth.users (tài khoản)', count(*) from auth.users
union all select 'giu_lai', 'learner_vocabulary_stars (dấu sao, chỉ đặt lại vòng học thêm)', count(*) from public.learner_vocabulary_stars
union all select 'giu_lai', 'learner_vocabulary_exclusions (từ đã biết)', count(*) from public.learner_vocabulary_exclusions
union all select 'giu_lai', 'learner_kanji (chữ Kanji đã mở)', count(*) from public.learner_kanji
union all select 'giu_lai', 'learner_kanji đã xong Học (sẽ có 2 Card mỗi chữ)', count(*) from public.learner_kanji where phase = 'review'
union all select 'giu_lai', 'kanji_logs', count(*) from public.kanji_logs;
