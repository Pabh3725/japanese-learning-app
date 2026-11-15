# LIS-01 — Luyện nghe `LISTENING_V1`

> Trạng thái: **CONFIRMED** (chủ dự án duyệt 2026-11-15). Đợt 1 đã có trong code: `lib/listening/questions.ts`, `lib/dal/listening.ts`, trang `/listening`, migration `20261124000001_listening.sql`. Chủ dự án đã chốt: tab riêng trên thanh điều hướng; theo bài chọn tự do bài 1–50; dạng bài gồm hội thoại điền chỗ trống + phân tích câu, nghe câu → chọn nghĩa, nghe hỏi → chọn đáp, chép chính tả; JLPT có cả luyện từng dạng và thi thử phần nghe.
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
