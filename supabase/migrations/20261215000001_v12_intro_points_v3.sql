-- =============================================================================
-- V12 (chủ dự án chốt 2026-11-26, lần 3): loại câu và điểm cần mới (lib/v12/card-types.ts — STAGE_TYPES, passFor).
--   Kana       S1 Kana → nghĩa (2 điểm) · S2 nghĩa → Kana (2) · nghe → Kana (1) · S3 gõ Kana (2)
--   Chữ Kanji  S1 chữ → Hán Việt, chữ → nghĩa (2 mỗi loại) · S2 Hán Việt → chữ (2) + phân biệt chữ giống (2, nếu có)
--              · S3 gõ Hán Việt (2)
--   Từ vựng Kanji S1 mỗi loại 2 điểm; S2, S3 như cũ. Bộ thủ như cũ.
--   Stage sau từ ngày học kế tiếp (chỉ bộ thủ học Stage 2 ngay trong ngày xong Stage 1).
-- App đọc loại thẻ theo luật hiện tại nên không cần đổi dòng điểm. Mục đã đủ điểm mọi loại thẻ của Stage hiện tại theo
-- luật mới thì chuyển như khi vừa xong Stage, từ ngày học kế tiếp (nếu không sẽ kẹt). Làm Stage 3 → 2 để không chuyển hai lần.
-- =============================================================================
create temporary table v12_need (area text, stage smallint, card_type text, pass smallint) on commit drop;
insert into v12_need values
  ('kanji', 3, 'kanji_type_hanviet', 2),
  ('kana', 2, 'meaning_kana', 2), ('kana', 2, 'listen_kana', 1),
  ('kanji', 2, 'hanviet_kanji', 2);

create temporary table v12_done (id uuid, user_id uuid, area text, stage smallint) on commit drop;

create or replace function pg_temp.v12_collect(p_stage smallint) returns void language sql as $$
  insert into v12_done
  select li.id, li.user_id, li.area, p_stage
    from public.learner_items li
   where li.stage = p_stage::text and li.known_at is null
     and exists (select 1 from v12_need n where n.area = li.area and n.stage = p_stage)
     and not exists (
       select 1
         from (select n.card_type, n.pass from v12_need n where n.area = li.area and n.stage = p_stage
               union all
               select 'kanji_similar', 2 where li.area = 'kanji' and p_stage = 2 and li.has_similar) need
        where coalesce((select t.points from public.learner_item_types t
                         where t.learner_item_id = li.id and t.stage = p_stage and t.card_type = need.card_type), 0) < need.pass)
$$;

-- Chữ Kanji Stage 3 xong (chỉ còn gõ Hán Việt) → Card
select pg_temp.v12_collect(3::smallint);
update public.learner_items li
   set stage = 'review', stage_from = (now() at time zone 'Asia/Ho_Chi_Minh')::date + 1, version = li.version + 1, updated_at = now()
  from v12_done d where d.stage = 3 and li.id = d.id;
insert into public.item_cards (user_id, learner_item_id, card_type, due_at)
select d.user_id, d.id, 'kanji', ((now() at time zone 'Asia/Ho_Chi_Minh')::date + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh'
  from v12_done d
 where d.stage = 3
on conflict (learner_item_id, card_type) do nothing;

-- Kana / chữ Kanji Stage 2 xong theo luật mới → Stage 3
select pg_temp.v12_collect(2::smallint);
update public.learner_items li
   set stage = '3', stage_from = (now() at time zone 'Asia/Ho_Chi_Minh')::date + 1, version = li.version + 1, updated_at = now()
  from v12_done d where d.stage = 2 and li.id = d.id;
