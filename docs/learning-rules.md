# ENG-01 — Luật học (Learning Rules) `RULES_V9`

> Trạng thái: **Đã chốt thiết kế V9** (chủ dự án duyệt 2026-11-10), gói 1 của nâng cấp V9 (xem `docs/upgrade-v9-audit.md`). Gói 2 (R1, R4, R5 cho Card Kana, R9: 6 Stage) đã có trong code trên nhánh `feature/v9-stages`, migration `20261110000001_v9_six_stages.sql`. Gói 3 (§6a chính sách Kanji của từ) đã có trên nhánh `feature/v9-kanji-policy`: `pnpm policy:propose` tạo `data/n5/kanji_policy.csv` và `docs/kanji-policy-review.md`, migration `20261111000001`–`000002`, nút "Học dạng Kanji", server kiểm tra trong `open_word_kanji`. Cấp chữ: N5 của file gốc giữ nguyên, các chữ khác theo danh sách Waller (`pnpm policy:levels`). Các gói 4–7 chưa làm. Bản V8 (`RULES_V4`) còn trong lịch sử git. Mục còn ghi PROPOSED là chi tiết kỹ thuật người viết đề xuất, được phép chỉnh khi code và test, nhưng phải báo lại.
>
> Ngày: 2026-11-10. Cơ sở: lộ trình v2 (`PROJECT_SPEC.md` §18.5b, §18.6, code trên `feature/path-v2`) và yêu cầu nâng cấp V9.
>
> Nhãn: **CONFIRMED** — chủ dự án đã chốt (ghi ngày hoặc nguồn). **PROPOSED** — người viết đề xuất, chờ duyệt. Mọi con số nằm trong config `RULES_V9` (§17).

## 1. Ánh xạ luật cũ sang mới

| Luật | V8 / v2 | V9 |
| --- | --- | --- |
| R1 | Luồng Stage 1→2→3→4→5 (V8); hai nhánh 1→2→5 và thẻ→4→6 (v2) | Hai nhánh 1→2→3 và 4→5→6 |
| R2 | Chấm câu học, câu review, câu practice | Thêm loại câu `MICRO_PRACTICE` và câu Kanji |
| R3 | Giãn cách ≥ 4 câu, trần +3/ngày | Giữ; định nghĩa lại cách đếm gap khi có câu `MICRO_PRACTICE` |
| R4 | Mốc mở/hoàn tất | Giữ số điểm; Stage 4 cần Stage 3 hoàn tất và chính sách Kanji |
| R5 | Tạo Card | Card Kana tạo ở Stage 3; thêm 2 Card Kanji riêng lẻ |
| R6 | Điểm Card và bỏ Card giàn giáo (V8); đã bỏ ở v2 | Không có điểm Card. Vòng đời Card: `active`, `suspended`, `archived`, `retired` (chỉ còn để đọc lịch sử V8) |
| R7 | Dựng Learn và Review mỗi ngày | Learn chung: bài 50 câu, ngân sách 200 câu/ngày, trần phụ Kanji. Review **không** gộp: Từ vựng Kana và Từ vựng Kanji là 2 mục riêng, Kanji riêng lẻ ôn trong khu Kanji; mỗi loại có trần riêng |
| R8 | Loại/khôi phục từ | Giữ nguyên; tách biệt với `archived` |
| R9 | Lịch Stage 2/4/5/6 tối đa 2 ngày | Lịch Stage 2/3/5/6 tối đa 2 ngày |
| R10 | Khu Kanji riêng | Kanji riêng lẻ: Học trong Learn, ôn dài hạn trong khu Kanji bằng 2 Card |
| R11 | — | Adaptive Interleaving Scheduler (AIS) |
| R12 | — | Kanji Visual Learning |
| R13 | — | Card Archive |

## 2. Định nghĩa

| Thuật ngữ | Định nghĩa |
| --- | --- |
| **Ngày học** | 00:00–24:00 giờ Việt Nam (UTC+7). — CONFIRMED |
| **Mục học (item)** | Đơn vị AIS điều phối: một từ × một Stage tính điểm (2, 3, 5, 6), hoặc một chữ Kanji đang ở giai đoạn Học. |
| **Nhóm** | Ba nhóm của Learn: **Từ vựng Kana** (Stage 1–3), **Từ vựng Kanji** (Stage 4–6), **Kanji riêng lẻ**. Tiến độ, điều kiện mở, dạng bài và log của mỗi nhóm tách riêng. — CONFIRMED (yêu cầu V9) |
| **Câu đếm gap** | Câu `STAGE_QUESTION` hoặc `KANJI_PRACTICE` đã trả lời trong Learn hôm nay. Câu `MICRO_PRACTICE`, vòng boss và Review không phải câu đếm gap. — PROPOSED |
| **Mốc gần nhất của một từ** | Lần gần nhất từ đó xuất hiện trong **bất kỳ** câu Learn nào hôm nay, kể cả `MICRO_PRACTICE`. — PROPOSED |
| **Gap** | Số câu đếm gap đã trả lời **sau** mốc gần nhất của cùng từ (hoặc cùng chữ), trong cùng ngày học, tính xuyên qua các bài. — PROPOSED, thay định nghĩa V8 |
| **Kết quả chấm** | `correct`, `hint`, `wrong`. Server chấm. — CONFIRMED |

