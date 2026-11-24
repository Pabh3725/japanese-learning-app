# LR-12 — Luật học V12: ba khu Kana / Kanji / Từ vựng Kanji `RULES_V12`

> Trạng thái: **CONFIRMED** (chủ dự án duyệt toàn bộ 2026-11-18, gồm các con số ước tính ở §8). Các ý chủ dự án chốt qua hai vòng hỏi đáp cùng ngày. Kế hoạch triển khai: `docs/v12-implementation-plan.md`.
> Thay cho phần Từ vựng và Kanji của V9–V11 (`docs/learning-rules.md` §12, các mục Stage, AIS, vòng boss). **Không đổi:** Grammar, Thể động từ, Luyện nghe, JLPT, Practice, Library.
> Lịch Review giữ **FSRS**.

## 1. Ba khu học

| Khu | Gồm | Học xong khi |
|---|---|---|
| **Từ vựng Kana** | Mọi từ trong lộ trình, học dạng Kana | Xong Stage 3 → Card FSRS |
| **Kanji** | **Chữ Kanji** (bộ thủ học riêng ở phần More, §5.1) | Xong Stage 3 → Card FSRS |
| **Từ vựng Kanji** | Từ có Kanji theo chính sách Kanji của từ (§5) | Xong Stage 3 → Card FSRS |

Mỗi khu có trang học riêng. Phần học (Stage) và phần ôn (Review) của một khu **nằm chung** trong một bộ thẻ.

## 2. Bộ thẻ trong ngày

- **Bộ thẻ của một khu trong ngày** gồm thẻ mục mới (Stage 1), câu Stage 2–3 đến lượt và Card Review đến hạn. Tất cả **trộn ngẫu nhiên**, rồi chia thành các **set**.
  - Số thẻ mỗi set chỉnh trong Settings, mặc định 20 (10–100).
  - Thẻ hỏi lại sau khi sai được chèn vào trong set; nếu set đã hết thì chèn sang set sau.
- **"Học tất cả":** trộn hoàn toàn thẻ trong ngày của cả 3 khu.
- **Trần mỗi khu mỗi ngày** chỉnh trong Settings. "Học tất cả" dùng tổng các trần. Phần vượt trần chuyển sang hôm sau.
- **Dừng mục mới khi tồn quá trần** (chủ dự án chốt 2026-11-19): khu nào có câu Stage đến lượt cộng Card đến hạn hôm nay (không tính mục mới) từ trần trở lên thì hôm đó không mở mục mới cho khu đó; trang Learn ghi "New items paused: catching up". Cân bằng tính lại mỗi ngày trên số còn lại thật nên tự bù vào các ngày sau. — CONFIRMED
- **Tự dừng một khu** (chủ dự án chốt 2026-11-19): Settings → "Vocab · Pause an area". Khu dừng không mở mục mới, câu Intro và Card đang có vẫn học. Khi bật cân bằng, thời gian của khu dừng chia cho các khu còn chạy (mục tiêu ngày: khu còn chạy giữ chỉ tiêu theo ngày đó); bật lại thì cân bằng tính lại để các khu xong cùng ngày. — CONFIRMED
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
- **Stage 2 và 3:** mỗi loại thẻ cần **2 điểm** (chủ dự án chốt 2026-11-20, trước là 3); số loại thẻ giữ nguyên. Trả lời đúng hết thì xong mỗi Stage ngay trong ngày đầu của Stage đó. Loại thẻ đã đủ điểm thì không xuất hiện nữa. Stage xong khi **mọi loại thẻ** đều đủ điểm. Stage tiếp theo (hoặc Card Review) bắt đầu từ **ngày học kế tiếp**. Loại thẻ đã đủ điểm thì không xuất hiện nữa. Stage xong khi **mọi loại thẻ** đều đủ điểm. Stage tiếp theo (hoặc Card Review) bắt đầu từ **ngày học kế tiếp**.
- **Số lần gặp mỗi ngày của một loại thẻ:**
  - Trả lời đúng: gặp **2 lần**, vừa đủ 2 điểm.
  - Trả lời sai: thẻ được **hỏi lại sau 5 thẻ**. Lần hỏi lại cũng tính điểm (đúng +1, sai −1). Tính cả lần hỏi lại, một loại thẻ gặp **nhiều nhất 3 lần mỗi ngày**.

