-- =============================================================================
-- AUTH-01 · Tự tạo settings mặc định cho người học mới
--
-- Khi một tài khoản mới được tạo trong auth.users (khi người học tự đăng ký ở /login),
-- database tự thêm một dòng learner_settings. Không phụ thuộc code app.
--
-- Chỉ thêm: không xóa bảng, cột hay dữ liệu nào.
-- Các cột review_cap / unlock_threshold / mode sẽ được DB-03 thêm kèm giá trị mặc định;
-- dòng tạo ra ở đây sẽ tự nhận giá trị mặc định đó.
-- =============================================================================

-- Mặc định V7: 20 từ mới/ngày (trước đây để trống)
alter table public.learner_settings
  alter column daily_new_limit set default 20;


create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer          -- chạy với quyền chủ hàm để ghi được vào public.learner_settings
set search_path = ''      -- chống lợi dụng search_path
as $$
begin
  insert into public.learner_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'AUTH-01: tạo learner_settings mặc định khi có tài khoản mới.';

-- Hàm này chỉ dành cho trigger, không cho client gọi qua API
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- Bổ sung cho tài khoản đã tồn tại trước migration này (nếu có)
insert into public.learner_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

update public.learner_settings
set daily_new_limit = 20
where daily_new_limit is null;
