-- =============================================================================
-- VOC-05 · Kiểm tra hàm complete_stage3
-- Chạy SAU migration 20261105000004_stage3_complete.sql.
-- An toàn: mọi dữ liệu thử bị HOÀN TÁC ở cuối, database không còn dòng nào.
-- =============================================================================
create or replace function pg_temp.stage3_checks()
returns table (kiem_tra text, ket_qua text)
language plpgsql
as $fn$
declare
  t   text[] := '{}';
  r   text[] := '{}';
  u1  uuid := gen_random_uuid();
  u2  uuid := gen_random_uuid();
  v1  uuid;
  lv  uuid;
  res jsonb;
  n   integer;
  stg smallint;
  due_ timestamptz;
begin
  begin
    insert into auth.users (id, email) values (u1, 'st3-a@example.invalid'), (u2, 'st3-b@example.invalid');
    insert into public.vocabularies (code, sort_order, expression, reading_kana, meaning_vi, han_viet, is_kana_only, jlpt_level)
    values ('test-st3', 999994, '鑿岩', 'さくがんすてじ', 'từ thử Stage 3', 'TẠC NHAM', false, 5) returning id into v1;
    insert into public.learner_vocabulary (user_id, vocabulary_id, current_stage) values (u1, v1, 2) returning id into lv;
    update public.learner_vocabulary set current_stage = 3 where id = lv;

    -- ---------- Người khác không gọi được ----------
    perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u2::text, true);
    perform set_config('role', 'authenticated', true);
    res := public.complete_stage3(lv, 4::smallint, '2026-11-05 20:00+07', '{vocab.kana_hanviet}', '2026-11-06 00:00+07');
    t := t || 'T1 Người khác không mở được từ của mình'::text;
    r := r || (case when res->>'status' = 'not_found' then 'PASS' else 'FAIL — ' || res::text end);
    perform set_config('role', 'postgres', true);
    select current_stage into stg from public.learner_vocabulary where id = lv;
    t := t || 'T2 Từ không đổi sau lần gọi của người khác'::text;
    r := r || (case when stg = 3 then 'PASS' else 'FAIL — ' || stg end);

    -- ---------- Chủ từ ----------
    perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u1::text, true);
    perform set_config('role', 'authenticated', true);
    res := public.complete_stage3(lv, 4::smallint, '2026-11-05 20:00+07', '{vocab.kana_hanviet}', '2026-11-06 00:00+07');
    select current_stage into stg from public.learner_vocabulary where id = lv;
    t := t || 'T3 Xem xong: sang Stage 4'::text;
    r := r || (case when res->>'status' = 'saved' and stg = 4 then 'PASS' else 'FAIL — ' || res::text end);

    select count(*) into n from public.learner_stage_schedules where learner_vocabulary_id = lv and stage_number = 4 and completed_at is null;
    t := t || 'T4 Có lịch Stage 4'::text;
    r := r || (case when n = 1 then 'PASS' else 'FAIL — ' || n end);

    select due_at into due_ from public.review_cards where learner_vocabulary_id = lv and card_type = 'vocab.kana_hanviet';
    t := t || 'T5 Có card kana–Hán Việt, hạn 00:00 hôm sau'::text;
    r := r || (case when due_ = '2026-11-06 00:00+07'::timestamptz then 'PASS' else 'FAIL' end);

    res := public.complete_stage3(lv, 4::smallint, '2026-11-05 20:05+07', '{vocab.kana_hanviet}', '2026-11-06 00:00+07');
    select count(*) into n from public.review_cards where learner_vocabulary_id = lv;
    t := t || 'T6 Gọi lại: không tạo thêm'::text;
    r := r || (case when res->>'status' = 'stage_changed' and n = 1 then 'PASS' else 'FAIL — ' || res::text end);

    perform set_config('role', 'postgres', true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);

    select count(*) into n from pg_proc
     where proname = 'complete_stage3' and pronamespace = 'public'::regnamespace
       and has_function_privilege('anon', oid, 'execute');
    t := t || 'T7 anon không gọi được hàm'::text;
    r := r || (case when n = 0 then 'PASS' else 'FAIL' end);

    raise exception 'st3_rollback';
  exception when raise_exception then
    if sqlerrm <> 'st3_rollback' then raise; end if;
  end;

  t := t || 'T99 Dữ liệu thử đã được hoàn tác'::text;
  r := r || (case when not exists (select 1 from auth.users where id in (u1, u2)) then 'PASS' else 'FAIL' end);
  return query select x.a, x.b from unnest(t, r) as x(a, b);
end;
$fn$;

select * from pg_temp.stage3_checks();
