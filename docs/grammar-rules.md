# Luật học Ngữ pháp và Thể động từ — GRAMMAR_V1

> Trạng thái: **Đã chốt thiết kế** (chủ dự án duyệt 2026-11-15), gói G1 của kế hoạch Grammar. Chưa có code. Mục ghi PROPOSED là chi tiết người viết đề xuất, được phép chỉnh khi code và test, nhưng phải báo lại. Luật từ vựng và Kanji ở `docs/learning-rules.md` (RULES_V9) không đổi.

## 1. Phạm vi và nguyên tắc

- **Khu riêng:** Grammar không trộn vào bài Learn (R11 AIS) và không dùng ngân sách `learn_cap`. — CONFIRMED
- **Grammar là tab chính:** lên thanh điều hướng chính (cùng Home, Learn, Review, Practice), không còn nằm trong mục phụ. Trong tab Grammar có các phần: **Bài học** (danh sách bài, Học), **Ôn**, **Luyện thêm**, **Thể động từ**, **Kiểm tra**. Mục "Verb forms" riêng bị bỏ khỏi điều hướng; Ôn ngữ pháp nằm trong tab Grammar, không ở tab Review. — CONFIRMED (2026-11-15)
- **Phạm vi:** 50 bài của Minna no Nihongo sơ cấp (bài 1–25 là N5, 26–50 là N4). File từ vựng hiện có tới bài 48; từ vựng bài 49–50 được bổ sung ở gói G0. — CONFIRMED
- **Nguồn nội dung:** danh sách mẫu ngữ pháp theo bài tra từ các trang web và tài liệu Minna trên mạng (là dữ kiện). Giải thích tiếng Việt, câu gốc, câu hỏi do Claude **tự soạn**, không chép nguyên văn giáo trình hay trang web. — CONFIRMED
- **Duyệt:** chủ dự án duyệt theo nhóm 5 bài. Với mỗi mẫu: đọc giải thích và 5 câu tiêu biểu; 25 câu còn lại qua kiểm tra tự động (§4.4). Chỉ mẫu `approved` hiện cho người học; chạy lại script không ghi đè nội dung đã duyệt. — CONFIRMED
- **Không vùng xám:** mọi câu hỏi chấm bằng đáp án suy ra từ câu gốc đã đánh dấu. Không gõ nghĩa tiếng Việt. — CONFIRMED
- **Chỉ Official Review đổi FSRS:** giai đoạn Học ghi nhật ký Học; Luyện thêm ghi nhật ký luyện tập; khu Thể động từ không có lịch. — CONFIRMED (theo nguyên tắc chung của dự án)

## 2. Định nghĩa

| Thuật ngữ | Nghĩa |
| --- | --- |
| **Mẫu (grammar point)** | Một điểm ngữ pháp của một bài, ví dụ 「N1 は N2 です」 (bài 1). Đơn vị học, có một Card. |
| **Câu gốc** | Câu tiếng Nhật hoàn chỉnh do Claude soạn, có nghĩa tiếng Việt và các đánh dấu (§4.2). Mỗi mẫu có 30 câu. |
| **Dạng bài** | Cách hỏi sinh từ câu gốc (§5). Có 13 dạng. |
| **Bậc** | G1 Hiểu, G2 Dùng, G3 Tạo: phần của giai đoạn Học theo điểm (§6.2). |
| **Buổi** | Phần câu của một mẫu trong một ngày học. |
| **Card ngữ pháp** | Lịch FSRS của một mẫu sau khi học xong. Không phải một câu cố định: mỗi lần ôn là câu mới. |

## 3. Mở bài — CONFIRMED (2026-11-15)

Mẫu của bài n mở khi **cả hai** điều kiện đúng:

1. Ít nhất **50% từ vựng của bài n đã xong Stage 3** (đã có Card Kana). Từ đã đánh dấu "đã biết" tính là xong; từ bị loại khỏi lộ trình không tính vào mẫu số. — PROPOSED (cách tính từ đã biết/loại)
2. Ít nhất **50% mẫu của bài n−1 đã học xong** (xong giai đoạn Học, §6.4). Bài 1 không có điều kiện này.

Trong bài đã mở, mẫu mới đến theo thứ tự trong bài. Mỗi ngày **1 mẫu mới** (Settings: 1–3). — CONFIRMED

