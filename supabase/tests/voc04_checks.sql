-- =============================================================================
-- VOC-04 · Kiểm tra hàm submit_exercise
-- Chạy SAU migration 20261105000002_voc04_submit_exercise.sql.
--
-- Cách chạy: Supabase Dashboard → SQL Editor → New query → dán toàn bộ file → Run.
-- PASS = đúng như mong đợi. FAIL = có lỗi, báo lại.
-- An toàn: mọi dữ liệu thử bị HOÀN TÁC ở cuối, database không còn dòng nào.
--
-- Kịch bản: từ thử ở Stage 4, đã có 2 card (meaning_kana, kana_hanviet) với hạn cố định.
-- Trả lời vài câu → qua Stage 4 → qua Stage 5. Kiểm tra từng bước.
-- Điểm/stage truyền vào đây là con số engine ENG-02 sẽ tính ra; test này chỉ kiểm
-- phần LƯU (đúng chỗ, đủ, một lần, không đụng card cũ), không kiểm luật.
-- =============================================================================

create or replace function pg_temp.voc04_checks()
returns table (kiem_tra text, ket_qua text)
language plpgsql
as $fn$
declare
  t      text[] := '{}';
  r      text[] := '{}';
  u1     uuid := gen_random_uuid();   -- người học
  u2     uuid := gen_random_uuid();   -- người khác
  v1     uuid;
  lv     uuid;
  c_old1 uuid;
  c_old2 uuid;
  ev1    uuid := gen_random_uuid();
  res    jsonb;
  n      integer;
  pts    integer;
  ver    integer;
  stg    smallint;
  st     text;
  now_   timestamptz := '2026-11-05 20:00+07';
  old_due  timestamptz := '2026-11-07 00:00+07';
  next_day timestamptz := '2026-11-06 00:00+07';
