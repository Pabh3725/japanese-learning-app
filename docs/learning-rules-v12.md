# LR-12 — Luật học V12: ba khu Kana / Kanji / Từ vựng Kanji `RULES_V12`

> Trạng thái: **PROPOSED**, chờ chủ dự án duyệt. Chủ dự án chốt các ý qua hai vòng hỏi đáp ngày 2026-11-18; tài liệu này viết lại thành luật đầy đủ.
> Thay cho phần Từ vựng và Kanji của V9–V11 (`docs/learning-rules.md` §12, các mục Stage, AIS, vòng boss). **Không đổi:** Grammar, Thể động từ, Luyện nghe, JLPT, Practice, Library.
> Lịch Review giữ **FSRS**.

## 1. Ba khu học

| Khu | Gồm | Học xong khi |
|---|---|---|
| **Từ vựng Kana** | Mọi từ trong lộ trình, học dạng Kana | Xong Stage 3 → Card FSRS |
| **Kanji** | **Bộ thủ** (học trước), rồi **chữ Kanji** | Bộ thủ: xong Stage 2. Chữ: xong Stage 3 → Card FSRS |
| **Từ vựng Kanji** | Từ có Kanji theo chính sách Kanji của từ (§5) | Xong Stage 3 → Card FSRS |

Mỗi khu có trang học riêng. Phần học (Stage) và phần ôn (Review) của một khu **nằm chung** trong một bộ thẻ.

## 2. Bộ thẻ trong ngày

- **Bộ thẻ của một khu trong ngày** gồm thẻ mục mới (Stage 1), câu Stage 2–3 đến lượt và Card Review đến hạn. Tất cả **trộn ngẫu nhiên**, rồi chia thành các **set**.
  - Số thẻ mỗi set chỉnh trong Settings, mặc định 20 (10–100).
  - Thẻ hỏi lại sau khi sai được chèn vào trong set; nếu set đã hết thì chèn sang set sau.
- **"Học tất cả":** trộn hoàn toàn thẻ trong ngày của cả 3 khu.
- **Trần mỗi khu mỗi ngày** chỉnh trong Settings. "Học tất cả" dùng tổng các trần. Phần vượt trần chuyển sang hôm sau.
- **Cảnh báo sắp vượt trần:** app tính trước số thẻ đến hạn của 7 ngày tới. Nếu có ngày vượt trần, trang Learn và Settings hiện cảnh báo: ngày nào, vượt bao nhiêu, kèm hai nút "Giảm số mục mới mỗi ngày" và "Tăng trần".
- Settings còn lại các mục:
  - số mục mới mỗi ngày của từng khu (hoặc chế độ tự cân bằng, §8);
  - số thẻ mỗi set;
  - trần của từng khu;
  - các cài đặt của Grammar và Luyện nghe, giữ như cũ.

## 3. Luật điểm chung

### 3.1 Điểm theo loại thẻ

- Mỗi Stage có một số **loại thẻ** (ví dụ: Kana → nghĩa, nghe → chọn Kana…). **Mỗi loại thẻ có điểm riêng.**
- Đúng **+1**, sai **−1**. Điểm không xuống dưới **0**. Không có gợi ý: mỗi câu chỉ có đúng hoặc sai.
- **Stage 2 và 3:** mỗi loại thẻ cần **3 điểm**. Loại thẻ đã đủ điểm thì không xuất hiện nữa. Stage xong khi **mọi loại thẻ** đều đủ điểm. Stage tiếp theo (hoặc Card Review) bắt đầu từ **ngày học kế tiếp**.
- **Số lần gặp mỗi ngày của một loại thẻ:**
  - Trả lời đúng: gặp **2 lần**. Vì vậy điểm thứ 3 luôn rơi vào hôm sau.
  - Trả lời sai: thẻ được **hỏi lại sau 5 thẻ**. Lần hỏi lại cũng tính điểm (đúng +1, sai −1). Tính cả lần hỏi lại, một loại thẻ gặp **nhiều nhất 3 lần mỗi ngày**.

### 3.2 Stage 1 (ngày đầu tiên)

- Thẻ giới thiệu, rồi lần lượt mỗi **loại thẻ** của Stage 1:
  - loại thứ nhất hỏi **ngay sau** thẻ giới thiệu;
  - loại thứ hai hỏi **sau 5 thẻ**;
  - các loại còn lại, mỗi loại cách nhau **10 thẻ**.
- Mỗi loại thẻ chỉ cần **đúng 1 lần**. Sai thì hỏi lại sau 5 thẻ, cho tới khi đúng trong ngày.
- Đúng hết các loại → Stage 2 bắt đầu từ **ngày học kế tiếp**. Hôm sau không học thì chờ tới ngày học kế tiếp, không bị phạt.
- Nếu hết ngày mà chưa đúng hết: ngày học sau tiếp tục Stage 1 với các loại còn thiếu, không hiện lại thẻ giới thiệu *(PROPOSED)*.

### 3.3 Review (FSRS, giữ như hiện nay)

