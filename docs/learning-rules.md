# ENG-01 — Luật học (Learning Rules) `RULES_V2`

> Trạng thái: **Draft — chờ Người B review**
>
> Ngày: 2026-11-01
>
> Nguồn quyết định: `docs/PROJECT_SPEC.md` Design V7 (§5, §6, §7). Tài liệu này là **đặc tả để code**: trả lời chính xác từng tình huống mà spec mô tả bằng lời. Khi mâu thuẫn, spec được ưu tiên và tài liệu này phải được sửa.
>
> Mỗi luật (R1…R8) sẽ thành một pure function trong `lib/learning/` ở task ENG-02. Mỗi ví dụ ở §11 sẽ thành một unit test.

## 1. Cách đọc

- **CONFIRMED** — chủ dự án đã chốt (có ngày).
- **PROPOSED** — người viết tài liệu đề xuất để lấp chi tiết; Người B review, chủ dự án duyệt.
- Mọi con số mặc định nằm trong một config có version `RULES_V2` (§10), không hard-code rải rác.

## 2. Định nghĩa

| Thuật ngữ | Định nghĩa |
| --- | --- |
| **Ngày học** | Khoảng 00:00–24:00 theo giờ Việt Nam (`Asia/Ho_Chi_Minh`, UTC+7). Dữ liệu lưu UTC; mọi phép "hôm nay" quy về ngày học. — CONFIRMED |
| **Câu** | Một câu hỏi người học trả lời trong Bài học hôm nay. Có hai loại: **câu học** (thuộc một Stage của một từ, ghi `learning_attempts`) và **câu review** (thuộc một card, ghi `review_logs`). Câu trong **vòng boss** và **Luyện tập** là câu practice, ghi `practice_logs`. |
| **Câu của một từ** | Câu học của từ đó, hoặc câu review của bất kỳ card nào thuộc từ đó. |
| **Kết quả chấm** | Một trong ba: `correct` (đúng, không dùng gợi ý), `hint` (đúng nhưng đã bấm gợi ý), `wrong` (sai). Server chấm, không tin kết quả do client gửi. |
| **Khoảng xen (gap)** | Số câu (học + review, **không tính** câu vòng boss) được trả lời **giữa** câu hiện tại và câu trước đó của **cùng từ**, trong **cùng ngày học**, tính xuyên qua các phiên. |
| **Câu được giãn cách** | Câu của một từ mà từ đó **chưa có câu nào hôm nay**, hoặc gap ≥ 4. — CONFIRMED |
| **Điểm stage** | Điểm tích lũy của một từ ở Stage hiện tại. Có thể âm. Về 0 khi sang Stage mới. — CONFIRMED |
| **Điểm card** | Điểm tích lũy của một card, chỉ dùng để quyết định bỏ card giàn giáo. Có thể âm. — CONFIRMED |
| **Điểm +1 trong ngày** | Số lần một từ được **cộng** điểm stage ở Stage hiện tại trong ngày học. |

## 3. R1 — Luồng Stage

| Loại từ | Đường đi |
| --- | --- |
| Có Kanji (`is_kana_only = false`) | 1 → 2 → 3 → 4 → 5 → hoàn thành vòng học ban đầu |
| Chỉ Kana (Hiragana hoặc Katakana) | 1 → 2 → 5 → hoàn thành vòng học ban đầu |

- Stage 1 và Stage 3: **xem xong là qua**, không có điểm. — CONFIRMED
- Stage 2, 4, 5: qua theo R4.
- Stage không bao giờ lùi. — CONFIRMED

## 4. R2 — Chấm một câu

### 4.1 Câu học → điểm stage thô

| Kết quả | Điểm thô |
| --- | --- |
| `correct` | +1 |
| `hint` | 0 |
| `wrong` | −1 |

Điểm thô chưa chắc được cộng; R3 quyết định.

### 4.2 Câu review → rating FSRS → điểm card

| Kết quả | Rating | Điểm card |
| --- | --- | --- |
| `wrong` | Again | −1 |
| `hint` | Hard | 0 |
| `correct` | Good | +1 |
| `correct` **và** không gợi ý **và** trả lời < 3 giây **và** dạng bài là **gõ hoặc ghép** | Easy | +2 |

