# LIS-01 — Luyện nghe `LISTENING_V1` → `LISTENING_V2`

> **V2 — CONFIRMED (chủ dự án duyệt 2026-11-15). Đợt A đã có trong code** (migration `20261125000001_listening_v2.sql`, `lib/listening/numbers.ts`, trang `/grammar/listening`, `/practice/dictation`, `/practice/numbers`, `/practice/listening-mistakes`, thẻ thi thử ở tab JLPT). Đợt B, C chưa làm. Chủ dự án chốt: bỏ tab Listening; luyện nghe theo câu nằm trong Grammar (từng bài); nghe theo đoạn (hội thoại điền chỗ trống) và Dictation nằm trong Practice; thi thử phần nghe chuyển về tab JLPT; thêm nghe số/giờ/ngày/giá, danh sách câu nghe sai, phím tắt. §V2 dưới đây thay các mục V1 tương ứng; phần V1 giữ để tra (§1–§6).

## V2.1 Vị trí

| Phần | Ở đâu | Ghi chú |
|---|---|---|
| Nghe theo câu (từng bài) | **Grammar** · trang bài → mục **Listening** (nút "Listening practice", 10 / 20 câu) | Không đổi lịch học Grammar |
| Nghe theo đoạn | **Practice** · thẻ **Conversation listening** → chọn bài → chọn hội thoại | Cần soạn hội thoại (V2.4) |
| Dictation | **Practice** · thẻ **Dictation** → chọn bài → *Từng câu* hoặc *Theo đoạn* | |
| Nghe số, giờ, ngày, giá | **Practice** · thẻ **Numbers listening** | Dữ liệu Counters |
| Câu nghe sai | **Practice** · thẻ **Listening mistakes** (hiện số câu) | Từ mọi phần nghe ở trên |
| Thi thử phần nghe JLPT | **Tab JLPT** · mảng 聴解 → thẻ **Mock listening test** + lịch sử 5 đề | Giữ nguyên luật §4.2 |
| Tab Listening | **Bỏ** khỏi thanh điều hướng; `/listening` chuyển về `/practice` | Trang phiên `/listening/session/[id]` giữ (dùng chung) |

## V2.2 Grammar · nghe theo câu (mỗi bài)

- **Mix 10 câu** (lựa chọn 10 / 20): 4 *nghe → chọn câu đã nghe*, 3 *nghe câu → chọn nghĩa*, 3 *nghe hỏi → chọn câu đáp*. Hoặc chọn một dạng riêng. Mix thiếu dạng nào thì dạng khác bù.
- **Nghe → chọn câu đã nghe (mới):** 4 câu tiếng Nhật **chỉ khác một chỗ**: câu đúng + 3 câu thay một chỗ hỏi của câu (trợ từ / từ / thể) bằng nhiễu soạn sẵn của chỗ đó — vd. 京都**へ**行きます / 京都**で**行きます / 京都へ**行きました** / 京都へ**行きません**. Lựa chọn hiện chữ (không furigana: nhiễu là chữ soạn sẵn, không có cách đọc riêng). Câu không có chỗ hỏi đủ 3 nhiễu thì không dùng; độ dài câu như §3.2.
- **Nghe câu → chọn nghĩa:** giữ như V1 (§3.2, nhiễu na ná).
- **Nghe hỏi → chọn câu đáp:** giữ như V1 (§3.3).
- Âm thanh, tốc độ, ẩn chữ: như V1 §2. Kết quả, luyện lại câu sai: như V1 §3.1.

## V2.2b Grammar · Listening theo từng mẫu — CONFIRMED (chủ dự án chốt 2026-11-16), thay cách chọn theo bài ở V2.2

