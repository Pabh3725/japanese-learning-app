-- =============================================================================
-- DB-03 · Migration 3 — Nhiều người học + stage + điểm (Learning Rules V2)
-- Nguồn: docs/PROJECT_SPEC.md V7 §6–§7, §10; docs/learning-rules.md (ENG-01);
--        docs/data-spec.md §6 (schema drift cần ghi lại)
--
-- Nguyên tắc: CHỈ THÊM. Không drop bảng/cột, không xoá dòng dữ liệu.
-- Chạy lại nhiều lần vẫn an toàn (IF NOT EXISTS / bắt duplicate_object).
--
-- Tên trong plan  →  bảng thật đang có (DB-02)
--   word_progress  →  learner_vocabulary   (thêm cột điểm stage)
--   cards          →  review_cards         (thêm card_type, card_points, retired_at)
--   user_settings  →  learner_settings     (thêm review_cap, unlock_threshold, mode)
--   exercise_logs  →  BẢNG MỚI (lý do ở mục 6)
--   user_id        →  mọi bảng tiến độ/log đã có từ DB-02, không cần thêm
--   index (user_id, due) → đã có: review_cards_user_due_idx (user_id, due_at)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Enum 5 loại card (PROJECT_SPEC §7.4, CONFIRMED V7)
--    Postgres cho THÊM giá trị enum sau này, nhưng KHÔNG cho xoá.
-- -----------------------------------------------------------------------------
do $$
begin
  create type public.card_type as enum (
    'vocab.meaning_kana',            -- Stage 2 · giàn giáo, bỏ ở 30 (từ chỉ Kana: giữ)
    'vocab.kana_hanviet',            -- Stage 3 · giàn giáo, bỏ ở 40
    'vocab.meaning_kanji',           -- Stage 4 · giữ
    'vocab.kanji_meaning_hanviet',   -- Stage 4 · giữ
    'vocab.meaning_hanviet'          -- Stage 5 · giữ
  );
exception when duplicate_object then null;
end $$;


-- -----------------------------------------------------------------------------
-- 1. vocabularies (nội dung chung, không có user_id)
--    code + sort_order đã thêm tay trên Dashboard ngày 01/11 → ghi lại ở đây
--    để dựng DB từ migration ra giống DB thật. is_kana_only đã có từ DB-02.
-- -----------------------------------------------------------------------------
alter table public.vocabularies
  add column if not exists code       text,
  add column if not exists sort_order integer,
  add column if not exists emoji      text;            -- null = chưa có emoji (DATA-05 điền)

-- Đã NOT NULL trên DB thật thì lệnh này không làm gì; còn dòng null thì báo lỗi (đúng ý).
alter table public.vocabularies
  alter column code       set not null,
  alter column sort_order set not null;

-- Nếu Dashboard đã tạo unique cùng tên thì bỏ qua.
create unique index if not exists vocabularies_code_key       on public.vocabularies (code);
create unique index if not exists vocabularies_sort_order_key on public.vocabularies (sort_order);

-- Schema drift khác trong data-spec §6: kanji.jlpt_level bỏ NOT NULL (đã làm tay).
alter table public.kanji alter column jlpt_level drop not null;


-- -----------------------------------------------------------------------------
-- 2. learner_settings  (= user_settings trong plan)
--    daily_new_limit đã có (DB-02) → dùng làm new_per_day, chỉ đặt default.
--    Default theo PROJECT_SPEC V7 §6.1: 20 / 120 / 80 / xen kẽ.
-- -----------------------------------------------------------------------------
alter table public.learner_settings
  alter column daily_new_limit set default 20;

alter table public.learner_settings
  add column if not exists review_cap       smallint not null default 120 check (review_cap >= 1),
  add column if not exists unlock_threshold smallint not null default 80  check (unlock_threshold >= 0),
  add column if not exists mode             text     not null default 'mixed'
                                            check (mode in ('mixed', 'review_first'));


-- -----------------------------------------------------------------------------
-- 3. learner_vocabulary  (= word_progress trong plan)
--    current_stage đã có (DB-02).
-- -----------------------------------------------------------------------------
alter table public.learner_vocabulary
  -- Điểm ở Stage hiện tại. ĐƯỢC ÂM. Về 0 khi sang Stage mới. (ENG-01 §2)
  add column if not exists stage_points       integer  not null default 0,
  -- "Điểm +1 trong ngày": số lần được CỘNG ở Stage này trong ngày học, tối đa 3.
  add column if not exists stage_points_today smallint not null default 0
                                              check (stage_points_today between 0 and 3),
  add column if not exists points_date        date,     -- ngày học của stage_points_today (giờ VN)
  -- Vị trí câu gần nhất của từ này trong ngày học → kiểm tra gap ≥ 4 (ENG-01 §2, R3)
  add column if not exists last_question_date date,
  add column if not exists last_question_seq  integer  check (last_question_seq >= 1);


