# PLAN-02 — Phạm vi MVP Projap (v2)

> Trạng thái: **Chủ dự án đã chốt các quyết định** (2026-10-31). Thay thế PLAN-01 (2026-10-14).
>
> Ngày: 2026-10-31
>
> Nguồn chuẩn: `docs/PROJECT_SPEC.md` **Design V7**. Tài liệu này tóm tắt phạm vi MVP và điều kiện nghiệm thu; chi tiết thiết kế xem các mục spec được dẫn. Khác biệt V6 → V7: spec §17.

## 1. Mục đích tài liệu

Định nghĩa **MVP v0.1 làm gì, không làm gì, và thế nào là xong**. Mọi task trong kế hoạch "Tasks v2" dịch từ tài liệu này sang code.

**MVP thành công khi:** một người học thật đăng nhập Google, học một từ mới qua đủ các Stage, từ đó sinh card, hôm sau card xuất hiện trong bài học để ôn, và tiến độ giống nhau trên PC và điện thoại.

## 2. Confirmed product requirements

1. Web app học **Vocabulary JLPT N5** cho người Việt; N4 làm sau.
2. **Nhiều người học**, đăng nhập **chỉ bằng Google**; mỗi người có tiến độ, lịch ôn, settings riêng.
3. Nội dung **cố định**, chỉ server seed; người học không import. Data N5 hoàn chỉnh đã có (kèm Hán Việt toàn từ, liên kết Kanji).
4. **Lộ trình từ mới cố định**; nội dung mỗi ngày tính động từ review + từ đang học dở + từ mới.
5. Một luồng hằng ngày **"Bài học hôm nay"**: review FSRS **bắt buộc**, chia thành các phiên ~5 phút, phải hoàn thành trong ngày.
6. Mỗi từ đi qua **5 Stage**; qua Stage bằng **điểm**; **card FSRS tạo theo từng Stage**.
7. Practice (Speed Matching) không đổi lịch FSRS nhưng **cộng điểm card**.
8. Tiến độ bền vững sau refresh và đồng bộ PC ↔ mobile.
9. Giữ visual language, Dark Theme, layout v0; **giữ copy tiếng Anh**.

## 3. Product principles

- **Học ít mỗi lần, nhớ chủ động:** phiên ~5 phút; điểm chỉ đến từ câu trả lời đúng không gợi ý, có giãn cách.
- **Một lối vào mỗi ngày:** người học không phải tự quyết hôm nay ôn hay học; hệ thống dựng sẵn.
- **Review trước tăng trưởng:** khi review dồn nhiều, hệ thống tự ngừng đưa từ mới (ngưỡng due).
- **Official review khác practice:** chỉ review đổi lịch FSRS; practice chỉ cộng điểm card.
- **Server là nguồn sự thật:** chấm điểm, rating và lịch FSRS tính trên server.
- **Giữ UI v0:** thay data source và callback ở boundary, không viết lại component.

## 4. P0 scope

### P0-1 — Giữ và nối UI v0

Giữ navigation, theme, typography, components; thay mock bằng dữ liệu thật; giữ copy tiếng Anh. *(Spec §11)*

### P0-2 — Tài khoản Google, nhiều người học, đồng bộ

- Supabase Auth với Google OAuth; lần đăng nhập đầu tạo settings mặc định.
- RLS: bảng nội dung chỉ SELECT; bảng tiến độ, log, settings theo `auth.uid() = user_id`.
- Service role key chỉ dùng cho seed, không bao giờ ở client. *(Spec §9.3, §10.7)*

### P0-3 — Nội dung và seed

- `pnpm seed`: validate toàn bộ file → dry-run báo cáo → upsert theo **ID ổn định**; báo lỗi theo dòng; idempotent.
- Sửa nội dung = sửa file seed rồi chạy lại; không làm mất tiến độ người học.
- Mỗi từ có: ID ổn định, `sort_order`, cách viết, kana, romaji (`gakkou`), `meaning_vi`, Hán Việt toàn từ, `is_kana_only`, `emoji` (tuỳ chọn), liên kết Kanji. *(Spec §3.9, §10.1)*

