-- Sửa ràng buộc của 20261111000001: kanji_target_level null làm phép so sánh ra null nên CHECK vẫn qua.
-- KANJI_CORE và KANJI_DEFERRED bắt buộc có cấp đích. Chạy lại nhiều lần vẫn an toàn.
alter table public.vocabularies drop constraint if exists vocabularies_kanji_policy_check;
alter table public.vocabularies add constraint vocabularies_kanji_policy_check check (
  kanji_policy is null
  or (kanji_policy in ('KANA_ONLY', 'KANJI_OPTIONAL') and kanji_target_level is null)
  or (kanji_policy in ('KANJI_CORE', 'KANJI_DEFERRED') and kanji_target_level is not null and kanji_target_level between 1 and 5)
);
