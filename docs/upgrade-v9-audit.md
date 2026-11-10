# Audit nâng cấp Design V9 — 6 Stage, Learn chung, AIS, Kanji trực quan, Archive

> Trạng thái: **Bước 1 — Audit**. Chưa sửa code. Mọi đề xuất trong tài liệu này là **PROPOSED** cho tới khi chủ dự án chốt.
>
> Ngày: 2026-11-10. Người viết: Claude. Cơ sở: yêu cầu "Nâng cấp hệ thống học tiếng Nhật N5–N4" (Phần I–XI), code trên nhánh `feature/path-v2` (commit `130686d` cùng 5 file chưa commit), `main` (`a295aaa`, đang chạy trên prod).

## 1. Điều quan trọng nhất: đang có 3 phiên bản luật

Yêu cầu nâng cấp được viết dựa trên **V8**. Nhưng code hiện có hai trạng thái khác nhau:

| | V8 — `main`, đang chạy prod | v2 — `feature/path-v2`, chưa lên prod | Yêu cầu mới (gọi tạm là V9) |
| --- | --- | --- | --- |
| Nhánh Kana | 1 → 2 → 5 (Stage 5 gộp 4 kỹ năng) | 1 → 2 → 5 (Stage 5 chỉ S1/S2) | 1 → 2 → **3** (S1/S2) |
| Nhánh Kanji | 3 (xem) → 4 → 5 chung | thẻ (Stage 3) → 4 → 6 (S3/S4) | **4** (xem) → **5** → **6** (S3/S4) |
| Mở nhánh Kanji | Theo luồng, không có điều kiện riêng | Xong Stage 2 **và** mọi chữ trong từ đã xong giai đoạn Học ở khu Kanji | Xong Stage 3 **và** chính sách Kanji của từ là bắt buộc ở cấp hiện tại; **không** yêu cầu chữ thành phần |
| Card | 5 loại, có điểm Card, bỏ Card giàn giáo, có Easy | 2 loại (`vocab.kana`, `vocab.kanji`) + `vocab.star_recall`; không điểm, không bỏ, không Easy, tối đa 90 ngày | Cần rà lại thời điểm tạo; thêm Card Kanji riêng lẻ; thêm `archived` |
| Kanji riêng lẻ | Chưa có | Khu riêng, ôn dài hạn trong khu Kanji, bắt buộc gõ âm On/Kun | Đưa vào Review chung, **không** bắt buộc On/Kun, thêm 4 dạng bài trực quan |
| Trần câu Learn | 200 câu Stage | Trần riêng: Stage 200, Từ Kanji 100, Kanji 100 | Đề xuất một ngân sách chung 200 câu + trần phụ Kanji |
| Phiên Learn | 20 câu | 20 câu, Học hỗn hợp luân phiên cụm 5 câu | Bài 50 câu (20–100), nhiều bài/ngày |

**Nhận xét:** v2 đã gần với V9 về hình dạng hai nhánh: Stage 5 của v2 chính là Stage 3 của V9, Stage 3/4/6 của v2 là Stage 4/5/6 của V9. Vì vậy V9 là bước nâng tiếp từ v2, không phải viết lại. Phần khác thật sự là điều kiện mở nhánh Kanji, Review chung, Kanji trực quan, AIS, bài 50 câu và Archive.

## 2. Tác động tới người học đã có dữ liệu

- **Prod** đang chạy V8 với dữ liệu thật của chủ dự án. Tôi chưa đọc được DB prod (lệnh đọc từng bị chặn), nên **chưa biết số từ, số Card, số log** cần chuyển.
- Kế hoạch đưa v2 lên prod có bước `supabase/scripts/path-v2-reset.sql`: xóa toàn bộ `learner_vocabulary` (kéo theo Card, review log, lịch Stage, exercise log) và practice. Bước này **trái với nguyên tắc 4** của yêu cầu V9 ("Không xóa tiến độ hoặc lịch sử học hiện có").
- ~~Đề xuất: viết migration chuyển thẳng V8 → V9 cho prod.~~ Chủ dự án chọn **vẫn xóa** tiến độ từ vựng trên prod (§6, quyết định 1). Dev đã bị xóa tiến độ từ vựng từ trước, nên migration V9 chỉ cần chuyển dữ liệu v2 → V9 (đánh số lại Stage, giữ Card và log) và chuyển `learner_kanji` sang 2 Card. Tiến độ Kanji riêng lẻ trên prod (nếu có) vẫn được giữ.
- (Không cần nữa vì prod xóa tiến độ, xem §6.) Chuyển Stage 5 V8 sang Stage 3 và 6 V9 làm được dựa trên log: `exercise_logs` ghi `exercise_code`, và `EXERCISES` (`lib/learning/rules.ts`) cho biết mỗi dạng bài kiểm tra Skill nào. Từ đó tính lại điểm và cờ đủ kỹ năng của S1/S2 và S3/S4. Không đủ log thì **không** coi là hoàn tất; stage giữ trạng thái đang học.
- (Không cần nữa, xem §6.) Card V8 có 5 loại với điểm Card và trạng thái `retired_at`. Cần bảng ánh xạ 5 loại cũ → loại V9, giữ `review_logs` và tham số FSRS (stability, difficulty, due). Chi tiết ở bước Thiết kế.