### P0-4 — Bài học hôm nay

| Bước | Nội dung |
| --- | --- |
| 1 | Card FSRS đến hạn, tối đa **trần review/ngày** |
| 2 | Từ đang học dở Stage |
| 3 | Từ mới theo lộ trình, theo quota, **chỉ khi số due đầu ngày < ngưỡng** |

- Chia thành các phiên ~5 phút; nghỉ giữa phiên được; phải hoàn thành trong ngày.
- Chế độ **xen kẽ** (mặc định) hoặc **review trước**.
- Không 2 câu liền nhau cùng dạng; cùng một từ cách ≥ 4 câu; vòng boss Speed Matching 30 giây khoảng mỗi 25 câu (khi đã có ≥ 6 từ).
- **Học thêm:** lấy từ tiếp theo, mượn quota ngày mai (tối đa 1 ngày), vẫn bị ngưỡng chặn; không kéo review sớm.
- Refresh / đổi thiết bị: giữ kết quả đã trả lời, tạo hàng câu hỏi mới. *(Spec §6)*

### P0-5 — Stage và điểm

| Stage | Nội dung | Qua stage | Card tạo ra |
| --- | --- | --- | --- |
| 1 | Giới thiệu kana, nghĩa, romaji | Xem xong | — |
| 2 | Kana ↔ nghĩa, ghép kana, câu nghe | 5 điểm; có điểm từ: Kana→Meaning, Meaning→Kana, ghép kana | nghĩa – hira |
| 3 | Giới thiệu Kanji, Hán Việt (lật thẻ) | Xem xong | hira – Hán Việt |
| 4 | Chọn/ghép Kanji, chọn/ghép Hán Việt | 5 điểm; có điểm từ cả 4 dạng | nghĩa – Kanji; Kanji – nghĩa/Hán Việt |
| 5 | Nhớ lại: gõ Kana; Hán Việt gõ + chọn/ghép; nghĩa ghép + chọn 1/6; Kanji ghép không gợi ý + chọn 1/6 | 5 điểm; mỗi Skill S1–S4 có điểm | nghĩa – Hán Việt |

- Điểm: đúng **+1**, đúng nhờ hint **0**, sai **−1**; tối đa **3 điểm/stage/ngày**; hai lần tính điểm của cùng một từ cách ≥ 4 câu từ khác.
- Từ chỉ có Kana: 1 → 2 → 5; Stage 5 chỉ yêu cầu S1, S2.
- Katakana giữ Katakana; okurigana ghép phần Kanji, Hán Việt tính phần Kanji.
- **Không gõ nghĩa tiếng Việt.** Gõ Romaji tự đổi Kana/Katakana (`wanakana`).
- Romaji chỉ hiện ở Stage 1–2. *(Spec §5)*

### P0-6 — FSRS review

- `ts-fsrs` ở lớp domain riêng.
- Review là **bài tập do máy chấm**: sai → Again; hint → Hard; đúng → Good; Easy = đúng, không hint, < 3 giây, **chỉ bài gõ/ghép**.
- **Điểm card:** Again −1, Hard 0, Good +1, Easy +2.
- **Card giàn giáo:** nghĩa–hira bỏ ở **30** điểm, hira–Hán Việt bỏ ở **40** điểm (từ chỉ có Kana giữ nghĩa–hira).
- Card cùng một từ đến hạn cùng ngày đều được hiện.
- Server chấm và lên lịch; submit trùng không áp dụng hai lần. *(Spec §7)*

### P0-7 — Practice

Speed Matching ở chế độ Luyện tập (60 giây) và vòng boss (30 giây). Ưu tiên từ còn card giàn giáo và từ yếu. Ghi practice log; cộng điểm card (−1 / 0 / +1); **không đổi `due`**. *(Spec §8)*

