-- =============================================================================
-- Vòng ghép ô ở Stage 5: ghép sai bị trừ điểm stage, mỗi từ một lần mỗi vòng.
-- Nguồn: docs/PROJECT_SPEC.md §18.3a.
--
-- Không đổi lịch, không đạt kỹ năng. Nhật ký ghi source = 'match' để luật giãn cách
-- và số thứ tự câu trong ngày bỏ qua các dòng này. Chỉ thêm, chạy lại vẫn an toàn.
-- =============================================================================
alter table public.exercise_logs
  add column if not exists source text not null default 'lesson' check (source in ('lesson', 'match'));

create or replace function public.apply_match_penalties(
  p_schedule_ids     uuid[],
  p_client_event_ids uuid[],
  p_points           smallint,
  p_study_date       date,
  p_answered_at      timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_lv      uuid;
  v_applied integer := 0;
begin
  if v_uid is null then
    raise exception 'apply_match_penalties: not authenticated' using errcode = '28000';
  end if;
  if cardinality(p_schedule_ids) <> cardinality(p_client_event_ids) then
    raise exception 'apply_match_penalties: hai danh sách phải cùng độ dài' using errcode = '22023';
  end if;
  if p_points > 0 then
    raise exception 'apply_match_penalties: chỉ được trừ điểm' using errcode = '22023';
  end if;

  for i in 1 .. coalesce(cardinality(p_schedule_ids), 0) loop
    -- Gửi lại cùng mã thì bỏ qua, không trừ hai lần
    continue when exists (select 1 from public.exercise_logs
                           where user_id = v_uid and client_event_id = p_client_event_ids[i]);
    begin
      -- Chỉ đổi điểm, không đụng lịch
      update public.learner_stage_schedules
         set stage_points = stage_points + p_points, version = version + 1
       where id = p_schedule_ids[i] and user_id = v_uid and completed_at is null
      returning learner_vocabulary_id into v_lv;
      continue when not found;

      insert into public.exercise_logs (
        user_id, learner_vocabulary_id, client_event_id, stage_number, exercise_type,
        outcome, points, counted, study_date, day_seq, answered_at, source
      ) values (
        v_uid, v_lv, p_client_event_ids[i], 5, 'match_round',
        'wrong', p_points, true, p_study_date, 1, p_answered_at, 'match'
      );
      v_applied := v_applied + 1;
    exception when unique_violation then
      null; -- hai request trùng chạy song song: lần sau bị hoàn tác
    end;
  end loop;

  return jsonb_build_object('status', 'saved', 'applied', v_applied);
end;
$$;

comment on function public.apply_match_penalties is
  'Vòng ghép ô: trừ điểm stage các từ bị ghép sai, không đổi lịch; chống gửi trùng.';

revoke execute on function public.apply_match_penalties from public, anon;
grant  execute on function public.apply_match_penalties to authenticated;
