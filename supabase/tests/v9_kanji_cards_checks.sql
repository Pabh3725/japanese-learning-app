-- =============================================================================
-- Design V9 gói 4a · 2 Card Kanji riêng lẻ, trần ôn riêng. Kiểm tra trên database thật. Mọi dữ liệu thử bị HOÀN TÁC ở cuối.
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

create or replace function pg_temp.card_answer(p_user uuid, p_card uuid, p_event uuid, p_version integer)
returns text language plpgsql as $$
declare
  v_res jsonb;
begin
  perform pg_temp.act_as(p_user);
  v_res := public.submit_kanji_card_answer(
    p_card_id => p_card, p_client_event_id => p_event, p_expected_version => p_version, p_answered_at => now(),
    p_exercise_type => 'hanviet_typing', p_outcome => 'correct', p_study_date => '2026-11-12'::date, p_response_time_ms => 900,
    p_state => 2::smallint, p_due_at => now() + interval '11 days', p_stability => 11, p_difficulty => 5, p_scheduled_days => 11,
    p_learning_steps => 0, p_reps => 3, p_lapses => 0, p_last_review_at => now());
  execute 'reset role';
  return v_res->>'status';
end;
$$;

create or replace function pg_temp.cards_checks()
returns table (kiem_tra text, ket_qua text)
language plpgsql
as $fn$
declare
  t text[] := '{}';
  r text[] := '{}';
  ua uuid := gen_random_uuid();
  ub uuid := gen_random_uuid();
  k1 uuid;
  k2 uuid;
  lk_done uuid;
  lk_learning uuid;
  c_meaning uuid;
  c_hanviet uuid;
  ev uuid := gen_random_uuid();
  res jsonb;
  st text;
  n bigint;
