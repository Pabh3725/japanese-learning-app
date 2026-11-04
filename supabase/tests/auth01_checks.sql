-- =============================================================================
-- AUTH-01 · Kiểm tra trigger tạo settings
--
-- Cách chạy: Supabase Dashboard → SQL Editor → New query → dán toàn bộ file → Run.
-- An toàn: tài khoản thử được tạo bên trong hàm rồi HOÀN TÁC ngay. Không để lại dữ liệu.
-- Kết quả mong đợi: mọi dòng ket_qua = PASS.
-- =============================================================================

create or replace function pg_temp.auth01_checks()
returns table (kiem_tra text, ket_qua text)
language plpgsql
as $fn$
declare
  t text[] := '{}';
  r text[] := '{}';
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  n int;
  limit_a smallint;
begin
  begin
    insert into auth.users (id, email, aud, role)
    values (a, 'auth01_test_a@users.projap.invalid', 'authenticated', 'authenticated'),
           (b, 'auth01_test_b@users.projap.invalid', 'authenticated', 'authenticated');

    select count(*) into n from public.learner_settings where user_id in (a, b);
    t := t || '2 tài khoản mới → 2 dòng settings'::text;
    r := r || case when n = 2 then 'PASS' else 'FAIL (' || n || ')' end;

    select daily_new_limit into limit_a from public.learner_settings where user_id = a;
    t := t || 'daily_new_limit mặc định = 20'::text;
    r := r || case when limit_a = 20 then 'PASS' else 'FAIL (' || coalesce(limit_a::text, 'null') || ')' end;

    select count(*) into n from public.learner_settings where user_id = a;
    t := t || 'mỗi tài khoản đúng 1 dòng'::text;
    r := r || case when n = 1 then 'PASS' else 'FAIL (' || n || ')' end;

    -- Cố tình báo lỗi để HOÀN TÁC mọi dữ liệu thử ở trên
    raise exception 'auth01_rollback';
  exception
    when raise_exception then
      if sqlerrm <> 'auth01_rollback' then raise; end if;
  end;

  t := t || 'client không gọi được handle_new_user'::text;
  r := r || case when has_function_privilege('authenticated', 'public.handle_new_user()', 'execute')
                 then 'FAIL' else 'PASS' end;

  t := t || 'dữ liệu thử đã được hoàn tác'::text;
  r := r || case when exists (select 1 from auth.users where id in (a, b))
                 then 'FAIL' else 'PASS' end;

  return query select unnest(t), unnest(r);
end;
$fn$;

select * from pg_temp.auth01_checks();
