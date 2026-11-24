-- =============================================================================
-- V12 (chủ dự án chốt 2026-11-24): bộ thủ học riêng ở phần More của Vocab — không thuộc khu Kanji, không tính vào cân bằng,
-- trần hay "Học tất cả"; chữ Kanji không phải chờ bộ thủ. Người học chọn số bộ mới mỗi ngày (0–30, mặc định 5).
-- Chỉ thêm: phạm vi 'radical' cho bộ thẻ trong ngày và cột số bộ mới mỗi ngày. Tiến độ bộ thủ đã có giữ nguyên.
-- =============================================================================
alter table public.daily_decks drop constraint if exists daily_decks_scope_check;
alter table public.daily_decks add constraint daily_decks_scope_check check (scope in ('kana', 'kanji', 'word_kanji', 'all', 'radical'));

alter table public.learner_settings add column if not exists v12_new_radical smallint not null default 5 check (v12_new_radical between 0 and 30);
comment on column public.learner_settings.v12_new_radical is 'V12: số bộ thủ mới mỗi ngày ở bộ thẻ bộ thủ (phần More của Vocab).';
