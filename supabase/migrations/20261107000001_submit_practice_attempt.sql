-- =============================================================================
-- GAME-01 — Lưu một lượt Speed Matching (Luyện tập, vòng boss) trong một transaction.
-- Chỉ đổi điểm Card. KHÔNG đổi lịch Card (due_at, last_review_at, FSRS), lịch Stage
-- hay điểm Stage. Chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
create or replace function public.submit_practice_attempt(
  p_session_id        uuid,
  p_client_event_id   uuid,
  p_vocabulary_id     uuid,
  p_skill_code        text,
  p_is_correct        boolean,
  p_response_time_ms  integer,
  p_study_date        date,
  p_settings          jsonb,
  -- Null khi lượt này không đổi điểm Card nào
  p_review_card_id    uuid     default null,
  p_expected_version  integer  default null,
  p_card_points       integer  default null,
  p_card_points_delta smallint default 0,
  p_practice_today    smallint default null,
  p_retire            boolean  default false
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
    raise exception 'submit_practice_attempt: not authenticated' using errcode = '28000';
  end if;

  if exists (select 1 from public.practice_attempts
             where user_id = v_uid and client_event_id = p_client_event_id) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  begin
    insert into public.practice_sessions (id, user_id, game_code, settings)
    values (p_session_id, v_uid, 'speed_matching', p_settings)
    on conflict (id) do nothing;

    if p_review_card_id is not null then
      update public.review_cards
         set card_points           = p_card_points,
             practice_points_today = p_practice_today,
             practice_points_date  = p_study_date,
             retired_at            = case when p_retire then now() else null end,
             version               = version + 1
       where id = p_review_card_id
         and user_id = v_uid
         and retired_at is null
         and version = p_expected_version;
      if not found then
        return jsonb_build_object('status', 'conflict');
      end if;
    end if;

    insert into public.practice_attempts (
      user_id, practice_session_id, vocabulary_id, client_event_id, skill_code, is_correct,
      response_time_ms, review_card_id, card_points, study_date
    ) values (
      v_uid, p_session_id, p_vocabulary_id, p_client_event_id, p_skill_code, p_is_correct,
      p_response_time_ms, p_review_card_id, p_card_points_delta, p_study_date
    );
  exception when unique_violation then
    -- Hai request trùng chạy song song: khối này hoàn tác cả điểm Card vừa cập nhật
    return jsonb_build_object('status', 'duplicate');
  end;

  return jsonb_build_object('status', 'saved');
end;
$$;

comment on function public.submit_practice_attempt is
  'GAME-01: lưu một lượt practice và điểm Card; không đổi lịch ôn, lịch Stage hay điểm Stage.';

revoke execute on function public.submit_practice_attempt from public, anon;
grant  execute on function public.submit_practice_attempt to authenticated;
