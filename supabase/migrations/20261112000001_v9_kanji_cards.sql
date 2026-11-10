-- =============================================================================
-- Design V9, gói 4a: Kanji riêng lẻ có 2 Card, trần ôn riêng từng loại. docs/learning-rules.md §7, §9.4, §12.
-- - learner_kanji_cards: Card kanji.meaning (mặt chữ ↔ nghĩa) và kanji.hanviet; ôn trong khu Kanji, không vào tab Review.
-- - Chữ đang ôn dài hạn: tạo 2 Card, chép nguyên lịch hiện tại sang cả hai. Log cũ giữ nguyên.
-- - submit_kanji_answer: hoàn tất giai đoạn Học thì tạo 2 Card.
-- - submit_kanji_card_answer: lưu một câu ôn Card (log + lịch) trong một transaction, chống gửi trùng.
-- - learner_settings: trần Card Từ vựng Kanji và Card Kanji mỗi ngày.
-- Chỉ thêm; chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
create table if not exists public.learner_kanji_cards (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  learner_kanji_id  uuid not null references public.learner_kanji (id) on delete cascade,
  card_type         text not null check (card_type in ('kanji.meaning', 'kanji.hanviet')),
  state             smallint not null default 0 check (state between 0 and 3),
  due_at            timestamptz not null default now(),
  stability         double precision not null default 0 check (stability >= 0),
  difficulty        double precision not null default 0 check (difficulty >= 0),
  scheduled_days    integer not null default 0 check (scheduled_days >= 0),
  learning_steps    integer not null default 0 check (learning_steps >= 0),
  reps              integer not null default 0 check (reps >= 0),
  lapses            integer not null default 0 check (lapses >= 0),
  last_review_at    timestamptz,
  -- Gói 4b: người học bấm "Đã học xong" cho riêng Card này
  archived_at       timestamptz,
  version           integer not null default 0 check (version >= 0),
  created_at        timestamptz not null default now(),

  constraint learner_kanji_cards_kanji_type_key unique (learner_kanji_id, card_type)
);
comment on table public.learner_kanji_cards is
  'V9: 2 Card ôn dài hạn của một chữ Kanji (kanji.meaning, kanji.hanviet). Lịch độc lập, ôn trong khu Kanji.';
create index if not exists learner_kanji_cards_user_due_idx on public.learner_kanji_cards (user_id, due_at) where archived_at is null;

alter table public.learner_kanji_cards enable row level security;
drop policy if exists "Owner can read own kanji cards" on public.learner_kanji_cards;
create policy "Owner can read own kanji cards" on public.learner_kanji_cards for select to authenticated
using ( (select auth.uid()) = user_id );
drop policy if exists "Owner can insert own kanji cards" on public.learner_kanji_cards;
create policy "Owner can insert own kanji cards" on public.learner_kanji_cards for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.learner_kanji lk where lk.id = learner_kanji_id and lk.user_id = (select auth.uid()))
);
drop policy if exists "Owner can update own kanji cards" on public.learner_kanji_cards;
create policy "Owner can update own kanji cards" on public.learner_kanji_cards for update to authenticated
using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );
revoke all on public.learner_kanji_cards from anon;
grant select, insert, update on public.learner_kanji_cards to authenticated;

-- Câu ôn Card ghi vào kanji_logs, kèm Card nào
alter table public.kanji_logs add column if not exists learner_kanji_card_id uuid references public.learner_kanji_cards (id) on delete cascade;
create index if not exists kanji_logs_card_id_idx on public.kanji_logs (learner_kanji_card_id, answered_at desc) where learner_kanji_card_id is not null;

-- Chữ đã xong giai đoạn Học: 2 Card mang lịch hiện tại
insert into public.learner_kanji_cards (
  user_id, learner_kanji_id, card_type, state, due_at, stability, difficulty, scheduled_days,
  learning_steps, reps, lapses, last_review_at, created_at
)
select lk.user_id, lk.id, t.card_type, lk.state, lk.due_at, lk.stability, lk.difficulty, lk.scheduled_days,
       lk.learning_steps, lk.reps, lk.lapses, lk.last_review_at, coalesce(lk.completed_at, now())
  from public.learner_kanji lk
 cross join (values ('kanji.meaning'), ('kanji.hanviet')) as t(card_type)
 where lk.phase = 'review'
on conflict (learner_kanji_id, card_type) do nothing;

