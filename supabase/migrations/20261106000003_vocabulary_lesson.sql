-- =============================================================================
-- Từ vựng theo bài giáo trình. Chỉ thêm, chạy lại nhiều lần vẫn an toàn.
-- Nguồn dữ liệu: data/n5/vocabularies.csv, cột lesson.
-- =============================================================================
alter table public.vocabularies
  add column if not exists lesson smallint check (lesson between 1 and 50);

comment on column public.vocabularies.lesson is 'Bài trong giáo trình. Thứ tự học vẫn theo sort_order.';

create index if not exists vocabularies_lesson_idx on public.vocabularies (lesson);
