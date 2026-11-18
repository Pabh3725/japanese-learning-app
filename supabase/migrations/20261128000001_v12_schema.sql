-- =============================================================================
-- V12 gói 2 (docs/learning-rules-v12.md, docs/v12-implementation-plan.md §2.1): bảng cho ba khu Kana / Kanji / Từ vựng Kanji.
-- Chỉ THÊM: bảng V11 giữ nguyên tới gói 6. Người học không thấy gì tới khi bật cờ learning_v12 (gói 3) và chuyển dữ liệu (gói 4).
-- Chạy lại nhiều lần vẫn an toàn.
-- =============================================================================

-- 1. Dữ liệu nội dung
alter table public.radicals add column if not exists variants text not null default '';
alter table public.radicals add column if not exists meaning_vi text;
alter table public.radicals add column if not exists n5n4_kanji smallint not null default 0 check (n5n4_kanji >= 0);
alter table public.radicals add column if not exists meaning_approved boolean not null default false;
comment on column public.radicals.meaning_vi is 'V12: nghĩa tiếng Việt của bộ (data/n5/radical_meanings.csv). Chỉ dùng khi meaning_approved.';
comment on column public.radicals.n5n4_kanji is 'V12: số chữ N5–N4 có bộ này; bộ có trong ≥ 2 chữ thuộc phạm vi học (§5.1).';

alter table public.kanji add column if not exists freq_rank smallint check (freq_rank between 1 and 5000);
comment on column public.kanji.freq_rank is 'V12: hạng tần suất (KANJIDIC2 qua kanji-data, CC BY-SA 4.0); số nhỏ là phổ biến hơn. Null xếp cuối cấp.';

-- 2. Cài đặt
alter table public.learner_settings add column if not exists learning_v12 boolean not null default false;
alter table public.learner_settings add column if not exists set_size smallint not null default 20 check (set_size between 10 and 100);
alter table public.learner_settings add column if not exists v12_kana_cap smallint not null default 120 check (v12_kana_cap between 10 and 1000);
alter table public.learner_settings add column if not exists v12_kanji_cap smallint not null default 100 check (v12_kanji_cap between 10 and 1000);
alter table public.learner_settings add column if not exists v12_word_kanji_cap smallint not null default 80 check (v12_word_kanji_cap between 10 and 1000);
alter table public.learner_settings add column if not exists balance_on boolean not null default true;
alter table public.learner_settings add column if not exists balance_target text not null default 'minutes' check (balance_target in ('minutes', 'date'));
alter table public.learner_settings add column if not exists balance_date date;
alter table public.learner_settings add column if not exists balance_minutes smallint not null default 20 check (balance_minutes between 5 and 240);
alter table public.learner_settings add column if not exists balance_carry jsonb not null default '{}'::jsonb check (jsonb_typeof(balance_carry) = 'object');
alter table public.learner_settings add column if not exists v12_new_kana smallint not null default 5 check (v12_new_kana between 0 and 50);
alter table public.learner_settings add column if not exists v12_new_kanji smallint not null default 5 check (v12_new_kanji between 0 and 50);
alter table public.learner_settings add column if not exists v12_new_word_kanji smallint not null default 5 check (v12_new_word_kanji between 0 and 50);
comment on column public.learner_settings.learning_v12 is 'V12 gói 3: bật giao diện học V12 cho người này (thử trước khi bật cho mọi người).';