- Dạng **chọn** (trắc nghiệm, câu nghe) tối đa là Good. — CONFIRMED
- Thời gian trả lời tính từ lúc câu hiện ra tới lúc bấm nộp, do server ghi nhận theo thời điểm nhận event. — PROPOSED

### 4.3 Câu practice → điểm card

| Kết quả | Điểm card thô |
| --- | --- |
| `wrong` | −1 |
| `hint` | 0 |
| `correct` | +1 |

Practice **không** tạo rating và **không** đổi `due`. — CONFIRMED

## 5. R3 — Điểm stage có được tính không

Áp cho câu học ở Stage 2, 4, 5:

1. Câu **không được giãn cách** → **0 điểm** (vẫn ghi log, `counted = false`).
2. Câu được giãn cách, `wrong` → **−1**. Không có trần cho điểm trừ. — CONFIRMED (4a, 5a)
3. Câu được giãn cách, `hint` → 0.
4. Câu được giãn cách, `correct`:
   - nếu **điểm +1 trong ngày** của từ ở Stage này **< 3** → **+1**;
   - ngược lại → **0** (`counted = false`). — CONFIRMED (5a)

Hệ quả: sai liên tiếp trong vòng 4 câu chỉ bị trừ **một lần**; đúng liên tiếp trong vòng 4 câu chỉ được cộng **một lần**. — CONFIRMED (4a)

## 6. R4 — Qua Stage

Một từ qua Stage 2 / 4 / 5 ngay khi **cả hai** điều kiện đúng:

1. Điểm stage ≥ **5**.
2. Mọi **yêu cầu bắt buộc** của Stage đã có **ít nhất một lần được +1** (tính từ lúc vào Stage này, xuyên qua các ngày).

| Stage | Yêu cầu bắt buộc |
| --- | --- |
| 2 | `kana_to_meaning`, `meaning_to_kana`, `kana_assembly` |
| 4 | `kanji_recognition`, `kanji_assembly`, `hanviet_recognition`, `hanviet_assembly` |
| 5 (có Kanji) | Skill S1, S2, S3, S4 — mỗi Skill có ít nhất một dạng bài của nó được +1 |
| 5 (chỉ Kana) | Skill S1, S2 |

Dạng bài thuộc Skill nào ở Stage 5:

| Skill | Dạng bài Stage 5 |
| --- | --- |
| S1 Meaning | `meaning_assembly`, `meaning_recognition_6` |
| S2 Kana | `kana_free_recall` (gõ Romaji → Kana/Katakana) |
| S3 Kanji | `kanji_assembly_nohint`, `kanji_recognition_6` |
| S4 Hán Việt | `hanviet_free_recall`, `hanviet_recognition`, `hanviet_assembly` |

Khi qua: điểm stage về 0, sang Stage tiếp theo theo R1, chạy R5. — CONFIRMED

## 7. R5 — Tạo card

| Vừa qua | Tạo card |
| --- | --- |
| Stage 1 | — |
| Stage 2 | `vocab.meaning_kana` |
| Stage 3 | `vocab.kana_hanviet` |
| Stage 4 | `vocab.meaning_kanji`, `vocab.kanji_meaning_hanviet` |
| Stage 5 (có Kanji) | `vocab.meaning_hanviet` |
| Stage 5 (chỉ Kana) | — (đã có `vocab.meaning_kana` từ Stage 2) |

- Card mới: trạng thái FSRS `New`, điểm card 0, **đến hạn lần đầu lúc 00:00 ngày học hôm sau**. — CONFIRMED (6a)
- Tạo card idempotent: qua Stage hai lần (ví dụ do submit trùng) không tạo card thứ hai. — PROPOSED

### Dạng bài dùng để ôn từng card — PROPOSED