- Sai là **Again**, đúng là **Good**. Khoảng tối đa 90 ngày. Hạn ôn rơi vào 00:00 giờ Việt Nam. Thẻ sai được hỏi lại trong phiên sau 3–5 thẻ, tối đa 3 lần.
- **Card gom chung:** mỗi Card có thể có nhiều phần trên cùng một thẻ. **Sai một phần là sai cả Card** (Again).
- Card đến hạn lần đầu vào ngày học sau ngày xong Stage cuối của mục đó.

## 4. Khu Từ vựng Kana

| | Loại thẻ |
|---|---|
| Thẻ giới thiệu | Kana, nghĩa, âm thanh, Hán Việt (nếu có, hiện nhỏ) |
| Stage 1 | Kana → nghĩa (trắc nghiệm) · nghĩa → Kana (trắc nghiệm) |
| Stage 2 | Kana → nghĩa · nghĩa → Kana · nghe → chọn Kana · sắp xếp chữ cái thành từ — đều trắc nghiệm hoặc ghép |
| Stage 3 | nghĩa → **gõ** Kana · nghe → **gõ** Kana · Kana → nghĩa (trắc nghiệm) |
| **Review: 2 Card** | ① nghĩa → **gõ** Kana; đúng hay sai đều phát âm thanh. ② Kana (kèm âm thanh) → **chọn** nghĩa |

## 5. Khu Kanji

### 5.1 Bộ thủ (học trước chữ)

- **Phạm vi:** các bộ có trong **từ 2 chữ N5–N4 trở lên** (100 bộ). *(PROPOSED; đã được duyệt là "khoảng 80–100")*
- **Thứ tự:** bộ có mặt trong nhiều chữ hơn thì học trước (cột `n5n4_kanji`).
- **Thẻ giới thiệu:** hình bộ, tên Hán Việt (ví dụ 氵 "Thủy"), nghĩa, vài chữ ví dụ.

| | Loại thẻ |
|---|---|
| Stage 1 | bộ → tên Hán Việt · bộ → nghĩa (trắc nghiệm) |
| Stage 2 | bộ → tên Hán Việt · bộ → nghĩa · tên Hán Việt → bộ · nghĩa → bộ (trắc nghiệm) |
| Stage 3 | **Không có.** Xong Stage 2 thì chuyển sang Review |
| **Review: 1 Card** | nhìn bộ → **chọn** tên Hán Việt + **chọn** nghĩa (2 câu trắc nghiệm trên cùng một thẻ) |

- **Dữ liệu:** `data/n5/radical_meanings.csv` (sinh bằng `python3 scripts/kanji-data/v12_data.py`, 2026-11-18). Có đủ 214 bộ, gồm: dạng biến thể (亻, 氵, 扌…), **nghĩa tiếng Việt** (Claude soạn, chủ dự án duyệt 2026-11-18), số chữ N5–N4 có bộ đó và tối đa 3 chữ ví dụ.
  - 140 bộ có mặt trong chữ N5–N4; **100 bộ có trong từ 2 chữ trở lên**. Đề xuất phạm vi học là 100 bộ này.
  - Số chữ và chữ ví dụ tính từ các thành phần của KanjiVG trong `kanji_visual.json`. Một vài bộ được đếm theo hình dạng: ví dụ chấm 灬 của 馬 tính là bộ Hỏa, 卜 nằm trong 上, 下. Chữ ví dụ ưu tiên chữ mà bộ là bộ phân loại hoặc thành phần thấy rõ.

### 5.2 Chữ Kanji

- **Thứ tự:** theo cấp N5 → N4 → N3 →…; trong mỗi cấp, chữ phổ biến hơn học trước, rồi chữ ít nét hơn. Chữ là thành phần của chữ khác thì học trước chữ đó.
  - Chữ chỉ mở khi **mọi bộ thủ** của nó đã qua Stage 1.
  - **Bỏ** luật cũ ưu tiên mở chữ của các từ sắp học (V12 hôm 2026-11-15).
  - **Dữ liệu:** `data/n5/kanji_frequency.csv` có hạng tần suất trên báo chí (1–2500, số nhỏ là phổ biến hơn). 842/844 chữ có hạng, gồm **mọi** chữ N5–N4; 2 chữ không có hạng thì xếp cuối cấp. Nguồn: kanji-data (David Gouveia, MIT), trường `freq` lấy từ KANJIDIC2 (EDRDG, CC BY-SA 4.0); cần ghi nguồn trong app.
- **Thẻ giới thiệu:** chữ, nét viết, Hán Việt, nghĩa và giải thích nghĩa, **âm On/Kun**. Như vậy bỏ luật ngày 2026-11-15 "ẩn On/Kun tới khi học Từ Kanji".
- **Không có câu hỏi** về âm On/Kun.

| | Loại thẻ |
|---|---|
| Stage 1 | Kanji → Hán Việt · Kanji → nghĩa · Hán Việt → Kanji · nghĩa → Kanji (trắc nghiệm) |
| Stage 2 | Như Stage 1 (trắc nghiệm) |
| Stage 3 | Kanji → **gõ** Hán Việt · Kanji → nghĩa (trắc nghiệm) · Hán Việt → Kanji (trắc nghiệm) · nghĩa → Kanji (trắc nghiệm) · **phân biệt Kanji giống nhau** (chỉ có khi chữ đó có cặp chữ giống nhau đã duyệt) |
| **Review: 1 Card** | nhìn chữ → **gõ** Hán Việt + **chọn** nghĩa |

