-- =============================================================================
-- SCH-01 · Lịch riêng cho Stage (Design V8)
-- Nguồn: docs/PROJECT_SPEC.md §18; docs/learning-rules.md R4, R9; docs/database.md §9.
--
-- Mỗi từ × mỗi Stage tính điểm (2, 4, 5) có một dòng: điểm + lịch FSRS riêng,
-- nên một từ có thể chạy nhiều stage cùng lúc.
--
-- Chỉ THÊM. Không xoá cột cũ và không sửa public.submit_exercise, để code đang chạy
-- trên Vercel không hỏng trong lúc chờ deploy. Dọn đồ cũ ở một migration sau.
-- Chạy lại nhiều lần vẫn an toàn.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Bảng learner_stage_schedules
-- -----------------------------------------------------------------------------
create table if not exists public.learner_stage_schedules (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null default auth.uid() references auth.users (id) on delete cascade,
  learner_vocabulary_id  uuid not null references public.learner_vocabulary (id) on delete cascade,
  stage_number           smallint not null check (stage_number in (2, 4, 5)),

  -- Lịch FSRS, cùng ý nghĩa với review_cards. Khoảng cách tối đa 2 ngày (R9).
  state                  smallint not null default 0 check (state between 0 and 3),
  due_at                 timestamptz not null default now(),
  stability              double precision not null default 0 check (stability >= 0),
  difficulty             double precision not null default 0 check (difficulty >= 0),
  scheduled_days         integer not null default 0 check (scheduled_days between 0 and 2),
  learning_steps         integer not null default 0 check (learning_steps >= 0),
  reps                   integer not null default 0 check (reps >= 0),
  lapses                 integer not null default 0 check (lapses >= 0),
  last_review_at         timestamptz,

  -- Điểm của stage. ĐƯỢC ÂM.
  stage_points           integer not null default 0,
  stage_points_today     smallint not null default 0 check (stage_points_today between 0 and 3),
  points_date            date,

  unlocked_next_at       timestamptz,   -- đã mở stage sau; không bao giờ đóng lại
  completed_at           timestamptz,   -- hoàn tất: dừng hỏi, đã tạo card của stage

  version                integer not null default 0 check (version >= 0),  -- chống hai máy ghi đè
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint learner_stage_schedules_word_stage_key unique (learner_vocabulary_id, stage_number)
);
comment on table public.learner_stage_schedules is
  'Design V8: điểm và lịch FSRS của một từ ở một Stage tính điểm. Tối đa 2 ngày, không có Easy.';

-- Lấy câu đến hẹn của một người (SES-01, SCH-02)
create index if not exists learner_stage_schedules_user_due_idx
  on public.learner_stage_schedules (user_id, due_at) where completed_at is null;

drop trigger if exists set_updated_at on public.learner_stage_schedules;
create trigger set_updated_at before update on public.learner_stage_schedules
  for each row execute function public.set_updated_at();

alter table public.learner_stage_schedules enable row level security;

drop policy if exists "Owner can read own stage schedules"   on public.learner_stage_schedules;
drop policy if exists "Owner can insert own stage schedules" on public.learner_stage_schedules;
drop policy if exists "Owner can update own stage schedules" on public.learner_stage_schedules;

create policy "Owner can read own stage schedules"
on public.learner_stage_schedules for select to authenticated
using ( (select auth.uid()) = user_id );

create policy "Owner can insert own stage schedules"
on public.learner_stage_schedules for insert to authenticated
with check ( (select auth.uid()) = user_id and private.owns_learner_vocabulary(learner_vocabulary_id) );

create policy "Owner can update own stage schedules"
on public.learner_stage_schedules for update to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id and private.owns_learner_vocabulary(learner_vocabulary_id) );

revoke all on public.learner_stage_schedules from anon;
revoke truncate on public.learner_stage_schedules from authenticated;


-- -----------------------------------------------------------------------------
-- 2. learner_settings — khối lượng do người học tự chỉnh (§18.5)
--    Cột mode không dùng nữa, xoá ở migration dọn dẹp.
-- -----------------------------------------------------------------------------
alter table public.learner_settings
  add column if not exists stage_cap         smallint not null default 200 check (stage_cap between 20 and 1000),
  add column if not exists kanji_new_per_day smallint not null default 5   check (kanji_new_per_day between 0 and 50),
  add column if not exists kanji_cap         smallint not null default 50  check (kanji_cap between 10 and 500);


