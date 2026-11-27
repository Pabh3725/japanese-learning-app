# GR-3 — Luật học Ngữ pháp V3 `GRAMMAR_V3`

> Cập nhật 2026-11-27. V3 xây trên V2 (`docs/grammar-rules-v2.md`, nhánh `feature/grammar-v2-core`) và **thay** V2 ở các phần: dạng bài theo Intro, cách trình bày câu hỏi, điểm Intro, câu sai, Ôn. Phần V3 không nhắc tới thì giữ như V2: thẻ FSRS mỗi mẫu tối đa 90 ngày, điều kiện mở bài, số mẫu mới mỗi ngày, cân bằng §3a, Thể động từ, Luyện nghe ngữ pháp.
> Mục ghi **CONFIRMED** do chủ dự án chốt ngày 2026-11-27. Mục ghi **PROPOSED** chờ duyệt.

## 1. Vì sao làm V3

### 1.1 Phiên học "chạy lộn xộn"

Đây là cảm nhận của chủ dự án khi học thật. Code hiện tại gây ra đúng hiện tượng này:

- Phiên Học và Ôn **xen kẽ mẫu**: cùng mẫu cách nhau ít nhất 2 câu (`interleave`, `lib/dal/grammar.ts`).
- Bộ chọn dạng **cố ý đổi dạng** so với câu ngay trước (`grammar-rules.md` §8, `chooseExercise`).
- Kết quả là gần như mỗi câu đổi cả mẫu, cả dạng, cả cách thao tác. Người học tốn sức làm quen thao tác thay vì tập trung vào ngữ pháp.

### 1.2 Độ khó không được đo

Phân tích tĩnh ngân hàng câu (204 mẫu, 7 190 câu, `data/grammar`, chạy 2026-11-27):

| Chỉ số | Mức 1 | Mức 2 | Mức 3 |
| --- | --- | --- | --- |
| Số mảnh trung bình | 6,0 | 6,3 | 8,6 |
| Câu kết hợp mẫu cũ | 26% | 41% | 99% |

- **Mức 1 và mức 2 gần như bằng nhau.** Mức chỉ được gán theo số thứ tự câu (câu 1–13 / 14–27 / 28–40).
- **Đáp án nhiễu không đổi theo mức.** Với chỗ hỏi trợ từ hoặc từ ngữ pháp, 100% (5 345/5 357) câu có cùng đáp án dùng **cùng một bộ 3 nhiễu** trong cả mẫu. Ví dụ ～んです lúc nào cũng có nhiễu ます / ません / でした.

## 2. Nguyên tắc — CONFIRMED

1. **Bài 5 câu.** Câu hỏi luôn đi theo **bài**: 5 câu **cùng một dạng**. Người học làm hết 5 câu, bấm **Hoàn thành**, app chấm cả 5 câu và hiện bảng sửa (đáp án, giải thích ngắn), rồi mới sang bài tiếp theo. Bài tiếp theo có thể khác dạng.
2. **Dễ → khó.** Trong một bài, câu xếp từ dễ đến khó. Giữa ba Intro, dạng tăng dần từ nhận ra → hiểu → dùng.
3. **Hai dạng bắt buộc theo JLPT:** G1 Chọn dạng ngữ pháp đúng (文法形式の判断) và G10 ★ (文の組み立て). Các dạng khác vẫn dùng, xếp theo Intro (§4).
4. **Làm nhiều để nhớ:** mỗi dạng, mỗi mẫu làm một bài 5 câu.
5. **Câu sai làm lại cuối buổi** cho tới khi đúng (§6).

## 3. Dạng bài — CONFIRMED