| Card | Dạng bài khi review |
| --- | --- |
| `vocab.meaning_kana` | Kana → chọn nghĩa; nghĩa → chọn Kana; ghép Kana; câu nghe; gõ Kana |
| `vocab.kana_hanviet` | Kana → chọn Hán Việt; ghép Hán Việt; gõ Hán Việt |
| `vocab.meaning_kanji` | nghĩa → chọn Kanji (1/6); ghép Kanji |
| `vocab.kanji_meaning_hanviet` | Kanji → chọn nghĩa (1/6); Kanji → ghép nghĩa; Kanji → chọn/gõ Hán Việt |
| `vocab.meaning_hanviet` | nghĩa → gõ Hán Việt; nghĩa → ghép Hán Việt; Hán Việt → chọn nghĩa |

## 8. R6 — Điểm card và bỏ card giàn giáo

- Review: cộng điểm theo §4.2, không giới hạn. — CONFIRMED
- Practice: cộng theo §4.3; mỗi card được **tối đa +3 điểm từ practice mỗi ngày** (trần chỉ áp cho điểm cộng). — CONFIRMED (7a)
- Điểm card có thể âm. — CONFIRMED (2a)
- Bỏ card khi đạt mốc — CONFIRMED:

| Card | Bỏ khi điểm card ≥ | Ngoại lệ |
| --- | --- | --- |
| `vocab.meaning_kana` | 30 | Từ chỉ có Kana: **không bao giờ bỏ** |
| `vocab.kana_hanviet` | 40 | — |
| 3 card còn lại | không bỏ | — |

- Card bị bỏ: `status = retired`, không còn được lên lịch hay chọn cho practice; lịch sử giữ nguyên. — CONFIRMED
- Câu practice ánh xạ vào card — PROPOSED: cặp Kana ↔ nghĩa → `vocab.meaning_kana`; cặp Kana ↔ Hán Việt → `vocab.kana_hanviet`. Nếu card chưa tồn tại hoặc đã bỏ thì không cộng điểm.

## 9. R7 — Dựng Bài học hôm nay

Settings mặc định — CONFIRMED: `new_per_day = 20`, `review_cap = 120`, `unlock_threshold = 80`, `mode = mixed`.

1. **Chụp số due** `D` lúc dựng bài học lần đầu trong ngày: số card `active` có `due ≤ thời điểm đó`. `D` cố định cho cả ngày.
2. **Review hôm nay** = `min(D, review_cap)` card, ưu tiên card quá hạn lâu nhất. Phần dư dời sang ngày sau.
3. **Từ đang học dở** (đang ở Stage 2, 4 hoặc 5, chưa bị loại) luôn được đưa vào.
4. **Từ mới:**
   - nếu `D ≥ unlock_threshold` → **0 từ mới**;
   - ngược lại → `new_per_day − số từ đã mượn trước cho hôm nay`, lấy theo `sort_order`, bỏ qua từ đã bị loại.
5. **Chế độ:** `mixed` trộn tất cả vào một hàng đợi; `review_first` xếp toàn bộ câu review trước.
6. **Luật trộn hàng đợi** — CONFIRMED: không có 2 câu liền nhau cùng dạng bài; hai câu của cùng một từ cách ≥ 4 câu; chèn vòng boss (Speed Matching 30 giây) khoảng mỗi 25 câu khi hôm nay đã có ≥ 6 từ.
7. **Chia phiên:** khoảng **20 câu một phiên** (~5 phút). — PROPOSED, tinh chỉnh khi test
8. **Học thêm** (sau khi xong Bài học hôm nay) — CONFIRMED:
   - chỉ khi `D < unlock_threshold`;
   - lấy từ tiếp theo theo `sort_order`, ghi là **mượn của ngày học kế tiếp**;
   - tổng số từ mượn cho ngày kế tiếp ≤ `new_per_day` (chỉ mượn trước 1 ngày);
   - **không** kéo review của ngày sau lên sớm.
9. **Card Again trong ngày** — PROPOSED: nếu FSRS đặt lại card đến hạn trong cùng ngày (learning step), card quay lại hàng đợi hôm nay và **không** tính thêm vào `review_cap` (trần đếm số card khác nhau).

## 10. R8 — Loại và khôi phục từ khỏi lộ trình

