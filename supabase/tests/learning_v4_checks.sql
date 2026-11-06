-- =============================================================================
-- Kiểm tra migration 20261106000002_learning_v4.sql.
-- An toàn: mọi dữ liệu thử bị HOÀN TÁC ở cuối, database không còn dòng nào.
-- =============================================================================
create or replace function pg_temp.learning_v4_checks()
returns table (kiem_tra text, ket_qua text)
language plpgsql
as $fn$
declare
  t   text[] := '{}';
  r   text[] := '{}';
  u1  uuid := gen_random_uuid();
  u2  uuid := gen_random_uuid();
  v1  uuid;
  lv  uuid;
  res jsonb;
  first_seen timestamptz;
  second_seen timestamptz;
begin
  begin
    insert into auth.users (id, email) values (u1, 'v4-a@example.invalid'), (u2, 'v4-b@example.invalid');
    insert into public.vocabularies (code, sort_order, expression, reading_kana, meaning_vi, han_viet, is_kana_only, jlpt_level)
    values ('test-v4', 999993, '鑿岩', 'さくがんぶいよん', 'từ thử V4', 'TẠC NHAM', false, 5) returning id into v1;
    insert into public.learner_vocabulary (user_id, vocabulary_id, current_stage) values (u1, v1, 4) returning id into lv;

    t := array_append(t, 'Từ mới lên Stage 4 chưa xem thẻ Hán tự');
    r := array_append(r, (select case when kanji_intro_seen_at is null then 'PASS' else 'FAIL' end from public.learner_vocabulary where id = lv));

    t := array_append(t, 'Người mới có mặc định 5 từ mỗi ngày');
    r := array_append(r, (select case when daily_new_limit = 5 then 'PASS' else 'FAIL ' || daily_new_limit end from public.learner_settings where user_id = u1));

    perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);
    res := public.complete_kanji_intro(lv, now());
    t := array_append(t, 'Người khác không đánh dấu được');
    r := array_append(r, case when res->>'status' = 'not_found' then 'PASS' else 'FAIL ' || res::text end);

    perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
    res := public.complete_kanji_intro(lv, timestamptz '2026-11-06 01:00+00');
    select kanji_intro_seen_at into first_seen from public.learner_vocabulary where id = lv;
    res := public.complete_kanji_intro(lv, timestamptz '2026-11-07 01:00+00');
    select kanji_intro_seen_at into second_seen from public.learner_vocabulary where id = lv;
    t := array_append(t, 'Gọi lại giữ nguyên thời điểm đầu');
    r := array_append(r, case when res->>'status' = 'saved' and first_seen = second_seen and first_seen = timestamptz '2026-11-06 01:00+00' then 'PASS' else 'FAIL' end);
    perform set_config('role', 'postgres', true);

    begin
      insert into public.exercise_logs (user_id, learner_vocabulary_id, client_event_id, stage_number, exercise_type, outcome, points, counted, study_date, day_seq)
      values (u1, lv, gen_random_uuid(), 4, 'kanji_assembly', 'wrong', -2, true, current_date, 1);
      t := array_append(t, 'Nhật ký nhận −2'); r := array_append(r, 'PASS'::text);
    exception when others then
      t := array_append(t, 'Nhật ký nhận −2'); r := array_append(r, 'FAIL ' || sqlerrm);
    end;
    begin
      insert into public.exercise_logs (user_id, learner_vocabulary_id, client_event_id, stage_number, exercise_type, outcome, points, counted, study_date, day_seq)
      values (u1, lv, gen_random_uuid(), 4, 'kanji_assembly', 'wrong', -3, true, current_date, 1);
      t := array_append(t, 'Nhật ký từ chối −3'); r := array_append(r, 'FAIL'::text);
    exception when check_violation then
      t := array_append(t, 'Nhật ký từ chối −3'); r := array_append(r, 'PASS'::text);
    end;

    raise exception 'rollback';
  exception when raise_exception then
    null;
  end;
  return query select * from unnest(t, r);
end;
$fn$;
select * from pg_temp.learning_v4_checks();
