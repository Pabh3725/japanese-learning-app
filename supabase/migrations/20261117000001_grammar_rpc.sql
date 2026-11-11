-- =============================================================================
-- Grammar G4: hàm lưu câu (một transaction mỗi lần, chống gửi trùng, kiểm tra version).
-- - submit_grammar_learning: câu giai đoạn Học → nhật ký + điểm + buổi kế tiếp (hoặc sang Ôn khi học xong).
-- - submit_grammar_review: câu Ôn → nhật ký; câu cuối của lượt thì đổi lịch FSRS một lần (gộp kết quả ở server).
-- Luyện thêm và Kiểm tra chỉ ghi nhật ký/bài kiểm tra (RLS), không cần hàm riêng.
-- Chỉ thêm; chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
alter table public.learner_grammar add column if not exists last_review_round uuid;
comment on column public.learner_grammar.last_review_round is 'Lượt ôn gần nhất đã đổi lịch; chống đổi lịch hai lần cho cùng một lượt.';

create or replace function public.submit_grammar_learning(
  p_learner_grammar_id uuid,
  p_client_event_id    uuid,
  p_expected_version   integer,
  p_sentence_id        uuid,
  p_exercise_type      text,
  p_tier               smallint,
  p_outcome            text,
  p_points             smallint,
  p_study_date         date,
  p_response_time_ms   integer,
  p_answered_at        timestamptz,
  -- Trạng thái mới
  p_phase              text,
  p_total_points       integer,
  p_points_today       smallint,
  p_points_date        date,
  p_state              smallint,
  p_due_at             timestamptz,
  p_stability          double precision,
  p_difficulty         double precision,
  p_scheduled_days     integer,
  p_learning_steps     integer,
  p_reps               integer,
  p_lapses             integer,
  p_last_review_at     timestamptz,
  p_completed          boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_point uuid;
  v_phase text;
begin
  if v_uid is null then
    raise exception 'submit_grammar_learning: not authenticated' using errcode = '28000';
  end if;
  if exists (select 1 from public.grammar_logs where user_id = v_uid and client_event_id = p_client_event_id) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  begin
    select point_id, phase into v_point, v_phase from public.learner_grammar where id = p_learner_grammar_id and user_id = v_uid;
    if not found then
      return jsonb_build_object('status', 'not_found');
    end if;
    if v_phase <> 'learning' then
      return jsonb_build_object('status', 'not_active');
    end if;

    update public.learner_grammar
       set phase          = p_phase,
           points         = p_total_points,
           points_today   = p_points_today,
           points_date    = p_points_date,
           state          = p_state,
           due_at         = p_due_at,
           stability      = p_stability,
           difficulty     = p_difficulty,
           scheduled_days = p_scheduled_days,
           learning_steps = p_learning_steps,
           reps           = p_reps,
           lapses         = p_lapses,
           last_review_at = p_last_review_at,
           completed_at   = case when p_completed then p_answered_at else completed_at end,
           version        = version + 1
     where id = p_learner_grammar_id and user_id = v_uid and version = p_expected_version;
    if not found then
      return jsonb_build_object('status', 'conflict');
    end if;

    insert into public.grammar_logs (user_id, learner_grammar_id, point_id, sentence_id, client_event_id, mode, exercise_type, tier, outcome, points, study_date, response_time_ms, answered_at)
    values (v_uid, p_learner_grammar_id, v_point, p_sentence_id, p_client_event_id, 'learning', p_exercise_type, p_tier, p_outcome, p_points, p_study_date, p_response_time_ms, p_answered_at);
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicate');
  end;

  return jsonb_build_object('status', 'saved');
end;
$$;

comment on function public.submit_grammar_learning is 'Grammar §6: lưu một câu Học (nhật ký + điểm + lịch buổi) trong một transaction; chống gửi trùng.';

create or replace function public.submit_grammar_review(
  p_learner_grammar_id uuid,
  p_client_event_id    uuid,
  p_round_id           uuid,
  p_sentence_id        uuid,
  p_exercise_type      text,
  p_outcome            text,
  p_study_date         date,
  p_response_time_ms   integer,
  p_answered_at        timestamptz,
  -- Câu cuối của lượt: lịch mới (đã gộp kết quả ở server)
  p_finish             boolean,
  p_expected_version   integer,
  p_state              smallint,
  p_due_at             timestamptz,
  p_stability          double precision,
  p_difficulty         double precision,
  p_scheduled_days     integer,
  p_learning_steps     integer,
  p_reps               integer,
  p_lapses             integer,
  p_last_review_at     timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_point uuid;
  v_phase text;
  v_last  uuid;
begin
  if v_uid is null then
    raise exception 'submit_grammar_review: not authenticated' using errcode = '28000';
  end if;
  if exists (select 1 from public.grammar_logs where user_id = v_uid and client_event_id = p_client_event_id) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  begin
    select point_id, phase, last_review_round into v_point, v_phase, v_last from public.learner_grammar where id = p_learner_grammar_id and user_id = v_uid;
    if not found then
      return jsonb_build_object('status', 'not_found');
    end if;
    if v_phase <> 'review' then
      return jsonb_build_object('status', 'not_active');
    end if;

    insert into public.grammar_logs (user_id, learner_grammar_id, point_id, sentence_id, client_event_id, mode, exercise_type, outcome, points, round_id, study_date, response_time_ms, answered_at)
    values (v_uid, p_learner_grammar_id, v_point, p_sentence_id, p_client_event_id, 'review', p_exercise_type, p_outcome, 0, p_round_id, p_study_date, p_response_time_ms, p_answered_at);

    if p_finish and v_last is distinct from p_round_id then
      update public.learner_grammar
         set state             = p_state,
             due_at            = p_due_at,
             stability         = p_stability,
             difficulty        = p_difficulty,
             scheduled_days    = p_scheduled_days,
             learning_steps    = p_learning_steps,
             reps              = p_reps,
             lapses            = p_lapses,
             last_review_at    = p_last_review_at,
             last_review_round = p_round_id,
             version           = version + 1
       where id = p_learner_grammar_id and user_id = v_uid and version = p_expected_version;
      if not found then
        raise exception 'submit_grammar_review: conflict' using errcode = '40001';
      end if;
    end if;
  exception
    when unique_violation then
      return jsonb_build_object('status', 'duplicate');
    when serialization_failure then
      return jsonb_build_object('status', 'conflict');
  end;

  return jsonb_build_object('status', 'saved');
end;
$$;

comment on function public.submit_grammar_review is 'Grammar §7: lưu một câu Ôn; câu cuối của lượt đổi lịch FSRS một lần (last_review_round chống đổi hai lần).';

revoke execute on function public.submit_grammar_learning from public, anon;
revoke execute on function public.submit_grammar_review from public, anon;
grant execute on function public.submit_grammar_learning to authenticated;
grant execute on function public.submit_grammar_review to authenticated;