| Mã | Dạng | Ghi chú V3 |
| --- | --- | --- |
| **G1** | Chọn dạng ngữ pháp đúng | Chọn 1 trong 4 đáp án: trợ từ, dạng chia, mẫu ngữ pháp, phó từ, kính ngữ. Câu là **câu đơn hoặc hội thoại ngắn 2 lượt lời**. Có 3 nấc (§3.1). |
| G2 | Đúng / Sai | |
| G3 | Nghe → chọn câu đáp | |
| ~~G4~~ | ~~Ghép hai vế~~ | **Bỏ** (chủ dự án 2026-11-27). Câu bài đầu là câu đơn ngắn, không tách vế được; ghép hai vế còn dễ có nhiều cách đúng. |
| G5 | Đọc → chọn câu đáp | |
| G6 | Tìm chỗ sai | Phần sai có thể là trợ từ, dạng chia **hoặc từ ngữ pháp** (これ/この, ここ/こちら). — CONFIRMED |
| G7 | Phân biệt mẫu dễ nhầm | |
| ~~G8~~ | ~~Dịch – ghép câu~~ | **Bỏ** (trùng với G10). |
| G9 | Gõ hoặc chọn dạng | Chỗ hỏi là từ chia (động từ, tính từ, です) → **gõ dạng** (kana hoặc romaji). Chỗ hỏi không chia (trợ từ, これ/この…) → **chọn trong 6 dạng cùng họ** (ví dụ これ・それ・あれ・この・その・あの). Nhờ vậy mẫu nào cũng có G9. — CONFIRMED |
| **G10** | ★ JLPT | Câu khuyết 4 vị trí liền nhau, một vị trí có ★. Người học xếp 4 mảnh rồi chọn mảnh ở ô ★. Có 2 nấc (§3.1). |

### 3.1 Nấc khó trong G1 và G10 — PROPOSED

| Nấc | G1 | G10 |
| --- | --- | --- |
| **Dễ** | câu ngắn (≤ 6 mảnh), có nghĩa tiếng Việt, nhiễu **xa** (khác loại: trợ từ khác chức năng, dạng khác hẳn) | câu ≤ 7 mảnh, có nghĩa tiếng Việt |
| **Vừa** | không có nghĩa tiếng Việt, nhiễu **gần** (cùng loại, sai nghĩa: に/で, です/でした); có câu hội thoại 2 lượt | — |
| **Khó** | (dùng cho Ôn) câu kết hợp mẫu cũ, nhiễu **rất gần** (sai dạng nhỏ như 寒いでした, hoặc mẫu dễ nhầm) | **1/3 số câu dài nhất của mẫu** (hoặc kết hợp mẫu cũ), không có nghĩa. Tính theo từng mẫu vì câu bài 1–2 chỉ dài 4–6 mảnh. — CONFIRMED |

**Nghĩa tiếng Việt ở bài đầu — PROPOSED (phát hiện khi dựng bài 1–5, 2026-11-27):** ở trình độ này phần lớn đáp án nhiễu vẫn đúng ngữ pháp, chỉ sai nghĩa (私は学生じゃありません, は/も, これ/それ, thì của động từ). Nếu bỏ nghĩa thì câu có hai đáp án đúng. Vì vậy G1, G2, G6, G7, G9 **luôn kèm nghĩa tiếng Việt**; độ khó tăng bằng nhiễu gần hơn và câu dài hơn. G10 khó vẫn không có nghĩa (thứ tự câu không phụ thuộc nghĩa). Xem lại quy tắc này khi soạn tới bài có ngữ cảnh đủ để bỏ nghĩa.

## 4. Học một mẫu mới — CONFIRMED

### 4.1 Giới thiệu

1. **Thẻ giới thiệu:** mẫu, nghĩa, cách dùng, khung câu (ví dụ `N／な-adj + でした`).
2. **3–4 câu ví dụ đơn giản**, mỗi câu có **dịch tiếng Việt** và nút nghe, xếp từ ngắn đến dài hơn.

### 4.2 Lịch ba ngày và ba Intro — CONFIRMED

| Ngày | Nội dung |
| --- | --- |
| **1** | Thẻ giới thiệu + câu ví dụ → **Intro 1 + Intro 2** liền nhau (6 bài, 30 câu) |
| **2** | **Intro 3** (4 bài, 20 câu) |
| **3** | Ôn lần đầu (§5) |

Grammar dùng lịch riêng này, khác luật "mỗi Intro một ngày" của lõi V12 ở các khu khác.

