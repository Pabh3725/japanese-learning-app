-- =============================================================================
-- V12 (chủ dự án chốt 2026-11-24): bớt câu nghe — Stage 3 của Từ vựng Kana chỉ còn "nghĩa → gõ Kana"
-- (bỏ "nghe → gõ Kana"). Từ Kana đang ở Stage 3 đã đủ 2 điểm "nghĩa → gõ Kana" thì xong Stage 3 như khi vừa trả lời:
-- có Card (kana_type) đến hạn 00:00 giờ Việt Nam ngày học kế tiếp. Nếu không, mục sẽ kẹt vì không còn câu để hỏi.
-- =============================================================================
create temporary table v12_kana_s3_done on commit drop as
select li.id, li.user_id
  from public.learner_items li
 where li.area = 'kana' and li.stage = '3' and li.known_at is null
   and exists (select 1 from public.learner_item_types t
                where t.learner_item_id = li.id and t.stage = 3 and t.card_type = 'meaning_type_kana' and t.points >= 2);

update public.learner_items li
   set stage = 'review', stage_from = (now() at time zone 'Asia/Ho_Chi_Minh')::date + 1, version = li.version + 1, updated_at = now()
  from v12_kana_s3_done d
 where li.id = d.id;

insert into public.item_cards (user_id, learner_item_id, card_type, due_at)
select d.user_id, d.id, 'kana_type', ((now() at time zone 'Asia/Ho_Chi_Minh')::date + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh'
  from v12_kana_s3_done d
on conflict (learner_item_id, card_type) do nothing;
