-- =============================================================================
-- Design V9 gói 2 · 6 Stage. Kiểm tra trên database thật. Mọi dữ liệu thử bị HOÀN TÁC ở cuối.
-- Thay supabase/tests/path_v2_checks.sql.
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

-- Một câu Stage tối thiểu qua submit_stage_exercise, gọi với quyền của p_user.
create or replace function pg_temp.submit(p_user uuid, p_schedule uuid, p_unlocked smallint, p_open boolean, p_completed boolean)
returns jsonb language plpgsql as $$
declare
  v_version integer;
  v_res jsonb;
begin
  select version into v_version from public.learner_stage_schedules where id = p_schedule;
  perform pg_temp.act_as(p_user);
  v_res := public.submit_stage_exercise(
    p_schedule_id => p_schedule, p_client_event_id => gen_random_uuid(), p_expected_version => v_version,
    p_answered_at => now(), p_exercise_type => 'kana_to_meaning', p_outcome => 'correct', p_points => 1::smallint, p_counted => true,
    p_study_date => '2026-11-10'::date, p_day_seq => 1, p_response_time_ms => 500,
    p_stage_points => 10, p_stage_points_today => 1::smallint, p_points_date => '2026-11-10'::date,
    p_state => 2::smallint, p_due_at => now(), p_stability => 1, p_difficulty => 5, p_scheduled_days => 2,
    p_learning_steps => 0, p_reps => 1, p_lapses => 0, p_last_review_at => now(),
    p_unlocked_stage => p_unlocked, p_open_schedule => p_open, p_completed => p_completed,
    p_required_stages => array[2, 3]::smallint[],
    p_new_card_types => case when p_completed then array['vocab.kana']::public.card_type[] else '{}' end,
    p_new_cards_due_at => case when p_completed then now() + interval '1 day' end);
  execute 'reset role';
  return v_res;
end;
$$;

create or replace function pg_temp.v9_checks()
returns table (kiem_tra text, ket_qua text)
language plpgsql
as $fn$
declare
  t text[] := '{}';
  r text[] := '{}';
  ua uuid := gen_random_uuid();
  ub uuid := gen_random_uuid();
  v1 uuid;
  v2 uuid;
  lv uuid;
  lv2 uuid;
  s2 uuid;
  s3 uuid;
  s5 uuid;
  s6 uuid;
  res jsonb;
  n bigint;
