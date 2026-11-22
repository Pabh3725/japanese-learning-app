-- =============================================================================
-- V12 (chủ dự án chốt 2026-11-22): rút gọn Intro — mỗi Stage một chiều riêng, bỏ câu trùng giữa các Stage.
--   Kana       S1 Kana→nghĩa, nghĩa→Kana · S2 nghe→Kana, nghĩa→Kana · S3 gõ Kana (nghĩa, nghe)
--   Bộ thủ     S1 bộ→tên, bộ→nghĩa · S2 tên→bộ, nghĩa→bộ
--   Chữ Kanji  S1 chữ→Hán Việt, chữ→nghĩa · S2 Hán Việt→chữ, nghĩa→chữ · S3 gõ Hán Việt (+ phân biệt chữ giống)
--   Từ vựng Kanji S1 từ→Hán Việt, từ→nghĩa · S2 Hán Việt→từ, nghĩa→từ, ghép chữ · S3 gõ Hán Việt
-- App đọc loại thẻ theo luật hiện tại (loại bỏ đi thì bỏ qua, loại mới bắt đầu 0 điểm) nên không cần đổi dòng điểm.
-- Mục đã đủ điểm mọi loại thẻ của Stage hiện tại theo luật mới thì chuyển như khi vừa xong Stage, từ ngày học kế tiếp
-- (nếu không sẽ kẹt vì không còn câu để hỏi). Làm Stage 3 → 2 → 1 để một mục không chuyển hai lần.
-- =============================================================================
create temporary table v12_need (area text, stage smallint, card_type text, pass smallint) on commit drop;
insert into v12_need values
  ('kana', 3, 'meaning_type_kana', 2), ('kana', 3, 'listen_type_kana', 2),
  ('kanji', 3, 'kanji_type_hanviet', 2),
  ('word_kanji', 3, 'word_type_hanviet', 2),
  ('kana', 2, 'listen_kana', 2), ('kana', 2, 'meaning_kana', 2),
  ('radical', 2, 'hanviet_radical', 2), ('radical', 2, 'meaning_radical', 2),
  ('kanji', 2, 'hanviet_kanji', 2), ('kanji', 2, 'meaning_kanji', 2),
  ('word_kanji', 2, 'hanviet_word', 2), ('word_kanji', 2, 'meaning_word', 2), ('word_kanji', 2, 'word_assembly', 2),
  ('kanji', 1, 'kanji_hanviet', 1), ('kanji', 1, 'kanji_meaning', 1),
  ('word_kanji', 1, 'word_hanviet', 1), ('word_kanji', 1, 'word_meaning', 1);

-- Mục ở Stage s đã đủ điểm mọi loại thẻ cần của Stage đó (chữ có cặp gần giống: thêm kanji_similar ở Stage 3)
create temporary table v12_done (id uuid, user_id uuid, area text, stage smallint) on commit drop;

create or replace function pg_temp.v12_collect(p_stage smallint) returns void language sql as $$
  insert into v12_done
  select li.id, li.user_id, li.area, p_stage
    from public.learner_items li
   where li.stage = p_stage::text and li.known_at is null
     and (p_stage <> 1 or li.intro_seen_at is not null)
     and exists (select 1 from v12_need n where n.area = li.area and n.stage = p_stage)
     and not exists (
       select 1
         from (select n.card_type, n.pass from v12_need n where n.area = li.area and n.stage = p_stage
               union all
               select 'kanji_similar', 2 where li.area = 'kanji' and p_stage = 3 and li.has_similar) need
        where coalesce((select t.points from public.learner_item_types t
                         where t.learner_item_id = li.id and t.stage = p_stage and t.card_type = need.card_type), 0) < need.pass)
$$;

-- Stage 3 xong → Card
select pg_temp.v12_collect(3::smallint);
update public.learner_items li
   set stage = 'review', stage_from = (now() at time zone 'Asia/Ho_Chi_Minh')::date + 1, version = li.version + 1, updated_at = now()
  from v12_done d where d.stage = 3 and li.id = d.id;
insert into public.item_cards (user_id, learner_item_id, card_type, due_at)
select d.user_id, d.id, c, ((now() at time zone 'Asia/Ho_Chi_Minh')::date + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh'
  from v12_done d,
       unnest(case d.area when 'kana' then array['kana_type', 'kana_choose'] when 'kanji' then array['kanji'] else array['word_kanji'] end) as c
 where d.stage = 3
on conflict (learner_item_id, card_type) do nothing;

-- Stage 2 xong → Stage 3 (bộ thủ: Card)
select pg_temp.v12_collect(2::smallint);
update public.learner_items li
   set stage = case when d.area = 'radical' then 'review' else '3' end,
       stage_from = (now() at time zone 'Asia/Ho_Chi_Minh')::date + 1, version = li.version + 1, updated_at = now()
  from v12_done d where d.stage = 2 and li.id = d.id;
insert into public.item_cards (user_id, learner_item_id, card_type, due_at)
select d.user_id, d.id, 'radical', ((now() at time zone 'Asia/Ho_Chi_Minh')::date + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh'
  from v12_done d
 where d.stage = 2 and d.area = 'radical'
on conflict (learner_item_id, card_type) do nothing;

-- Stage 1 xong (chữ Kanji, Từ vựng Kanji) → Stage 2
select pg_temp.v12_collect(1::smallint);
update public.learner_items li
   set stage = '2', stage_from = (now() at time zone 'Asia/Ho_Chi_Minh')::date + 1, version = li.version + 1, updated_at = now()
  from v12_done d where d.stage = 1 and li.id = d.id;
