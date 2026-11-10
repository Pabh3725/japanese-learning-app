-- =============================================================================
-- Design V9 gói 3 · Chính sách Kanji của từ. Kiểm tra trên database thật. Mọi dữ liệu thử bị HOÀN TÁC ở cuối.
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

-- Một từ thử của p_user đã xong Stage 3, chính sách cho sẵn. Trả learner_vocabulary.id.
create or replace function pg_temp.word(p_user uuid, p_code text, p_policy text, p_target smallint, p_level smallint)
returns uuid language plpgsql as $$
declare
  v uuid;
  lv uuid;
begin
  insert into public.vocabularies (code, sort_order, expression, reading_kana, meaning_vi, han_viet, is_kana_only, jlpt_level, kanji_policy, kanji_target_level)
  values (p_code, 999900 + right(p_code, 2)::int, '鑿' || right(p_code, 2), 'さく' || right(p_code, 2), 'từ thử ' || p_code, 'TẠC', false, p_level, p_policy, p_target)
  returning id into v;
  insert into public.learner_vocabulary (user_id, vocabulary_id, current_stage) values (p_user, v, 3) returning id into lv;
  insert into public.learner_stage_schedules (user_id, learner_vocabulary_id, stage_number, completed_at) values (p_user, lv, 3, now());
  return lv;
end;
$$;

create or replace function pg_temp.open(p_user uuid, p_lv uuid)
returns text language plpgsql as $$
declare
  v_res jsonb;
begin
  perform pg_temp.act_as(p_user);
  v_res := public.open_word_kanji(p_lv, now());
  execute 'reset role';
  return v_res->>'status';
end;
$$;

create or replace function pg_temp.policy_checks()
returns table (kiem_tra text, ket_qua text)
language plpgsql
as $fn$
declare
  t text[] := '{}';
  r text[] := '{}';
  ua uuid := gen_random_uuid();
  ub uuid := gen_random_uuid();
  core uuid;
  deferred uuid;
  optional uuid;
  legacy uuid;
  v_optional uuid;
  st text;
  n bigint;