Trang Grammar hiện mỗi bài với trạng thái: chưa mở (kèm điều kiện còn thiếu, ví dụ "Cần thêm 4 từ xong Stage 3"), đang học, xong.

## 4. Dữ liệu

### 4.1 Mẫu

`grammar_points`: bài, thứ tự trong bài, mẫu (ví dụ `N1 は N2 です`), nghĩa tiếng Việt ngắn, giải thích tiếng Việt, ghi chú lỗi hay gặp, trạng thái duyệt.

### 4.2 Câu gốc — CONFIRMED (cách làm), định dạng PROPOSED

Mỗi mẫu có **30 câu gốc từ dễ đến khó**. Mỗi câu có:

| Trường | Dùng cho |
| --- | --- |
| Câu tiếng Nhật, tách thành các **mảnh** (cụm từ có nghĩa), mỗi mảnh có cách đọc | Hiển thị Kanji + furigana; sắp xếp câu; ★; dịch-ghép câu |
| Nghĩa tiếng Việt | Chọn nghĩa; nghe câu; Đúng/Sai; dịch-ghép câu |
| **Mức** 1–3 (dễ, vừa, khó) | Chọn câu theo bậc (§6.2) |
| Các mẫu dùng trong câu (mẫu chính + mẫu cũ kết hợp) | Chỉ hỏi câu kết hợp khi người học đã học các mẫu cũ |
| Vị trí **trợ từ / từ chủ chốt** cần hỏi, kèm nhóm đáp án nhiễu có chủ đích | Chọn trợ từ/từ; tìm chỗ sai; Đúng/Sai |
| Vị trí **động từ/tính từ đã chia**, thể và dạng từ điển | Chọn dạng; gõ dạng; tìm chỗ sai; Đúng/Sai |
| Ranh giới **hai vế** (nếu có) | Ghép hai vế |
| **Câu hỏi / lời nói đi trước** (nếu là câu đáp trong hội thoại) | Chọn câu đáp |

- Câu mức 1 chỉ dùng mẫu chính và từ dễ; mức 3 kết hợp mẫu đang học với mẫu của các bài trước.
- Từ trong câu phải có trong lộ trình từ vựng tới bài đó (bài ≤ n). Số đếm, tên riêng và từ ngoài lộ trình đi kèm cách đọc và được ghi chú.
- Cách viết của từ theo cột `expression` của từ vựng; hiển thị Kanji + furigana, có nút ẩn furigana. — CONFIRMED

**Định dạng file (G2):** mỗi bài một file `data/grammar/lesson-NN.json` (`{ lesson, points: [...] }`), kiểu dữ liệu ở `lib/grammar/types.ts` (`GrammarLessonFile`). Mẫu có code `gNN-MM` (bài NN, thứ tự MM), câu có code `gNN-MM-sKK`. Mỗi câu: `level`, `pieces` (`{ t, r? }`, `r` là cách đọc kana khi mảnh có Kanji), `meaning`, `uses?`, `slots?` (`{ kind: particle | word | form, piece, accepted?, distractors, form?, dict? }`), `split?`, `prompt?`, `sample?`, `hidden?`. Dạng bài một câu làm được do `exercisesFor` suy ra. `pnpm seed` kiểm tra rồi ghi `grammar_points`, `grammar_sentences`; câu bỏ khỏi file bị ẩn chứ không xoá.

### 4.3 Đáp án nhiễu

- Trợ từ: lấy từ nhóm trợ từ đã học, **loại các trợ từ cũng đúng** trong câu đó (ví dụ câu chỉ nơi chốn mà に và で đều được thì không hỏi vị trí đó, hoặc ghi rõ trợ từ được chấp nhận để loại khỏi đáp án nhiễu).
- Dạng động từ: các thể khác của cùng động từ (ます/ません/ました/ませんでした, て, ない…), không lấy dạng cũng đúng ngữ pháp với nghĩa đã cho.
- Từ chủ chốt: cùng loại từ, khác nghĩa, không tạo câu đúng khác.
- Câu sai (tìm chỗ sai, Đúng/Sai): thay **đúng một** chỗ đã đánh dấu bằng một đáp án nhiễu ở trên.

### 4.4 Kiểm tra tự động (khi seed) — PROPOSED