- Trang `/grammar/listening`: danh sách mẫu theo bài (N5 / N4), mỗi mẫu **30 câu nghe, 3 chặng × 10 câu**: chặng 1 cơ bản, chặng 2–3 khó dần.
- **Câu lấy từ câu ngữ pháp đã soạn và đã duyệt** của mẫu đó (đã kiểm tra chỉ dùng từ vựng tới bài đó; câu độ khó 2–3 kết hợp mẫu đã học). Không soạn câu mới.
  - Chặng 1: 10 câu độ khó 1, ưu tiên câu chỉ có mẫu này.
  - Chặng 2: 10 câu độ khó 2; chặng 3: 10 câu độ khó 3; cả hai ưu tiên câu kết hợp mẫu đã học.
  - Bài 21–50 có 40 câu / mẫu: chọn 30 theo thứ tự trên (ổn định giữa các lần học). Độ khó nào thiếu thì lấy từ độ khó gần nhất.
- **Dạng hỏi theo chặng:** chặng 1 chọn câu đã nghe; chặng 2 xen kẽ chọn câu đã nghe / nghe câu → chọn nghĩa; chặng 3 hỏi–đáp nếu câu có câu hỏi, còn lại xen kẽ chọn nghĩa / chép chính tả (câu ≤ 20 chữ, toàn kana khi đọc). Câu không dựng được dạng đó thì dùng dạng khác.
- **Mở chặng:** chặng 1 luôn mở; chặng sau mở khi lần nộp tốt nhất của chặng trước đúng ≥ 8/10. Phiên "luyện lại câu sai" không tính vào tiến độ chặng.
- Mỗi chặng hiện lần nộp tốt nhất (vd. 9/10). Không đổi lịch học Grammar.
- Migration `20261126000001`: kiểu phiên `point`, cột `point_code`.

## V2.3 Practice · Dictation

- Chọn bài (1–50, lưới như Grammar) rồi chọn chế độ:
  - **Từng câu riêng:** 10 / 20 câu ngắn của bài, như V1 §3.4 (chỉ câu, ≤ 10 / 14 / 18 chữ theo bài, chỉ câu đọc ra toàn kana).
  - **Theo đoạn:** chọn một hội thoại của bài (V2.4); chép **lần lượt từng lượt nói theo thứ tự** (mỗi lượt 1 câu gõ), được nghe lại lượt đó và nghe lại cả đoạn tới lượt đang chép. Chấm từng lượt; cuối phiên xem lại cả đoạn có furigana, nghĩa, chỗ gõ sai. Lượt dài hơn 24 chữ được tách theo câu (。).
- Chấm như V1 §3.4.

## V2.4 Practice · Conversation listening (nghe theo đoạn)

- **2 hội thoại mỗi bài**, soạn mới (không dùng hội thoại / audio sách Minna — bản quyền 3A Corporation), chỉ dùng từ và mẫu từ bài 1 tới bài đó (công cụ kiểm tra như JLPT đợt 2), 2 giọng nam / nữ:

| | Hội thoại 1 (ngắn) | Hội thoại 2 (dài) |
|---|---|---|
| Số lượt nói | 6–8 | 10–14 |
| Ô trống | 4–6 | 8–10 |

- **Ô trống** là điểm nghe của bài: từ mới, trợ từ, thể, **số / giờ / ngày / giá**. Mỗi ô 1 từ hoặc cụm ≤ 6 kana.
- **Trả lời:** mỗi ô **chọn trong 4** từ **nghe na ná** (soạn tay: じゅうじ / じゅうよじ / しちじ / じゅうしちじ; きました / きませんでした …). Không gõ (gõ đã có ở Dictation).
- **Luồng:** nghe cả đoạn 1 lần (ẩn chữ) → hiện lời có ô trống → điền, nghe lại cả đoạn hoặc từng lượt (Normal / Slow) → nộp → chấm từng ô.
- **Phân tích câu** sau khi nộp: mỗi lượt có furigana, nghĩa, từ (bấm mở Library), mẫu ngữ pháp (bấm mở Grammar), nghe lại; ô trống hiện đáp án và lựa chọn của người học.
- Nội dung chủ dự án duyệt trước khi bật (cờ `approved`). **Làm bài 1–25 trước** (50 hội thoại, khoảng 350 ô), duyệt, rồi bài 26–50.
- Dictation theo đoạn (V2.3) dùng chung các hội thoại này.