### 3.2 Stage 1 (ngày đầu tiên)

- Thẻ giới thiệu, rồi lần lượt mỗi **loại thẻ** của Stage 1:
  - loại thứ nhất hỏi **ngay sau** thẻ giới thiệu;
  - loại thứ hai hỏi **sau 5 thẻ**;
  - các loại còn lại, mỗi loại cách nhau **10 thẻ**.
- Mỗi loại thẻ chỉ cần **đúng 1 lần**. Sai thì hỏi lại sau 5 thẻ, cho tới khi đúng trong ngày.
- Đúng hết các loại → Stage 2 bắt đầu từ **ngày học kế tiếp**. Hôm sau không học thì chờ tới ngày học kế tiếp, không bị phạt.
- Nếu hết ngày mà chưa đúng hết: ngày học sau tiếp tục Stage 1 với các loại còn thiếu, không hiện lại thẻ giới thiệu .

### 3.3 Review (FSRS, giữ như hiện nay)

- Sai là **Again**, đúng là **Good**. Khoảng tối đa 90 ngày. Hạn ôn rơi vào 00:00 giờ Việt Nam. Thẻ sai được hỏi lại trong phiên sau 3–5 thẻ, tối đa 3 lần.
- **Card gom chung:** mỗi Card có thể có nhiều phần trên cùng một thẻ. **Sai một phần là sai cả Card** (Again).
- Card đến hạn lần đầu vào ngày học sau ngày xong Stage cuối của mục đó.

## 4. Khu Từ vựng Kana

| | Loại thẻ |
|---|---|
| Thẻ giới thiệu | Kana, nghĩa, âm thanh, Hán Việt (nếu có, hiện nhỏ) |
| Stage 1 | Kana → nghĩa (trắc nghiệm) · nghĩa → Kana (trắc nghiệm) |
| Stage 2 | nghe → chọn Kana · nghĩa → chọn Kana (trắc nghiệm) (rút gọn, chủ dự án chốt 2026-11-22) |
| Stage 3 | nghĩa → **gõ** Kana · nghe → **gõ** Kana (rút gọn, chủ dự án chốt 2026-11-22) |
| **Review: 1 Card** | nghĩa → **gõ** Kana; đúng hay sai đều phát âm thanh và hiện chữ, cách đọc, Hán Việt, nghĩa (bỏ Card "Kana → chọn nghĩa", chủ dự án chốt 2026-11-22) |

## 5. Khu Kanji

### 5.1 Bộ thủ (học riêng ở phần More)

- **Chủ dự án chốt 2026-11-24:** bộ thủ là phần thêm, học tùy chọn ở **Vocab → More → Radicals**; **không thuộc khu Kanji**, không tính vào cân bằng, trần hay "Học tất cả"; **chữ Kanji không phải chờ bộ thủ**. Trang Radicals có danh sách bộ kèm trạng thái, nút học (bộ thẻ riêng, phạm vi `radical`), số bộ mới mỗi ngày (0–30, mặc định 5) và nút "đã biết cả nhóm".

- **Phạm vi:** các bộ có trong **từ 2 chữ N5–N4 trở lên** (100 bộ).
- **Thứ tự:** bộ có mặt trong nhiều chữ hơn thì học trước (cột `n5n4_kanji`).
- **Thẻ giới thiệu:** hình bộ, tên Hán Việt (ví dụ 氵 "Thủy"), nghĩa, vài chữ ví dụ.

| | Loại thẻ |
|---|---|
| Stage 1 | bộ → tên Hán Việt · bộ → nghĩa (trắc nghiệm) |
| Stage 2 | tên Hán Việt → bộ · nghĩa → bộ (trắc nghiệm) (rút gọn, chủ dự án chốt 2026-11-22) |
| Stage 3 | **Không có.** Xong Stage 2 thì chuyển sang Review |
| **Review** | **Không có Card ôn** (chủ dự án chốt 2026-11-22): xong Stage 2 là học xong; bộ thủ được gặp lại trong thẻ giới thiệu và thẻ chữ Kanji |

