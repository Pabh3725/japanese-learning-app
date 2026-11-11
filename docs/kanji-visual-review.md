# Rà soát dữ liệu Kanji trực quan (V9 gói 6)

File này do `pnpm kanji:visual` tạo, đừng sửa tay. Nguồn nét viết, thành phần và bộ thủ: KanjiVG r20260714, copyright Ulrich Apel, CC BY-SA 3.0.

## 1. Độ phủ

- Có dữ liệu KanjiVG: 844/844 chữ.
- Không xác định được bộ thủ: 0.
- Số nét: điền thêm 0 chữ còn trống trong kanji.csv; 0 chữ có số nét khác KanjiVG (giữ số trong file): không có.

## 2. Tên bộ thủ

Tên tiếng Việt của 214 bộ ở `data/n5/radicals.csv` do Claude soạn, đang **chờ duyệt** (`approved` = `false`). Sửa tên nếu cần, đặt `approved` = `true`. Chưa duyệt thì app chỉ hiện chữ bộ và số thứ tự.

## 3. Cặp chữ gần giống

Script đề xuất 1237 cặp (so hình nét viết trên lưới, số nét chênh ≤ 2, mỗi chữ tối đa 3 cặp). Đã duyệt: 492. Chỉ cặp `approved` = `true` trong `data/n5/kanji_similar.csv` mới được dùng cho câu hỏi.

20 cặp giống nhất:

| Cặp | Điểm | Giải thích tự động |
| --- | --- | --- |
| 国 困 | 1 | 国 (QUỐC, đất nước) và 困 (KHỐN, khó khăn). 国 có 8 nét, 困 có 7 nét. Khác ở thành phần: 国 có 玉, 困 có 木. |
| 図 固 | 1 | 図 (ĐỒ, bản vẽ; sơ đồ) và 固 (CỐ, cứng). 図 có 7 nét, 固 có 8 nét. Khác ở thành phần: 図 có ⺍, 乂, 固 có 古. |
| 開 関 | 1 | 開 (KHAI, mở) và 関 (QUAN, liên quan). 開 có 12 nét, 関 có 14 nét. Khác ở thành phần: 開 có 开, 関 có 关. |
| 団 困 | 0.994 | 団 (ĐOÀN, đoàn; nhóm) và 困 (KHỐN, khó khăn). 団 có 6 nét, 困 có 7 nét. Khác ở thành phần: 団 có 寸, 困 có 木. |
| 国 団 | 0.994 | 国 (QUỐC, đất nước) và 団 (ĐOÀN, đoàn; nhóm). 国 có 8 nét, 団 có 6 nét. Khác ở thành phần: 国 có 玉, 団 có 寸. |
| 間 開 | 0.988 | 間 (GIAN, khoảng giữa; thời gian) và 開 (KHAI, mở). Cả hai đều 12 nét. Khác ở thành phần: 間 có 日, 開 có 开. |
| 間 関 | 0.988 | 間 (GIAN, khoảng giữa; thời gian) và 関 (QUAN, liên quan). 間 có 12 nét, 関 có 14 nét. Khác ở thành phần: 間 có 日, 関 có 关. |
| 団 固 | 0.987 | 団 (ĐOÀN, đoàn; nhóm) và 固 (CỐ, cứng). 団 có 6 nét, 固 có 8 nét. Khác ở thành phần: 団 có 寸, 固 có 古. |
| 眠 眼 | 0.986 | 眠 (MIÊN, ngủ; buồn ngủ) và 眼 (NHÃN, mắt). 眠 có 10 nét, 眼 có 11 nét. Khác ở thành phần: 眠 có 民, 眼 có 艮. |
| 困 固 | 0.981 | 困 (KHỐN, khó khăn) và 固 (CỐ, cứng). 困 có 7 nét, 固 có 8 nét. Khác ở thành phần: 困 có 木, 固 có 古. |
| 国 図 | 0.981 | 国 (QUỐC, đất nước) và 図 (ĐỒ, bản vẽ; sơ đồ). 国 có 8 nét, 図 có 7 nét. Khác ở thành phần: 国 có 玉, 図 có ⺍, 乂. |
| 休 体 | 0.978 | 休 (HƯU, nghỉ) và 体 (THỂ, cơ thể). 休 có 6 nét, 体 có 7 nét. Khác ở thành phần: 休 có 木, 体 có 本. |
| 図 因 | 0.975 | 図 (ĐỒ, bản vẽ; sơ đồ) và 因 (NHÂN, nguyên nhân). 図 có 7 nét, 因 có 6 nét. Khác ở thành phần: 図 có ⺍, 乂, 因 có 大. |
| 線 練 | 0.975 | 線 (TUYẾN, đường; tuyến) và 練 (LUYỆN, luyện tập). 線 có 15 nét, 練 có 14 nét. Khác ở thành phần: 線 có 泉, 練 có 東. |
| 間 問 | 0.969 | 間 (GIAN, khoảng giữa; thời gian) và 問 (VẤN, hỏi; vấn đề). 間 có 12 nét, 問 có 11 nét. Khác ở thành phần: 間 có 日, 問 có 口. |
| 遅 連 | 0.968 | 遅 (TRÌ, muộn; chậm) và 連 (LIÊN, dẫn theo; liên tiếp). 遅 có 12 nét, 連 có 10 nét. Khác ở thành phần: 遅 có 尸, 羊, 連 có 車. |
| 温 混 | 0.966 | 温 (ÔN, ấm) và 混 (HỖN, trộn). 温 có 12 nét, 混 có 11 nét. Khác ở thành phần: 温 có 昷, 混 có 昆. |
| 過 適 | 0.962 | 過 (QUÁ, quá) và 適 (THÍCH, thích hợp). 過 có 12 nét, 適 có 14 nét. Khác ở thành phần: 過 có 咼, 適 có 啇. |
| 料 科 | 0.959 | 料 (LIỆU, nguyên liệu; phí) và 科 (KHOA, khoa). 料 có 10 nét, 科 có 9 nét. Khác ở thành phần: 料 có 米, 科 có 禾. |
| 輪 輸 | 0.958 | 輪 (LUÂN, vòng) và 輸 (THÂU, vận chuyển). 輪 có 15 nét, 輸 có 16 nét. Khác ở thành phần: 輪 có 侖, 輸 có 俞. |