### V2.4b Đợt B — trạng thái (2026-11-16)

- **Nội dung bài 1–25 — chủ dự án đã duyệt toàn bộ (2026-11-16):** 50 hội thoại (25 ngắn, 25 dài), 448 lượt nói, 339 ô trống — `docs/listening-review-b.md`. Soạn bằng `scripts/listening-content/` (`ldsl.py`, `conv_*.py`, `show.py`), gộp vào `data/listening/conversations.json`; app chỉ dùng hội thoại có `approved: true` (bật: `write(..., approved=True)` trong `conv_*.py`, chạy lại, `python3 ldsl.py`).
- **Code đã có:** Practice · Conversation listening (`/practice/conversations`, phiên `/listening/conversation/[id]`, kiểu phiên `conversation`, migration `20261127000001`); Dictation theo đoạn (chế độ *Short / Long conversation*, mỗi lượt một câu gõ, lượt > 24 chữ tách theo 。, lượt có chữ số / chữ Latin bỏ qua, nút "From the start"). Ô sai vào danh sách câu nghe sai (dựng lại thành câu nghe lẻ: nghe lượt đó, chọn từ).
- **Phân tích câu** sau khi nộp: furigana, nghĩa, từ trong câu (tra theo từ vựng tới bài đó; động từ chia ます đưa về thể ます), các mẫu ngữ pháp của hội thoại (bấm mở Grammar), nghe lại từng lượt, ô đúng / sai và lựa chọn của người học.

## V2.5 Practice · Numbers listening

- Dữ liệu Counters (số, giờ phút, ngày tháng, thứ, giá tiền 円, số người / cái…). Chọn nhóm (mặc định: tất cả) và 10 / 20 câu.
- **Nghe → chọn** (mặc định): máy đọc một số / giờ / ngày / giá, chọn trong 4 cách viết **nghe na ná**: 4時 / 7時 / 14時 / 40分; 4日 / 8日 / 14日 / 20日; 300円 / 3000円 / 330円 / 13000円. Nhiễu theo quy tắc dễ nhầm khi nghe (よじ/しちじ, よっか/ようか/はつか, ひゃく/びゃく/ぴゃく, số gần nhau, thêm/bớt một chữ số).
- **Nghe → gõ số**: gõ chữ số (vd. 1430 cho じゅうよじさんじゅっぷん → 14:30; 3000 cho さんぜんえん). Chấm theo giá trị.
- Không ghi lịch học; ghi nhật ký nghe (để vào danh sách câu nghe sai).

## V2.6 Danh sách câu nghe sai

- Mọi câu nghe (V2.2, V2.3, V2.5) trả lời sai được vào danh sách; **ra khỏi danh sách khi trả lời đúng 2 lần liên tiếp** ở lần ôn sau. Hội thoại (V2.4): ô sai vào danh sách dạng "nghe lại lượt nói đó, chọn lại".
- Practice · **Listening mistakes**: hiện số câu; phiên 10 / 20 câu sai cũ nhất trước.
- Thi thử JLPT không đưa vào danh sách (đã có phần xem lại).

## V2.7 Phím tắt (mọi phần nghe)

| Phím | Việc |
|---|---|
| Space | Nghe lại (thi thử: chỉ khi chưa phát xong lần đầu) |
| 1–4 | Chọn lựa chọn |
| Enter | Kiểm tra / Tiếp |
| S | Đổi tốc độ Normal / Slow (không có ở thi thử) |

Khi đang gõ trong ô nhập, chỉ Enter hoạt động.

## V2.8 Kỹ thuật