begin
  begin
    insert into auth.users (id, email) values (ua, 'v9p-a@example.invalid'), (ub, 'v9p-b@example.invalid');

    t := t || 'Ràng buộc: KANJI_CORE phải có cấp đích, KANJI_OPTIONAL không được có'::text;
    begin
      insert into public.vocabularies (code, sort_order, expression, reading_kana, meaning_vi, han_viet, is_kana_only, jlpt_level, kanji_policy, kanji_target_level)
      values ('test-v9p-x1', 999890, '鑿x', 'さくx', 'x', 'TẠC', false, 5, 'KANJI_CORE', null);
      r := r || pg_temp.pass(false, 'chèn được CORE không có cấp');
    exception when check_violation then
      begin
        insert into public.vocabularies (code, sort_order, expression, reading_kana, meaning_vi, han_viet, is_kana_only, jlpt_level, kanji_policy, kanji_target_level)
        values ('test-v9p-x2', 999891, '鑿y', 'さくy', 'y', 'TẠC', false, 5, 'KANJI_OPTIONAL', 4);
        r := r || pg_temp.pass(false, 'chèn được OPTIONAL có cấp');
      exception when check_violation then
        r := r || pg_temp.pass(true);
      end;
    end;

    core     := pg_temp.word(ua, 'test-v9p-01', 'KANJI_CORE', 5::smallint, 5::smallint);
    deferred := pg_temp.word(ua, 'test-v9p-02', 'KANJI_DEFERRED', 4::smallint, 5::smallint);
    optional := pg_temp.word(ua, 'test-v9p-03', 'KANJI_OPTIONAL', null, 5::smallint);
    legacy   := pg_temp.word(ua, 'test-v9p-04', null, null, 4::smallint);
    select vocabulary_id into v_optional from public.learner_vocabulary where id = optional;

    st := pg_temp.open(ua, core);
    t := t || 'KANJI_CORE N5, người học ở N5: mở được Stage 5'::text;
    r := r || pg_temp.pass(st = 'saved' and exists (select 1 from public.learner_stage_schedules where learner_vocabulary_id = core and stage_number = 5), st);

    st := pg_temp.open(ua, deferred);
    t := t || 'KANJI_DEFERRED N4, người học ở N5: server từ chối, không có lịch Stage 5'::text;
    r := r || pg_temp.pass(st = 'not_allowed' and not exists (select 1 from public.learner_stage_schedules where learner_vocabulary_id = deferred and stage_number = 5), st);

    st := pg_temp.open(ua, optional);
    t := t || 'KANJI_OPTIONAL chưa bấm "Học dạng Kanji": server từ chối'::text;
    r := r || pg_temp.pass(st = 'not_allowed', st);

    st := pg_temp.open(ua, legacy);
    t := t || 'Chưa seed chính sách: theo cấp JLPT của từ (N4 khi người học ở N5 → từ chối)'::text;
    r := r || pg_temp.pass(st = 'not_allowed', st);

    -- Tài khoản B không bật được thay A, không đọc được lựa chọn của A
    perform pg_temp.act_as(ub);
    begin
      insert into public.learner_word_kanji_optins (user_id, vocabulary_id) values (ua, v_optional);
      r := r || pg_temp.pass(false, 'B bật được thay A');
    exception when insufficient_privilege then
      r := r || pg_temp.pass(true);
    end;
    t := t || 'Tài khoản khác không bật "Học dạng Kanji" thay A được'::text;
    execute 'reset role';

    perform pg_temp.act_as(ua);
    insert into public.learner_word_kanji_optins (vocabulary_id) values (v_optional);
    execute 'reset role';
    st := pg_temp.open(ua, optional);
    t := t || 'KANJI_OPTIONAL đã bấm "Học dạng Kanji": mở được Stage 5'::text;
    r := r || pg_temp.pass(st = 'saved', st);

    perform pg_temp.act_as(ub);
    select count(*) into n from public.learner_word_kanji_optins;
    execute 'reset role';
    t := t || 'Tài khoản khác không đọc được lựa chọn của A'::text;
    r := r || pg_temp.pass(n = 0, n::text);

    -- Bỏ chọn sau khi đã mở: Stage 5 không đóng lại, xem lại thẻ vẫn được
    perform pg_temp.act_as(ua);
    delete from public.learner_word_kanji_optins where vocabulary_id = v_optional;
    execute 'reset role';
    st := pg_temp.open(ua, optional);
    t := t || 'Bỏ "Học dạng Kanji" sau khi đã mở: Stage 5 giữ nguyên'::text;
    r := r || pg_temp.pass(st = 'saved' and exists (select 1 from public.learner_stage_schedules where learner_vocabulary_id = optional and stage_number = 5), st);

    -- Lên cấp N4 cho Từ vựng Kanji: từ KANJI_DEFERRED N4 mở được, tiến độ Stage 1–3 giữ nguyên
    perform pg_temp.act_as(ua);
    insert into public.learner_skill_levels (skill, jlpt_level) values ('word_kanji', 4);
    execute 'reset role';
    st := pg_temp.open(ua, deferred);
    t := t || 'Lên N4: từ KANJI_DEFERRED N4 mở Stage 5, Stage 3 vẫn hoàn tất'::text;
    r := r || pg_temp.pass(st = 'saved'
      and exists (select 1 from public.learner_stage_schedules where learner_vocabulary_id = deferred and stage_number = 3 and completed_at is not null), st);

    t := t || 'anon không đọc được bảng lựa chọn'::text;
    r := r || pg_temp.pass(not has_table_privilege('anon', 'public.learner_word_kanji_optins', 'select'));

    raise exception 'v9p_rollback';
  exception when raise_exception then
    if sqlerrm <> 'v9p_rollback' then raise; end if;
  end;
  execute 'reset role';
  t := t || 'T99 Dữ liệu thử đã được hoàn tác'::text;
  r := r || pg_temp.pass(not exists (select 1 from auth.users where id in (ua, ub)) and not exists (select 1 from public.vocabularies where code like 'test-v9p-%'));
  return query select x.a, x.b from unnest(t, r) as x(a, b);
end;
$fn$;

select * from pg_temp.policy_checks();
