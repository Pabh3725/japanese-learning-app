-- =============================================================================
-- Design V9 gói 5b · Bài Learn (learn_lessons), câu kiểm tra nhanh (learn_micro_logs), thứ tự câu Kanji.
-- Kiểm tra trên database thật. Mọi dữ liệu thử bị HOÀN TÁC ở cuối.
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

create or replace function pg_temp.lesson_checks()
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
  lk uuid;
  lesson uuid;
  res jsonb;
  n bigint;
begin
  begin
    insert into auth.users (id, email) values (ua, 'v9l-a@example.invalid'), (ub, 'v9l-b@example.invalid');
    insert into public.vocabularies (code, sort_order, expression, reading_kana, meaning_vi, han_viet, is_kana_only, jlpt_level)
    values ('test-v9l-1', 999940, '鑿岩', 'さくがんれ', 'từ thử', 'TẠC NHAM', false, 5) returning id into v1;
    insert into public.learner_vocabulary (user_id, vocabulary_id, current_stage) values (ua, v1, 2) returning id into lv;

    t := t || 'Settings mặc định: ngân sách Learn 200, bài 50 câu'::text;
    r := r || pg_temp.pass((select learn_cap = 200 and lesson_size = 50 from public.learner_settings where user_id = ua));

    perform pg_temp.act_as(ua);
    insert into public.learn_lessons (study_date, groups, state) values (current_date, array['vocabulary', 'kanji'], '{}'::jsonb) returning id into lesson;
    execute 'reset role';
    t := t || 'Người học tạo được bài của mình'::text;
    r := r || pg_temp.pass(lesson is not null);

    t := t || 'Mỗi người chỉ có một bài đang làm'::text;
    begin
      insert into public.learn_lessons (user_id, study_date, groups, state) values (ua, current_date, array['kanji'], '{}'::jsonb);
      r := r || pg_temp.pass(false, 'tạo được bài active thứ hai');
    exception when unique_violation then
      r := r || pg_temp.pass(true);
    end;

    t := t || 'Nhóm lạ bị từ chối'::text;
    begin
      insert into public.learn_lessons (user_id, study_date, groups, state, status) values (ua, current_date, array['grammar'], '{}'::jsonb, 'finished');
      r := r || pg_temp.pass(false, 'nhận nhóm grammar');
    exception when check_violation then
      r := r || pg_temp.pass(true);
    end;

    perform pg_temp.act_as(ub);
    select count(*) into n from public.learn_lessons;
    update public.learn_lessons set status = 'abandoned' where id = lesson;
    execute 'reset role';
    t := t || 'Tài khoản khác không đọc, không sửa được bài của A'::text;
    r := r || pg_temp.pass(n = 0 and (select status = 'active' from public.learn_lessons where id = lesson), n::text);

    -- Câu kiểm tra nhanh
    perform pg_temp.act_as(ua);
    insert into public.learn_micro_logs (lesson_id, learner_vocabulary_id, item_key, exercise_type, outcome, study_date, day_seq, client_event_id)
    values (lesson, lv, 'nw:x', 'kana_to_meaning', 'correct', current_date, 7, gen_random_uuid());
    execute 'reset role';
    t := t || 'Ghi được câu kiểm tra nhanh của mình; không có điểm, không đổi lịch Stage'::text;
    r := r || pg_temp.pass((select count(*) = 1 from public.learn_micro_logs where learner_vocabulary_id = lv)
      and (select stage_points = 0 and reps = 0 from public.learner_stage_schedules where learner_vocabulary_id = lv and stage_number = 2)
      and not exists (select 1 from public.exercise_logs where learner_vocabulary_id = lv));

    t := t || 'Câu kiểm tra nhanh phải gắn đúng một mốc (từ hoặc chữ)'::text;
    begin
      insert into public.learn_micro_logs (user_id, item_key, exercise_type, outcome, study_date, day_seq, client_event_id)
      values (ua, 'x', 'x', 'correct', current_date, 1, gen_random_uuid());
      r := r || pg_temp.pass(false, 'nhận dòng không có mốc');
    exception when check_violation then
      r := r || pg_temp.pass(true);
    end;

    perform pg_temp.act_as(ub);
    select count(*) into n from public.learn_micro_logs;
    execute 'reset role';
    t := t || 'Tài khoản khác không đọc được câu kiểm tra nhanh của A'::text;
    r := r || pg_temp.pass(n = 0, n::text);

    -- Câu Học Kanji ghi thứ tự trong ngày
    insert into public.learner_kanji (user_id, kanji_id) values (ua, (select id from public.kanji where character = '学')) returning id into lk;
    perform pg_temp.act_as(ua);
    res := public.submit_kanji_answer(
      p_learner_kanji_id => lk, p_client_event_id => gen_random_uuid(), p_expected_version => 0, p_answered_at => now(),
      p_exercise_type => 'kanji_to_meaning', p_outcome => 'correct', p_points => 1::smallint, p_study_date => current_date, p_response_time_ms => 500,
      p_phase => 'learning', p_total_points => 1, p_points_today => 1::smallint, p_points_date => current_date,
      p_state => 0::smallint, p_due_at => now(), p_stability => 0, p_difficulty => 0, p_scheduled_days => 0,
      p_learning_steps => 0, p_reps => 1, p_lapses => 0, p_last_review_at => now(), p_completed => false, p_day_seq => 8);
    execute 'reset role';
    t := t || 'Câu Học Kanji ghi day_seq để tính giãn cách chung với câu Stage'::text;
    r := r || pg_temp.pass(res->>'status' = 'saved' and exists (select 1 from public.kanji_logs where learner_kanji_id = lk and day_seq = 8), res::text);

    t := t || 'anon không có quyền trên bài và câu kiểm tra nhanh'::text;
    r := r || pg_temp.pass(not has_table_privilege('anon', 'public.learn_lessons', 'select') and not has_table_privilege('anon', 'public.learn_micro_logs', 'select'));

    raise exception 'v9l_rollback';
  exception when raise_exception then
    if sqlerrm <> 'v9l_rollback' then raise; end if;
  end;
  execute 'reset role';
  t := t || 'T99 Dữ liệu thử đã được hoàn tác'::text;
  r := r || pg_temp.pass(not exists (select 1 from auth.users where id in (ua, ub)) and not exists (select 1 from public.vocabularies where code = 'test-v9l-1'));
  return query select x.a, x.b from unnest(t, r) as x(a, b);
end;
$fn$;

select * from pg_temp.lesson_checks();
