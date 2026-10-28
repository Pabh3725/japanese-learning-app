-- =============================================================================
-- DB-02 · Migration 2 — Row Level Security
-- Nguồn: docs/security.md (SEC-01, đã chốt 2026-10-23), §6 ma trận quyền
--
-- Nguyên tắc:
--   * Bật RLS trên cả 15 bảng. Bảng có RLS mà không có policy = mọi người bị từ chối.
--   * Role anon (chưa đăng nhập): không có policy nào, và bị thu hồi quyền trên bảng.
--   * Mỗi thao tác một policy riêng, luôn ghi "to authenticated",
--     dùng (select auth.uid()) để Postgres cache kết quả.
--   * Không có policy DELETE ở bất kỳ bảng nào (SEC-D5).
--   * Ghi vào bảng nội dung chỉ bằng script với secret key (SEC-D3).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Bật RLS trên cả 15 bảng
-- -----------------------------------------------------------------------------
alter table public.vocabularies enable row level security;
alter table public.kanji enable row level security;
alter table public.vocabulary_kanji enable row level security;
alter table public.learner_settings enable row level security;
alter table public.learner_vocabulary enable row level security;
alter table public.learner_skill_progress enable row level security;
alter table public.checkpoint_completions enable row level security;
alter table public.lesson_sessions enable row level security;
alter table public.lesson_queue_items enable row level security;
alter table public.lesson_attempts enable row level security;
alter table public.xp_events enable row level security;
alter table public.review_cards enable row level security;
alter table public.review_logs enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.practice_attempts enable row level security;


-- -----------------------------------------------------------------------------
-- 2. Thu hồi mọi quyền của anon (lớp phòng thủ thêm, ngoài việc không có policy)
-- -----------------------------------------------------------------------------
revoke all on table
  public.vocabularies,
  public.kanji,
  public.vocabulary_kanji,
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
  public.practice_attempts
from anon;


-- -----------------------------------------------------------------------------
-- 3. Nội dung dùng chung: chỉ ĐỌC khi đã đăng nhập
-- -----------------------------------------------------------------------------
create policy "Authenticated users can read vocabularies"
on public.vocabularies
for select
to authenticated
using ( true );

create policy "Authenticated users can read kanji"
on public.kanji
for select
to authenticated
using ( true );

create policy "Authenticated users can read vocabulary_kanji"
on public.vocabulary_kanji
for select
to authenticated
using ( true );


-- -----------------------------------------------------------------------------
-- 4. Dữ liệu của người học có thể sửa: xem / thêm / sửa (của chính mình)
--    learner_settings, learner_vocabulary, learner_skill_progress,
--    lesson_sessions, lesson_queue_items, review_cards, practice_sessions
-- -----------------------------------------------------------------------------
-- learner_settings
create policy "Owner can read own learner_settings"
on public.learner_settings
for select
to authenticated
using ( (select auth.uid()) = user_id );

create policy "Owner can insert own learner_settings"
on public.learner_settings
for insert
to authenticated
with check ( (select auth.uid()) = user_id );

create policy "Owner can update own learner_settings"
on public.learner_settings
for update
to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id );

-- learner_vocabulary
create policy "Owner can read own learner_vocabulary"
on public.learner_vocabulary
for select
to authenticated
using ( (select auth.uid()) = user_id );

create policy "Owner can insert own learner_vocabulary"
on public.learner_vocabulary
for insert
to authenticated
with check ( (select auth.uid()) = user_id );

create policy "Owner can update own learner_vocabulary"
on public.learner_vocabulary
for update
to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id );

-- learner_skill_progress
create policy "Owner can read own learner_skill_progress"
on public.learner_skill_progress
for select
to authenticated
using ( (select auth.uid()) = user_id );

create policy "Owner can insert own learner_skill_progress"
on public.learner_skill_progress
for insert
to authenticated
with check ( (select auth.uid()) = user_id );

create policy "Owner can update own learner_skill_progress"
on public.learner_skill_progress
for update
to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id );

-- lesson_sessions
create policy "Owner can read own lesson_sessions"
on public.lesson_sessions
for select
to authenticated
using ( (select auth.uid()) = user_id );

create policy "Owner can insert own lesson_sessions"
on public.lesson_sessions
for insert
to authenticated
with check ( (select auth.uid()) = user_id );

create policy "Owner can update own lesson_sessions"
on public.lesson_sessions
for update
to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id );

-- lesson_queue_items
create policy "Owner can read own lesson_queue_items"
on public.lesson_queue_items
for select
to authenticated
using ( (select auth.uid()) = user_id );

create policy "Owner can insert own lesson_queue_items"
on public.lesson_queue_items
for insert
to authenticated
with check ( (select auth.uid()) = user_id );

create policy "Owner can update own lesson_queue_items"
on public.lesson_queue_items
for update
to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id );

-- review_cards
create policy "Owner can read own review_cards"
on public.review_cards
for select
to authenticated
using ( (select auth.uid()) = user_id );

create policy "Owner can insert own review_cards"
on public.review_cards
for insert
to authenticated
with check ( (select auth.uid()) = user_id );

create policy "Owner can update own review_cards"
on public.review_cards
for update
to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id );

-- practice_sessions
create policy "Owner can read own practice_sessions"
on public.practice_sessions
for select
to authenticated
using ( (select auth.uid()) = user_id );

create policy "Owner can insert own practice_sessions"
on public.practice_sessions
for insert
to authenticated
with check ( (select auth.uid()) = user_id );

create policy "Owner can update own practice_sessions"
on public.practice_sessions
for update
to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id );


-- -----------------------------------------------------------------------------
-- 5. Nhật ký và huy chương: chỉ xem / thêm (không sửa, không xóa)
--    checkpoint_completions, lesson_attempts, xp_events, review_logs, practice_attempts
-- -----------------------------------------------------------------------------
-- checkpoint_completions
create policy "Owner can read own checkpoint_completions"
on public.checkpoint_completions
for select
to authenticated
using ( (select auth.uid()) = user_id );

create policy "Owner can insert own checkpoint_completions"
on public.checkpoint_completions
for insert
to authenticated
with check ( (select auth.uid()) = user_id );

-- lesson_attempts
create policy "Owner can read own lesson_attempts"
on public.lesson_attempts
for select
to authenticated
using ( (select auth.uid()) = user_id );

create policy "Owner can insert own lesson_attempts"
on public.lesson_attempts
for insert
to authenticated
with check ( (select auth.uid()) = user_id );

-- xp_events
create policy "Owner can read own xp_events"
on public.xp_events
for select
to authenticated
using ( (select auth.uid()) = user_id );

create policy "Owner can insert own xp_events"
on public.xp_events
for insert
to authenticated
with check ( (select auth.uid()) = user_id );

-- review_logs
create policy "Owner can read own review_logs"
on public.review_logs
for select
to authenticated
using ( (select auth.uid()) = user_id );

create policy "Owner can insert own review_logs"
on public.review_logs
for insert
to authenticated
with check ( (select auth.uid()) = user_id );

-- practice_attempts
create policy "Owner can read own practice_attempts"
on public.practice_attempts
for select
to authenticated
using ( (select auth.uid()) = user_id );

create policy "Owner can insert own practice_attempts"
on public.practice_attempts
for insert
to authenticated
with check ( (select auth.uid()) = user_id );
