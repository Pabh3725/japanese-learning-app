-- =============================================================================
-- SEC-03 · Migration 5 — Vá các chỗ còn hở sau khi chạy test 2 tài khoản thật
-- Test: supabase/tests/rls/ (pnpm test:rls); supabase/tests/sec03_two_accounts.sql
--
-- 1. learner_vocabulary_exclusions, learner_daily_plans (DB-03 mục 7, 9) chưa bị thu hồi
--    quyền của anon như các bảng khác.
-- 2. practice_attempts.review_card_id (DB-03 mục 8) trỏ tới review_cards nhưng policy
--    INSERT ở Migration 4 chưa kiểm tra chủ của card: A gắn được lượt chơi vào card của B.
-- 3. authenticated còn quyền ghi ở bảng nội dung (chỉ RLS đang chặn) và quyền TRUNCATE
--    ở mọi bảng. TRUNCATE KHÔNG đi qua RLS nên phải thu hồi quyền.
--    Script seed dùng service_role, không bị ảnh hưởng.
--
-- Chỉ thay policy và quyền, không đụng dữ liệu. Tổng số policy giữ nguyên 42.
-- Chạy lại nhiều lần vẫn an toàn.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Thu hồi quyền của anon ở 2 bảng còn lại
-- -----------------------------------------------------------------------------
revoke all on table
  public.learner_vocabulary_exclusions,
  public.learner_daily_plans
from anon;


-- -----------------------------------------------------------------------------
-- 2. practice_attempts: card được gắn (nếu có) cũng phải là của người ghi
-- -----------------------------------------------------------------------------
drop policy if exists "Owner can insert own practice_attempts" on public.practice_attempts;
create policy "Owner can insert own practice_attempts"
on public.practice_attempts
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and private.owns_practice_session(practice_session_id)
  and (review_card_id is null or private.owns_review_card(review_card_id))
);


-- -----------------------------------------------------------------------------
-- 3. Bảng nội dung: authenticated chỉ còn quyền đọc
-- -----------------------------------------------------------------------------
revoke insert, update, delete, truncate on table
  public.vocabularies,
  public.kanji,
  public.vocabulary_kanji
from authenticated;


-- -----------------------------------------------------------------------------
-- 4. Bảng của người học: không ai được TRUNCATE qua role authenticated
-- -----------------------------------------------------------------------------
revoke truncate on table
  public.learner_settings,
  public.learner_vocabulary,
  public.learner_skill_progress,
  public.checkpoint_completions,
  public.lesson_sessions,
  public.lesson_queue_items,
  public.lesson_attempts,
  public.xp_events,
  public.review_cards,
  public.review_logs,
  public.practice_sessions,
  public.practice_attempts,
  public.exercise_logs,
  public.learner_vocabulary_exclusions,
  public.learner_daily_plans
from authenticated;
