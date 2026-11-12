-- =============================================================================
-- PROD (chủ dự án yêu cầu 2026-11-12): đánh dấu MỌI tài khoản đã học xong từ vựng bài 1 và 2.
-- Chạy trong Supabase SQL Editor của project prod (sqlhbizpyteatcdvllgv).
-- Dùng đúng hàm mark_words_learned như nút "Mark as learned" trong Library:
--   xong Stage 1–3 (và Stage 4–6 nếu chính sách Kanji cho phép), tạo Card Kana (+ Card Kanji), lần ôn đầu rải từ ngày mai
--   (tối đa 20 Card mỗi ngày). Từ đã có Card thì giữ nguyên lịch. Chạy lại nhiều lần vẫn an toàn.
-- Bước 1 chỉ đọc (xem trước). Bước 2 mới ghi.
-- =============================================================================

-- ---------- Bước 1: xem trước (chỉ đọc) ----------
select u.email,
  (select count(*) from public.vocabularies v where v.lesson in (1, 2)) as words_l1_l2,
  (select count(*) from public.learner_vocabulary lv join public.vocabularies v on v.id = lv.vocabulary_id
    where lv.user_id = u.id and v.lesson in (1, 2) and lv.learning_status = 'initial_complete') as already_done,
  (select count(*) from public.review_cards c where c.user_id = u.id) as cards_now
from auth.users u order by u.created_at;

-- ---------- Bước 2: ghi (bỏ comment khối dưới rồi chạy) ----------
/*
create or replace function pg_temp.mark_user(p_user uuid)
returns jsonb
language plpgsql
as $fn$
declare
  v_level smallint;
  v_items jsonb;
  v_tomorrow timestamptz := (date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh') + interval '1 day') at time zone 'Asia/Ho_Chi_Minh';
  v_res jsonb;
begin
  select coalesce((select jlpt_level from public.learner_skill_levels where user_id = p_user and skill = 'word_kanji'), 5) into v_level;
  with w as (
    select v.id, v.sort_order,
      (not v.is_kana_only and coalesce(v.kanji_policy, '') <> 'KANA_ONLY'
        and (coalesce(v.kanji_policy, '') <> 'KANJI_OPTIONAL' or exists (select 1 from public.learner_word_kanji_optins o where o.user_id = p_user and o.vocabulary_id = v.id))
        and coalesce(v.kanji_target_level, v.jlpt_level) >= v_level) as kanji
    from public.vocabularies v where v.lesson in (1, 2)
  ), n as (
    select *, sum(case when kanji then 2 else 1 end) over (order by sort_order) - (case when kanji then 2 else 1 end) as card from w
  )
  select jsonb_agg(jsonb_build_object('vocabulary_id', id, 'kanji', kanji,
      'kana_due', v_tomorrow + floor(card / 20) * interval '1 day',
      'kanji_due', case when kanji then v_tomorrow + floor((card + 1) / 20) * interval '1 day' end) order by sort_order) into v_items from n;
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  v_res := public.mark_words_learned(v_items, now());
  execute 'reset role';
  return v_res;
end;
$fn$;

select u.email, pg_temp.mark_user(u.id) as result from auth.users u order by u.created_at;
*/
