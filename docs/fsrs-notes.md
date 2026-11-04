# SRS-01 — FSRS trong Projap: khái niệm, ánh xạ điểm, vòng đời một card

> Trạng thái: **Draft — chờ Người B review** (thêm §9 SRS-02, 2026-11-04)
>
> Ngày: 2026-11-04
>
> Nguồn: chạy thật `ts-fsrs` với tham số mặc định, tắt fuzz (`_local/srs-01/fsrs-demo.mjs`). Luật điểm và rating: `docs/learning-rules.md` (R2, R5, R6).

## 1. FSRS giải quyết vấn đề gì

Học xong một từ, ta bắt đầu quên. Ôn quá sớm thì phí công; ôn quá muộn thì đã quên, phải học lại. FSRS đoán, **cho từng card**, thời điểm ngay trước khi ta sắp quên, và hẹn ôn đúng lúc đó.

## 2. Ba con số của mỗi card (mô hình DSR)

| Ký hiệu | Tên | Ý nghĩa |
| --- | --- | --- |
| **R** | Retrievability | Xác suất nhớ ra nếu bị hỏi ngay bây giờ |
| **S** | Stability | Số ngày để R tụt từ 100% xuống 90%. S lớn = trí nhớ bền |
| **D** | Difficulty | 1 → 10: card này khó nhớ với người học tới đâu |

**Due** (lần ôn tới) = lúc R dự kiến còn **90%** (desired retention mặc định 0.9). Vì vậy ở trạng thái Review, khoảng cách tới lần sau ≈ S ngày.

## 3. Trạng thái và rating

Trạng thái: **New** → **Learning** (bước ngắn, tính bằng phút) → **Review** (tính bằng ngày) → quên thì **Relearning** → quay lại Review.

Cùng một card (Review, S = 2,31, D = 2,11), 4 rating cho ra (số thật từ ts-fsrs):

| Rating | State sau | S sau (ngày) | D sau | Lần tới |
| --- | --- | --- | --- | --- |
| Again | Relearning | 0,61 | 7,39 | trong ngày (vài phút) |
| Hard | Review | 7,52 | 4,75 | 8 ngày |
| Good | Review | 10,97 | 2,10 | 11 ngày |
| Easy | Review | 18,53 | 1,00 | 19 ngày |

## 4. Projap: máy chấm → rating → điểm card

Người học không tự bấm rating. Máy chấm bài tập rồi đổi ra rating (`scoreReview`, ENG-02):

| Kết quả chấm | Rating | Điểm card |
| --- | --- | --- |
| Sai | Again | −1 |
| Đúng nhờ gợi ý | Hard | 0 |
| Đúng | Good | +1 |
| Đúng, không gợi ý, < 3 giây, **bài gõ hoặc ghép** | Easy | +2 |

### Vì sao bài trắc nghiệm không được cho Easy?

1. **Đoán trúng được:** chọn 1/6 thì đoán bừa đúng ~17%, chọn 1/4 thì 25%.
2. **Nhận ra ≠ nhớ ra:** nhìn thấy đáp án rồi nhận ra dễ hơn nhiều so với tự tái tạo (ghép, gõ).
3. **Easy rất "đắt":** Kịch bản C (§6) cho thấy chỉ 2 lần Easy đã đẩy card đi **66 ngày**. Nếu một trong hai lần đó là đoán trúng, card bị cất quá lâu và người học quên mất.

## 5. Input/output của `ts-fsrs`

```ts
import { createEmptyCard, fsrs, generatorParameters, Rating } from 'ts-fsrs'

const f = fsrs(generatorParameters({ enable_fuzz: true }))  // test: enable_fuzz: false
let card = createEmptyCard(now)                              // state New, S = D = 0
const { card: next, log } = f.next(card, reviewedAt, Rating.Good)
```

| | Trường | Ghi chú cho Projap |
| --- | --- | --- |
| **Input** | `card` (state, due, stability, difficulty, reps, lapses, learning_steps, last_review…), thời điểm ôn, rating | Thời điểm ôn do **server** quyết định |
| **Output `card`** | state, due, stability, difficulty, scheduled_days, reps, lapses… mới | Lưu vào `review_cards` (cột đã có từ DB-02) |
| **Output `log`** | rating, state trước, due trước/sau… | Lưu vào `review_logs` |
| Phụ | `f.get_retrievability(card, now)` | Dùng cho Dashboard / "từ yếu" sau này |

