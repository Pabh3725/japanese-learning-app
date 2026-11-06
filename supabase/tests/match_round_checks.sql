-- =============================================================================
-- Kiểm tra vòng ghép ô (apply_match_penalties).
-- Chạy SAU migration 20261106000001_match_round.sql.
-- Cách chạy: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- An toàn: mọi dữ liệu thử bị HOÀN TÁC ở cuối.
-- =============================================================================
create or replace function pg_temp.match_checks()
returns table (kiem_tra text, ket_qua text)
language plpgsql
as $fn$
declare
  t    text[] := '{}';
  r    text[] := '{}';
  u1   uuid := gen_random_uuid();
  u2   uuid := gen_random_uuid();
  v1   uuid;
  lv   uuid;
  s5   uuid;
  ev   uuid := gen_random_uuid();
  res  jsonb;
  pts  integer;
  due0 timestamptz := '2026-11-07 00:00+07';
  due1 timestamptz;
  n    integer;
begin
  begin
    insert into auth.users (id, email) values (u1, 'mr-a@example.invalid'), (u2, 'mr-b@example.invalid');
    insert into public.vocabularies (code, sort_order, expression, reading_kana, meaning_vi, is_kana_only, jlpt_level)
    values ('test-mr', 999993, 'テストま', 'てすとま', 'từ thử ghép ô', true, 5) returning id into v1;
    insert into public.learner_vocabulary (user_id, vocabulary_id, current_stage) values (u1, v1, 2) returning id into lv;
    insert into public.learner_stage_schedules (user_id, learner_vocabulary_id, stage_number, stage_points, due_at)
    values (u1, lv, 5, 3, due0) returning id into s5;

    perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u1::text, true);
    perform set_config('role', 'authenticated', true);

    res := public.apply_match_penalties(array[s5], array[ev], (-1)::smallint, '2026-11-06', '2026-11-06 20:00+07');
    select stage_points, due_at into pts, due1 from public.learner_stage_schedules where id = s5;
    t := t || 'T1 Trừ 1 điểm'::text;      r := r || (case when pts = 2 then 'PASS' else 'FAIL — ' || pts end);
    t := t || 'T2 Không đổi lịch'::text;  r := r || (case when due1 = due0 then 'PASS' else 'FAIL' end);

    res := public.apply_match_penalties(array[s5], array[ev], (-1)::smallint, '2026-11-06', '2026-11-06 20:00+07');
    select stage_points into pts from public.learner_stage_schedules where id = s5;
    t := t || 'T3 Gửi lại cùng mã: không trừ lần nữa'::text;
    r := r || (case when pts = 2 and (res->>'applied')::int = 0 then 'PASS' else 'FAIL — ' || res::text end);

    select count(*) into n from public.exercise_logs where learner_vocabulary_id = lv and source = 'match' and points = -1;
    t := t || 'T4 Có nhật ký source = match'::text;
    r := r || (case when n = 1 then 'PASS' else 'FAIL — ' || n end);

    begin
      res := public.apply_match_penalties(array[s5], array[gen_random_uuid()], 1::smallint, '2026-11-06', '2026-11-06 20:00+07');
      t := t || 'T5 Không cộng điểm được bằng hàm này'::text; r := r || 'FAIL'::text;
    exception when others then
      t := t || 'T5 Không cộng điểm được bằng hàm này'::text;
      r := r || (case when sqlstate = '22023' then 'PASS' else 'FAIL — ' || sqlstate end);
    end;

    -- Người khác
    perform set_config('role', 'postgres', true);
    perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u2::text, true);
    perform set_config('role', 'authenticated', true);
    res := public.apply_match_penalties(array[s5], array[gen_random_uuid()], (-1)::smallint, '2026-11-06', '2026-11-06 20:00+07');
    perform set_config('role', 'postgres', true);
    select stage_points into pts from public.learner_stage_schedules where id = s5;
    t := t || 'T6 Người khác không trừ được điểm của mình'::text;
    r := r || (case when pts = 2 and (res->>'applied')::int = 0 then 'PASS' else 'FAIL — ' || res::text end);

    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
    select count(*) into n from pg_proc
     where proname = 'apply_match_penalties' and pronamespace = 'public'::regnamespace
       and has_function_privilege('anon', oid, 'execute');
    t := t || 'T7 anon không gọi được hàm'::text;
    r := r || (case when n = 0 then 'PASS' else 'FAIL' end);

    raise exception 'mr_rollback';
  exception when raise_exception then
    if sqlerrm <> 'mr_rollback' then raise; end if;
  end;

  t := t || 'T99 Dữ liệu thử đã được hoàn tác'::text;
  r := r || (case when not exists (select 1 from auth.users where id in (u1, u2)) then 'PASS' else 'FAIL' end);
  return query select x.a, x.b from unnest(t, r) as x(a, b);
end;
$fn$;

select * from pg_temp.match_checks();