- **Dữ liệu:** `data/n5/radical_meanings.csv` (sinh bằng `python3 scripts/kanji-data/v12_data.py`, 2026-11-18). Có đủ 214 bộ, gồm: dạng biến thể (亻, 氵, 扌…), **nghĩa tiếng Việt** (Claude soạn, chủ dự án duyệt 2026-11-18), số chữ N5–N4 có bộ đó và tối đa 3 chữ ví dụ.
  - 140 bộ có mặt trong chữ N5–N4; **100 bộ có trong từ 2 chữ trở lên**. Đề xuất phạm vi học là 100 bộ này.
  - Số chữ và chữ ví dụ tính từ các thành phần của KanjiVG trong `kanji_visual.json`. Một vài bộ được đếm theo hình dạng: ví dụ chấm 灬 của 馬 tính là bộ Hỏa, 卜 nằm trong 上, 下. Chữ ví dụ ưu tiên chữ mà bộ là bộ phân loại hoặc thành phần thấy rõ.

### 5.2 Chữ Kanji

- **Thứ tự: dễ → khó** (chủ dự án chốt 2026-11-24, thay cho "phổ biến trước"): theo cấp N5 → N4 → N3 →…; trong mỗi cấp, chữ **ít nét hơn** học trước, cùng số nét thì chữ phổ biến hơn trước. Chữ là thành phần của chữ khác thì học trước chữ đó. Không xếp theo bài Minna. Ví dụ 40 chữ N5 đầu: 一人十二九入力八七大三上子下小山女川千口土万夕日中月分五内方今手円六午元水少木天.
  - ~~Chữ chỉ mở khi mọi bộ thủ của nó đã qua Stage 1.~~ Bỏ (2026-11-24): bộ thủ học riêng ở More.
  - **Bỏ** luật cũ ưu tiên mở chữ của các từ sắp học (V12 hôm 2026-11-15).
  - **Dữ liệu:** `data/n5/kanji_frequency.csv` có hạng tần suất trên báo chí (1–2500, số nhỏ là phổ biến hơn). 842/844 chữ có hạng, gồm **mọi** chữ N5–N4; 2 chữ không có hạng thì xếp cuối cấp. Nguồn: kanji-data (David Gouveia, MIT), trường `freq` lấy từ KANJIDIC2 (EDRDG, CC BY-SA 4.0); cần ghi nguồn trong app.
- **Thẻ giới thiệu:** chữ, nét viết, Hán Việt, nghĩa và giải thích nghĩa, **âm On/Kun**. Như vậy bỏ luật ngày 2026-11-15 "ẩn On/Kun tới khi học Từ Kanji".
- **Không có câu hỏi** về âm On/Kun.

| | Loại thẻ |
|---|---|
| Stage 1 | Kanji → Hán Việt · Kanji → nghĩa (trắc nghiệm) (rút gọn, chủ dự án chốt 2026-11-22) |
| Stage 2 | Hán Việt → Kanji · nghĩa → Kanji (trắc nghiệm) (rút gọn, chủ dự án chốt 2026-11-22) |
| Stage 3 | Kanji → **gõ** Hán Việt · **phân biệt Kanji giống nhau** (chỉ có khi chữ đó có cặp chữ giống nhau đã duyệt) (rút gọn, chủ dự án chốt 2026-11-22) |
| **Review: 1 Card** | nhìn chữ → **gõ** Hán Việt + **chọn** nghĩa |

## 6. Khu Từ vựng Kanji

