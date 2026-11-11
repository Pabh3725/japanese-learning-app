-- =============================================================================
-- V9 gói 7 · Vòng ghép chữ Kanji (R12 dạng F): apply_kanji_match_penalties trên database thật.
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

create or replace function pg_temp.penalize(p_lk uuid, p_event uuid)
returns jsonb
language sql
as $$ select public.apply_kanji_match_penalties(array[p_lk], array[p_event], (-1)::smallint, '2026-11-15'::date, now()) $$;

create or replace function pg_temp.match_checks()
returns table (kiem_tra text, ket_qua text)
language plpgsql
as $fn$
declare
  t   text[] := '{}';
  r   text[] := '{}';
  ua  uuid := gen_random_uuid();
  ub  uuid := gen_random_uuid();
  lk  uuid;
  ev1 uuid := gen_random_uuid();
  ev2 uuid := gen_random_uuid();
  res jsonb;
  pts integer;
  logs_before bigint;
  n   bigint;
begin
  begin
    insert into auth.users (id, email) values (ua, 'km-a@example.invalid'), (ub, 'km-b@example.invalid');
    insert into public.learner_kanji (user_id, kanji_id, points) values (ua, (select id from public.kanji where character = '学'), 5) returning id into lk;
    select count(*) into logs_before from public.kanji_logs where learner_kanji_id = lk;

    perform pg_temp.act_as(ua);
    res := pg_temp.penalize(lk, ev1);
    select points into pts from public.learner_kanji where id = lk;
    t := t || 'KM-01 Ghép sai: chữ đang học bị trừ 1 điểm, có dòng nhật ký riêng'::text;
    r := r || pg_temp.pass(pts = 4 and (res ->> 'applied')::int = 1 and exists (select 1 from public.kanji_match_penalties where client_event_id = ev1 and points = -1), format('points=%s res=%s', pts, res));

    res := pg_temp.penalize(lk, ev1);
    select points into pts from public.learner_kanji where id = lk;
    t := t || 'KM-02 Gửi lại cùng mã không trừ lần hai'::text;
    r := r || pg_temp.pass(pts = 4 and (res ->> 'applied')::int = 0, format('points=%s', pts));

    t := t || 'KM-03 Không ghi kanji_logs (không đếm vào buổi Học, giãn cách)'::text;
    r := r || pg_temp.pass((select count(*) from public.kanji_logs where learner_kanji_id = lk) = logs_before);
    execute 'reset role';

    update public.learner_kanji set points = 0 where id = lk;
    perform pg_temp.act_as(ua);
    perform pg_temp.penalize(lk, ev2);
    t := t || 'KM-04 Điểm không xuống dưới 0'::text;
    r := r || pg_temp.pass((select points from public.learner_kanji where id = lk) = 0);
    execute 'reset role';

    update public.learner_kanji set points = 12, phase = 'review', completed_at = now() where id = lk;
    perform pg_temp.act_as(ua);
    res := pg_temp.penalize(lk, gen_random_uuid());
    t := t || 'KM-05 Chữ đang ôn bằng Card không bị trừ'::text;
    r := r || pg_temp.pass((select points from public.learner_kanji where id = lk) = 12 and (res ->> 'applied')::int = 0);
    execute 'reset role';

    update public.learner_kanji set phase = 'learning', completed_at = null where id = lk;
    perform pg_temp.act_as(ub);
    res := pg_temp.penalize(lk, gen_random_uuid());
    select count(*) into n from public.kanji_match_penalties;
    t := t || 'KM-06 Người khác không trừ được điểm chữ của mình, không đọc được nhật ký'::text;
    r := r || pg_temp.pass((res ->> 'applied')::int = 0 and n = 0);
    begin
      perform public.apply_kanji_match_penalties(array[lk], array[gen_random_uuid()], 1::smallint, '2026-11-15'::date, now());
      t := t || 'KM-07 Không cho cộng điểm'::text; r := r || 'FAIL cộng được'::text;
    exception when invalid_parameter_value then
      t := t || 'KM-07 Không cho cộng điểm'::text; r := r || 'PASS'::text;
    end;
    execute 'reset role';

    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';
    begin
      perform pg_temp.penalize(lk, gen_random_uuid());
      t := t || 'KM-08 Chưa đăng nhập không gọi được'::text; r := r || 'FAIL gọi được'::text;
    exception when insufficient_privilege then
      t := t || 'KM-08 Chưa đăng nhập không gọi được'::text; r := r || 'PASS'::text;
    end;
    execute 'reset role';

    raise exception 'km_rollback';
  exception when raise_exception then
    if sqlerrm <> 'km_rollback' then
      raise;
    end if;
  end;

  execute 'reset role';
  t := t || 'T99 Dữ liệu thử đã được hoàn tác'::text;
  r := r || pg_temp.pass(not exists (select 1 from auth.users where id in (ua, ub)));
  return query select x.a, x.b from unnest(t, r) as x(a, b);
end;
$fn$;

select * from pg_temp.match_checks();