Lỗi (chặn seed): thiếu trường bắt buộc; đáp án nhiễu trùng đáp án đúng hoặc nằm trong danh sách chấp nhận; mảnh ghép lại không ra câu; câu kết hợp nhắc tới mẫu chưa có hoặc mẫu của bài sau; mỗi mẫu không đủ 30 câu, hoặc không có câu cho dạng nào trong 13 dạng mà mẫu đáng lẽ có.
Cảnh báo: từ ngoài lộ trình tới bài đó; câu trùng nhau; một mức có ít hơn 6 câu.

## 5. 13 dạng bài — CONFIRMED (2026-11-15)

| # | Dạng | Cách hỏi | Cần đánh dấu |
| --- | --- | --- | --- |
| 1 | Chọn trợ từ / từ điền chỗ trống | Câu có ＿, chọn 1 trong 4 | Trợ từ / từ chủ chốt |
| 2 | Chọn từ có nghĩa phù hợp | Câu có ＿ ở từ nội dung, chọn từ hợp nghĩa | Từ chủ chốt |
| 3 | Sắp xếp các thành phần của câu | Xếp các mảnh thành câu đúng (có nghĩa tiếng Việt làm gợi ý ở mức 1) | ≥ 4 mảnh |
| 4 | Chọn dạng đúng của động từ/tính từ | Câu có ＿ kèm dạng từ điển, chọn dạng đúng | Động/tính từ đã chia |
| 5 | Hiểu câu: chọn nghĩa tiếng Việt | Đọc câu, chọn 1 trong 4 nghĩa (nghĩa nhiễu lấy từ câu gốc khác cùng mẫu) | — |
| 6 | Dịch: ghép câu tiếng Nhật | Cho nghĩa tiếng Việt, ghép từ mảnh có mảnh nhiễu | ≥ 3 mảnh |
| 7 | ★ kiểu JLPT | 4 mảnh liền nhau để trống, chọn mảnh nằm ở ô ★ | ≥ 4 mảnh liền nhau |
| 8 | Tìm chỗ sai | 4 phần gạch dưới, đúng một phần sai | Trợ từ hoặc động/tính từ |
| 9 | Ghép hai vế câu | Bảng ghép vế đầu ↔ vế sau (3–4 cặp từ các câu khác nhau) | Ranh giới hai vế |
| 10 | Nghe câu | Máy đọc câu (Web Speech), chọn nghĩa hoặc chọn câu vừa nghe; máy không có giọng tiếng Nhật thì đổi sang dạng 5 | — |
| 11 | Gõ dạng động từ vào chỗ trống | Gõ romaji tự đổi kana; đúng khi khớp dạng đã đánh dấu (chấp nhận viết Kanji hoặc kana) | Động/tính từ đã chia |
| 12 | Chọn câu đáp phù hợp | Cho câu hỏi/lời nói, chọn câu đáp đúng (đáp án nhiễu là câu đáp của câu khác) | Câu hỏi đi trước |
| 13 | Đúng/Sai | Câu kèm nghĩa tiếng Việt: câu đúng hay sai? Câu sai thay đúng một chỗ (§4.3) | Trợ từ hoặc động/tính từ |

## 6. Giai đoạn Học — CONFIRMED (2026-11-15)

### 6.1 Luồng của một mẫu

Thẻ giới thiệu (mẫu, nghĩa, giải thích, 2–3 câu ví dụ mức 1 có nghe) → buổi 1 (8 câu) → buổi 2 → buổi 3 → buổi 4 → buổi 5. Buổi rơi vào **ngày 1, 2, 3, 5, 8** (ngày 1 là ngày xem thẻ), bắt đầu 00:00 giờ VN. Học thêm (bỏ buổi, sai nhiều) thì mỗi ngày một buổi tới khi xong.

### 6.2 Ba bậc

| Bậc | Điểm | Mục tiêu | Dạng được hỏi | Mức câu |
| --- | --- | --- | --- | --- |
| **G1 · Hiểu** | 0–14 | Nhận ra mẫu, hiểu nghĩa | 5 Chọn nghĩa, 13 Đúng/Sai, 10 Nghe câu, 1 Chọn trợ từ/từ | 1 |
| **G2 · Dùng** | 15–29 | Dùng mẫu trong câu | thêm 4 Chọn dạng, 9 Ghép hai vế, 12 Chọn câu đáp, 3 Sắp xếp câu, 8 Tìm chỗ sai, 2 Chọn từ phù hợp | 1–2 |
| **G3 · Tạo** | 30–40 | Tự tạo câu, kết hợp mẫu cũ | thêm 6 Dịch-ghép câu, 11 Gõ dạng, 7 ★ JLPT | 2–3 |

