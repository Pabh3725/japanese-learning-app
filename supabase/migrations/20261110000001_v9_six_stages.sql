-- =============================================================================
-- Design V9, gói 2: 6 Stage, hai nhánh. docs/learning-rules.md (RULES_V9) §3, §6, §7.
--   Từ vựng Kana:  1 → 2 → 3   (Stage 3 = Stage 5 của lộ trình v2)
--   Từ vựng Kanji: 4 → 5 → 6   (thẻ Stage 4 = thẻ Stage 3 của v2, Stage 5 = Stage 4 của v2)
-- Đổi số trên dữ liệu đang có (lịch Stage, nhật ký, current_stage), giữ nguyên điểm, lịch, Card và log.
-- Chạy lại an toàn: phần đổi số chỉ chạy một lần nhờ cờ trong public.app_migration_flags.
-- Hoàn tác: supabase/scripts/v9-six-stages-rollback.sql.
-- =============================================================================

-- Cờ đánh dấu bước dữ liệu đã chạy. Không ai ngoài người quản trị đọc hay ghi.
create table if not exists public.app_migration_flags (
  key        text primary key,
  applied_at timestamptz not null default now()
);
alter table public.app_migration_flags enable row level security;
revoke all on public.app_migration_flags from anon, authenticated;
comment on table public.app_migration_flags is 'Các bước đổi dữ liệu một lần đã chạy, để migration chạy lại không đổi số hai lần.';

-- 1. Đổi số Stage trên dữ liệu đang có. Hàm để test gọi được; chỉ người quản trị chạy.
-- p_only_user chỉ dùng trong test (supabase/tests/v9_stage_checks.sql) để không đụng dữ liệu người khác.
create or replace function public.v9_renumber_stages(p_only_user uuid default null)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_schedules integer := 0;
  v_logs      integer := 0;
  v_words     integer := 0;
  n           integer;
begin
  if exists (select 1 from public.app_migration_flags where key = 'v9_six_stages') then
    return jsonb_build_object('status', 'already_applied');
  end if;

  alter table public.learner_stage_schedules drop constraint if exists learner_stage_schedules_stage_number_check;

  -- Qua số tạm để không đụng khóa (learner_vocabulary_id, stage_number)
  update public.learner_stage_schedules set stage_number = 105 where stage_number = 4 and (p_only_user is null or user_id = p_only_user);
  get diagnostics n = row_count; v_schedules := v_schedules + n;
  update public.learner_stage_schedules set stage_number = 3 where stage_number = 5 and (p_only_user is null or user_id = p_only_user);
  get diagnostics n = row_count; v_schedules := v_schedules + n;
  update public.learner_stage_schedules set stage_number = 5 where stage_number = 105 and (p_only_user is null or user_id = p_only_user);

  -- Nhật ký không có khóa theo stage nên đổi trong một lệnh
  update public.exercise_logs
     set stage_number = case stage_number when 3 then 4 when 4 then 5 when 5 then 3 else stage_number end
   where stage_number in (3, 4, 5) and (p_only_user is null or user_id = p_only_user);
  get diagnostics v_logs = row_count;

  -- current_stage chỉ theo nhánh Từ vựng Kana. v2 giữ tối đa 5 (= Stage 3 mới).
  update public.learner_vocabulary set current_stage = 3 where current_stage = 5 and (p_only_user is null or user_id = p_only_user);
  get diagnostics v_words = row_count;

  alter table public.learner_stage_schedules
    add constraint learner_stage_schedules_stage_number_check check (stage_number in (2, 3, 5, 6));

  insert into public.app_migration_flags (key) values ('v9_six_stages');
  return jsonb_build_object('status', 'applied', 'schedules', v_schedules, 'logs', v_logs, 'words', v_words);
end;
$$;
revoke execute on function public.v9_renumber_stages from public, anon, authenticated;
comment on function public.v9_renumber_stages is 'V9: đổi số Stage v2 → V9 trên dữ liệu đang có, chạy một lần (cờ v9_six_stages).';

select public.v9_renumber_stages();

alter table public.learner_stage_schedules drop constraint if exists learner_stage_schedules_stage_number_check;
alter table public.learner_stage_schedules
  add constraint learner_stage_schedules_stage_number_check check (stage_number in (2, 3, 5, 6));
