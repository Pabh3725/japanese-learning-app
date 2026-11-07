-- =============================================================================
-- KJ-02 · Kiểm tra khu Kanji trên database thật.
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

create or replace function pg_temp.submit(p_lk uuid, p_event uuid, p_version integer, p_phase text, p_points integer, p_completed boolean, p_scheduled integer, p_due timestamptz)
returns jsonb
language sql
as $$
  select public.submit_kanji_answer(
    p_lk, p_event, p_version, now(), 'kanji_to_meaning', 'correct', 1::smallint, '2026-11-07'::date, 500,
    p_phase, p_points, 1::smallint, '2026-11-07'::date, 2::smallint, p_due, 1.0::double precision, 5.0::double precision,
    p_scheduled, 0, 1, 0, now(), p_completed)
$$;

create or replace function pg_temp.kanji_checks()
returns table (kiem_tra text, ket_qua text)
language plpgsql
as $fn$
declare
  t   text[] := '{}';
  r   text[] := '{}';
  ua  uuid := gen_random_uuid();
  ub  uuid := gen_random_uuid();
  k1  uuid;
  v1  uuid;
  lv  uuid;
  lk  uuid;
  ev  uuid := gen_random_uuid();
  res jsonb;
  n   bigint;
  vocab_before text;
begin
  begin
    insert into auth.users (id, email) values (ua, 'kj-a@example.invalid'), (ub, 'kj-b@example.invalid');
    select id into k1 from public.kanji where character = '学';
    insert into public.vocabularies (code, sort_order, expression, reading_kana, meaning_vi, is_kana_only, jlpt_level)
    values ('test-kj-1', 999980, 'てすとかんじ', 'てすとかんじ', 'từ thử', true, 5) returning id into v1;
    insert into public.learner_vocabulary (user_id, vocabulary_id, current_stage) values (ua, v1, 2) returning id into lv;
    -- Trigger đã tạo sẵn lịch Stage 2 khi thêm từ
    update public.learner_stage_schedules set stage_points = 4 where learner_vocabulary_id = lv and stage_number = 2;
    vocab_before := (select concat_ws('|', lv2.current_stage, lv2.version, s.stage_points, s.due_at, s.version)
                       from public.learner_vocabulary lv2 join public.learner_stage_schedules s on s.learner_vocabulary_id = lv2.id where lv2.id = lv);

    -- ---------- Xem thẻ tạo đúng một lịch ----------
    perform pg_temp.act_as(ua);
    insert into public.learner_kanji (user_id, kanji_id) values (ua, k1) on conflict (user_id, kanji_id) do nothing returning id into lk;
    insert into public.learner_kanji (user_id, kanji_id) values (ua, k1) on conflict (user_id, kanji_id) do nothing;
    select count(*) into n from public.learner_kanji where user_id = ua;
    execute 'reset role';
    t := t || 'KJ-02 Xem thẻ hai lần vẫn chỉ tạo 1 lịch'::text;
    r := r || pg_temp.pass(n = 1, n::text);
    t := t || 'KJ-02 Chữ mới ở giai đoạn Học, câu đầu đến hẹn ngay'::text;
    r := r || pg_temp.pass((select phase = 'learning' and due_at <= now() and points = 0 from public.learner_kanji where id = lk));

    -- ---------- Lưu câu ----------
    perform pg_temp.act_as(ua);
    res := pg_temp.submit(lk, ev, 0, 'learning', 1, false, 2, now() + interval '2 days');
    execute 'reset role';
    t := t || 'KJ-02 Lưu câu: điểm, lịch và nhật ký cùng cập nhật'::text;
    r := r || pg_temp.pass(
      res->>'status' = 'saved'
      and (select points = 1 and scheduled_days = 2 and version = 1 from public.learner_kanji where id = lk)
      and (select count(*) = 1 from public.kanji_logs where learner_kanji_id = lk), res::text);

    perform pg_temp.act_as(ua);
    res := pg_temp.submit(lk, ev, 1, 'learning', 2, false, 2, now() + interval '2 days');
    execute 'reset role';
    t := t || 'KJ-02 Gửi trùng không áp dụng 2 lần'::text;
    r := r || pg_temp.pass(
      res->>'status' = 'duplicate'
      and (select points = 1 from public.learner_kanji where id = lk)
      and (select count(*) = 1 from public.kanji_logs where learner_kanji_id = lk), res::text);

    perform pg_temp.act_as(ua);
    res := pg_temp.submit(lk, gen_random_uuid(), 99, 'learning', 2, false, 2, now());
    execute 'reset role';
    t := t || 'KJ-02 Sai version thì báo conflict, không đổi gì'::text;
    r := r || pg_temp.pass(res->>'status' = 'conflict' and (select points = 1 from public.learner_kanji where id = lk), res::text);

    begin
      perform pg_temp.act_as(ua);
      res := pg_temp.submit(lk, gen_random_uuid(), 1, 'learning', 2, false, 5, now());
      execute 'reset role';
      t := t || 'KJ-02 Giai đoạn Học không được hẹn quá 2 ngày'::text; r := r || 'FAIL lệnh không bị chặn'::text;
    exception when check_violation then
      execute 'reset role';
      t := t || 'KJ-02 Giai đoạn Học không được hẹn quá 2 ngày'::text; r := r || 'PASS'::text;
    end;

    -- ---------- Hoàn tất Học, sang Ôn dài hạn ----------
    perform pg_temp.act_as(ua);
    res := pg_temp.submit(lk, gen_random_uuid(), 1, 'review', 6, true, 0, now() + interval '1 day');
    execute 'reset role';
    t := t || 'KJ-02 Hoàn tất thì sang Ôn dài hạn'::text;
    r := r || pg_temp.pass(
      res->>'status' = 'saved'
      and (select phase = 'review' and completed_at is not null from public.learner_kanji where id = lk)
      -- Câu vừa lưu vẫn thuộc giai đoạn Học trong nhật ký
      and (select phase = 'learning' from public.kanji_logs where learner_kanji_id = lk order by answered_at desc limit 1), res::text);

    perform pg_temp.act_as(ua);
    res := pg_temp.submit(lk, gen_random_uuid(), 2, 'review', 6, false, 400, now() + interval '400 days');
    execute 'reset role';
    t := t || 'KJ-02 Ôn dài hạn được hẹn xa hơn 2 ngày'::text;
    r := r || pg_temp.pass(res->>'status' = 'saved' and (select scheduled_days = 400 from public.learner_kanji where id = lk), res::text);

    -- ---------- KJ-04: không đụng tiến độ từ vựng ----------
    t := t || 'KJ-04 Học Kanji không đổi tiến độ và lịch của từ vựng'::text;
    r := r || pg_temp.pass(vocab_before = (select concat_ws('|', lv2.current_stage, lv2.version, s.stage_points, s.due_at, s.version)
                       from public.learner_vocabulary lv2 join public.learner_stage_schedules s on s.learner_vocabulary_id = lv2.id where lv2.id = lv));
    t := t || 'KJ-04 Học Kanji không ghi vào log Learn và Review'::text;
    r := r || pg_temp.pass(not exists (select 1 from public.exercise_logs where user_id = ua) and not exists (select 1 from public.review_logs where user_id = ua));

    -- ---------- Hai tài khoản ----------
    perform pg_temp.act_as(ub);
    select count(*) into n from public.learner_kanji; t := t || 'KJ-02 B không đọc được lịch Kanji của A'::text; r := r || pg_temp.pass(n = 0, n::text);
    select count(*) into n from public.kanji_logs; t := t || 'KJ-02 B không đọc được nhật ký Kanji của A'::text; r := r || pg_temp.pass(n = 0, n::text);
    res := pg_temp.submit(lk, gen_random_uuid(), 3, 'review', 100, false, 1, now());
    t := t || 'KJ-02 B không ghi được câu vào lịch của A'::text; r := r || pg_temp.pass(res->>'status' = 'not_found', res::text);
    update public.learner_kanji set points = 100 where id = lk;
    begin
      insert into public.learner_kanji (user_id, kanji_id) values (ua, (select id from public.kanji where character = '校'));
      t := t || 'KJ-02 B không tạo lịch thay A được'::text; r := r || 'FAIL lệnh không bị chặn'::text;
    exception when insufficient_privilege then
      t := t || 'KJ-02 B không tạo lịch thay A được'::text; r := r || 'PASS'::text;
    end;
    execute 'reset role';
    t := t || 'KJ-02 B không sửa được điểm của A'::text;
    r := r || pg_temp.pass((select points = 6 from public.learner_kanji where id = lk));

    -- ---------- Đã biết chữ này ----------
    perform pg_temp.act_as(ua);
    insert into public.learner_kanji_exclusions (user_id, kanji_id) values (ua, k1);
    execute 'reset role';
    perform pg_temp.act_as(ub);
    select count(*) into n from public.learner_kanji_exclusions; t := t || 'KJ-02 B không đọc được chữ A đã bỏ qua'::text; r := r || pg_temp.pass(n = 0, n::text);
    delete from public.learner_kanji_exclusions where user_id = ua;
    execute 'reset role';
    t := t || 'KJ-02 B không khôi phục thay A được'::text;
    r := r || pg_temp.pass(exists (select 1 from public.learner_kanji_exclusions where user_id = ua));
    perform pg_temp.act_as(ua);
    delete from public.learner_kanji_exclusions where kanji_id = k1;
    execute 'reset role';
    t := t || 'KJ-02 Khôi phục thì điểm và lịch còn nguyên'::text;
    r := r || pg_temp.pass(not exists (select 1 from public.learner_kanji_exclusions where user_id = ua) and (select points = 6 from public.learner_kanji where id = lk));
    t := t || 'KJ-02 Mặc định mới: 10 chữ, 100 câu'::text;
    r := r || pg_temp.pass((select kanji_new_per_day = 10 and kanji_cap = 100 from public.learner_settings where user_id = ua));

    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';
    begin
      select count(*) into n from public.learner_kanji;
      t := t || 'KJ-02 Chưa đăng nhập không đọc được lịch Kanji'::text; r := r || 'FAIL đọc được'::text;
    exception when insufficient_privilege then
      t := t || 'KJ-02 Chưa đăng nhập không đọc được lịch Kanji'::text; r := r || 'PASS'::text;
    end;
    execute 'reset role';

    raise exception 'kj_rollback';
  exception when raise_exception then
    if sqlerrm <> 'kj_rollback' then
      raise;
    end if;
  end;

  execute 'reset role';
  t := t || 'T99 Dữ liệu thử đã được hoàn tác'::text;
  r := r || pg_temp.pass(not exists (select 1 from auth.users where id in (ua, ub)) and not exists (select 1 from public.vocabularies where code = 'test-kj-1'));
  return query select x.a, x.b from unnest(t, r) as x(a, b);
end;
$fn$;

select * from pg_temp.kanji_checks();
