-- =============================================================================
-- DB-02 · Kiểm tra schema và RLS
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


create or replace function pg_temp.db02_checks()
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
  ev  uuid := gen_random_uuid();
  n   integer;
begin
  -- ===== Khối nháp: mọi thứ bên trong sẽ bị hoàn tác ở cuối =====
  begin

    -- ---------- Dữ liệu chuẩn bị ----------
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

    insert into public.review_cards (user_id, learner_vocabulary_id, skill_code)
    values (u, lv, 'meaning')
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

    t := t || 'T17 Hai thẻ cùng Skill cho một từ (UNIQUE)'::text;
    r := r || pg_temp.expect_error(format(
      $q$ insert into public.review_cards (user_id, learner_vocabulary_id, skill_code) values (%L, %L, 'meaning') $q$,
      u, lv), '23505');

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
                        'lesson_attempts','xp_events','review_cards','review_logs','practice_sessions','practice_attempts');
    t := t || 'T20 Cả 15 bảng đã bật RLS'::text;
    r := r || (case when n = 15 then 'PASS' else 'FAIL — chỉ ' || n || '/15 bảng bật RLS' end);

    select count(*) into n from pg_policies where schemaname = 'public' and 'anon' = any (roles);
    t := t || 'T21 Không có policy nào cho người chưa đăng nhập (anon)'::text;
    r := r || (case when n = 0 then 'PASS' else 'FAIL — có ' || n || ' policy cho anon' end);

    select count(*) into n from pg_policies where schemaname = 'public' and cmd in ('DELETE', 'ALL');
    t := t || 'T22 Không có policy DELETE (SEC-D5)'::text;
    r := r || (case when n = 0 then 'PASS' else 'FAIL — có ' || n || ' policy DELETE/ALL' end);

    select count(*) into n from pg_policies
    where schemaname = 'public' and cmd = 'UPDATE'
      and tablename in ('checkpoint_completions','lesson_attempts','xp_events','review_logs','practice_attempts');
    t := t || 'T23 Nhật ký và checkpoint không sửa được (append-only)'::text;
    r := r || (case when n = 0 then 'PASS' else 'FAIL — có ' || n || ' policy UPDATE' end);

    select count(*) into n from pg_policies
    where schemaname = 'public' and cmd in ('INSERT', 'UPDATE')
      and tablename in ('vocabularies','kanji','vocabulary_kanji');
    t := t || 'T24 App không ghi được vào từ điển (chỉ script, SEC-D3)'::text;
    r := r || (case when n = 0 then 'PASS' else 'FAIL — có ' || n || ' policy ghi' end);

    select count(*) into n from pg_policies where schemaname = 'public';
    t := t || 'T25 Tổng số policy = 34 (đúng ma trận SEC-01)'::text;
    r := r || (case when n = 34 then 'PASS' else 'FAIL — có ' || n || ' policy' end);

    -- Kết thúc khối nháp: cố tình báo lỗi để hoàn tác TOÀN BỘ dữ liệu thử
    raise exception 'db02_rollback';
  exception when raise_exception then
    if sqlerrm <> 'db02_rollback' then
      raise;
    end if;
  end;

  t := t || 'T99 Dữ liệu thử đã được hoàn tác'::text;
  r := r || (case when not exists (select 1 from auth.users where id = u)
                  then 'PASS' else 'FAIL — còn sót dữ liệu thử' end);

  return query select x.a, x.b from unnest(t, r) as x(a, b);
end;
$fn$;


select * from pg_temp.db02_checks();
