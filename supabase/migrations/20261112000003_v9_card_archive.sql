-- =============================================================================
-- Design V9, gói 4b: nút "Đã học xong" lưu trữ riêng một Card (R13). docs/learning-rules.md §15.
-- - review_cards.archived_at (learner_kanji_cards đã có từ 4a): Card không vào hàng đợi ôn, giữ nguyên lịch và log.
-- - card_events: lịch sử lưu trữ, khôi phục, học lại từ đầu, kèm trạng thái lịch trước đó.
-- - archive_card / restore_card: một transaction, chống gửi trùng bằng client_event_id.
-- - submit_review từ chối Card đã lưu trữ; relearn_card ("Review now") khôi phục Card đang lưu trữ.
-- Chỉ thêm; chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
alter table public.review_cards add column if not exists archived_at timestamptz;
comment on column public.review_cards.archived_at is
  'V9: người học bấm "Đã học xong" cho riêng Card này. Không vào Review; lịch và log giữ nguyên. Khác retired_at (V8, bỏ theo điểm).';

create table if not exists public.card_events (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_kind        text not null check (card_kind in ('vocab', 'kanji')),
  card_id          uuid not null,
  event            text not null check (event in ('archive', 'restore_keep', 'restore_reset')),
  -- Trạng thái lịch ngay trước sự kiện, để xem lại hoặc khôi phục tay
  schedule_before  jsonb not null,
  client_event_id  uuid not null,
  created_at       timestamptz not null default now(),

  constraint card_events_event_key unique (user_id, client_event_id)
);
comment on table public.card_events is 'V9: lịch sử lưu trữ / khôi phục / học lại từ đầu của từng Card. Chỉ thêm.';
create index if not exists card_events_card_idx on public.card_events (card_id, created_at desc);

alter table public.card_events enable row level security;
drop policy if exists "Owner can read own card events" on public.card_events;
create policy "Owner can read own card events" on public.card_events for select to authenticated
using ( (select auth.uid()) = user_id );
drop policy if exists "Owner can insert own card events" on public.card_events;
create policy "Owner can insert own card events" on public.card_events for insert to authenticated
with check ( (select auth.uid()) = user_id );
revoke all on public.card_events from anon;
grant select, insert on public.card_events to authenticated;