Ở bậc cao vẫn được hỏi dạng của bậc dưới, nhưng dạng của bậc hiện tại được ưu tiên (§8).

### 6.3 Điểm

- Đúng **+1**, tối đa **+8 mỗi mẫu mỗi ngày**; đúng nhờ gợi ý 0; sai **−2**, không xuống dưới 0.
- Mỗi buổi 8 câu tính điểm. Sai thì có thêm câu sửa lại cuối buổi, không điểm.
- Trong một phiên Học, câu của các mẫu đến hạn hôm nay **xen kẽ**; cùng một mẫu cách nhau ít nhất 2 câu khi còn mẫu khác. — PROPOSED

### 6.4 Học xong

Mẫu học xong khi đủ **tất cả**:

- **40 điểm**;
- đúng ít nhất **3 câu ở mỗi bậc** G1, G2, G3;
- đúng ít nhất **8 dạng khác nhau** (hoặc mọi dạng mẫu có, nếu mẫu có ít hơn 8 dạng);
- **3 câu đúng liên tiếp**.

Học xong thì tạo Card ngữ pháp, đến hạn ngày hôm sau. Đúng hết thì xong sau 5 buổi (ngày 8).

### 6.5 Tải ước tính

1 mẫu mới mỗi ngày → khoảng 5 mẫu đang Học cùng lúc → khoảng 40 câu Học mỗi ngày; cộng Ôn tối đa 20 mẫu × 2–3 câu ≈ 50 câu. Khoảng 250 mẫu cho 50 bài → khoảng 8–9 tháng với 1 mẫu/ngày.

## 7. Ôn chính thức — CONFIRMED (2026-11-15)

- **Card:** mỗi mẫu một Card FSRS, khoảng cách tối đa **90 ngày**, không có Easy (giống Card từ vựng V9).
- **Trần:** tối đa **20 mẫu mỗi ngày** (Settings). Mẫu quá hạn lâu nhất trước.
- **Câu mỗi mẫu:** 2–3 câu, gồm 1 câu "hiểu" (5, 10, 13) và 1–2 câu "dùng/tạo" (các dạng còn lại), chọn bằng thuật toán §8 tính trên lịch sử ôn của mẫu. Ưu tiên câu mức 2–3 và câu kết hợp. Câu của các mẫu xen kẽ.
- **Gộp kết quả thành một lần chấm FSRS:**

| Kết quả các câu của mẫu | Rating |
| --- | --- |
| Đúng hết | Good |
| Sai 1 câu (và chưa tới một nửa) | Hard |
| Sai từ một nửa số câu trở lên | Again |

- Mẫu bị Again từ 3 lần trở lên được đánh dấu "cần luyện" và gợi ý vào Luyện thêm. — PROPOSED
- Có Archive và khôi phục như Card từ vựng (R13). — PROPOSED

## 8. Chọn dạng bài và câu gốc — CONFIRMED (2026-11-15)

Mỗi lần cần một câu cho mẫu M:

1. **Dạng hợp lệ:** dạng thuộc bậc hiện tại hoặc bậc dưới (Ôn: mọi dạng), mẫu M có câu gốc làm được dạng đó, khác dạng của câu ngay trước trong phiên (kể cả câu của mẫu khác).
2. **Độ thiếu** của mỗi dạng d: `thiếu(d) = mong_muốn(d) − thực_tế(d)`.
   - `thực_tế(d)`: tỷ lệ câu dạng d trong lịch sử của người học với mẫu M (Học và Ôn tính riêng).
   - `mong_muốn(d)`: chia đều cho các dạng hợp lệ, nhân trọng số: dạng của bậc hiện tại ×1,5; dạng có tỷ lệ sai ≥ 30% trong 10 lần gần nhất ×1,5. — PROPOSED (hệ số)