Mỗi dạng trong Intro là **một bài 5 câu** cho mẫu đó.

| Intro | Mục tiêu | Bài (mỗi bài 5 câu) | Câu/mẫu |
| --- | --- | --- | --- |
| **1 · Nhận ra** | Nhận ra mẫu trong câu | G1 dễ · G2 Đúng/Sai · G5 Chọn câu đáp | 15 |
| **2 · Hiểu** | Hiểu nghĩa và cách nối | G1 vừa · G7 Phân biệt mẫu dễ nhầm · G10 dễ | 15 |
| **3 · Dùng** | Dùng được mẫu | G10 khó · G6 Tìm chỗ sai · G9 Gõ hoặc chọn dạng · G3 Nghe | 20 |

- Thứ tự bài trong Intro đi theo bảng (từ trái sang phải).
- Ngày 1 làm Intro 2 ngay sau Intro 1, kể cả khi còn dạng của Intro 1 chưa qua. — PROPOSED
- **Dạng mẫu không làm được** (ví dụ chưa học mẫu dễ nhầm nào thì không có G7): thay bằng một bài **G1** ở nấc của Intro đó. — CONFIRMED
- Bài của Intro chỉ lấy câu của mẫu đó (khối một mẫu), để người học nắm chắc khung câu trước khi gặp lẫn với mẫu khác.
- Trong một ngày, một câu gốc xuất hiện **tối đa 2 lần**, ở 2 dạng khác nhau và không trong cùng một bài. — CONFIRMED (2026-11-27)

### 4.3 Điểm và điều kiện qua — CONFIRMED

- **Chỉ cộng điểm cho câu đúng, câu sai không trừ.**
- Một dạng **qua** khi có **≥ 3 câu đúng** (cộng dồn qua các ngày).
- Dạng chưa qua: hôm sau làm thêm **một bài 5 câu mới** của riêng dạng đó (câu khác), điểm cộng dồn. Dạng đã qua thì không làm lại. Dạng của Intro 1–2 chưa qua được làm bù ở ngày 2, trước các bài Intro 3. — PROPOSED
- Câu làm lại cuối buổi (§6) **không** tính điểm.
- Khi **mọi dạng của cả ba Intro** đã qua, mẫu có thẻ ôn FSRS, đến hạn ngày học kế tiếp. Nếu học đều, đó là ngày 3.

## 5. Ôn — CONFIRMED

### 5.1 Câu của mỗi mẫu

Phần ôn **càng nhiều dạng càng tốt** (chủ dự án chốt 2026-11-27). Mỗi mẫu đến hạn được hỏi **4 câu**, mỗi câu thuộc một dạng:

1. một câu **G1** (nấc vừa hoặc khó),
2. một câu **G10** (nấc khó nếu câu gốc cho phép),
3. hai câu thuộc **hai dạng phụ** khác nhau.

**Dạng phụ** lấy lần lượt theo vòng: G6 Tìm chỗ sai → G3 Nghe → G2 Đúng/Sai → G7 Phân biệt → G5 Chọn câu đáp → G9 Gõ hoặc chọn dạng → lặp lại. Vòng chạy tiếp từ chỗ dừng của buổi trước. — PROPOSED (thứ tự vòng)

Để buổi ôn có nhiều dạng mà vẫn gom đủ bài 5 câu: chia các mẫu đến hạn thành **nhóm 5 mẫu**; **mỗi nhóm lấy 2 dạng phụ kế tiếp** trong vòng. Ví dụ 15 mẫu đến hạn → 3 nhóm → 6 dạng phụ khác nhau (cả vòng), cộng G1 và G10 là 8 dạng trong một buổi. Mẫu không làm được dạng phụ của nhóm thì lấy dạng kế tiếp trong vòng mà mẫu làm được. — PROPOSED

### 5.2 Gom bài

