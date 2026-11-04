-- =============================================================================
-- SRS-03 · Lưu một lần ôn an toàn: hàm submit_review (RPC)
-- Nguồn: docs/fsrs-notes.md §9 (SRS-02), docs/learning-rules.md R2, R6; OD-16.
--
-- Một lần ôn phải ghi 2 chỗ: cập nhật review_cards (lịch + điểm) VÀ thêm review_logs.
-- Hàm này làm cả hai trong MỘT transaction (một hàm Postgres luôn là all-or-nothing).
--
-- Ba cửa kiểm tra, theo thứ tự:
--   1. client_event_id đã có trong review_logs?  → 'duplicate' (bấm 2 lần / gửi lại), không ghi gì
--   2. card không tồn tại / không phải của mình   → 'not_found'
--      card đã bỏ (retired_at)                     → 'not_active'
--      version khác lúc server đọc (máy khác vừa ôn) → 'conflict', không ghi gì
--   3. qua hết → cập nhật card, version + 1, thêm 1 dòng nhật ký → 'saved'
--
-- Lịch và điểm do server tính bằng lib/srs (ts-fsrs) rồi truyền vào; hàm KHÔNG tự tính.
-- security invoker: chạy bằng quyền người gọi → RLS vẫn áp dụng.
-- Chỉ thêm, chạy lại nhiều lần vẫn an toàn.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. review_logs: thêm thông tin để nhật ký tự đủ nghĩa
-- -----------------------------------------------------------------------------
alter table public.review_logs
  add column if not exists card_points_delta smallint not null default 0
                                             check (card_points_delta between -1 and 2),  -- R2: −1/0/+1/+2
  add column if not exists state_after       smallint check (state_after between 0 and 3),
  add column if not exists exercise_type     text,
  add column if not exists response_time_ms  integer check (response_time_ms >= 0);


-- -----------------------------------------------------------------------------
-- 2. Hàm submit_review
-- -----------------------------------------------------------------------------
create or replace function public.submit_review(
  p_review_card_id    uuid,
  p_client_event_id   uuid,
  p_expected_version  integer,
  p_reviewed_at       timestamptz,
  -- lịch mới (từ lib/srs)
  p_state             smallint,
  p_due_at            timestamptz,
  p_stability         double precision,
  p_difficulty        double precision,
  p_scheduled_days    integer,
  p_learning_steps    integer,
  p_reps              integer,
  p_lapses            integer,
  -- điểm mới
  p_card_points       integer,
  p_retire            boolean,
  -- nhật ký
  p_rating            smallint,
  p_card_points_delta smallint,
  p_state_before      smallint,
  p_due_before        timestamptz,
  p_exercise_type     text    default null,
  p_response_time_ms  integer default null,
  p_study_date        date    default null,
  p_day_seq           integer default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_version integer;
  v_retired timestamptz;
begin
  if v_uid is null then
    raise exception 'submit_review: not authenticated' using errcode = '28000';
  end if;

  -- Cửa 1: lần gửi này đã được lưu trước đó?
  if exists (select 1 from public.review_logs
             where user_id = v_uid and client_event_id = p_client_event_id) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  begin
    -- Cửa 2 + 3: chỉ cập nhật khi card của mình, còn hoạt động, và version khớp
    update public.review_cards
       set state          = p_state,
           due_at         = p_due_at,
           stability      = p_stability,
           difficulty     = p_difficulty,
           scheduled_days = p_scheduled_days,
           learning_steps = p_learning_steps,
           reps           = p_reps,
           lapses         = p_lapses,
           last_review_at = p_reviewed_at,
           card_points    = p_card_points,
           retired_at     = case when p_retire then p_reviewed_at else null end,
           version        = version + 1
     where id = p_review_card_id
       and user_id = v_uid
       and retired_at is null
       and version = p_expected_version
    returning version into v_version;

    if not found then
      select retired_at into v_retired
        from public.review_cards
       where id = p_review_card_id and user_id = v_uid;
      if not found then
        return jsonb_build_object('status', 'not_found');
      elsif v_retired is not null then
        return jsonb_build_object('status', 'not_active');
      else
        return jsonb_build_object('status', 'conflict');
      end if;
    end if;

    insert into public.review_logs (
      user_id, review_card_id, client_event_id, rating, state_before, due_before,
      due_after, stability_after, difficulty_after, reviewed_at,
      card_points_delta, state_after, exercise_type, response_time_ms, study_date, day_seq
    ) values (
      v_uid, p_review_card_id, p_client_event_id, p_rating, p_state_before, p_due_before,
      p_due_at, p_stability, p_difficulty, p_reviewed_at,
      p_card_points_delta, p_state, p_exercise_type, p_response_time_ms, p_study_date, p_day_seq
    );
  exception when unique_violation then
    -- Hai request trùng chạy song song: request sau đụng UNIQUE (user_id, client_event_id).
    -- Khối begin…exception hoàn tác cả lệnh update ở trên → không cộng điểm 2 lần.
    return jsonb_build_object('status', 'duplicate');
  end;

  return jsonb_build_object('status', 'saved', 'version', v_version);
end;
$$;

comment on function public.submit_review is
  'SRS-03: lưu một lần ôn (review_cards + review_logs) trong một transaction; chống gửi trùng và ghi đè.';

revoke execute on function public.submit_review from public, anon;
grant  execute on function public.submit_review to authenticated;