- Migration `20261125000001`: `kind` của phiên và nhật ký thêm `numbers`, `mistakes` (đợt B thêm kiểu hội thoại khi cần). Danh sách câu nghe sai **tính từ `listening_logs`** (không thêm bảng): mỗi câu theo `type|ref`, dựng lại câu với nhiễu mới. Không đổi FSRS / lịch.
- Hội thoại: `data/listening/*.json` soạn bằng script (như `scripts/jlpt-content`), nhập ở server.
- Bỏ khỏi thanh điều hướng mục Listening; điện thoại trở lại 6 mục.

## V2.9 Đợt triển khai

| Đợt | Nội dung |
|---|---|
| A | Bỏ tab, thi thử về tab JLPT; Grammar · nghe theo câu (3 dạng, có dạng mới); Practice · Dictation từng câu; Numbers listening; danh sách câu nghe sai; phím tắt; migration |
| B | Soạn 50 hội thoại bài 1–25 → chủ dự án duyệt → Conversation listening + Dictation theo đoạn |
| C | 50 hội thoại bài 26–50 |

---

> V1 — trạng thái: **CONFIRMED** (chủ dự án duyệt 2026-11-15). Đợt 1 đã có trong code: `lib/listening/questions.ts`, `lib/dal/listening.ts`, trang `/listening`, migration `20261124000001_listening.sql`. Chủ dự án đã chốt: tab riêng trên thanh điều hướng; theo bài chọn tự do bài 1–50; dạng bài gồm hội thoại điền chỗ trống + phân tích câu, nghe câu → chọn nghĩa, nghe hỏi → chọn đáp, chép chính tả; JLPT có cả luyện từng dạng và thi thử phần nghe.
> Không đổi FSRS, điểm Stage hay lịch học (chỉ Official Review cập nhật FSRS). Luyện nghe chỉ ghi nhật ký riêng.

## 1. Vị trí

- Tab **Listening** (`/listening`, biểu tượng tai nghe) trên thanh điều hướng, sau JLPT. Điện thoại: thanh dưới 7 mục.
- Trang gồm 2 khối: **By lesson** và **JLPT**.

## 2. Âm thanh (dùng chung)

| Mục | Quy định |
|---|---|
| Giọng | Giọng tiếng Nhật của thiết bị. Hội thoại: nam / nữ khác giọng; thiết bị chỉ có 1 giọng thì đổi cao độ (như JLPT đợt 2). |
| Tốc độ | **Normal** 0.9 (mặc định) và **Slow** 0.7, nút chuyển trên màn hình, nhớ lựa chọn trên thiết bị. Thi thử JLPT chỉ có Normal. |
| Phát | Tự phát 1 lần khi câu hiện ra. Luyện: nghe lại không giới hạn. Thi thử: chỉ phát 1 lần (§4.2). |
| Chữ | Ẩn tới khi trả lời. Không có nút hiện chữ trước khi trả lời (khác 即時応答 ở tab JLPT). |
| Thiết bị không có giọng Nhật | Báo "This device has no Japanese voice" và cho làm ở chế độ đọc chữ; câu làm ở chế độ này không tính vào tỷ lệ đúng. |

## 3. Theo bài (Minna 1–50)

### 3.1 Chọn bài và phiên

- Lưới bài 1–50, chia N5 (1–25) và N4 (26–50). Mỗi ô: số bài, dấu ✓ nếu đã học (có từ hoặc mẫu ngữ pháp đã học của bài), tỷ lệ đúng 30 ngày.
- Mở một bài → chọn dạng: **Mix** (mặc định), hoặc một dạng A–D. Chọn một dạng thì phiên chỉ có dạng đó; bài có ít câu hơn số đã chọn thì phiên ngắn hơn (vd. bài ít cặp hỏi–đáp).
- **Số câu mỗi phiên: 10** (lựa chọn 10 / 20). Hội thoại (dạng D) tính theo hội thoại, không theo số câu (§3.5).
- **Mix 10 câu:** 4 câu A + 3 câu B + 3 câu C, xen kẽ. 20 câu: gấp đôi. Mix không gồm D.
- Câu sai: sau phiên có nút "Practice wrong answers" (phiên mới chỉ gồm câu sai), như JLPT.
- Trong một phiên không lặp câu; ưu tiên câu chưa gặp hoặc làm sai gần nhất.