-- -----------------------------------------------------------------------------
-- 3. Từ mới tự có lịch Stage 2
--    Trigger nằm ở database nên đúng cả khi code cũ còn chạy trong lúc chờ deploy.
--    security invoker: RLS vẫn áp dụng cho người đang thêm từ.
-- -----------------------------------------------------------------------------
create or replace function public.create_stage2_schedule()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.learner_stage_schedules (user_id, learner_vocabulary_id, stage_number)
  values (new.user_id, new.id, 2)
  on conflict (learner_vocabulary_id, stage_number) do nothing;
  return new;
end;
$$;
revoke execute on function public.create_stage2_schedule() from public, anon, authenticated;

drop trigger if exists on_learner_vocabulary_created on public.learner_vocabulary;
create trigger on_learner_vocabulary_created
  after insert on public.learner_vocabulary
  for each row when (new.current_stage = 2)
  execute function public.create_stage2_schedule();


-- -----------------------------------------------------------------------------
-- 4. Chuyển dữ liệu cũ: giữ điểm, câu đến hẹn ngay. Nguồn cũ giữ nguyên.
--    "Đã mở stage sau" của dòng cũ: từ chỉ có thể đứng ở stage đang chạy nên chưa mở.
-- -----------------------------------------------------------------------------
insert into public.learner_stage_schedules
  (user_id, learner_vocabulary_id, stage_number, stage_points, stage_points_today, points_date, due_at)
select user_id, id, current_stage, stage_points, stage_points_today, points_date, now()
  from public.learner_vocabulary
 where learning_status = 'learning'
   and current_stage in (2, 4, 5)
on conflict (learner_vocabulary_id, stage_number) do nothing;