## 3. Hiện trạng theo từng phần của yêu cầu

| Phần | Đã có (bằng chứng) | Thiếu hoặc mâu thuẫn |
| --- | --- | --- |
| I. 6 Stage | Hai nhánh, `stageThresholds` 2/4/5/6 và `REQUIRED_SKILLS` 5: S1/S2, 6: S3/S4 (`lib/learning/rules.ts`); lịch Stage `learner_stage_schedules` cho stage 2/4/5/6 | Đánh số khác V9; Stage 4 v2 là thẻ ở số 3; điều kiện mở nhánh Kanji khác (xem §1) |
| II. Phân loại Kanji | `vocabularies.is_kana_only`, `jlpt_level`, `lesson` (bài 1–48); `kanji.jlpt_level` lấy cấp JLPT cũ của KANJIDIC2; `vocabulary_kanji` nối từ với chữ | Chưa có chính sách `KANA_ONLY` / `KANJI_CORE` / `KANJI_DEFERRED` / `KANJI_OPTIONAL`, chưa có nguồn, độ tin cậy, khóa thủ công |
| III. Learn chung | Tab Learn có 3 mục và Học hỗn hợp; tiến độ và log riêng (`exercise_logs`, `kanji_logs`) | Phiên 20 câu, chưa có bài 50 câu; trần riêng từng mục |
| IV. AIS | Luật trộn SES-02: cùng từ cách ≥ 4 câu, không 2 câu cùng dạng liền nhau; hỏi lại câu sai cuối lượt (không ghi log) | Chưa có Immediate Check / Delayed Recall, chưa có `MICRO_PRACTICE`, chưa lưu trạng thái hàng đợi giữa các phiên |
| V. Kanji riêng lẻ | Thẻ giới thiệu, 12 câu trong 4 buổi, ôn FSRS tối đa 90 ngày (`lib/kanji/*`, `learner_kanji`) | Bắt buộc gõ âm (trái V9); một lịch cho cả chữ (V9 muốn tách ít nhất 2 khả năng); chưa có bộ thủ, thành phần, mẹo, nét viết, chữ gần giống |
| VI. Review chung | Review từ vựng chạy Card (`lib/dal/review.ts`) | Kanji ôn trong khu Kanji, không trộn; chưa có bộ lọc |
| VII. Archive | Có `retired_at` (V8 bỏ Card theo điểm), loại từ khỏi lộ trình (`learner_vocabulary_exclusions` → Card tạm ngưng), Học lại Card | Chưa có `archived` theo từng Card, chưa có kho lưu trữ, chưa có sự kiện reset |
| VIII. Vòng đời Card | Card Kana tạo khi xong Stage 2; Card Kanji khi xong Stage 6 (`CARDS_ON_PASS`) | Card Kana tạo ở Stage 2 nên trùng thời gian với Stage 5 v2 (Stage 3 V9) vẫn luyện cùng kỹ năng S1/S2 — đúng loại trùng lặp mà V9 yêu cầu rà |
| IX. Learning Rules | `docs/learning-rules.md` | Vẫn ghi `RULES_V4` theo V8 (5 Stage, 5 Card, điểm Card); khối config §12 còn `RULES_V3` với số cũ (wrong −1, mốc 5/8, 20 từ mới…). Chưa cập nhật theo v2 |
| X. DB/Test | 20 migration, test SQL trong `supabase/tests/`, 367 unit test | Xem các phần trên |

### Mâu thuẫn trong tài liệu hiện có

- `docs/PROJECT_SPEC.md` §18.1–18.4 vẫn mô tả 5 Stage, 5 Card, điểm Card và Easy; §18.5b (v2) ghi đè nhưng không xóa. §18.6 nói Kanji "không trộn vào Review".
- `docs/learning-rules.md` §12 có config `RULES_V3` lệch với code `RULES_V4`.
- Mặc định trong spec §18.5 (Kanji 5 chữ, 50 câu) lệch với code (10 chữ, 100 câu).

## 4. Nguồn dữ liệu — khảo sát sơ bộ

Đây là danh sách để kiểm tra ở bước nghiên cứu. **Giấy phép và phiên bản phải được xác minh lại trên trang gốc trước khi dùng**; tôi chưa tải dữ liệu nào.