-- -----------------------------------------------------------------------------
-- 4. review_cards  (= cards trong plan)
-- -----------------------------------------------------------------------------
alter table public.review_cards
  add column if not exists card_type   public.card_type,         -- null = dòng cũ trước DB-03
  add column if not exists card_points integer not null default 0, -- ĐƯỢC ÂM (ENG-01 §8, CONFIRMED 2a)
  add column if not exists retired_at  timestamptz;                -- null = còn lên lịch

-- Mỗi từ của một người có tối đa 1 card mỗi loại (tạo card idempotent, ENG-01 R5).
create unique index if not exists review_cards_vocabulary_card_type_key
  on public.review_cards (learner_vocabulary_id, card_type);

-- Nới ràng buộc cũ (không xoá dòng dữ liệu nào) — chủ dự án duyệt 2026-11-04.
-- DB-02 bắt buộc skill_code và chỉ cho 1 card / skill. Với 5 loại card V7,
-- kana_hanviet và meaning_hanviet cùng skill han_viet → insert card thứ 2 sẽ bị chặn.
alter table public.review_cards alter column skill_code drop not null;
alter table public.review_cards drop constraint if exists review_cards_vocabulary_skill_key;


-- -----------------------------------------------------------------------------
-- 5. review_logs: thêm vị trí câu trong ngày (câu review cũng tính vào gap)
-- -----------------------------------------------------------------------------
alter table public.review_logs
  add column if not exists study_date date,
  add column if not exists day_seq    integer check (day_seq >= 1);


-- -----------------------------------------------------------------------------
-- 6. exercise_logs — BẢNG MỚI cho câu học (Stage) trong Bài học hôm nay
--    Không mở rộng lesson_attempts vì nó bắt buộc lesson_queue_item_id (V7 không
--    lưu queue, OD-07 = B) và exercise_type ở lesson_queue_items bị CHECK theo
--    danh sách V6 (choice/assembly/...), không chứa dạng bài V7 (kana_to_meaning...).
--    Sửa 2 chỗ đó = phải drop constraint cũ; tạo bảng mới thì thuần "thêm".
-- -----------------------------------------------------------------------------
create table if not exists public.exercise_logs (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null default auth.uid() references auth.users (id) on delete cascade,
  learner_vocabulary_id  uuid not null references public.learner_vocabulary (id) on delete cascade,
  client_event_id        uuid not null,                                     -- chống bấm 2 lần
  stage_number           smallint not null check (stage_number between 1 and 5),
  exercise_type          text not null check (char_length(exercise_type) > 0), -- engine kiểm tra mã
  outcome                text not null check (outcome in ('correct', 'hint', 'wrong')),
  points                 smallint not null default 0 check (points between -1 and 1),
  counted                boolean  not null default false,                   -- câu có được tính điểm không
  study_date             date     not null,                                 -- ngày học giờ VN
  day_seq                integer  not null check (day_seq >= 1),            -- vị trí câu trong ngày
  response_time_ms       integer check (response_time_ms >= 0),
  answered_at            timestamptz not null default now(),

  constraint exercise_logs_event_key unique (user_id, client_event_id),
  -- Câu không được tính thì không được mang điểm
  constraint exercise_logs_uncounted_zero check (counted or points = 0)
);
comment on table public.exercise_logs is
  'Mỗi câu học (Stage) trong Bài học hôm nay. Chỉ thêm, không sửa. Không đụng FSRS.';

create index if not exists exercise_logs_user_day_idx
  on public.exercise_logs (user_id, study_date, day_seq);
create index if not exists exercise_logs_vocab_stage_idx
  on public.exercise_logs (learner_vocabulary_id, stage_number);

-- Bảng mới trong schema public phải bật RLS ngay, nếu không ai có anon key cũng đọc được.
-- Giống kiểu log ở migration 2: chỉ xem / thêm của chính mình. (SEC-03 sẽ test.)
alter table public.exercise_logs enable row level security;

drop policy if exists "Owner can read own exercise_logs"   on public.exercise_logs;
drop policy if exists "Owner can insert own exercise_logs" on public.exercise_logs;

create policy "Owner can read own exercise_logs"
on public.exercise_logs for select to authenticated
using ( (select auth.uid()) = user_id );

create policy "Owner can insert own exercise_logs"
on public.exercise_logs for insert to authenticated
with check ( (select auth.uid()) = user_id );