| Trạng thái từ khi loại | Hiệu ứng | Khi khôi phục |
| --- | --- | --- |
| Chưa học (chưa vào Stage 1) | Lộ trình bỏ qua từ này | Trở lại đúng vị trí `sort_order`; sẽ được lấy khi tới lượt |
| Đang học dở hoặc đã có card | Không vào hàng đợi; mọi card `suspended`; giữ nguyên Stage, điểm | Tiếp tục từ Stage cũ; card `active` lại, card quá hạn tính vào `D` của lần dựng tiếp theo |

— CONFIRMED (B-a, 31/10); chi tiết cột "Khi khôi phục" PROPOSED.

## 11. Ví dụ tính tay

Quy ước: `#n` là thứ tự câu trong ngày học (đã bỏ câu vòng boss).

### VD1 — Giãn cách chặn spam (R3)

学校, Stage 2, điểm 2, hôm nay chưa được +1 lần nào. Câu trước của 学校 hôm nay là `#3`.

| Câu | Kết quả | Gap | Tính? | Điểm stage |
| --- | --- | --- | --- | --- |
| `#10` Kana → nghĩa | correct | 6 | +1 | 3 |
| `#12` nghĩa → Kana | correct | 1 | 0 (chưa giãn cách) | 3 |
| `#17` Kana → nghĩa | correct | 4 | +1 | 4 |

### VD2 — Đủ điểm nhưng thiếu dạng bắt buộc (R4)

学校, Stage 2, điểm 6; đã có +1 từ `kana_to_meaning` và `meaning_to_kana`, **chưa** có từ `kana_assembly` → **chưa qua**. Câu ghép Kana được giãn cách, `correct`, chưa chạm trần → +1 → điểm 7, đủ 3 yêu cầu → **qua Stage 2** → tạo `vocab.meaning_kana` (R5).

### VD3 — Trần 3 điểm cộng mỗi ngày (R3)

学校, Stage 4, điểm 3, hôm nay đã được +1 ba lần.

| Câu | Kết quả | Kết quả tính |
| --- | --- | --- |
| giãn cách | correct | 0 (đã chạm trần) → điểm 3 |
| giãn cách | wrong | −1 (điểm trừ không có trần) → điểm 2 |
| ngày hôm sau, giãn cách | correct | +1 → điểm 3 |

### VD4 — Điểm âm và sai liên tiếp (R3)

これ, Stage 2, điểm 0. Câu trước của これ hôm nay là `#14`.

| Câu | Kết quả | Gap | Tính? | Điểm stage |
| --- | --- | --- | --- | --- |
| `#20` | wrong | 5 | −1 | −1 |
| `#22` | wrong | 1 | 0 | −1 |
| `#27` | wrong | 4 | −1 | −2 |

### VD5 — Qua Stage 3 bằng xem (R1, R5)

学校 đang ở Stage 3. Ngày 01/11 lúc 21:00 người học xem xong thẻ giới thiệu 学校 = 学 (HỌC) + 校 (HIỆU) → **qua Stage 3**, sang Stage 4 với điểm 0 → tạo `vocab.kana_hanviet`, `New`, điểm card 0, **đến hạn 02/11 00:00** (giờ VN).

### VD6 — テレビ đi trọn đường (R1, R4, R5, R6)

1. Stage 1: xem xong → Stage 2.
2. Stage 2: qua vài ngày, đạt 5 điểm, có +1 từ cả 3 dạng (mảnh ghép là Katakana テ・レ・ビ) → tạo `vocab.meaning_kana` → nhảy thẳng **Stage 5**.
3. Stage 5: yêu cầu S1 (ghép hoặc chọn nghĩa 1/6) và S2 (gõ `terebi` → テレビ); đạt 5 điểm → **hoàn thành vòng học ban đầu**, không tạo card mới.
4. `vocab.meaning_kana` của テレビ **không bao giờ bị bỏ**, kể cả khi điểm card vượt 30.

### VD7 — Rating khi review (R2)

Card `vocab.meaning_kanji` của 学校:

| Câu | Kết quả | Thời gian | Rating | Điểm card |
| --- | --- | --- | --- | --- |
| Chọn Kanji 1/6 | correct | 1,2 s | **Good** (trắc nghiệm không được Easy) | +1 |
| Ghép 学 + 校 | correct | 2,1 s | **Easy** | +2 |
| Ghép 学 + 校 | correct | 4,0 s | Good | +1 |
| Ghép 学 + 校 | hint | 2,0 s | Hard | 0 |
| Chọn Kanji 1/6 | wrong | — | Again | −1 |

