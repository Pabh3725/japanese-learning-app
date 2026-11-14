-- =============================================================================
-- Library V10 (chủ dự án duyệt 2026-11-14):
-- 1. Dấu sao cho Kanji, cùng thuật toán với từ vựng: vòng học thêm (tối đa 4 câu, không điểm) và Card riêng
--    `kanji.star` (FSRS riêng, ôn trong khu Kanji, xếp sau Card thường). Bỏ sao thì Card riêng tạm dừng.
-- 2. Hoàn tác "Mark as learned" (từ vựng và ngữ pháp): mỗi lần đánh dấu lưu trạng thái trước đó.
-- Chỉ thêm; chạy lại nhiều lần vẫn an toàn.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Dấu sao cho Kanji
-- ---------------------------------------------------------------------------
create table if not exists public.learner_kanji_stars (
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kanji_id        uuid not null references public.kanji (id) on delete restrict,
  starred_at      timestamptz not null default now(),
  -- Số câu đã làm trong vòng học thêm của lần đánh sao này. Bỏ sao xóa dòng nên vòng tính lại từ đầu.
  round_answered  smallint not null default 0 check (round_answered >= 0),

  primary key (user_id, kanji_id)
);
comment on table public.learner_kanji_stars is
  'Chữ Kanji có dấu sao: vòng học thêm không điểm và Card riêng kanji.star. Có thể đánh dấu cả chữ chưa học.';

alter table public.learner_kanji_stars enable row level security;
drop policy if exists "Owner can read own kanji stars" on public.learner_kanji_stars;
create policy "Owner can read own kanji stars" on public.learner_kanji_stars for select to authenticated
using ( (select auth.uid()) = user_id );
drop policy if exists "Owner can insert own kanji stars" on public.learner_kanji_stars;
create policy "Owner can insert own kanji stars" on public.learner_kanji_stars for insert to authenticated
with check ( (select auth.uid()) = user_id );
drop policy if exists "Owner can update own kanji stars" on public.learner_kanji_stars;
create policy "Owner can update own kanji stars" on public.learner_kanji_stars for update to authenticated
using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );
drop policy if exists "Owner can delete own kanji stars" on public.learner_kanji_stars;
create policy "Owner can delete own kanji stars" on public.learner_kanji_stars for delete to authenticated
using ( (select auth.uid()) = user_id );
revoke all on public.learner_kanji_stars from anon;
grant select, insert, update, delete on public.learner_kanji_stars to authenticated;

-- Card riêng của chữ có sao
alter table public.learner_kanji_cards drop constraint if exists learner_kanji_cards_card_type_check;
alter table public.learner_kanji_cards add constraint learner_kanji_cards_card_type_check
  check (card_type in ('kanji.meaning', 'kanji.hanviet', 'kanji.star'));

-- ---------------------------------------------------------------------------
-- 2. Lịch sử đánh dấu "đã học", để hoàn tác
-- ---------------------------------------------------------------------------
create table if not exists public.learner_mark_history (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind           text not null check (kind in ('vocab', 'grammar')),
  -- vocabulary_id hoặc grammar_points.id
  item_id        uuid not null,
  -- Trạng thái trước khi đánh dấu; null khi trước đó chưa có tiến độ
  before         jsonb,
  -- Card do lần đánh dấu tạo ra (chỉ từ vựng): hoàn tác thì xóa
  created_cards  uuid[] not null default '{}',
  marked_at      timestamptz not null default now(),
  undone_at      timestamptz
);
comment on table public.learner_mark_history is
  'Mỗi lần đánh dấu "đã học" một từ hoặc một mẫu ngữ pháp: trạng thái trước đó, để hoàn tác (V10).';
create index if not exists learner_mark_history_item_idx on public.learner_mark_history (user_id, kind, item_id, marked_at desc);