begin
  begin
    insert into auth.users (id, email) values (ua, 'v9-a@example.invalid'), (ub, 'v9-b@example.invalid');
    insert into public.vocabularies (code, sort_order, expression, reading_kana, meaning_vi, han_viet, is_kana_only, jlpt_level)
    values ('test-v9-1', 999960, '鑿岩', 'さくがんきゅう', 'từ thử', 'TẠC NHAM', false, 5) returning id into v1;
    insert into public.vocabularies (code, sort_order, expression, reading_kana, meaning_vi, han_viet, is_kana_only, jlpt_level)
    values ('test-v9-2', 999961, '鑿井', 'さくせいきゅう', 'từ thử 2', 'TẠC TỈNH', false, 5) returning id into v2;
    insert into public.learner_vocabulary (user_id, vocabulary_id, current_stage) values (ua, v1, 2) returning id into lv;
    insert into public.learner_vocabulary (user_id, vocabulary_id, current_stage) values (ua, v2, 2) returning id into lv2;
    select id into s2 from public.learner_stage_schedules where learner_vocabulary_id = lv and stage_number = 2;

    -- Cờ và ràng buộc
    t := t || 'Migration đã đánh dấu cờ v9_six_stages'::text;
    r := r || pg_temp.pass(exists (select 1 from public.app_migration_flags where key = 'v9_six_stages'));

    t := t || 'Lịch Stage chỉ nhận 2, 3, 5, 6: Stage 4 (chỉ xem) bị từ chối'::text;
    begin
      insert into public.learner_stage_schedules (user_id, learner_vocabulary_id, stage_number) values (ua, lv, 4);
      r := r || pg_temp.pass(false, 'chèn được stage 4');
    exception when check_violation then
      r := r || pg_temp.pass(true);
    end;

    t := t || 'Người học không đọc được bảng cờ và không gọi được hàm đổi số'::text;
    perform pg_temp.act_as(ua);
    begin
      perform public.v9_renumber_stages(ua);
      r := r || pg_temp.pass(false, 'gọi được v9_renumber_stages');
    exception when insufficient_privilege then
      r := r || pg_temp.pass(true);
    end;
    execute 'reset role';

    -- Stage 2 mở Stage 3: tạo lịch, current_stage = 3
    res := pg_temp.submit(ua, s2, 3::smallint, true, false);
    select id into s3 from public.learner_stage_schedules where learner_vocabulary_id = lv and stage_number = 3;
    t := t || 'Stage 2 đạt mốc mở Stage 3: có lịch Stage 3, current_stage = 3'::text;
    r := r || pg_temp.pass(res->>'status' = 'saved' and s3 is not null
      and (select current_stage = 3 from public.learner_vocabulary where id = lv), res::text);

    -- Chưa xong Stage 3 thì chưa mở được Từ vựng Kanji
    perform pg_temp.act_as(ua);
    res := public.open_word_kanji(lv, now());
    execute 'reset role';
    t := t || 'Chưa xong Stage 3: mở thẻ Stage 4 trả not_ready, không có lịch Stage 5'::text;
    r := r || pg_temp.pass(res->>'status' = 'not_ready'
      and not exists (select 1 from public.learner_stage_schedules where learner_vocabulary_id = lv and stage_number = 5), res::text);

    -- Hoàn tất Stage 2 và Stage 3: từ xong nhánh Kana, có Card Kana
    update public.learner_stage_schedules set completed_at = now() where id = s2;
    res := pg_temp.submit(ua, s3, null, false, true);
    t := t || 'Hoàn tất Stage 3: từ xong nhánh Từ vựng Kana, có Card Kana'::text;
    r := r || pg_temp.pass(res->>'status' = 'saved' and (res->>'word_completed')::boolean
      and exists (select 1 from public.review_cards where learner_vocabulary_id = lv and card_type = 'vocab.kana')
      and (select learning_status = 'initial_complete' and stage5_completed_at is not null from public.learner_vocabulary where id = lv), res::text);

    -- Tài khoản khác
    perform pg_temp.act_as(ub);
    res := public.open_word_kanji(lv, now());
    execute 'reset role';
    t := t || 'Tài khoản khác không mở được Từ vựng Kanji của A'::text;
    r := r || pg_temp.pass(res->>'status' = 'not_found', res::text);

    -- Mở Stage 5 không cần học chữ thành phần (người học chưa có dòng learner_kanji nào)
    perform pg_temp.act_as(ua);
    res := public.open_word_kanji(lv, now());
    res := public.open_word_kanji(lv, now());
    execute 'reset role';
    t := t || 'Xong Stage 3, chưa học chữ nào: mở thẻ hai lần vẫn chỉ 1 lịch Stage 5, thấy Kanji từ lúc đó'::text;
    r := r || pg_temp.pass(res->>'status' = 'saved'
      and not exists (select 1 from public.learner_kanji where user_id = ua)
      and (select count(*) = 1 from public.learner_stage_schedules where learner_vocabulary_id = lv and stage_number = 5)
      and (select kanji_intro_seen_at is not null from public.learner_vocabulary where id = lv), res::text);

    -- Stage 5 mở Stage 6: current_stage vẫn 3
    select id into s5 from public.learner_stage_schedules where learner_vocabulary_id = lv and stage_number = 5;
    res := pg_temp.submit(ua, s5, 6::smallint, true, false);
    select id into s6 from public.learner_stage_schedules where learner_vocabulary_id = lv and stage_number = 6;
    t := t || 'Stage 5 mở Stage 6: có lịch Stage 6, current_stage vẫn 3'::text;
    r := r || pg_temp.pass(res->>'status' = 'saved' and s6 is not null
      and (select current_stage = 3 from public.learner_vocabulary where id = lv), res::text);

    -- Học lại Stage 6 không đưa từ về đang học ở nhánh Kana; học lại Stage 3 thì có
    update public.learner_stage_schedules set completed_at = now() where id = s6;
    perform pg_temp.act_as(ua);
    res := public.relearn_stage(s6, 7);
    execute 'reset role';
    t := t || 'Học lại Stage 6: nhánh Từ vựng Kana vẫn đã xong'::text;
    r := r || pg_temp.pass(res->>'status' = 'saved'
      and (select learning_status = 'initial_complete' from public.learner_vocabulary where id = lv), res::text);
    perform pg_temp.act_as(ua);
    res := public.relearn_stage(s3, 7);
    execute 'reset role';
    t := t || 'Học lại Stage 3: từ quay lại đang học, Card Kana giữ nguyên'::text;
    r := r || pg_temp.pass(res->>'status' = 'saved'
      and (select learning_status = 'learning' from public.learner_vocabulary where id = lv)
      and exists (select 1 from public.review_cards where learner_vocabulary_id = lv and card_type = 'vocab.kana'), res::text);

    -- Vòng ghép ô trừ điểm Stage 3 và ghi log stage 3
    perform pg_temp.act_as(ua);
    res := public.apply_match_penalties(array[s3], array[gen_random_uuid()], (-1)::smallint, '2026-11-10'::date, now());
    execute 'reset role';
    t := t || 'Vòng ghép ô: nhật ký trừ điểm ghi Stage 3'::text;
    r := r || pg_temp.pass(exists (select 1 from public.exercise_logs where learner_vocabulary_id = lv and source = 'match' and stage_number = 3), res::text);

    -- Đổi số dữ liệu kiểu v2: giả lập lại trạng thái trước migration rồi chạy hàm đổi số
    -- Chỉ đổi dữ liệu của tài khoản thử (p_only_user); bỏ từ lv vì đã mang số V9
    delete from public.learner_vocabulary where id = lv;
    delete from public.app_migration_flags where key = 'v9_six_stages';
    alter table public.learner_stage_schedules drop constraint learner_stage_schedules_stage_number_check;
    -- lv2: Stage 2 (6 điểm), Stage 5 kiểu v2 (= Kana, 4 điểm), Stage 4 kiểu v2 (= Kanji, 9 điểm)
    update public.learner_stage_schedules set stage_points = 6 where learner_vocabulary_id = lv2 and stage_number = 2;
    insert into public.learner_stage_schedules (user_id, learner_vocabulary_id, stage_number, stage_points) values (ua, lv2, 5, 4), (ua, lv2, 4, 9);
    insert into public.exercise_logs (user_id, learner_vocabulary_id, client_event_id, stage_number, exercise_type, outcome, points, counted, study_date, day_seq, answered_at)
    values (ua, lv2, gen_random_uuid(), 5, 'kana_free_recall', 'correct', 1, true, '2026-11-09', 1, now()),
           (ua, lv2, gen_random_uuid(), 4, 'kanji_assembly', 'correct', 1, true, '2026-11-09', 6, now());
    update public.learner_vocabulary set current_stage = 5 where id = lv2;
    select count(*) into n from public.exercise_logs where learner_vocabulary_id = lv2;

    res := public.v9_renumber_stages(ua);
    t := t || 'Đổi số v2 → V9: Stage 5 cũ thành 3, Stage 4 cũ thành 5, giữ điểm'::text;
    r := r || pg_temp.pass(res->>'status' = 'applied'
      and (select stage_points from public.learner_stage_schedules where learner_vocabulary_id = lv2 and stage_number = 2) = 6
      and (select stage_points from public.learner_stage_schedules where learner_vocabulary_id = lv2 and stage_number = 3) = 4
      and (select stage_points from public.learner_stage_schedules where learner_vocabulary_id = lv2 and stage_number = 5) = 9
      and not exists (select 1 from public.learner_stage_schedules where learner_vocabulary_id = lv2 and stage_number = 4), res::text);
    t := t || 'Đổi số v2 → V9: nhật ký đổi theo, không mất dòng; current_stage 5 thành 3'::text;
    r := r || pg_temp.pass(
      (select count(*) from public.exercise_logs where learner_vocabulary_id = lv2) = n
      and exists (select 1 from public.exercise_logs where learner_vocabulary_id = lv2 and exercise_type = 'kana_free_recall' and stage_number = 3)
      and exists (select 1 from public.exercise_logs where learner_vocabulary_id = lv2 and exercise_type = 'kanji_assembly' and stage_number = 5)
      and (select current_stage = 3 from public.learner_vocabulary where id = lv2));

    res := public.v9_renumber_stages(ua);
    t := t || 'Chạy lại hàm đổi số: không đổi gì thêm'::text;
    r := r || pg_temp.pass(res->>'status' = 'already_applied'
      and (select stage_points from public.learner_stage_schedules where learner_vocabulary_id = lv2 and stage_number = 3) = 4, res::text);

    raise exception 'v9_rollback';
  exception when raise_exception then
    if sqlerrm <> 'v9_rollback' then raise; end if;
  end;
  execute 'reset role';
  t := t || 'T99 Dữ liệu thử đã được hoàn tác, cờ và ràng buộc còn nguyên'::text;
  r := r || pg_temp.pass(not exists (select 1 from auth.users where id in (ua, ub))
    and not exists (select 1 from public.vocabularies where code like 'test-v9-%')
    and exists (select 1 from public.app_migration_flags where key = 'v9_six_stages')
    and exists (select 1 from pg_constraint where conname = 'learner_stage_schedules_stage_number_check'));
  return query select x.a, x.b from unnest(t, r) as x(a, b);
end;
$fn$;

select * from pg_temp.v9_checks();
