# Kế hoạch triển khai V12

> Trạng thái: **CONFIRMED** (chủ dự án duyệt 2026-11-18, đồng ý cả 4 đề xuất ở §7). Luật: `docs/learning-rules-v12.md` (CONFIRMED 2026-11-18).
> Nguyên tắc: làm theo từng gói, mỗi gói merge riêng và app vẫn chạy được. Người học **không thấy thay đổi** cho tới gói 4 (bật V12). Không xóa bảng cũ cho tới gói 6.

> **Tiến độ:** gói 1–3 lên main 0fd3566; gói 4 lên prod (main ede75df, migration `20261129000001`, 2026-11-19); gói 5 dọn code (2026-11-19). Còn gói 6: xóa bảng cũ sớm nhất 2026-12-03, cần chủ dự án đồng ý và báo số dòng.

## 1. Hiện trạng cần thay

| Phần | Hiện tại (V9–V11) | Ở V12 |
|---|---|---|
| Từ vựng | `learner_vocabulary` (6 Stage Kana + Kanji trên cùng một dòng), `learner_stage_schedules` (điểm và lịch FSRS của Stage), `review_cards` (Card Kana / Kanji của từ) | Tách thành **Từ vựng Kana** và **Từ vựng Kanji** |
| Kanji | `learner_kanji` (12 điểm / 4 buổi), `learner_kanji_cards` (2 Card) | Khu Kanji: **bộ thủ** + chữ, 3 Stage, 1 Card |
| Bài học | AIS (`lib/learn/ais.ts`, `lib/dal/lesson.ts`), câu kiểm tra nhanh, vòng boss, vòng ghép ô, các route `/learn/stage2…5`, `/learn/mixed`, `/learn/kanji` | **Bộ thẻ trong ngày** trộn ngẫu nhiên, chia set; một trình học chung |
| Review | `/review` riêng, ôn Card theo nguy cơ quên | Card nằm trong bộ thẻ của từng khu; vẫn FSRS |
| Settings | Daily pace / Sessions / Advanced | Thêm cân bằng theo thời gian, kích thước set, trần từng khu |
| Nơi đọc tiến độ | 17 file DAL: Home, Progress, Library (trạng thái Learning / Reviewing / Learned, đánh dấu cả bài), Speed Matching, JLPT "chỉ đã học", Verbs, từ có sao, Archive, Word detail | Đọc từ bảng mới |

**Không đổi:** Grammar, Thể động từ, Luyện nghe, JLPT (trừ bộ lọc "chỉ đã học"), Counters.

## 2. Thiết kế kỹ thuật

### 2.1 Bảng mới (một mô hình chung cho cả 3 khu)

| Bảng | Nội dung |
|---|---|
| `learner_items` | Mỗi mục của người học: `area` (`kana` / `radical` / `kanji` / `word_kanji`), `item_id` (vocabulary / kanji / số bộ), `stage` (1–3 hoặc `review`), ngày bắt đầu Stage, `intro_seen_at`, `queued` (hàng chờ Từ vựng Kanji §6), `version`. Unique (user, area, item_id). |
| `learner_item_types` | Điểm từng **loại thẻ**: `stage`, `card_type`, `points` (0–3), `seen_date`, `seen_today` (0–3), `correct_today`, `done_at`. |
| `item_cards` | Card FSRS (cùng các cột lịch như `review_cards`): `card_type` (`kana_meaning_to_kana`, `kana_to_meaning`, `radical`, `kanji`, `word_kanji`), `due_at`, `archived_at`, `version`. |
| `item_logs` | Mỗi câu trả lời: khu, Stage, loại thẻ, đúng / sai, điểm, **thời gian trả lời (ms)** (dùng cho cân bằng §8.1), `client_event_id` unique. |
| `daily_decks` | Bộ thẻ của một ngày: user, ngày học, phạm vi (`kana` / `kanji` / `word_kanji` / `all`), thứ tự thẻ (jsonb), vị trí đang học. Lưu lại để tải lại trang hay đổi máy vẫn giữ đúng thứ tự và các lượt hỏi lại. |

- **Cột mới trong `learner_settings`:** `set_size`, `kana_cap`, `kanji_area_cap`, `word_kanji_cap`, `balance_on`, `balance_target` (`date` / `minutes`), `balance_date`, `balance_minutes`, số mục mới thủ công của từng khu.
- **RLS:** như các bảng hiện có (chủ sở hữu đọc / ghi, không xóa).
- **Ghi dữ liệu qua RPC** có `version` (như `submit_stage_exercise` hiện nay):
  - `submit_item_answer`: một câu Stage, cộng / trừ điểm, chuyển Stage, tạo Card khi xong;
  - `submit_item_card`: một Card FSRS;
  - `open_items`: mở mục mới của ngày.