**Vì sao gap tính như vậy:** câu `MICRO_PRACTICE` hỏi ngay sau thẻ giới thiệu, nên người học trả lời bằng trí nhớ vài giây. Nếu câu này không đặt lại mốc, câu Stage kế tiếp của cùng từ có thể được cộng điểm dù chỉ cách 1 câu. Nếu câu này được đếm vào gap, người học có thể "lấp" khoảng cách bằng câu dễ. Quy tắc trên chặn cả hai trường hợp, giữ đúng tinh thần R3.

## 3. R1 — Luồng 6 Stage — CONFIRMED (yêu cầu V9, 2026-11-10)

| Nhánh | Stage | Nội dung | Loại |
| --- | --- | --- | --- |
| A — Từ vựng Kana (mọi từ) | 1 | Giới thiệu Kana, nghĩa, phát âm, chú thích "Hán Việt: …" | Xem |
| | 2 | Ghi nhớ Kana và nghĩa (dạng bài Stage 2 hiện có) | Tính điểm |
| | 3 | Củng cố S1 Nghĩa và S2 Kana (dạng bài Stage 5 của v2) | Tính điểm |
| B — Từ vựng Kanji (khi chính sách yêu cầu) | 4 | Giới thiệu dạng Kanji, Hán Việt, chữ thành phần, cách đọc On/Kun trong từ | Xem |
| | 5 | Nhận diện và ghi nhớ từ viết bằng Kanji (dạng bài Stage 4 của v2) | Tính điểm |
| | 6 | Củng cố S3 Kanji và S4 Hán Việt | Tính điểm |

- Hán Việt là kỹ năng bắt buộc của nhánh B. — CONFIRMED
- Một từ có thể chạy nhiều stage cùng lúc; stage đã mở không đóng lại. — CONFIRMED (V8)
- Từ chưa cần học Kanji kết thúc vòng học ban đầu ở Stage 3; Card đã tạo vẫn ôn theo FSRS. — CONFIRMED
- Từ Kana-only chỉ có nhánh A. — CONFIRMED

Ánh xạ từ v2: Stage 5 → 3, Stage 3 (thẻ Kanji) → 4, Stage 4 → 5, Stage 6 giữ. Từ V8 trên prod: không chuyển, xóa tiến độ từ vựng. — CONFIRMED (2026-11-10)

## 4. R2 — Loại câu và hiệu ứng — PROPOSED

| Loại câu | Tính vào số câu của bài | Tính vào ngân sách Learn/ngày | Là câu đếm gap | Đổi điểm Stage | Đổi lịch |
| --- | --- | --- | --- | --- | --- |
| `INTRODUCTION` (thẻ giới thiệu) | Không | Không | Không, nhưng không đặt mốc | Không | Tạo lịch Stage kế tiếp khi xem xong |
| `MICRO_PRACTICE` | Có (CONFIRMED 2026-11-10) | **Không** (CONFIRMED 2026-11-10) | Không, nhưng **đặt mốc** | Không | Không |
| `STAGE_QUESTION` | Có | Có | Có | Có, theo R3 | Lịch Stage của chính mục đó |
| `KANJI_PRACTICE` (câu giai đoạn Học Kanji, dạng A, B, E) | Có | Có, và tính vào trần phụ Kanji | Có | Điểm Học Kanji (R10) | Lịch Học của chữ |
| Bài Kanji hỗ trợ (dạng C, F, G) | Có | Có, và tính vào trần phụ Kanji | Không | Không | Không |
| Vòng boss Speed Matching | Không | Không | Không | Không | Không |
| Câu Review | — | Không (tính vào trần Review) | Không | Không | Lịch Card của chính Card đó |

- Mỗi lần trả lời đổi **nhiều nhất một** lịch nhớ. Server từ chối nếu một câu được gắn với hai lịch. — CONFIRMED (yêu cầu V9)
- Kết quả → rating của lịch: `wrong` = Again, `hint` = Hard, `correct` = Good. Không có Easy ở mọi lịch. — CONFIRMED (v2)
- Câu tự chấm (viết rồi tự chấm): "Nhớ" = Good, "Quên" = Again. — CONFIRMED (v2)

## 5. R3 — Điểm Stage có được tính không

Áp cho `STAGE_QUESTION`. Giữ nguyên V8, chỉ đổi định nghĩa gap (§2):

1. Gap < 4 (và từ đã có mốc hôm nay) → 0 điểm, ghi log `counted = false`.
2. `wrong` → −2, không có trần cho điểm trừ.
3. `hint` → 0.
4. `correct` → +1 nếu số lần được +1 hôm nay của từ ở stage này < 3; ngược lại 0.