-- 3. Mục của người học (§1): Từ vựng Kana, bộ thủ, chữ Kanji, Từ vựng Kanji
create table if not exists public.learner_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  area            text not null check (area in ('kana', 'radical', 'kanji', 'word_kanji')),
  vocabulary_id   uuid references public.vocabularies (id) on delete restrict,
  kanji_id        uuid references public.kanji (id) on delete restrict,
  radical_number  smallint references public.radicals (number) on delete restrict,
  -- Stage đang học hoặc 'review' khi đã có Card. Bộ thủ không có Stage 3.
  stage           text not null default '1' check (stage in ('1', '2', '3', 'review')),
  -- Ngày học bắt đầu Stage này (Stage sau bắt đầu từ ngày học kế tiếp)
  stage_from      date not null,
  intro_seen_at   timestamptz,
  -- Chữ có cặp gần giống đã duyệt: thêm loại thẻ phân biệt ở Stage 3
  has_similar     boolean not null default false,
  -- Đã đánh dấu "đã biết": không vào bộ thẻ
  known_at        timestamptz,
  version         integer not null default 0 check (version >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint learner_items_ref check (
    (area in ('kana', 'word_kanji')) = (vocabulary_id is not null)
    and (area = 'kanji') = (kanji_id is not null)
    and (area = 'radical') = (radical_number is not null)
  ),
  constraint learner_items_radical_stage check (area <> 'radical' or stage <> '3')
);
comment on table public.learner_items is 'V12: một mục của người học ở một khu, Stage hiện tại. Điểm từng loại thẻ ở learner_item_types.';
create unique index if not exists learner_items_vocab_key on public.learner_items (user_id, area, vocabulary_id) where vocabulary_id is not null;
create unique index if not exists learner_items_kanji_key on public.learner_items (user_id, kanji_id) where kanji_id is not null;
create unique index if not exists learner_items_radical_key on public.learner_items (user_id, radical_number) where radical_number is not null;
create index if not exists learner_items_user_stage_idx on public.learner_items (user_id, area, stage);

-- 4. Điểm từng loại thẻ (§3.1)
create table if not exists public.learner_item_types (
  learner_item_id uuid not null references public.learner_items (id) on delete cascade,
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  stage           smallint not null check (stage between 1 and 3),
  card_type       text not null check (char_length(card_type) between 1 and 40),
  points          smallint not null default 0 check (points between 0 and 3),
  seen_date       date,
  seen_today      smallint not null default 0 check (seen_today >= 0),
  wrong_today     smallint not null default 0 check (wrong_today >= 0),
  updated_at      timestamptz not null default now(),
  primary key (learner_item_id, stage, card_type)
);
comment on table public.learner_item_types is 'V12 §3.1: điểm (0–3) và số lần gặp trong ngày của từng loại thẻ ở từng Stage.';
create index if not exists learner_item_types_user_idx on public.learner_item_types (user_id);

-- 5. Card FSRS (§3.3)
create table if not exists public.item_cards (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  learner_item_id  uuid not null references public.learner_items (id) on delete cascade,
  card_type        text not null check (card_type in ('kana_type', 'kana_choose', 'radical', 'kanji', 'word_kanji')),
  state            smallint not null default 0 check (state between 0 and 3),
  due_at           timestamptz not null,
  stability        double precision not null default 0 check (stability >= 0),
  difficulty       double precision not null default 0 check (difficulty >= 0),
  scheduled_days   integer not null default 0 check (scheduled_days between 0 and 90),
  learning_steps   integer not null default 0 check (learning_steps >= 0),
  reps             integer not null default 0 check (reps >= 0),
  lapses           integer not null default 0 check (lapses >= 0),
  last_review_at   timestamptz,
  archived_at      timestamptz,
  version          integer not null default 0 check (version >= 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint item_cards_item_type_key unique (learner_item_id, card_type)
);
comment on table public.item_cards is 'V12: Card FSRS gom chung của một mục (Kana 2 Card, bộ thủ / chữ / Từ vựng Kanji 1 Card).';
create index if not exists item_cards_user_due_idx on public.item_cards (user_id, due_at) where archived_at is null;

-- 6. Nhật ký trả lời (có thời gian trả lời cho cân bằng §8.1)
create table if not exists public.item_logs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  learner_item_id  uuid not null references public.learner_items (id) on delete cascade,
  item_card_id     uuid references public.item_cards (id) on delete set null,
  client_event_id  uuid not null,
  area             text not null check (area in ('kana', 'radical', 'kanji', 'word_kanji')),
  -- '1' '2' '3': câu Stage; 'review': Card; 'star': câu học thêm của từ có sao (không tính điểm)
  stage            text not null check (stage in ('1', '2', '3', 'review', 'star')),
  card_type        text not null check (char_length(card_type) between 1 and 40),
  correct          boolean not null,
  points_delta     smallint not null default 0 check (points_delta between -1 and 1),
  rating           text check (rating in ('Again', 'Hard', 'Good')),
  state_before     smallint check (state_before between 0 and 3),
  due_after        timestamptz,
  stability_after  double precision,
  elapsed_ms       integer check (elapsed_ms between 0 and 3600000),
  study_date       date not null,
  answered_at      timestamptz not null default now(),
  constraint item_logs_event_key unique (user_id, client_event_id)
);
comment on table public.item_logs is 'V12: mỗi câu trả lời (Stage, Card, câu sao). Chỉ thêm.';
create index if not exists item_logs_user_date_idx on public.item_logs (user_id, study_date);