## 6. Vòng đời card 学校 (nghĩa → Kanji) — số thật

Card tạo lúc **04/11 21:00** (学校 qua Stage 4) → theo R5 đến hạn **05/11 00:00**. Người học ôn lúc 20:00 ngày đến hạn.

| # | Ôn lúc | Câu hỏi → kết quả | Rating | State sau | S (ngày) | D | Lần tới | Điểm card |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 05/11 20:00 | chọn Kanji 1/6, đúng | Good | Learning | 2,31 | 2,12 | **+10 phút** | 1 |
| 2 | 05/11 20:10 | ghép 学+校, đúng, 2,1 s | Easy | Review | 3,95 | 1,00 | 4 ngày | 3 |
| 3 | 09/11 20:00 | chọn Kanji 1/6, **sai** | Again | Relearning | **0,92** | **7,03** | +10 phút | 2 |
| 4 | 09/11 20:10 | ghép, đúng nhờ gợi ý | Hard | Relearning | 0,92 | 8,01 | +15 phút | 2 |
| 5 | 09/11 20:25 | chọn Kanji 1/6, đúng | Good | Review | 0,97 | 8,00 | 1 ngày | 3 |
| 6 | 10/11 20:00 | ghép, đúng, 4 s | Good | Review | 2,58 | 7,99 | 3 ngày | 4 |
| 7 | 13/11 20:00 | chọn Kanji 1/6, đúng | Good | Review | 6,55 | 7,97 | 7 ngày (20/11) | 5 |

Đọc bảng:

- **Ngày đầu có 2 lần ôn** (#1, #2): card New trả lời Good chưa vào lịch dài hạn ngay mà qua một **bước học 10 phút**. Lần thứ hai mới vào Review.
- **Một lần sai làm tụt mạnh** (#3): S từ 3,95 xuống 0,92 ngày, D từ 1,00 nhảy lên 7,03. Card quay lại bước học ngắn (#4, #5) trong cùng buổi.
- **Sau khi quên, khoảng cách hồi phục chậm**: 1 → 3 → 7 ngày, và D giữ quanh 8 (card được coi là khó), nên các lần sau sẽ tăng chậm hơn card chưa từng quên.
- Sau 7 lần ôn trong ~2 tuần, điểm card mới là **5**.

So sánh: nếu lần nào cũng Good (Kịch bản B), khoảng cách tăng rất nhanh: 2 → 11 → 46 → 163 → 498 ngày. Nếu lần nào cũng Easy (Kịch bản C): 8 → 66 → 397 ngày.

## 7. Phát hiện ảnh hưởng tới thiết kế (F1 đã chốt; F2–F5 là đề xuất cho SRS-02/SRS-03)

### F1 — Card giàn giáo gần như không bao giờ bị bỏ chỉ nhờ review

Với toàn Good, card đạt **10 điểm ở lần ôn thứ 10 — năm 2061**. Mốc 30 điểm (nghĩa–hira) và 40 điểm (hira–Hán Việt) **không thể đạt bằng review**. Thực tế card giàn giáo chỉ được bỏ nhờ **practice** (tối đa +3/ngày → ít nhất 10 ngày luyện cho mốc 30).

Ngược lại, giữ card giàn giáo lại cũng **không tốn bao nhiêu**: sau ~5 lần ôn, nó chỉ xuất hiện vài lần mỗi năm.

Các phương án đã cân nhắc:

- **(a) Giữ nguyên — ĐÃ CHỌN (chủ dự án, 2026-11-04):** card giàn giáo được bỏ nhờ practice; không luyện thì card vẫn tồn tại nhưng hiếm gặp. `RULES_V2` và `docs/learning-rules.md` R6 không đổi.
- (b) Thêm điều kiện thay thế: bỏ card khi S ≥ 60 ngày (FSRS đã coi là nhớ chắc), bất kể điểm.
- (c) Hạ mốc điểm.

Hệ quả cần nhớ khi làm UI: chế độ Luyện tập (SMART-03) là con đường chính để bỏ card giàn giáo, nên nên ưu tiên đưa từ còn card giàn giáo vào bài luyện (đã có trong FR-PR-05).

### F2 — Bước học ngắn trong ngày (learning steps)

Card New trả lời Good, hoặc card Review bị Again, sẽ quay lại sau **10–15 phút**. Bài học hôm nay phải hỗ trợ việc này. Đề xuất (khớp R7 bước 9): card quay lại hàng đợi cùng ngày, **không** tính thêm vào trần 120 review (trần đếm số card khác nhau). Nếu người học kết thúc buổi trước khi tới giờ, card sẽ được hỏi ở buổi kế tiếp.

### F3 — Ôn sớm vài phút

Kịch bản A ôn lúc 20:00 với card đến hạn 20:10 (#3) hoặc 20:25 (#6): ts-fsrs vẫn chấp nhận, R chỉ cao hơn chút. Vì vậy "đến hạn" trong Projap nên tính theo **ngày học** (đến hạn trong hôm nay thì được đưa vào bài học hôm nay), không cần đúng từng phút.

### F4 — Fuzz

Production bật `enable_fuzz` (lệch ngẫu nhiên nhỏ để các card không dồn cùng một ngày); unit test tắt để kết quả lặp lại được.

### F5 — Tham số

MVP dùng tham số mặc định và desired retention 0,9. Tối ưu tham số theo lịch sử ôn của từng người: sau MVP.

## 8. Câu hỏi tự kiểm tra

1. Card có S = 30 ngày được ôn đúng hạn và trả lời Good. Lần sau khoảng bao lâu? *(Lớn hơn 30 ngày nhiều — xem Kịch bản B: 46 → 163.)*
2. Vì sao một lần Again làm D tăng mạnh mà ba lần Good sau đó chỉ làm D giảm rất ít? *(D phản ánh "card này khó với bạn"; FSRS hạ D chậm để không quá lạc quan.)*
3. Practice có làm đổi `due` không? *(Không — chỉ cộng điểm card; xem R6.)*

## 9. SRS-02 — Bộ tính lịch trong code

Ngày: 2026-11-04 · Code: `lib/srs/scheduler.ts` · Test: `lib/srs/__tests__/scheduler.test.ts` (14 test)

### 9.1 Card = 2 nửa

| Nửa | Kiểu | Ai tính |
| --- | --- | --- |
| Lịch | `Schedule` (state, due, stability, difficulty, scheduledDays, learningSteps, reps, lapses, lastReviewAt) | ts-fsrs |
| Điểm | `CardPointsState` (type, status, points, bộ đếm practice) | `lib/learning` (ENG-02) |

Điểm **stage** của từ không thuộc card và không thuộc SRS-02 (xem ENG-02, VOC-04).

### 9.2 Cách dùng

```ts
import { createScheduler } from '@/lib/srs'

const scheduler = createScheduler()                       // production: fuzz bật
// test: createScheduler({ enableFuzz: false })

scheduler.createCardsForStage(4, false, now)              // → ReviewCard[] (New, due 00:00 hôm sau, 0 điểm)
const { card, log } = scheduler.reviewCard(card, answer, now)
// card: lịch mới + điểm mới (+ status 'retired' nếu đủ mốc)
// log:  rating, ratingNumber 1–4, cardPointsDelta, state/due trước–sau… → SRS-03 ghi review_logs
```

- `now` luôn truyền vào, không tự đọc đồng hồ.
- `reviewCard` **báo lỗi** khi card không `active` (đã bỏ / tạm dừng vì từ bị loại) hoặc khi `now` sớm hơn lần ôn trước — gặp ở đây là có bug chỗ khác (chủ dự án chọn, 2026-11-04).
- `Schedule.state` dùng số 0–3, khớp cột `review_cards.state`; `ratingNumber` khớp `review_logs.rating`.
- Chỉ `fromFsrs` / `toFsrs` biết tên trường của ts-fsrs; phần còn lại của app không import `ts-fsrs` trực tiếp.

### 9.3 ts-fsrs 6.0.0 (dự án) so với 5.4.2 (SRS-01)

Chạy cùng `fsrs-demo.mjs` trên hai bản: **mọi con số lịch giống hệt** (state, S, D, due) → bảng §6 dùng làm test được.
Khác biệt duy nhất: `f.get_retrievability(card, now, false)` **báo lỗi** ở bản 6 — hàm tính R đã đổi cách gọi. SRS-02 không dùng R; ai làm Dashboard / "từ yếu" (SMART-02) cần xem lại API bản 6.
