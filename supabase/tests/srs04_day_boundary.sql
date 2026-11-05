-- =============================================================================
-- SRS-04 · Ranh giới ngày học (giờ VN) trong database
--
-- Cách chạy: Supabase Dashboard → SQL Editor → New query → dán toàn bộ file → Run.
-- Chỉ ĐỌC, không ghi gì. Chạy lại bất cứ lúc nào để soát dữ liệu thật.
--
-- Phần A — Postgres đổi giờ đúng như ta hiểu (không phụ thuộc cài đặt múi giờ của phiên).
-- Phần B — Soát dữ liệu thật: study_date đã lưu có khớp ngày VN của thời điểm trả lời không.
--          Mong đợi: 0 dòng lệch. Có dòng lệch = có chỗ tính "hôm nay" sai.
-- =============================================================================

with a as (
  select 'A1 23:59 VN được lưu là 16:59 UTC cùng ngày' as kiem_tra,
         timestamptz '2026-11-05 23:59+07' = timestamptz '2026-11-05 16:59+00' as ok
  union all
  select 'A2 00:01 VN: ngày UTC là 05/11 nhưng ngày học là 06/11',
         (timestamptz '2026-11-06 00:01+07' at time zone 'UTC')::date = date '2026-11-05'
     and (timestamptz '2026-11-06 00:01+07' at time zone 'Asia/Ho_Chi_Minh')::date = date '2026-11-06'
  union all
  select 'A3 Hiển thị 17:00 UTC theo giờ VN = 06/11/2026 00:00',
         to_char(timestamptz '2026-11-05 17:00+00' at time zone 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI') = '06/11/2026 00:00'
),
b as (
  select 'B1 exercise_logs: study_date khớp ngày VN của answered_at' as kiem_tra,
         count(*) filter (where study_date <> (answered_at at time zone 'Asia/Ho_Chi_Minh')::date) as lech,
         count(*) as tong
    from public.exercise_logs
  union all
  select 'B2 review_logs: study_date khớp ngày VN của reviewed_at',
         count(*) filter (where study_date <> (reviewed_at at time zone 'Asia/Ho_Chi_Minh')::date),
         count(*) filter (where study_date is not null)
    from public.review_logs
  union all
  select 'B3 review_cards mới chưa ôn: hạn đầu đúng 00:00 giờ VN',
         count(*) filter (where (due_at at time zone 'Asia/Ho_Chi_Minh')::time <> time '00:00'),
         count(*)
    from public.review_cards
   where reps = 0 and last_review_at is null and card_type is not null
)
select kiem_tra, case when ok then 'PASS' else 'FAIL' end as ket_qua from a
union all
select kiem_tra,
       case when lech = 0 then 'PASS (' || tong || ' dòng đã soát)'
            else 'FAIL — ' || lech || '/' || tong || ' dòng lệch' end
  from b;