### P0-8 — Dashboard

Due hôm nay, từ đang dở, từ mới còn mở, tiến độ lộ trình (x/N từ); nút "Bắt đầu học hôm nay", "Luyện tập", "Danh sách từ". Người dùng mới thấy empty state, không thấy số mock.

### P0-9 — Settings (theo từng người học)

| Setting | Mặc định |
| --- | --- |
| Từ mới / ngày | 20 |
| Tối đa review / ngày | 120 |
| Ngưỡng due mở từ mới | 80 |
| Chế độ | Xen kẽ |

### P0-10 — Library

Danh sách từ theo lộ trình kèm tiến độ (Stage, card, điểm); tìm theo cách viết, kana, romaji, nghĩa; **loại từ khỏi lộ trình** (chưa học: bỏ qua; đã học: card tạm ngưng) và khôi phục. Không có lối "Học từ này" ngoài lộ trình.

### P0-11 — Trải nghiệm

Đổi dạng câu liên tục; câu nghe và nút loa (Web Speech API, đọc Kana, ẩn khi thiết bị không có giọng Nhật); thẻ "lên stage"; lật thẻ がっこう → 学校 ở Stage 3; emoji minh họa; màn "Xong hôm nay"; phản hồi đúng/sai bằng màu và đáp án.

### P0-12 — Chất lượng và phát hành

Typecheck và build pass khi tắt `ignoreBuildErrors`; unit test cho domain logic (điểm, stage, card, rating, hàng đợi); CI GitHub Actions (lint, typecheck, test) và `main` chỉ merge khi CI xanh; deploy Vercel + Supabase prod tách khỏi dev; không commit secret.

## 5. Sau MVP (P1)

Module Kanji độc lập; mini-game khác (Vocabulary Matching, Assembly games, Recall Challenge, Rapid Fire); backup/export; chia vòng 10 câu, hiệu ứng/rung khi đúng, bản đồ lộ trình, ảnh minh họa thật, streak, achievements; audio cloud TTS; progress charts nâng cao.

## 6. Out of scope cho MVP

N4–N1; Grammar, nghe hiểu, speaking; nhận dạng nét viết tay; gõ Kanji bằng IME; người học import dữ liệu; UI admin sửa nội dung; teacher/student; social, leaderboard; AI tutor; offline/PWA; native app; Light theme/redesign; microservices; gõ nghĩa tiếng Việt; học từ ngoài lộ trình.

## 7. Luồng học end-to-end

```text
Đăng nhập Google
  │
  v
Dashboard: due hôm nay · từ dở · từ mới · tiến độ lộ trình
  │
  v
"Bắt đầu học hôm nay" → dựng nội dung ngày (due ≤ 120 → từ dở → từ mới nếu due < 80)
  │
  v
Phiên ~5 phút (xen kẽ câu review + câu học, vòng boss)
  │        ├─ Câu review → chấm → rating → FSRS + điểm card → review log
  │        └─ Câu học    → chấm → điểm stage → qua stage → tạo card → attempt log
  v
Hết phiên → nghỉ / phiên tiếp ──> hết ngày → "Xong hôm nay" → (Học thêm)
  │
  v
Dữ liệu trên server → PC và mobile thấy cùng tiến độ
```

## 8. Acceptance criteria

### Tài khoản và bảo mật

- [ ] Hai tài khoản Google khác nhau đăng nhập được và không đọc/ghi được dữ liệu của nhau.
- [ ] Người chưa đăng nhập không đọc/ghi learner data; client không ghi được bảng nội dung.
- [ ] Không có service role key trong Git hoặc client bundle.

### Nội dung

- [ ] `pnpm seed` chạy 2 lần không tăng số record.
- [ ] Sửa một nghĩa trong file seed rồi chạy lại: DB cập nhật, tiến độ người học còn nguyên.

### Bài học hôm nay