### 3.2 Dạng A — Nghe câu → chọn nghĩa

- Nguồn: câu ngữ pháp của bài (trung bình 144 câu/bài).
- 4 lựa chọn tiếng Việt: nghĩa đúng + nghĩa của **3 câu na ná nhất** trong bài này và các bài trước (chủ dự án chốt 2026-11-15), để phải nghe đúng chi tiết. Độ giống = 60% chữ tiếng Việt chung của nghĩa + 40% mảnh tiếng Nhật chung. Bỏ câu cùng nghĩa (cùng tập chữ) và nhiễu trùng nhau.
- Độ dài câu theo bài: bài 1–10 câu ≤ 12 chữ; 11–25 ≤ 20 chữ; 26–50 không giới hạn.
- Sau khi trả lời: hiện câu có furigana, nghĩa, nút nghe lại.

### 3.3 Dạng B — Nghe hỏi → chọn câu đáp

- Nguồn: cặp hỏi–đáp của bài (ít nhất 4, trung bình 15 mỗi bài).
- **3 lựa chọn** như 即時応答: câu đáp đúng + 2 câu đáp sai soạn sẵn cho đúng câu hỏi đó. Lựa chọn hiện bằng chữ (không furigana) — đây là luyện nghe câu hỏi.
- Sau khi trả lời: hiện câu hỏi có furigana, nghĩa câu hỏi và câu đáp.

### 3.4 Dạng C — Chép chính tả

- **Chỉ chép câu** (không chép từ; chủ dự án chốt 2026-11-15). Nghe rồi gõ romaji → kana. Chấm như ô gõ Learn: không phân biệt Hiragana / Katakana, ー, khoảng trắng, dấu câu.
- **Độ dài theo bài** (số chữ, không tính dấu câu): bài 1–10 ≤ 10; 11–25 ≤ 14; 26–50 ≤ 18. Bài không đủ câu trong giới hạn thì lấy thêm câu ngắn nhất.
- Chỉ dùng câu đọc ra toàn kana (không số, không chữ Latin), để chữ gõ khớp lời máy đọc.
- Sau khi chấm: hiện đáp án có furigana và nghĩa, tô chỗ gõ sai (so từng chữ kana).

### 3.5 Dạng D — Hội thoại điền chỗ trống + phân tích câu (cần soạn nội dung, đợt 2–3)

- **2 hội thoại mỗi bài**, soạn mới (không dùng hội thoại / audio của sách Minna — bản quyền 3A Corporation), chỉ dùng từ và mẫu ngữ pháp từ bài 1 tới bài đó (công cụ kiểm tra như JLPT đợt 2):

| | Hội thoại 1 (cơ bản) | Hội thoại 2 (mở rộng) |
|---|---|---|
| Số lượt nói | 4–6 | 6–8 |
| Ô trống | 4 | 6 |
| Mục đích | Mẫu chính của bài trong tình huống quen | Kết hợp mẫu của bài với bài trước |

- **Ô trống** là điểm học của bài: từ mới của bài, trợ từ, thể động từ / tính từ. Mỗi ô 1 từ hoặc 1 cụm ≤ 6 kana.
- **Cách trả lời:** người học chọn ở đầu phiên — **Choose** (mặc định: mỗi ô 4 lựa chọn) hoặc **Type** (gõ romaji → kana).
- **Luồng:** nghe cả hội thoại 1 lần (ẩn chữ) → hiện lời thoại có ô trống → điền, được nghe lại cả bài hoặc từng lượt → nộp → chấm từng ô.
- **Phân tích câu** (sau khi nộp), mỗi lượt nói:
  - câu có furigana và nghĩa tiếng Việt, nút nghe lại (Normal / Slow);
  - danh sách từ trong câu: chữ · cách đọc · nghĩa · bài (bấm mở Library);
  - mẫu ngữ pháp trong câu: tên mẫu · nghĩa · bài (bấm mở Grammar);
  - ô trống: đáp án đúng, câu trả lời của người học.
