-- Hoàn tác supabase/migrations/20261110000001_v9_six_stages.sql: trả số Stage về lộ trình v2.
-- Chỉ dùng khi phải quay lại code v2 (nhánh feature/path-v2). Không xóa dữ liệu nào.
-- Card Kana tạo ở Stage 3 trong lúc chạy V9 vẫn giữ (v2 cũng có Card này, chỉ tạo sớm hơn).
-- Chạy một lần trong SQL Editor; nếu cờ không còn thì script không làm gì.
begin;

do $$
begin
  if not exists (select 1 from public.app_migration_flags where key = 'v9_six_stages') then
    raise notice 'Chưa chạy V9 hoặc đã hoàn tác, bỏ qua.';
    return;
  end if;

  alter table public.learner_stage_schedules drop constraint if exists learner_stage_schedules_stage_number_check;
  update public.learner_stage_schedules set stage_number = 104 where stage_number = 5;
  update public.learner_stage_schedules set stage_number = 5 where stage_number = 3;
  update public.learner_stage_schedules set stage_number = 4 where stage_number = 104;
  alter table public.learner_stage_schedules
    add constraint learner_stage_schedules_stage_number_check check (stage_number in (2, 4, 5, 6));

  update public.exercise_logs
     set stage_number = case stage_number when 3 then 5 when 4 then 3 when 5 then 4 else stage_number end
   where stage_number in (3, 4, 5);

  update public.learner_vocabulary set current_stage = 5 where current_stage = 3;

  delete from public.app_migration_flags where key = 'v9_six_stages';
end;
$$;

-- Hàm về bản v2
do $$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'submit_stage_exercise';
  execute replace(v_def, 'least(3, greatest(current_stage', 'least(5, greatest(current_stage');

  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'apply_match_penalties';
  execute replace(v_def, 'p_client_event_ids[i], 3, ''match_round''', 'p_client_event_ids[i], 5, ''match_round''');
end;
$$;

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
  update public.learner_vocabulary
     set kanji_intro_seen_at = coalesce(kanji_intro_seen_at, p_seen_at),
         version = version + 1
   where id = p_learner_vocabulary_id and user_id = v_uid;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  insert into public.learner_stage_schedules (user_id, learner_vocabulary_id, stage_number, due_at)
  values (v_uid, p_learner_vocabulary_id, 4, p_seen_at)
  on conflict (learner_vocabulary_id, stage_number) do nothing;
  return jsonb_build_object('status', 'saved');
end;
$$;

commit;