begin
  begin
    -- ---------- Dữ liệu chuẩn bị (quyền admin) ----------
    insert into auth.users (id, email) values
      (u1, 'voc04-a@example.invalid'), (u2, 'voc04-b@example.invalid');

    insert into public.vocabularies (code, sort_order, expression, reading_kana, meaning_vi, han_viet, is_kana_only, jlpt_level)
    values ('test-voc04', 999997, '鑿岩', 'さくがんてすと', 'từ thử VOC-04', 'TẠC NHAM', false, 5)
    returning id into v1;

    insert into public.learner_vocabulary (user_id, vocabulary_id, current_stage, stage_points)
    values (u1, v1, 4, 4) returning id into lv;

    -- 2 card đã có từ Stage 2 và 3, hạn cố định để kiểm "không đụng due_at"
    insert into public.review_cards (user_id, learner_vocabulary_id, card_type, due_at)
    values (u1, lv, 'vocab.meaning_kana', old_due) returning id into c_old1;
    insert into public.review_cards (user_id, learner_vocabulary_id, card_type, due_at)
    values (u1, lv, 'vocab.kana_hanviet', old_due) returning id into c_old2;

    -- ---------- Đóng vai u1 đã đăng nhập ----------
    perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u1::text, true);
    perform set_config('role', 'authenticated', true);

    -- T01: một câu đúng, được tính → +1, chưa qua stage (4 → 5 điểm, thiếu dạng bắt buộc)
    res := public.submit_exercise(
      p_learner_vocabulary_id => lv, p_client_event_id => ev1, p_expected_version => 0, p_answered_at => now_,
      p_stage_number => 4::smallint, p_exercise_type => 'kanji_recognition', p_outcome => 'correct',
      p_points => 1::smallint, p_counted => true, p_study_date => '2026-11-05', p_day_seq => 10,
      p_new_stage => 4::smallint, p_completed => false,
      p_stage_points => 5, p_stage_points_today => 1::smallint, p_points_date => '2026-11-05',
      p_response_time_ms => 1800);
    select count(*) into n from public.exercise_logs where learner_vocabulary_id = lv;
    select stage_points, version into pts, ver from public.learner_vocabulary where id = lv;
    t := t || 'T01 Lưu lần đầu → saved, 1 nhật ký, điểm 5, version 1'::text;
    r := r || (case when res->>'status' = 'saved' and n = 1 and pts = 5 and ver = 1
                    then 'PASS' else 'FAIL — ' || res::text || ' logs=' || n || ' pts=' || pts || ' ver=' || ver end);

    -- T02: gửi lại CÙNG mã (bấm 2 lần / mạng gửi lại)
    res := public.submit_exercise(
      p_learner_vocabulary_id => lv, p_client_event_id => ev1, p_expected_version => 1, p_answered_at => now_,
      p_stage_number => 4::smallint, p_exercise_type => 'kanji_recognition', p_outcome => 'correct',
      p_points => 1::smallint, p_counted => true, p_study_date => '2026-11-05', p_day_seq => 10,
      p_new_stage => 4::smallint, p_completed => false,
      p_stage_points => 6, p_stage_points_today => 2::smallint, p_points_date => '2026-11-05');
    select count(*) into n from public.exercise_logs where learner_vocabulary_id = lv;
    select stage_points, version into pts, ver from public.learner_vocabulary where id = lv;
    t := t || 'T02 Gửi lại cùng mã → duplicate, vẫn 1 nhật ký, điểm vẫn 5 (NGHIỆM THU: không cộng 2 lần)'::text;
    r := r || (case when res->>'status' = 'duplicate' and n = 1 and pts = 5 and ver = 1
                    then 'PASS' else 'FAIL — ' || res::text || ' logs=' || n || ' pts=' || pts || ' ver=' || ver end);

    -- T03: version cũ (máy thứ 2 đọc từ trước khi máy 1 lưu)
    res := public.submit_exercise(
      p_learner_vocabulary_id => lv, p_client_event_id => gen_random_uuid(), p_expected_version => 0, p_answered_at => now_,
      p_stage_number => 4::smallint, p_exercise_type => 'kanji_assembly', p_outcome => 'correct',
      p_points => 1::smallint, p_counted => true, p_study_date => '2026-11-05', p_day_seq => 11,
      p_new_stage => 4::smallint, p_completed => false,
      p_stage_points => 5, p_stage_points_today => 1::smallint, p_points_date => '2026-11-05');
    select count(*) into n from public.exercise_logs where learner_vocabulary_id = lv;
    select stage_points into pts from public.learner_vocabulary where id = lv;
    t := t || 'T03 Version cũ → conflict, không ghi nhật ký, điểm giữ nguyên'::text;
    r := r || (case when res->>'status' = 'conflict' and n = 1 and pts = 5
                    then 'PASS' else 'FAIL — ' || res::text || ' logs=' || n || ' pts=' || pts end);

    -- T04: tất cả hoặc không gì cả — nhật ký sai luật (không tính mà có điểm) bị bảng từ chối
    --      → lệnh cập nhật điểm phía trước cũng phải bị hoàn tác
    begin
      res := public.submit_exercise(
        p_learner_vocabulary_id => lv, p_client_event_id => gen_random_uuid(), p_expected_version => 1, p_answered_at => now_,
        p_stage_number => 4::smallint, p_exercise_type => 'kanji_assembly', p_outcome => 'correct',
        p_points => 1::smallint, p_counted => false, p_study_date => '2026-11-05', p_day_seq => 12,
        p_new_stage => 4::smallint, p_completed => false,
        p_stage_points => 99, p_stage_points_today => 2::smallint, p_points_date => '2026-11-05');
    exception when check_violation then null;
    end;
    select stage_points, version into pts, ver from public.learner_vocabulary where id = lv;
    t := t || 'T04 Ghi nhật ký lỗi → điểm và version KHÔNG đổi (một transaction)'::text;
    r := r || (case when pts = 5 and ver = 1 then 'PASS' else 'FAIL — pts=' || pts || ' ver=' || ver end);

    -- T05: qua Stage 4 → sang Stage 5, điểm về 0, tạo 2 card Stage 4
    res := public.submit_exercise(
      p_learner_vocabulary_id => lv, p_client_event_id => gen_random_uuid(), p_expected_version => 1, p_answered_at => now_,
      p_stage_number => 4::smallint, p_exercise_type => 'hanviet_assembly', p_outcome => 'correct',
      p_points => 1::smallint, p_counted => true, p_study_date => '2026-11-05', p_day_seq => 16,
      p_new_stage => 5::smallint, p_completed => false,
      p_stage_points => 0, p_stage_points_today => 0::smallint, p_points_date => null,
      p_new_card_types => array['vocab.meaning_kanji', 'vocab.kanji_meaning_hanviet']::public.card_type[],
      p_new_cards_due_at => next_day);
    select current_stage, stage_points into stg, pts from public.learner_vocabulary where id = lv;
    select count(*) into n from public.review_cards where learner_vocabulary_id = lv;
    t := t || 'T05 Qua stage → Stage 5, điểm 0, tạo đúng 2 card (tổng 4)'::text;
    r := r || (case when res->>'status' = 'saved' and (res->>'cards_created')::int = 2 and stg = 5 and pts = 0 and n = 4
                    then 'PASS' else 'FAIL — ' || res::text || ' stage=' || stg || ' pts=' || pts || ' cards=' || n end);

    -- T06: card cũ giữ nguyên hạn
    select count(*) into n from public.review_cards
     where id in (c_old1, c_old2) and due_at = old_due and version = 0 and card_points = 0;
    t := t || 'T06 Card cũ KHÔNG bị đụng: due_at, version, điểm giữ nguyên (NGHIỆM THU)'::text;
    r := r || (case when n = 2 then 'PASS' else 'FAIL — chỉ ' || n || '/2 card cũ còn nguyên' end);

    -- T07: card mới là card "New", hạn 00:00 ngày học hôm sau
    select count(*) into n from public.review_cards
     where learner_vocabulary_id = lv and card_type in ('vocab.meaning_kanji', 'vocab.kanji_meaning_hanviet')
       and state = 0 and due_at = next_day and card_points = 0 and retired_at is null and user_id = u1;
    t := t || 'T07 Card mới: trạng thái New, hạn 00:00 hôm sau, điểm 0'::text;
    r := r || (case when n = 2 then 'PASS' else 'FAIL — chỉ ' || n || '/2 card mới đúng' end);

    -- T08: câu trả lời đến muộn cho Stage 4 (từ đã sang Stage 5)
    res := public.submit_exercise(
      p_learner_vocabulary_id => lv, p_client_event_id => gen_random_uuid(), p_expected_version => 2, p_answered_at => now_,
      p_stage_number => 4::smallint, p_exercise_type => 'kanji_assembly', p_outcome => 'correct',
      p_points => 1::smallint, p_counted => true, p_study_date => '2026-11-05', p_day_seq => 17,
      p_new_stage => 4::smallint, p_completed => false,
      p_stage_points => 1, p_stage_points_today => 1::smallint, p_points_date => '2026-11-05');
    t := t || 'T08 Trả lời cho stage cũ → stage_changed, không ghi'::text;
    r := r || (case when res->>'status' = 'stage_changed' then 'PASS' else 'FAIL — ' || res::text end);

    -- T09: qua Stage 5 → hoàn thành; card trùng loại được bỏ qua (idempotent)
    res := public.submit_exercise(
      p_learner_vocabulary_id => lv, p_client_event_id => gen_random_uuid(), p_expected_version => 2, p_answered_at => now_,
      p_stage_number => 5::smallint, p_exercise_type => 'hanviet_free_recall', p_outcome => 'correct',
      p_points => 1::smallint, p_counted => true, p_study_date => '2026-11-05', p_day_seq => 22,
      p_new_stage => 5::smallint, p_completed => true,
      p_stage_points => 0, p_stage_points_today => 0::smallint, p_points_date => null,
      p_new_card_types => array['vocab.meaning_hanviet', 'vocab.meaning_kanji']::public.card_type[],
      p_new_cards_due_at => next_day);
    select learning_status into st from public.learner_vocabulary where id = lv and stage5_completed_at is not null;
    select count(*) into n from public.review_cards where learner_vocabulary_id = lv;
    t := t || 'T09 Qua Stage 5 → initial_complete; card đã có không tạo lại (tổng 5)'::text;
    r := r || (case when res->>'status' = 'saved' and (res->>'cards_created')::int = 1 and st = 'initial_complete' and n = 5
                    then 'PASS' else 'FAIL — ' || res::text || ' status=' || coalesce(st, 'null') || ' cards=' || n end);

    -- T10: từ đã hoàn thành không nhận thêm câu học
    res := public.submit_exercise(
      p_learner_vocabulary_id => lv, p_client_event_id => gen_random_uuid(), p_expected_version => 3, p_answered_at => now_,
      p_stage_number => 5::smallint, p_exercise_type => 'kana_free_recall', p_outcome => 'correct',
      p_points => 1::smallint, p_counted => true, p_study_date => '2026-11-05', p_day_seq => 30,
      p_new_stage => 5::smallint, p_completed => false,
      p_stage_points => 1, p_stage_points_today => 1::smallint, p_points_date => '2026-11-05');
    t := t || 'T10 Từ đã hoàn thành → stage_changed'::text;
    r := r || (case when res->>'status' = 'stage_changed' then 'PASS' else 'FAIL — ' || res::text end);

    -- ---------- Đóng vai u2 (người khác) ----------
    perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u2::text, true);
    res := public.submit_exercise(
      p_learner_vocabulary_id => lv, p_client_event_id => gen_random_uuid(), p_expected_version => 3, p_answered_at => now_,
      p_stage_number => 5::smallint, p_exercise_type => 'kana_free_recall', p_outcome => 'wrong',
      p_points => -1::smallint, p_counted => true, p_study_date => '2026-11-05', p_day_seq => 1,
      p_new_stage => 5::smallint, p_completed => false,
      p_stage_points => -1, p_stage_points_today => 0::smallint, p_points_date => '2026-11-05');
    t := t || 'T11 Người khác ghi vào từ của u1 → not_found'::text;
    r := r || (case when res->>'status' = 'not_found' then 'PASS' else 'FAIL — ' || res::text end);

    select count(*) into n from public.exercise_logs where learner_vocabulary_id = lv;
    t := t || 'T12 Người khác không đọc được nhật ký của u1 (RLS)'::text;
    r := r || (case when n = 0 then 'PASS' else 'FAIL — u2 thấy ' || n || ' dòng' end);

    -- ---------- Chưa đăng nhập ----------
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
    begin
      res := public.submit_exercise(
        p_learner_vocabulary_id => lv, p_client_event_id => gen_random_uuid(), p_expected_version => 3, p_answered_at => now_,
        p_stage_number => 5::smallint, p_exercise_type => 'kana_free_recall', p_outcome => 'correct',
        p_points => 1::smallint, p_counted => true, p_study_date => '2026-11-05', p_day_seq => 1,
        p_new_stage => 5::smallint, p_completed => false,
        p_stage_points => 1, p_stage_points_today => 1::smallint, p_points_date => '2026-11-05');
      t := t || 'T13 Chưa đăng nhập → bị chặn'::text;  r := r || ('FAIL — ' || res::text);
    exception when others then
      t := t || 'T13 Chưa đăng nhập → bị chặn'::text;
      r := r || (case when sqlstate in ('28000', '42501') then 'PASS' else 'FAIL — ' || sqlstate || ' ' || sqlerrm end);
    end;

    perform set_config('role', 'postgres', true);

    -- ---------- Quyền gọi hàm ----------
    select count(*) into n from pg_proc
     where proname = 'submit_exercise' and pronamespace = 'public'::regnamespace
       and has_function_privilege('anon', oid, 'execute');
    t := t || 'T14 anon (chưa đăng nhập) không có quyền gọi hàm'::text;
    r := r || (case when n = 0 then 'PASS' else 'FAIL — anon gọi được' end);

    raise exception 'voc04_rollback';
  exception when raise_exception then
    if sqlerrm <> 'voc04_rollback' then raise; end if;
  end;

  t := t || 'T99 Dữ liệu thử đã được hoàn tác'::text;
  r := r || (case when not exists (select 1 from auth.users where id in (u1, u2))
                   and not exists (select 1 from public.vocabularies where code = 'test-voc04')
                  then 'PASS' else 'FAIL — còn sót dữ liệu thử' end);

  return query select x.a, x.b from unnest(t, r) as x(a, b);
end;
$fn$;

select * from pg_temp.voc04_checks();
