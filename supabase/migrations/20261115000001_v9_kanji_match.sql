-- =============================================================================
-- Design V9, gói 7: vòng ghép chữ Kanji (R12 dạng F) trong bài Learn.
-- Ghép sai chữ nào thì chữ đó (đang ở giai đoạn Học) bị trừ điểm Học, mỗi chữ một lần mỗi vòng.
-- Không đổi lịch, không phải câu của buổi Học: ghi vào bảng riêng để không bị đếm vào số câu trong buổi,
-- thứ tự câu trong ngày hay giãn cách. Chữ đang ôn bằng Card không bị ảnh hưởng.
-- Chỉ thêm; chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
create table if not exists public.kanji_match_penalties (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references auth.users (id) on delete cascade,
  learner_kanji_id  uuid not null references public.learner_kanji (id) on delete cascade,
  client_event_id   uuid not null,
  points            smallint not null check (points < 0),
  study_date        date not null,
  answered_at       timestamptz not null default now(),
  constraint kanji_match_penalties_event_unique unique (user_id, client_event_id)
);
create index if not exists kanji_match_penalties_lk_idx on public.kanji_match_penalties (learner_kanji_id);
comment on table public.kanji_match_penalties is 'V9 R12 dạng F: điểm Học bị trừ khi ghép sai trong vòng ghép chữ của bài Learn.';

alter table public.kanji_match_penalties enable row level security;
drop policy if exists "Users read own kanji_match_penalties" on public.kanji_match_penalties;
create policy "Users read own kanji_match_penalties" on public.kanji_match_penalties for select to authenticated using ( (select auth.uid()) = user_id );
drop policy if exists "Users insert own kanji_match_penalties" on public.kanji_match_penalties;
create policy "Users insert own kanji_match_penalties" on public.kanji_match_penalties for insert to authenticated with check ( (select auth.uid()) = user_id );
revoke all on public.kanji_match_penalties from anon;
revoke update, delete, truncate on public.kanji_match_penalties from authenticated;
grant select, insert on public.kanji_match_penalties to authenticated;

create or replace function public.apply_kanji_match_penalties(
  p_learner_kanji_ids uuid[],
  p_client_event_ids  uuid[],
  p_points            smallint,
  p_study_date        date,
  p_answered_at       timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_applied integer := 0;
begin
  if v_uid is null then
    raise exception 'apply_kanji_match_penalties: not authenticated' using errcode = '28000';
  end if;
  if cardinality(p_learner_kanji_ids) <> cardinality(p_client_event_ids) then
    raise exception 'apply_kanji_match_penalties: hai danh sách phải cùng độ dài' using errcode = '22023';
  end if;
  if p_points >= 0 then
    raise exception 'apply_kanji_match_penalties: chỉ được trừ điểm' using errcode = '22023';
  end if;

  for i in 1 .. coalesce(cardinality(p_learner_kanji_ids), 0) loop
    -- Gửi lại cùng mã thì bỏ qua, không trừ hai lần
    continue when exists (select 1 from public.kanji_match_penalties
                           where user_id = v_uid and client_event_id = p_client_event_ids[i]);
    begin
      -- Chỉ đổi điểm, không đụng lịch; điểm không xuống dưới 0
      update public.learner_kanji
         set points = greatest(0, points + p_points), version = version + 1
       where id = p_learner_kanji_ids[i] and user_id = v_uid and phase = 'learning';
      continue when not found;

      insert into public.kanji_match_penalties (user_id, learner_kanji_id, client_event_id, points, study_date, answered_at)
      values (v_uid, p_learner_kanji_ids[i], p_client_event_ids[i], p_points, p_study_date, p_answered_at);
      v_applied := v_applied + 1;
    exception when unique_violation then
      null; -- hai request trùng chạy song song: lần sau bị hoàn tác
    end;
  end loop;

  return jsonb_build_object('status', 'saved', 'applied', v_applied);
end;
$$;

comment on function public.apply_kanji_match_penalties is
  'V9 R12 dạng F: trừ điểm Học các chữ bị ghép sai trong vòng ghép chữ, không đổi lịch; chống gửi trùng.';

revoke execute on function public.apply_kanji_match_penalties from public, anon;
grant  execute on function public.apply_kanji_match_penalties to authenticated;
