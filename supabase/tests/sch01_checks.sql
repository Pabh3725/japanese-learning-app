-- =============================================================================
-- SCH-01 · Kiểm tra lịch Stage và hàm submit_stage_exercise
-- Chạy SAU migration 20261105000003_sch01_stage_schedules.sql.
--
-- Cách chạy: Supabase Dashboard → SQL Editor → New query → dán toàn bộ file → Run.
-- PASS = đúng như mong đợi. FAIL = có lỗi, báo lại.
-- An toàn: mọi dữ liệu thử bị HOÀN TÁC ở cuối, database không còn dòng nào.
--
-- Điểm và lịch truyền vào đây là con số engine sẽ tính ra; test này chỉ kiểm phần LƯU
-- (đúng chỗ, đủ, một lần, không đụng card cũ), không kiểm luật.
-- =============================================================================

create or replace function pg_temp.sch01_checks()
returns table (kiem_tra text, ket_qua text)
language plpgsql
as $fn$
declare
  t      text[] := '{}';
  r      text[] := '{}';
  u1     uuid := gen_random_uuid();   -- người học
  u2     uuid := gen_random_uuid();   -- người khác
  v1     uuid;
  v2     uuid;
  lv     uuid;
  lv2    uuid;
  s2     uuid;
  s5     uuid;
  ev1    uuid := gen_random_uuid();
  res    jsonb;
  n      integer;
  pts    integer;
  ver    integer;
  stg    smallint;
  st     text;
  old_points integer := 3;
