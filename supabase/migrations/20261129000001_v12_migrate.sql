-- =============================================================================
-- V12 gói 4 (docs/learning-rules-v12.md §7, docs/v12-implementation-plan.md §4): chuyển tiến độ V11 sang V12 và bật V12 cho mọi người.
-- Chủ dự án chốt 2026-11-19: XOÁ tiến độ V12 lúc thử của mọi người rồi chuyển từ V11 (V11 có lịch sử và lịch FSRS thật);
-- bật V12 cho mọi người (kể cả tài khoản mới), bỏ công tắc Beta.
-- Bảng V11 giữ nguyên (chỉ đọc) tới gói 6. Phần chuyển chạy một lần (cờ v12_migrate trong app_migration_flags);
-- hàm v12_migrate_user chạy lại cho một người vẫn an toàn (xoá dữ liệu V12 của người đó rồi chuyển lại).
-- Bảng mapping viết thuần ở lib/v12/migrate.ts (có test); SQL dưới đây làm đúng như vậy.
-- =============================================================================

alter table public.learner_settings add column if not exists v12_migrated_at timestamptz;
alter table public.learner_settings alter column learning_v12 set default true;

create or replace function public.v12_migrate_user(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today    date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  -- Card mới đến hạn lần đầu: 00:00 giờ Việt Nam ngày học kế tiếp
  v_tomorrow timestamptz := ((now() at time zone 'Asia/Ho_Chi_Minh')::date + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh';
  r          record;
  v_item     uuid;
  v_stage    text;
  v_known    timestamptz;
  v_card     record;
  v_items    integer := 0;
  v_cards    integer := 0;
  v_had      boolean;
  v_archived timestamptz;
begin
  -- 0. Xoá tiến độ V12 lúc thử của người này
  delete from public.item_logs where user_id = p_user;
  delete from public.item_cards where user_id = p_user;
  delete from public.learner_item_types where user_id = p_user;
  delete from public.learner_items where user_id = p_user;
  delete from public.daily_decks where user_id = p_user;

  -- 1. Từ vựng: nhánh Kana (Stage 1–3) và nhánh Kanji (Stage 4–6) của learner_vocabulary
  for r in
    select lv.id, lv.vocabulary_id, lv.kanji_intro_seen_at,
           (select excluded_at from public.learner_vocabulary_exclusions e where e.user_id = p_user and e.vocabulary_id = lv.vocabulary_id and e.excluded_at is not null) as known_at,
           exists (select 1 from public.review_cards c where c.learner_vocabulary_id = lv.id and c.card_type = 'vocab.kana' and c.retired_at is null) as kana_card,
           exists (select 1 from public.review_cards c where c.learner_vocabulary_id = lv.id and c.card_type = 'vocab.kanji' and c.retired_at is null) as kanji_card,
           coalesce((select array_agg(s.stage_number) from public.learner_stage_schedules s where s.learner_vocabulary_id = lv.id), '{}') as opened,
           coalesce((select array_agg(s.stage_number) from public.learner_stage_schedules s where s.learner_vocabulary_id = lv.id and s.completed_at is not null), '{}') as done
      from public.learner_vocabulary lv
     where lv.user_id = p_user
  loop
    v_known := r.known_at;

    -- Từ vựng Kana
    v_stage := case
      when r.kana_card or 3 = any (r.done) then 'review'
      when 3 = any (r.opened) then '3'
      when 2 = any (r.opened) then '2'
      else '1' end;
    insert into public.learner_items (user_id, area, vocabulary_id, stage, stage_from, intro_seen_at, known_at)
    values (p_user, 'kana', r.vocabulary_id, v_stage, v_today, case when v_stage <> '1' or 1 = any (r.opened) then now() end, v_known)
    returning id into v_item;
    v_items := v_items + 1;
    -- Mục đang học Stage: thêm loại thẻ của Stage đó (mục đã sang Card thì không có)
    if v_stage <> 'review' then
      insert into public.learner_item_types (learner_item_id, user_id, stage, card_type)
      select v_item, p_user, v_stage::smallint, t
        from unnest(case v_stage
          when '1' then array['kana_meaning', 'meaning_kana']
          when '2' then array['kana_meaning', 'meaning_kana', 'listen_kana', 'kana_assembly']
          else array['meaning_type_kana', 'listen_type_kana', 'kana_meaning'] end) as t;
    end if;
    if v_stage = 'review' then
      -- Card ① giữ lịch của Card Kana cũ (nếu có); Card ② là Card mới
      select * into v_card from public.review_cards c where c.learner_vocabulary_id = r.id and c.card_type = 'vocab.kana' and c.retired_at is null order by c.due_at limit 1;
      v_had := found;
      v_archived := case when v_had then v_card.archived_at end;
      if v_had then
        insert into public.item_cards (user_id, learner_item_id, card_type, state, due_at, stability, difficulty, scheduled_days, learning_steps, reps, lapses, last_review_at, archived_at)
        values (p_user, v_item, 'kana_type', v_card.state, v_card.due_at, v_card.stability, v_card.difficulty, least(v_card.scheduled_days, 90), v_card.learning_steps, v_card.reps, v_card.lapses, v_card.last_review_at, v_card.archived_at);
      else
        insert into public.item_cards (user_id, learner_item_id, card_type, due_at) values (p_user, v_item, 'kana_type', v_tomorrow);
      end if;
      -- Card ② theo Card ①: Card cũ đã lưu trữ thì Card mới cũng lưu trữ
      insert into public.item_cards (user_id, learner_item_id, card_type, due_at, archived_at)
      values (p_user, v_item, 'kana_choose', v_tomorrow, v_archived);
      v_cards := v_cards + 2;
    end if;

    -- Từ vựng Kanji (chỉ khi đã đụng tới nhánh Kanji)
    v_stage := case
      when r.kanji_card or 6 = any (r.done) then 'review'
      when 6 = any (r.opened) then '3'
      when 5 = any (r.opened) then '2'
      when r.kanji_intro_seen_at is not null or 4 = any (r.opened) then '1'
      else null end;
    if v_stage is not null then
      insert into public.learner_items (user_id, area, vocabulary_id, stage, stage_from, intro_seen_at, known_at)
      values (p_user, 'word_kanji', r.vocabulary_id, v_stage, v_today, now(), v_known)
      returning id into v_item;
      v_items := v_items + 1;
      if v_stage <> 'review' then
        insert into public.learner_item_types (learner_item_id, user_id, stage, card_type)
        select v_item, p_user, v_stage::smallint, t
          from unnest(case v_stage
            when '3' then array['word_type_hanviet', 'word_meaning']
            else array['word_hanviet', 'word_meaning', 'hanviet_word', 'meaning_word'] end) as t;
      end if;
      if v_stage = 'review' then
        select * into v_card from public.review_cards c where c.learner_vocabulary_id = r.id and c.card_type = 'vocab.kanji' and c.retired_at is null order by c.due_at limit 1;
        if found then
          insert into public.item_cards (user_id, learner_item_id, card_type, state, due_at, stability, difficulty, scheduled_days, learning_steps, reps, lapses, last_review_at, archived_at)
          values (p_user, v_item, 'word_kanji', v_card.state, v_card.due_at, v_card.stability, v_card.difficulty, least(v_card.scheduled_days, 90), v_card.learning_steps, v_card.reps, v_card.lapses, v_card.last_review_at, v_card.archived_at);
        else
          insert into public.item_cards (user_id, learner_item_id, card_type, due_at) values (p_user, v_item, 'word_kanji', v_tomorrow);
        end if;
        v_cards := v_cards + 1;
      end if;
    end if;
  end loop;

  -- 2. Chữ Kanji: đang Học → Stage 2 (0 điểm); đã có Card → gộp 2 Card thành 1, lấy Card đến hạn sớm hơn
  for r in
    select lk.id, lk.kanji_id, lk.phase,
           (select created_at from public.learner_kanji_exclusions e where e.user_id = p_user and e.kanji_id = lk.kanji_id) as known_at,
           exists (select 1 from public.kanji_similar_pairs p where p.approved and (p.kanji_a = lk.kanji_id or p.kanji_b = lk.kanji_id)) as has_similar
      from public.learner_kanji lk
     where lk.user_id = p_user
  loop
    v_stage := case when r.phase = 'review' then 'review' else '2' end;
    insert into public.learner_items (user_id, area, kanji_id, stage, stage_from, intro_seen_at, has_similar, known_at)
    values (p_user, 'kanji', r.kanji_id, v_stage, v_today, now(), r.has_similar, r.known_at)
    returning id into v_item;
    v_items := v_items + 1;
    if v_stage = '2' then
      insert into public.learner_item_types (learner_item_id, user_id, stage, card_type)
      select v_item, p_user, 2, t from unnest(array['kanji_hanviet', 'kanji_meaning', 'hanviet_kanji', 'meaning_kanji']) as t;
    else
      select * into v_card from public.learner_kanji_cards c
       where c.learner_kanji_id = r.id and c.card_type in ('kanji.meaning', 'kanji.hanviet')
       order by (c.archived_at is not null), c.due_at limit 1;
      if found then
        insert into public.item_cards (user_id, learner_item_id, card_type, state, due_at, stability, difficulty, scheduled_days, learning_steps, reps, lapses, last_review_at, archived_at)
        values (p_user, v_item, 'kanji', v_card.state, v_card.due_at, v_card.stability, v_card.difficulty, least(v_card.scheduled_days, 90), v_card.learning_steps, v_card.reps, v_card.lapses, v_card.last_review_at, v_card.archived_at);
      else
        insert into public.item_cards (user_id, learner_item_id, card_type, due_at) values (p_user, v_item, 'kanji', v_tomorrow);
      end if;
      v_cards := v_cards + 1;
    end if;
  end loop;

  -- 3. Bật V12, đánh dấu đã chuyển
  insert into public.learner_settings (user_id, learning_v12, v12_migrated_at) values (p_user, true, now())
  on conflict (user_id) do update set learning_v12 = true, v12_migrated_at = now();

  return jsonb_build_object('items', v_items, 'cards', v_cards);
end;
$$;
comment on function public.v12_migrate_user is 'V12 gói 4: chuyển tiến độ V11 của một người sang V12 (xoá dữ liệu V12 của người đó trước). Chỉ người quản trị chạy.';
revoke execute on function public.v12_migrate_user from public, anon, authenticated;

-- =============================================================================
-- Library "Mark as learned" của V12: đưa từ (Kana, và Từ vựng Kanji nếu có) thẳng sang Card; lưu trạng thái trước vào
-- learner_mark_history (before.v = 12) để hoàn tác. Lịch sử đánh dấu V11 (không có before.v) không hoàn tác bằng hàm này.
-- =============================================================================
create or replace function public.v12_mark_words_learned(p_items jsonb, p_at timestamptz)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_today  date := (p_at at time zone 'Asia/Ho_Chi_Minh')::date;
  v_item   jsonb;
  v_vocab  uuid;
  v_area   text;
  v_row    public.learner_items;
  v_id     uuid;
  v_snap   jsonb;
  v_cards  uuid[];
  v_card   uuid;
  v_type   text;
  v_count  integer := 0;
begin
  if v_uid is null then
    raise exception 'v12_mark_words_learned: not authenticated' using errcode = '28000';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 1000 then
    raise exception 'v12_mark_words_learned: p_items phải là mảng tối đa 1000 phần tử' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_vocab := (v_item ->> 'vocabulary_id')::uuid;
    continue when not exists (select 1 from public.vocabularies where id = v_vocab);
    v_snap := '[]'::jsonb;
    v_cards := '{}';
    foreach v_area in array case when coalesce((v_item ->> 'word_kanji')::boolean, false) then array['kana', 'word_kanji'] else array['kana'] end loop
      select * into v_row from public.learner_items where user_id = v_uid and area = v_area and vocabulary_id = v_vocab;
      if found then
        v_snap := v_snap || jsonb_build_object('area', v_area, 'id', v_row.id, 'stage', v_row.stage, 'stage_from', v_row.stage_from, 'intro_seen_at', v_row.intro_seen_at, 'known_at', v_row.known_at);
        update public.learner_items set stage = 'review', intro_seen_at = coalesce(intro_seen_at, p_at), known_at = null, version = version + 1, updated_at = p_at
         where id = v_row.id
        returning id into v_id;
      else
        insert into public.learner_items (user_id, area, vocabulary_id, stage, stage_from, intro_seen_at)
        values (v_uid, v_area, v_vocab, 'review', v_today, p_at)
        returning id into v_id;
        v_snap := v_snap || jsonb_build_object('area', v_area, 'id', v_id, 'new', true);
      end if;
      -- Card: chỉ tạo khi chưa có (Card đã có giữ nguyên lịch); ghi lại Card vừa tạo để hoàn tác
      foreach v_type in array case v_area when 'kana' then array['kana_type', 'kana_choose'] else array['word_kanji'] end loop
        if not exists (select 1 from public.item_cards where learner_item_id = v_id and card_type = v_type) then
          insert into public.item_cards (user_id, learner_item_id, card_type, due_at)
          values (v_uid, v_id, v_type, (v_item ->> case when v_area = 'kana' then 'kana_due' else 'kanji_due' end)::timestamptz)
          returning id into v_card;
          v_cards := v_cards || v_card;
        end if;
      end loop;
    end loop;

    insert into public.learner_mark_history (user_id, kind, item_id, before, created_cards, marked_at)
    values (v_uid, 'vocab', v_vocab,
            jsonb_build_object('v', 12, 'items', v_snap,
                               'excluded_at', (select e.excluded_at from public.learner_vocabulary_exclusions e where e.user_id = v_uid and e.vocabulary_id = v_vocab)),
            v_cards, p_at);
    update public.learner_vocabulary_exclusions set excluded_at = null where user_id = v_uid and vocabulary_id = v_vocab and excluded_at is not null;
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('status', 'saved', 'marked', v_count);
end;
$$;
comment on function public.v12_mark_words_learned is 'V12: đánh dấu đã học — mục Kana (và Từ vựng Kanji) sang Card, tạo Card còn thiếu; lưu trạng thái trước để hoàn tác.';
revoke execute on function public.v12_mark_words_learned from public, anon;
grant execute on function public.v12_mark_words_learned to authenticated;

-- Hoàn tác lần đánh dấu V12 gần nhất (chưa hoàn tác) của từng từ. SECURITY DEFINER vì người học không có quyền xóa
-- mục / Card V12; mọi câu lệnh lọc theo auth.uid().
create or replace function public.v12_undo_mark_words_learned(p_vocabulary_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_vocab  uuid;
  v_hist   public.learner_mark_history;
  v_s      jsonb;
  v_count  integer := 0;
begin
  if v_uid is null then
    raise exception 'v12_undo_mark_words_learned: not authenticated' using errcode = '28000';
  end if;
  if cardinality(p_vocabulary_ids) > 1000 then
    raise exception 'v12_undo_mark_words_learned: tối đa 1000 từ' using errcode = '22023';
  end if;

  foreach v_vocab in array p_vocabulary_ids loop
    select * into v_hist from public.learner_mark_history
     where user_id = v_uid and kind = 'vocab' and item_id = v_vocab and undone_at is null and before ->> 'v' = '12'
     order by marked_at desc limit 1;
    continue when not found;

    delete from public.item_cards where id = any (v_hist.created_cards) and user_id = v_uid;
    for v_s in select * from jsonb_array_elements(v_hist.before -> 'items') loop
      if v_s ? 'new' then
        -- Trước đó chưa có mục này: bỏ cả mục (điểm, Card, nhật ký đi theo)
        delete from public.learner_items where id = (v_s ->> 'id')::uuid and user_id = v_uid;
      else
        update public.learner_items
           set stage = v_s ->> 'stage', stage_from = (v_s ->> 'stage_from')::date,
               intro_seen_at = (v_s ->> 'intro_seen_at')::timestamptz, known_at = (v_s ->> 'known_at')::timestamptz,
               version = version + 1, updated_at = now()
         where id = (v_s ->> 'id')::uuid and user_id = v_uid;
      end if;
    end loop;
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
comment on function public.v12_undo_mark_words_learned is 'V12: hoàn tác "Mark as learned" — trả mục về như trước lần đánh dấu gần nhất, xóa Card do lần đó tạo ra.';
revoke execute on function public.v12_undo_mark_words_learned from public, anon;
grant execute on function public.v12_undo_mark_words_learned to authenticated;

-- Chạy một lần cho mọi người đã có tiến độ hoặc cài đặt
do $$
declare
  u record;
begin
  if exists (select 1 from public.app_migration_flags where key = 'v12_migrate') then
    return;
  end if;
  for u in
    select user_id from public.learner_settings
    union select user_id from public.learner_vocabulary
    union select user_id from public.learner_kanji
  loop
    perform public.v12_migrate_user(u.user_id);
  end loop;
  insert into public.app_migration_flags (key) values ('v12_migrate');
end $$;