-- -----------------------------------------------------------------------------
-- 5. Hàm submit_stage_exercise
--    Ghi trong MỘT transaction: exercise_logs + lịch và điểm của stage + learner_vocabulary
--    + (khi mở Stage 5) lịch mới + (khi hoàn tất) card mới.
--    Không sửa card đã có. Luật do lib/learning tính rồi truyền vào; hàm KHÔNG tự tính luật,
--    trừ việc kiểm tra mọi stage bắt buộc đã xong, vì phải đọc đúng dữ liệu trong transaction.
--    security invoker → RLS vẫn áp dụng.
-- -----------------------------------------------------------------------------
create or replace function public.submit_stage_exercise(
  p_schedule_id        uuid,
  p_client_event_id    uuid,
  p_expected_version   integer,
  p_answered_at        timestamptz,
  -- câu vừa trả lời (→ exercise_logs)
  p_exercise_type      text,
  p_outcome            text,
  p_points             smallint,
  p_counted            boolean,
  p_study_date         date,
  p_day_seq            integer,
  p_response_time_ms   integer,
  -- điểm của stage
  p_stage_points       integer,
  p_stage_points_today smallint,
  p_points_date        date,
  -- lịch của stage
  p_state              smallint,
  p_due_at             timestamptz,
  p_stability          double precision,
  p_difficulty         double precision,
  p_scheduled_days     integer,
  p_learning_steps     integer,
  p_reps               integer,
  p_lapses             integer,
  p_last_review_at     timestamptz,
  -- mốc
  p_unlocked_stage     smallint,                       -- stage vừa mở, null nếu không
  p_open_schedule      boolean,                        -- stage vừa mở có điểm (Stage 5) → tạo lịch
  p_completed          boolean,                        -- stage này vừa hoàn tất
  p_required_stages    smallint[],                     -- các stage phải xong để từ hoàn thành
  -- card mới
  p_new_card_types     public.card_type[] default '{}',
  p_new_cards_due_at   timestamptz        default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_lv        uuid;
  v_stage     smallint;
  v_version   integer;
  v_created   integer := 0;
  v_word_done boolean := false;
begin
  if v_uid is null then
    raise exception 'submit_stage_exercise: not authenticated' using errcode = '28000';
  end if;
  if cardinality(p_new_card_types) > 0 and p_new_cards_due_at is null then
    raise exception 'submit_stage_exercise: thiếu p_new_cards_due_at cho card mới' using errcode = '22023';
  end if;
  if p_scheduled_days > 2 then
    raise exception 'submit_stage_exercise: lịch Stage vượt 2 ngày' using errcode = '22023';
  end if;

  -- Cửa 1: lần gửi này đã được lưu trước đó?
  if exists (select 1 from public.exercise_logs
             where user_id = v_uid and client_event_id = p_client_event_id) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  begin
    -- Cửa 2: chỉ cập nhật khi lịch của mình, chưa hoàn tất, version khớp
    update public.learner_stage_schedules
       set state              = p_state,
           due_at             = p_due_at,
           stability          = p_stability,
           difficulty         = p_difficulty,
           scheduled_days     = p_scheduled_days,
           learning_steps     = p_learning_steps,
           reps               = p_reps,
           lapses             = p_lapses,
           last_review_at     = p_last_review_at,
           stage_points       = p_stage_points,
           stage_points_today = p_stage_points_today,
           points_date        = p_points_date,
           unlocked_next_at   = case when p_unlocked_stage is not null then p_answered_at else unlocked_next_at end,
           completed_at       = case when p_completed then p_answered_at else completed_at end,
           version            = version + 1
     where id = p_schedule_id
       and user_id = v_uid
       and completed_at is null
       and version = p_expected_version
    returning learner_vocabulary_id, stage_number, version into v_lv, v_stage, v_version;

    if not found then
      select completed_at is not null into v_word_done
        from public.learner_stage_schedules
       where id = p_schedule_id and user_id = v_uid;
      if not found then
        return jsonb_build_object('status', 'not_found');
      elsif v_word_done then
        return jsonb_build_object('status', 'stage_changed');
      else
        return jsonb_build_object('status', 'conflict');
      end if;
    end if;

    -- Ghi nhật ký
    insert into public.exercise_logs (
      user_id, learner_vocabulary_id, client_event_id, stage_number, exercise_type,
      outcome, points, counted, study_date, day_seq, response_time_ms, answered_at
    ) values (
      v_uid, v_lv, p_client_event_id, v_stage, p_exercise_type,
      p_outcome, p_points, p_counted, p_study_date, p_day_seq, p_response_time_ms, p_answered_at
    );

    -- Mở Stage 5: tạo lịch, câu đầu đến hẹn ngay
    if p_open_schedule then
      insert into public.learner_stage_schedules (user_id, learner_vocabulary_id, stage_number, due_at)
      values (v_uid, v_lv, p_unlocked_stage, p_answered_at)
      on conflict (learner_vocabulary_id, stage_number) do nothing;
    end if;

    -- Card mới khi hoàn tất stage. Đã có card cùng loại thì bỏ qua (idempotent, R5).
    if cardinality(p_new_card_types) > 0 then
      insert into public.review_cards (user_id, learner_vocabulary_id, card_type, due_at)
      select v_uid, v_lv, t, p_new_cards_due_at
        from unnest(p_new_card_types) as t
      on conflict (learner_vocabulary_id, card_type) do nothing;
      get diagnostics v_created = row_count;
    end if;

    -- Từ hoàn thành khi MỌI stage bắt buộc đều hoàn tất. Stage chưa có lịch = chưa xong.
    v_word_done := p_completed and (
      select count(*) = cardinality(p_required_stages)
        from public.learner_stage_schedules
       where learner_vocabulary_id = v_lv
         and stage_number = any (p_required_stages)
         and completed_at is not null
    );

    update public.learner_vocabulary
       set current_stage       = greatest(current_stage, coalesce(p_unlocked_stage, current_stage)),
           last_question_date  = p_study_date,
           last_question_seq   = p_day_seq,
           last_practiced_at   = p_answered_at,
           learning_status     = case when v_word_done then 'initial_complete' else learning_status end,
           stage5_completed_at = case when v_word_done then p_answered_at else stage5_completed_at end,
           version             = version + 1
     where id = v_lv and user_id = v_uid;
  exception when unique_violation then
    -- Hai request trùng chạy song song: request sau đụng UNIQUE (user_id, client_event_id).
    -- Khối begin…exception hoàn tác mọi lệnh ở trên → không cộng điểm 2 lần.
    return jsonb_build_object('status', 'duplicate');
  end;

  return jsonb_build_object(
    'status', 'saved', 'version', v_version, 'cards_created', v_created, 'word_completed', v_word_done
  );
end;
$$;

comment on function public.submit_stage_exercise is
  'SCH-01: lưu một câu Stage (log + điểm + lịch + mở stage + card) trong một transaction; chống gửi trùng và ghi đè; không đụng card cũ.';

revoke execute on function public.submit_stage_exercise from public, anon;
grant  execute on function public.submit_stage_exercise to authenticated;
