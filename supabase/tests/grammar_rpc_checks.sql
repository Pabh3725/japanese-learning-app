-- =============================================================================
-- Grammar G4 · submit_grammar_learning / submit_grammar_review trên database thật (migration 20261117000001).
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

create or replace function pg_temp.learn(p_lg uuid, p_s uuid, p_event uuid, p_version integer, p_points integer, p_completed boolean)
returns jsonb
language sql
as $$
  select public.submit_grammar_learning(
    p_lg, p_event, p_version, p_s, 'particle_choice', 1::smallint, 'correct', 1::smallint, current_date, 800, now(),
    case when p_completed then 'review' else 'learning' end, p_points, 1::smallint, current_date, 0::smallint, now() + interval '1 day',
    0, 0, 1, 0, 1, 0, now(), p_completed)
$$;

create or replace function pg_temp.review(p_lg uuid, p_s uuid, p_event uuid, p_round uuid, p_finish boolean, p_version integer, p_days integer)
returns jsonb
language sql
as $$
  select public.submit_grammar_review(
    p_lg, p_event, p_round, p_s, 'order', 'correct', current_date, 900, now(),
    p_finish, p_version, 2::smallint, now() + make_interval(days => p_days), 3.0, 5.0, p_days, 0, 2, 0, now())
$$;

create or replace function pg_temp.rpc_checks()
returns table (kiem_tra text, ket_qua text)
language plpgsql
as $fn$
declare
  t    text[] := '{}';
  r    text[] := '{}';
  ua   uuid := gen_random_uuid();
  ub   uuid := gen_random_uuid();
  pt   uuid;
  st   uuid;
  lg   uuid;
  ev   uuid := gen_random_uuid();
  rd   uuid := gen_random_uuid();
  res  jsonb;
  v    integer;
begin
  begin
    insert into auth.users (id, email) values (ua, 'grr-a@example.invalid'), (ub, 'grr-b@example.invalid');
    insert into public.grammar_points (code, lesson, sort_order, pattern, meaning_vi, explanation, approved)
    values ('g50-97', 50, 97, 'TEST', 'thử', 'thử', true) returning id into pt;
    insert into public.grammar_sentences (code, point_id, level, japanese, pieces, meaning_vi)
    values ('g50-97-s01', pt, 1, 'テスト', '[{"t":"テスト"}]', 'thử') returning id into st;

    perform pg_temp.act_as(ua);
    insert into public.learner_grammar (user_id, point_id) values (ua, pt) returning id into lg;

    res := pg_temp.learn(lg, st, ev, 0, 1, false);
    t := t || 'GRR-01 Câu Học: lưu nhật ký và điểm trong một lần'::text;
    r := r || pg_temp.pass(res ->> 'status' = 'saved' and (select points from public.learner_grammar where id = lg) = 1
                           and (select count(*) from public.grammar_logs where learner_grammar_id = lg) = 1, res::text);

    res := pg_temp.learn(lg, st, ev, 1, 2, false);
    t := t || 'GRR-02 Gửi lại cùng mã: không lưu lần hai'::text;
    r := r || pg_temp.pass(res ->> 'status' = 'duplicate' and (select points from public.learner_grammar where id = lg) = 1, res::text);

    res := pg_temp.learn(lg, st, gen_random_uuid(), 0, 9, false);
    t := t || 'GRR-03 Version cũ (máy khác vừa lưu): báo conflict, không ghi'::text;
    r := r || pg_temp.pass(res ->> 'status' = 'conflict' and (select count(*) from public.grammar_logs where learner_grammar_id = lg) = 1, res::text);

    res := pg_temp.learn(lg, st, gen_random_uuid(), 1, 40, true);
    t := t || 'GRR-04 Học xong: sang giai đoạn Ôn, có completed_at'::text;
    r := r || pg_temp.pass(res ->> 'status' = 'saved' and exists (select 1 from public.learner_grammar where id = lg and phase = 'review' and completed_at is not null), res::text);

    res := pg_temp.learn(lg, st, gen_random_uuid(), 2, 41, false);
    t := t || 'GRR-05 Mẫu đã sang Ôn thì không nhận câu Học'::text;
    r := r || pg_temp.pass(res ->> 'status' = 'not_active', res::text);

    select version into v from public.learner_grammar where id = lg;
    res := pg_temp.review(lg, st, gen_random_uuid(), rd, false, v, 5);
    t := t || 'GRR-06 Câu Ôn chưa phải câu cuối: chỉ ghi nhật ký, lịch không đổi'::text;
    r := r || pg_temp.pass(res ->> 'status' = 'saved' and (select scheduled_days from public.learner_grammar where id = lg) = 1, res::text);

    res := pg_temp.review(lg, st, gen_random_uuid(), rd, true, v, 5);
    t := t || 'GRR-07 Câu cuối của lượt: đổi lịch một lần, ghi lượt'::text;
    r := r || pg_temp.pass(res ->> 'status' = 'saved' and exists (select 1 from public.learner_grammar where id = lg and scheduled_days = 5 and last_review_round = rd), res::text);

    select version into v from public.learner_grammar where id = lg;
    res := pg_temp.review(lg, st, gen_random_uuid(), rd, true, v, 9);
    t := t || 'GRR-08 Cùng lượt gửi "câu cuối" lần nữa: không đổi lịch lần hai'::text;
    r := r || pg_temp.pass((select scheduled_days from public.learner_grammar where id = lg) = 5, res::text);

    res := pg_temp.review(lg, st, gen_random_uuid(), gen_random_uuid(), true, v - 1, 7);
    t := t || 'GRR-09 Câu cuối với version cũ: conflict, không ghi nhật ký'::text;
    r := r || pg_temp.pass(res ->> 'status' = 'conflict' and (select count(*) from public.grammar_logs where learner_grammar_id = lg and mode = 'review') = 3, res::text);
    execute 'reset role';

    perform pg_temp.act_as(ub);
    res := pg_temp.learn(lg, st, gen_random_uuid(), 0, 1, false);
    t := t || 'GRR-10 Người khác không lưu được vào tiến độ của mình'::text;
    r := r || pg_temp.pass(res ->> 'status' = 'not_found', res::text);
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';
    begin
      perform pg_temp.learn(lg, st, gen_random_uuid(), 0, 1, false);
      t := t || 'GRR-11 Chưa đăng nhập không gọi được'::text; r := r || 'FAIL gọi được'::text;
    exception when insufficient_privilege then
      t := t || 'GRR-11 Chưa đăng nhập không gọi được'::text; r := r || 'PASS'::text;
    end;
    execute 'reset role';

    raise exception 'grr_rollback';
  exception when raise_exception then
    if sqlerrm <> 'grr_rollback' then
      raise;
    end if;
  end;

  execute 'reset role';
  t := t || 'T99 Dữ liệu thử đã được hoàn tác'::text;
  r := r || pg_temp.pass(not exists (select 1 from auth.users where id in (ua, ub)) and not exists (select 1 from public.grammar_points where code = 'g50-97'));
  return query select x.a, x.b from unnest(t, r) as x(a, b);
end;
$fn$;

select * from pg_temp.rpc_checks();