3. **Chọn dạng:** dạng thiếu nhiều nhất; ngang nhau thì chọn ngẫu nhiên có seed (tải lại trang ra đúng câu).
4. **Chọn câu gốc:** đúng mức của bậc, làm được dạng đã chọn, các mẫu kết hợp đều đã học xong hoặc đang học; trong số đó lấy câu **lâu chưa gặp nhất**, không lặp câu trong 7 ngày nếu còn câu khác.

Kết quả: theo thời gian mọi dạng hợp lệ xuất hiện gần đều, dạng yếu được hỏi thêm, không có hai câu liền nhau cùng dạng.

## 9. Luyện thêm — CONFIRMED

- Người học chọn bài, mẫu (chỉ mẫu đã mở) và dạng bài (hoặc "trộn"). Không giới hạn số câu.
- Dùng thuật toán §8 trên lịch sử luyện thêm. Ghi nhật ký luyện tập; **không đổi điểm và lịch nào**.

## 9a. Kiểm tra — CONFIRMED (2026-11-15), chi tiết PROPOSED

- Người học chọn **các bài Minna** muốn kiểm tra và **số câu** (10, 20, 30 hoặc 50; tối đa bằng số câu có được). — CONFIRMED
- Chỉ chọn được bài mà **mọi mẫu đã học xong** (§6.4). Bài còn mẫu chưa xong thì hiện mờ kèm số mẫu còn thiếu. — CONFIRMED
- Câu hỏi chỉ dùng **câu gốc mức 3** của các mẫu trong những bài đã chọn. — CONFIRMED
- Chia đều số câu cho các mẫu; dạng bài chọn bằng §8 trên toàn bài kiểm tra để các dạng xuất hiện đều; mỗi câu gốc dùng tối đa một lần trong một bài kiểm tra. — PROPOSED
- Làm như bài thi: không hiện đúng/sai từng câu; nộp bài xong mới hiện điểm (số câu đúng, %), kết quả theo mẫu và theo dạng, và xem lại từng câu sai kèm đáp án và giải thích. Không giới hạn thời gian. — PROPOSED
- **Không đổi điểm Học hay lịch FSRS.** Lưu lịch sử kiểm tra (ngày, bài, số câu, điểm). Mẫu có từ một nửa số câu sai trong bài kiểm tra được gợi ý vào Luyện thêm. — PROPOSED
- Tải lại trang giữa bài kiểm tra thì làm tiếp từ câu đang dở, đáp án đã chọn được giữ. — PROPOSED

## 10. Thể động từ (trong tab Grammar) — CONFIRMED (2026-11-15), chi tiết PROPOSED

- **Chỉ luyện, không lịch:** không có điểm Học, Card hay FSRS. Ghi nhật ký luyện tập và thống kê đúng/sai theo thể và theo động từ.
- **Theo từng thể**, mỗi thể mở khi bài dạy thể đó đã mở trong khu Grammar (§3). Danh sách dự kiến (xác minh khi soạn nội dung):

| Thể | Bài |
| --- | --- |
| ます / ません / ました / ませんでした | 4–5 |
| て形 | 14 |
| ない形 | 17 |
| 辞書形 | 18 |
| た形 | 19 |
| 普通形 | 20 |
| 可能形 | 27 |
| 意向形 | 31 |
| 命令形 / 禁止形 | 33 |
| 条件形 (ば) | 35 |
| 受身形 | 37 |
| 使役形 | 48 |
| 尊敬語 / 謙譲語 | 49–50 |

- **Động từ được hỏi:** ưu tiên động từ người học **đã xong Stage 2**; khi chưa đủ thì lấy động từ của các bài ≤ bài đang học, theo thứ tự lộ trình. — PROPOSED (mốc Stage 2)
- **Nhóm động từ** I / II / III lấy từ JMdict (EDRDG, CC BY-SA 4.0), không suy từ dạng ます; trường hợp đặc biệt (行きます → 行って, ある → ない…) ghi riêng và có test cho từng động từ.
- **Dạng bài:** gõ dạng đã chia (romaji tự đổi kana; chấp nhận Kanji hoặc kana) hoặc chọn dạng đúng trong 4. Đáp án sinh bằng quy tắc chia, không soạn tay.
- Chọn thể và động từ: thể người học chọn (hoặc trộn các thể đã mở); trong đó ưu tiên động từ hay sai và lâu chưa luyện. — PROPOSED