- **Mở thẻ** (chủ dự án chốt 2026-11-24): từ vựng Kana của từ đã vào **Stage 2**, **và mọi chữ Kanji của từ đã học xong ở khu Kanji** (xong Intro, có Card, hoặc đã đánh dấu "đã biết"). Giữ danh sách chính sách Kanji của từ: từ "chỉ Kana" không có thẻ Từ vựng Kanji.
- **Học từ bằng Kana ở N5 không bắt buộc học dạng Kanji ở N5.** Cấp của thẻ Từ vựng Kanji = cấp khó nhất giữa từ và các chữ của từ: từ N5 có chữ N4 (vd. 日曜日) mở trong lúc học Kanji N4; từ có chữ ngoài danh sách N5–N4 (vd. 辞書, 傘) **chưa có** thẻ Từ vựng Kanji (tới khi khu Kanji có cấp đó).
- **Bỏ hàng chờ** (trước đây từ thiếu chữ được học thẳng dạng Kanji khi tới lượt).
- Số từ có dạng Kanji theo luật này (dữ liệu 2026-11-24): từ N5 — 214 mở ở N5, 141 mở ở N4, 271 chưa có; từ N4 — 217 mở ở N4, 499 chưa có.
- **Thẻ giới thiệu:** Kana, dạng Kanji, Hán Việt, nghĩa, và **tách từng chữ** của từ (mỗi chữ kèm Hán Việt và nghĩa, vd. 学校 → 学 HỌC · học, 校 HIỆU · trường; chủ dự án yêu cầu 2026-11-24).

| | Loại thẻ |
|---|---|
| Stage 1 | từ Kanji → Hán Việt · từ Kanji → nghĩa (trắc nghiệm) (rút gọn, chủ dự án chốt 2026-11-22) |
| Stage 2 | Hán Việt → từ Kanji · nghĩa → từ Kanji (trắc nghiệm) · **ghép chữ**: nghĩa (kèm Hán Việt) → chọn từng chữ theo thứ tự để viết từ, có chữ Kanji nhiễu (2026-11-19) (rút gọn, chủ dự án chốt 2026-11-22) |
| Stage 3 | từ Kanji → **gõ** Hán Việt (rút gọn, chủ dự án chốt 2026-11-22) |
| **Review: 1 Card** | nhìn từ → **gõ** Hán Việt + **chọn** nghĩa (bỏ gõ Kana, chủ dự án chốt 2026-11-19; cách đọc hiện và đọc to sau khi chấm) |

## 7. Chuyển dữ liệu người học (từ V11)

| Hiện tại | Sang V12 |
|---|---|
| Từ đã có Card Kana | Xem như xong Stage 3 Kana. Giữ lịch FSRS cho Card ①; Card ② mới đến hạn ngày mai  |
| Từ đang ở Stage 2 cũ | Stage 2 Kana, 0 điểm |
| Từ đang ở Stage 3 cũ | Stage 3 Kana, 0 điểm |
| Từ ở Stage 5 / 6 cũ | Stage 2 / 3 của Từ vựng Kanji, 0 điểm |
| Từ đã có Card Kanji | Card Từ vựng Kanji, giữ lịch FSRS |
| Chữ đang Học (12 điểm cũ) | Stage 2 Kanji, 0 điểm |
| Chữ đã có 2 Card | Gộp thành 1 Card, lấy lịch của Card đến hạn sớm hơn |
| Bộ thủ | Bắt đầu từ đầu. Người học cũ có thể đánh dấu "đã biết" cả nhóm  |

**Bỏ:** cấu trúc 6 Stage, bộ xếp thứ tự AIS, câu kiểm tra nhanh, vòng ghép ô Stage 3, vòng boss ghép 5 từ, luật ưu tiên Kanji theo từ sắp học.
**Giữ:** từ có sao (học thêm), nút "đã biết", Practice (Speed Matching), trang tra cứu Library.

## 8. Tự cân bằng số mục mới mỗi ngày

**Đã chốt (chủ dự án, 2026-11-18):**
- Cân bằng theo **thời gian học**: ba khu Từ vựng Kana, Kanji (gồm bộ thủ) và Từ vựng Kanji **học xong cùng một ngày**.
- Cân bằng **theo từng cấp**: xong N5 cả ba khu rồi mới sang N4.
- ~~Bộ thủ tính vào khu Kanji.~~ Từ 2026-11-24 bộ thủ học riêng ở More, không tính vào cân bằng (§5.1).

### 8.1 Thời gian của một mục

Mỗi mục được quy ra **thời gian học** theo số câu tối thiểu của các Stage và số lần ôn Card trong 60 ngày đầu, nhân với thời gian ước tính của mỗi loại câu.