Cooldown của AIS (R11) là chuyện **khi nào hỏi**; R3 là chuyện **có cộng điểm không**. AIS cố tránh xếp câu Stage khi gap < 4, nhưng nếu buộc phải xếp, R3 vẫn quyết định điểm. — PROPOSED

## 6. R4 — Mở và hoàn tất Stage — CONFIRMED (giữ số điểm V8/v2)

| Stage | Mở tiếp | Hoàn tất |
| --- | --- | --- |
| 1 | Xem xong | Xem xong |
| 2 | 6 điểm và đủ 3 dạng bắt buộc → mở Stage 3 | 10 điểm |
| 3 | — | 10 điểm, đủ S1 và S2 |
| 4 | Xem xong → mở Stage 5 | Xem xong |
| 5 | 10 điểm và đủ dạng bắt buộc → mở Stage 6 | 15 điểm |
| 6 | — | 10 điểm, đủ S3 và S4 |

- Hoàn tất cần thêm 3 câu `STAGE_QUESTION` gần nhất của stage đúng liên tiếp. Câu `MICRO_PRACTICE` không nối và không làm mất chuỗi. — CONFIRMED (V4), phần `MICRO_PRACTICE` PROPOSED
- Tối đa +3 điểm mỗi stage mỗi ngày. — CONFIRMED
- **Stage 4 mở khi:** Stage 3 đã hoàn tất **và** chính sách Kanji của từ cho phép ở cấp hiện tại của người học (§6a). **Không** cần học xong chữ thành phần. — CONFIRMED (2026-11-10)
- Sai 3 câu liên tiếp ở một stage: hiện lại thẻ giới thiệu. — CONFIRMED (V4)

### 6a. Chính sách Kanji của từ

| Nhãn | Ý nghĩa | Stage 4 mở khi |
| --- | --- | --- |
| `KANA_ONLY` | Từ không có dạng Kanji cần học | Không bao giờ |
| `KANJI_CORE` | Học dạng Kanji ở cấp `kanji_target_level` | Cấp Từ vựng Kanji của người học đã mở tới `kanji_target_level` |
| `KANJI_DEFERRED` | Có dạng Kanji, học ở cấp sau | Như `KANJI_CORE`, với `kanji_target_level` là cấp sau |
| `KANJI_OPTIONAL` | Có dạng Kanji, không bắt buộc ở N5–N4 | Không tự mở. Người học tự bật bằng nút "Học dạng Kanji" ở trang chi tiết từ. — CONFIRMED (2026-11-10) |

- Script đề xuất nhãn (CONFIRMED 2026-11-10, phần luật cụ thể PROPOSED):
  - Từ không có Kanji → `KANA_ONLY`.
  - Mọi chữ của từ thuộc cấp của từ hoặc dễ hơn → `KANJI_CORE`, cùng cấp.
  - Có chữ thuộc cấp khó hơn → `KANJI_DEFERRED`, cấp đích = cấp của chữ khó nhất, kể cả N3–N1. — CONFIRMED (2026-11-10)
  - Không có trong JMdict (thường là cụm câu như お名前は) → `KANJI_CORE` ở cấp của cụm. — CONFIRMED (2026-11-10)
  - JMdict ghi "thường viết bằng Kana" (`uk`) **không** còn đưa từ vào `KANJI_OPTIONAL`; chỉ hạ độ tin cậy để người duyệt xem. Từ có Kanji đều phải học dạng Kanji. `KANJI_OPTIONAL` chỉ còn khi người duyệt tự gắn. — CONFIRMED (2026-11-10)
  - Cấp chữ: chữ N5 trong file gốc giữ nguyên; chữ khác theo danh sách Jonathan Waller (`pnpm policy:levels`, nguồn kanji-data); Waller thiếu cấp thì giữ cấp cũ. — CONFIRMED (2026-11-10)
  - Mỗi đề xuất ghi nguồn, lý do và độ tin cậy (`high`, `medium`, `low`).
- Chủ dự án duyệt. Nhãn đã duyệt có cờ `locked`; chạy lại script không ghi đè, chỉ báo chỗ lệch. — CONFIRMED
- Người học lên cấp N4: từ đã xong Stage 3 ở N5 mở thêm Stage 4–6, không mất tiến độ Stage 1–3. — CONFIRMED (yêu cầu V9)
- **Không** coi mọi từ chứa Kanji N5 là bắt buộc ở N5; luật `uk` và độ tin cậy `low` đưa từ vào danh sách cần duyệt. — CONFIRMED (yêu cầu V9)

## 7. R5 — Tạo Card

| Vừa hoàn tất | Tạo Card | Dạng bài khi ôn |
| --- | --- | --- |
| Stage 3 | `vocab.kana` | Nghĩa → gõ Kana |
| Stage 6 | `vocab.kanji` | Luân phiên: nhìn Kanji → gõ Kana và Hán Việt (sai một ô là sai câu); nhìn nghĩa → viết rồi tự chấm |
| Giai đoạn Học Kanji riêng lẻ | `kanji.meaning` | Kanji → nghĩa (lật thẻ, tự chấm); nghĩa → chọn Kanji trong 6 |
| Giai đoạn Học Kanji riêng lẻ | `kanji.hanviet` | Kanji → gõ Hán Việt; Hán Việt → chọn Kanji trong 6 |
| (dấu sao) | `vocab.star_recall` | Giữ như v2 |