- [ ] Nội dung ngày đúng thứ tự due → từ dở → từ mới; tôn trọng trần review, quota, ngưỡng và chế độ.
- [ ] Ví dụ (ngưỡng 80, trần 120): 50 due → 50 review + 20 từ mới; 100 due → 0 từ mới; 150 due → 120 review, 30 sang hôm sau.
- [ ] Nghỉ giữa các phiên không mất tiến độ trong ngày; refresh không chấm lại câu đã trả lời.
- [ ] Không có 2 câu liền nhau cùng dạng; cùng một từ cách ≥ 4 câu.
- [ ] "Học thêm" trừ đúng vào quota ngày mai, tối đa 1 ngày.

### Stage và điểm

- [ ] `学校` đi 1 → 2 → 3 → 4 → 5 và tạo đúng 5 loại card ở đúng stage.
- [ ] `テレビ` đi 1 → 2 → 5, chỉ có card nghĩa – hira và giữ nó.
- [ ] Đúng liên tiếp nhiều câu cùng một từ trong vài phút chỉ được +1; một stage không quá 3 điểm/ngày.
- [ ] Không qua stage khi còn yêu cầu bắt buộc chưa có điểm.
- [ ] Sai trừ điểm stage nhưng không làm lùi stage.

### FSRS và Practice

- [ ] Rating suy ra đúng từ kết quả chấm; bài trắc nghiệm không bao giờ ra Easy.
- [ ] Submit trùng không áp dụng hai lần; review log được append.
- [ ] Card giàn giáo bị bỏ đúng ở 30 / 40 điểm card.
- [ ] Practice và vòng boss không đổi `due` nhưng cộng điểm card.

### Library và Settings

- [ ] Tìm từ theo cách viết, kana, romaji, nghĩa.
- [ ] Loại từ chưa học → lộ trình bỏ qua; loại từ đã học → card không xuất hiện; khôi phục hoạt động.
- [ ] Settings giữ nguyên khi đổi thiết bị.

### UI và chất lượng

- [ ] Học trên PC, mở điện thoại thấy đúng tiến độ.
- [ ] Không overflow ngang ở 320–390 px; gõ Romaji ra Kana/Katakana trên bàn phím điện thoại.
- [ ] Nút loa đọc được hoặc tự ẩn khi thiết bị không có giọng Nhật.
- [ ] Không màn hình production nào import `lib/mock-data.ts`; CI xanh.

## 9. Quyết định còn mở

Chi tiết: `docs/PROJECT_SPEC.md` §14 (các dòng không có ✅).

- Công thức "từ yếu" / skill strength (OD-10).
- Kỹ thuật: atomic review bằng Postgres RPC hay transaction ở server (OD-16); test stack (OD-21); mức chấm trên server (OD-24); giữ hay bỏ Vercel Analytics (OD-25).
- Ưu tiên từ nào trong số từ đang học dở; số câu mỗi phiên ~5 phút.
- Furigana; tham số FSRS (desired retention) — MVP dùng mặc định.

## 10. Nhật ký quyết định (so với PLAN-01)

| PLAN-01 (14/10) | PLAN-02 (31/10) |
| --- | --- |
| Một learner profile | Nhiều người học, đăng nhập Google |
| Không lesson cố định, free learning | Lộ trình từ mới cố định; nội dung ngày động |
| Import CSV/JSON (P0-4) | Chỉ server seed; người học không import |
| Backup/restore (P0-9) | Sau MVP |
| Học và review tách rời | Gộp thành "Bài học hôm nay", review bắt buộc |
| Mastery rule chưa chốt | 5 điểm stage, giãn cách, tối đa 3 điểm/stage/ngày |
| Card taxonomy chưa chốt | 5 loại card, tạo theo stage, card giàn giáo bỏ theo điểm |
| Kanji học chung trong MVP | Module Kanji độc lập sau MVP |
| Practice ở P1 | Speed Matching ở P0 (cả vòng boss) |
| Không có phát âm | Web Speech API |
| Release 19/11 | Release mục tiêu 30/11 |