| Nguồn | Dùng cho | Giấy phép (cần xác minh) | Hạn chế |
| --- | --- | --- | --- |
| JMdict (EDRDG) | Cách viết thông dụng, cờ "thường viết bằng Kana" (`uk`), độ thông dụng (`news1`, `ichi1`…) | Giấy phép EDRDG, CC BY-SA 4.0 | Không có cấp JLPT; nghĩa tiếng Anh, không có tiếng Việt |
| KANJIDIC2 (EDRDG) | On/Kun, số nét, bộ thủ cổ điển (`rad_value`), cấp JLPT cũ 1–4 | CC BY-SA 4.0 (đang dùng) | Cấp JLPT là danh sách trước 2010, không chính thức |
| KRADFILE / RADKFILE (EDRDG) | Thành phần của chữ | Giấy phép EDRDG | Có thành phần, **không có vị trí** |
| KanjiVG | SVG nét viết theo thứ tự, thuộc tính thành phần và vị trí (`kvg:element`, `kvg:position`, `kvg:radical`) | CC BY-SA 3.0 | Cấu trúc theo chữ Nhật; cần kiểm tra độ đầy đủ cho 823 chữ |
| Danh sách JLPT của Jonathan Waller (tanos.co.uk) | Đối chiếu từ vựng và Kanji N5/N4 | CC BY (cần xác minh) | Bên thứ ba, **không phải danh sách chính thức** |
| CHISE IDS | Cấu tạo chữ dạng IDS | GPL | Giấy phép GPL có thể không phù hợp với dữ liệu; cân nhắc tránh |
| Chữ gần giống | — | Chưa tìm được bộ dữ liệu có giấy phép rõ ràng | Đề xuất tự sinh từ thành phần KanjiVG rồi người rà duyệt |

- Hán Việt và nghĩa tiếng Việt của chữ: đang lấy từ file seed hiện có. Chưa có nguồn mở có giấy phép rõ ràng để đối chiếu tự động; giữ cơ chế người rà (`docs/kanji-review.md`).
- CC BY-SA yêu cầu ghi nguồn, và dữ liệu phái sinh phải giữ cùng giấy phép.
- Dạng bài tô nét (G): chấm theo hướng, điểm đầu và điểm cuối từng nét so với mẫu KanjiVG. Đây **không** phải nhận dạng chữ viết tay tự do; giao diện phải ghi rõ giới hạn này.

## 5. Đề xuất chia việc (PROPOSED)

Mỗi gói là một nhánh `feature/*`, merge theo thứ tự:

1. **V9-RULES** — Learning Rules V9 (R1–R13 + bảng ánh xạ), config có version, dọn tài liệu cũ. Chỉ tài liệu.
2. **V9-STAGE** — Đánh số 6 Stage, điều kiện mở nhánh Kanji, thời điểm tạo Card, migration V8 → V9 và v2 → V9 (chạy lại an toàn, có rollback), test.
3. **V9-POLICY** — Bảng chính sách Kanji theo từ/cấp, nguồn, độ tin cậy, khóa thủ công; script đề xuất tự động; danh sách cho người duyệt.
4. **V9-REVIEW** — Review chung (từ vựng Kana, từ vựng Kanji, Kanji riêng lẻ), bộ lọc, Archive và kho lưu trữ, khôi phục hai kiểu, sự kiện reset.
5. **V9-AIS** — Bài 50 câu, ngân sách Learn, AIS, lưu và tiếp tục phiên, test mô phỏng 20/50/100 câu.
6. **V9-KANJI-DATA** — Nhập bộ thủ, thành phần, vị trí, nét từ KanjiVG/KANJIDIC2; mẹo ghi nhớ do AI đề xuất ở trạng thái chờ duyệt.
7. **V9-KANJI-UI** — Thẻ giới thiệu mới, dạng bài A, B, C, E, F, G; tách 2 Card cho mỗi chữ.

Gói 2 phải xong trước 4 và 5; gói 6 trước 7. Gói 3 làm song song với 2.

## 6. Quyết định của chủ dự án — CONFIRMED (2026-11-10)

1. Prod: vẫn xóa tiến độ từ vựng như kế hoạch v2 (dữ liệu prod chỉ là thử). Không cần ánh xạ 5 loại Card V8. Đây là ngoại lệ có chủ đích của nguyên tắc 4.
2. Nhánh Từ vựng Kanji mở khi xong Stage 3 và chính sách Kanji yêu cầu ở cấp hiện tại; không cần học xong chữ thành phần.
3. Learn dùng một ngân sách chung 200 câu cho 3 nhóm, có trần phụ cho Kanji riêng lẻ.
4. Card Kana tạo khi xong Stage 3.
5. Phân loại Kanji: script tự đề xuất, chủ dự án duyệt; nhãn đã duyệt không bị ghi đè.
6. Kanji riêng lẻ có 2 Card trong Review chung (mặt chữ ↔ nghĩa, Hán Việt); viết và tô nét chỉ là bài luyện.
7. Giai đoạn Học Kanji giữ 12 câu trong 4 buổi; On/Kun không còn bắt buộc.
8. Làm từng gói, duyệt từng gói; gói đầu là Learning Rules V9 (`docs/learning-rules.md`, đã chốt 2026-11-10).

## 7. Việc tôi chưa làm được ở bước Audit

- Chưa đọc được DB prod nên chưa nêu được số dòng sẽ được chuyển.
- Chưa tải và kiểm tra dữ liệu KanjiVG, JMdict, danh sách Waller.
- Chưa chạy thử v2 khi đăng nhập.