## 11. Settings

| Mục | Mặc định | Khoảng |
| --- | --- | --- |
| Mẫu ngữ pháp mới mỗi ngày | 1 | 1–3 |
| Mẫu ôn tối đa mỗi ngày | 20 | 5–50 |
| Hiện furigana | Bật | Bật/Tắt |

## 12. Config `GRAMMAR_V1` (dự kiến)

```ts
export const GRAMMAR_V1 = {
  lessons: 50,
  unlock: { vocabStage3Share: 0.5, previousLessonDoneShare: 0.5 },
  newPerDay: { default: 1, min: 1, max: 3 },
  learning: {
    completeAt: 40,
    questionsPerSitting: 8,
    maxPositivePerDay: 8,
    wrong: -2,
    sittingDays: [1, 2, 3, 5, 8],
    tiers: { G1: 0, G2: 15, G3: 30 },
    minCorrectPerTier: 3,
    minDistinctTypes: 8,
    correctStreak: 3,
  },
  review: { maxPerDay: 20, questionsPerPoint: [2, 3], maxIntervalDays: 90 },
  pick: { currentTierWeight: 1.5, weakTypeWeight: 1.5, weakTypeErrorRate: 0.3, weakWindow: 10, sentenceCooldownDays: 7 },
  content: { sentencesPerPoint: 30, reviewedSamplesPerPoint: 5 },
} as const
```

## 13. Kế hoạch gói

| Gói | Nội dung |
| --- | --- |
| G0 | Bổ sung từ vựng bài 49–50 vào `data/n5/vocabularies.csv` (nghĩa tự soạn, chủ dự án duyệt), chính sách Kanji cho từ mới |
| G1 | Tài liệu này |
| G2 | Database: `grammar_points`, `grammar_sentences`, tiến độ, nhật ký Học/Ôn/Luyện thêm, RLS; định dạng `data/grammar/*.json`; seed và kiểm tra §4.4 |
| G3 | Nội dung bài 1–5 + file duyệt |
| G4 | Engine (sinh 13 dạng, chọn dạng §8, Học §6, Ôn §7, Kiểm tra §9a) và giao diện tab Grammar (lên điều hướng chính); bỏ bản xem trước |
| G5 | Thể động từ trong tab Grammar: nhóm động từ từ JMdict, engine chia động từ có test, giao diện; bỏ `/verbs` riêng |
| G6 | Nội dung bài 6–50, mỗi đợt 5 bài |

## 14. Ví dụ tính tay

### VD1 — Mẫu 「N1 は N2 です」 đúng hết

- Ngày 1: xem thẻ, buổi 1: 8 câu G1 đúng → 8 điểm.
- Ngày 2: buổi 2: sau 7 câu đúng lên 15 điểm → mở G2; câu thứ 8 (đã có thể là dạng G2) → 16 điểm.
- Ngày 3: 24 điểm. Ngày 5: 32 điểm (mở G3 ở 30). Ngày 8: 40 điểm, đủ 3 câu mỗi bậc, ≥ 8 dạng (mẫu này không có động từ chia nên không có dạng 4, 11; vẫn đủ 8 dạng), 3 câu đúng liên tiếp → học xong, tạo Card, đến hạn ngày 9.

### VD2 — Sai trong buổi

Ngày 3 đang 16 điểm, buổi 3: đúng 5, sai 1, đúng 2 → 16 + 7 − 2 = 21 điểm (cộng tối đa 8 không bị chạm). Xong cần thêm buổi, rơi vào ngày 9 nếu buổi 4–5 đúng hết vẫn chưa tới 40.

### VD3 — Ôn

Card của mẫu đến hạn: 3 câu (Nghe câu, Dịch-ghép câu, ★). Sai ★ → sai 1/3 → Hard. Sai cả Dịch-ghép và ★ → 2/3 ≥ một nửa → Again.

### VD4 — Mở bài 2

Bài 2 có 40 từ (1 từ bị loại → 39). 20 từ đã xong Stage 3 (≥ 50%) và bài 1 có 4 mẫu, 2 mẫu đã học xong (50%) → mẫu đầu của bài 2 mở, đến vào ngày học kế tiếp nếu chưa dùng hết 1 mẫu mới của hôm nay.