alter table public.learner_mark_history enable row level security;
drop policy if exists "Owner can read own mark history" on public.learner_mark_history;
create policy "Owner can read own mark history" on public.learner_mark_history for select to authenticated
using ( (select auth.uid()) = user_id );
drop policy if exists "Owner can insert own mark history" on public.learner_mark_history;
create policy "Owner can insert own mark history" on public.learner_mark_history for insert to authenticated
with check ( (select auth.uid()) = user_id );
drop policy if exists "Owner can update own mark history" on public.learner_mark_history;
create policy "Owner can update own mark history" on public.learner_mark_history for update to authenticated
using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );
revoke all on public.learner_mark_history from anon;
grant select, insert, update on public.learner_mark_history to authenticated;

-- Đánh dấu đã học (thay bản 20261118000001): như cũ, thêm bước lưu trạng thái trước đó
create or replace function public.mark_words_learned(p_items jsonb, p_at timestamptz)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_item    jsonb;
  v_vocab   uuid;
  v_lv      uuid;
  v_kanji   boolean;
  v_count   integer := 0;
  v_before  jsonb;
  v_cards   uuid[];
  v_card    uuid;
begin
  if v_uid is null then
    raise exception 'mark_words_learned: not authenticated' using errcode = '28000';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 1000 then
    raise exception 'mark_words_learned: p_items phải là mảng tối đa 1000 phần tử' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_vocab := (v_item ->> 'vocabulary_id')::uuid;
    v_kanji := coalesce((v_item ->> 'kanji')::boolean, false);
    continue when not exists (select 1 from public.vocabularies where id = v_vocab);

    -- Trạng thái trước khi đánh dấu: tiến độ của từ, các Stage, và từ có đang bị loại không
    select jsonb_build_object(
             'current_stage', lv.current_stage,
             'learning_status', lv.learning_status,
             'stage5_completed_at', lv.stage5_completed_at,
             'kanji_intro_seen_at', lv.kanji_intro_seen_at,
             'schedules', coalesce((select jsonb_agg(jsonb_build_object('stage_number', s.stage_number, 'completed_at', s.completed_at, 'unlocked_next_at', s.unlocked_next_at))
                                      from public.learner_stage_schedules s where s.learner_vocabulary_id = lv.id), '[]'::jsonb),
             'excluded_at', (select e.excluded_at from public.learner_vocabulary_exclusions e where e.user_id = v_uid and e.vocabulary_id = v_vocab))
      into v_before
      from public.learner_vocabulary lv
     where lv.user_id = v_uid and lv.vocabulary_id = v_vocab;
    if v_before is null then
      v_before := jsonb_build_object('excluded_at', (select e.excluded_at from public.learner_vocabulary_exclusions e where e.user_id = v_uid and e.vocabulary_id = v_vocab), 'new', true);
    end if;
    v_cards := '{}';

    insert into public.learner_vocabulary (user_id, vocabulary_id, current_stage, learning_status, stage5_completed_at, kanji_intro_seen_at)
    values (v_uid, v_vocab, 3, 'initial_complete', p_at, case when v_kanji then p_at end)
    on conflict (user_id, vocabulary_id) do update
       set current_stage       = 3,
           learning_status     = 'initial_complete',
           stage5_completed_at = coalesce(public.learner_vocabulary.stage5_completed_at, p_at),
           kanji_intro_seen_at = case when v_kanji then coalesce(public.learner_vocabulary.kanji_intro_seen_at, p_at) else public.learner_vocabulary.kanji_intro_seen_at end,
           version             = public.learner_vocabulary.version + 1,
           updated_at          = p_at
    returning id into v_lv;

    insert into public.learner_stage_schedules (user_id, learner_vocabulary_id, stage_number, unlocked_next_at, completed_at, due_at)
    select v_uid, v_lv, s, p_at, p_at, p_at
      from unnest(case when v_kanji then array[2, 3, 5, 6] else array[2, 3] end) as s
    on conflict (learner_vocabulary_id, stage_number) do update
       set unlocked_next_at = coalesce(public.learner_stage_schedules.unlocked_next_at, p_at),
           completed_at     = coalesce(public.learner_stage_schedules.completed_at, p_at),
           version          = public.learner_stage_schedules.version + 1,
           updated_at       = p_at;

    -- Card: chỉ tạo khi chưa có (Card đã có giữ nguyên lịch); ghi lại Card vừa tạo để hoàn tác
    if not exists (select 1 from public.review_cards where learner_vocabulary_id = v_lv and card_type = 'vocab.kana') then
      insert into public.review_cards (user_id, learner_vocabulary_id, card_type, due_at)
      values (v_uid, v_lv, 'vocab.kana', (v_item ->> 'kana_due')::timestamptz)
      returning id into v_card;
      v_cards := v_cards || v_card;
    end if;
    if v_kanji and not exists (select 1 from public.review_cards where learner_vocabulary_id = v_lv and card_type = 'vocab.kanji') then
      insert into public.review_cards (user_id, learner_vocabulary_id, card_type, due_at)
      values (v_uid, v_lv, 'vocab.kanji', (v_item ->> 'kanji_due')::timestamptz)
      returning id into v_card;
      v_cards := v_cards || v_card;
    end if;

    update public.learner_vocabulary_exclusions set excluded_at = null where user_id = v_uid and vocabulary_id = v_vocab and excluded_at is not null;

    insert into public.learner_mark_history (user_id, kind, item_id, before, created_cards, marked_at)
    values (v_uid, 'vocab', v_vocab, v_before, v_cards, p_at);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('status', 'saved', 'marked', v_count);