-- Trần ôn riêng từng loại. review_cap cũ là trần Card Từ vựng Kana.
alter table public.learner_settings add column if not exists word_kanji_review_cap smallint not null default 60 check (word_kanji_review_cap between 10 and 500);
alter table public.learner_settings add column if not exists kanji_review_cap smallint not null default 60 check (kanji_review_cap between 10 and 500);
comment on column public.learner_settings.review_cap is 'V9: Card Từ vựng Kana (kể cả Card sao) ôn tối đa mỗi ngày.';
comment on column public.learner_settings.kanji_cap is 'V9: câu giai đoạn Học của khu Kanji tối đa mỗi ngày. Câu ôn Card Kanji có trần kanji_review_cap.';

-- Hoàn tất giai đoạn Học: tạo 2 Card, hạn đầu như lịch ôn đầu tiên
do $$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'submit_kanji_answer';
  if position('learner_kanji_cards' in v_def) > 0 then
    return;
  end if;
  if position('exception when unique_violation then' in v_def) = 0 then
    raise exception 'v9_kanji_cards: không tìm thấy chỗ chèn trong submit_kanji_answer';
  end if;
  execute replace(v_def, 'exception when unique_violation then', $ins$
    if p_completed then
      insert into public.learner_kanji_cards (user_id, learner_kanji_id, card_type, due_at)
      select v_uid, p_learner_kanji_id, t, p_due_at from unnest(array['kanji.meaning', 'kanji.hanviet']) as t
      on conflict (learner_kanji_id, card_type) do nothing;
    end if;
  exception when unique_violation then$ins$);
end;
$$;

create or replace function public.submit_kanji_card_answer(
  p_card_id          uuid,
  p_client_event_id  uuid,
  p_expected_version integer,
  p_answered_at      timestamptz,
  p_exercise_type    text,
  p_outcome          text,
  p_study_date       date,
  p_response_time_ms integer,
  p_state            smallint,
  p_due_at           timestamptz,
  p_stability        double precision,
  p_difficulty       double precision,
  p_scheduled_days   integer,
  p_learning_steps   integer,
  p_reps             integer,
  p_lapses           integer,
  p_last_review_at   timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_lk  uuid;
begin
  if v_uid is null then
    raise exception 'submit_kanji_card_answer: not authenticated' using errcode = '28000';
  end if;
  if p_scheduled_days > 90 then
    raise exception 'submit_kanji_card_answer: lịch vượt 90 ngày' using errcode = '22023';
  end if;
  if exists (select 1 from public.kanji_logs where user_id = v_uid and client_event_id = p_client_event_id) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  begin
    update public.learner_kanji_cards
       set state          = p_state,
           due_at         = p_due_at,
           stability      = p_stability,
           difficulty     = p_difficulty,
           scheduled_days = p_scheduled_days,
           learning_steps = p_learning_steps,
           reps           = p_reps,
           lapses         = p_lapses,
           last_review_at = p_last_review_at,
           version        = version + 1
     where id = p_card_id
       and user_id = v_uid
       and archived_at is null
       and version = p_expected_version
    returning learner_kanji_id into v_lk;
    if not found then
      if not exists (select 1 from public.learner_kanji_cards where id = p_card_id and user_id = v_uid) then
        return jsonb_build_object('status', 'not_found');
      elsif exists (select 1 from public.learner_kanji_cards where id = p_card_id and user_id = v_uid and archived_at is not null) then
        return jsonb_build_object('status', 'not_active');
      end if;
      return jsonb_build_object('status', 'conflict');
    end if;

    insert into public.kanji_logs (
      user_id, learner_kanji_id, learner_kanji_card_id, client_event_id, phase, exercise_type, outcome, points,
      due_after, study_date, response_time_ms, answered_at
    ) values (
      v_uid, v_lk, p_card_id, p_client_event_id, 'review', p_exercise_type, p_outcome, 0,
      p_due_at, p_study_date, p_response_time_ms, p_answered_at
    );
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicate');
  end;
  return jsonb_build_object('status', 'saved');
end;
$$;
comment on function public.submit_kanji_card_answer is
  'V9: lưu một câu ôn Card Kanji (log + lịch) trong một transaction; chống gửi trùng; Card đã lưu trữ thì không nhận.';
revoke execute on function public.submit_kanji_card_answer from public, anon;
grant  execute on function public.submit_kanji_card_answer to authenticated;
