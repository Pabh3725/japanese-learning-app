-- =============================================================================
-- SRS-03 · Kiểm tra hàm submit_review
-- Chạy SAU migration 20261105000001_srs03_submit_review.sql.
--
-- Cách chạy: Supabase Dashboard → SQL Editor → New query → dán toàn bộ file → Run.
-- PASS = đúng như mong đợi. FAIL = có lỗi, báo lại.
-- An toàn: mọi dữ liệu thử bị HOÀN TÁC ở cuối, database không còn dòng nào.
--
-- Test đóng vai người dùng đã đăng nhập: chuyển sang role "authenticated"
-- và đặt auth.uid() bằng request.jwt.claims — giống request thật từ app.
-- =============================================================================

create or replace function pg_temp.srs03_checks()
returns table (kiem_tra text, ket_qua text)
language plpgsql
as $fn$
declare
  t    text[] := '{}';
  r    text[] := '{}';
  u1   uuid := gen_random_uuid();   -- chủ card
  u2   uuid := gen_random_uuid();   -- người khác
  v1   uuid;
  lv   uuid;
  rc   uuid;
  ev1  uuid := gen_random_uuid();
  res  jsonb;
  n    integer;
  pts  integer;
  ver  integer;
  now_ timestamptz := '2026-11-05 20:00+07';