begin
  begin
    insert into auth.users (id, email) values (ua, 'v9k-a@example.invalid'), (ub, 'v9k-b@example.invalid');
    select id into k1 from public.kanji where character = '学';
    select id into k2 from public.kanji where character = '校';

    -- Chữ đã xong giai đoạn Học từ trước (v2): một lịch ôn dài hạn
    insert into public.learner_kanji (user_id, kanji_id, phase, points, state, due_at, stability, difficulty, scheduled_days, reps, lapses, completed_at)
    values (ua, k1, 'review', 12, 2, now() + interval '3 days', 7.5, 4.2, 11, 6, 1, now() - interval '20 days')
    returning id into lk_done;

    n := public.v9_copy_kanji_cards(ua);
    t := t || 'Chuyển dữ liệu: chữ đã xong Học có đúng 2 Card, chép nguyên lịch'::text;
    r := r || pg_temp.pass(n = 2
      and (select count(*) = 2 from public.learner_kanji_cards c
            where c.learner_kanji_id = lk_done and c.stability = 7.5 and c.difficulty = 4.2 and c.reps = 6 and c.lapses = 1
              and c.due_at = (select due_at from public.learner_kanji where id = lk_done)), n::text);

    n := public.v9_copy_kanji_cards(ua);
    t := t || 'Chạy lại bước chuyển: không tạo Card trùng'::text;
    r := r || pg_temp.pass(n = 0 and (select count(*) = 2 from public.learner_kanji_cards where learner_kanji_id = lk_done), n::text);

    select id into c_meaning from public.learner_kanji_cards where learner_kanji_id = lk_done and card_type = 'kanji.meaning';
    select id into c_hanviet from public.learner_kanji_cards where learner_kanji_id = lk_done and card_type = 'kanji.hanviet';

    -- Hoàn tất giai đoạn Học qua hàm thật: tạo 2 Card
    insert into public.learner_kanji (user_id, kanji_id, points) values (ua, k2, 11) returning id into lk_learning;
    perform pg_temp.act_as(ua);
    res := public.submit_kanji_answer(
      p_learner_kanji_id => lk_learning, p_client_event_id => gen_random_uuid(), p_expected_version => 0, p_answered_at => now(),
      p_exercise_type => 'pick_kanji', p_outcome => 'correct', p_points => 1::smallint, p_study_date => '2026-11-12'::date, p_response_time_ms => 800,
      p_phase => 'review', p_total_points => 12, p_points_today => 1::smallint, p_points_date => '2026-11-12'::date,
      p_state => 0::smallint, p_due_at => '2026-11-13 00:00+07'::timestamptz, p_stability => 0, p_difficulty => 0, p_scheduled_days => 0,
      p_learning_steps => 0, p_reps => 0, p_lapses => 0, p_last_review_at => null, p_completed => true);
    execute 'reset role';
    t := t || 'Hoàn tất Học: tạo Card mặt chữ–nghĩa và Card Hán Việt, đến hạn 00:00 hôm sau'::text;
    r := r || pg_temp.pass(res->>'status' = 'saved'
      and (select count(*) = 2 from public.learner_kanji_cards where learner_kanji_id = lk_learning and due_at = '2026-11-13 00:00+07'::timestamptz), res::text);

    -- Ôn một Card: chỉ Card đó đổi lịch, Card kia giữ nguyên
    st := pg_temp.card_answer(ua, c_hanviet, ev, 0);
    t := t || 'Ôn Card Hán Việt: lịch Card đó đổi, có log gắn Card, Card nghĩa không đổi'::text;
    r := r || pg_temp.pass(st = 'saved'
      and (select stability = 11 and version = 1 from public.learner_kanji_cards where id = c_hanviet)
      and (select stability = 7.5 and version = 0 from public.learner_kanji_cards where id = c_meaning)
      and exists (select 1 from public.kanji_logs where learner_kanji_card_id = c_hanviet and phase = 'review'), st);

    st := pg_temp.card_answer(ua, c_hanviet, ev, 1);
    t := t || 'Gửi trùng cùng mã: không ghi lần hai'::text;
    r := r || pg_temp.pass(st = 'duplicate' and (select count(*) = 1 from public.kanji_logs where client_event_id = ev), st);

    st := pg_temp.card_answer(ua, c_hanviet, gen_random_uuid(), 0);
    t := t || 'Sai version: báo conflict, không ghi'::text;
    r := r || pg_temp.pass(st = 'conflict' and (select version = 1 from public.learner_kanji_cards where id = c_hanviet), st);

    st := pg_temp.card_answer(ub, c_meaning, gen_random_uuid(), 0);
    t := t || 'Tài khoản khác không ôn được Card của A'::text;
    r := r || pg_temp.pass(st = 'not_found' and (select version = 0 from public.learner_kanji_cards where id = c_meaning), st);

    perform pg_temp.act_as(ub);
    select count(*) into n from public.learner_kanji_cards;
    execute 'reset role';
    t := t || 'Tài khoản khác không đọc được Card của A'::text;
    r := r || pg_temp.pass(n = 0, n::text);

    update public.learner_kanji_cards set archived_at = now() where id = c_meaning;
    st := pg_temp.card_answer(ua, c_meaning, gen_random_uuid(), 0);
    t := t || 'Card đã lưu trữ không nhận câu ôn'::text;
    r := r || pg_temp.pass(st = 'not_active', st);

    t := t || 'Trần ôn mặc định: Card Từ vựng Kanji 60, Card Kanji 60'::text;
    r := r || pg_temp.pass((select word_kanji_review_cap = 60 and kanji_review_cap = 60 from public.learner_settings where user_id = ua));

    t := t || 'Học Kanji không đụng tiến độ từ vựng của A'::text;
    r := r || pg_temp.pass(not exists (select 1 from public.learner_vocabulary where user_id = ua) and not exists (select 1 from public.review_cards where user_id = ua));

    raise exception 'v9k_rollback';
  exception when raise_exception then
    if sqlerrm <> 'v9k_rollback' then raise; end if;
  end;
  execute 'reset role';
  t := t || 'T99 Dữ liệu thử đã được hoàn tác'::text;
  r := r || pg_temp.pass(not exists (select 1 from auth.users where id in (ua, ub)));
  return query select x.a, x.b from unnest(t, r) as x(a, b);
end;
$fn$;

select * from pg_temp.cards_checks();