- Card Kana tạo ở Stage 3, không ở Stage 2, để Stage 3 và Review không cùng luyện S1/S2 một lúc. — CONFIRMED (2026-11-10)
- Kanji → Kana được kiểm tra trong `vocab.kanji`; Hán Việt bắt buộc nằm trong `vocab.kanji` và `kanji.hanviet`. — CONFIRMED
- Kanji riêng lẻ tách 2 Card, nên sai Hán Việt không làm hỏng lịch của mặt chữ–nghĩa. Hai Card này ôn trong khu Kanji, không vào tab Review. Viết là bài luyện không có lịch; nét viết chỉ có hoạt hình để xem. — CONFIRMED (2026-11-10)
- **Ngoại lệ:** câu "chọn Kanji trong 6" của 2 Card Kanji riêng lẻ là câu trắc nghiệm duy nhất trong phần ôn dài hạn, vì nhận mặt chữ từ nghĩa hoặc Hán Việt mà không chọn thì chỉ còn cách viết. — CONFIRMED (2026-11-10)
- Card mới đến hạn lần đầu lúc 00:00 ngày học hôm sau; tạo Card idempotent (một Card mỗi loại mỗi từ hoặc chữ). — CONFIRMED
- Card `vocab.kana` đã tạo ở Stage 2 trên dev (theo v2) được giữ nguyên lịch và log; không tạo thêm Card khi từ đó xong Stage 3. — PROPOSED

## 8. R6 — Vòng đời Card

| Trạng thái | Nghĩa | Vào Review | Đổi khi |
| --- | --- | --- | --- |
| `active` | Đang ôn | Có, khi đến hạn | — |
| `suspended` | Từ bị loại khỏi lộ trình (R8), hoặc Card sao khi bỏ sao | Không | Khôi phục từ hoặc đánh sao lại |
| `archived` | Người học bấm "Đã học xong" cho riêng Card này (R13) | Không | Người học khôi phục |
| `retired` | Card V8 bị bỏ theo điểm. V9 không tạo trạng thái này | Không | Không còn đường nào; chỉ để đọc lịch sử |

- Không có điểm Card, không bỏ Card theo điểm, không gộp Card. — CONFIRMED (v2)
- Một Card có thể vừa `suspended` vừa `archived`; Card chỉ vào Review khi không có trạng thái nào. — PROPOSED

## 9. R7 — Learn chung, Review tách riêng

### 9.1 Bài Learn — CONFIRMED (yêu cầu V9), chi tiết PROPOSED

- Một khu Learn, một nút bắt đầu bài. Bài gồm câu của cả 3 nhóm do AIS (R11) xếp. Người học có thể chọn chỉ một nhóm. Bỏ nút Học hỗn hợp cụm 5 câu của v2. — CONFIRMED (2026-11-10)
- Số câu mỗi bài mặc định **50**, người học chọn 20–100. Chỉ tính câu có trả lời (§4), không tính thẻ giới thiệu.
- Một ngày làm được nhiều bài.

### 9.2 Ngân sách mỗi ngày — CONFIRMED (2026-11-10)

- `learn_cap` = 200 câu/ngày, đếm câu Learn đã trả lời hôm nay ở cả 3 nhóm, trừ câu `MICRO_PRACTICE` (CONFIRMED 2026-11-10), lấy từ log (không lấy từ bộ đếm của bài). Mở bài mới không đặt lại bộ đếm.
- `kanji_cap` = trần phụ cho câu Kanji riêng lẻ, mặc định 100, vẫn nằm trong `learn_cap`.
- `stage_cap` và `word_kanji_cap` của v2 bị thay bằng `learn_cap`. — PROPOSED
- Bắt đầu bài: số câu = `min(số chọn, learn_cap − đã trả lời hôm nay)`. Còn 0 thì không mở bài.
- Từ mới và chữ mới chỉ chụp quota một lần mỗi ngày vào `learner_daily_plans`; bài sau không lấy lại quota đã dùng.
- **Chặn từ mới** khi Card đến hạn đầu ngày ≥ `unlock_threshold` (đếm cả Card Kanji riêng lẻ) hoặc câu Stage đến hẹn đầu ngày ≥ `learn_cap`. Card Kanji riêng lẻ đến hạn cũng được đếm. — CONFIRMED (2026-11-10)
- Câu chưa làm chuyển sang hôm sau, không phạt. — CONFIRMED

### 9.3 Không đủ câu hợp lệ — PROPOSED

Bài kết thúc sớm khi AIS không còn câu hợp lệ (§14.5). Màn kết thúc ghi "Đã hết câu cho hôm nay: 37/50" và lý do (đã hết câu đến hẹn, đã dùng hết từ mới, chạm ngân sách). Không tạo câu lặp để lấp đủ số.

### 9.4 Review tách riêng — CONFIRMED (2026-11-10, thay "Review chung" của yêu cầu V9)