**Vì sao làm bảng mới thay vì sửa bảng cũ:** mô hình cũ gói 6 Stage của hai khu trên cùng một dòng `learner_vocabulary`, điểm tính theo Stage, Kanji tính theo buổi. V12 tính điểm theo loại thẻ và tách khu. Sửa tại chỗ sẽ lẫn hai luật và khó chuyển ngược nếu có lỗi. Bảng cũ được giữ nguyên (chỉ đọc) tới gói 6.

### 2.2 Phần thuần (không đọc database, có test): `lib/v12/`

| File | Việc |
|---|---|
| `rules.ts` | `RULES_V12`: mọi con số của luật (3 điểm, 2/3 lần, cách 5 / 10 thẻ, giây mỗi loại câu…) |
| `card-types.ts` | Loại thẻ của từng khu và từng Stage (§4–6), dạng câu tương ứng |
| `stage.ts` | Áp một câu trả lời: điểm (sàn 0), số lần trong ngày, loại thẻ đủ điểm, chuyển Stage từ ngày học kế tiếp, Stage 1 đúng 1 lần mỗi loại |
| `deck.ts` | Dựng bộ thẻ trong ngày: thẻ giới thiệu → loại thẻ Stage 1 ở khoảng 0 / 5 / 10…; câu Stage 2–3 đến lượt; Card đến hạn. Trộn ngẫu nhiên nhưng giữ các khoảng cách bắt buộc; chèn lượt hỏi lại sau 5 thẻ; chia set |
| `order.ts` | Thứ tự mở mục: bộ thủ theo số chữ N5–N4; Kanji theo cấp → tần suất → số nét, chỉ mở khi các bộ đã qua Stage 1; điều kiện mở và hàng chờ Từ vựng Kanji |
| `balance.ts` | Tự cân bằng theo thời gian (§8): số mục mới mỗi khu mỗi ngày, ngày dự kiến xong cấp, dùng thời gian thật sau 14 ngày |
| `forecast.ts` | Dự báo 7 ngày (câu Stage + Card FSRS) và cảnh báo vượt trần |
| `questions.ts` | Dựng câu cho từng loại thẻ, dùng lại tối đa phần sẵn có (`stage-questions`, `kanji/questions`, ghép chữ, chấm gõ `answer-normalize`) |
| `migrate.ts` | Bảng chuyển dữ liệu §7 viết dạng hàm thuần, để test trước khi viết SQL |

FSRS: dùng lại `lib/srs/scheduler.ts` như hiện nay (Again / Good, tối đa 90 ngày, 00:00 giờ Việt Nam).

### 2.3 Giao diện

- **`/learn` thành trang chính của ba khu.** Mỗi khu có một thẻ hiện: số thẻ hôm nay (mới / Stage / Review), số set, nút **Start**. Thêm nút **Học tất cả**, và cảnh báo vượt trần nếu có.
- **Trình học set chung** `/learn/deck/[scope]`, dùng lại các component có sẵn: thẻ giới thiệu (Kana, Kanji có nét viết, thêm thẻ bộ thủ mới), trắc nghiệm, ghép chữ, ô gõ. Có thêm:
  - **thẻ Review gom chung**: nhiều phần trên một thẻ, chấm cả thẻ;
  - **màn hết set**: kết quả, nút "Set tiếp theo".
- **`/review`**: chỉ còn tổng quan Card đến hạn của từng khu, dẫn sang `/learn`. Trang `/review/archive` giữ nguyên.
- **Settings:** Daily pace (công tắc cân bằng, ngày học xong cấp hoặc số phút mỗi ngày, số mục mới thủ công khi tắt), Sessions (kích thước set), Advanced (trần từng khu).
- **Home, Progress, Library** đọc trạng thái từ bảng mới. Library vẫn có Learning / Reviewing / Learned, ☆ và đánh dấu cả bài.

## 3. Các gói