| Thời gian mỗi loại câu | Giây |
|---|---|
| Thẻ giới thiệu | 15 |
| Trắc nghiệm / ghép | 6 |
| Gõ | 12 |
| Card Review (gom chung) | 15 |

| Mục | Câu học (tối thiểu; Stage 2–3 tính 2 điểm mỗi loại từ 2026-11-20) | Card Review | Thời gian ước tính |
|---|---|---|---|
| Từ vựng Kana | thẻ giới thiệu + Stage 1: 2 trắc nghiệm + Stage 2: 4 trắc nghiệm + Stage 3: 4 gõ | 1 Card × 4 lần | 15 + 36 + 48 + 60 ≈ **2,7 phút** |
| Bộ thủ | thẻ giới thiệu + Stage 1: 2 + Stage 2: 4 trắc nghiệm | không có Card | 15 + 36 ≈ **0,9 phút** |
| Chữ Kanji | thẻ giới thiệu + Stage 1: 2 + Stage 2: 4 trắc nghiệm + Stage 3: 2 gõ (+ 2 phân biệt chữ giống nếu có) | 1 Card × 4 lần | 15 + 36 + 24 + 60 ≈ **2,3 phút** |
| Từ vựng Kanji | thẻ giới thiệu + Stage 1: 2 + Stage 2: 4 trắc nghiệm + 2 ghép chữ + Stage 3: 2 gõ | 1 Card × 4 lần | 15 + 48 + 24 + 60 ≈ **2,5 phút** |

- Sai thì có thêm câu hỏi lại, nên thời gian thật dài hơn. App ghi thời gian trả lời thật và **sau 14 ngày** thay các con số ước tính bằng trung bình thật của người học .

### 8.2 Cách chia

- **Cân bằng theo số mục** (chủ dự án chốt 2026-11-20, thay cho số phút). Người học chọn **một** trong hai mục tiêu trong Settings:
  - **tổng số mục mới mỗi ngày** M (mặc định 10; gồm từ vựng Kana, chữ Kanji, từ vựng Kanji);
  - hoặc **ngày muốn học xong cấp** D.
- **Số ngày còn lại:** `N` = `⌈tổng số mục còn lại của cấp / M⌉`, hoặc số ngày tới D.
- **Mỗi khu mở `số mục còn lại / N` mục mỗi ngày** (chia theo số mục, không theo thời gian). Ba khu cùng hết vào ngày thứ N. Phần lẻ được cộng dồn qua các ngày, nên tổng mỗi ngày trung bình đúng M (có ngày nhiều hoặc ít hơn một mục).
- **Thời gian học ước tính** = số mục mới mỗi ngày của từng loại × thời gian một mục (§8.1, đã gồm Intro và các lần ôn đầu; sau 14 ngày dùng thời gian thật). Đây là thời gian học mỗi ngày khi đã đều đặn.
- App **tính lại mỗi ngày** theo số còn lại thật. Khu nào chậm (ví dụ Từ vựng Kanji chưa đủ điều kiện mở) thì các ngày sau tự tăng chỉ tiêu cho khu đó.
- **Ràng buộc của Từ vựng Kanji:** chỉ mở được khi đủ điều kiện ở §6. Ngày nào không đạt chỉ tiêu thì phần thiếu không chuyển sang khu khác (để ba khu vẫn kết thúc cùng lúc), mà dồn sang các ngày sau. Hàng chờ ở §6 bù vào cuối cấp.
- **Trần mỗi khu** (§2) vẫn được áp dụng. Nếu chỉ tiêu làm một ngày trong 7 ngày tới vượt trần thì hiện cảnh báo như §2, kèm gợi ý lùi ngày D hoặc giảm số mục M.

**Hiển thị:**
- Settings có công tắc **"Balance new items"**, bật sẵn.
- Khi bật, app hiện số mục mới hôm nay của từng khu, thời gian học ước tính mỗi ngày và ngày dự kiến xong cấp.
- Khi tắt, người học tự chỉnh số mục mới của từng khu như cũ.
