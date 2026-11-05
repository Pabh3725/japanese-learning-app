-- =============================================================================
-- SEC-03 · Test RLS với 2 tài khoản (gộp phần test query của TEST-01)
--
-- Cách chạy: Supabase Dashboard → SQL Editor → New query → dán TOÀN BỘ file → Run.
-- Cần chạy sau Migration 3 (DB-03) và Migration 4, 5 (SEC-03).
--
-- Cách hoạt động: script tạo 2 người dùng thử A và B, rồi "đóng vai" từng người
-- giống hệt request thật từ app:
--   set local role authenticated              → quyền của người đã đăng nhập
--   request.jwt.claims = {"sub": "<id>"}      → auth.uid() trả về id đó
-- Khi đóng vai, mọi lệnh đều đi qua RLS như từ trình duyệt.
--
-- PASS = database xử lý đúng như mong đợi.   FAIL = lỗ hổng, cần sửa.
-- An toàn: mọi dữ liệu thử bị HOÀN TÁC ở cuối (T99 kiểm tra lại).
-- =============================================================================


-- Mong lệnh bị chặn với đúng mã lỗi. 42501 = không đủ quyền / vi phạm RLS.
create or replace function pg_temp.expect_error(p_sql text, p_sqlstate text)
returns text
language plpgsql
as $$
begin
  execute p_sql;
  return 'FAIL — lệnh KHÔNG bị chặn';
exception when others then
  if sqlstate = p_sqlstate then
    return 'PASS';
  end if;
  return 'FAIL — bị chặn sai lý do: ' || sqlstate || ' ' || sqlerrm;
end;
$$;

-- Mong lệnh chạy được nhưng KHÔNG đụng dòng nào (RLS lọc mất dòng của người khác).
create or replace function pg_temp.expect_no_rows(p_sql text)
returns text
language plpgsql
as $$
declare n bigint;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return case when n = 0 then 'PASS' else 'FAIL — đụng tới ' || n || ' dòng' end;
exception when others then
  -- Bị từ chối hẳn (không có quyền) cũng là an toàn
  return case when sqlstate = '42501' then 'PASS' else 'FAIL — lỗi ' || sqlstate || ' ' || sqlerrm end;
end;
$$;

-- Đóng vai một người dùng (null = người chưa đăng nhập)
create or replace function pg_temp.act_as(p_user uuid)
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  if p_user is null then
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';
  else
    perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
  end if;
end;
$$;


create or replace function pg_temp.sec03_checks()
returns table (kiem_tra text, ket_qua text)
language plpgsql
as $fn$
declare
  t    text[] := '{}';
  r    text[] := '{}';
  ua   uuid := gen_random_uuid();   -- người dùng A
  ub   uuid := gen_random_uuid();   -- người dùng B
  v1   uuid;
  lv_a uuid; rc_a uuid; ps_a uuid;
  lv_b uuid; ls_b uuid; qi_b uuid; rc_b uuid; ps_b uuid;
  n    bigint;
  tbl  text;
  leaks text := '';
  user_tables text[] := array[
    'learner_settings', 'learner_vocabulary', 'learner_skill_progress', 'checkpoint_completions',
    'lesson_sessions', 'lesson_queue_items', 'lesson_attempts', 'xp_events',
    'review_cards', 'review_logs', 'practice_sessions', 'practice_attempts', 'exercise_logs'];
