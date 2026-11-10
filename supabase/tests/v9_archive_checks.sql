-- =============================================================================
-- Design V9 gói 4b · Lưu trữ Card ("Đã học xong") và khôi phục. Kiểm tra trên database thật. Mọi dữ liệu thử bị HOÀN TÁC ở cuối.
-- =============================================================================
create or replace function pg_temp.act_as(p_user uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

create or replace function pg_temp.pass(p_ok boolean, p_detail text default '')
returns text language sql as $$ select case when p_ok then 'PASS' else 'FAIL ' || coalesce(p_detail, '') end $$;

create or replace function pg_temp.call(p_user uuid, p_sql text)
returns text language plpgsql as $$
declare
  v_res jsonb;
begin
  perform pg_temp.act_as(p_user);
  execute p_sql into v_res;
  execute 'reset role';
  return v_res->>'status';
end;
$$;

create or replace function pg_temp.archive_checks()
returns table (kiem_tra text, ket_qua text)
language plpgsql
as $fn$
declare
  t text[] := '{}';
  r text[] := '{}';
  ua uuid := gen_random_uuid();
  ub uuid := gen_random_uuid();
  v1 uuid;
  lv uuid;
  c_kana uuid;
  c_kanji uuid;
  lk uuid;
  kc uuid;
  ev uuid := gen_random_uuid();
  st text;
  n_logs bigint;
begin
  begin
    insert into auth.users (id, email) values (ua, 'v9a-a@example.invalid'), (ub, 'v9a-b@example.invalid');
    insert into public.vocabularies (code, sort_order, expression, reading_kana, meaning_vi, han_viet, is_kana_only, jlpt_level)
    values ('test-v9a-1', 999950, '鑿岩', 'さくがんあ', 'từ thử', 'TẠC NHAM', false, 5) returning id into v1;
    insert into public.learner_vocabulary (user_id, vocabulary_id, current_stage) values (ua, v1, 3) returning id into lv;
    insert into public.review_cards (user_id, learner_vocabulary_id, card_type, state, due_at, stability, difficulty, scheduled_days, reps, lapses, last_review_at)
    values (ua, lv, 'vocab.kana', 2, now() + interval '20 days', 46, 4.5, 46, 5, 1, now() - interval '26 days') returning id into c_kana;
    insert into public.review_cards (user_id, learner_vocabulary_id, card_type, state, due_at, stability, difficulty, reps)
    values (ua, lv, 'vocab.kanji', 2, now() - interval '1 day', 11, 5, 3) returning id into c_kanji;
    insert into public.review_logs (user_id, review_card_id, client_event_id, rating, state_before, due_after, stability_after, difficulty_after)
    values (ua, c_kana, gen_random_uuid(), 3, 2, now(), 46, 4.5);

    -- Lưu trữ một Card
    st := pg_temp.call(ua, format('select public.archive_card(%L, %L, %L)', 'vocab', c_kana, ev));
    t := t || 'Lưu trữ Card Kana: có archived_at, giữ nguyên lịch, ghi sự kiện kèm lịch cũ'::text;
    r := r || pg_temp.pass(st = 'saved'
      and (select archived_at is not null and stability = 46 and reps = 5 from public.review_cards where id = c_kana)
      and exists (select 1 from public.card_events where card_id = c_kana and event = 'archive' and (schedule_before->>'stability')::float = 46), st);

    t := t || 'Card khác của cùng từ vẫn hoạt động'::text;
    r := r || pg_temp.pass((select archived_at is null from public.review_cards where id = c_kanji));

    st := pg_temp.call(ua, format('select public.archive_card(%L, %L, %L)', 'vocab', c_kana, ev));
    t := t || 'Gửi trùng cùng mã: không ghi lần hai'::text;
    r := r || pg_temp.pass(st = 'duplicate' and (select count(*) = 1 from public.card_events where card_id = c_kana), st);

    st := pg_temp.call(ua, format('select public.archive_card(%L, %L, %L)', 'vocab', c_kana, gen_random_uuid()));
    t := t || 'Lưu trữ lại Card đã lưu trữ: báo already, không thêm sự kiện'::text;
    r := r || pg_temp.pass(st = 'already' and (select count(*) = 1 from public.card_events where card_id = c_kana), st);

    st := pg_temp.call(ua, format($q$select public.submit_review(%L, %L, 1, now(), 2::smallint, now() + interval '1 day', 50, 4, 1, 0, 6, 1, 0, false, 3::smallint, 0::smallint, 2::smallint, now())$q$, c_kana, gen_random_uuid()));
    t := t || 'Card đã lưu trữ không nhận câu ôn'::text;
    r := r || pg_temp.pass(st = 'not_active' and (select stability = 46 from public.review_cards where id = c_kana), st);

    st := pg_temp.call(ub, format('select public.archive_card(%L, %L, %L)', 'vocab', c_kanji, gen_random_uuid()));
    t := t || 'Tài khoản khác không lưu trữ được Card của A'::text;
    r := r || pg_temp.pass(st = 'not_found' and (select archived_at is null from public.review_cards where id = c_kanji), st);

    perform pg_temp.act_as(ub);
    select count(*) into n_logs from public.card_events;
    execute 'reset role';
    t := t || 'Tài khoản khác không đọc được sự kiện của A'::text;
    r := r || pg_temp.pass(n_logs = 0, n_logs::text);

    -- Khôi phục giữ tiến độ
    st := pg_temp.call(ua, format('select public.restore_card(%L, %L, %L, %L)', 'vocab', c_kana, 'keep', gen_random_uuid()));
    t := t || 'Khôi phục giữ tiến độ: hết archived, lịch giữ nguyên, có sự kiện restore_keep'::text;
    r := r || pg_temp.pass(st = 'saved'
      and (select archived_at is null and stability = 46 and reps = 5 and lapses = 1 and due_at > now() + interval '19 days' from public.review_cards where id = c_kana)
      and exists (select 1 from public.card_events where card_id = c_kana and event = 'restore_keep'), st);

    st := pg_temp.call(ua, format('select public.restore_card(%L, %L, %L, %L)', 'vocab', c_kana, 'keep', gen_random_uuid()));
    t := t || 'Khôi phục Card không lưu trữ: báo not_archived'::text;
    r := r || pg_temp.pass(st = 'not_archived', st);

    -- Học lại từ đầu
    select count(*) into n_logs from public.review_logs where review_card_id = c_kana;
    st := pg_temp.call(ua, format('select public.archive_card(%L, %L, %L)', 'vocab', c_kana, gen_random_uuid()));
    st := pg_temp.call(ua, format('select public.restore_card(%L, %L, %L, %L)', 'vocab', c_kana, 'reset', gen_random_uuid()));
    t := t || 'Học lại từ đầu: riêng Card đó về New, đến hạn ngay; log cũ giữ nguyên; sự kiện có lịch cũ'::text;
    r := r || pg_temp.pass(st = 'saved'
      and (select archived_at is null and state = 0 and stability = 0 and reps = 0 and lapses = 0 and last_review_at is null and due_at <= now() from public.review_cards where id = c_kana)
      and (select count(*) from public.review_logs where review_card_id = c_kana) = n_logs
      and exists (select 1 from public.card_events where card_id = c_kana and event = 'restore_reset' and (schedule_before->>'reps')::int = 5)
      and (select stability = 11 and reps = 3 from public.review_cards where id = c_kanji), st);

    -- Card Kanji riêng lẻ
    insert into public.learner_kanji (user_id, kanji_id, phase, points, completed_at)
    values (ua, (select id from public.kanji where character = '学'), 'review', 12, now()) returning id into lk;
    insert into public.learner_kanji_cards (user_id, learner_kanji_id, card_type, stability, reps) values (ua, lk, 'kanji.meaning', 9, 4) returning id into kc;
    st := pg_temp.call(ua, format('select public.archive_card(%L, %L, %L)', 'kanji', kc, gen_random_uuid()));
    t := t || 'Lưu trữ Card Kanji: chỉ Card đó, chữ vẫn ở khu Kanji'::text;
    r := r || pg_temp.pass(st = 'saved' and (select archived_at is not null from public.learner_kanji_cards where id = kc)
      and not exists (select 1 from public.learner_kanji_exclusions where user_id = ua), st);
    st := pg_temp.call(ua, format('select public.restore_card(%L, %L, %L, %L)', 'kanji', kc, 'keep', gen_random_uuid()));
    t := t || 'Khôi phục Card Kanji giữ tiến độ'::text;
    r := r || pg_temp.pass(st = 'saved' and (select archived_at is null and stability = 9 and reps = 4 from public.learner_kanji_cards where id = kc), st);

    -- "Review now" ở trang chi tiết từ khôi phục Card đang lưu trữ
    st := pg_temp.call(ua, format('select public.archive_card(%L, %L, %L)', 'vocab', c_kanji, gen_random_uuid()));
    st := pg_temp.call(ua, format('select public.relearn_card(%L)', c_kanji));
    t := t || '"Review now" với Card đang lưu trữ: khôi phục và đến hạn ngay'::text;
    r := r || pg_temp.pass(st = 'saved' and (select archived_at is null and due_at <= now() and stability = 11 from public.review_cards where id = c_kanji), st);

    t := t || 'anon không đọc được sự kiện và không gọi được hàm lưu trữ'::text;
    r := r || pg_temp.pass(not has_table_privilege('anon', 'public.card_events', 'select')
      and not exists (select 1 from pg_proc where proname in ('archive_card', 'restore_card') and pronamespace = 'public'::regnamespace and has_function_privilege('anon', oid, 'execute')));

    raise exception 'v9a_rollback';
  exception when raise_exception then
    if sqlerrm <> 'v9a_rollback' then raise; end if;
  end;
  execute 'reset role';
  t := t || 'T99 Dữ liệu thử đã được hoàn tác'::text;
  r := r || pg_temp.pass(not exists (select 1 from auth.users where id in (ua, ub)) and not exists (select 1 from public.vocabularies where code = 'test-v9a-1'));
  return query select x.a, x.b from unnest(t, r) as x(a, b);
end;
$fn$;

select * from pg_temp.archive_checks();
