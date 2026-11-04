-- =============================================================================
-- SEC-03 · Migration 4 — RLS nhiều người dùng
-- Nguồn: docs/security.md (SEC-01); task SEC-03 (Tasks v2)
--
-- Migration 2 (DB-02) đã có phần lớn yêu cầu SEC-03:
--   * bảng nội dung (vocabularies, kanji, vocabulary_kanji): chỉ SELECT cho authenticated
--   * bảng tiến độ / log / settings: auth.uid() = user_id
--   * anon không có quyền; không có policy DELETE
-- Migration này vá 2 lỗ hổng mà test 2 tài khoản (sec03_two_accounts.sql) tìm ra:
--
-- 1. exercise_logs (tạo ở DB-03) chưa bị thu hồi quyền của anon như 15 bảng kia.
--
-- 2. "Gắn vào bản ghi cha của người khác". Policy cũ chỉ kiểm tra cột user_id của
--    CHÍNH dòng đó. A có thể ghi một dòng mang user_id = A nhưng trỏ tới
--    learner_vocabulary / review_card / session của B, vì khoá ngoại không quan tâm
--    ai là chủ. A không đọc được gì của B, nhưng có thể:
--      - chiếm chỗ UNIQUE: tạo trước card (từ của B, vocab.kana_hanviet) → khi B qua
--        Stage 3, B KHÔNG tạo được card của chính mình;
--      - chèn checkpoint / log rác vào lịch sử học của B.
--    Cách vá: policy INSERT/UPDATE kiểm tra thêm "bản ghi cha cũng là của tôi".
--
-- Chỉ thay policy (drop rồi create lại cùng tên) → tổng số policy giữ nguyên 36.
-- Không đụng dữ liệu. Chạy lại nhiều lần vẫn an toàn.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. exercise_logs: thu hồi quyền của anon (giống 15 bảng ở Migration 2)
-- -----------------------------------------------------------------------------
revoke all on table public.exercise_logs from anon;


-- -----------------------------------------------------------------------------
-- 2. Hàm kiểm tra "bản ghi cha là của người đang đăng nhập"
--
-- Đặt trong schema private (không lộ qua API). SECURITY INVOKER (mặc định):
-- hàm chạy với quyền của người gọi nên vẫn đi qua RLS của bảng cha.
-- -----------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.owns_learner_vocabulary(p_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.learner_vocabulary
    where id = p_id and user_id = (select auth.uid())
  );
$$;

create or replace function private.owns_lesson_session(p_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.lesson_sessions
    where id = p_id and user_id = (select auth.uid())
  );
$$;

create or replace function private.owns_lesson_queue_item(p_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.lesson_queue_items
    where id = p_id and user_id = (select auth.uid())
  );
$$;

create or replace function private.owns_review_card(p_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.review_cards
    where id = p_id and user_id = (select auth.uid())
  );
$$;

create or replace function private.owns_practice_session(p_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.practice_sessions
    where id = p_id and user_id = (select auth.uid())
  );
$$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;


-- -----------------------------------------------------------------------------
-- 3. Thay policy INSERT / UPDATE của các bảng con
--    Mẫu: (select auth.uid()) = user_id  AND  private.owns_<cha>(<khoá ngoại>)
-- -----------------------------------------------------------------------------

-- learner_skill_progress → learner_vocabulary
drop policy if exists "Owner can insert own learner_skill_progress" on public.learner_skill_progress;
create policy "Owner can insert own learner_skill_progress"
on public.learner_skill_progress
for insert
to authenticated
with check ( (select auth.uid()) = user_id and private.owns_learner_vocabulary(learner_vocabulary_id) );

drop policy if exists "Owner can update own learner_skill_progress" on public.learner_skill_progress;
create policy "Owner can update own learner_skill_progress"
on public.learner_skill_progress
for update
to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id and private.owns_learner_vocabulary(learner_vocabulary_id) );

-- checkpoint_completions → learner_vocabulary
drop policy if exists "Owner can insert own checkpoint_completions" on public.checkpoint_completions;
create policy "Owner can insert own checkpoint_completions"
on public.checkpoint_completions
for insert
to authenticated
with check ( (select auth.uid()) = user_id and private.owns_learner_vocabulary(learner_vocabulary_id) );

-- lesson_queue_items → lesson_sessions + learner_vocabulary
drop policy if exists "Owner can insert own lesson_queue_items" on public.lesson_queue_items;
create policy "Owner can insert own lesson_queue_items"
on public.lesson_queue_items
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and private.owns_lesson_session(lesson_session_id)
  and private.owns_learner_vocabulary(learner_vocabulary_id)
);

drop policy if exists "Owner can update own lesson_queue_items" on public.lesson_queue_items;
create policy "Owner can update own lesson_queue_items"
on public.lesson_queue_items
for update
to authenticated
using ( (select auth.uid()) = user_id )
with check (
  (select auth.uid()) = user_id
  and private.owns_lesson_session(lesson_session_id)
  and private.owns_learner_vocabulary(learner_vocabulary_id)
);

-- lesson_attempts → lesson_queue_items
drop policy if exists "Owner can insert own lesson_attempts" on public.lesson_attempts;
create policy "Owner can insert own lesson_attempts"
on public.lesson_attempts
for insert
to authenticated
with check ( (select auth.uid()) = user_id and private.owns_lesson_queue_item(lesson_queue_item_id) );

-- xp_events → lesson_sessions
drop policy if exists "Owner can insert own xp_events" on public.xp_events;
create policy "Owner can insert own xp_events"
on public.xp_events
for insert
to authenticated
with check ( (select auth.uid()) = user_id and private.owns_lesson_session(lesson_session_id) );

-- review_cards → learner_vocabulary
drop policy if exists "Owner can insert own review_cards" on public.review_cards;
create policy "Owner can insert own review_cards"
on public.review_cards
for insert
to authenticated
with check ( (select auth.uid()) = user_id and private.owns_learner_vocabulary(learner_vocabulary_id) );

drop policy if exists "Owner can update own review_cards" on public.review_cards;
create policy "Owner can update own review_cards"
on public.review_cards
for update
to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id and private.owns_learner_vocabulary(learner_vocabulary_id) );

-- review_logs → review_cards
drop policy if exists "Owner can insert own review_logs" on public.review_logs;
create policy "Owner can insert own review_logs"
on public.review_logs
for insert
to authenticated
with check ( (select auth.uid()) = user_id and private.owns_review_card(review_card_id) );

-- practice_attempts → practice_sessions
drop policy if exists "Owner can insert own practice_attempts" on public.practice_attempts;
create policy "Owner can insert own practice_attempts"
on public.practice_attempts
for insert
to authenticated
with check ( (select auth.uid()) = user_id and private.owns_practice_session(practice_session_id) );

-- exercise_logs → learner_vocabulary
drop policy if exists "Owner can insert own exercise_logs" on public.exercise_logs;
create policy "Owner can insert own exercise_logs"
on public.exercise_logs
for insert
to authenticated
with check ( (select auth.uid()) = user_id and private.owns_learner_vocabulary(learner_vocabulary_id) );