### VD8 — Bỏ card giàn giáo và trần practice (R6)

Card `vocab.meaning_kana` của 学校 (từ có Kanji), điểm card 28; hôm nay practice đã cộng +2 cho card này.

| Sự kiện | Điểm card |
| --- | --- |
| Speed Matching, cặp がっこう ↔ trường học, correct | +1 (lần cộng practice thứ 3 hôm nay) → 29 |
| Speed Matching, correct lần nữa | 0 (chạm trần practice) → 29 |
| Ngày hôm sau, review → Good | +1 → **30 → card bị bỏ** |

### VD9 — Dựng bài học khi review dồn (R7)

Settings mặc định (20 / 120 / 80).

| `D` lúc dựng | Review hôm nay | Từ mới | Ghi chú |
| --- | --- | --- | --- |
| 150 | 120 | 0 | 30 card dời sang ngày sau |
| 80 | 80 | 0 | `D ≥ 80` nên chặn từ mới |
| 79 | 79 | 20 | |

Trong mọi trường hợp, từ đang học dở vẫn được đưa vào.

### VD10 — Học thêm mượn quota (R7)

| Ngày | `D` | Diễn biến | Từ mới |
| --- | --- | --- | --- |
| 01/11 | 50 | Xong bài học: 50 review + 20 từ mới. Bấm "Học thêm" 5 từ → ghi mượn 5 cho 02/11 | 20 + 5 |
| 02/11 | 60 | Quota còn 20 − 5 = 15 | 15 |
| 02/11 | 60 | Muốn học thêm tiếp: chỉ được mượn của 03/11, tối đa 20 | ≤ 20 |
| 03/11 (giả sử) | 85 | `D ≥ 80` → không mở từ mới. Những từ đã mượn và học từ hôm trước vẫn là từ đang học dở, vẫn được đưa vào | 0 |

## 12. Config `RULES_V2`

```ts
// Hình dạng đề xuất cho lib/learning/rules.ts (ENG-02)
export const RULES_V2 = {
  version: 2,
  timezone: 'Asia/Ho_Chi_Minh',
  stagePoints: { correct: 1, hint: 0, wrong: -1, passAt: 5, maxPositivePerStagePerDay: 3, floor: null },
  spacing: { minGap: 4, excludeBossRound: true },
  review: { easyMaxMs: 3000, easyExerciseKinds: ['typing', 'assembly'] },
  cardPoints: {
    review: { again: -1, hard: 0, good: 1, easy: 2 },
    practice: { wrong: -1, hint: 0, correct: 1, maxPositivePerCardPerDay: 3 },
    retireAt: { 'vocab.meaning_kana': 30, 'vocab.kana_hanviet': 40 },
    neverRetireMeaningKanaForKanaOnly: true,
  },
  newCardFirstDue: 'next_study_day_start',
  defaults: { newPerDay: 20, reviewCap: 120, unlockThreshold: 80, mode: 'mixed' },
  session: { questionsPerSession: 20 },          // PROPOSED
  bossRound: { everyQuestions: 25, minWordsToday: 6, seconds: 30 },
  borrow: { maxDaysAhead: 1 },
} as const
```

## 13. Câu hỏi còn mở

| # | Câu hỏi | Đề xuất hiện tại |
| --- | --- | --- |
| Q1 | Số câu mỗi phiên ~5 phút | 20 câu, chỉnh sau khi test thật |
| Q2 | Trong số từ đang học dở, ưu tiên từ nào khi hàng đợi dài | Từ gần qua Stage trước, rồi từ lâu chưa gặp |
| Q3 | Card bị Again có quay lại trong ngày và có tính vào trần không | Có quay lại; không tính thêm vào trần (R7 bước 9) |
| Q4 | Thời gian trả lời đo ở client hay server | Server ghi nhận; client gửi kèm để đối chiếu |
| Q5 | Speed Matching có cặp Kana ↔ Hán Việt không | Có, khi từ đã có card `vocab.kana_hanviet` |