- Một phiên dạng D = 1 hội thoại. Tỷ lệ đúng tính theo số ô.
- Nội dung soạn xong được chủ dự án duyệt trước khi bật (cờ `approved`), như JLPT đợt 2.

## 4. JLPT (N5 / N4)

### 4.1 Luyện từng dạng

- 4 dạng: 課題理解, ポイント理解, 発話表現, 即時応答. Dùng lại phiên của tab JLPT (cùng nội dung, cùng thống kê), 10 / 20 / 30 câu.
- Trang Listening chỉ là lối vào; tỷ lệ đúng hiện giống tab JLPT.

### 4.2 Thi thử phần nghe

| | 問題1 課題理解 | 問題2 ポイント理解 | 問題3 発話表現 | 問題4 即時応答 | Tổng | Thời gian tham khảo |
|---|---|---|---|---|---|---|
| N5 | 7 | 6 | 5 | 6 | **24** | 30 phút |
| N4 | 8 | 7 | 5 | 8 | **28** | 35 phút |

- **Như đề thật:** làm theo thứ tự 問題1 → 4; mỗi câu phát 1 lần, không nghe lại, không hiện chữ, không quay lại câu trước. Chọn xong bấm Next.
- Đồng hồ tổng chỉ để tham khảo, hết giờ không tự nộp.
- **Chấm cuối đề:** điểm từng 問題 và tổng; mức tham khảo ≥ 60% là "Good". Không quy đổi sang điểm JLPT thật.
- **Xem lại:** mỗi câu có lời thoại, đáp án, giải thích, được nghe lại.
- **Chọn câu:** chỉ dùng nội dung đã duyệt; ưu tiên câu chưa có trong các đề thi thử trước. Ngân hàng hiện có 20 bài mỗi dạng 1–3 mỗi cấp, đủ khoảng 3 đề khác nhau; sau đó lặp lại câu cũ nhất.
- Thi thử ghi nhật ký riêng, không tính vào tỷ lệ "luyện từng dạng".

## 5. Lưu và thống kê

- Migration mới: `listening_sessions` (người học, kiểu `lesson` / `jlpt_mock`, bài hoặc cấp, dạng, câu hỏi đã dựng, câu trả lời, trạng thái, điểm) và `listening_logs` (mỗi câu / mỗi ô: dạng, mã nguồn, đúng/sai, ngày học). Chấm ở server, đáp án không gửi trước cho trình duyệt (như JLPT). RLS: chỉ chủ sở hữu đọc/ghi; không xoá.
- Hội thoại (dạng D): `data/listening/*.json` soạn bằng script, nhập ở server như JLPT đợt 2 — không cần bảng nội dung.
- Thống kê: tỷ lệ đúng 30 ngày theo bài và theo dạng; lịch sử thi thử (ngày, điểm từng 問題).

## 6. Đợt triển khai

| Đợt | Nội dung | Ghi chú |
|---|---|---|
| 1 | Tab Listening; theo bài dạng A, B, C và Mix; JLPT luyện từng dạng + thi thử; migration | Dùng dữ liệu có sẵn |
| 2 | Dạng D bài 1–25: 50 hội thoại, khoảng 250 ô trống, phân tích câu | Chủ dự án duyệt nội dung |
| 3 | Dạng D bài 26–50: 50 hội thoại, khoảng 250 ô trống | Chủ dự án duyệt nội dung |