Chỉ Learn mới gộp 3 nhóm. Phần ôn dài hạn tách riêng từng loại, không có nút trộn:

| Loại | Ở đâu | Card | Trần mặc định (PROPOSED) |
| --- | --- | --- | --- |
| Từ vựng Kana | Tab Review, mục 1 | `vocab.kana`, rồi `vocab.star_recall` | 120 |
| Từ vựng Kanji | Tab Review, mục 2 | `vocab.kanji` | 60 |
| Kanji riêng lẻ | Khu Kanji trong Learn | `kanji.meaning`, `kanji.hanviet` | 60 |

- Mỗi loại có trần riêng trong Settings, đếm số Card khác nhau đã ôn hôm nay của loại đó; loại này dồn không chiếm chỗ loại kia. — CONFIRMED (2026-11-10)
- Trong mỗi loại: quá hạn lâu nhất trước; Card Again quay lại trong ngày không tính thêm vào trần. Giữ R7 V8 bước 9.
- Câu ôn dài hạn của Kanji riêng lẻ không tính vào ngân sách Learn 200 câu (đó là câu Review của khu Kanji).
- Card cũ không bị tạo lại khi đổi giao diện.

## 10. R8 — Loại và khôi phục từ

Giữ nguyên V8: loại từ thì Card của từ `suspended`, giữ Stage và điểm; khôi phục thì chạy tiếp. `archived` (R13) là thao tác trên **một Card**, không thay R8. — CONFIRMED

## 11. R9 — Lịch của Stage

Mỗi từ × Stage 2, 3, 5, 6 có một lịch `ts-fsrs`, tối đa 2 ngày, không Easy, bộ tính lịch tự chặn ở bước chuyển Learning → Review. Lịch tạo khi stage mở, dừng khi hoàn tất. — CONFIRMED (V8, đổi số stage)

## 12. R10 — Kanji riêng lẻ

- Thứ tự chữ mới, cấp, thẻ "đã biết", quá tải: giữ §18.6. — CONFIRMED
- Thẻ giới thiệu: mặt chữ, nghĩa, Hán Việt, bộ thủ, thành phần và vị trí, hoạt hình thứ tự nét, từ liên quan (R12). **Không có mẹo ghi nhớ.** — CONFIRMED (2026-11-10)
- Cấp N5/N4… của chữ lấy theo danh sách JLPT của Jonathan Waller (tanos.co.uk) sau khi xác minh điều kiện sử dụng, thay cấp JLPT cũ trước 2010 của KANJIDIC2. Đây là danh sách bên thứ ba, không phải danh sách chính thức. Đổi cấp sẽ đổi thứ tự học (`study_order`). — CONFIRMED (2026-11-10)
- **Giai đoạn Học:** 12 câu trong 4 buổi (ngày 1, 2, 3, 5), mỗi buổi 3 câu, đúng +1 (tối đa +3/ngày), gợi ý 0, sai −2, không dưới 0. — CONFIRMED (giữ)
- **Hoàn tất Học:** 12 điểm; mỗi hướng (Kanji → nghĩa, nghĩa → Kanji, Kanji → Hán Việt, Hán Việt → Kanji) đúng ít nhất 2 lần, trong đó gõ Hán Việt ít nhất 1 lần; 3 câu gần nhất đúng. — Bỏ On/Kun bắt buộc: CONFIRMED (2026-11-10); số lần mỗi hướng: PROPOSED
- Câu On/Kun vẫn có thể xuất hiện, tính điểm nhưng không thuộc điều kiện hoàn tất. — CONFIRMED (2026-11-10)
- Hoàn tất Học thì tạo `kanji.meaning` và `kanji.hanviet`, chép trạng thái lịch hiện tại sang cả hai; hai Card ôn ngay trong khu Kanji, thay lịch ôn dài hạn duy nhất của v2. — CONFIRMED (2026-11-10: ôn trong khu Kanji); cách chép lịch: PROPOSED
- Khi Stage 4–6 giải thích cách đọc của từ, chỉ hiện ánh xạ On/Kun từng chữ khi dữ liệu có sẵn ánh xạ đó (ví dụ từ JMdict furigana). Không tự suy cách đọc của từ từ âm từng chữ. — CONFIRMED (yêu cầu V9)

## 13. R12 — Kanji Visual Learning — CONFIRMED (danh sách dạng bài), chi tiết PROPOSED