end;
$$;

comment on function public.mark_words_learned is
  'Đánh dấu đã học: xong Stage 1–3 (và 4–6 nếu có Kanji), tạo Card Kana (và Card Kanji); lưu trạng thái trước đó vào learner_mark_history để hoàn tác.';
revoke execute on function public.mark_words_learned from public, anon;
grant execute on function public.mark_words_learned to authenticated;

-- Hoàn tác lần đánh dấu gần nhất (chưa hoàn tác) của từng từ: trả tiến độ, Stage, trạng thái loại về như trước;
-- xóa Card do lần đánh dấu tạo ra (kèm lịch sử ôn của Card đó). Từ trước đó chưa có tiến độ thì xóa tiến độ.
-- SECURITY DEFINER: người học không có quyền xóa trực tiếp tiến độ, Stage hay Card (RLS chỉ cho đọc/ghi).
-- Mọi câu lệnh bên dưới đều lọc theo auth.uid().
create or replace function public.undo_mark_words_learned(p_vocabulary_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_vocab  uuid;
  v_hist   public.learner_mark_history;
  v_lv     uuid;
  v_s      jsonb;
  v_count  integer := 0;
begin
  if v_uid is null then
    raise exception 'undo_mark_words_learned: not authenticated' using errcode = '28000';
  end if;
  if cardinality(p_vocabulary_ids) > 1000 then
    raise exception 'undo_mark_words_learned: tối đa 1000 từ' using errcode = '22023';
  end if;

  foreach v_vocab in array p_vocabulary_ids loop
    select * into v_hist from public.learner_mark_history
     where user_id = v_uid and kind = 'vocab' and item_id = v_vocab and undone_at is null
     order by marked_at desc limit 1;
    continue when not found;

    select id into v_lv from public.learner_vocabulary where user_id = v_uid and vocabulary_id = v_vocab;
    if v_lv is not null then
      if v_hist.before ? 'new' then
        -- Trước đó chưa gặp từ này: bỏ toàn bộ tiến độ (Stage, Card, nhật ký đi theo)
        delete from public.learner_vocabulary where id = v_lv and user_id = v_uid;
      else
        delete from public.review_cards where id = any (v_hist.created_cards) and user_id = v_uid;
        update public.learner_vocabulary
           set current_stage       = (v_hist.before ->> 'current_stage')::smallint,
               learning_status     = v_hist.before ->> 'learning_status',
               stage5_completed_at = (v_hist.before ->> 'stage5_completed_at')::timestamptz,
               kanji_intro_seen_at = (v_hist.before ->> 'kanji_intro_seen_at')::timestamptz,
               version             = version + 1
         where id = v_lv and user_id = v_uid;
        -- Stage do lần đánh dấu tạo ra thì xóa; Stage đã có thì trả mốc hoàn tất về như trước
        delete from public.learner_stage_schedules s
         where s.learner_vocabulary_id = v_lv and s.user_id = v_uid
           and not exists (select 1 from jsonb_array_elements(v_hist.before -> 'schedules') b where (b ->> 'stage_number')::smallint = s.stage_number);
        for v_s in select * from jsonb_array_elements(v_hist.before -> 'schedules') loop
          update public.learner_stage_schedules
             set completed_at     = (v_s ->> 'completed_at')::timestamptz,
                 unlocked_next_at = (v_s ->> 'unlocked_next_at')::timestamptz,
                 version          = version + 1
           where learner_vocabulary_id = v_lv and user_id = v_uid and stage_number = (v_s ->> 'stage_number')::smallint;
        end loop;
      end if;
    end if;

    -- Từ đang bị loại trước khi đánh dấu thì loại lại
    if v_hist.before ->> 'excluded_at' is not null then
      update public.learner_vocabulary_exclusions set excluded_at = (v_hist.before ->> 'excluded_at')::timestamptz
       where user_id = v_uid and vocabulary_id = v_vocab;
    end if;

    update public.learner_mark_history set undone_at = now() where id = v_hist.id and user_id = v_uid;
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('status', 'saved', 'undone', v_count);
end;
$$;

comment on function public.undo_mark_words_learned is
  'Hoàn tác "Mark as learned" của các từ: trả về trạng thái trước lần đánh dấu gần nhất, xóa Card do lần đó tạo ra.';
revoke execute on function public.undo_mark_words_learned from public, anon;
grant execute on function public.undo_mark_words_learned to authenticated;

-- Hoàn tác đánh dấu ngữ pháp (đã học, hoặc đã biết không ôn): trả learner_grammar về như trước lần đánh dấu gần nhất.
-- SECURITY DEFINER vì người học không có quyền xóa learner_grammar; mọi câu lệnh lọc theo auth.uid().
create or replace function public.undo_mark_grammar_learned(p_point_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_point  uuid;
  v_hist   public.learner_mark_history;
  v_b      jsonb;
  v_count  integer := 0;
begin
  if v_uid is null then
    raise exception 'undo_mark_grammar_learned: not authenticated' using errcode = '28000';
  end if;
  if cardinality(p_point_ids) > 300 then
    raise exception 'undo_mark_grammar_learned: tối đa 300 mẫu' using errcode = '22023';
  end if;

  foreach v_point in array p_point_ids loop
    select * into v_hist from public.learner_mark_history
     where user_id = v_uid and kind = 'grammar' and item_id = v_point and undone_at is null
     order by marked_at desc limit 1;
    continue when not found;
    v_b := v_hist.before;

    if v_b ? 'new' then
      delete from public.learner_grammar where user_id = v_uid and point_id = v_point;
    else
      update public.learner_grammar
         set phase          = v_b ->> 'phase',
             points         = (v_b ->> 'points')::integer,
             state          = (v_b ->> 'state')::smallint,
             due_at         = (v_b ->> 'due_at')::timestamptz,
             stability      = (v_b ->> 'stability')::double precision,
             difficulty     = (v_b ->> 'difficulty')::double precision,
             scheduled_days = (v_b ->> 'scheduled_days')::integer,
             learning_steps = (v_b ->> 'learning_steps')::integer,
             reps           = (v_b ->> 'reps')::integer,
             lapses         = (v_b ->> 'lapses')::integer,
             last_review_at = (v_b ->> 'last_review_at')::timestamptz,
             completed_at   = (v_b ->> 'completed_at')::timestamptz,
             archived_at    = (v_b ->> 'archived_at')::timestamptz,
             version        = version + 1
       where user_id = v_uid and point_id = v_point;
    end if;

    update public.learner_mark_history set undone_at = now() where id = v_hist.id and user_id = v_uid;
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('status', 'saved', 'undone', v_count);
end;
$$;

comment on function public.undo_mark_grammar_learned is
  'Hoàn tác đánh dấu ngữ pháp: trả learner_grammar về như trước lần đánh dấu gần nhất (mẫu trước đó chưa học thì xóa).';
revoke execute on function public.undo_mark_grammar_learned from public, anon;
grant execute on function public.undo_mark_grammar_learned to authenticated;
