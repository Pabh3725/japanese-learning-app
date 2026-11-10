-- =============================================================================
-- Design V9, gói 3: chính sách Kanji của từ. docs/learning-rules.md §6a (RULES_V9).
-- - vocabularies.kanji_policy, kanji_target_level: nội dung, chỉ pnpm seed ghi (data/n5/kanji_policy.csv).
-- - learner_word_kanji_optins: nút "Học dạng Kanji" cho từ KANJI_OPTIONAL.
-- Chỉ thêm cột và bảng; chạy lại nhiều lần vẫn an toàn. Cột để trống tới khi seed.
-- =============================================================================
alter table public.vocabularies add column if not exists kanji_policy text;
alter table public.vocabularies add column if not exists kanji_target_level smallint;

alter table public.vocabularies drop constraint if exists vocabularies_kanji_policy_check;
alter table public.vocabularies add constraint vocabularies_kanji_policy_check check (
  kanji_policy is null
  or (kanji_policy in ('KANA_ONLY', 'KANJI_OPTIONAL') and kanji_target_level is null)
  or (kanji_policy in ('KANJI_CORE', 'KANJI_DEFERRED') and kanji_target_level is not null and kanji_target_level between 1 and 5)
);
comment on column public.vocabularies.kanji_policy is
  'V9: KANA_ONLY, KANJI_CORE, KANJI_DEFERRED, KANJI_OPTIONAL. Quyết định có học Stage 4–6 và học ở cấp nào. Null = chưa seed.';
comment on column public.vocabularies.kanji_target_level is
  'V9: cấp phải học dạng Kanji (5 = N5). Chỉ có với KANJI_CORE và KANJI_DEFERRED.';

create table if not exists public.learner_word_kanji_optins (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vocabulary_id  uuid not null references public.vocabularies (id) on delete restrict,
  opted_in_at    timestamptz not null default now(),

  primary key (user_id, vocabulary_id)
);
comment on table public.learner_word_kanji_optins is
  'V9: người học bấm "Học dạng Kanji" cho từ KANJI_OPTIONAL. Bỏ chọn là xóa dòng; Stage đã mở không đóng lại.';

alter table public.learner_word_kanji_optins enable row level security;

drop policy if exists "Owner can read own kanji opt-ins" on public.learner_word_kanji_optins;
create policy "Owner can read own kanji opt-ins"
on public.learner_word_kanji_optins for select to authenticated
using ( (select auth.uid()) = user_id );

drop policy if exists "Owner can insert own kanji opt-ins" on public.learner_word_kanji_optins;
create policy "Owner can insert own kanji opt-ins"
on public.learner_word_kanji_optins for insert to authenticated
with check ( (select auth.uid()) = user_id );

drop policy if exists "Owner can delete own kanji opt-ins" on public.learner_word_kanji_optins;
create policy "Owner can delete own kanji opt-ins"
on public.learner_word_kanji_optins for delete to authenticated
using ( (select auth.uid()) = user_id );

revoke all on public.learner_word_kanji_optins from anon;
grant select, insert, delete on public.learner_word_kanji_optins to authenticated;

-- Xem xong thẻ Stage 4: mở Stage 5. Cần Stage 3 hoàn tất và chính sách cho phép:
--   KANJI_CORE / KANJI_DEFERRED: cấp Từ vựng Kanji của người học đã mở tới kanji_target_level;
--   KANJI_OPTIONAL: người học đã bấm "Học dạng Kanji";
--   chưa seed chính sách (null): theo cấp JLPT của từ như gói 2.
create or replace function public.open_word_kanji(p_learner_vocabulary_id uuid, p_seen_at timestamptz)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_vocab  uuid;
  v_policy text;
  v_target smallint;
  v_jlpt   smallint;
  v_level  smallint;
  v_ok     boolean;
begin
  if v_uid is null then
    raise exception 'open_word_kanji: not authenticated' using errcode = '28000';
  end if;
  select lv.vocabulary_id, v.kanji_policy, v.kanji_target_level, v.jlpt_level
    into v_vocab, v_policy, v_target, v_jlpt
    from public.learner_vocabulary lv
    join public.vocabularies v on v.id = lv.vocabulary_id
   where lv.id = p_learner_vocabulary_id and lv.user_id = v_uid;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if not exists (select 1 from public.learner_stage_schedules
                  where learner_vocabulary_id = p_learner_vocabulary_id and user_id = v_uid
                    and stage_number = 3 and completed_at is not null) then
    return jsonb_build_object('status', 'not_ready');
  end if;

  select coalesce((select jlpt_level from public.learner_skill_levels where user_id = v_uid and skill = 'word_kanji'), 5)
    into v_level;
  v_ok := case
    when v_policy in ('KANJI_CORE', 'KANJI_DEFERRED') then v_target >= v_level
    when v_policy = 'KANJI_OPTIONAL' then exists (select 1 from public.learner_word_kanji_optins
                                                   where user_id = v_uid and vocabulary_id = v_vocab)
    when v_policy is null then v_jlpt >= v_level
    else false
  end;
  -- Từ đã mở Stage 5 trước khi có chính sách vẫn được xem lại thẻ, không đóng lại
  if not v_ok and not exists (select 1 from public.learner_stage_schedules
                               where learner_vocabulary_id = p_learner_vocabulary_id and stage_number = 5) then
    return jsonb_build_object('status', 'not_allowed');
  end if;

  update public.learner_vocabulary
     set kanji_intro_seen_at = coalesce(kanji_intro_seen_at, p_seen_at),
         version = version + 1
   where id = p_learner_vocabulary_id and user_id = v_uid;
  insert into public.learner_stage_schedules (user_id, learner_vocabulary_id, stage_number, due_at)
  values (v_uid, p_learner_vocabulary_id, 5, p_seen_at)
  on conflict (learner_vocabulary_id, stage_number) do nothing;
  return jsonb_build_object('status', 'saved');
end;
$$;
comment on function public.open_word_kanji is
  'V9: xem xong thẻ Stage 4 thì mở Stage 5. Cần Stage 3 hoàn tất và chính sách Kanji của từ cho phép (§6a).';
revoke execute on function public.open_word_kanji from public, anon;
grant  execute on function public.open_word_kanji to authenticated;