begin
  begin
    -- ---------- Dữ liệu chuẩn bị (quyền admin) ----------
    insert into auth.users (id, email) values
      (u1, 'sch01-a@example.invalid'), (u2, 'sch01-b@example.invalid');

    insert into public.vocabularies (code, sort_order, expression, reading_kana, meaning_vi, han_viet, is_kana_only, jlpt_level)
    values ('test-sch1', 999996, 'テスト', 'てすと', 'từ thử SCH-01', null, true, 5),
           ('test-sch2', 999995, 'テスト二', 'てすとに', 'từ thử SCH-01 hai', null, true, 5);
    select id into v1 from public.vocabularies where code = 'test-sch1';
    select id into v2 from public.vocabularies where code = 'test-sch2';

    -- ---------- Trigger: từ mới tự có lịch Stage 2 ----------
    insert into public.learner_vocabulary (user_id, vocabulary_id, current_stage) values (u1, v1, 2) returning id into lv;
    select id, stage_points into s2, pts from public.learner_stage_schedules where learner_vocabulary_id = lv and stage_number = 2;
    t := t || 'T01 Từ mới tự có lịch Stage 2'::text;
    r := r || (case when s2 is not null and pts = 0 then 'PASS' else 'FAIL' end);

    insert into public.learner_vocabulary (user_id, vocabulary_id, current_stage) values (u2, v2, 2) returning id into lv2;

    -- ---------- Bảng: ràng buộc ----------
    begin
      insert into public.learner_stage_schedules (user_id, learner_vocabulary_id, stage_number) values (u1, lv, 4);
      t := t || 'T02 Không có lịch cho Stage 4 (chỉ xem)'::text; r := r || 'FAIL'::text;
    exception when check_violation then
      t := t || 'T02 Không có lịch cho Stage 4 (chỉ xem)'::text; r := r || 'PASS'::text;
    end;

    begin
      insert into public.learner_stage_schedules (user_id, learner_vocabulary_id, stage_number) values (u1, lv, 2);
      t := t || 'T03 Mỗi từ × stage chỉ có một lịch'::text; r := r || 'FAIL'::text;
    exception when unique_violation then
      t := t || 'T03 Mỗi từ × stage chỉ có một lịch'::text; r := r || 'PASS'::text;
    end;

    begin
      update public.learner_stage_schedules set scheduled_days = 3 where id = s2;
      t := t || 'T04 Database từ chối lịch vượt 2 ngày'::text; r := r || 'FAIL'::text;
    exception when check_violation then
      t := t || 'T04 Database từ chối lịch vượt 2 ngày'::text; r := r || 'PASS'::text;
    end;

    -- ---------- Đăng nhập là u1 ----------
    perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u1::text, true);
    perform set_config('role', 'authenticated', true);

    -- ---------- Một câu bình thường ----------
    res := public.submit_stage_exercise(
        p_schedule_id => s2, p_client_event_id => ev1, p_expected_version => 0,
        p_answered_at => '2026-11-05 20:00+07', p_exercise_type => 'kana_to_meaning', p_outcome => 'correct',
        p_points => 1::smallint, p_counted => true, p_study_date => '2026-11-05', p_day_seq => 1,
        p_response_time_ms => 1000, p_stage_points => old_points, p_stage_points_today => 1::smallint,
        p_points_date => '2026-11-05', p_state => 2::smallint, p_due_at => '2026-11-06 20:00+07',
        p_stability => 2.5, p_difficulty => 3, p_scheduled_days => 1, p_learning_steps => 0, p_reps => 1,
        p_lapses => 0, p_last_review_at => '2026-11-05 20:00+07', p_unlocked_stage => null::smallint,
        p_open_schedule => false, p_completed => false, p_required_stages => '{2,3}',
        p_new_card_types => '{}', p_new_cards_due_at => null);
    select stage_points, version, scheduled_days into pts, ver, n from public.learner_stage_schedules where id = s2;
    t := t || 'T05 Lưu điểm và lịch vào đúng stage'::text;
    r := r || (case when res->>'status' = 'saved' and pts = old_points and ver = 1 and n = 1 then 'PASS' else 'FAIL — ' || res::text end);

    select count(*) into n from public.exercise_logs where learner_vocabulary_id = lv and stage_number = 2;
    t := t || 'T06 Ghi đúng 1 dòng nhật ký, đúng stage'::text;
    r := r || (case when n = 1 then 'PASS' else 'FAIL — ' || n end);

    -- ---------- Gửi trùng ----------
    res := public.submit_stage_exercise(
        p_schedule_id => s2, p_client_event_id => ev1, p_expected_version => 1,
        p_answered_at => '2026-11-05 20:00+07', p_exercise_type => 'kana_to_meaning', p_outcome => 'correct',
        p_points => 1::smallint, p_counted => true, p_study_date => '2026-11-05', p_day_seq => 1,
        p_response_time_ms => 1000, p_stage_points => 99, p_stage_points_today => 1::smallint,
        p_points_date => '2026-11-05', p_state => 2::smallint, p_due_at => '2026-11-06 20:00+07',
        p_stability => 2.5, p_difficulty => 3, p_scheduled_days => 1, p_learning_steps => 0, p_reps => 1,
        p_lapses => 0, p_last_review_at => '2026-11-05 20:00+07', p_unlocked_stage => null::smallint,
        p_open_schedule => false, p_completed => false, p_required_stages => '{2,3}',
        p_new_card_types => '{}', p_new_cards_due_at => null);
    select stage_points into pts from public.learner_stage_schedules where id = s2;
    t := t || 'T07 Gửi trùng: không ghi lại'::text;
    r := r || (case when res->>'status' = 'duplicate' and pts = old_points then 'PASS' else 'FAIL — ' || res::text end);

    -- ---------- Hai thiết bị ----------
    res := public.submit_stage_exercise(
        p_schedule_id => s2, p_client_event_id => gen_random_uuid(), p_expected_version => 0,
        p_answered_at => '2026-11-05 20:00+07', p_exercise_type => 'kana_to_meaning', p_outcome => 'correct',
        p_points => 1::smallint, p_counted => true, p_study_date => '2026-11-05', p_day_seq => 1,
        p_response_time_ms => 1000, p_stage_points => 99, p_stage_points_today => 1::smallint,
        p_points_date => '2026-11-05', p_state => 2::smallint, p_due_at => '2026-11-06 20:00+07',
        p_stability => 2.5, p_difficulty => 3, p_scheduled_days => 1, p_learning_steps => 0, p_reps => 1,
        p_lapses => 0, p_last_review_at => '2026-11-05 20:00+07', p_unlocked_stage => null::smallint,
        p_open_schedule => false, p_completed => false, p_required_stages => '{2,3}',
        p_new_card_types => '{}', p_new_cards_due_at => null);
    select stage_points into pts from public.learner_stage_schedules where id = s2;
    t := t || 'T08 Version cũ: không ghi đè'::text;
    r := r || (case when res->>'status' = 'conflict' and pts = old_points then 'PASS' else 'FAIL — ' || res::text end);

    -- ---------- Vượt 2 ngày ----------
    begin
      res := public.submit_stage_exercise(
        p_schedule_id => s2, p_client_event_id => gen_random_uuid(), p_expected_version => 1,
        p_answered_at => '2026-11-05 20:00+07', p_exercise_type => 'kana_to_meaning', p_outcome => 'correct',
        p_points => 1::smallint, p_counted => true, p_study_date => '2026-11-05', p_day_seq => 1,
        p_response_time_ms => 1000, p_stage_points => 4, p_stage_points_today => 1::smallint,
        p_points_date => '2026-11-05', p_state => 2::smallint, p_due_at => '2026-11-06 20:00+07',
        p_stability => 2.5, p_difficulty => 3, p_scheduled_days => 7, p_learning_steps => 0, p_reps => 1,
        p_lapses => 0, p_last_review_at => '2026-11-05 20:00+07', p_unlocked_stage => null::smallint,
        p_open_schedule => false, p_completed => false, p_required_stages => '{2,3}',
        p_new_card_types => '{}', p_new_cards_due_at => null);
      t := t || 'T09 Hàm từ chối lịch vượt 2 ngày'::text; r := r || 'FAIL'::text;
    exception when others then
      t := t || 'T09 Hàm từ chối lịch vượt 2 ngày'::text;
      r := r || (case when sqlstate = '22023' then 'PASS' else 'FAIL — ' || sqlstate end);
    end;

    -- ---------- Mở Stage 3, Stage 2 vẫn chạy ----------
    res := public.submit_stage_exercise(
        p_schedule_id => s2, p_client_event_id => gen_random_uuid(), p_expected_version => 1,
        p_answered_at => '2026-11-05 20:00+07', p_exercise_type => 'kana_to_meaning', p_outcome => 'correct',
        p_points => 1::smallint, p_counted => true, p_study_date => '2026-11-05', p_day_seq => 1,
        p_response_time_ms => 1000, p_stage_points => 5, p_stage_points_today => 1::smallint,
        p_points_date => '2026-11-05', p_state => 2::smallint, p_due_at => '2026-11-06 20:00+07',
        p_stability => 2.5, p_difficulty => 3, p_scheduled_days => 1, p_learning_steps => 0, p_reps => 1,
        p_lapses => 0, p_last_review_at => '2026-11-05 20:00+07', p_unlocked_stage => 3::smallint,
        p_open_schedule => true, p_completed => false, p_required_stages => '{2,3}',
        p_new_card_types => '{}', p_new_cards_due_at => null);
    select id into s5 from public.learner_stage_schedules where learner_vocabulary_id = lv and stage_number = 3;
    select current_stage into stg from public.learner_vocabulary where id = lv;
    select count(*) into n from public.learner_stage_schedules where id = s2 and unlocked_next_at is not null and completed_at is null;
    t := t || 'T10 Mở Stage 3: có lịch mới, current_stage = 3, Stage 2 vẫn chạy'::text;
    r := r || (case when s5 is not null and stg = 3 and n = 1 then 'PASS' else 'FAIL — ' || res::text end);

    select count(*) into n from public.review_cards where learner_vocabulary_id = lv;
    t := t || 'T11 Chưa hoàn tất thì chưa có card'::text;
    r := r || (case when n = 0 then 'PASS' else 'FAIL — ' || n end);

    -- ---------- Hoàn tất Stage 2: V9 chưa có Card, từ chưa xong ----------
    res := public.submit_stage_exercise(
        p_schedule_id => s2, p_client_event_id => gen_random_uuid(), p_expected_version => 2,
        p_answered_at => '2026-11-05 20:00+07', p_exercise_type => 'kana_to_meaning', p_outcome => 'correct',
        p_points => 1::smallint, p_counted => true, p_study_date => '2026-11-05', p_day_seq => 1,
        p_response_time_ms => 1000, p_stage_points => 8, p_stage_points_today => 1::smallint,
        p_points_date => '2026-11-05', p_state => 2::smallint, p_due_at => '2026-11-06 20:00+07',
        p_stability => 2.5, p_difficulty => 3, p_scheduled_days => 1, p_learning_steps => 0, p_reps => 1,
        p_lapses => 0, p_last_review_at => '2026-11-05 20:00+07', p_unlocked_stage => null::smallint,
        p_open_schedule => false, p_completed => true, p_required_stages => '{2,3}',
        p_new_card_types => '{}', p_new_cards_due_at => null);
    select count(*) into n from public.review_cards where learner_vocabulary_id = lv;
    select learning_status into st from public.learner_vocabulary where id = lv;
    t := t || 'T12 Hoàn tất Stage 2: chưa có Card (V9 tạo ở Stage 3), từ vẫn đang học'::text;
    r := r || (case when n = 0 and st = 'learning' and (res->>'word_completed')::boolean = false then 'PASS' else 'FAIL — ' || res::text end);

    res := public.submit_stage_exercise(
        p_schedule_id => s2, p_client_event_id => gen_random_uuid(), p_expected_version => 3,
        p_answered_at => '2026-11-05 20:00+07', p_exercise_type => 'kana_to_meaning', p_outcome => 'correct',
        p_points => 1::smallint, p_counted => true, p_study_date => '2026-11-05', p_day_seq => 1,
        p_response_time_ms => 1000, p_stage_points => 9, p_stage_points_today => 1::smallint,
        p_points_date => '2026-11-05', p_state => 2::smallint, p_due_at => '2026-11-06 20:00+07',
        p_stability => 2.5, p_difficulty => 3, p_scheduled_days => 1, p_learning_steps => 0, p_reps => 1,
        p_lapses => 0, p_last_review_at => '2026-11-05 20:00+07', p_unlocked_stage => null::smallint,
        p_open_schedule => false, p_completed => false, p_required_stages => '{2,3}',
        p_new_card_types => '{}', p_new_cards_due_at => null);
    t := t || 'T13 Stage đã hoàn tất không nhận câu mới'::text;
    r := r || (case when res->>'status' = 'stage_changed' then 'PASS' else 'FAIL — ' || res::text end);

    -- ---------- Hoàn tất Stage 3: có Card Kana, từ hoàn thành ----------
    res := public.submit_stage_exercise(
        p_schedule_id => s5, p_client_event_id => gen_random_uuid(), p_expected_version => 0,
        p_answered_at => '2026-11-05 20:00+07', p_exercise_type => 'kana_to_meaning', p_outcome => 'correct',
        p_points => 1::smallint, p_counted => true, p_study_date => '2026-11-05', p_day_seq => 1,
        p_response_time_ms => 1000, p_stage_points => 8, p_stage_points_today => 1::smallint,
        p_points_date => '2026-11-05', p_state => 2::smallint, p_due_at => '2026-11-06 20:00+07',
        p_stability => 2.5, p_difficulty => 3, p_scheduled_days => 1, p_learning_steps => 0, p_reps => 1,
        p_lapses => 0, p_last_review_at => '2026-11-05 20:00+07', p_unlocked_stage => null::smallint,
        p_open_schedule => false, p_completed => true, p_required_stages => '{2,3}',
        p_new_card_types => '{vocab.kana}', p_new_cards_due_at => '2026-11-06 00:00+07');
    select learning_status into st from public.learner_vocabulary where id = lv;
    select count(*) into n from public.review_cards where learner_vocabulary_id = lv and card_type = 'vocab.kana';
    t := t || 'T14 Stage 2 và 3 xong: từ hoàn thành nhánh Kana, có Card Kana'::text;
    r := r || (case when n = 1 and st = 'initial_complete' and (res->>'word_completed')::boolean then 'PASS' else 'FAIL — ' || res::text end);

    -- ---------- RLS: không đụng được dữ liệu người khác ----------
    select count(*) into n from public.learner_stage_schedules where learner_vocabulary_id = lv2;
    t := t || 'T15 Không đọc được lịch của người khác'::text;
    r := r || (case when n = 0 then 'PASS' else 'FAIL — ' || n end);

    begin
      insert into public.learner_stage_schedules (user_id, learner_vocabulary_id, stage_number) values (u1, lv2, 3);
      t := t || 'T16 Không gắn lịch vào từ của người khác'::text; r := r || 'FAIL'::text;
    exception when insufficient_privilege then
      t := t || 'T16 Không gắn lịch vào từ của người khác'::text; r := r || 'PASS'::text;
    end;

    perform set_config('role', 'postgres', true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);

    -- ---------- Quyền ----------
    select count(*) into n from pg_proc
     where proname = 'submit_stage_exercise' and pronamespace = 'public'::regnamespace
       and has_function_privilege('anon', oid, 'execute');
    t := t || 'T17 anon không gọi được hàm'::text;
    r := r || (case when n = 0 then 'PASS' else 'FAIL — anon gọi được' end);

    t := t || 'T18 anon không có quyền trên bảng; authenticated không TRUNCATE được'::text;
    r := r || (case when not has_table_privilege('anon', 'public.learner_stage_schedules', 'select')
                     and not has_table_privilege('authenticated', 'public.learner_stage_schedules', 'truncate')
                    then 'PASS' else 'FAIL' end);

    -- ---------- Settings ----------
    select count(*) into n from information_schema.columns
     where table_schema = 'public' and table_name = 'learner_settings'
       and column_name in ('stage_cap', 'kanji_new_per_day', 'kanji_cap');
    t := t || 'T19 Có đủ 3 cột settings mới'::text;
    r := r || (case when n = 3 then 'PASS' else 'FAIL — ' || n end);

    -- ---------- Chuyển dữ liệu cũ ----------
    select count(*) into n from public.learner_vocabulary lvx
     where lvx.learning_status = 'learning' and lvx.current_stage in (2, 3)
       and not exists (select 1 from public.learner_stage_schedules s
                        where s.learner_vocabulary_id = lvx.id and s.stage_number = lvx.current_stage);
    t := t || 'T20 Mọi từ đang học đều có lịch ở stage hiện tại'::text;
    r := r || (case when n = 0 then 'PASS' else 'FAIL — thiếu ' || n end);

    raise exception 'sch01_rollback';
  exception when raise_exception then
    if sqlerrm <> 'sch01_rollback' then raise; end if;
  end;

  t := t || 'T99 Dữ liệu thử đã được hoàn tác'::text;
  r := r || (case when not exists (select 1 from auth.users where id in (u1, u2))
                   and not exists (select 1 from public.vocabularies where code in ('test-sch1', 'test-sch2'))
                  then 'PASS' else 'FAIL — còn sót dữ liệu thử' end);

  return query select x.a, x.b from unnest(t, r) as x(a, b);
end;
$fn$;

select * from pg_temp.sch01_checks();
