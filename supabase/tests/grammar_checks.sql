-- =============================================================================
-- Grammar G2 · Kiểm tra bảng ngữ pháp trên database thật (migration 20261116000001).
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

create or replace function pg_temp.grammar_checks()
returns table (kiem_tra text, ket_qua text)
language plpgsql
as $fn$
declare
  t    text[] := '{}';
  r    text[] := '{}';
  ua   uuid := gen_random_uuid();
  ub   uuid := gen_random_uuid();
  p_ok uuid;
  p_dr uuid;
  s_ok uuid;
  s_hd uuid;
  s_dr uuid;
  lg   uuid;
  n    bigint;
  tid  uuid;
begin
  begin
    insert into auth.users (id, email) values (ua, 'gr-a@example.invalid'), (ub, 'gr-b@example.invalid');
    insert into public.grammar_points (code, lesson, sort_order, pattern, meaning_vi, explanation, approved)
    values ('g50-98', 50, 98, 'TEST', 'thử', 'thử', true) returning id into p_ok;
    insert into public.grammar_points (code, lesson, sort_order, pattern, meaning_vi, explanation, approved)
    values ('g50-99', 50, 99, 'TEST', 'thử', 'thử', false) returning id into p_dr;
    insert into public.grammar_sentences (code, point_id, level, japanese, pieces, meaning_vi)
    values ('g50-98-s01', p_ok, 1, 'テスト', '[{"t":"テスト"}]', 'thử') returning id into s_ok;
    insert into public.grammar_sentences (code, point_id, level, japanese, pieces, meaning_vi, hidden)
    values ('g50-98-s02', p_ok, 1, 'テスト', '[{"t":"テスト"}]', 'thử', true) returning id into s_hd;
    insert into public.grammar_sentences (code, point_id, level, japanese, pieces, meaning_vi)
    values ('g50-99-s01', p_dr, 1, 'テスト', '[{"t":"テスト"}]', 'thử') returning id into s_dr;

    -- ---------- Nội dung ----------
    perform pg_temp.act_as(ua);
    t := t || 'GR-01 Người học chỉ thấy mẫu đã duyệt'::text;
    r := r || pg_temp.pass(exists (select 1 from public.grammar_points where id = p_ok) and not exists (select 1 from public.grammar_points where id = p_dr));
    t := t || 'GR-02 Không thấy câu bị ẩn hay câu của mẫu chưa duyệt'::text;
    r := r || pg_temp.pass(exists (select 1 from public.grammar_sentences where id = s_ok)
                           and not exists (select 1 from public.grammar_sentences where id in (s_hd, s_dr)));
    begin
      update public.grammar_points set pattern = 'x' where id = p_ok;
      get diagnostics n = row_count;
      t := t || 'GR-03 Người học không sửa được nội dung'::text; r := r || pg_temp.pass(n = 0, 'sửa được');
    exception when insufficient_privilege then
      t := t || 'GR-03 Người học không sửa được nội dung'::text; r := r || 'PASS'::text;
    end;

    -- ---------- Tiến độ ----------
    insert into public.learner_grammar (user_id, point_id) values (ua, p_ok) returning id into lg;
    t := t || 'GR-04 Xem thẻ tạo một dòng tiến độ (giai đoạn Học)'::text;
    r := r || pg_temp.pass((select phase from public.learner_grammar where id = lg) = 'learning');
    begin
      insert into public.learner_grammar (user_id, point_id) values (ua, p_ok);
      t := t || 'GR-05 Mỗi mẫu một dòng tiến độ'::text; r := r || 'FAIL thêm được dòng thứ hai'::text;
    exception when unique_violation then
      t := t || 'GR-05 Mỗi mẫu một dòng tiến độ'::text; r := r || 'PASS'::text;
    end;
    begin
      update public.learner_grammar set phase = 'review' where id = lg;
      t := t || 'GR-06 Sang giai đoạn Ôn phải có completed_at'::text; r := r || 'FAIL không chặn'::text;
    exception when check_violation then
      t := t || 'GR-06 Sang giai đoạn Ôn phải có completed_at'::text; r := r || 'PASS'::text;
    end;

    insert into public.grammar_logs (user_id, learner_grammar_id, point_id, sentence_id, client_event_id, mode, exercise_type, tier, outcome, points, study_date)
    values (ua, lg, p_ok, s_ok, gen_random_uuid(), 'learning', 'particle_choice', 1, 'correct', 1, current_date);
    insert into public.grammar_logs (user_id, point_id, sentence_id, client_event_id, mode, exercise_type, outcome, study_date)
    values (ua, p_ok, s_ok, gen_random_uuid(), 'practice', 'order', 'wrong', current_date);
    t := t || 'GR-07 Ghi nhật ký Học và Luyện thêm'::text;
    r := r || pg_temp.pass((select count(*) from public.grammar_logs where user_id = ua) = 2);
    begin
      insert into public.grammar_logs (user_id, learner_grammar_id, point_id, sentence_id, client_event_id, mode, exercise_type, outcome, points, study_date)
      values (ua, lg, p_ok, s_ok, gen_random_uuid(), 'practice', 'order', 'correct', 1, current_date);
      t := t || 'GR-08 Chỉ câu Học có điểm'::text; r := r || 'FAIL Luyện thêm có điểm'::text;
    exception when check_violation then
      t := t || 'GR-08 Chỉ câu Học có điểm'::text; r := r || 'PASS'::text;
    end;
    begin
      insert into public.grammar_logs (user_id, point_id, sentence_id, client_event_id, mode, exercise_type, outcome, study_date)
      values (ua, p_ok, s_ok, gen_random_uuid(), 'review', 'order', 'correct', current_date);
      t := t || 'GR-09 Câu Học/Ôn phải gắn tiến độ'::text; r := r || 'FAIL không chặn'::text;
    exception when check_violation then
      t := t || 'GR-09 Câu Học/Ôn phải gắn tiến độ'::text; r := r || 'PASS'::text;
    end;
    begin
      update public.grammar_logs set outcome = 'correct' where user_id = ua;
      get diagnostics n = row_count;
      t := t || 'GR-10 Nhật ký chỉ thêm, không sửa'::text; r := r || pg_temp.pass(n = 0, 'sửa được');
    exception when insufficient_privilege then
      t := t || 'GR-10 Nhật ký chỉ thêm, không sửa'::text; r := r || 'PASS'::text;
    end;

    insert into public.grammar_tests (user_id, lessons, question_count, questions) values (ua, '{1,2}', 10, '[]') returning id into tid;
    begin
      update public.grammar_tests set status = 'finished' where id = tid;
      t := t || 'GR-11 Bài kiểm tra xong phải có điểm và giờ nộp'::text; r := r || 'FAIL không chặn'::text;
    exception when check_violation then
      t := t || 'GR-11 Bài kiểm tra xong phải có điểm và giờ nộp'::text; r := r || 'PASS'::text;
    end;
    execute 'reset role';

    -- ---------- Tách biệt tài khoản ----------
    perform pg_temp.act_as(ub);
    t := t || 'GR-12 Người khác không thấy tiến độ, nhật ký, bài kiểm tra'::text;
    r := r || pg_temp.pass(not exists (select 1 from public.learner_grammar where id = lg)
                           and not exists (select 1 from public.grammar_logs where user_id = ua)
                           and not exists (select 1 from public.grammar_tests where id = tid));
    begin
      insert into public.grammar_logs (user_id, learner_grammar_id, point_id, sentence_id, client_event_id, mode, exercise_type, outcome, points, study_date)
      values (ub, lg, p_ok, s_ok, gen_random_uuid(), 'learning', 'order', 'correct', 1, current_date);
      t := t || 'GR-13 Không ghi nhật ký vào tiến độ của người khác'::text; r := r || 'FAIL ghi được'::text;
    exception when insufficient_privilege then
      t := t || 'GR-13 Không ghi nhật ký vào tiến độ của người khác'::text; r := r || 'PASS'::text;
    end;
    execute 'reset role';

    -- ---------- Cài đặt mặc định ----------
    t := t || 'GR-14 Cài đặt mặc định: 1 mẫu mới, ôn 20 mẫu, bật furigana'::text;
    r := r || pg_temp.pass(exists (select 1 from public.learner_settings where user_id = ua and grammar_new_per_day = 1 and grammar_review_cap = 20 and grammar_furigana));

    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    execute 'set local role anon';
    begin
      select count(*) into n from public.grammar_points;
      t := t || 'GR-15 Chưa đăng nhập không đọc được nội dung'::text; r := r || 'FAIL đọc được'::text;
    exception when insufficient_privilege then
      t := t || 'GR-15 Chưa đăng nhập không đọc được nội dung'::text; r := r || 'PASS'::text;
    end;
    execute 'reset role';

    raise exception 'gr_rollback';
  exception when raise_exception then
    if sqlerrm <> 'gr_rollback' then
      raise;
    end if;
  end;

  execute 'reset role';
  t := t || 'T99 Dữ liệu thử đã được hoàn tác'::text;
  r := r || pg_temp.pass(not exists (select 1 from auth.users where id in (ua, ub)) and not exists (select 1 from public.grammar_points where code in ('g50-98', 'g50-99')));
  return query select x.a, x.b from unnest(t, r) as x(a, b);
end;
$fn$;

select * from pg_temp.grammar_checks();