begin
  begin
    -- ---------- Dữ liệu chuẩn bị (quyền admin) ----------
    insert into auth.users (id, email) values
      (u1, 'srs03-a@example.invalid'), (u2, 'srs03-b@example.invalid');

    insert into public.vocabularies (code, sort_order, expression, reading_kana, meaning_vi, romaji, han_viet, is_kana_only, jlpt_level)
    values ('test-srs03-' || gen_random_uuid(), 900000 + (random() * 99999)::int,
            '学校', 'がっこうテスト', 'Trường học (test)', 'gakkō', 'HỌC HIỆU', false, 5)
    returning id into v1;

    insert into public.learner_vocabulary (user_id, vocabulary_id, current_stage)
    values (u1, v1, 5) returning id into lv;

    insert into public.review_cards (user_id, learner_vocabulary_id, card_type, due_at)
    values (u1, lv, 'vocab.meaning_kanji', '2026-11-05 00:00+07')
    returning id into rc;

    -- ---------- Đóng vai u1 đã đăng nhập ----------
    perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u1::text, true);
    perform set_config('role', 'authenticated', true);

    -- T01: lưu lần đầu (Easy, +2)
    res := public.submit_review(rc, ev1, 0, now_,
      2::smallint, now_ + interval '4 days', 3.95, 1.0, 4, 0, 1, 0,
      2, false,
      4::smallint, 2::smallint, 0::smallint, '2026-11-05 00:00+07', 'kanji_assembly', 2100);
    select count(*) into n from public.review_logs where review_card_id = rc;
    select card_points, version into pts, ver from public.review_cards where id = rc;
    t := t || 'T01 Lưu lần đầu → saved, 1 nhật ký, điểm 2, version 1'::text;
    r := r || (case when res->>'status' = 'saved' and n = 1 and pts = 2 and ver = 1
                    then 'PASS' else 'FAIL — ' || res::text || ' logs=' || n || ' pts=' || pts || ' ver=' || ver end);

    -- T02: gửi lại CÙNG mã (bấm 2 lần / mạng gửi lại)
    res := public.submit_review(rc, ev1, 1, now_,
      2::smallint, now_ + interval '4 days', 3.95, 1.0, 4, 0, 1, 0,
      4, false,
      4::smallint, 2::smallint, 0::smallint, '2026-11-05 00:00+07', 'kanji_assembly', 2100);
    select count(*) into n from public.review_logs where review_card_id = rc;
    select card_points, version into pts, ver from public.review_cards where id = rc;
    t := t || 'T02 Gửi lại cùng mã → duplicate, vẫn 1 nhật ký, điểm vẫn 2 (NGHIỆM THU)'::text;
    r := r || (case when res->>'status' = 'duplicate' and n = 1 and pts = 2 and ver = 1
                    then 'PASS' else 'FAIL — ' || res::text || ' logs=' || n || ' pts=' || pts || ' ver=' || ver end);

    -- T03: version cũ (máy thứ 2 đọc card trước khi máy 1 lưu)
    res := public.submit_review(rc, gen_random_uuid(), 0, now_,
      2::smallint, now_ + interval '9 days', 9.0, 1.0, 9, 0, 2, 0,
      4, false,
      4::smallint, 2::smallint, 2::smallint, now_, 'kanji_assembly', 2000);
    select count(*) into n from public.review_logs where review_card_id = rc;
    select card_points, version into pts, ver from public.review_cards where id = rc;
    t := t || 'T03 Version cũ (2 thiết bị) → conflict, không ghi gì'::text;
    r := r || (case when res->>'status' = 'conflict' and n = 1 and pts = 2 and ver = 1
                    then 'PASS' else 'FAIL — ' || res::text || ' logs=' || n || ' pts=' || pts || ' ver=' || ver end);

    -- T04: rating sai (5) → nhật ký bị CHECK chặn → lệnh update card cũng phải bị hoàn tác
    begin
      res := public.submit_review(rc, gen_random_uuid(), 1, now_ + interval '4 days',
        2::smallint, now_ + interval '20 days', 20.0, 1.0, 16, 0, 2, 0,
        99, false,
        5::smallint, 2::smallint, 2::smallint, now_, 'kanji_assembly', 2000);
      t := t || 'T04 Nhật ký lỗi → card KHÔNG bị cập nhật (all-or-nothing)'::text;
      r := r || ('FAIL — không báo lỗi: ' || res::text);
    exception when check_violation then
      select card_points, version into pts, ver from public.review_cards where id = rc;
      t := t || 'T04 Nhật ký lỗi → card KHÔNG bị cập nhật (all-or-nothing)'::text;
      r := r || (case when pts = 2 and ver = 1 then 'PASS' else 'FAIL — card đã bị đổi: pts=' || pts || ' ver=' || ver end);
    end;

    -- T05: bỏ card (đủ mốc) → retired_at có giá trị
    res := public.submit_review(rc, gen_random_uuid(), 1, now_ + interval '4 days',
      2::smallint, now_ + interval '15 days', 11.0, 1.0, 11, 0, 2, 0,
      3, true,
      3::smallint, 1::smallint, 2::smallint, now_ + interval '4 days', 'kanji_recognition_6', 4000);
    t := t || 'T05 Lưu kèm bỏ card → saved, retired_at được đặt'::text;
    r := r || (case when res->>'status' = 'saved'
                     and exists (select 1 from public.review_cards where id = rc and retired_at is not null)
                    then 'PASS' else 'FAIL — ' || res::text end);

    -- T06: ôn card đã bỏ → not_active
    res := public.submit_review(rc, gen_random_uuid(), 2, now_ + interval '15 days',
      2::smallint, now_ + interval '40 days', 30.0, 1.0, 25, 0, 3, 0,
      4, false,
      3::smallint, 1::smallint, 2::smallint, now_ + interval '15 days', 'kanji_recognition_6', 4000);
    t := t || 'T06 Ôn card đã bỏ → not_active'::text;
    r := r || (case when res->>'status' = 'not_active' then 'PASS' else 'FAIL — ' || res::text end);

    -- ---------- Đóng vai u2: người khác ----------
    perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u2::text, true);

    res := public.submit_review(rc, gen_random_uuid(), 2, now_,
      2::smallint, now_, 1.0, 1.0, 1, 0, 1, 0,
      100, false,
      4::smallint, 2::smallint, 0::smallint, now_);
    t := t || 'T07 Người khác ôn card của u1 → not_found'::text;
    r := r || (case when res->>'status' = 'not_found' then 'PASS' else 'FAIL — ' || res::text end);

    select count(*) into n from public.review_cards where id = rc;
    t := t || 'T07b Người khác không nhìn thấy card của u1 (RLS)'::text;
    r := r || (case when n = 0 then 'PASS' else 'FAIL — u2 thấy card của u1' end);

    -- ---------- Chưa đăng nhập ----------
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
    begin
      res := public.submit_review(rc, gen_random_uuid(), 2, now_,
        2::smallint, now_, 1.0, 1.0, 1, 0, 1, 0, 0, false,
        3::smallint, 1::smallint, 0::smallint, now_);
      t := t || 'T08 Chưa đăng nhập → bị chặn'::text;  r := r || ('FAIL — ' || res::text);
    exception when others then
      t := t || 'T08 Chưa đăng nhập → bị chặn'::text;
      r := r || (case when sqlstate in ('28000', '42501') then 'PASS' else 'FAIL — ' || sqlstate || ' ' || sqlerrm end);
    end;

    perform set_config('role', 'postgres', true);

    -- ---------- Quyền gọi hàm ----------
    t := t || 'T09 anon (chưa đăng nhập) không có quyền gọi hàm'::text;
    r := r || (case when not has_function_privilege('anon', 'public.submit_review(uuid,uuid,integer,timestamptz,smallint,timestamptz,double precision,double precision,integer,integer,integer,integer,integer,boolean,smallint,smallint,smallint,timestamptz,text,integer,date,integer)', 'execute')
                    then 'PASS' else 'FAIL — anon gọi được' end);

    raise exception 'srs03_rollback';
  exception when raise_exception then
    if sqlerrm <> 'srs03_rollback' then raise; end if;
  end;

  t := t || 'T99 Dữ liệu thử đã được hoàn tác'::text;
  r := r || (case when not exists (select 1 from auth.users where id in (u1, u2))
                  then 'PASS' else 'FAIL — còn sót dữ liệu thử' end);

  return query select x.a, x.b from unnest(t, r) as x(a, b);
end;
$fn$;

select * from pg_temp.srs03_checks();
