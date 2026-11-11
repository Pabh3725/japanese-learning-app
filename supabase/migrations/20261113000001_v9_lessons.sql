-- =============================================================================
-- Design V9, gói 5b: bài Learn và AIS. docs/learning-rules.md §9, §14 (R7, R11).
-- - learn_lessons: một bài đang làm của người học, trạng thái AIS (JSON) và bước đang hiện, để thoát rồi vào lại.
-- - learn_micro_logs: câu kiểm tra nhanh. Không có điểm, không đổi lịch, không tính ngân sách;
--   chỉ đặt mốc giãn cách (day_seq = câu tính điểm gần nhất trong ngày, không tăng).
-- - kanji_logs.day_seq: câu Học Kanji và câu Card Kanji cũng là câu tính điểm, nên được đếm vào thứ tự trong ngày
--   cùng câu Stage (R3: gap đếm mọi câu tính điểm trong Learn).
-- - learner_settings: ngân sách Learn chung (thay stage_cap, word_kanji_cap) và số câu mỗi bài.
-- Chỉ thêm; chạy lại nhiều lần vẫn an toàn.
-- =============================================================================
alter table public.learner_settings add column if not exists learn_cap smallint not null default 200 check (learn_cap between 20 and 1000);
alter table public.learner_settings add column if not exists lesson_size smallint not null default 50 check (lesson_size between 20 and 100);
comment on column public.learner_settings.learn_cap is 'V9 R7: câu Learn tối đa mỗi ngày, chung cho Từ vựng, Từ vựng Kanji và câu Học Kanji. Thay stage_cap, word_kanji_cap.';
comment on column public.learner_settings.lesson_size is 'V9 R7: số câu mỗi bài Learn (20–100), tính cả câu kiểm tra nhanh.';
-- Người đã chỉnh trần câu Stage thì giữ con số đó làm ngân sách chung
update public.learner_settings set learn_cap = stage_cap where stage_cap <> 200 and learn_cap = 200 and stage_cap between 20 and 1000;

alter table public.kanji_logs add column if not exists day_seq integer check (day_seq >= 1);

create table if not exists public.learn_lessons (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  study_date  date not null,
  groups      text[] not null check (groups <@ array['vocabulary', 'word_kanji', 'kanji']::text[] and cardinality(groups) > 0),
  status      text not null default 'active' check (status in ('active', 'finished', 'abandoned')),
  end_reason  text check (end_reason in ('target', 'budget', 'empty', 'quit')),
  -- Trạng thái AIS (lib/learn/ais.ts) và bước đang hiện cho người học
  state       jsonb not null,
  step        jsonb,
  step_no     integer not null default 0 check (step_no >= 0),
  version     integer not null default 0 check (version >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.learn_lessons is 'V9 R11: bài Learn. Một bài active mỗi người; sang ngày mới thì bài cũ bị bỏ.';
create unique index if not exists learn_lessons_one_active_idx on public.learn_lessons (user_id) where status = 'active';
create index if not exists learn_lessons_user_date_idx on public.learn_lessons (user_id, study_date);

drop trigger if exists set_updated_at on public.learn_lessons;
create trigger set_updated_at before update on public.learn_lessons for each row execute function public.set_updated_at();

alter table public.learn_lessons enable row level security;
drop policy if exists "Owner can read own lessons" on public.learn_lessons;
create policy "Owner can read own lessons" on public.learn_lessons for select to authenticated
using ( (select auth.uid()) = user_id );
drop policy if exists "Owner can insert own lessons" on public.learn_lessons;
create policy "Owner can insert own lessons" on public.learn_lessons for insert to authenticated
with check ( (select auth.uid()) = user_id );
drop policy if exists "Owner can update own lessons" on public.learn_lessons;
create policy "Owner can update own lessons" on public.learn_lessons for update to authenticated
using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );
revoke all on public.learn_lessons from anon;
grant select, insert, update on public.learn_lessons to authenticated;

create table if not exists public.learn_micro_logs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id        uuid references public.learn_lessons (id) on delete set null,
  -- Mốc giãn cách: từ (learner_vocabulary) hoặc chữ (learner_kanji)
  learner_vocabulary_id uuid references public.learner_vocabulary (id) on delete cascade,
  learner_kanji_id      uuid references public.learner_kanji (id) on delete cascade,
  item_key         text not null,
  exercise_type    text not null,
  outcome          text not null check (outcome in ('correct', 'hint', 'wrong')),
  study_date       date not null,
  day_seq          integer not null check (day_seq >= 0),
  client_event_id  uuid not null,
  answered_at      timestamptz not null default now(),

  constraint learn_micro_logs_event_key unique (user_id, client_event_id),
  constraint learn_micro_logs_anchor check ((learner_vocabulary_id is null) <> (learner_kanji_id is null))
);
comment on table public.learn_micro_logs is 'V9 R2: câu kiểm tra nhanh trong bài Learn. Không có điểm, không đổi lịch, không tính ngân sách; chỉ đặt mốc giãn cách.';
create index if not exists learn_micro_logs_word_idx on public.learn_micro_logs (learner_vocabulary_id, study_date, day_seq desc) where learner_vocabulary_id is not null;

alter table public.learn_micro_logs enable row level security;
drop policy if exists "Owner can read own micro logs" on public.learn_micro_logs;
create policy "Owner can read own micro logs" on public.learn_micro_logs for select to authenticated
using ( (select auth.uid()) = user_id );
drop policy if exists "Owner can insert own micro logs" on public.learn_micro_logs;
create policy "Owner can insert own micro logs" on public.learn_micro_logs for insert to authenticated
with check ( (select auth.uid()) = user_id );
revoke all on public.learn_micro_logs from anon;
grant select, insert on public.learn_micro_logs to authenticated;

-- Câu Học Kanji và câu Card Kanji ghi thứ tự trong ngày. Thêm tham số nên phải tạo lại hàm (giữ nguyên thân, chỉ thêm day_seq).
do $$
declare
  v_def text;
  v_name text;
begin
  foreach v_name in array array['submit_kanji_answer', 'submit_kanji_card_answer'] loop
    select pg_get_functiondef(p.oid) into v_def
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = v_name;
    if position('p_day_seq' in v_def) > 0 then
      continue;
    end if;
    -- Tham số cuối cùng của cả hai hàm đứng trước dòng ")\n RETURNS jsonb"
    v_def := regexp_replace(v_def, E'\\)\\s*\\n\\s*RETURNS jsonb', E', p_day_seq integer DEFAULT NULL::integer)\n RETURNS jsonb');
    v_def := replace(v_def, 'due_after, study_date, response_time_ms, answered_at', 'due_after, study_date, response_time_ms, answered_at, day_seq');
    v_def := replace(v_def, 'p_due_at, p_study_date, p_response_time_ms, p_answered_at', 'p_due_at, p_study_date, p_response_time_ms, p_answered_at, p_day_seq');
    if position('p_day_seq integer' in v_def) = 0 or position('answered_at, day_seq' in v_def) = 0 then
      raise exception 'v9_lessons: không sửa được %', v_name;
    end if;
    execute format('drop function public.%I(%s)', v_name,
      (select pg_get_function_identity_arguments(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = v_name));
    execute v_def;
    execute format('revoke execute on function public.%I from public, anon', v_name);
    execute format('grant execute on function public.%I to authenticated', v_name);
  end loop;
end;
$$;
