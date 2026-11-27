-- =============================================================================
-- Grammar V3 (docs/grammar-rules-v3.md): bài 5 câu, lịch 3 ngày, ôn 4 câu mỗi mẫu.
-- - learner_grammar: ngày Intro của mẫu đang học (1 = Intro 1 + 2, 2 = Intro 3), ngày qua bước gần nhất,
--   điểm từng bài ({"1:0": {"c": 4, "n": 1, "d": "2026-11-28"}} — c câu đúng cộng dồn, n số lần làm, d ngày làm gần nhất).
-- - Chuyển tiến độ: mẫu đang học (phase learning) học lại từ ngày 1; mẫu đã có lịch ôn giữ nguyên FSRS.
-- - submit_grammar_v3: lưu một bài (nhật ký từng câu + tiến độ các mẫu) trong một transaction, chống gửi trùng.
-- Chỉ thêm; chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
alter table public.learner_grammar add column if not exists v3_day smallint not null default 1;
alter table public.learner_grammar add column if not exists v3_day_date date;
alter table public.learner_grammar add column if not exists v3_scores jsonb not null default '{}'::jsonb;
alter table public.learner_grammar drop constraint if exists learner_grammar_v3_day_check;
alter table public.learner_grammar add constraint learner_grammar_v3_day_check check (v3_day in (1, 2));
alter table public.learner_grammar drop constraint if exists learner_grammar_v3_scores_check;
alter table public.learner_grammar add constraint learner_grammar_v3_scores_check check (jsonb_typeof(v3_scores) = 'object');
comment on column public.learner_grammar.v3_day is 'Grammar V3: ngày Intro của mẫu đang học (1 = Intro 1 + 2, 2 = Intro 3).';
comment on column public.learner_grammar.v3_day_date is 'Grammar V3: ngày (giờ VN) chuyển sang ngày Intro hiện tại; bài ngày 2 mở từ hôm sau.';
comment on column public.learner_grammar.v3_scores is 'Grammar V3: điểm từng bài Intro, khoá "ngày:thứ tự bài" → {c: câu đúng cộng dồn, n: số lần làm, d: ngày làm gần nhất}.';

-- Mẫu học dở theo luật cũ (điểm 0–40, 5 buổi) học lại từ ngày 1 theo V3 (chủ dự án 2026-11-27).
-- Chỉ đổi những dòng chưa có điểm V3, để chạy lại migration không xoá tiến độ V3.
update public.learner_grammar
   set v3_day = 1, v3_day_date = null, due_at = now(), version = version + 1
 where phase = 'learning' and v3_scores = '{}'::jsonb and v3_day_date is null;

create or replace function public.submit_grammar_v3(
  p_mode        text,
  p_logs        jsonb,
  p_updates     jsonb,
  p_study_date  date,
  p_answered_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_count integer;
  r       record;
begin
  if v_uid is null then
    raise exception 'submit_grammar_v3: not authenticated' using errcode = '28000';
  end if;
  if p_mode not in ('learning', 'review') or jsonb_typeof(p_logs) <> 'array' or jsonb_array_length(p_logs) = 0 or jsonb_typeof(p_updates) <> 'array' then
    return jsonb_build_object('status', 'invalid');
  end if;
  if exists (select 1 from public.grammar_logs where user_id = v_uid and client_event_id = (p_logs -> 0 ->> 'client_event_id')::uuid) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  begin
    insert into public.grammar_logs (user_id, learner_grammar_id, point_id, sentence_id, client_event_id, mode, exercise_type, tier, outcome, points, round_id, study_date, response_time_ms, answered_at)
    select v_uid, x.learner_grammar_id, lg.point_id, x.sentence_id, x.client_event_id, p_mode, x.exercise_type, x.tier, x.outcome,
           case when p_mode = 'learning' then x.points else 0 end, x.round_id, p_study_date, x.response_time_ms, p_answered_at
      from jsonb_to_recordset(p_logs) as x(learner_grammar_id uuid, sentence_id uuid, client_event_id uuid, exercise_type text, tier smallint,
                                           outcome text, points smallint, round_id uuid, response_time_ms integer)
      join public.learner_grammar lg on lg.id = x.learner_grammar_id and lg.user_id = v_uid;
    get diagnostics v_count = row_count;
    if v_count <> jsonb_array_length(p_logs) then
      raise exception 'submit_grammar_v3: not found' using errcode = 'P0002';
    end if;

    for r in
      select * from jsonb_to_recordset(p_updates) as u(id uuid, expected_version integer, phase text, v3_day smallint, v3_day_date date, v3_scores jsonb,
                                                     state smallint, due_at timestamptz, stability double precision, difficulty double precision,
                                                     scheduled_days integer, learning_steps integer, reps integer, lapses integer,
                                                     last_review_at timestamptz, completed boolean, review_round uuid)
    loop
      update public.learner_grammar
         set phase             = r.phase,
             v3_day            = r.v3_day,
             v3_day_date       = r.v3_day_date,
             v3_scores         = r.v3_scores,
             state             = r.state,
             due_at            = r.due_at,
             stability         = r.stability,
             difficulty        = r.difficulty,
             scheduled_days    = r.scheduled_days,
             learning_steps    = r.learning_steps,
             reps              = r.reps,
             lapses            = r.lapses,
             last_review_at    = r.last_review_at,
             completed_at      = case when r.completed then p_answered_at when r.phase = 'learning' then null else completed_at end,
             last_review_round = coalesce(r.review_round, last_review_round),
             version           = version + 1
       where id = r.id and user_id = v_uid and version = r.expected_version;
      if not found then
        raise exception 'submit_grammar_v3: conflict' using errcode = '40001';
      end if;
    end loop;
  exception
    when unique_violation then
      return jsonb_build_object('status', 'duplicate');
    when serialization_failure then
      return jsonb_build_object('status', 'conflict');
    when no_data_found then
      return jsonb_build_object('status', 'not_found');
  end;

  return jsonb_build_object('status', 'saved');
end;
$$;

comment on function public.submit_grammar_v3 is 'Grammar V3: lưu một bài 5 câu (nhật ký từng câu + tiến độ các mẫu liên quan) trong một transaction; chống gửi trùng, kiểm tra version.';

revoke execute on function public.submit_grammar_v3 from public, anon;
grant execute on function public.submit_grammar_v3 to authenticated;