| Dạng | Bài | Loại câu | Điều kiện tạo |
| --- | --- | --- | --- |
| A | Kanji → nghĩa; nghĩa → chọn Kanji | `KANJI_PRACTICE` | Luôn có |
| B | Kanji → chọn hoặc gõ Hán Việt | `KANJI_PRACTICE` | Luôn có |
| C | Ghép thành phần theo vị trí (亻 + 木 → 休) | Hỗ trợ | Chỉ khi dữ liệu cấu tạo được duyệt |
| E | Phân biệt chữ gần giống (日 / 目), có giải thích sau câu | `KANJI_PRACTICE` (tính vào hướng nghĩa → Kanji) | Cặp do script đề xuất (thành phần và số nét giống nhau, từ KanjiVG), lời giải thích soạn sẵn; chỉ cặp chủ dự án duyệt mới được hỏi — CONFIRMED (2026-11-10) |
| F | Ghép cặp Kanji ↔ nghĩa hoặc Hán Việt | Hỗ trợ | Ít nhất 4 chữ đã giới thiệu |
| G | Xem hoạt hình thứ tự nét, tự viết ra giấy | Không phải câu hỏi: không chấm, không tính vào số câu | Có dữ liệu nét KanjiVG — CONFIRMED (2026-11-10) |

- **Không** làm dạng D (điền thành phần còn thiếu). — CONFIRMED
- Chấm Hán Việt khi gõ: bỏ khác biệt hoa/thường và khoảng trắng; dấu tiếng Việt phải đúng, nhưng chấp nhận cả hai kiểu đặt dấu (hoà/hòa). — PROPOSED
- Không chấm nét viết: app không nhận dạng chữ viết tay, dạng G chỉ để xem. — CONFIRMED (2026-11-10)
- Phân biệt các loại thông tin: **bộ thủ** (bộ thủ chính thức theo từ điển, từ KANJIDIC2), **thành phần** (các phần cấu tạo, từ KanjiVG), **mẹo ghi nhớ** (không làm ở V9 — CONFIRMED 2026-11-10), **nguồn gốc chữ** (chỉ hiện khi có nguồn đáng tin; hiện chưa có nên ẩn). — CONFIRMED (yêu cầu V9)
- Dữ liệu do AI đề xuất (hiện chỉ có lời giải thích cho cặp chữ gần giống) có trạng thái `pending` tới khi được duyệt; chỉ dữ liệu `approved` hiện cho người học; chạy lại không ghi đè dữ liệu đã duyệt. AI không được tạo dữ liệu cấu tạo chữ. — CONFIRMED (yêu cầu V9)

## 14. R11 — Adaptive Interleaving Scheduler (AIS) — PROPOSED

AIS chỉ quyết định **thứ tự câu** trong bài Learn. Không thay lịch Stage, lịch Học Kanji hay FSRS.

### 14.1 Dữ liệu

- **Ứng viên:** mỗi mục học có câu hôm nay: mục đến hẹn theo lịch, mục mới, mục đang ở thang ngắn hạn.
- **Thang ngắn hạn** của một mục vừa giới thiệu: `step` (0 → 3) và `readyAt` (số thứ tự câu đếm gap sớm nhất được hỏi lại).
- **Trạng thái bài** (`learn_lessons.ais_state`, JSON): danh sách thang ngắn hạn, 2 dạng bài gần nhất, số câu theo nhóm, seed ngẫu nhiên, câu đang chờ trả lời.

### 14.2 Luồng của một mục mới

Giới thiệu → `MICRO_PRACTICE` ngay → xen 4–6 câu đếm gap → `STAGE_QUESTION` (gọi lại lần 1) → xen 8–12 câu → `STAGE_QUESTION` (gọi lại lần 2) → rời thang, theo lịch Stage.

- **Sai** ở bất kỳ bước nào: hiện giải thích, xếp một `MICRO_PRACTICE` sau 2 câu, rồi quay lại bước gọi lại lần 1 (xen 4–6).
- Một mục mới có tối đa 6 câu trong một bài (`maxPerItemPerLesson`), kể cả câu `MICRO_PRACTICE`.
- Mục đến hẹn theo lịch (không mới) không đi thang; chỉ cần gap ≥ 4 để được xếp.

### 14.3 Chọn câu tiếp theo

1. **Lọc cứng:** bỏ mục chưa tới `readyAt`; bỏ mục có gap < 4 (trừ `MICRO_PRACTICE` của thang); bỏ dạng bài trùng câu ngay trước; bỏ mục đã chạm `maxPerItemPerLesson`; bỏ nhóm đã chạm trần phụ.
2. **Chọn nhóm:** nhóm có thiếu hụt lớn nhất, với thiếu hụt = tỷ lệ mục tiêu × số câu đã trả lời − số câu của nhóm. Tỷ lệ mục tiêu tỷ lệ với số việc còn lại của nhóm lúc mở bài, mỗi nhóm có việc được ít nhất 15%.
3. **Chấm ưu tiên** trong nhóm: thang ngắn hạn tới hạn +100; số ngày quá hẹn × 10 (tối đa 100); đến hẹn hôm nay +1.
4. **Chọn có trọng số** trong 3 ứng viên cao nhất, xác suất tỷ lệ với điểm, dùng seed của bài (test lặp lại được).
5. **Giới thiệu mục mới** khi đủ cả 4 điều kiện: còn quota từ mới hoặc chữ mới; ít hơn 2 mục đang ở thang ngắn hạn; đã qua ít nhất 5 câu từ lần giới thiệu trước; nếu còn mục cũ đến hẹn thì mục cũ chiếm ít nhất 40% số câu đã trả lời trong bài.

### 14.4 Lưu và tiếp tục

