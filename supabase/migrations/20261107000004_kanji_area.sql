-- =============================================================================
-- Khu Kanji (KJ-02): mỗi chữ qua giới thiệu → học ngắn hạn → ôn FSRS dài hạn.
-- Bảng riêng, không dùng chung Card từ vựng, nên học Kanji không đổi tiến độ từ vựng.
-- Chỉ thêm, chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
alter table public.kanji add column if not exists study_order integer check (study_order > 0);
comment on column public.kanji.study_order is 'Thứ tự học ở khu Kanji: chữ gặp trước trong lộ trình từ vựng học trước. pnpm seed điền.';
create index if not exists kanji_study_order_idx on public.kanji (study_order);

create table if not exists public.learner_kanji (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kanji_id            uuid not null references public.kanji (id) on delete restrict,
  phase               text not null default 'learning' check (phase in ('learning', 'review')),
  points              integer not null default 0 check (points >= 0),
  points_today        smallint not null default 0 check (points_today between 0 and 3),
  points_date         date,
  -- Lịch FSRS. Giai đoạn Học tối đa 2 ngày, giai đoạn Ôn không giới hạn.
  state               smallint not null default 0 check (state between 0 and 3),
  due_at              timestamptz not null default now(),
  stability           double precision not null default 0 check (stability >= 0),
  difficulty          double precision not null default 0 check (difficulty >= 0),
  scheduled_days      integer not null default 0 check (scheduled_days >= 0),
  learning_steps      integer not null default 0 check (learning_steps >= 0),
  reps                integer not null default 0 check (reps >= 0),
  lapses              integer not null default 0 check (lapses >= 0),
  last_review_at      timestamptz,
  completed_at        timestamptz,
  version             integer not null default 0,
  created_at          timestamptz not null default now(),

  constraint learner_kanji_user_kanji_key unique (user_id, kanji_id),
  constraint learner_kanji_learning_within_2_days check (phase = 'review' or scheduled_days <= 2),
  constraint learner_kanji_review_completed check ((phase = 'review') = (completed_at is not null))
);
comment on table public.learner_kanji is 'Tiến độ từng chữ của người học. Có dòng nghĩa là đã xem thẻ giới thiệu.';
create index if not exists learner_kanji_user_due_idx on public.learner_kanji (user_id, due_at);

create table if not exists public.kanji_logs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  learner_kanji_id  uuid not null references public.learner_kanji (id) on delete cascade,
  client_event_id   uuid not null,
  phase             text not null check (phase in ('learning', 'review')),
  exercise_type     text not null check (char_length(exercise_type) > 0),
  outcome           text not null check (outcome in ('correct', 'hint', 'wrong')),
  points            smallint not null default 0 check (points between -2 and 1),
  due_after         timestamptz not null,
  study_date        date not null,
  response_time_ms  integer check (response_time_ms >= 0),
  answered_at       timestamptz not null default now(),

  constraint kanji_logs_event_key unique (user_id, client_event_id)
);
comment on table public.kanji_logs is 'Nhật ký mỗi câu ở khu Kanji. Chỉ thêm.';
create index if not exists kanji_logs_card_idx on public.kanji_logs (learner_kanji_id, answered_at desc);
create index if not exists kanji_logs_user_date_idx on public.kanji_logs (user_id, study_date);

alter table public.learner_kanji enable row level security;
alter table public.kanji_logs enable row level security;

drop policy if exists "Owner can read own learner_kanji" on public.learner_kanji;
create policy "Owner can read own learner_kanji" on public.learner_kanji for select to authenticated
using ( (select auth.uid()) = user_id );
drop policy if exists "Owner can insert own learner_kanji" on public.learner_kanji;
create policy "Owner can insert own learner_kanji" on public.learner_kanji for insert to authenticated
with check ( (select auth.uid()) = user_id );
drop policy if exists "Owner can update own learner_kanji" on public.learner_kanji;
create policy "Owner can update own learner_kanji" on public.learner_kanji for update to authenticated
using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );

drop policy if exists "Owner can read own kanji_logs" on public.kanji_logs;
create policy "Owner can read own kanji_logs" on public.kanji_logs for select to authenticated
using ( (select auth.uid()) = user_id );
drop policy if exists "Owner can insert own kanji_logs" on public.kanji_logs;
create policy "Owner can insert own kanji_logs" on public.kanji_logs for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.learner_kanji lk where lk.id = learner_kanji_id and lk.user_id = (select auth.uid()))
);

revoke all on public.learner_kanji, public.kanji_logs from anon;
grant select, insert, update on public.learner_kanji to authenticated;
grant select, insert on public.kanji_logs to authenticated;

create or replace function public.submit_kanji_answer(
  p_learner_kanji_id uuid,
  p_client_event_id  uuid,
  p_expected_version integer,
  p_answered_at      timestamptz,
  p_exercise_type    text,
  p_outcome          text,
  p_points           smallint,
  p_study_date       date,
  p_response_time_ms integer,
  -- Trạng thái mới
  p_phase            text,
  p_total_points     integer,
  p_points_today     smallint,
  p_points_date      date,
  p_state            smallint,
  p_due_at           timestamptz,
  p_stability        double precision,
  p_difficulty       double precision,
  p_scheduled_days   integer,
  p_learning_steps   integer,
  p_reps             integer,
  p_lapses           integer,
  p_last_review_at   timestamptz,
  p_completed        boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_phase text;
begin
  if v_uid is null then
    raise exception 'submit_kanji_answer: not authenticated' using errcode = '28000';
  end if;
  if exists (select 1 from public.kanji_logs where user_id = v_uid and client_event_id = p_client_event_id) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  begin
    select phase into v_phase from public.learner_kanji where id = p_learner_kanji_id and user_id = v_uid;
    if not found then
      return jsonb_build_object('status', 'not_found');
    end if;

    update public.learner_kanji
       set phase          = p_phase,
           points         = p_total_points,
           points_today   = p_points_today,
           points_date    = p_points_date,
           state          = p_state,
           due_at         = p_due_at,
           stability      = p_stability,
           difficulty     = p_difficulty,
           scheduled_days = p_scheduled_days,
           learning_steps = p_learning_steps,
           reps           = p_reps,
           lapses         = p_lapses,
           last_review_at = p_last_review_at,
           completed_at   = case when p_completed then p_answered_at else completed_at end,
           version        = version + 1
     where id = p_learner_kanji_id
       and user_id = v_uid
       and version = p_expected_version;
    if not found then
      return jsonb_build_object('status', 'conflict');
    end if;

    insert into public.kanji_logs (
      user_id, learner_kanji_id, client_event_id, phase, exercise_type, outcome, points,
      due_after, study_date, response_time_ms, answered_at
    ) values (
      v_uid, p_learner_kanji_id, p_client_event_id, v_phase, p_exercise_type, p_outcome, p_points,
      p_due_at, p_study_date, p_response_time_ms, p_answered_at
    );
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicate');
  end;

  return jsonb_build_object('status', 'saved');
end;
$$;

comment on function public.submit_kanji_answer is
  'KJ-02: lưu một câu Kanji (log + điểm + lịch) trong một transaction; chống gửi trùng. Không đụng tiến độ từ vựng.';

revoke execute on function public.submit_kanji_answer from public, anon;
grant  execute on function public.submit_kanji_answer to authenticated;