begin
  -- ===== Khối nháp: mọi thứ bên trong bị hoàn tác ở cuối =====
  begin

    -- ---------- Chuẩn bị (quyền admin) ----------
    insert into auth.users (id, email) values
      (ua, 'sec03-a@example.invalid'),
      (ub, 'sec03-b@example.invalid');

    insert into public.vocabularies (code, sort_order, expression, reading_kana, meaning_vi, is_kana_only, jlpt_level)
    values ('test-sec03', 999999, 'てすとご', 'てすとご', 'từ thử', true, 5)
    returning id into v1;

    -- ---------- B tự tạo dữ liệu của mình, qua RLS ----------
    perform pg_temp.act_as(ub);
    begin
      -- Có thể đã được trigger tạo sẵn khi thêm auth.users (AUTH-01) → không tạo trùng
      insert into public.learner_settings (user_id) values (ub) on conflict (user_id) do nothing;
      insert into public.learner_vocabulary (user_id, vocabulary_id) values (ub, v1) returning id into lv_b;
      insert into public.learner_skill_progress (learner_vocabulary_id, skill_code, user_id) values (lv_b, 'meaning', ub);
      insert into public.checkpoint_completions (user_id, learner_vocabulary_id, stage_number, checkpoint_code)
        values (ub, lv_b, 1, 'intro_viewed');
      insert into public.lesson_sessions (user_id) values (ub) returning id into ls_b;
      insert into public.lesson_queue_items (user_id, lesson_session_id, learner_vocabulary_id, position, stage_number, skill_code, exercise_type)
        values (ub, ls_b, lv_b, 0, 2, 'meaning', 'choice') returning id into qi_b;
      insert into public.lesson_attempts (user_id, lesson_queue_item_id, client_event_id, is_correct)
        values (ub, qi_b, gen_random_uuid(), true);
      insert into public.xp_events (user_id, lesson_session_id, client_event_id, points) values (ub, ls_b, gen_random_uuid(), 5);
      insert into public.review_cards (user_id, learner_vocabulary_id, card_type)
        values (ub, lv_b, 'vocab.meaning_kana') returning id into rc_b;
      insert into public.review_logs (user_id, review_card_id, client_event_id, rating, state_before, due_after, stability_after, difficulty_after)
        values (ub, rc_b, gen_random_uuid(), 3, 0, now(), 1.0, 5.0);
      insert into public.practice_sessions (user_id, game_code) values (ub, 'speed_matching') returning id into ps_b;
      insert into public.practice_attempts (user_id, practice_session_id, vocabulary_id, client_event_id, skill_code, is_correct)
        values (ub, ps_b, v1, gen_random_uuid(), 'meaning', true);
      insert into public.exercise_logs (user_id, learner_vocabulary_id, client_event_id, stage_number, exercise_type, outcome, points, counted, study_date, day_seq)
        values (ub, lv_b, gen_random_uuid(), 2, 'kana_to_meaning', 'correct', 1, true, current_date, 1);
      t := t || 'T00 B ghi được dữ liệu của chính mình ở cả 13 bảng'::text;  r := r || 'PASS'::text;
    exception when others then
      t := t || 'T00 B ghi được dữ liệu của chính mình ở cả 13 bảng'::text;  r := r || ('FAIL — ' || sqlerrm);
      raise exception 'sec03_rollback';   -- thiếu dữ liệu nền thì các test sau vô nghĩa
    end;

    -- ---------- A: dữ liệu của chính mình ----------
    perform pg_temp.act_as(ua);
    insert into public.learner_vocabulary (user_id, vocabulary_id) values (ua, v1) returning id into lv_a;
    insert into public.review_cards (user_id, learner_vocabulary_id, card_type)
      values (ua, lv_a, 'vocab.meaning_hanviet') returning id into rc_a;   -- khác loại card của B để T19 chỉ đo RLS

    -- ---------- A ĐỌC dữ liệu của B ----------
    foreach tbl in array user_tables loop
      execute format('select count(*) from public.%I where user_id = %L', tbl, ub) into n;
      if n > 0 then leaks := leaks || tbl || ' '; end if;
    end loop;
    t := t || 'T01 A không thấy dòng nào của B (13 bảng)'::text;
    r := r || (case when leaks = '' then 'PASS' else 'FAIL — thấy dữ liệu B ở: ' || leaks end);

    select count(*) into n from public.learner_vocabulary;
    t := t || 'T02 A chỉ thấy đúng dữ liệu của mình'::text;
    r := r || (case when n = 1 then 'PASS' else 'FAIL — thấy ' || n || ' dòng learner_vocabulary' end);

    -- ---------- A SỬA / XOÁ dữ liệu của B ----------
    t := t || 'T03 A sửa card của B (đề bài: "A gửi request sửa card của B")'::text;
    r := r || pg_temp.expect_no_rows(format('update public.review_cards set card_points = 999 where id = %L', rc_b));

    t := t || 'T04 A sửa settings của B'::text;
    r := r || pg_temp.expect_no_rows(format('update public.learner_settings set review_cap = 1 where user_id = %L', ub));

    t := t || 'T05 A sửa stage của B'::text;
    r := r || pg_temp.expect_no_rows(format('update public.learner_vocabulary set current_stage = 5 where id = %L', lv_b));

    t := t || 'T06 A xoá card của B'::text;
    r := r || pg_temp.expect_no_rows(format('delete from public.review_cards where id = %L', rc_b));

    t := t || 'T07 A xoá nhật ký ôn của B'::text;
    r := r || pg_temp.expect_no_rows(format('delete from public.review_logs where user_id = %L', ub));

    -- ---------- A GHI dữ liệu mang tên B ----------
    t := t || 'T08 A tạo dòng với user_id của B'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.practice_sessions (user_id, game_code) values (%L, 'speed_matching') $q$, ub), '42501');

    t := t || 'T09 A chuyển card của mình sang tên B'::text;
    r := r || pg_temp.expect_error(format(
      $q$ update public.review_cards set user_id = %L where id = %L $q$, ub, rc_a), '42501');

    -- ---------- A gắn dữ liệu (tên A) vào bản ghi CHA của B ----------
    -- RLS chỉ nhìn cột user_id; khoá ngoại thì không kiểm tra chủ sở hữu.
    -- Nếu lọt, A có thể chiếm chỗ (UNIQUE) khiến B không tạo được card / checkpoint.
    t := t || 'T10 A tạo card trên từ đang học của B'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.review_cards (user_id, learner_vocabulary_id, card_type) values (%L, %L, 'vocab.kana_hanviet') $q$,
      ua, lv_b), '42501');

    t := t || 'T11 A ghi checkpoint lên từ của B'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.checkpoint_completions (user_id, learner_vocabulary_id, stage_number, checkpoint_code)
          values (%L, %L, 2, 'kana_to_meaning') $q$, ua, lv_b), '42501');

    t := t || 'T12 A ghi skill progress lên từ của B'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.learner_skill_progress (learner_vocabulary_id, skill_code, user_id) values (%L, 'kana', %L) $q$,
      lv_b, ua), '42501');

    t := t || 'T13 A ghi exercise_logs lên từ của B'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.exercise_logs (user_id, learner_vocabulary_id, client_event_id, stage_number, exercise_type, outcome, points, counted, study_date, day_seq)
          values (%L, %L, gen_random_uuid(), 2, 'kana_to_meaning', 'wrong', -1, true, current_date, 1) $q$, ua, lv_b), '42501');

    t := t || 'T14 A ghi review log lên card của B'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.review_logs (user_id, review_card_id, client_event_id, rating, state_before, due_after, stability_after, difficulty_after)
          values (%L, %L, gen_random_uuid(), 1, 0, now(), 1.0, 5.0) $q$, ua, rc_b), '42501');

    t := t || 'T15 A thêm câu hỏi vào buổi học của B'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.lesson_queue_items (user_id, lesson_session_id, learner_vocabulary_id, position, stage_number, exercise_type)
          values (%L, %L, %L, 1, 2, 'choice') $q$, ua, ls_b, lv_a), '42501');

    t := t || 'T16 A trả lời câu hỏi của B'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.lesson_attempts (user_id, lesson_queue_item_id, client_event_id, is_correct)
          values (%L, %L, gen_random_uuid(), true) $q$, ua, qi_b), '42501');

    t := t || 'T17 A cộng XP vào buổi học của B'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.xp_events (user_id, lesson_session_id, client_event_id, points) values (%L, %L, gen_random_uuid(), 100) $q$,
      ua, ls_b), '42501');

    t := t || 'T18 A ghi lượt chơi vào phiên practice của B'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.practice_attempts (user_id, practice_session_id, vocabulary_id, client_event_id, skill_code, is_correct)
          values (%L, %L, %L, gen_random_uuid(), 'meaning', true) $q$, ua, ps_b, v1), '42501');

    t := t || 'T19 A dời card của mình sang từ của B'::text;
    r := r || pg_temp.expect_error(format(
      $q$ update public.review_cards set learner_vocabulary_id = %L where id = %L $q$, lv_b, rc_a), '42501');

    -- ---------- Bảng nội dung: chỉ đọc ----------
    select count(*) into n from public.vocabularies where id = v1;
    t := t || 'T20 Người đã đăng nhập đọc được từ điển'::text;
    r := r || (case when n = 1 then 'PASS' else 'FAIL — không đọc được' end);

    t := t || 'T21 Client thêm từ vào vocabularies'::text;
    r := r || pg_temp.expect_error(
      $q$ insert into public.vocabularies (code, sort_order, expression, reading_kana, meaning_vi, is_kana_only, jlpt_level)
          values ('test-sec03-x', 999998, 'ずる', 'ずる', 'gian lận', true, 5) $q$, '42501');

    t := t || 'T22 Client sửa nghĩa trong vocabularies'::text;
    r := r || pg_temp.expect_no_rows(format('update public.vocabularies set meaning_vi = %L where id = %L', 'bị sửa', v1));

    t := t || 'T23 Client thêm Kanji'::text;
    r := r || pg_temp.expect_error(
      $q$ insert into public.kanji (character, han_viet, meaning_vi) values ('鑿', 'TẠC', 'thử') $q$, '42501');

    t := t || 'T24 Client xoá liên kết vocabulary_kanji'::text;
    r := r || pg_temp.expect_no_rows('delete from public.vocabulary_kanji');

    -- ---------- Người chưa đăng nhập ----------
    perform pg_temp.act_as(null);
    t := t || 'T25 Chưa đăng nhập đọc từ điển'::text;
    r := r || pg_temp.expect_error('select count(*) from public.vocabularies', '42501');

    t := t || 'T26 Chưa đăng nhập đọc exercise_logs'::text;
    r := r || pg_temp.expect_error('select count(*) from public.exercise_logs', '42501');

    -- ---------- B kiểm tra dữ liệu của mình còn nguyên ----------
    perform pg_temp.act_as(ub);
    select count(*) into n from public.review_cards where id = rc_b and card_points = 0;
    t := t || 'T27 Card của B còn nguyên sau mọi thử nghiệm của A'::text;
    r := r || (case when n = 1 then 'PASS' else 'FAIL — card của B bị đổi hoặc mất' end);

    select count(*) into n from public.review_cards where learner_vocabulary_id = lv_b;
    t := t || 'T28 Không có card lạ nào gắn vào từ của B'::text;
    r := r || (case when n = 1 then 'PASS' else 'FAIL — có ' || n || ' card trên từ của B' end);

    -- ---------- Các chỗ vá ở Migration 5 ----------
    perform pg_temp.act_as(ua);
    insert into public.practice_sessions (user_id, game_code) values (ua, 'speed_matching') returning id into ps_a;
    t := t || 'T29 A gắn lượt chơi của mình vào card của B'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.practice_attempts (user_id, practice_session_id, vocabulary_id, review_card_id, client_event_id, skill_code, is_correct)
          values (%L, %L, %L, %L, gen_random_uuid(), 'meaning', true) $q$, ua, ps_a, v1, rc_b), '42501');

    t := t || 'T30 Client TRUNCATE bảng card của mình'::text;
    r := r || pg_temp.expect_error('truncate public.review_cards cascade', '42501');

    t := t || 'T31 Client TRUNCATE bảng từ điển'::text;
    r := r || pg_temp.expect_error('truncate public.vocabularies cascade', '42501');

    perform pg_temp.act_as(null);
    t := t || 'T32 Chưa đăng nhập đọc learner_vocabulary_exclusions'::text;
    r := r || pg_temp.expect_error('select count(*) from public.learner_vocabulary_exclusions', '42501');

    t := t || 'T33 Chưa đăng nhập đọc learner_daily_plans'::text;
    r := r || pg_temp.expect_error('select count(*) from public.learner_daily_plans', '42501');

    -- Kết thúc khối nháp: báo lỗi có chủ đích để hoàn tác TOÀN BỘ
    raise exception 'sec03_rollback';
  exception when raise_exception then
    if sqlerrm <> 'sec03_rollback' then
      raise;
    end if;
  end;

  execute 'reset role';
  t := t || 'T99 Dữ liệu thử đã được hoàn tác'::text;
  r := r || (case when not exists (select 1 from auth.users where id in (ua, ub))
                   and not exists (select 1 from public.vocabularies where code = 'test-sec03')
                  then 'PASS' else 'FAIL — còn sót dữ liệu thử' end);

  return query select x.a, x.b from unnest(t, r) as x(a, b);
end;
$fn$;


select * from pg_temp.sec03_checks();
