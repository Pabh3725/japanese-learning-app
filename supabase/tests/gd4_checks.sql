-- =============================================================================
-- SYNC-01, SMART-03, INT-01 · Kiểm tra đường đi của dữ liệu trên database thật:
-- practice chỉ đổi điểm Card, dấu sao và học lại, tách biệt hai tài khoản.
-- An toàn: mọi dữ liệu thử bị HOÀN TÁC ở cuối (T99 kiểm tra lại).
-- =============================================================================
create or replace function pg_temp.act_as(p_user uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

create or replace function pg_temp.pass(p_ok boolean, p_detail text default '')
returns text
language sql
as $$ select case when p_ok then 'PASS' else 'FAIL ' || coalesce(p_detail, '') end $$;

create or replace function pg_temp.gd4_checks()
returns table (kiem_tra text, ket_qua text)
language plpgsql
as $fn$
declare
  t    text[] := '{}';
  r    text[] := '{}';
  ua   uuid := gen_random_uuid();
  ub   uuid := gen_random_uuid();
  v1   uuid;
  v2   uuid;
  lv   uuid;
  lv2  uuid;
  card uuid;
  sch  uuid;
  sch2 uuid;
  ps   uuid := gen_random_uuid();
  ev   uuid := gen_random_uuid();
  fixed timestamptz := '2026-12-01 00:00:00+07';
  res  jsonb;
  n    bigint;
  before_card text;
  after_card  text;
  before_sch  text;
  after_sch   text;
  today date := '2026-11-07';
begin
  begin
    insert into auth.users (id, email) values (ua, 'gd4-a@example.invalid'), (ub, 'gd4-b@example.invalid');
    insert into public.vocabularies (code, sort_order, expression, reading_kana, meaning_vi, han_viet, is_kana_only, jlpt_level)
    values ('test-gd4-1', 999990, '鑿岩機', 'さくがんきよん', 'từ thử 1', 'TẠC NHAM', false, 5) returning id into v1;
    insert into public.vocabularies (code, sort_order, expression, reading_kana, meaning_vi, is_kana_only, jlpt_level)
    values ('test-gd4-2', 999991, 'てすとよん', 'てすとよん', 'từ thử 2', true, 5) returning id into v2;

    insert into public.learner_vocabulary (user_id, vocabulary_id, current_stage) values (ua, v1, 5) returning id into lv;
    insert into public.learner_vocabulary (user_id, vocabulary_id, current_stage) values (ua, v2, 5) returning id into lv2;
    insert into public.review_cards (user_id, learner_vocabulary_id, card_type, due_at, stability, difficulty, state, reps, card_points)
    values (ua, lv, 'vocab.meaning_kana', fixed, 12.5, 5.5, 2, 4, 28) returning id into card;
    insert into public.learner_stage_schedules (user_id, learner_vocabulary_id, stage_number, due_at, stage_points)
    values (ua, lv, 2, fixed, 7) returning id into sch;

    before_card := (select concat_ws('|', due_at, last_review_at, state, stability, difficulty, scheduled_days, learning_steps, reps, lapses) from public.review_cards where id = card);
    before_sch  := (select concat_ws('|', due_at, stage_points, state, reps, completed_at) from public.learner_stage_schedules where id = sch);

    -- ---------- SMART-03: practice chỉ đổi điểm Card ----------
    perform pg_temp.act_as(ua);
    res := public.submit_practice_attempt(ps, ev, v1, 'kana', true, 500, today, '{"mode":"mixed"}'::jsonb, card, 0, 29, 1::smallint, 1::smallint, false);
    execute 'reset role';
    t := t || 'SMART-03 Lượt đúng được lưu'::text;
    r := r || pg_temp.pass(res->>'status' = 'saved', res::text);
    after_card := (select concat_ws('|', due_at, last_review_at, state, stability, difficulty, scheduled_days, learning_steps, reps, lapses) from public.review_cards where id = card);
    after_sch  := (select concat_ws('|', due_at, stage_points, state, reps, completed_at) from public.learner_stage_schedules where id = sch);
    t := t || 'SMART-03 Lịch Card (due, FSRS) trước và sau giống hệt'::text;
    r := r || pg_temp.pass(before_card = after_card, before_card || ' -> ' || after_card);
    t := t || 'SMART-03 Lịch và điểm Stage trước và sau giống hệt'::text;
    r := r || pg_temp.pass(before_sch = after_sch, before_sch || ' -> ' || after_sch);
    t := t || 'SMART-03 Điểm Card tăng đúng 1'::text;
    r := r || pg_temp.pass((select card_points from public.review_cards where id = card) = 29);
    t := t || 'SMART-03 Không ghi vào exercise_logs nên không tính giãn cách'::text;
    r := r || pg_temp.pass(not exists (select 1 from public.exercise_logs where learner_vocabulary_id = lv));

    perform pg_temp.act_as(ua);
    res := public.submit_practice_attempt(ps, ev, v1, 'kana', true, 500, today, '{}'::jsonb, card, 1, 30, 1::smallint, 2::smallint, false);
    execute 'reset role';
    t := t || 'SMART-03 Gửi lại cùng mã không cộng hai lần'::text;
    r := r || pg_temp.pass(res->>'status' = 'duplicate' and (select card_points from public.review_cards where id = card) = 29, res::text);

    perform pg_temp.act_as(ua);
    res := public.submit_practice_attempt(ps, gen_random_uuid(), v1, 'kana', true, 500, today, '{}'::jsonb, card, 99, 30, 1::smallint, 2::smallint, false);
    execute 'reset role';
    t := t || 'SMART-03 Sai version thì báo conflict, không đổi điểm'::text;
    r := r || pg_temp.pass(res->>'status' = 'conflict' and (select card_points from public.review_cards where id = card) = 29, res::text);

    perform pg_temp.act_as(ua);
    res := public.submit_practice_attempt(ps, gen_random_uuid(), v1, 'kana', true, 500, today, '{}'::jsonb, card, 1, 30, 1::smallint, 2::smallint, true);
    execute 'reset role';
    t := t || 'INT-01 Đủ 30 điểm thì Card giàn giáo bị bỏ, lịch vẫn không đổi'::text;
    r := r || pg_temp.pass(
      res->>'status' = 'saved'
      and (select retired_at is not null and due_at = fixed from public.review_cards where id = card), res::text);

    -- ---------- Học lại Card ----------
    perform pg_temp.act_as(ub);
    res := public.relearn_card(card);
    execute 'reset role';
    t := t || 'SYNC-01 Tài khoản khác không học lại được Card của A'::text;
    r := r || pg_temp.pass(res->>'status' = 'not_found' and (select retired_at is not null from public.review_cards where id = card), res::text);

    perform pg_temp.act_as(ua);
    res := public.relearn_card(card);
    execute 'reset role';
    t := t || 'Học lại Card: đến hạn ngay, điểm và FSRS giữ nguyên'::text;
    r := r || pg_temp.pass(
      res->>'status' = 'saved'
      and (select retired_at is null and due_at <= now() and card_points = 30 and stability = 12.5 and reps = 4 from public.review_cards where id = card), res::text);

    -- ---------- Dấu sao ----------
    perform pg_temp.act_as(ua);
    insert into public.learner_vocabulary_stars (user_id, vocabulary_id) values (ua, v1);
    res := public.submit_star_answer(gen_random_uuid(), gen_random_uuid(), v1, 'kana', true, 500, today);
    execute 'reset role';
    t := t || 'Sao: câu học thêm tăng tiến độ vòng, không đổi điểm Stage và điểm Card'::text;
    r := r || pg_temp.pass(
      res->>'status' = 'saved'
      and (select round_answered = 1 from public.learner_vocabulary_stars where user_id = ua and vocabulary_id = v1)
      and (select stage_points = 7 from public.learner_stage_schedules where id = sch)
      and (select card_points = 30 from public.review_cards where id = card), res::text);

    perform pg_temp.act_as(ua);
    insert into public.review_cards (user_id, learner_vocabulary_id, card_type, due_at) values (ua, lv, 'vocab.star_recall', fixed);
    execute 'reset role';
    t := t || 'Sao: tạo được Card riêng cùng từ với Card gốc'::text;
    r := r || pg_temp.pass((select count(*) from public.review_cards where learner_vocabulary_id = lv) = 2);

    -- ---------- SYNC-01: hai tài khoản không thấy dữ liệu nhau ----------
    perform pg_temp.act_as(ub);
    select count(*) into n from public.learner_vocabulary where user_id = ua; t := t || 'SYNC-01 B không đọc được từ của A'::text; r := r || pg_temp.pass(n = 0, n::text);
    select count(*) into n from public.review_cards; t := t || 'SYNC-01 B không đọc được Card của A'::text; r := r || pg_temp.pass(n = 0, n::text);
    select count(*) into n from public.learner_vocabulary_stars; t := t || 'SYNC-01 B không đọc được sao của A'::text; r := r || pg_temp.pass(n = 0, n::text);
    select count(*) into n from public.practice_attempts; t := t || 'SYNC-01 B không đọc được lượt chơi của A'::text; r := r || pg_temp.pass(n = 0, n::text);
    select count(*) into n from public.learner_stage_schedules; t := t || 'SYNC-01 B không đọc được lịch Stage của A'::text; r := r || pg_temp.pass(n = 0, n::text);
    begin
      insert into public.learner_vocabulary_stars (user_id, vocabulary_id) values (ua, v2);
      t := t || 'SYNC-01 B không đánh sao thay A được'::text; r := r || 'FAIL lệnh không bị chặn'::text;
    exception when insufficient_privilege then
      t := t || 'SYNC-01 B không đánh sao thay A được'::text; r := r || 'PASS'::text;
    end;
    delete from public.learner_vocabulary_stars where user_id = ua;
    execute 'reset role';
    t := t || 'SYNC-01 B không xóa được sao của A'::text;
    r := r || pg_temp.pass(exists (select 1 from public.learner_vocabulary_stars where user_id = ua));

    -- ---------- INT-01: hoàn tất Stage qua hàm thật, テレビ 1 → 2 → 5 ----------
    insert into public.learner_stage_schedules (user_id, learner_vocabulary_id, stage_number, due_at, stage_points)
    values (ua, lv2, 2, fixed, 9) returning id into sch;
    insert into public.learner_stage_schedules (user_id, learner_vocabulary_id, stage_number, due_at, stage_points)
    values (ua, lv2, 5, fixed, 9) returning id into sch2;

    perform pg_temp.act_as(ua);
    res := public.submit_stage_exercise(
      p_schedule_id => sch, p_client_event_id => gen_random_uuid(), p_expected_version => 0, p_answered_at => now(),
      p_exercise_type => 'kana_assembly', p_outcome => 'correct', p_points => 1::smallint, p_counted => true,
      p_study_date => today, p_day_seq => 1, p_response_time_ms => 500,
      p_stage_points => 10, p_stage_points_today => 1::smallint, p_points_date => today,
      p_state => 2::smallint, p_due_at => fixed, p_stability => 1, p_difficulty => 5, p_scheduled_days => 2,
      p_learning_steps => 0, p_reps => 1, p_lapses => 0, p_last_review_at => now(),
      p_unlocked_stage => null, p_open_schedule => false, p_completed => true, p_required_stages => array[2, 5]::smallint[],
      p_new_card_types => array['vocab.meaning_kana']::public.card_type[], p_new_cards_due_at => fixed);
    execute 'reset role';
    t := t || 'INT-01 Hoàn tất Stage 2 tạo Card nghĩa–Kana, từ chưa xong'::text;
    r := r || pg_temp.pass(
      (res->>'cards_created')::int = 1 and (res->>'word_completed')::boolean = false
      and (select learning_status = 'learning' from public.learner_vocabulary where id = lv2), res::text);

    perform pg_temp.act_as(ua);
    res := public.submit_stage_exercise(
      p_schedule_id => sch2, p_client_event_id => gen_random_uuid(), p_expected_version => 0, p_answered_at => now(),
      p_exercise_type => 'kana_free_recall', p_outcome => 'correct', p_points => 1::smallint, p_counted => true,
      p_study_date => today, p_day_seq => 2, p_response_time_ms => 500,
      p_stage_points => 10, p_stage_points_today => 1::smallint, p_points_date => today,
      p_state => 2::smallint, p_due_at => fixed, p_stability => 1, p_difficulty => 5, p_scheduled_days => 2,
      p_learning_steps => 0, p_reps => 1, p_lapses => 0, p_last_review_at => now(),
      p_unlocked_stage => null, p_open_schedule => false, p_completed => true, p_required_stages => array[2, 5]::smallint[]);
    execute 'reset role';
    t := t || 'INT-01 Hoàn tất Stage 5 thì từ chỉ Kana xong lộ trình, không có Card mới'::text;
    r := r || pg_temp.pass(
      (res->>'word_completed')::boolean = true and (res->>'cards_created')::int = 0
      and (select learning_status = 'initial_complete' from public.learner_vocabulary where id = lv2)
      and (select count(*) = 1 from public.review_cards where learner_vocabulary_id = lv2), res::text);

    -- ---------- Học lại Stage ----------
    perform pg_temp.act_as(ub);
    res := public.relearn_stage(sch2, 7);
    execute 'reset role';
    t := t || 'SYNC-01 Tài khoản khác không mở lại được Stage của A'::text;
    r := r || pg_temp.pass(res->>'status' = 'not_completed' and (select completed_at is not null from public.learner_stage_schedules where id = sch2), res::text);

    perform pg_temp.act_as(ua);
    res := public.relearn_stage(sch2, 7);
    execute 'reset role';
    t := t || 'Học lại Stage: mở lại, điểm lùi, từ về đang học, current_stage không lùi'::text;
    r := r || pg_temp.pass(
      res->>'status' = 'saved'
      and (select completed_at is null and stage_points = 7 from public.learner_stage_schedules where id = sch2)
      and (select learning_status = 'learning' and stage5_completed_at is null and current_stage = 5 from public.learner_vocabulary where id = lv2), res::text);

    perform pg_temp.act_as(ua);
    res := public.submit_stage_exercise(
      p_schedule_id => sch2, p_client_event_id => gen_random_uuid(),
      p_expected_version => (select version from public.learner_stage_schedules where id = sch2), p_answered_at => now(),
      p_exercise_type => 'kana_free_recall', p_outcome => 'correct', p_points => 1::smallint, p_counted => true,
      p_study_date => today, p_day_seq => 3, p_response_time_ms => 500,
      p_stage_points => 10, p_stage_points_today => 1::smallint, p_points_date => today,
      p_state => 2::smallint, p_due_at => fixed, p_stability => 1, p_difficulty => 5, p_scheduled_days => 2,
      p_learning_steps => 0, p_reps => 2, p_lapses => 0, p_last_review_at => now(),
      p_unlocked_stage => null, p_open_schedule => false, p_completed => true, p_required_stages => array[2, 5]::smallint[],
      p_new_card_types => array['vocab.meaning_kana']::public.card_type[], p_new_cards_due_at => fixed);
    execute 'reset role';
    t := t || 'Học lại Stage: hoàn tất lại không tạo Card trùng, từ xong lộ trình lại'::text;
    r := r || pg_temp.pass(
      (res->>'cards_created')::int = 0 and (res->>'word_completed')::boolean = true
      and (select count(*) = 1 from public.review_cards where learner_vocabulary_id = lv2), res::text);

    raise exception 'gd4_rollback';
  exception when raise_exception then
    if sqlerrm <> 'gd4_rollback' then
      raise;
    end if;
  end;

  execute 'reset role';
  t := t || 'T99 Dữ liệu thử đã được hoàn tác'::text;
  r := r || pg_temp.pass(
    not exists (select 1 from auth.users where id in (ua, ub))
    and not exists (select 1 from public.vocabularies where code like 'test-gd4-%'));

  return query select x.a, x.b from unnest(t, r) as x(a, b);
end;
$fn$;

select * from pg_temp.gd4_checks();