- Bài đang dở được lưu theo ngày; mở lại thì hiện đúng câu đang chờ, không xếp lại.
- Mỗi câu trả lời có `client_event_id` duy nhất; gửi lại không tạo log và không tăng bộ đếm.
- Sang ngày mới, bài cũ chuyển `abandoned`; mục trong thang ngắn hạn trở về lịch Stage.

### 14.5 Khi hết câu hợp lệ

1. Nới luật "không trùng dạng liền nhau" trước.
2. Vẫn không có câu thì kết thúc bài sớm (§9.3). Không xếp câu có gap < 4 chỉ để đủ số.

### 14.6 Kiểm thử

Giả lập người học (đúng 90%, sai ngẫu nhiên theo seed) chạy bài 20, 50, 100 câu; nhiều bài trong một ngày; thoát giữa chừng rồi vào lại; hết câu hợp lệ. Kiểm tra: không vượt `learn_cap` và `kanji_cap`; không có câu Stage nào được cộng điểm khi gap < 4; mỗi mục mới có `MICRO_PRACTICE` ngay sau giới thiệu và gọi lại trong 4–6 câu; không 2 câu liền cùng dạng (trừ khi đã nới); mục cũ không bị bỏ đói.

## 15. R13 — Card Archive — CONFIRMED (yêu cầu V9), chi tiết PROPOSED

- Nút **Đã học xong** trên mỗi Card trong Review, có Undo. Chỉ lưu trữ Card đó: không lưu trữ cả từ, không đổi Card khác, không đổi Kanji thành phần, không xóa dữ liệu.
- Card `archived` không vào Review và hàng đợi FSRS; Learn và Practice vẫn dùng được từ đó. Practice không đổi FSRS nên không thể mở lại Card.
- Lưu trữ ghi một sự kiện `archive` kèm ảnh chụp trạng thái FSRS lúc đó.
- **Kho lưu trữ:** tên từ hoặc chữ, loại Card, thời gian lưu trữ, trạng thái FSRS trước khi lưu trữ, nút khôi phục; tìm kiếm và lọc theo loại Card.
- **Khôi phục — Giữ tiến độ (mặc định):** bỏ `archived`, giữ lịch sử, stability, difficulty, `due_at`. Card quá hạn thì vào Review như Card quá hạn bình thường.
- **Khôi phục — Học lại từ đầu:** có xác nhận. Đặt riêng Card đó về `New`, đến hạn ngay; giữ log; không đổi Stage hay Card khác; ghi sự kiện `restore_reset` kèm trạng thái trước khi đặt lại.
- **Học lại Card** (đã có ở trang chi tiết từ) trên Card đang `archived`: khôi phục giữ tiến độ rồi cho đến hạn ngay.

## 16. Bảng dạng bài theo Stage (đánh số V9)

| Stage | Dạng bài (mã giữ như code hiện tại) |
| --- | --- |
| 2 | `kana_to_meaning`, `meaning_to_kana`, `kana_assembly`, `listening`, `hanviet_from_kana` (hỏi nhẹ 15%) |
| 3 | `meaning_assembly`, `meaning_recognition_6`, `kana_free_recall` |
| 5 | `hanviet_from_kana`, `kanji_char_meaning`, `listening_kanji`, `kanji_recognition`, `kanji_assembly`, `hanviet_recognition`, `hanviet_assembly` |
| 6 | `kanji_assembly_nohint`, `kanji_recognition_6`, `hanviet_free_recall`, `hanviet_recognition`, `hanviet_assembly` |

Dạng bắt buộc để mở stage sau: Stage 2 như v2; Stage 5 như Stage 4 của v2.

## 17. Config `RULES_V9`

```ts
export const RULES_V9 = {
  version: 9,
  timezone: 'Asia/Ho_Chi_Minh',
  stagePoints: { correct: 1, hint: 0, wrong: -2, maxPositivePerStagePerDay: 3 },
  completion: { correctStreak: 3 },
  relearnAfterWrong: 3,
  stageThresholds: {
    2: { unlockNextAt: 6, completeAt: 10 },
    3: { completeAt: 10 },
    5: { unlockNextAt: 10, completeAt: 15 },
    6: { completeAt: 10 },
  },
  requiredSkills: { 3: ['S1', 'S2'], 6: ['S3', 'S4'] },
  stageSchedule: { maximumIntervalDays: 2 },
  reviewSchedule: { maximumIntervalDays: 90 },
  spacing: { minGap: 4 },
  lesson: { defaultQuestions: 50, minQuestions: 20, maxQuestions: 100 },
  ais: {
    immediateCheck: true,
    firstRecallGap: [4, 6],
    secondRecallGap: [8, 12],
    wrongRecheckAfter: 2,
    maxPerItemPerLesson: 6,
    maxItemsInLadder: 2,
    introduceEvery: 5,
    minDueShare: 0.4,
    minGroupShare: 0.15,
    topK: 3,
    priority: { ladderDue: 100, perOverdueDay: 10, maxOverdue: 100, dueToday: 1 },
  },
  kanji: {
    completeAt: 12, maxPositivePerDay: 3, wrong: -2, questionsPerSitting: 3,
    sittingGaps: [1, 1, 2], perDirectionCorrect: 2, typedHanVietCorrect: 1,
    overloadFrom: 10, learningShareOfCap: 0.7,
  },
  relearn: { pointsToComplete: 3 },
  defaults: {
    newPerDay: 5, learnCap: 200, kanjiCap: 100, kanjiNewPerDay: 10, unlockThreshold: 80,
    // Trần ôn riêng từng loại (số mặc định PROPOSED)
    reviewCaps: { vocabKana: 120, vocabKanji: 60, kanji: 60 },
  },
  bossRound: { everyQuestions: 25, minWordsToday: 6, seconds: 30 },
  borrow: { maxDaysAhead: 1 },
} as const
```