| Gói | Nội dung | Merge khi | Người học thấy |
|---|---|---|---|
| **1. Lõi thuần** | `lib/v12/*` + test đầy đủ (luật điểm, bộ thẻ, thứ tự mở, cân bằng, dự báo, chuyển dữ liệu) | test, lint, build đạt | Không |
| **2. Database** | Migration bảng mới + RPC + cột Settings; DAL `lib/dal/v12/*`; nạp `radical_meanings.csv`, `kanji_frequency.csv` vào seed (`radicals.meaning_vi`, `kanji.freq_rank`) | chạy migration dev → prod, seed dev → prod (chủ dự án đồng ý) | Không |
| **3. Giao diện sau công tắc** | Trang ba khu, trình học set, thẻ Review gom chung, thẻ bộ thủ, Settings mới. Chỉ bật cho người có cờ `learning_v12` trong `app_migration_flags` | build đạt; chủ dự án tự bật cờ cho tài khoản mình và thử trên prod | Chỉ chủ dự án (thử) |
| **4. Chuyển dữ liệu và bật cho mọi người** | SQL chuyển dữ liệu §7 (chạy trên dev, đối chiếu số dòng, rồi prod); bật V12 mặc định; Home / Progress / Library / Speed Matching / JLPT / Verbs đọc bảng mới | số dòng trước/sau khớp; chủ dự án đồng ý trước khi chạy prod | **Tất cả** |
| **5. Dọn code** | Bỏ AIS, câu kiểm tra nhanh, vòng boss, vòng ghép ô, các route Stage cũ, khu Kanji cũ, code đọc bảng cũ; cập nhật `PROJECT_SPEC.md`, đánh dấu `learning-rules.md` §12 đã bị thay | test đạt | Không (đã đổi ở gói 4) |
| **6. Xóa bảng cũ** | Sau khi V12 chạy ổn ít nhất 2 tuần: xóa (hoặc đổi tên lưu trữ) các bảng cũ | chủ dự án đồng ý, báo số dòng trước khi xóa | Không |

**Thứ tự phụ thuộc:** 1 → 2 → 3 → 4 → 5 → 6. Gói 1 và phần đọc dữ liệu của gói 2 có thể làm song song.

## 4. Chuyển dữ liệu (gói 4)

- Làm theo bảng §7 của luật. Chạy trong **một giao dịch** cho mỗi người học, chạy lại nhiều lần vẫn an toàn (bỏ qua người đã chuyển).
- **Trước khi chạy prod:**
  - đếm số mục / Card cũ theo từng nhóm của §7;
  - chạy trên dev và đối chiếu số mục / Card mới phải khớp;
  - báo chủ dự án số dòng.
- Card FSRS chuyển nguyên lịch (`due_at`, `stability`, `difficulty`, `reps`, `lapses`). Hai Card của một chữ Kanji gộp thành 1, lấy Card đến hạn sớm hơn.
- Lịch sử (`review_logs`, `exercise_logs`, `kanji_logs`) giữ nguyên, chỉ đọc. Tỉ lệ nhớ ở Progress đọc cả log cũ lẫn log mới.

## 5. Kiểm tra

- **Test thuần (gói 1):**
  - mọi luật điểm ở §3, kể cả các biên: sàn 0, lần thứ 3 khi sai, điểm thứ 3 rơi vào hôm sau;
  - bộ thẻ giữ đúng khoảng 0 / 5 / 10 và lượt hỏi lại sau 5 thẻ;
  - điều kiện mở và hàng chờ Từ vựng Kanji;
  - cân bằng: ba khu hết cùng ngày;
  - dự báo vượt trần;
  - bảng chuyển dữ liệu.
- **Test trên dữ liệu thật:** mỗi từ / bộ / chữ của N5–N4 dựng được đủ loại thẻ, không thiếu đáp án nhiễu.
- **Gói 3:** chủ dự án dùng V12 trên tài khoản của mình ít nhất vài ngày trước khi bật cho mọi người (gói 4).

## 6. Rủi ro

| Rủi ro | Cách xử lý |
|---|---|
| Chuyển dữ liệu sai làm mất tiến độ | Giữ bảng cũ tới gói 6; SQL chạy lại an toàn; đối chiếu số dòng; thử trên dev trước |
| Bộ thẻ ngày đầu sau khi chuyển quá nhiều (mọi Card và Stage cũ dồn lại) | Trần từng khu và cảnh báo; phần vượt trần chuyển sang hôm sau |
| Từ vựng Kanji không mở kịp chỉ tiêu cân bằng | Phần thiếu dồn sang các ngày sau; hàng chờ bù cuối cấp (luật §8.2) |
| Khối lượng code lớn (khoảng 3.000 dòng mới, bỏ khoảng 2.500 dòng cũ) | Chia 6 gói, mỗi gói merge riêng; công tắc ở gói 3 |
| Đáp án nhiễu trắc nghiệm bộ thủ / chữ Kanji ít ở đầu lộ trình | Lấy nhiễu từ cả kho cùng cấp, không chỉ mục đã học |

## 7. Quyết định của chủ dự án (2026-11-18)

1. **Bật V12 theo công tắc:** chủ dự án thử trên tài khoản mình trước rồi mới bật cho mọi người (gói 3 → 4).
2. **Từ có sao:** mỗi set chèn tối đa 2 câu học thêm, không tính điểm.
3. **Speed Matching:** lấy từ theo luật mới, gồm mục đã qua Stage 1 của khu Kana và khu Từ vựng Kanji.
4. **Bắt đầu** với gói 1 và gói 2.