- Câu được **gom theo dạng thành bài 5 câu**, **trộn câu của nhiều mẫu**, xếp thứ tự ngẫu nhiên.
- Thứ tự bài trong buổi: các bài G1 → các bài G10 → các bài dạng phụ (theo thứ tự trong vòng).
- Dạng nào thừa lẻ (1–4 câu) thì bài cuối của dạng đó ngắn hơn. Nếu một dạng chỉ có 1–2 câu thì gộp vào **một bài cuối trộn dạng**. — PROPOSED

### 5.3 Chấm lịch

Chấm FSRS cho mỗi mẫu dựa trên **lần trả lời đầu tiên** của 4 câu của mẫu đó:

| Kết quả | Rating |
| --- | --- |
| Đúng cả 4 | Good |
| Sai 1 | Hard |
| Sai từ 2 | Again |

Rating được tính khi bài chứa câu cuối cùng của mẫu đó được chấm. Câu làm lại cuối buổi không ảnh hưởng tới lịch.

## 6. Câu sai — CONFIRMED

- Mọi câu sai trong buổi (Intro và Ôn) được **gom lại cuối buổi**.
- Mỗi câu sai được hỏi lại bằng **một câu gốc khác cùng mẫu, cùng dạng**. Mẫu hết câu gốc chưa dùng trong ngày thì mới dùng lại câu cũ, xáo trộn đáp án. — PROPOSED (trường hợp hết câu)
- Câu làm lại gom thành bài tối đa 5 câu, chấm khi bấm Hoàn thành. Một bài làm lại có thể gồm nhiều dạng: câu cùng dạng đứng cạnh nhau, mỗi câu ghi dạng của nó. Câu nào vẫn sai thì vào vòng làm lại tiếp theo, cho tới khi đúng hết. — PROPOSED (bài trộn dạng)
- Câu làm lại không tính điểm và không đổi lịch.

## 7. Luyện tập — PROPOSED

Giữ V2 §7 (chọn bài/mẫu, dạng, số câu; chế độ Luyện và Kiểm tra), nhưng câu hỏi cũng trình bày theo **bài 5 câu cùng dạng**. Số câu là bội của 5 (10 / 20 / 30 / 50). Người học chọn thêm độ khó Dễ / Vừa / Khó theo §3.1.

## 8. Tải ước tính — PROPOSED

- Intro: 50 câu mỗi mẫu trong 2 ngày. Với 1 mẫu mới mỗi ngày: 30 câu của mẫu mới (Intro 1 + 2) + 20 câu của mẫu hôm qua (Intro 3) → khoảng **50 câu Intro mỗi ngày**, cộng câu làm lại.
- Ôn: 4 câu × số mẫu đến hạn. Ví dụ 15 mẫu đến hạn → 60 câu (12 bài).
- Trần câu mỗi ngày của Grammar (Settings) giữ như V2 §6. Phần vượt trần chuyển sang hôm sau theo **nguyên bài**, không cắt giữa bài.

## 9. Dữ liệu cần bổ sung — PROPOSED

Dựa trên phân tích ngân hàng câu hiện có (`data/grammar` và nhánh `content/grammar-v2-data`):

| Dữ liệu | Hiện có | Cần cho |
| --- | --- | --- |
| Câu có câu hỏi đi trước (`prompt`) | ~10% số câu | G5, G3, G1 hội thoại 2 lượt: mỗi mẫu cần ≥ 10 câu có `prompt` |
| Cặp mẫu dễ nhầm và câu G7 | 41 cặp (nhánh V2), bài 1–5 chỉ 2 mẫu | Claude tự soạn và tự duyệt (chủ dự án 2026-11-27) |
| Họ dạng cho G9 chọn dạng | chưa có | 6 dạng cùng họ cho mỗi chỗ hỏi không chia, loại các dạng cũng đúng |
| Câu đủ dài cho ★ (≥ 4 mảnh liền nhau, một câu, không có 、) | 58% số câu; 18/204 mẫu chưa có câu nào | G10: mỗi mẫu cần ≥ 15 câu, trong đó ≥ 5 câu nấc khó |
| Nhiễu theo bậc xa / gần / rất gần | 1 bộ 3 nhiễu cố định cho mỗi chỗ hỏi | G1 ba nấc. Nhiễu xa và gần sinh tự động từ bảng trợ từ hay nhầm (cần duyệt bảng một lần) và các dạng chia của cùng từ. Nhiễu rất gần lấy từ dạng sai `*` trong `dsl.py` và 41 cặp mẫu dễ nhầm. |
| Mức câu tính lại | theo số thứ tự câu | Tính từ số mảnh và số mẫu cũ kết hợp; báo cáo câu lệch mức để rà |

