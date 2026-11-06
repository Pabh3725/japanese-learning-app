-- =============================================================================
-- Luật học V4: sai −2, thẻ Giới thiệu Hán tự, mặc định 5 từ mới mỗi ngày.
-- Nguồn: docs/PROJECT_SPEC.md §18.3b.
--
-- Chỉ thêm và nới, chạy lại nhiều lần vẫn an toàn. Luật do lib/learning tính rồi truyền vào.
-- =============================================================================

-- Sai bị trừ 2 điểm. Vòng ghép ô vẫn trừ 1.
alter table public.exercise_logs drop constraint if exists exercise_logs_points_check;
alter table public.exercise_logs
  add constraint exercise_logs_points_check check (points between -2 and 1);

-- Mặc định 5 từ mới mỗi ngày. Trước đây Settings chưa chỉnh được nên 20 luôn là mặc định cũ, không phải lựa chọn của ai.
alter table public.learner_settings alter column daily_new_limit set default 5;
-- Chỉ chạy một lần, để chạy lại migration không đổi lựa chọn 20 của người dùng sau này.
update public.learner_settings set daily_new_limit = 5
 where daily_new_limit = 20
   and not exists (select 1 from pg_catalog.pg_proc p
                   where p.proname = 'complete_kanji_intro' and p.pronamespace = 'public'::regnamespace);

-- Thời điểm xem xong thẻ Giới thiệu Hán tự. Trước mốc này không được hiện Kanji của từ.
alter table public.learner_vocabulary
  add column if not exists kanji_intro_seen_at timestamptz;
comment on column public.learner_vocabulary.kanji_intro_seen_at is
  'Xem xong thẻ Giới thiệu Hán tự. Null = chưa được hiện Kanji của từ này.';

-- Từ đã qua thẻ Stage 3 cũ đều đã thấy Kanji, không bắt xem lại.
update public.learner_vocabulary lv
   set kanji_intro_seen_at = coalesce(lv.last_practiced_at, now())
  from public.vocabularies v
 where v.id = lv.vocabulary_id
   and not v.is_kana_only
   and lv.current_stage >= 4
   and lv.kanji_intro_seen_at is null
   -- Chỉ chạy một lần: sau migration này từ mới lên Stage 4 chưa xem thẻ
   and not exists (select 1 from pg_catalog.pg_proc p
                   where p.proname = 'complete_kanji_intro' and p.pronamespace = 'public'::regnamespace);

create or replace function public.complete_kanji_intro(
  p_learner_vocabulary_id uuid,
  p_seen_at               timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'complete_kanji_intro: not authenticated' using errcode = '28000';
  end if;

  -- Gọi lại lần hai giữ nguyên thời điểm đầu
  update public.learner_vocabulary
     set kanji_intro_seen_at = coalesce(kanji_intro_seen_at, p_seen_at),
         last_practiced_at = p_seen_at,
         version = version + 1
   where id = p_learner_vocabulary_id
     and user_id = v_uid
     and current_stage >= 4;

  if found then
    return jsonb_build_object('status', 'saved');
  end if;
  if exists (select 1 from public.learner_vocabulary
              where id = p_learner_vocabulary_id and user_id = v_uid) then
    return jsonb_build_object('status', 'stage_changed');
  end if;
  return jsonb_build_object('status', 'not_found');
end;
$$;

comment on function public.complete_kanji_intro is
  'Xem xong thẻ Giới thiệu Hán tự của một từ. Từ đó từ này học tiếp bước 2 của Stage 4 và được hiện Kanji.';

revoke execute on function public.complete_kanji_intro from public, anon;
grant  execute on function public.complete_kanji_intro to authenticated;
