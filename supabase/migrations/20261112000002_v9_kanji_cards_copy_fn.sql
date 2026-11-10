-- V9 gói 4a: bước chép chữ đã xong giai đoạn Học sang 2 Card, gói thành hàm để test gọi được.
-- Chạy lại nhiều lần vẫn an toàn (on conflict do nothing). p_only_user chỉ dùng trong test.
create or replace function public.v9_copy_kanji_cards(p_only_user uuid default null)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  n integer;
begin
  insert into public.learner_kanji_cards (
    user_id, learner_kanji_id, card_type, state, due_at, stability, difficulty, scheduled_days,
    learning_steps, reps, lapses, last_review_at, created_at
  )
  select lk.user_id, lk.id, t.card_type, lk.state, lk.due_at, lk.stability, lk.difficulty, lk.scheduled_days,
         lk.learning_steps, lk.reps, lk.lapses, lk.last_review_at, coalesce(lk.completed_at, now())
    from public.learner_kanji lk
   cross join (values ('kanji.meaning'), ('kanji.hanviet')) as t(card_type)
   where lk.phase = 'review'
     and (p_only_user is null or lk.user_id = p_only_user)
  on conflict (learner_kanji_id, card_type) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.v9_copy_kanji_cards from public, anon, authenticated;
comment on function public.v9_copy_kanji_cards is 'V9: chữ đã xong giai đoạn Học có 2 Card mang lịch hiện tại. Chạy lại an toàn.';

select public.v9_copy_kanji_cards();