## 6. Khu Từ vựng Kanji

- **Mở thẻ (cách thường):** từ vựng Kana của từ đã vào **Stage 2**, **và** mọi chữ Kanji của từ đã vào **Stage 2**. Giữ danh sách chính sách Kanji của từ: từ "chỉ Kana" không có thẻ Từ vựng Kanji.
- **Hàng chờ:** từ N5 hoặc N4 có chữ chưa học (ví dụ 寝ます) vào hàng chờ. Từ trong hàng chờ được mở khi có **một** trong ba điều sau:
  - đã học hết từ vựng Kana của cấp đó;
  - đã học hết Kanji của cấp đó;
  - hôm đó không còn từ vựng Kanji nào khác mở được.

  Khi mở như vậy, người học học thẳng dạng Kanji của từ, không cần học chữ trước.
- **Thẻ giới thiệu:** Kana, dạng Kanji, Hán Việt, nghĩa.

| | Loại thẻ |
|---|---|
| Stage 1 | từ Kanji → Hán Việt · từ Kanji → nghĩa · Hán Việt → từ Kanji · nghĩa → từ Kanji (trắc nghiệm) |
| Stage 2 | Như Stage 1 (trắc nghiệm) |
| Stage 3 | từ Kanji → **gõ** Hán Việt · từ Kanji → nghĩa (trắc nghiệm) |
| **Review: 1 Card** | nhìn từ → **gõ** Kana + **gõ** Hán Việt + **chọn** nghĩa |

## 7. Chuyển dữ liệu người học (từ V11)

| Hiện tại | Sang V12 |
|---|---|
| Từ đã có Card Kana | Xem như xong Stage 3 Kana. Giữ lịch FSRS cho Card ①; Card ② mới đến hạn ngày mai *(PROPOSED)* |
| Từ đang ở Stage 2 cũ | Stage 2 Kana, 0 điểm |
| Từ đang ở Stage 3 cũ | Stage 3 Kana, 0 điểm |
| Từ ở Stage 5 / 6 cũ | Stage 2 / 3 của Từ vựng Kanji, 0 điểm |
| Từ đã có Card Kanji | Card Từ vựng Kanji, giữ lịch FSRS |
| Chữ đang Học (12 điểm cũ) | Stage 2 Kanji, 0 điểm |
| Chữ đã có 2 Card | Gộp thành 1 Card, lấy lịch của Card đến hạn sớm hơn |
| Bộ thủ | Bắt đầu từ đầu. Người học cũ có thể đánh dấu "đã biết" cả nhóm *(PROPOSED)* |

**Bỏ:** cấu trúc 6 Stage, bộ xếp thứ tự AIS, câu kiểm tra nhanh, vòng ghép ô Stage 3, vòng boss ghép 5 từ, luật ưu tiên Kanji theo từ sắp học.
**Giữ:** từ có sao (học thêm), nút "đã biết", Practice (Speed Matching), trang tra cứu Library.

## 8. Tự cân bằng số mục mới mỗi ngày (chức năng mới, chờ chốt)

**Mục tiêu:** học xong Từ vựng Kana, Kanji (gồm bộ thủ) và Từ vựng Kanji **cùng một lúc**.

**Cách tính đề xuất:**
- Người học chọn **tổng số mục mới mỗi ngày** T, *hoặc* **ngày muốn học xong** D.
- Gọi số mục còn lại của từng khu là `Rk`, `Rj`, `Rv`, tổng là `R = Rk + Rj + Rv`.
- Số ngày còn lại `N = ⌈R / T⌉`, hoặc `N` = số ngày tới D.
- Mỗi khu mở `R_khu / N` mục mỗi ngày. Phần lẻ được cộng dồn qua các ngày để tổng số mục đúng.
- App **tính lại mỗi ngày** theo số còn lại.

**Hạn chế:** Từ vựng Kanji phụ thuộc hai khu kia, nên những ngày đầu thường mở được ít hơn chỉ tiêu. Phần thiếu dồn sang các ngày sau, và hàng chờ ở §6 bù vào cuối lộ trình.

**Hiển thị:** công tắc "Balance new items" trong Settings. Khi bật, app hiện số mục mới mỗi ngày của từng khu và ngày dự kiến xong. Khi tắt, người học tự chỉnh từng khu.

**Câu hỏi cần chốt:**
1. Cân bằng theo **số mục** (đơn giản) hay theo **khối lượng thẻ**? Một chữ Kanji tốn nhiều câu hơn một từ Kana; nếu chia theo số mục thì có hôm số thẻ của khu Kanji vọt lên.
2. Phạm vi: **từng cấp** (xong N5 cả ba khu rồi mới sang N4) hay **cả lộ trình N5 + N4** một lần?
3. Bộ thủ tính chung vào khu Kanji hay học dồn trước (ví dụ khoảng 2 tuần đầu), sau đó mới bắt đầu cân bằng?