comment on table public.learner_stage_schedules is
  'Design V9: điểm và lịch FSRS của một từ ở một Stage tính điểm (2, 3, 5, 6). Tối đa 2 ngày, không có Easy.';
comment on column public.learner_vocabulary.stage5_completed_at is
  'Design V9: thời điểm từ xong nhánh Từ vựng Kana (Stage 2 và 3). Tên cột giữ từ V7.';
comment on column public.learner_vocabulary.current_stage is
  'Design V9: Stage xa nhất của nhánh Từ vựng Kana (1–3). Nhánh Từ vựng Kanji đọc từ learner_stage_schedules.';

-- 2. Lưu một câu Stage: current_stage không vượt 3 (mở Stage 6 không đổi current_stage)
do $$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'submit_stage_exercise';
  if position('least(3, greatest(current_stage' in v_def) > 0 then
    return;
  end if;
  if position('least(5, greatest(current_stage' in v_def) = 0 then
    raise exception 'v9_six_stages: không tìm thấy đoạn current_stage cần sửa trong submit_stage_exercise';
  end if;
  execute replace(v_def, 'least(5, greatest(current_stage', 'least(3, greatest(current_stage');
end;
$$;

-- 3. Vòng ghép ô chạy ở Stage 3: nhật ký trừ điểm ghi đúng số stage
do $$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'apply_match_penalties';
  if position('p_client_event_ids[i], 3, ''match_round''' in v_def) > 0 then
    return;
  end if;
  if position('p_client_event_ids[i], 5, ''match_round''' in v_def) = 0 then
    raise exception 'v9_six_stages: không tìm thấy số stage cần sửa trong apply_match_penalties';
  end if;
  execute replace(v_def, 'p_client_event_ids[i], 5, ''match_round''', 'p_client_event_ids[i], 3, ''match_round''');
end;
$$;

-- 4. Xem xong thẻ Stage 4: mở Stage 5. Cần Stage 3 đã hoàn tất; không cần chữ thành phần.
create or replace function public.open_word_kanji(p_learner_vocabulary_id uuid, p_seen_at timestamptz)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'open_word_kanji: not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from public.learner_vocabulary where id = p_learner_vocabulary_id and user_id = v_uid) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if not exists (select 1 from public.learner_stage_schedules
                  where learner_vocabulary_id = p_learner_vocabulary_id and user_id = v_uid
                    and stage_number = 3 and completed_at is not null) then
    return jsonb_build_object('status', 'not_ready');
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
  'V9: xem xong thẻ Stage 4 thì mở Stage 5. Chỉ khi Stage 3 đã hoàn tất; gọi lại nhiều lần vẫn một lịch.';
revoke execute on function public.open_word_kanji from public, anon;
grant  execute on function public.open_word_kanji to authenticated;

-- 5. Học lại Stage: chỉ stage của nhánh Từ vựng Kana làm từ quay lại trạng thái đang học
create or replace function public.relearn_stage(p_schedule_id uuid, p_stage_points integer)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_lv    uuid;
  v_stage smallint;
begin
  if v_uid is null then
    raise exception 'relearn_stage: not authenticated' using errcode = '28000';
  end if;

  update public.learner_stage_schedules
     set completed_at = null,
         stage_points = least(stage_points, p_stage_points),
         due_at       = now(),
         version      = version + 1
   where id = p_schedule_id
     and user_id = v_uid
     and completed_at is not null
  returning learner_vocabulary_id, stage_number into v_lv, v_stage;
  if not found then
    return jsonb_build_object('status', 'not_completed');
  end if;

  -- Từ đã xong nhánh Từ vựng Kana quay lại Learn. current_stage không lùi, Card đã có giữ nguyên.
  if v_stage in (2, 3) then
    update public.learner_vocabulary
       set learning_status     = 'learning',
           stage5_completed_at = null,
           version             = version + 1
     where id = v_lv
       and user_id = v_uid;
  end if;

  return jsonb_build_object('status', 'saved');
end;
$$;
comment on function public.relearn_stage is
  'Học lại Stage: mở lại stage đã hoàn tất và lùi điểm; không đổi current_stage và Card.';
revoke execute on function public.relearn_stage from public, anon;
grant  execute on function public.relearn_stage to authenticated;
