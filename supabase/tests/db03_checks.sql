-- =============================================================================
-- DB-03 · Kiểm tra schema và RLS (thay db02_checks.sql sau Migration 3)
-- Chạy SAU migration 20261104000003_db03_multiuser_stage_points.sql
--
-- Cách chạy: Supabase Dashboard → SQL Editor → New query → dán toàn bộ file → Run.
--
-- Mỗi thử nghiệm CỐ TÌNH làm sai và mong database TỪ CHỐI.
--   PASS = database đã chặn đúng như mong đợi.
--   FAIL = có lỗ hổng, cần sửa migration.
--
-- An toàn: mọi dữ liệu thử được tạo bên trong một khối "nháp" và bị
-- HOÀN TÁC (rollback) ở cuối. Chạy xong, database không còn dòng nào.
-- =============================================================================


-- Hàm phụ: chạy một câu SQL, mong nó bị chặn với đúng mã lỗi.
--   23505 = trùng (UNIQUE)   23503 = khóa ngoại (FK)   23514 = luật kiểm tra (CHECK)
create or replace function pg_temp.expect_error(p_sql text, p_sqlstate text)
returns text
language plpgsql
as $$
begin
  execute p_sql;
  return 'FAIL — lệnh KHÔNG bị chặn';
exception when others then
  if sqlstate = p_sqlstate then
    return 'PASS';
  end if;
  return 'FAIL — bị chặn sai lý do: ' || sqlstate || ' ' || sqlerrm;
end;
$$;


create or replace function pg_temp.db03_checks()
returns table (kiem_tra text, ket_qua text)
language plpgsql
as $fn$
declare
  t   text[] := '{}';
  r   text[] := '{}';
  u   uuid := gen_random_uuid();   -- người dùng thử
  v1  uuid;                        -- 学校
  v2  uuid;                        -- これ
  k1  uuid;                        -- 学
  lv  uuid;
  ls  uuid;
  qi  uuid;
  rc  uuid;
  ps  uuid;
  ev  uuid := gen_random_uuid();
  n   integer;