-- Lưu trữ một Card. Đã lưu trữ thì trả 'already', không ghi thêm sự kiện.
create or replace function public.archive_card(p_kind text, p_card_id uuid, p_client_event_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_before jsonb;
begin
  if v_uid is null then
    raise exception 'archive_card: not authenticated' using errcode = '28000';
  end if;
  if p_kind not in ('vocab', 'kanji') then
    return jsonb_build_object('status', 'invalid');
  end if;
  if exists (select 1 from public.card_events where user_id = v_uid and client_event_id = p_client_event_id) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  begin
    if p_kind = 'vocab' then
      update public.review_cards c
         set archived_at = now(), version = c.version + 1
       where c.id = p_card_id and c.user_id = v_uid and c.archived_at is null
      returning jsonb_build_object('state', c.state, 'due_at', c.due_at, 'stability', c.stability, 'difficulty', c.difficulty,
                                   'scheduled_days', c.scheduled_days, 'reps', c.reps, 'lapses', c.lapses, 'last_review_at', c.last_review_at)
        into v_before;
    else
      update public.learner_kanji_cards c
         set archived_at = now(), version = c.version + 1
       where c.id = p_card_id and c.user_id = v_uid and c.archived_at is null
      returning jsonb_build_object('state', c.state, 'due_at', c.due_at, 'stability', c.stability, 'difficulty', c.difficulty,
                                   'scheduled_days', c.scheduled_days, 'reps', c.reps, 'lapses', c.lapses, 'last_review_at', c.last_review_at)
        into v_before;
    end if;
    if v_before is null then
      if (p_kind = 'vocab' and exists (select 1 from public.review_cards where id = p_card_id and user_id = v_uid))
         or (p_kind = 'kanji' and exists (select 1 from public.learner_kanji_cards where id = p_card_id and user_id = v_uid)) then
        return jsonb_build_object('status', 'already');
      end if;
      return jsonb_build_object('status', 'not_found');
    end if;
    insert into public.card_events (user_id, card_kind, card_id, event, schedule_before, client_event_id)
    values (v_uid, p_kind, p_card_id, 'archive', v_before, p_client_event_id);
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicate');
  end;
  return jsonb_build_object('status', 'saved');
end;
$$;
comment on function public.archive_card is 'V9 R13: lưu trữ riêng một Card, giữ lịch và log, ghi sự kiện archive.';
revoke execute on function public.archive_card from public, anon;
grant  execute on function public.archive_card to authenticated;

-- Khôi phục một Card đang lưu trữ.
--   keep : giữ nguyên lịch; Card quá hạn vào hàng đợi như bình thường.
--   reset: đặt riêng Card đó về New, đến hạn ngay; log cũ giữ nguyên; ghi sự kiện kèm lịch cũ.
create or replace function public.restore_card(p_kind text, p_card_id uuid, p_mode text, p_client_event_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_reset  boolean := p_mode = 'reset';
  v_before jsonb;
begin
  if v_uid is null then
    raise exception 'restore_card: not authenticated' using errcode = '28000';
  end if;
  if p_kind not in ('vocab', 'kanji') or p_mode not in ('keep', 'reset') then
    return jsonb_build_object('status', 'invalid');
  end if;
  if exists (select 1 from public.card_events where user_id = v_uid and client_event_id = p_client_event_id) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  begin
    if p_kind = 'vocab' then
      select jsonb_build_object('state', state, 'due_at', due_at, 'stability', stability, 'difficulty', difficulty,
                                'scheduled_days', scheduled_days, 'reps', reps, 'lapses', lapses, 'last_review_at', last_review_at)
        into v_before
        from public.review_cards
       where id = p_card_id and user_id = v_uid and archived_at is not null
         for update;
      if v_before is null then
        return jsonb_build_object('status', case when exists (select 1 from public.review_cards where id = p_card_id and user_id = v_uid) then 'not_archived' else 'not_found' end);
      end if;
      update public.review_cards
         set archived_at    = null,
             state          = case when v_reset then 0 else state end,
             due_at         = case when v_reset then now() else due_at end,
             stability      = case when v_reset then 0 else stability end,
             difficulty     = case when v_reset then 0 else difficulty end,
             elapsed_days   = case when v_reset then 0 else elapsed_days end,
             scheduled_days = case when v_reset then 0 else scheduled_days end,
             learning_steps = case when v_reset then 0 else learning_steps end,
             reps           = case when v_reset then 0 else reps end,
             lapses         = case when v_reset then 0 else lapses end,
             last_review_at = case when v_reset then null else last_review_at end,
             version        = version + 1
       where id = p_card_id and user_id = v_uid;
    else
      select jsonb_build_object('state', state, 'due_at', due_at, 'stability', stability, 'difficulty', difficulty,
                                'scheduled_days', scheduled_days, 'reps', reps, 'lapses', lapses, 'last_review_at', last_review_at)
        into v_before
        from public.learner_kanji_cards
       where id = p_card_id and user_id = v_uid and archived_at is not null
         for update;
      if v_before is null then
        return jsonb_build_object('status', case when exists (select 1 from public.learner_kanji_cards where id = p_card_id and user_id = v_uid) then 'not_archived' else 'not_found' end);
      end if;
      update public.learner_kanji_cards
         set archived_at    = null,
             state          = case when v_reset then 0 else state end,
             due_at         = case when v_reset then now() else due_at end,
             stability      = case when v_reset then 0 else stability end,
             difficulty     = case when v_reset then 0 else difficulty end,
             scheduled_days = case when v_reset then 0 else scheduled_days end,
             learning_steps = case when v_reset then 0 else learning_steps end,
             reps           = case when v_reset then 0 else reps end,
             lapses         = case when v_reset then 0 else lapses end,
             last_review_at = case when v_reset then null else last_review_at end,
             version        = version + 1
       where id = p_card_id and user_id = v_uid;
    end if;
    insert into public.card_events (user_id, card_kind, card_id, event, schedule_before, client_event_id)
    values (v_uid, p_kind, p_card_id, case when v_reset then 'restore_reset' else 'restore_keep' end, v_before, p_client_event_id);
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicate');
  end;
  return jsonb_build_object('status', 'saved');
end;
$$;
comment on function public.restore_card is 'V9 R13: khôi phục Card đang lưu trữ, giữ tiến độ (keep) hoặc học lại từ đầu (reset); log cũ giữ nguyên.';
revoke execute on function public.restore_card from public, anon;
grant  execute on function public.restore_card to authenticated;

-- submit_review: Card đã lưu trữ không nhận câu ôn
do $$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'submit_review';
  if position('archived_at is null' in v_def) > 0 then
    return;
  end if;
  if position('and retired_at is null' in v_def) = 0 or position('select retired_at into v_retired' in v_def) = 0 then
    raise exception 'v9_card_archive: không tìm thấy chỗ sửa trong submit_review';
  end if;
  v_def := replace(v_def, 'and retired_at is null', 'and retired_at is null and archived_at is null');
  v_def := replace(v_def, 'select retired_at into v_retired', 'select coalesce(retired_at, archived_at) into v_retired');
  execute v_def;
end;
$$;

-- relearn_card ("Review now" ở trang chi tiết từ): Card đang lưu trữ thì khôi phục, giữ tiến độ
do $$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'relearn_card';
  if position('archived_at = null' in v_def) > 0 then
    return;
  end if;
  if position('retired_at = null,' in v_def) = 0 then
    raise exception 'v9_card_archive: không tìm thấy chỗ sửa trong relearn_card';
  end if;
  execute replace(v_def, 'retired_at = null,', 'retired_at = null, archived_at = null,');
end;
$$;
