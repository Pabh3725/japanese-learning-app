-- =============================================================================
-- Dấu sao là lộ trình phụ song song: một vòng học thêm và một Card riêng.
-- Không đổi điểm, lịch của Stage và các Card gốc. Bỏ sao thì Card riêng tạm dừng,
-- đánh sao lại thì chạy tiếp lịch cũ và có vòng học thêm mới. Chạy lại vẫn an toàn.
-- =============================================================================
alter type public.card_type add value if not exists 'vocab.star_recall';

alter table public.learner_vocabulary_stars
  add column if not exists round_answered smallint not null default 0 check (round_answered >= 0);

comment on column public.learner_vocabulary_stars.round_answered is
  'Số câu đã làm trong vòng học thêm của lần đánh sao này. Bỏ sao xóa dòng nên vòng tính lại từ đầu.';

alter table public.practice_sessions drop constraint if exists practice_sessions_game_code_check;
alter table public.practice_sessions add constraint practice_sessions_game_code_check check (game_code in (
  'speed_matching', 'vocab_matching', 'kana_assembly',
  'kanji_assembly', 'han_viet_assembly', 'recall_challenge', 'star_round'
));

drop policy if exists "Owner can update own stars" on public.learner_vocabulary_stars;
create policy "Owner can update own stars"
on public.learner_vocabulary_stars for update to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id );
grant update on public.learner_vocabulary_stars to authenticated;

create or replace function public.submit_star_answer(
  p_session_id       uuid,
  p_client_event_id  uuid,
  p_vocabulary_id    uuid,
  p_skill_code       text,
  p_is_correct       boolean,
  p_response_time_ms integer,
  p_study_date       date
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
    raise exception 'submit_star_answer: not authenticated' using errcode = '28000';
  end if;

  if exists (select 1 from public.practice_attempts
             where user_id = v_uid and client_event_id = p_client_event_id) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  begin
    insert into public.practice_sessions (id, user_id, game_code)
    values (p_session_id, v_uid, 'star_round')
    on conflict (id) do nothing;

    insert into public.practice_attempts (
      user_id, practice_session_id, vocabulary_id, client_event_id, skill_code, is_correct,
      response_time_ms, study_date
    ) values (
      v_uid, p_session_id, p_vocabulary_id, p_client_event_id, p_skill_code, p_is_correct,
      p_response_time_ms, p_study_date
    );

    -- Vừa bỏ sao thì không còn dòng nào để cập nhật, câu này vẫn được ghi nhật ký
    update public.learner_vocabulary_stars
       set round_answered = round_answered + 1
     where user_id = v_uid and vocabulary_id = p_vocabulary_id;
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicate');
  end;

  return jsonb_build_object('status', 'saved');
end;
$$;

comment on function public.submit_star_answer is
  'Lưu một câu vòng học thêm của từ có sao: chỉ ghi nhật ký practice, không đổi điểm và lịch nào.';

revoke execute on function public.submit_star_answer from public, anon;
grant  execute on function public.submit_star_answer to authenticated;