begin
  -- ===== Khối nháp: mọi thứ bên trong sẽ bị hoàn tác ở cuối =====
  begin

    -- ---------- Dữ liệu chuẩn bị ----------
    -- code / sort_order là NOT NULL từ Migration 3. Trong khối nháp, cho chúng tự sinh
    -- giá trị thử (không trùng data thật) để các test cũ chỉ kiểm đúng luật của mình.
    -- Lệnh này cũng bị hoàn tác ở cuối cùng dữ liệu thử.
    create sequence pg_temp.db03_seq start 900001;
    alter table public.vocabularies
      alter column code       set default ('test-' || gen_random_uuid()),
      alter column sort_order set default nextval('pg_temp.db03_seq');

    insert into auth.users (id, email) values (u, 'db02-check@example.invalid');

    insert into public.vocabularies (expression, reading_kana, meaning_vi, romaji, han_viet, is_kana_only, jlpt_level)
    values ('学校', 'がっこう', 'Trường học', 'gakkō', 'HỌC HIỆU', false, 5)
    returning id into v1;

    insert into public.kanji (character, han_viet, meaning_vi, onyomi, kunyomi, stroke_count, jlpt_level)
    values ('学', 'HỌC', 'Học tập', '{ガク}', '{まな.ぶ}', 8, 5)
    returning id into k1;

    insert into public.vocabulary_kanji (vocabulary_id, position, kanji_id) values (v1, 0, k1);

    insert into public.learner_vocabulary (user_id, vocabulary_id) values (u, v1) returning id into lv;

    insert into public.lesson_sessions (user_id) values (u) returning id into ls;

    insert into public.lesson_queue_items (user_id, lesson_session_id, learner_vocabulary_id, position, stage_number, skill_code, exercise_type)
    values (u, ls, lv, 0, 2, 'meaning', 'choice')
    returning id into qi;

    insert into public.review_cards (user_id, learner_vocabulary_id, skill_code, card_type)
    values (u, lv, 'han_viet', 'vocab.kana_hanviet')
    returning id into rc;

    insert into public.review_logs (user_id, review_card_id, client_event_id, rating, state_before, due_after, stability_after, difficulty_after)
    values (u, rc, ev, 3, 0, now() + interval '1 day', 1.0, 5.0);

    -- ---------- Thử nghiệm hợp lệ (phải THÀNH CÔNG) ----------
    begin
      insert into public.vocabularies (expression, reading_kana, meaning_vi, romaji, han_viet, is_kana_only, jlpt_level)
      values ('これ', 'これ', 'Cái này', 'kore', null, true, 5)
      returning id into v2;
      t := t || 'T00 Thêm từ chỉ có Kana hợp lệ (これ)'::text;  r := r || 'PASS'::text;
    exception when others then
      t := t || 'T00 Thêm từ chỉ có Kana hợp lệ (これ)'::text;  r := r || ('FAIL — ' || sqlerrm);
    end;

    -- ---------- Thử nghiệm phải BỊ CHẶN ----------
    t := t || 'T01 Thêm trùng 学校/がっこう (UNIQUE)'::text;
    r := r || pg_temp.expect_error(
      $q$ insert into public.vocabularies (expression, reading_kana, meaning_vi, han_viet, jlpt_level)
          values ('学校', 'がっこう', 'Trùng', 'HỌC HIỆU', 5) $q$, '23505');

    t := t || 'T02 Từ có Kanji nhưng thiếu Hán Việt (CHECK)'::text;
    r := r || pg_temp.expect_error(
      $q$ insert into public.vocabularies (expression, reading_kana, meaning_vi, han_viet, is_kana_only, jlpt_level)
          values ('先生', 'せんせい', 'Giáo viên', null, false, 5) $q$, '23514');

    t := t || 'T03 Từ chỉ có Kana mà lại có Hán Việt (CHECK)'::text;
    r := r || pg_temp.expect_error(
      $q$ insert into public.vocabularies (expression, reading_kana, meaning_vi, han_viet, is_kana_only, jlpt_level)
          values ('それ', 'それ', 'Cái đó', 'SAI', true, 5) $q$, '23514');

    t := t || 'T04 JLPT ngoài 1–5 (CHECK)'::text;
    r := r || pg_temp.expect_error(
      $q$ insert into public.vocabularies (expression, reading_kana, meaning_vi, is_kana_only, jlpt_level)
          values ('あれ', 'あれ', 'Cái kia', true, 6) $q$, '23514');

    t := t || 'T05 Kanji có 2 ký tự (CHECK)'::text;
    r := r || pg_temp.expect_error(
      $q$ insert into public.kanji (character, han_viet, meaning_vi, jlpt_level)
          values ('学校', 'HỌC HIỆU', 'Sai', 5) $q$, '23514');

    t := t || 'T06 Thêm trùng Kanji 学 (UNIQUE)'::text;
    r := r || pg_temp.expect_error(
      $q$ insert into public.kanji (character, han_viet, meaning_vi, jlpt_level)
          values ('学', 'HỌC', 'Trùng', 5) $q$, '23505');

    t := t || 'T07 Tiến độ cho từ không tồn tại (FK)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.learner_vocabulary (user_id, vocabulary_id) values (%L, %L) $q$,
      u, gen_random_uuid()), '23503');

    t := t || 'T08 Hai sổ theo dõi cho cùng một từ (UNIQUE)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.learner_vocabulary (user_id, vocabulary_id) values (%L, %L) $q$,
      u, v1), '23505');

    t := t || 'T09 Stage = 7 (CHECK 1–5)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ update public.learner_vocabulary set current_stage = 7 where id = %L $q$, lv), '23514');

    t := t || 'T10 Hoàn thành vòng đầu nhưng thiếu thời điểm Stage 5 (CHECK)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ update public.learner_vocabulary set learning_status = 'initial_complete' where id = %L $q$, lv), '23514');

    t := t || 'T11 Skill code lạ "romaji" (CHECK — Romaji không phải Skill)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.learner_skill_progress (learner_vocabulary_id, skill_code, user_id) values (%L, 'romaji', %L) $q$,
      lv, u), '23514');

    t := t || 'T12 Đạt cùng một checkpoint hai lần (UNIQUE)'::text;
    execute format(
      $q$ insert into public.checkpoint_completions (user_id, learner_vocabulary_id, stage_number, checkpoint_code)
          values (%L, %L, 1, 'intro_viewed') $q$, u, lv);
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.checkpoint_completions (user_id, learner_vocabulary_id, stage_number, checkpoint_code)
          values (%L, %L, 1, 'intro_viewed') $q$, u, lv), '23505');

    t := t || 'T13 Lượt "đúng độc lập" nhưng có dùng hint (CHECK)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.lesson_attempts (user_id, lesson_queue_item_id, client_event_id, is_correct, used_hint, counts_as_independent)
          values (%L, %L, %L, true, true, true) $q$, u, qi, gen_random_uuid()), '23514');

    t := t || 'T14 Hai câu cùng vị trí trong một Lesson (UNIQUE)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.lesson_queue_items (user_id, lesson_session_id, learner_vocabulary_id, position, stage_number, exercise_type)
          values (%L, %L, %L, 0, 2, 'choice') $q$, u, ls, lv), '23505');

    t := t || 'T15 Bấm Good hai lần — trùng client_event_id (UNIQUE)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.review_logs (user_id, review_card_id, client_event_id, rating, state_before, due_after, stability_after, difficulty_after)
          values (%L, %L, %L, 3, 0, now(), 1.0, 5.0) $q$, u, rc, ev), '23505');

    t := t || 'T16 Rating = 5 (CHECK 1–4)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.review_logs (user_id, review_card_id, client_event_id, rating, state_before, due_after, stability_after, difficulty_after)
          values (%L, %L, %L, 5, 0, now(), 1.0, 5.0) $q$, u, rc, gen_random_uuid()), '23514');

    -- DB-03: luật "1 thẻ / Skill" được thay bằng "1 thẻ / loại card".
    begin
      insert into public.review_cards (user_id, learner_vocabulary_id, skill_code, card_type)
      values (u, lv, 'han_viet', 'vocab.meaning_hanviet');
      t := t || 'T17a Hai loại card khác nhau cùng Skill Hán Việt (phải THÀNH CÔNG)'::text;  r := r || 'PASS'::text;
    exception when others then
      t := t || 'T17a Hai loại card khác nhau cùng Skill Hán Việt (phải THÀNH CÔNG)'::text;  r := r || ('FAIL — ' || sqlerrm);
    end;

    t := t || 'T17b Hai thẻ cùng loại card cho một từ (UNIQUE)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.review_cards (user_id, learner_vocabulary_id, card_type) values (%L, %L, 'vocab.kana_hanviet') $q$,
      u, lv), '23505');

    t := t || 'T17c Loại card lạ (enum)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.review_cards (user_id, learner_vocabulary_id, card_type) values (%L, %L, 'vocab.romaji') $q$,
      u, lv), '22P02');

    t := t || 'T18 Xóa từ 学校 đang có lịch sử học (FK RESTRICT)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ delete from public.vocabularies where id = %L $q$, v1), '23503');

    t := t || 'T19 Xóa Kanji 学 đang được từ dùng (FK RESTRICT)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ delete from public.kanji where id = %L $q$, k1), '23503');

    -- ---------- Kiểm tra cấu hình RLS ----------
    select count(*) into n
    from pg_class c join pg_namespace s on s.oid = c.relnamespace
    where s.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and c.relname in ('vocabularies','kanji','vocabulary_kanji','learner_settings','learner_vocabulary',
                        'learner_skill_progress','checkpoint_completions','lesson_sessions','lesson_queue_items',
                        'lesson_attempts','xp_events','review_cards','review_logs','practice_sessions','practice_attempts','exercise_logs',
                        'learner_vocabulary_exclusions','learner_daily_plans');
    t := t || 'T20 Cả 18 bảng đã bật RLS'::text;
    r := r || (case when n = 18 then 'PASS' else 'FAIL — chỉ ' || n || '/18 bảng bật RLS' end);

    select count(*) into n from pg_policies where schemaname = 'public' and 'anon' = any (roles);
    t := t || 'T21 Không có policy nào cho người chưa đăng nhập (anon)'::text;
    r := r || (case when n = 0 then 'PASS' else 'FAIL — có ' || n || ' policy cho anon' end);

    select count(*) into n from pg_policies where schemaname = 'public' and cmd in ('DELETE', 'ALL');
    t := t || 'T22 Không có policy DELETE (SEC-D5)'::text;
    r := r || (case when n = 0 then 'PASS' else 'FAIL — có ' || n || ' policy DELETE/ALL' end);

    select count(*) into n from pg_policies
    where schemaname = 'public' and cmd = 'UPDATE'
      and tablename in ('checkpoint_completions','lesson_attempts','xp_events','review_logs','practice_attempts','exercise_logs');
    t := t || 'T23 Nhật ký và checkpoint không sửa được (append-only)'::text;
    r := r || (case when n = 0 then 'PASS' else 'FAIL — có ' || n || ' policy UPDATE' end);

    select count(*) into n from pg_policies
    where schemaname = 'public' and cmd in ('INSERT', 'UPDATE')
      and tablename in ('vocabularies','kanji','vocabulary_kanji');
    t := t || 'T24 App không ghi được vào từ điển (chỉ script, SEC-D3)'::text;
    r := r || (case when n = 0 then 'PASS' else 'FAIL — có ' || n || ' policy ghi' end);

    select count(*) into n from pg_policies where schemaname = 'public';
    t := t || 'T25 Tổng số policy = 42 (34 SEC-01 + 2 exercise_logs + 3 exclusions + 3 daily_plans)'::text;
    r := r || (case when n = 42 then 'PASS' else 'FAIL — có ' || n || ' policy' end);

    -- ---------- DB-03: điểm, settings, exercise_logs ----------
    begin
      update public.learner_vocabulary set stage_points = -3 where id = lv;
      update public.review_cards set card_points = -2 where id = rc;
      t := t || 'T26 Điểm stage và điểm card được âm (phải THÀNH CÔNG)'::text;  r := r || 'PASS'::text;
    exception when others then
      t := t || 'T26 Điểm stage và điểm card được âm (phải THÀNH CÔNG)'::text;  r := r || ('FAIL — ' || sqlerrm);
    end;

    t := t || 'T27 Hơn 3 điểm +1 trong ngày (CHECK 0–3)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ update public.learner_vocabulary set stage_points_today = 4 where id = %L $q$, lv), '23514');

    -- AUTH-01: trigger đã tự tạo settings khi tạo user → chỉ thêm nếu chưa có
    insert into public.learner_settings (user_id) values (u) on conflict (user_id) do nothing;
    t := t || 'T28 Settings mặc định 20 / 120 / 80 / mixed'::text;
    r := r || (case when exists (select 1 from public.learner_settings
                                 where user_id = u and daily_new_limit = 20 and review_cap = 120
                                   and unlock_threshold = 80 and mode = 'mixed')
                    then 'PASS' else 'FAIL — default sai' end);

    t := t || 'T29 Chế độ học lạ "fast" (CHECK)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ update public.learner_settings set mode = 'fast' where user_id = %L $q$, u), '23514');

    execute format(
      $q$ insert into public.exercise_logs (user_id, learner_vocabulary_id, client_event_id, stage_number,
            exercise_type, outcome, points, counted, study_date, day_seq)
          values (%L, %L, %L, 2, 'kana_to_meaning', 'correct', 1, true, current_date, 1) $q$, u, lv, ev);

    t := t || 'T30 Câu không được tính nhưng có điểm (CHECK)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.exercise_logs (user_id, learner_vocabulary_id, client_event_id, stage_number,
            exercise_type, outcome, points, counted, study_date, day_seq)
          values (%L, %L, %L, 2, 'kana_to_meaning', 'correct', 1, false, current_date, 2) $q$, u, lv, gen_random_uuid()), '23514');

    t := t || 'T31 Kết quả chấm lạ "maybe" (CHECK)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.exercise_logs (user_id, learner_vocabulary_id, client_event_id, stage_number,
            exercise_type, outcome, points, counted, study_date, day_seq)
          values (%L, %L, %L, 2, 'kana_to_meaning', 'maybe', 0, false, current_date, 2) $q$, u, lv, gen_random_uuid()), '23514');

    t := t || 'T32 Bấm đáp án hai lần — trùng client_event_id (UNIQUE)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.exercise_logs (user_id, learner_vocabulary_id, client_event_id, stage_number,
            exercise_type, outcome, points, counted, study_date, day_seq)
          values (%L, %L, %L, 2, 'kana_to_meaning', 'correct', 1, true, current_date, 2) $q$, u, lv, ev), '23505');

    -- ---------- Bổ sung khi gộp: loại từ, trần practice, ngày học ----------
    begin
      insert into public.learner_vocabulary_exclusions (user_id, vocabulary_id) values (u, v2);
      update public.learner_vocabulary_exclusions set excluded_at = null where user_id = u and vocabulary_id = v2;
      t := t || 'T33 Loại từ chưa học rồi khôi phục (phải THÀNH CÔNG)'::text;  r := r || 'PASS'::text;
    exception when others then
      t := t || 'T33 Loại từ chưa học rồi khôi phục (phải THÀNH CÔNG)'::text;  r := r || ('FAIL — ' || sqlerrm);
    end;

    t := t || 'T34 Loại cùng một từ hai lần (UNIQUE)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.learner_vocabulary_exclusions (user_id, vocabulary_id) values (%L, %L) $q$, u, v2), '23505');

    t := t || 'T35 Practice cộng quá +3 điểm/ngày cho một card (CHECK 0–3)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ update public.review_cards set practice_points_today = 4 where id = %L $q$, rc), '23514');

    insert into public.practice_sessions (user_id, game_code) values (u, 'speed_matching') returning id into ps;
    t := t || 'T36 Lượt practice có điểm nhưng không gắn card (CHECK)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.practice_attempts (user_id, practice_session_id, vocabulary_id, client_event_id, skill_code, is_correct, card_points)
          values (%L, %L, %L, %L, 'kana', true, 1) $q$,
      u, ps, v1, gen_random_uuid()), '23514');

    insert into public.learner_daily_plans (user_id, study_date, due_snapshot) values (u, current_date, 50);
    t := t || 'T37 Hai dòng ngày học cho cùng một ngày (UNIQUE)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.learner_daily_plans (user_id, study_date, due_snapshot) values (%L, current_date, 10) $q$, u), '23505');

    t := t || 'T38 Số due chụp bị âm (CHECK)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ update public.learner_daily_plans set due_snapshot = -1 where user_id = %L $q$, u), '23514');

    -- Kết thúc khối nháp: cố tình báo lỗi để hoàn tác TOÀN BỘ dữ liệu thử
    raise exception 'db03_rollback';
  exception when raise_exception then
    if sqlerrm <> 'db03_rollback' then
      raise;
    end if;
  end;

  t := t || 'T99 Dữ liệu thử đã được hoàn tác'::text;
  r := r || (case when not exists (select 1 from auth.users where id = u)
                  then 'PASS' else 'FAIL — còn sót dữ liệu thử' end);

  return query select x.a, x.b from unnest(t, r) as x(a, b);
end;
$fn$;


select * from pg_temp.db03_checks();
