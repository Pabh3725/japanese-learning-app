-- =============================================================================
-- VOC-04 · Lưu kết quả bài tập & điểm stage: hàm submit_exercise (RPC)
-- Nguồn: docs/learning-rules.md R3, R4, R5; ENG-02 (lib/learning/stage.ts).
-- Cùng khuôn với SRS-03 (submit_review).
--
-- Một câu học ở Stage phải ghi tối đa 3 chỗ, trong MỘT transaction:
--   1. thêm 1 dòng exercise_logs        (nhật ký, chỉ thêm)
--   2. cập nhật learner_vocabulary      (điểm stage, stage mới nếu vừa qua)
--   3. thêm review_cards                (chỉ khi vừa qua stage — card mới)
-- KHÔNG sửa card đã có → không bao giờ đụng due_at của card cũ.
--
-- Ba cửa kiểm tra, theo thứ tự:
--   1. client_event_id đã có trong exercise_logs? → 'duplicate', không ghi gì
--   2. từ không tồn tại / không phải của mình     → 'not_found'
--      từ không còn ở stage đang trả lời          → 'stage_changed'
--      version khác lúc server đọc (máy khác vừa ghi) → 'conflict', không ghi gì
--   3. qua hết → ghi cả 3 chỗ → 'saved'
--
-- Điểm, stage mới và danh sách card do server tính bằng lib/learning (ENG-02) rồi
-- truyền vào; hàm KHÔNG tự tính luật. security invoker → RLS vẫn áp dụng.
-- Chỉ thêm, chạy lại nhiều lần vẫn an toàn.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. learner_vocabulary.version — chống hai máy ghi đè nhau (giống review_cards)
-- -----------------------------------------------------------------------------
alter table public.learner_vocabulary
  add column if not exists version integer not null default 0 check (version >= 0);


-- -----------------------------------------------------------------------------
-- 2. Hàm submit_exercise
-- -----------------------------------------------------------------------------
create or replace function public.submit_exercise(
  p_learner_vocabulary_id uuid,
  p_client_event_id       uuid,
  p_expected_version      integer,
  p_answered_at           timestamptz,
  -- câu vừa trả lời (→ exercise_logs)
  p_stage_number          smallint,      -- stage của từ LÚC trả lời
  p_exercise_type         text,
  p_outcome               text,          -- 'correct' | 'hint' | 'wrong'
  p_points                smallint,      -- điểm thực cộng/trừ: -1 / 0 / +1
  p_counted               boolean,
  p_study_date            date,          -- ngày học giờ VN
  p_day_seq               integer,       -- vị trí câu trong ngày
  -- trạng thái mới của từ (→ learner_vocabulary)
  p_new_stage             smallint,
  p_completed             boolean,       -- vừa xong vòng học ban đầu (qua Stage 5)
  p_stage_points          integer,
  p_stage_points_today    smallint,
  p_points_date           date,
  -- card mới (→ review_cards), rỗng nếu chưa qua stage
  p_new_card_types        public.card_type[] default '{}',
  p_new_cards_due_at      timestamptz         default null,  -- 00:00 ngày học hôm sau
  p_response_time_ms      integer             default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_version integer;
  v_stage   smallint;
  v_status  text;
  v_created integer := 0;
begin
  if v_uid is null then
    raise exception 'submit_exercise: not authenticated' using errcode = '28000';
  end if;
  if cardinality(p_new_card_types) > 0 and p_new_cards_due_at is null then
    raise exception 'submit_exercise: thiếu p_new_cards_due_at cho card mới' using errcode = '22023';
  end if;

  -- Cửa 1: lần gửi này đã được lưu trước đó?
  if exists (select 1 from public.exercise_logs
             where user_id = v_uid and client_event_id = p_client_event_id) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  begin
    -- Cửa 2: chỉ cập nhật khi từ của mình, đang học, đúng stage, version khớp
    update public.learner_vocabulary
       set current_stage       = p_new_stage,
           stage_points        = p_stage_points,
           stage_points_today  = p_stage_points_today,
           points_date         = p_points_date,
           last_question_date  = p_study_date,
           last_question_seq   = p_day_seq,
           last_practiced_at   = p_answered_at,
           learning_status     = case when p_completed then 'initial_complete' else learning_status end,
           stage5_completed_at = case when p_completed then p_answered_at else stage5_completed_at end,
           version             = version + 1
     where id = p_learner_vocabulary_id
       and user_id = v_uid
       and learning_status = 'learning'
       and current_stage = p_stage_number
       and version = p_expected_version
    returning version into v_version;

    if not found then
      select current_stage, learning_status into v_stage, v_status
        from public.learner_vocabulary
       where id = p_learner_vocabulary_id and user_id = v_uid;
      if not found then
        return jsonb_build_object('status', 'not_found');
      elsif v_status <> 'learning' or v_stage <> p_stage_number then
        return jsonb_build_object('status', 'stage_changed');
      else
        return jsonb_build_object('status', 'conflict');
      end if;
    end if;

    -- Ghi nhật ký
    insert into public.exercise_logs (
      user_id, learner_vocabulary_id, client_event_id, stage_number, exercise_type,
      outcome, points, counted, study_date, day_seq, response_time_ms, answered_at
    ) values (
      v_uid, p_learner_vocabulary_id, p_client_event_id, p_stage_number, p_exercise_type,
      p_outcome, p_points, p_counted, p_study_date, p_day_seq, p_response_time_ms, p_answered_at
    );

    -- Card mới khi vừa qua stage. Đã có card cùng loại thì bỏ qua (idempotent, R5).
    -- Các cột lịch FSRS lấy giá trị mặc định của bảng = card "New" (ts-fsrs createEmptyCard).
    if cardinality(p_new_card_types) > 0 then
      insert into public.review_cards (user_id, learner_vocabulary_id, card_type, due_at)
      select v_uid, p_learner_vocabulary_id, t, p_new_cards_due_at
        from unnest(p_new_card_types) as t
      on conflict (learner_vocabulary_id, card_type) do nothing;
      get diagnostics v_created = row_count;
    end if;
  exception when unique_violation then
    -- Hai request trùng chạy song song: request sau đụng UNIQUE (user_id, client_event_id).
    -- Khối begin…exception hoàn tác cả lệnh update ở trên → không cộng điểm 2 lần.
    return jsonb_build_object('status', 'duplicate');
  end;

  return jsonb_build_object('status', 'saved', 'version', v_version, 'cards_created', v_created);
end;
$$;

comment on function public.submit_exercise is
  'VOC-04: lưu một câu học Stage (exercise_logs + learner_vocabulary + card mới) trong một transaction; chống gửi trùng và ghi đè; không đụng card cũ.';

revoke execute on function public.submit_exercise from public, anon;
grant  execute on function public.submit_exercise to authenticated;
