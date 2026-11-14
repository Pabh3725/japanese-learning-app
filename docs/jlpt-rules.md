# JLPT-01 — Ôn thi JLPT N5/N4 `JLPT_V1`

> Trạng thái: **CONFIRMED** (chủ dự án duyệt 2026-11-14), đợt 1. Mục ghi PROPOSED là chi tiết kỹ thuật người viết đề xuất, được phép chỉnh khi code và test, nhưng phải báo lại.

## 1. Vị trí và phạm vi

- **Tab chính "JLPT"** (`/jlpt`) trên thanh điều hướng, ngang Learn, Grammar, Review.
- Chọn **cấp N5 hoặc N4**. Phạm vi câu hỏi: **toàn bộ cấp** (mặc định, như đề thật) hoặc **chỉ những gì đã học**.
  - Từ vựng, Kanji theo `jlpt_level`; ngữ pháp: N5 là bài 1–25, N4 là bài 26–50.
  - "Đã học": từ đã gặp (có tiến độ), mẫu ngữ pháp đã mở. — PROPOSED
- **Không đổi điểm, lịch hay FSRS** nào (chỉ Official Review đổi FSRS). Mỗi câu ghi `jlpt_logs` (chỉ thêm) để tính tỷ lệ đúng từng dạng.
- Thi thử đủ đề có tính giờ: để sau.

## 2. Mảng và dạng bài

| Mảng | Dạng (tên đề thật) | Đợt | Nguồn |
| --- | --- | --- | --- |
| Chữ Hán | 漢字読み — chọn cách đọc của từ Kanji gạch chân | 1 | Từ vựng; câu ngữ pháp có chứa từ làm ngữ cảnh |
| Chữ Hán | 表記 — chọn cách viết Kanji của từ Hiragana gạch chân | 1 | Từ vựng; chữ gần giống đã duyệt, chữ cùng âm On |
| Từ vựng | 文脈規定 — chọn từ điền vào câu | 2 | Soạn mới |
| Từ vựng | 言い換え類義 — câu đồng nghĩa | 2 | Soạn mới |
| Từ vựng | 用法 — cách dùng từ (chỉ N4) | 2 | Soạn mới |
| Ngữ pháp | 文法形式の判断 — chọn trợ từ / từ / thể điền vào chỗ trống | 1 | Chỗ hỏi của câu ngữ pháp |
| Ngữ pháp | 文の組み立て — sắp xếp, chọn mảnh ở ★ | 1 | Câu ngữ pháp sắp xếp được |
| Ngữ pháp | 文章の文法 — ngữ pháp trong đoạn văn | 2 | Soạn mới |
| Đọc hiểu | 読解 — đoạn ngắn, đoạn vừa, tìm thông tin | 2 | Soạn mới |
| Nghe hiểu | 即時応答 — nghe câu nói, chọn câu đáp | 1 | Câu ngữ pháp có câu hỏi–đáp, máy đọc |
| Nghe hiểu | 課題理解・ポイント理解 | 2 | Soạn mới, máy đọc |
| Nghe hiểu | 発話表現 — nhìn tình huống, chọn câu nói | 2 | Cần tranh hoặc mô tả tình huống |

Dạng đợt 2 hiện "Coming soon".

## 3. Dựng câu (đợt 1) — PROPOSED, đã đối chiếu định dạng với jlpt.jp (bảng dạng bài N5/N4 và Official Practice Workbook Vol.2, 2018) ngày 2026-11-14

- **4 lựa chọn** đánh số 1–4 như đề thật (即時応答: 3 lựa chọn). Không có hai lựa chọn trùng nhau; đúng một đáp án đúng.
- **漢字読み:** từ có Kanji của cấp. Ngữ cảnh là một câu ngữ pháp chứa đúng từ đó (mảnh trùng cách viết), không có thì hiện từ đứng riêng. Như đề thật, trộn hai kiểu nhiễu: 1–2 cách đọc của **từ cùng bài, cùng loại từ** (danh từ / động từ ます / tính từ い, độ dài gần bằng; như 4 từ thời tiết), và cách đọc bị đổi một chỗ: trường âm (こう ↔ こ), âm đục / bán đục, âm ngắt (っ), âm ghép (ょ ↔ よ); chỉ đổi trong phần đọc của chữ Hán, không đổi kana đi kèm. Nhiễu không trùng cách đọc của chính từ đó.
- **表記:** từ có Kanji của cấp, hiện bằng Hiragana gạch chân. Từ có hai chữ Hán: 4 lựa chọn là **lưới 2×2** (đúng / thay ở từng chữ, như đề thật); từ khác: thay một chữ. Chữ thay là chữ gần giống (cặp đã duyệt) hoặc chữ cùng âm On trong bảng Kanji. Không lấp bằng từ bất kỳ: thiếu nhiễu tốt thì bỏ từ đó. Nhiễu không trùng cách viết của từ có thật cùng cách đọc. **N5 có cả Katakana** (khoảng 1/4 số câu): từ ngoại lai viết Hiragana, lưới 2×2 ở hai chữ dễ nhầm (ツ/ソ, シ/ン, ウ/ワ…).
- **文法形式の判断:** một chỗ hỏi của câu ngữ pháp (trợ từ, từ, thể); 3 nhiễu lấy đúng nhiễu soạn sẵn của chỗ đó. Giải thích: mẫu, nghĩa mẫu, nghĩa câu.
- **文の組み立て:** câu sắp xếp được (một câu, không dấu phẩy, ít nhất 4 mảnh). Che 4 mảnh liền nhau, ★ ở một ô bất kỳ (đề thật đổi vị trí ★); lựa chọn là 4 mảnh bị che (chữ khác nhau).
- **即時応答:** máy đọc câu hỏi (giọng Nhật của thiết bị), chọn câu đáp; mặc định không hiện chữ, có nút hiện chữ. Nhiễu là câu đáp sai soạn sẵn cho đúng câu hỏi đó.

## 4. Phiên ôn

- Chọn một hoặc nhiều dạng (hoặc cả mảng), số câu 10 / 20 / 30. Câu chia đều các dạng đã chọn, xáo thứ tự.
- Trả lời xong mỗi câu: hiện đáp án đúng và giải thích, rồi bấm tiếp.
- Màn kết thúc: điểm theo từng dạng; nút "Practice wrong answers" mở phiên mới chỉ gồm các câu sai.
- Phiên lưu ở server (`jlpt_sessions`); chấm ở server, đáp án không gửi trước cho trình duyệt.
- Tỷ lệ đúng từng dạng trên trang JLPT: 30 ngày gần nhất.

## 5. Thi thử (để sau)

Thời gian theo jlpt.jp: N5 — từ vựng 20 phút, ngữ pháp・đọc hiểu 40 phút, nghe 30 phút; N4 — 25, 55, 35 phút. Số câu từng 問題 cần đếm lại khi làm thi thử.
