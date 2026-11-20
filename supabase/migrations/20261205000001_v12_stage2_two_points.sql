-- =============================================================================
-- V12 (chủ dự án chốt 2026-11-20): Stage 2 và Stage 3 chỉ cần 2 điểm mỗi loại thẻ (trước là 3); số loại thẻ giữ nguyên.
-- Mục đã đủ 2 điểm ở mọi loại thẻ của Stage hiện tại (theo luật hiện tại) thì chuyển như khi vừa xong Stage đó,
-- từ ngày học kế tiếp — nếu không, mục sẽ kẹt vì không còn loại thẻ nào để hỏi. Dòng điểm cũ giữ nguyên.
--   1. Stage 3 xong → Card (Từ vựng Kana 2 Card, chữ Kanji 1, Từ vựng Kanji 1). Làm trước để mục vừa lên Stage 3 ở bước 2 không bị chuyển tiếp.
--   2. Stage 2 xong → Stage 3 (Từ vựng Kana / chữ Kanji / Từ vựng Kanji); bộ thủ (không có Stage 3) → Card.
-- =============================================================================

-- 1. Stage 3
create temporary table v12_s3_done on commit drop as
select li.id, li.user_id, li.area
  from public.learner_items li
 where li.stage = '3' and li.known_at is null
   and (select count(*) from public.learner_item_types t
         where t.learner_item_id = li.id and t.stage = 3 and t.points >= 2
           and t.card_type = any (case li.area
             when 'kana'  then array['meaning_type_kana', 'listen_type_kana', 'kana_meaning']
             when 'kanji' then array['kanji_type_hanviet', 'kanji_meaning', 'hanviet_kanji', 'meaning_kanji'] || case when li.has_similar then array['kanji_similar'] else array[]::text[] end
             else              array['word_type_hanviet', 'word_meaning'] end))
       = case li.area when 'kana' then 3 when 'kanji' then case when li.has_similar then 5 else 4 end else 2 end;

update public.learner_items li
   set stage = 'review', stage_from = (now() at time zone 'Asia/Ho_Chi_Minh')::date + 1, version = li.version + 1, updated_at = now()
  from v12_s3_done d
 where li.id = d.id;

insert into public.item_cards (user_id, learner_item_id, card_type, due_at)
select d.user_id, d.id, c, ((now() at time zone 'Asia/Ho_Chi_Minh')::date + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh'
  from v12_s3_done d,
       unnest(case d.area when 'kana' then array['kana_type', 'kana_choose'] when 'kanji' then array['kanji'] else array['word_kanji'] end) as c
on conflict (learner_item_id, card_type) do nothing;

-- 2. Stage 2
create temporary table v12_s2_done on commit drop as
select li.id, li.user_id, li.area, li.has_similar
  from public.learner_items li
 where li.stage = '2' and li.known_at is null
   and (select count(*) from public.learner_item_types t
         where t.learner_item_id = li.id and t.stage = 2 and t.points >= 2
           and t.card_type = any (case li.area
             when 'kana'       then array['kana_meaning', 'meaning_kana', 'listen_kana']
             when 'radical'    then array['radical_hanviet', 'radical_meaning', 'hanviet_radical', 'meaning_radical']
             when 'kanji'      then array['kanji_hanviet', 'kanji_meaning', 'hanviet_kanji', 'meaning_kanji']
             else                   array['word_hanviet', 'word_meaning', 'hanviet_word', 'meaning_word', 'word_assembly'] end))
       = case li.area when 'kana' then 3 when 'word_kanji' then 5 else 4 end;

update public.learner_items li
   set stage = case when d.area = 'radical' then 'review' else '3' end,
       stage_from = (now() at time zone 'Asia/Ho_Chi_Minh')::date + 1,
       version = li.version + 1, updated_at = now()
  from v12_s2_done d
 where li.id = d.id;

insert into public.learner_item_types (learner_item_id, user_id, stage, card_type)
select d.id, d.user_id, 3, t
  from v12_s2_done d,
       unnest(case d.area
         when 'kana'  then array['meaning_type_kana', 'listen_type_kana', 'kana_meaning']
         when 'kanji' then array['kanji_type_hanviet', 'kanji_meaning', 'hanviet_kanji', 'meaning_kanji'] || case when d.has_similar then array['kanji_similar'] else array[]::text[] end
         else              array['word_type_hanviet', 'word_meaning'] end) as t
 where d.area <> 'radical'
on conflict (learner_item_id, stage, card_type) do nothing;

-- Bộ thủ xong Stage cuối: 1 Card, đến hạn 00:00 giờ Việt Nam ngày học kế tiếp
insert into public.item_cards (user_id, learner_item_id, card_type, due_at)
select d.user_id, d.id, 'radical', ((now() at time zone 'Asia/Ho_Chi_Minh')::date + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh'
  from v12_s2_done d
 where d.area = 'radical'
on conflict (learner_item_id, card_type) do nothing;