Mỗi câu gốc dùng tối đa 2 lần mỗi ngày (§4.2), nên ngày 1 (30 câu) cần ít nhất 15 câu gốc khác nhau, cộng câu dự phòng cho vòng làm lại.

Nội dung V3 do Claude soạn và **tự duyệt** (chủ dự án 2026-11-27); bài 1–5 làm trước (`docs/grammar-review-v3-01-05.md`).

## 10. Phân tích log

Bộ truy vấn chỉ đọc ở `scripts/grammar-analysis/`. Chạy bằng `bash scripts/grammar-analysis/run.sh`; kết quả ghi vào `out/`, không commit.

| File | Trả lời câu hỏi |
| --- | --- |
| `1-overview.sql` | Có bao nhiêu log, của bao nhiêu người, trong khoảng thời gian nào |
| `2-by-type.sql` | Tỷ lệ đúng, gợi ý, thời gian trả lời trung vị theo dạng |
| `3-type-by-level.sql` | Mức 2–3 có thật sự khó hơn mức 1 không, theo từng dạng |
| `4-switching.sql` | Đổi dạng / đổi mẫu so với câu trước có làm sai nhiều hơn, chậm hơn không |
| `5-first-try.sql` | Tỷ lệ đúng lần đầu gặp mỗi dạng |
| `6-sentence-outliers.sql` | Câu mức 1 sai nhiều và câu mức 3 luôn đúng |

Kết quả dùng để kiểm tra thứ tự dạng trong §4.2 và ngưỡng nấc khó trong §3.1. Log V1 dùng mã dạng cũ; bảng đổi sang G1–G10 nằm ở V2 §2.

## 11. Còn chờ quyết định — PENDING

1. **"Learn all":** V2 trộn câu Grammar với thẻ Kana/Kanji/Từ vựng. V3 đề xuất Grammar là **một đoạn liền** gồm các bài 5 câu, đặt sau phần từ vựng.
2. Các mục PROPOSED ở trên (nấc khó §3.1, thay dạng thiếu §4.2, vòng dạng phụ §5.1, bài lẻ §5.2, tải §8, dữ liệu §9).

## 12. Kế hoạch gói (sau khi duyệt)

| Gói | Nội dung | Phụ thuộc |
| --- | --- | --- |
| V3-0 | Bản chạy thử HTML một mẫu (giới thiệu → ví dụ → Intro 1–3 → một buổi ôn) để chủ dự án bấm thử nhịp học | — |
| V3-1 | Dữ liệu: tính lại mức câu, nhiễu theo bậc, bổ sung `prompt` / `split` / câu ★, 3–4 câu ví dụ có dịch (nhánh `content/*`, gốc `content/grammar-v2-data`) | V3-0 |
| V3-2 | Lõi thuần: bài 5 câu, Intro theo dạng, điểm chỉ cộng, ≥ 3/5, lịch 3 ngày (Intro 1+2 / Intro 3 / Ôn), Ôn 4 câu/mẫu + dạng phụ theo nhóm 5 mẫu, gom bài, rating gộp, vòng câu sai (test đơn vị; gốc `feature/grammar-v2-core`) | V3-0 |
| V3-3 | UI: khung bài 5 câu + nút Hoàn thành + bảng sửa, G9 gõ / chọn dạng, màn ví dụ có dịch, vòng làm lại cuối buổi | V3-2 |
| V3-4 | Gắn vào Learn all, chuyển tiến độ hiện có, phân tích log | V3-3 |

V2 chưa merge, nên V2 và V3 đi chung một đợt phát hành.