## 18. Ví dụ tính tay

### VD1 — Mục mới 学校 trong bài 50 câu (R11, R3)

Câu đếm gap đánh số `#n`; `m` là câu `MICRO_PRACTICE`.

| Thứ tự | Câu | Gap của 学校 | Điểm Stage 2 |
| --- | --- | --- | --- |
| — | Thẻ Stage 1 của 学校 | — | — |
| m | `kana_to_meaning` 学校, đúng | Đặt mốc | 0 (không tính) |
| #1–#4 | Câu của mục khác | — | — |
| #5 | `meaning_to_kana` 学校, đúng | 4 | +1 |
| #6–#14 | Câu khác (9 câu) | — | — |
| #15 | `kana_assembly` 学校, sai | 9 | −2; xếp `m` sau 2 câu |
| #16–#17 | Câu khác | — | — |
| m | `kana_to_meaning` 学校, đúng | Đặt mốc | 0 |
| #18–#21 | Câu khác | — | — |
| #22 | `kana_assembly` 学校, đúng | 4 | +1 |

### VD2 — Ngân sách qua nhiều bài (R7)

`learn_cap` 200, chỉ đếm câu không phải `MICRO_PRACTICE`. Bài 1 trả lời 50 câu, bài 2 trả lời 50, bài 3 thoát ở câu 30. Bài 4 mở tối đa `min(50, 200 − 130)` = 50 câu. Bài 5 mở tối đa 20 câu. Sau đó không mở được bài, dù mỗi bài có bộ đếm riêng.

### VD3 — Từ học Kana ở N5, thêm Kanji ở N4 (R4, §6a)

Từ X có nhãn `KANJI_DEFERRED`, cấp N4 (từ giả định, nhãn thật do script đề xuất và chủ dự án duyệt). Ở N5 người học xong Stage 3 → có `vocab.kana`, dừng. Khi người học mở cấp N4 cho Từ vựng Kanji, Stage 4 của X mở; điểm Stage 2, 3 và Card Kana giữ nguyên.

### VD4 — Lưu trữ và khôi phục (R13)

Card `vocab.kanji` của 学校 đang có stability 46, đến hạn 20/12. Người học bấm Đã học xong ngày 01/12: Card rời Review, Card `vocab.kana` của 学校 vẫn ôn. Ngày 25/12 khôi phục giữ tiến độ: Card quá hạn 5 ngày, vào Review hôm đó.

## 19. Câu hỏi đã chốt (2026-11-10)

| # | Câu hỏi | Đề xuất |
| --- | --- | --- |
| Q1 | Phần ôn Card Kanji riêng lẻ cho phép "chọn Kanji trong 6"? | **Chốt: có**, ngoại lệ duy nhất (§7) |
| Q2 | Câu `MICRO_PRACTICE` có tính vào ngân sách 200 câu? | **Chốt: không** (2026-11-10) |
| Q3 | `KANJI_OPTIONAL` có cho người học tự bật? | **Chốt: có**, nút ở trang chi tiết từ |
| Q4 | Card đến hạn của Kanji riêng lẻ có tính vào ngưỡng chặn từ mới? | **Chốt: có** |
| Q5 | Bài Learn có cho chọn chỉ một nhóm? | **Chốt: có** |
| Q6 | Giữ nút Học hỗn hợp cụm 5 câu của v2? | **Chốt: bỏ**, AIS thay thế |
| Q8 | Review gộp hay tách? | **Chốt: tách** — Từ vựng Kana, Từ vựng Kanji ở tab Review; Kanji ôn trong khu Kanji; trần riêng (2026-11-10) |
| Q9 | Mẹo ghi nhớ? | **Chốt: không làm** |
| Q10 | Tô nét? | **Chốt: chỉ xem hoạt hình**, không chấm |
| Q11 | Chữ gần giống? | **Chốt: script đề xuất, chủ dự án duyệt** |
| Q12 | Cấp chữ Kanji? | **Chốt: danh sách Jonathan Waller** |
| Q13 | JMdict để biết từ thường viết Kana? | **Chốt: dùng**, ghi nguồn EDRDG |
| Q7 | Câu `MICRO_PRACTICE` có tính vào số câu của bài? | **Chốt: có** |
