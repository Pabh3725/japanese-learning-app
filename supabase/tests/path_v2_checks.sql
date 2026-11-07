-- =============================================================================
-- Lộ trình v2 · Kiểm tra trên database thật. Mọi dữ liệu thử bị HOÀN TÁC ở cuối.
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

create or replace function pg_temp.path_checks()
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
  s4 uuid;
  res jsonb;
  n bigint;
begin
  begin
    insert into auth.users (id, email) values (ua, 'p2-a@example.invalid'), (ub, 'p2-b@example.invalid');
    insert into public.vocabularies (code, sort_order, expression, reading_kana, meaning_vi, han_viet, is_kana_only, jlpt_level)
    values ('test-p2-1', 999970, '鑿岩', 'さくがんにい', 'từ thử', 'TẠC NHAM', false, 5) returning id into v1;
    insert into public.learner_vocabulary (user_id, vocabulary_id, current_stage) values (ua, v1, 2) returning id into lv;

    perform pg_temp.act_as(ub);
    res := public.open_word_kanji(lv, now());
    execute 'reset role';
    t := t || 'Tài khoản khác không mở được Từ Kanji của A'::text;
    r := r || pg_temp.pass(res->>'status' = 'not_found' and not exists (select 1 from public.learner_stage_schedules where learner_vocabulary_id = lv and stage_number = 4), res::text);

    perform pg_temp.act_as(ua);
    res := public.open_word_kanji(lv, now());
    res := public.open_word_kanji(lv, now());
    execute 'reset role';
    t := t || 'Mở Từ Kanji hai lần vẫn chỉ có 1 lịch Stage 4, thấy Kanji từ lúc đó'::text;
    r := r || pg_temp.pass(
      (select count(*) = 1 from public.learner_stage_schedules where learner_vocabulary_id = lv and stage_number = 4)
      and (select kanji_intro_seen_at is not null from public.learner_vocabulary where id = lv), res::text);

    select id into s4 from public.learner_stage_schedules where learner_vocabulary_id = lv and stage_number = 4;
    perform pg_temp.act_as(ua);
    res := public.submit_stage_exercise(
      p_schedule_id => s4, p_client_event_id => gen_random_uuid(), p_expected_version => 0, p_answered_at => now(),
      p_exercise_type => 'kanji_assembly', p_outcome => 'correct', p_points => 1::smallint, p_counted => true,
      p_study_date => '2026-11-08'::date, p_day_seq => 1, p_response_time_ms => 500,
      p_stage_points => 10, p_stage_points_today => 1::smallint, p_points_date => '2026-11-08'::date,
      p_state => 2::smallint, p_due_at => now(), p_stability => 1, p_difficulty => 5, p_scheduled_days => 2,
      p_learning_steps => 0, p_reps => 1, p_lapses => 0, p_last_review_at => now(),
      p_unlocked_stage => 6::smallint, p_open_schedule => true, p_completed => false, p_required_stages => array[2, 5]::smallint[]);
    execute 'reset role';
    t := t || 'Mở Stage 6: có lịch Stage 6, current_stage không vượt 5'::text;
    r := r || pg_temp.pass(
      res->>'status' = 'saved'
      and exists (select 1 from public.learner_stage_schedules where learner_vocabulary_id = lv and stage_number = 6)
      and (select current_stage <= 5 from public.learner_vocabulary where id = lv), res::text);

    perform pg_temp.act_as(ua);
    insert into public.review_cards (user_id, learner_vocabulary_id, card_type, due_at) values (ua, lv, 'vocab.kana', now()), (ua, lv, 'vocab.kanji', now());
    insert into public.learner_skill_levels (user_id, skill, jlpt_level) values (ua, 'vocabulary', 4);
    execute 'reset role';
    t := t || 'Tạo được Card Kana và Card Kanji cùng một từ'::text;
    r := r || pg_temp.pass((select count(*) = 2 from public.review_cards where learner_vocabulary_id = lv));

    perform pg_temp.act_as(ub);
    select count(*) into n from public.learner_skill_levels;
    t := t || 'Tài khoản khác không đọc được cấp của A'::text; r := r || pg_temp.pass(n = 0, n::text);
    execute 'reset role';

    t := t || 'Mặc định trần Từ Kanji là 100'::text;
    r := r || pg_temp.pass((select word_kanji_cap = 100 from public.learner_settings where user_id = ua));

    raise exception 'p2_rollback';
  exception when raise_exception then
    if sqlerrm <> 'p2_rollback' then raise; end if;
  end;
  execute 'reset role';
  t := t || 'T99 Dữ liệu thử đã được hoàn tác'::text;
  r := r || pg_temp.pass(not exists (select 1 from auth.users where id in (ua, ub)) and not exists (select 1 from public.vocabularies where code = 'test-p2-1'));
  return query select x.a, x.b from unnest(t, r) as x(a, b);
end;
$fn$;

select * from pg_temp.path_checks();