-- 7. Bộ thẻ trong ngày (§2): lưu thứ tự để tải lại trang hay đổi máy vẫn giữ nguyên
create table if not exists public.daily_decks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  study_date  date not null,
  scope       text not null check (scope in ('kana', 'kanji', 'word_kanji', 'all')),
  cards       jsonb not null check (jsonb_typeof(cards) = 'array'),
  position    integer not null default 0 check (position >= 0),
  -- Phần vượt trần chuyển sang hôm sau (số mục / câu), để hiện cho người học
  deferred    jsonb not null default '{}'::jsonb check (jsonb_typeof(deferred) = 'object'),
  version     integer not null default 0 check (version >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint daily_decks_user_day_scope_key unique (user_id, study_date, scope)
);
comment on table public.daily_decks is 'V12 §2: bộ thẻ trộn sẵn của một ngày, một phạm vi (khu hoặc Học tất cả), và vị trí đang học.';

-- 8. RLS: chủ sở hữu đọc / thêm / sửa; không xóa
do $$
declare t text;
begin
  foreach t in array array['learner_items', 'learner_item_types', 'item_cards', 'item_logs', 'daily_decks'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Owner can read own %1$s" on public.%1$I', t);
    execute format('create policy "Owner can read own %1$s" on public.%1$I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('drop policy if exists "Owner can insert own %1$s" on public.%1$I', t);
    execute format('create policy "Owner can insert own %1$s" on public.%1$I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke delete, truncate on public.%I from authenticated', t);
    execute format('grant select, insert on public.%I to authenticated', t);
  end loop;
  foreach t in array array['learner_items', 'learner_item_types', 'item_cards', 'daily_decks'] loop
    execute format('drop policy if exists "Owner can update own %1$s" on public.%1$I', t);
    execute format('create policy "Owner can update own %1$s" on public.%1$I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('grant update on public.%I to authenticated', t);
  end loop;
end $$;

drop trigger if exists learner_items_updated_at on public.learner_items;
create trigger learner_items_updated_at before update on public.learner_items for each row execute function public.set_updated_at();
drop trigger if exists learner_item_types_updated_at on public.learner_item_types;
create trigger learner_item_types_updated_at before update on public.learner_item_types for each row execute function public.set_updated_at();
drop trigger if exists item_cards_updated_at on public.item_cards;
create trigger item_cards_updated_at before update on public.item_cards for each row execute function public.set_updated_at();
drop trigger if exists daily_decks_updated_at on public.daily_decks;
create trigger daily_decks_updated_at before update on public.daily_decks for each row execute function public.set_updated_at();

-- 9. Mở một mục mới (Stage 1 từ hôm nay) cùng các loại thẻ Stage 1. Đã có thì trả mục đang có.
create or replace function public.v12_open_item(
  p_area            text,
  p_vocabulary_id   uuid,
  p_kanji_id        uuid,
  p_radical_number  smallint,
  p_stage_from      date,
  p_has_similar     boolean,
  p_types           text[]
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'v12_open_item: not authenticated' using errcode = '28000';
  end if;
  select id into v_id from public.learner_items
   where user_id = v_uid and area = p_area
     and vocabulary_id is not distinct from p_vocabulary_id
     and kanji_id is not distinct from p_kanji_id
     and radical_number is not distinct from p_radical_number;
  if v_id is not null then
    return jsonb_build_object('status', 'exists', 'id', v_id);
  end if;
  insert into public.learner_items (user_id, area, vocabulary_id, kanji_id, radical_number, stage, stage_from, has_similar)
  values (v_uid, p_area, p_vocabulary_id, p_kanji_id, p_radical_number, '1', p_stage_from, coalesce(p_has_similar, false))
  returning id into v_id;
  insert into public.learner_item_types (learner_item_id, user_id, stage, card_type)
  select v_id, v_uid, 1, t from unnest(p_types) as t;
  return jsonb_build_object('status', 'saved', 'id', v_id);
exception when unique_violation then
  select id into v_id from public.learner_items
   where user_id = v_uid and area = p_area
     and vocabulary_id is not distinct from p_vocabulary_id
     and kanji_id is not distinct from p_kanji_id
     and radical_number is not distinct from p_radical_number;
  return jsonb_build_object('status', 'exists', 'id', v_id);
end;
$$;
comment on function public.v12_open_item is 'V12: mở một mục (Stage 1) cùng các loại thẻ Stage 1; đã có thì trả mục đang có.';
revoke execute on function public.v12_open_item from public, anon;
grant execute on function public.v12_open_item to authenticated;

-- 10. Lưu một câu Stage (§3): điểm loại thẻ, chuyển Stage, tạo Card, nhật ký — một transaction, có version, chống gửi trùng.
-- Luật tính ở lib/v12/stage.ts (applyAnswer); hàm này chỉ ghi kết quả.
create or replace function public.v12_save_answer(
  p_item_id          uuid,
  p_expected_version integer,
  p_client_event_id  uuid,
  p_stage            smallint,
  p_card_type        text,
  p_correct          boolean,
  p_points_delta     smallint,
  -- Trạng thái mới của loại thẻ vừa trả lời: {points, seen_date, seen_today, wrong_today}
  p_type_state       jsonb,
  -- Stage sau khi trả lời ('1' '2' '3' 'review') và ngày bắt đầu
  p_new_stage        text,
  p_new_stage_from   date,
  -- Loại thẻ của Stage mới (khi vừa chuyển Stage)
  p_new_types        text[],
  -- Card cần tạo khi vừa xong Stage cuối: [{card_type, due_at}]
  p_cards            jsonb,
  p_elapsed_ms       integer,
  p_study_date       date,
  p_answered_at      timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_area text;
  v_new_stage smallint;
begin
  if v_uid is null then
    raise exception 'v12_save_answer: not authenticated' using errcode = '28000';
  end if;
  if exists (select 1 from public.item_logs where user_id = v_uid and client_event_id = p_client_event_id) then
    return jsonb_build_object('status', 'duplicate');
  end if;
  begin
    update public.learner_items
       set stage = p_new_stage, stage_from = p_new_stage_from, intro_seen_at = coalesce(intro_seen_at, p_answered_at), version = version + 1
     where id = p_item_id and user_id = v_uid and version = p_expected_version and known_at is null
    returning area into v_area;
    if not found then
      if not exists (select 1 from public.learner_items where id = p_item_id and user_id = v_uid) then
        return jsonb_build_object('status', 'not_found');
      end if;
      return jsonb_build_object('status', 'conflict');
    end if;

    insert into public.learner_item_types (learner_item_id, user_id, stage, card_type, points, seen_date, seen_today, wrong_today)
    values (p_item_id, v_uid, p_stage, p_card_type, (p_type_state->>'points')::smallint, (p_type_state->>'seen_date')::date,
            (p_type_state->>'seen_today')::smallint, (p_type_state->>'wrong_today')::smallint)
    on conflict (learner_item_id, stage, card_type) do update
      set points = excluded.points, seen_date = excluded.seen_date, seen_today = excluded.seen_today, wrong_today = excluded.wrong_today;

    if p_new_stage in ('1', '2', '3') and p_new_stage::smallint <> p_stage then
      v_new_stage := p_new_stage::smallint;
      insert into public.learner_item_types (learner_item_id, user_id, stage, card_type)
      select p_item_id, v_uid, v_new_stage, t from unnest(coalesce(p_new_types, '{}'::text[])) as t
      on conflict (learner_item_id, stage, card_type) do nothing;
    end if;

    insert into public.item_cards (user_id, learner_item_id, card_type, due_at)
    select v_uid, p_item_id, c->>'card_type', (c->>'due_at')::timestamptz from jsonb_array_elements(coalesce(p_cards, '[]'::jsonb)) as c
    on conflict (learner_item_id, card_type) do nothing;

    insert into public.item_logs (user_id, learner_item_id, client_event_id, area, stage, card_type, correct, points_delta, elapsed_ms, study_date, answered_at)
    values (v_uid, p_item_id, p_client_event_id, v_area, p_stage::text, p_card_type, p_correct, p_points_delta, p_elapsed_ms, p_study_date, p_answered_at);
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicate');
  end;
  return jsonb_build_object('status', 'saved');
end;
$$;
comment on function public.v12_save_answer is 'V12: lưu một câu Stage (điểm loại thẻ, chuyển Stage, tạo Card, log) trong một transaction; chống gửi trùng.';
revoke execute on function public.v12_save_answer from public, anon;
grant execute on function public.v12_save_answer to authenticated;

-- 11. Lưu một lần ôn Card (FSRS tính ở lib/srs/scheduler.ts).
create or replace function public.v12_save_card(
  p_card_id          uuid,
  p_expected_version integer,
  p_client_event_id  uuid,
  p_correct          boolean,
  p_rating           text,
  p_state            smallint,
  p_due_at           timestamptz,
  p_stability        double precision,
  p_difficulty       double precision,
  p_scheduled_days   integer,
  p_learning_steps   integer,
  p_reps             integer,
  p_lapses           integer,
  p_last_review_at   timestamptz,
  p_elapsed_ms       integer,
  p_study_date       date,
  p_answered_at      timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_item  uuid;
  v_type  text;
  v_area  text;
  v_state smallint;
begin
  if v_uid is null then
    raise exception 'v12_save_card: not authenticated' using errcode = '28000';
  end if;
  if p_scheduled_days > 90 then
    raise exception 'v12_save_card: lịch vượt 90 ngày' using errcode = '22023';
  end if;
  if exists (select 1 from public.item_logs where user_id = v_uid and client_event_id = p_client_event_id) then
    return jsonb_build_object('status', 'duplicate');
  end if;
  select state into v_state from public.item_cards where id = p_card_id and user_id = v_uid;
  begin
    update public.item_cards
       set state = p_state, due_at = p_due_at, stability = p_stability, difficulty = p_difficulty,
           scheduled_days = p_scheduled_days, learning_steps = p_learning_steps, reps = p_reps, lapses = p_lapses,
           last_review_at = p_last_review_at, version = version + 1
     where id = p_card_id and user_id = v_uid and archived_at is null and version = p_expected_version
    returning learner_item_id, card_type into v_item, v_type;
    if not found then
      if not exists (select 1 from public.item_cards where id = p_card_id and user_id = v_uid) then
        return jsonb_build_object('status', 'not_found');
      elsif exists (select 1 from public.item_cards where id = p_card_id and user_id = v_uid and archived_at is not null) then
        return jsonb_build_object('status', 'not_active');
      end if;
      return jsonb_build_object('status', 'conflict');
    end if;
    select area into v_area from public.learner_items where id = v_item;
    insert into public.item_logs (user_id, learner_item_id, item_card_id, client_event_id, area, stage, card_type, correct, rating,
                                  state_before, due_after, stability_after, elapsed_ms, study_date, answered_at)
    values (v_uid, v_item, p_card_id, p_client_event_id, v_area, 'review', v_type, p_correct, p_rating,
            v_state, p_due_at, p_stability, p_elapsed_ms, p_study_date, p_answered_at);
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicate');
  end;
  return jsonb_build_object('status', 'saved');
end;
$$;
comment on function public.v12_save_card is 'V12: lưu một lần ôn Card (lịch FSRS + log) trong một transaction; chống gửi trùng; Card lưu trữ thì không nhận.';
revoke execute on function public.v12_save_card from public, anon;
grant execute on function public.v12_save_card to authenticated;
