# PROJECT_SPEC — Projap (Japanese Learning App)

> **Vai trò:** Single Source of Truth cho sản phẩm, learning system, kiến trúc và trạng thái dự án.
>
> **Phiên bản:** 1.0 — Learning System Design V6
>
> **Ngày:** 2026-10-16
>
> **Source đã kiểm tra:** repository `nihongo-app-design`, commit `afbd50d` (`chore: import original v0 UI`), branch hiện tại `docs/mvp-scope`.
>
> **Tài liệu liên quan:** `docs/ui-audit.md` (ARCH-02), `docs/mvp-scope.md` (PLAN-01), `docs/architecture.md` (ARCH-03), `docs/ux-flow-audit.md` (UX-01). Khi các tài liệu này mâu thuẫn với PROJECT_SPEC, **PROJECT_SPEC (Design V6) được ưu tiên** (xem §12.6).
>
> **Quan hệ tài liệu:** PROJECT_SPEC là bản tổng hợp cấp cao. Chi tiết kiến trúc (Auth/session, DAL, sequence diagram, ADR) nằm ở ARCH-03; chi tiết UX gap (`UXI-xx`, `FG-xx`) nằm ở UX-01. PROJECT_SPEC tham chiếu các mã này thay vì chép lại.
>
> **Ghi chú phiên bản learning flow:** ARCH-03 và UX-01 viết theo "Learning Flow V5". Tài liệu này dùng **Design V6** do chủ dự án cung cấp ngày 2026-10-16. Khác biệt V5→V6 được liệt kê ở §12.6.

## Cách đọc tài liệu

Mọi yêu cầu, thiết kế và trạng thái trong tài liệu được gắn một nhãn:

| Nhãn | Ý nghĩa | Được phép làm gì |
| --- | --- | --- |
| **CONFIRMED** | Chủ dự án đã chốt. | Dùng làm yêu cầu khi thiết kế/triển khai. Muốn đổi phải hỏi chủ dự án. |
| **PROPOSED** | Thiết kế đề xuất, hợp lý với các quyết định đã chốt nhưng chưa được duyệt. | Dùng làm điểm xuất phát cho thảo luận/ADR. **Không** triển khai như quyết định cuối khi chưa được duyệt. |
| **PENDING** | Chưa có quyết định; có thể có nhiều phương án. | Không tự chọn ngầm. Liệt kê trong §14 Open Decisions. |
| **IMPLEMENTED** | Đã xác minh trực tiếp trong source. | Mô tả đúng những gì code đang làm — kể cả khi chỉ là demo/mock. |

Bổ sung cho IMPLEMENTED:

- **IMPLEMENTED (UI demo)** — tương tác hoạt động trong browser nhưng dùng mock data hoặc React state; mất khi refresh.
- **IMPLEMENTED (placeholder)** — chỉ có card/route minh họa, chưa có chức năng.

---

## 1. Project Overview

### 1.1 Giới thiệu

Projap là web app học tiếng Nhật cá nhân, tập trung vào **Vocabulary** và **Kanji** trình độ JLPT. Ứng dụng kết hợp ba cách học độc lập: bài học ngắn hằng ngày (cảm hứng Duolingo), ôn tập theo lịch FSRS (cảm hứng Anki), và luyện tập tự do bằng mini-game.

Frontend hiện tại được tạo bằng v0 và là nền tảng UI sẽ được tái sử dụng. Repository nằm tại thư mục `nihongo-app-design`.

### 1.2 Mục tiêu — CONFIRMED

| # | Mục tiêu |
| --- | --- |
| G1 | Học Vocabulary và Kanji JLPT N5 trước, N4 sau. |
| G2 | Ghi nhớ dài hạn nhờ Active Recall và FSRS, không chỉ "xem qua". |
| G3 | Phiên học ngắn (~5 phút), có thể học thêm hoặc dừng bất cứ lúc nào. |
| G4 | Tiến độ được lưu bền vững và đồng bộ giữa desktop và mobile. |
| G5 | Import nội dung bằng CSV/JSON; backup/restore dữ liệu người học. |
| G6 | UI Dark Modern, Minimalist, Gamified; tái sử dụng frontend v0. |

### 1.3 Người dùng — CONFIRMED

- **Một người học duy nhất** (chính chủ dự án), người Việt, học qua tiếng Việt.
- Dùng trên PC và điện thoại, cần cùng một tiến độ.
- Có lợi thế Hán Việt: âm Hán Việt là một kênh ghi nhớ quan trọng cho từ chứa Kanji.

Không có multi-user, teacher/student hay admin portal trong MVP. Cách giới hạn ứng dụng public chỉ cho đúng một tài khoản là **PENDING** (§14).

### 1.4 Phạm vi N5 MVP — tóm tắt

- Nội dung: Vocabulary và Kanji N5; dataset ban đầu nhỏ và sạch (PROPOSED: ~30–50 từ, 10–20 Kanji — từ PLAN-01).
- Ba module: Daily Lessons, FSRS Review, Practice.
- Persistence + Auth + sync qua Supabase.
- Import CSV/JSON, backup/restore.
- Chi tiết P0/P1/Out of Scope: §13.

---

## 2. Product Vision & Learning Philosophy

### 2.1 Triết lý học

> Học ít mỗi lần, nhớ chủ động, tăng độ khó dần, trộn lẫn nội dung và để thuật toán quyết định thời điểm ôn.

Các nguyên tắc dưới đây đều **CONFIRMED** về định hướng; con số cụ thể (thời lượng, threshold) là cấu hình khởi đầu.

| Nguyên tắc | Ý nghĩa trong Projap |
| --- | --- |
| **Micro-learning** | Một Daily Lesson ~5 phút với mục tiêu rõ. Người học có thể học thêm phiên khác hoặc nghỉ; không có "phạt" khi dừng. |
| **Active Recall** | Bằng chứng ghi nhớ đến từ việc tự nhớ lại (chọn, ghép, gõ) chứ không phải đọc lại. Câu đúng nhờ hint hoặc sau khi xem đáp án **không** tính vào checkpoint. |
| **Progressive Learning** | Mỗi từ đi qua 5 Stage: giới thiệu → nhận diện → ghép → nhớ tự do. Kana/Meaning trước, Kanji/Hán Việt sau. |
| **Interleaving** | Learning Queue trộn nhiều từ, nhiều Skill, nhiều Exercise Type. Lượt đúng phải được xen kẽ, không lặp lại liên tiếp cùng một câu. |
| **FSRS** | Ôn tập dài hạn dùng thuật toán FSRS với 4 mức Again/Hard/Good/Easy. Chỉ Official Review mới thay đổi lịch FSRS. |
| **Không reset khi sai** | Sai một câu chỉ ảnh hưởng skill liên quan, không xóa tiến độ đã đạt. |
| **Checkpoint ≠ Mastery** | Đạt checkpoint nghĩa là đã có bằng chứng học ban đầu; trí nhớ dài hạn do FSRS theo dõi. Hoàn thành Stage 5 không đồng nghĩa với thành thạo. |

### 2.2 Ba module độc lập — CONFIRMED

| Module | Cảm hứng | Vai trò | Ảnh hưởng FSRS |
| --- | --- | --- | --- |
| Daily Lessons | Duolingo | Học từ mới và đưa từ qua 5 Stage | Không trực tiếp (có thể tạo card khi đủ điều kiện — PENDING) |
| FSRS Review | Anki | Ôn theo lịch, chấm Again/Hard/Good/Easy | **Có** — nguồn duy nhất cập nhật FSRS |
| Practice / Mini-games | Game luyện tập | Luyện tự do theo kỹ năng, lưu kết quả | Không |

- Không bắt buộc ôn FSRS trước khi học từ mới.
- Có thể ôn FSRS mà không mở Daily Lessons.

---

## 3. Functional Requirements

Ký hiệu cột "Hiện trạng" tham chiếu §12.

### 3.1 Dashboard

| ID | Yêu cầu | Nhãn | Hiện trạng |
| --- | --- | --- | --- |
| FR-DB-01 | Hiển thị số card FSRS đến hạn và lối vào Review. | CONFIRMED (module Review tồn tại) | UI demo, số mock |
| FR-DB-02 | Hiển thị Daily Lesson tiếp theo / tiến độ hôm nay và lối vào học. | CONFIRMED | UI demo |
| FR-DB-03 | Hiển thị tổng Vocabulary/Kanji đã học, từ yếu. | PROPOSED (PLAN-01) | UI demo, `strength` hard-code |
| FR-DB-04 | Lối vào Practice nhanh. | IMPLEMENTED (UI demo) | `quick-training.tsx` |
| FR-DB-05 | Streak, mục tiêu ngày. | PROPOSED | UI demo, số mock |
| FR-DB-06 | Người dùng mới (chưa có dữ liệu) thấy empty state, không thấy số mock. | PROPOSED | Chưa có |

### 3.2 Daily Lessons

| ID | Yêu cầu | Nhãn |
| --- | --- | --- |
| FR-DL-01 | Phiên học ~5 phút, mục tiêu rõ ràng, nhiều dạng bài tập. | CONFIRMED |
| FR-DL-02 | Sau khi hoàn thành một phiên, người học có thể học thêm phiên mới hoặc nghỉ. | CONFIRMED |
| FR-DL-03 | Mỗi Vocabulary có tiến độ Stage riêng; một bài không bắt buộc đưa từ qua đủ 5 Stage. | CONFIRMED |
| FR-DL-04 | Nội dung bài có thể được chọn động theo tiến độ. | CONFIRMED (có thể) — cơ chế PENDING |
| FR-DL-05 | Learning Path theo chủ đề. | PENDING |
| FR-DL-06 | Không bắt buộc ôn FSRS trước khi học mới. | CONFIRMED |
| FR-DL-07 | Tạm dừng và tiếp tục qua nhiều phiên mà không mất bằng chứng đã có. | CONFIRMED |
| FR-DL-08 | Học Kanji độc lập (module Kanji). | CONFIRMED tồn tại — flow PENDING |

Chi tiết: §5, §6.

### 3.3 Vocabulary

| ID | Yêu cầu | Nhãn |
| --- | --- | --- |
| FR-VO-01 | Mỗi từ có: cách viết (Kanji nếu có), Hiragana/Kana, Romaji, nghĩa tiếng Việt, Hán Việt toàn từ (nếu có Kanji), JLPT level. | CONFIRMED |
| FR-VO-02 | Bốn Skill S1 Meaning, S2 Kana, S3 Kanji, S4 Hán Việt. Romaji chỉ hỗ trợ phát âm. | CONFIRMED |
| FR-VO-03 | Từ chỉ có Kana không yêu cầu S3/S4 và bỏ qua Stage 3–4. | CONFIRMED |
| FR-VO-04 | Không bắt buộc học từng Kanji độc lập trước khi học từ chứa nó. | CONFIRMED |
| FR-VO-05 | Liên kết Vocabulary ↔ Kanji thành phần. | CONFIRMED (Kanji thuộc nhiều Vocabulary) |

### 3.4 Kanji

| ID | Yêu cầu | Nhãn |
| --- | --- | --- |
| FR-KJ-01 | Mỗi Kanji có character, meanings, Hán Việt, readings. | CONFIRMED |
| FR-KJ-02 | Một Kanji có thể thuộc nhiều Vocabulary. | CONFIRMED |
| FR-KJ-03 | Module học Kanji độc lập bên cạnh Vocabulary. | CONFIRMED |
| FR-KJ-04 | Kanji độc lập có thể có FSRS card riêng. | CONFIRMED (có thể) |
| FR-KJ-05 | Skill Taxonomy, Stage và checkpoint của Kanji độc lập. | PENDING |
| FR-KJ-06 | Lưu toàn bộ On/Kun hay chỉ readings cần thiết cho N5. | PENDING (PLAN-01 Q15) |
| FR-KJ-07 | Stroke count, components. | PROPOSED (source v0 đã có trường này trong mock) |

### 3.5 FSRS Review

| ID | Yêu cầu | Nhãn |
| --- | --- | --- |
| FR-RV-01 | Ôn Flashcard và Active Recall theo lịch FSRS. | CONFIRMED |
| FR-RV-02 | Bốn rating Again / Hard / Good / Easy. | CONFIRMED |
| FR-RV-03 | Chỉ Official Review cập nhật trạng thái FSRS. | CONFIRMED |
| FR-RV-04 | Có thể ôn độc lập, không cần Daily Lessons. | CONFIRMED |
| FR-RV-05 | Vocabulary có thể có nhiều card theo nhiều mục tiêu ghi nhớ. | CONFIRMED (nguyên tắc) |
| FR-RV-06 | Số lượng và loại card FSRS chính xác. | PENDING |
| FR-RV-07 | Lưu card state, due và review log append-only; chống submit trùng; server quyết định lịch. | PROPOSED (PLAN-01 P0-7) |

Chi tiết: §7.

### 3.6 Practice / Mini-games

| ID | Yêu cầu | Nhãn |
| --- | --- | --- |
| FR-PR-01 | Luyện tập tự do theo kỹ năng. | CONFIRMED |
| FR-PR-02 | Mini-games: Vocabulary Matching, Kana Assembly, Kanji Assembly, Hán Việt Assembly, Speed Matching, Recall Challenge. | CONFIRMED |
| FR-PR-03 | Lưu kết quả luyện tập. | CONFIRMED |
| FR-PR-04 | Không trực tiếp thay đổi lịch FSRS. | CONFIRMED |
| FR-PR-05 | Chỉ luyện từ đã học/đã unlock. | PROPOSED |
| FR-PR-06 | Kết quả Practice có ảnh hưởng weak-skill signal hay không. | PENDING |

Chi tiết: §8.

### 3.7 Library

| ID | Yêu cầu | Nhãn |
| --- | --- | --- |
| FR-LB-01 | Duyệt Vocabulary và Kanji theo tab. | IMPLEMENTED (UI demo) |
| FR-LB-02 | Tìm Vocabulary theo cách viết, kana, romaji, nghĩa; Kanji theo character, Hán Việt, nghĩa. | PROPOSED (PLAN-01); search mock hiện có |
| FR-LB-03 | Xem chi tiết từ: Kanji thành phần, Hán Việt, trạng thái Stage/Skill. | PROPOSED |
| FR-LB-04 | Đọc dữ liệu thật từ database. | PROPOSED (P0) |

### 3.8 Progress

| ID | Yêu cầu | Nhãn |
| --- | --- | --- |
| FR-PG-01 | Thống kê đã học, retention, hoạt động theo tuần. | IMPLEMENTED (UI demo, mock) |
| FR-PG-02 | Mọi số liệu tổng hợp truy vết được về attempts/reviews. | PROPOSED |
| FR-PG-03 | Hiển thị Stage của từng từ và trạng thái checkpoint từng Skill. | PROPOSED |
| FR-PG-04 | Achievements, chart nâng cao. | PROPOSED (P1) |

### 3.9 Import/Export

| ID | Yêu cầu | Nhãn |
| --- | --- | --- |
| FR-IE-01 | Import Vocabulary bằng CSV/JSON. | CONFIRMED |
| FR-IE-02 | Backup và restore dữ liệu người học. | CONFIRMED |
| FR-IE-03 | Validate → preview → ghi trong transaction; báo row lỗi. | PROPOSED (PLAN-01 P0-4) |
| FR-IE-04 | Backup có schema version + timestamp; restore validate toàn file trước khi đổi dữ liệu; không export secret. | PROPOSED (PLAN-01 P0-9) |
| FR-IE-05 | Import Kanji hàng loạt. | PENDING |
| FR-IE-06 | Duplicate policy, conflict policy, restore semantics (replace/merge). | PENDING |

### 3.10 Settings

| ID | Yêu cầu | Nhãn |
| --- | --- | --- |
| FR-ST-01 | Daily goal và các switch. | IMPLEMENTED (UI demo, chỉ React state) |
| FR-ST-02 | Settings được lưu và đồng bộ giữa thiết bị. | PROPOSED (P0) |
| FR-ST-03 | Tham số học: số từ mới/ngày, thời lượng phiên, giới hạn review/ngày. | PENDING (phụ thuộc Daily Session Planner) |
| FR-ST-04 | Hiển thị/ẩn Romaji, Furigana. | PENDING |

---

## 4. Complete Learning Architecture

### 4.1 Quan hệ giữa Daily Lessons, Review và Practice

```mermaid
flowchart LR
    subgraph Content["Content (master data)"]
        V[Vocabulary]
        K[Kanji]
        V <-- "vocabulary_kanji (N–N)" --> K
    end

    subgraph DL["A. Daily Lessons"]
        LQ[Learning Queue]
        ST[Stage 1–5 per Vocabulary]
        CP[Skill Checkpoints]
        LQ --> ST --> CP
    end

    subgraph RV["B. FSRS Review"]
        RC[Review Cards]
        FS[FSRS Scheduler]
        RL[Review Logs]
        RC --> FS --> RL
    end

    subgraph PR["C. Practice / Mini-games"]
        G[Games]
        PL[Practice Logs]
        G --> PL
    end

    Content --> LQ
    CP -- "card eligibility (PENDING)" --> RC
    Content --> G
    CP -. "chọn từ đã học (PROPOSED)" .-> G
    PL -. "weak-skill signal (PENDING)" .-> LQ
    PL -- "KHÔNG cập nhật FSRS" --x FS
```

- Ba module dùng chung content và identity người học, nhưng **mỗi module có loại event riêng**: `learning attempt`, `review log`, `practice log`. Không được gộp các event này làm một.
- Đường nối Daily Lessons → Review (khi nào tạo card) là **PENDING** (§7.3).

### 4.2 Phân biệt các khái niệm cốt lõi

| Khái niệm | Thuộc module | Định nghĩa | Phạm vi | Lưu bền vững? |
| --- | --- | --- | --- | --- |
| **Lesson** (Daily Lesson / Learning Session) | Daily Lessons | Một phiên học ~5 phút gồm nhiều câu hỏi từ Learning Queue. | Nhiều từ, nhiều Stage | Có (PROPOSED: `learning_sessions`) |
| **Stage** | Daily Lessons | Bước tiến trình của **một từ** (1–5). | Một Vocabulary | Có |
| **Skill** | Daily Lessons, Practice, Review | Năng lực cần nhớ của một từ: S1 Meaning, S2 Kana, S3 Kanji, S4 Hán Việt. | Một Vocabulary × một Skill | Có |
| **Exercise Type** | Daily Lessons, Practice | Dạng câu hỏi: Recognition, Assembly, Flashcard Active Recall, Free Recall… | Một câu hỏi | Thuộc tính của Attempt |
| **Attempt** | Daily Lessons | Một lần trả lời một câu: đúng/sai, có hint không, có xem đáp án không. | Một câu | Có, append-only |
| **Checkpoint** | Daily Lessons | Điều kiện bằng chứng để hoàn thành một Stage (hoặc yêu cầu Skill trong Stage). | Một Vocabulary × Stage (× Skill) | Có |
| **Review Card** | FSRS Review | Đơn vị FSRS lên lịch; mỗi card có state, due, stability, difficulty. | Một Vocabulary/Kanji × một mục tiêu ghi nhớ | Có |
| **Practice Log** | Practice | Kết quả một lượt chơi/câu trong mini-game. | Một game/câu | Có |

Quan hệ: một **Lesson** chứa nhiều **Attempt**; mỗi Attempt thuộc một Vocabulary, một **Skill**, một **Exercise Type**, ở một **Stage**; đủ Attempt hợp lệ → đạt **Checkpoint** → Vocabulary lên **Stage** tiếp; khi đủ điều kiện (PENDING) → sinh **Review Card**.

### 4.3 Trạng thái tách biệt — CONFIRMED

| Trạng thái | Câu hỏi nó trả lời | Thay đổi khi |
| --- | --- | --- |
| Checkpoint đã đạt | "Từ này đã từng chứng minh skill X đủ để qua Stage chưa?" | Đạt điều kiện; **không bị mất khi sai sau đó** |
| Sức mạnh kỹ năng hiện tại (skill strength) | "Hiện tại skill X của từ này mạnh/yếu thế nào?" | Mỗi Attempt (và có thể Practice — PENDING) |
| FSRS card state | "Khi nào cần ôn card này?" | Chỉ Official Review |

---

## 5. Vocabulary Learning Flow

### 5.1 Bốn Skill — CONFIRMED

| Skill | Tên | Mục tiêu ghi nhớ | Áp dụng cho |
| --- | --- | --- | --- |
| **S1** | Meaning | Nhớ nghĩa tiếng Việt. | Mọi từ |
| **S2** | Kana | Nhận diện và nhớ cách đọc Hiragana. | Mọi từ |
| **S3** | Kanji | Nhận diện và ghép cách viết Kanji **của từ**. | Từ có Kanji |
| **S4** | Hán Việt | Nhớ âm Hán Việt của **toàn bộ từ** (vd. HỌC HIỆU, không chỉ HỌC). | Từ có Kanji |

- **Romaji** chỉ là hỗ trợ phát âm, không phải Skill, không có checkpoint riêng.
- Romanization chuẩn (`gakkō` hay `gakkou`) và việc Free Recall Kana có chấp nhận nhập Romaji hay không: **PENDING** (§14, OD-12). Source v0 hiện dùng `gakkou` và chấp nhận Romaji trong Recall.

### 5.2 Năm Stage — CONFIRMED

```mermaid
stateDiagram-v2
    [*] --> S1_Introduction
    S1_Introduction --> S2_KanaLearning: xem & xác nhận
    S2_KanaLearning --> S3_KanjiHVIntro: checkpoint S2 đạt\n(từ có Kanji)
    S2_KanaLearning --> S5_RetrievalCheck: checkpoint S2 đạt\n(từ chỉ có Kana)
    S3_KanjiHVIntro --> S4_MixedLearning: xem & xác nhận
    S4_MixedLearning --> S5_RetrievalCheck: checkpoint S4 đạt
    S5_RetrievalCheck --> InitialLearningComplete: checkpoint S5 đạt
    InitialLearningComplete --> [*]
```

| Stage | Tên | Nội dung | Skill được luyện |
| --- | --- | --- | --- |
| 1 | Introduction | Giới thiệu Hiragana, Romaji, Meaning. | (giới thiệu S1, S2) |
| 2 | Kana Learning | Kana → Meaning, Meaning → Kana, Hiragana Assembly, Flashcard Active Recall. | S1, S2 |
| 3 | Kanji & Hán Việt Introduction | Giới thiệu Kanji và Hán Việt toàn từ, liên kết với Kana/Meaning. | (giới thiệu S3, S4) |
| 4 | Mixed Learning | Kanji Recognition/Assembly, Hán Việt Recognition/Assembly, củng cố Meaning/Kana, Flashcard Active Recall. | S3, S4 (+ S1, S2) |
| 5 | Retrieval Check | Free Recall Meaning, Free Recall Kana, Free Recall Hán Việt (nếu áp dụng), Kanji Recall kết hợp bằng chứng Recognition/Assembly. | S1–S4 |

Hoàn thành Stage 5 = **hoàn thành vòng học ban đầu** (Initial Learning Complete), không phải Mastery.

### 5.3 Exercise Types

| Exercise Type | Mô tả | Skill | Stage | Component v0 có thể tái sử dụng |
| --- | --- | --- | --- | --- |
| Introduction Card | Xem thông tin, bấm tiếp tục. | — | 1, 3 | `flashcard-exercise.tsx`, `kanji-intro-exercise.tsx` |
| Kana → Meaning (Recognition) | Hiện Kana, chọn nghĩa. | S1 | 2, 4 | `choice-exercise.tsx` |
| Meaning → Kana (Recognition) | Hiện nghĩa, chọn Kana. | S2 | 2, 4 | `choice-exercise.tsx` |
| Hiragana Assembly | Ghép Kana từ mảnh. | S2 | 2, 4 | `assembly-exercise.tsx` (`pieceKind: 'kana'`) |
| Flashcard Active Recall | Tự nhớ rồi lật thẻ, tự đánh giá. | S1/S2 (Stage 2), S1–S4 (Stage 4) | 2, 4 | `japanese-flashcard.tsx` |
| Kanji Recognition | Hiện Kana/nghĩa, chọn cách viết Kanji đúng. | S3 | 4 | `choice-exercise.tsx` |
| Kanji Assembly | Ghép cách viết từ các chữ Kanji (có distractor). | S3 | 4, (5) | `assembly-exercise.tsx` (`pieceKind: 'kanji'`) |
| Hán Việt Recognition | Hiện từ, chọn Hán Việt toàn từ. | S4 | 4 | `choice-exercise.tsx` |
| Hán Việt Assembly | Ghép Hán Việt toàn từ từ các âm (vd. HỌC + HIỆU). | S4 | 4 | `assembly-exercise.tsx` (cần pieceKind mới — PROPOSED) |
| Free Recall | Gõ đáp án, không gợi ý. | S1, S2, S4 | 5 | `recall-exercise.tsx` |
| Kanji Recall (MVP) | Nhớ cách viết không gõ IME; dùng bằng chứng Recognition/Assembly. Hình thức chính xác: PENDING. | S3 | 5 | `assembly-exercise.tsx` |

- Gõ Kanji bằng bàn phím Nhật **không bắt buộc** trong MVP — CONFIRMED.
- Hình thức "Hán Việt Assembly hoặc bài phù hợp thay thế" — CONFIRMED cho phép thay thế; dạng thay thế cụ thể PENDING.

### 5.4 Checkpoint từng Stage

#### Định nghĩa "lượt đúng độc lập" — CONFIRMED (định hướng)

Một Attempt chỉ được tính vào checkpoint khi **tất cả** điều kiện sau thỏa:

1. Trả lời đúng ngay lần trả lời đó.
2. Không dùng hint.
3. Không xem đáp án trước khi trả lời.
4. Được **xen kẽ** với câu khác (không phải lặp lại ngay sau một lượt của cùng từ/skill).

Khoảng cách tối thiểu cụ thể (số câu xen giữa, hay thời gian) là **PENDING** (OD-04).

#### Threshold khởi đầu — CONFIRMED như cấu hình ban đầu, chưa kiểm chứng tối ưu

| Stage | Checkpoint |
| --- | --- |
| 1 | Đã xem và xác nhận tiếp tục. |
| 2 | ≥ 2 lượt đúng độc lập **Kana → Meaning**; ≥ 2 lượt đúng độc lập **Meaning → Kana**, trong đó ≥ 1 lượt là **Hiragana Assembly**; các lượt đúng được xen kẽ, không dựa vào hint. |
| 3 | Đã xem và xác nhận tiếp tục. |
| 4 | ≥ 2 lượt đúng độc lập về **Kanji** (gồm Recognition **và** Assembly); ≥ 2 lượt đúng độc lập về **Hán Việt** (gồm Recognition và Assembly, hoặc bài thay thế phù hợp); ≥ 1 lượt **củng cố Kana/Meaning** thành công; có khoảng cách giữa các lượt đúng quan trọng. |
| 5 | Với **mỗi Skill bắt buộc** của từ: ≥ 1 lần Free Recall đúng không gợi ý, sau các lần luyện ở Stage trước. Kanji (S3) dùng Kanji Recall kết hợp bằng chứng Recognition/Assembly. |

Threshold phải nằm trong **một module cấu hình có version** (PROPOSED), không hard-code rải rác trong UI:

```ts
// PROPOSED — minh họa hình dạng cấu hình, không phải code đã tồn tại
export const VOCAB_CHECKPOINTS_V1 = {
  version: 1,
  stage2: { kanaToMeaning: 2, meaningToKana: 2, minHiraganaAssembly: 1 },
  stage4: { kanji: { min: 2, require: ['recognition', 'assembly'] },
            hanViet: { min: 2, require: ['recognition', 'assembly'], allowSubstitute: true },
            reinforceKanaMeaning: 1 },
  stage5: { freeRecallPerRequiredSkill: 1 },
  independence: { minInterleavedItems: 'PENDING' },
} as const
```

#### Sai thì sao — CONFIRMED

- Sai **không** reset toàn bộ tiến độ và **không** làm mất checkpoint đã đạt.
- Skill sai được đưa lại vào Learning Queue sau khi xen kẽ câu khác.
- Sai có thể giảm skill strength (cách tính PENDING).

### 5.5 Ví dụ xuyên suốt: `学校`

```text
学校 — がっこう — gakkō — Trường học — HỌC HIỆU
Kanji thành phần: 学 (HỌC), 校 (HIỆU)
Skill bắt buộc: S1 Meaning, S2 Kana, S3 Kanji, S4 Hán Việt
```

| Stage | Ví dụ câu hỏi | Kết quả cần |
| --- | --- | --- |
| 1 | Thẻ: がっこう · gakkō · Trường học → "Tiếp tục" | Xác nhận đã xem |
| 2 | (a) がっこう → chọn nghĩa: *Trường học* / Học sinh / Đại học / Giáo viên<br>(b) *Trường học* → chọn Kana: がっこう / がくせい / だいがく / せんせい<br>(c) Ghép: [が][っ][こ][う] + distractor [く][せ]<br>(d) Flashcard: "Trường học" → tự nhớ → lật | ≥2 đúng (a), ≥2 đúng Meaning→Kana trong đó ≥1 là (c), xen kẽ, không hint |
| 3 | Thẻ: 学校 = 学 (HỌC) + 校 (HIỆU) → HỌC HIỆU, liên kết がっこう / Trường học | Xác nhận đã xem |
| 4 | (a) がっこう → chọn cách viết: 学校 / 学生 / 大学 / 先生<br>(b) Ghép 学校 từ [学][校][生][先][大]<br>(c) 学校 → chọn Hán Việt: HỌC HIỆU / HỌC SINH / ĐẠI HỌC<br>(d) Ghép HỌC HIỆU từ [HỌC][HIỆU][SINH][TIÊN]<br>(e) Củng cố: 学校 → chọn nghĩa | ≥2 Kanji (có (a) và (b)), ≥2 Hán Việt (có (c) và (d)), ≥1 củng cố, có khoảng cách |
| 5 | Gõ nghĩa của がっこう → "trường học"<br>Gõ Kana của "Trường học" → "がっこう"<br>Gõ Hán Việt của 学校 → "học hiệu"<br>Kanji Recall: tự ghép 学校 không gợi ý (hình thức PENDING) | Mỗi skill ≥1 Free Recall đúng không gợi ý |

Kết nối với database: xem §10.6.

So khớp đáp án tự do (PROPOSED, dựa trên `normalizeAnswer` đã có): bỏ dấu tiếng Việt, không phân biệt hoa thường, gộp khoảng trắng. Việc chấp nhận nhiều nghĩa đồng nghĩa (vd. "trường") là PENDING.

### 5.6 Từ chỉ có Kana

| Trường hợp | Ví dụ | Skill bắt buộc | Stage |
| --- | --- | --- | --- |
| Từ Hiragana thuần | これ — kore — Cái này | S1, S2 | 1 → 2 → 5 |
| Từ Katakana (ngoại lai) | テレビ — terebi — Ti vi | S1, S2 (Katakana?) | 1 → 2 → 5 |
| Từ có Kanji + okurigana | 休む — やすむ — Nghỉ — HƯU | S1–S4 | 1 → 5 |

- Từ chỉ có Kana bỏ qua Stage 3–4 và Stage 5 chỉ kiểm tra S1, S2 — CONFIRMED.
- S2 được định nghĩa là "Hiragana". Cách xử lý từ Katakana (S2 là Katakana? thêm reading Hiragana?) — **PENDING** (OD-11).
- Từ có okurigana: Kanji Assembly ghép phần Kanji hay toàn từ, Hán Việt chỉ của phần Kanji — **PENDING** (OD-11).

---

## 6. Daily Lesson System

### 6.1 Phiên khoảng 5 phút — CONFIRMED

- Một Lesson có **mục tiêu rõ ràng** (vd. "Học 3 từ mới về trường học" hoặc "Đưa 4 từ lên Stage 4").
- Độ dài mục tiêu ~5 phút; phiên kết thúc khi đạt mục tiêu hoặc hết câu dự kiến, không phải khi đồng hồ chạy hết (PROPOSED).
- Một Lesson trộn từ mới (Stage 1) và từ đang học (Stage 2–5).

### 6.2 Lesson completion

| Khái niệm | Định nghĩa | Nhãn |
| --- | --- | --- |
| Lesson completed | Đã trả lời hết queue của phiên (hoặc đạt mục tiêu phiên). | PROPOSED |
| Stage completed (của một từ) | Checkpoint Stage đó đạt. | CONFIRMED |
| Initial learning complete (của một từ) | Checkpoint Stage 5 đạt. | CONFIRMED |

Một Lesson hoàn thành **không** đòi hỏi từ nào cũng lên Stage — CONFIRMED (FR-DL-03).

### 6.3 Stage progression

- Tiến độ Stage là **per Vocabulary** và được lưu bền vững.
- Một từ có thể ở Stage 2 suốt nhiều Lesson cho tới khi đạt checkpoint.
- Không cho nhảy tự do giữa các Stage dựa trên chỉ số UI. (Source v0 hiện cho phép bấm `StageTrack` để nhảy bất kỳ bước — xem §12.6 mâu thuẫn C-05.)

### 6.4 Pause / Resume — CONFIRMED (yêu cầu), cơ chế PENDING

- Attempt được ghi ngay khi trả lời → refresh hoặc đổi thiết bị **không mất bằng chứng** đã có — PROPOSED (bắt buộc để đáp ứng yêu cầu).
- Hai phương án tiếp tục (PENDING, OD-07):
  - **A — Resume chính xác:** lưu queue + vị trí; mở lại đúng câu đang làm.
  - **B — Session mới từ state:** chỉ giữ Attempt/Checkpoint đã lưu; tạo queue mới.

### 6.5 Học thêm khi có thời gian — CONFIRMED

Sau màn hình hoàn thành: "Học thêm một phiên" (tạo Lesson mới từ trạng thái hiện tại), "Ôn tập" (FSRS), hoặc "Về trang chủ". Giới hạn số từ mới/ngày — PENDING.

### 6.6 Vai trò của Learning Queue — CONFIRMED (nguyên tắc)

Learning Queue là bộ máy chọn câu hỏi trong một Lesson:

- Trộn nhiều Vocabulary, Skill và Exercise Type.
- Lặp lại skill chưa đạt **sau khi** đã xen kẽ câu khác.
- Câu đúng nhờ hint hoặc sau khi xem đáp án không tính vào checkpoint độc lập.
- Không reset toàn bộ tiến độ khi sai.
- Hỗ trợ dừng và tiếp tục qua nhiều phiên.

```mermaid
flowchart TD
    A[Bắt đầu Lesson] --> B[Planner chọn tập từ cho phiên<br/>PENDING]
    B --> C[Queue sinh câu hỏi theo Stage/Skill còn thiếu]
    C --> D[Hiển thị câu]
    D --> E{Trả lời}
    E -->|Đúng, độc lập| F[Ghi Attempt hợp lệ]
    E -->|Đúng nhờ hint / xem đáp án| G[Ghi Attempt không tính checkpoint]
    E -->|Sai| H[Ghi Attempt sai; lên lịch lặp lại sau vài câu]
    F --> I{Checkpoint Stage đạt?}
    I -->|Có| J[Lên Stage tiếp; cập nhật queue]
    I -->|Chưa| K[Cần thêm lượt xen kẽ]
    G --> K
    H --> K
    J --> L{Mục tiêu phiên đạt / hết queue?}
    K --> L
    L -->|Chưa| C
    L -->|Rồi| M[Màn hình hoàn thành:<br/>Học thêm / Review / Home]
```

Thuật toán chọn câu chi tiết — **PENDING** (OD-03).

### 6.7 Những điểm chưa chốt trong Daily Session Planner — PENDING

| Câu hỏi | Ghi chú |
| --- | --- |
| Bao nhiêu từ mới mỗi Lesson? | Ảnh hưởng độ dài ~5 phút. |
| Tỷ lệ từ mới vs từ đang học? | |
| Nội dung theo Learning Path chủ đề hay hoàn toàn động? | OD-01. |
| Ưu tiên từ nào trong số từ đang học (yếu nhất, lâu nhất chưa gặp, gần checkpoint)? | |
| Giới hạn số từ mới/ngày, có tách Vocabulary/Kanji? | PLAN-01 Q12. |
| Định nghĩa "ngày học" và timezone? | PLAN-01 Q6; người dùng ở UTC+7. |
| Lesson cho module Kanji độc lập có dùng chung Planner? | OD-05. |

---

## 7. FSRS Review System

### 7.1 Mục tiêu — CONFIRMED

Duy trì trí nhớ dài hạn sau vòng học ban đầu bằng lịch FSRS. Người học có thể chỉ mở Review mà không học bài mới.

### 7.2 Review lifecycle

```mermaid
sequenceDiagram
    participant U as Người học
    participant UI as Review UI
    participant S as Server (trusted)
    participant DB as PostgreSQL
    U->>UI: Mở Review
    UI->>S: Lấy due cards
    S->>DB: SELECT cards WHERE due <= now()
    DB-->>UI: Danh sách card đến hạn
    U->>UI: Tự nhớ → lật thẻ
    U->>UI: Chọn Again / Hard / Good / Easy
    UI->>S: submitReview(card_id, rating, event_id)
    S->>S: FSRS tính state/due mới (server time)
    S->>DB: Transaction: update card + insert review_log (idempotent theo event_id)
    S-->>UI: Card tiếp theo
```

- Server/trusted layer quyết định thời gian review và lịch mới; browser không gửi FSRS state — PROPOSED (PLAN-01).
- Submit trùng (cùng event) không reschedule hai lần — PROPOSED.
- Hai thiết bị submit cạnh tranh không ghi đè bằng state cũ — PROPOSED.

### 7.3 Card eligibility — PENDING (OD-06)

Khi nào một Vocabulary sinh Review Card:

| Phương án | Mô tả | Ưu | Nhược |
| --- | --- | --- | --- |
| E1 | Sau khi đạt Stage 5 (Initial learning complete), tạo toàn bộ card của từ. | Đơn giản, rõ ràng. | Từ kẹt ở Stage 4 lâu không được ôn. |
| E2 | Mỗi card được tạo khi skill tương ứng đạt checkpoint (vd. card Meaning sau Stage 2). | Ôn sớm, chi tiết. | Phức tạp hơn, nhiều card hơn. |
| E3 | Tạo card khi bắt đầu học, nhưng chỉ active khi đạt điều kiện. | Dễ quản lý ID. | Cần trạng thái "suspended/inactive". |

Source v0 hiện ghi "They'll show up in tomorrow's review" khi hoàn thành session — đây là text demo, không phải quyết định. ARCH-03 §7.3 mô tả "đạt checkpoint Stage 5 → eligible for FSRS Review" (tương ứng E1) nhưng ở mức PROPOSED; chưa được chốt.

### 7.4 Các mục tiêu ghi nhớ (memory targets)

CONFIRMED: Vocabulary có thể được ôn theo **nhiều mục tiêu ghi nhớ**, không chỉ một thẻ tổng hợp. Kanji độc lập có thể có card riêng.

Ứng viên (PROPOSED, chưa chốt số lượng — OD-02):

| Card candidate | Prompt → Đáp án | Áp dụng |
| --- | --- | --- |
| `vocab.meaning` | 学校 / がっこう → Trường học | Mọi từ |
| `vocab.reading` | Trường học (hoặc 学校) → がっこう | Mọi từ |
| `vocab.kanji` | がっこう + nghĩa → 学校 | Từ có Kanji |
| `vocab.hanviet` | 学校 → HỌC HIỆU | Từ có Kanji |
| `vocab.combined` | 学校 → đọc + nghĩa + Hán Việt | Phương án gộp |
| `kanji.*` | 学 → HỌC / nghĩa / readings | Kanji độc lập |

### 7.5 FSRS scheduling

| Mục | Nhãn |
| --- | --- |
| Thuật toán FSRS; rating Again/Hard/Good/Easy | CONFIRMED |
| Library (vd. `ts-fsrs`) và version | PENDING (PLAN-01 Q4) |
| Parameters mặc định, có optimize sau không | PENDING |
| Desired retention | PENDING |
| Giới hạn số review/ngày, thứ tự due | PENDING |
| Rating hiển thị dự báo interval thật | PROPOSED (hiện v0 hard-code `<1m / 6m / 1d / 4d`) |

### 7.6 Official Review vs Practice — CONFIRMED

| | Official Review | Practice / Mini-game | Daily Lesson Attempt |
| --- | --- | --- | --- |
| Mục đích | Ôn đúng hạn | Luyện tự do | Học ban đầu |
| Cập nhật FSRS | **Có** | **Không** | Không trực tiếp |
| Lưu | `review_logs` | `practice_logs` | `learning_attempts` |
| Ảnh hưởng checkpoint | Không | Không (PROPOSED) | Có |
| Ảnh hưởng skill strength | PENDING | PENDING | Có |

### 7.7 Những điểm chưa chốt về Card Taxonomy — PENDING

1. Số card mỗi Vocabulary (1 tổng hợp, 2, hay 4 theo Skill).
2. Card cho từ chỉ có Kana.
3. Card Kanji độc lập trùng mục tiêu với `vocab.hanviet`/`vocab.kanji` không (vd. 学 vs 学校).
4. Sibling burying: card cùng từ có bị dồn cùng ngày không.
5. Định dạng trả lời: chỉ tự đánh giá (flashcard) hay có gõ đáp án.
6. Card eligibility (§7.3).

---

## 8. Practice & Gamification

### 8.1 Các dạng bài tập và mini-games — CONFIRMED (danh sách)

| Mini-game | Skill | Mô tả ngắn | Hiện trạng source |
| --- | --- | --- | --- |
| Vocabulary Matching | S1/S2 | Nối từ với nghĩa. | Chưa có riêng |
| Kana Assembly | S2 | Ghép Kana. | Có exercise trong session, chưa là game |
| Kanji Assembly | S3 | Ghép cách viết Kanji. | Có exercise trong session, chưa là game |
| Hán Việt Assembly | S4 | Ghép âm Hán Việt. | Chưa có |
| Speed Matching | S1/S2 | Nối nhanh trong thời gian giới hạn. | **IMPLEMENTED (UI demo)**: 60 giây, mock data, không lưu |
| Recall Challenge | S1–S4 | Gõ đáp án nhanh. | Chưa có (v0 có card "Recall Sprint" placeholder) |

Source v0 còn có card "Rapid Fire" (placeholder) và "Word Builder" (link sang learning session) — chưa nằm trong danh sách CONFIRMED (xem C-08).

### 8.2 Yêu cầu Practice — CONFIRMED

- Luyện tập tự do theo kỹ năng.
- Lưu kết quả luyện tập.
- Không trực tiếp thay đổi lịch FSRS.

PROPOSED: chỉ dùng từ đã có ít nhất Stage tương ứng (vd. Kanji Assembly chỉ cho từ đã qua Stage 3); game settings thật sự tác động game và được lưu.

### 8.3 XP / Progress

| Mục | Nhãn |
| --- | --- |
| UI gamified (XP, streak, achievement, mascot) | CONFIRMED (định hướng UI) |
| Công thức XP | PENDING (v0 demo: `XP = số câu đúng × 10`) |
| Streak tính theo gì (Lesson, Review, bất kỳ hoạt động) | PENDING |
| Achievement system | PROPOSED P1 |
| Practice có ảnh hưởng weak-skill signal | PENDING |

---

## 9. Technical Architecture

### 9.1 Stack — quyết định vs đã tích hợp

| Thành phần | Quyết định | Trạng thái trong source |
| --- | --- | --- |
| Next.js App Router | CONFIRMED | IMPLEMENTED — `next` 16.4.0 |
| React + TypeScript | CONFIRMED | IMPLEMENTED — React 19, TS 5.7.3, `strict` |
| Tailwind CSS | CONFIRMED | IMPLEMENTED — Tailwind 4.3.3 |
| pnpm | CONFIRMED | IMPLEMENTED — `pnpm@12.3.4`, `pnpm-lock.yaml` |
| Supabase | CONFIRMED | **Chưa tích hợp** — không có dependency/client |
| PostgreSQL | CONFIRMED (qua Supabase) | **Chưa tích hợp** |
| Supabase Auth | CONFIRMED | **Chưa tích hợp** — không có auth/protected route |
| Next.js full-stack (BFF), không backend riêng | CONFIRMED (ADR-001 Accepted) | Chưa có server code nghiệp vụ |
| `@supabase/supabase-js` + `@supabase/ssr`, `server-only` | PROPOSED (ARCH-03) | Chưa có |
| Schema validator (vd. Zod) | PROPOSED (ARCH-03) | Chưa có |
| FSRS library | PENDING (ứng viên `ts-fsrs`) | Chưa có; interval hard-code |
| Test framework | PENDING | Chưa có |
| Hosting/Deployment | PENDING | Có `@vercel/analytics`, chưa có quyết định deploy |
| UI primitives | IMPLEMENTED | Base UI, shadcn config, Lucide icons |

Không đề xuất thay thế stack (PHP, Firebase, MongoDB…).

> **Lưu ý Next.js 16:** `AGENTS.md` cảnh báo phiên bản Next.js này có breaking changes so với kiến thức phổ biến; trước khi viết code phải đọc hướng dẫn trong `node_modules/next/dist/docs/`.

### 9.2 Frontend / Backend responsibilities — PROPOSED (theo ARCH-03 §4)

Bảng đầy đủ và quy tắc ranh giới client/server: `docs/architecture.md` §4. Tóm tắt:

| Lớp | Trách nhiệm |
| --- | --- |
| Client Components (v0) | Tương tác, feedback tạm thời bằng hàm grading thuần; gửi **sự kiện** (answer, `hintUsed`, `revealed`, `clientEventId`), không gửi kết luận. |
| Server Components | Đọc qua DAL, truyền DTO tối thiểu. |
| Server Actions | Mutation từ UI: `submitAttempt`, `submitReview`, `updateSettings`… Tự kiểm tra auth trong từng action. (ADR-005 Proposed) |
| Route Handlers | Auth callback, upload import, download backup, restore. (ADR-005 Proposed) |
| `proxy.ts` | Refresh session cookie, redirect optimistic — **không** phải lớp authorization chính (Next.js 16 đổi `middleware` → `proxy`). |
| Data Access Layer (`server-only`) | `getClaims()` → authorization → query → DTO; gọi domain module. (ADR-004 Proposed) |
| Domain modules (pure TS) | Grading, checkpoint evaluation, Learning Queue, FSRS adapter; không I/O; unit test. (ADR-007 Proposed) |
| PostgreSQL + RLS | Nguồn sự thật; RLS `auth.uid()` trên mọi bảng user-owned; transaction/RPC cho review atomic (D-04 PENDING). |

Server-authoritative: grading, checkpoint và FSRS được tính lại trên server (ADR-006 Proposed). Mức độ gửi đáp án xuống client để feedback tức thì: PENDING (OD-24 / ARCH-03 D-07).

### 9.3 Authentication — CONFIRMED provider, chi tiết PENDING

- Provider: Supabase Auth — CONFIRMED.
- Phương thức đăng nhập (email/password, magic link, OAuth) — PENDING.
- Giới hạn chỉ một tài khoản: ARCH-03 đề xuất tắt public sign-up, tạo user thủ công/invite — PROPOSED.
- Session cookie qua `@supabase/ssr`, refresh trong `proxy.ts`, authorization bằng `getClaims()` (không dùng `getSession()` để authorize) — PROPOSED (ADR-003).
- Chỉ publishable/anon key được `NEXT_PUBLIC_`; service-role key không dùng ở request path — PROPOSED (ARCH-03 §5.4).
- Mọi mutation gắn identity từ session trusted; client không tự chọn `user_id` — PROPOSED.
- Secret/service key không vào client bundle hoặc Git — PROPOSED (bắt buộc an toàn). `.gitignore` đã bỏ qua `.env*` (IMPLEMENTED).

### 9.4 Data flow — PROPOSED

```mermaid
flowchart LR
    B[Browser<br/>v0 components] -- "navigation" --> SC[Server Components]
    B -- "attempt / review / settings" --> SA[Server Actions]
    B -- "import / backup files" --> RH[Route Handlers]
    PX[proxy.ts<br/>refresh cookie] -.-> SC
    SC --> DAL[DAL server-only<br/>getClaims → authz → DTO]
    SA --> DAL
    RH --> DAL
    DAL --> DOM[Domain modules<br/>grading · checkpoint · queue · FSRS]
    DAL --> SB[(Supabase PostgreSQL + RLS)]
    PX -. refresh .-> AUTH[Supabase Auth]
    DAL -. verify claims .-> AUTH
```

Sequence diagram chi tiết cho đăng nhập, mở phiên học, ghi attempt, submit review và Dashboard: `docs/architecture.md` §7.

### 9.5 Project structure

**IMPLEMENTED (hiện tại):**

```text
nihongo-app-design/
├── AGENTS.md                  # Next.js agent rules (tự sinh bởi next dev)
├── app/
│   ├── layout.tsx             # fonts Inter + Noto Sans JP, dark viewport, Vercel Analytics
│   ├── globals.css            # Dark Theme tokens
│   ├── (main)/                # shell: sidebar + mobile nav
│   │   ├── page.tsx           # Dashboard
│   │   ├── learn/ library/ review/ practice/ progress/ settings/
│   ├── learn/session/         # full-screen learning session (?mode=vocab|kanji)
│   ├── review/session/        # full-screen review
│   └── practice/speed-matching/
├── components/
│   ├── dashboard/ learning/ (steps/) library/ nav/ practice/ review/ settings/ ui/
│   └── action-button.ts page-header.tsx progress-bar.tsx sparkles.tsx
├── lib/
│   ├── learning-engine.ts     # shuffle, normalizeAnswer, step builders (mock-driven)
│   ├── mock-data.ts           # 16 vocab, 12 kanji, 8 review cards, profile mock
│   ├── speed-matching.ts  tones.ts  types.ts  utils.ts
├── docs/  ui-audit.md  mvp-scope.md  (untracked)  + PROJECT_SPEC.md
└── public/                    # icons, mascot images
```

**PROPOSED (bổ sung khi triển khai, chưa chốt):**

```text
lib/domain/       # learning queue, checkpoint rules, FSRS adapter (pure, tested)
lib/data/         # Supabase data access
lib/supabase/     # client/server factories
supabase/migrations/
docs/adr/         # Architecture Decision Records
```

### 9.6 Rủi ro kỹ thuật đã biết

- `next.config.mjs` đặt `typescript.ignoreBuildErrors: true` — IMPLEMENTED; cần gỡ trước khi coi build là quality gate.
- `package.json` có `name: "my-project"`, metadata title "Nihongo" — tên chưa thống nhất với "Projap".
- Chưa có script `lint`, `typecheck`, `test`.

---

## 10. Database Design Overview

> **Toàn bộ schema trong mục này là PROPOSED.** Chưa có bảng, migration hay Supabase project nào trong source. ERD chi tiết và FSRS Card Taxonomy **chưa chốt** — mục này chỉ mô tả các thực thể và quan hệ cần có để task DB-01 thiết kế chi tiết.

### 10.1 Vocabulary và Kanji (master content)

| Thực thể | Trường chính (PROPOSED) | Ghi chú |
| --- | --- | --- |
| `vocabulary` | `id`, `written` (nullable — Kanji spelling), `kana`, `romaji`, `meaning_vi`, `han_viet` (nullable), `jlpt_level`, `has_kanji` (derived), `source/external_id` | Từ chỉ có Kana: `written` null hoặc = `kana` (PENDING). Nhiều nghĩa: mảng hay bảng riêng (PENDING). |
| `kanji` | `id`, `character` (unique), `han_viet`, `meanings`, `onyomi[]`, `kunyomi[]`, `stroke_count`, `components[]`, `jlpt_level` | Phạm vi readings PENDING. |
| `vocabulary_kanji` | `vocabulary_id`, `kanji_id`, `position` | N–N; quan hệ theo ID, không theo text hiển thị. |

Kana pieces cho Assembly (`kanaPieces` trong v0): lưu sẵn hay sinh tự động (vd. tách `しゃ`, `びょ` thành một mảnh) — PENDING.

### 10.2 Learning Session

| Thực thể | Trường chính (PROPOSED) |
| --- | --- |
| `learning_sessions` | `id`, `user_id`, `module` (`vocab`/`kanji`), `goal`, `status` (`active`/`completed`/`abandoned`), `started_at`, `completed_at`, `queue_snapshot` (chỉ nếu chọn resume chính xác — OD-07) |
| `learning_attempts` | `id`, `user_id`, `session_id`, `vocabulary_id`/`kanji_id`, `stage`, `skill`, `exercise_type`, `direction`, `is_correct`, `hint_used`, `answer_revealed`, `counts_for_checkpoint`, `client_event_id` (idempotency), `answered_at` |

`learning_attempts` là append-only; mọi checkpoint/progress phải truy vết được về đây.

### 10.3 Vocabulary / Skill Progress

| Thực thể | Trường chính (PROPOSED) |
| --- | --- |
| `vocabulary_progress` | `user_id`, `vocabulary_id`, `current_stage` (1–5), `stage_n_passed_at`, `initial_learning_completed_at`, `checkpoint_rules_version` |
| `vocabulary_skill_progress` | `user_id`, `vocabulary_id`, `skill` (S1–S4), `checkpoint_state` (theo Stage), `strength` (cách tính PENDING), `last_attempt_at`, `correct_streak` |

Phân tách rõ checkpoint (không mất) và strength (biến động) — CONFIRMED về nguyên tắc.

### 10.4 Practice Logs

| Thực thể | Trường chính (PROPOSED) |
| --- | --- |
| `practice_sessions` | `id`, `user_id`, `game_type`, `settings`, `score`, `accuracy`, `duration_ms`, `started_at`, `ended_at` |
| `practice_logs` | `id`, `practice_session_id`, `vocabulary_id`/`kanji_id`, `skill`, `is_correct`, `response_ms`, `answered_at` |

Không có foreign key hoặc trigger nào từ practice sang FSRS — CONFIRMED về hành vi.

### 10.5 Cards / Card Progress / Review Logs

| Thực thể | Trường chính (PROPOSED) |
| --- | --- |
| `review_cards` | `id`, `user_id`, `vocabulary_id`/`kanji_id`, `card_type` (**taxonomy PENDING**), `status` (`active`/`suspended`), `created_at` |
| `review_card_state` (hoặc gộp vào `review_cards`) | `state` (New/Learning/Review/Relearning), `due`, `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `reps`, `lapses`, `last_review`, `version` (optimistic lock) |
| `review_logs` | `id`, `card_id`, `user_id`, `rating`, `state_before`, `state_after`, `reviewed_at` (server time), `fsrs_version`, `client_event_id` (unique) |

### 10.6 Ví dụ quan hệ với `学校`

```text
vocabulary
  id=v-gakkou  written=学校  kana=がっこう  romaji=gakkō  meaning_vi=Trường học  han_viet=HỌC HIỆU  jlpt=N5

kanji
  id=k-gaku  character=学  han_viet=HỌC
  id=k-kou   character=校  han_viet=HIỆU

vocabulary_kanji
  (v-gakkou, k-gaku, position=0)
  (v-gakkou, k-kou,  position=1)
  -- 学 cũng liên kết với 学生, 大学; 校 có thể liên kết với các từ khác

vocabulary_progress (user U)
  (U, v-gakkou, current_stage=4, stage2_passed_at=..., initial_learning_completed_at=null)

vocabulary_skill_progress (user U)
  (U, v-gakkou, S1 Meaning,  stage2 checkpoint ✓)
  (U, v-gakkou, S2 Kana,     stage2 checkpoint ✓)
  (U, v-gakkou, S3 Kanji,    1/2 lượt độc lập — recognition ✓, assembly ✗)
  (U, v-gakkou, S4 Hán Việt, 0/2)

learning_attempts (một vài dòng)
  (session L7, v-gakkou, stage=4, S3, kanji_recognition, correct, no hint)   -> counts
  (session L7, v-gakkou, stage=4, S3, kanji_assembly,    wrong)              -> requeue
  (session L7, v-gakkou, stage=4, S4, hanviet_recognition, correct, hint)    -> not counted

review_cards  (chỉ tồn tại khi eligibility đạt — PENDING; card_type minh họa)
  (U, v-gakkou, vocab.meaning)  (U, v-gakkou, vocab.reading) ...

practice_logs
  (speed_matching, v-gakkou, S1, correct, 820 ms)   -- không chạm review_cards
```

### 10.7 Bảo mật dữ liệu — PROPOSED

- Mọi bảng learner-owned có `user_id` và RLS `user_id = auth.uid()`.
- Master content (`vocabulary`, `kanji`): chỉ đọc với user đã đăng nhập; ghi qua import có kiểm soát. Content import là dữ liệu chung hay theo user — PENDING (liên quan backup scope, PLAN-01 Q19).

### 10.8 Schema đề xuất vs đã triển khai

| Hạng mục | Trạng thái |
| --- | --- |
| Types TS cho `VocabItem`, `KanjiItem`, `ReviewCard`, `LearningStep` | IMPLEMENTED (`lib/types.ts`), dạng mock — `VocabItem.word` bắt buộc, có `strength` hard-code |
| Bảng PostgreSQL | Chưa có |
| Migrations | Chưa có |
| RLS policies | Chưa có |
| ERD chi tiết | PENDING (task DB-01) |

---

## 11. UI/UX Requirements

### 11.1 Design philosophy — CONFIRMED

Dark Modern, Minimalist, Gamified. Tập trung vào nội dung tiếng Nhật lớn, rõ; phản hồi ngay (đúng/sai), cảm giác tiến bộ (progress bar, XP, completion screen, mascot).

### 11.2 Dark Theme hiện tại — IMPLEMENTED

- Token trong `app/globals.css`: `--background #0f1115`, `--card #171a21`, `--foreground #f5f7fb`, `--primary #8b7cff`, cùng `cyan`, `pink`, `yellow`, `success`, `error`, `subtle`.
- `color-scheme: dark`, `themeColor #0F1115`.
- Font: Inter (latin + vietnamese) và Noto Sans JP (`font-jp`).
- Animation: `shake`, `pop`, `twinkle`; `tw-animate-css`.
- Semantic tones: `lib/tones.ts`.

Không thêm Light/Kawaii theme hay redesign trong MVP — PROPOSED (PLAN-01 Out of Scope).

### 11.3 Responsive — IMPLEMENTED (shell), yêu cầu P0

- Desktop: sidebar (`app-sidebar.tsx`). Mobile: top bar + bottom nav.
- Kiểm tra overflow ở viewport ~320 px trong Vocabulary Session (rủi ro từ ARCH-02).

### 11.4 Navigation — IMPLEMENTED

| Nhóm | Mục |
| --- | --- |
| Primary | Home `/`, Learn `/learn`, Review `/review`, Practice `/practice` |
| Secondary | Library `/library`, Progress `/progress`, Settings `/settings` |
| Full-screen | `/learn/session?mode=vocab|kanji`, `/review/session`, `/practice/speed-matching` |

Không có route `/kanji` riêng; module Kanji hiện đi qua `?mode=kanji`. Route cho Daily Lessons V6 — PENDING (có thể giữ `/learn/session`).

### 11.5 Learning session UI

- Header: nút thoát, nhãn, progress bar — IMPLEMENTED (`session-header.tsx`).
- Exercise panel + footer Check/Continue + feedback đúng/sai + giải thích — IMPLEMENTED.
- Stage track — IMPLEMENTED nhưng theo 7 bước v0 và cho nhảy tự do; cần đổi sang 5 Stage V6 và chỉ hiển thị, không cho nhảy (PROPOSED).
- Hint/"xem đáp án" có chủ ý: chưa có trong v0 — `prompt.hint` (nghĩa) luôn hiển thị ở Kana Assembly và Kanji Choice (UX-01 FG-09). Cần chuyển thành hành động có ghi nhận `hint_used`/`answer_revealed` (PROPOSED).
- Stage 1 phải chỉ hiện Hiragana, Romaji, Meaning; flashcard v0 hiện Kanji ở mặt trước và Hán Việt ở mặt sau (UX-01 FG-03) — cần đổi nội dung, không đổi visual.
- Exit trong session là link thẳng, không lưu (UXI-02); an toàn khi mỗi Attempt được lưu ngay.
- Trạng thái hệ thống: chưa có `loading.tsx`, `error.tsx`, `not-found.tsx`; Review rỗng hiện `NaN%` (UXI-07, UXI-08). Cần empty/loading/error state theo từng route khi nối dữ liệu thật.
- Ngôn ngữ UI: copy hiện tiếng Anh, `<html lang="en">` — PENDING (OD-26 / ARCH-03 D-13).
- Danh sách UX issue có ưu tiên: `docs/ux-flow-audit.md` §8 (UXI-01…UXI-22); V5 gap: §7.2 (FG-01…FG-14).
- Completion screen: accuracy, items, XP, Start Review / Home / Restart — IMPLEMENTED (UI demo). Thêm "Học thêm phiên" — PROPOSED.
- Review: reveal bằng Space/Enter, rating phím 1–4 — IMPLEMENTED (UI demo).
- Nhập tiếng Nhật: input có xử lý IME composition (`isComposing`) — IMPLEMENTED.

### 11.6 Reuse component hiện có — CONFIRMED (định hướng)

Thay nguồn dữ liệu và callback ở boundary, không viết lại UI. Danh sách component nên giữ: xem `docs/ui-audit.md` §4 và §10. Không giữ làm production truth: mock ID cố định, interval hard-code, `strength`/retention giả, forecast tĩnh, settings/progress chỉ trong component state.

---

## 12. Current Project Status

### 12.1 Những gì đã kiểm tra trong source (2026-10-16)

- Repository: `~/Projects/japanese-learning/nihongo-app-design` (thư mục cha còn `nihongo-app-design.zip` và thư mục `vocabulary/` rỗng).
- Git: branch hiện tại `docs/mvp-scope`; các branch `main`, `docs/arch02-plan01`, `docs/mvp-scope`, `origin/main` đều trỏ tới commit duy nhất `afbd50d`.
- Tracked: 76 file từ commit v0, không file tracked nào bị sửa. Untracked: `docs/ui-audit.md`, `docs/mvp-scope.md`, `docs/architecture.md`, `docs/ux-flow-audit.md`, `docs/PROJECT_SPEC.md` (và `next-env.d.ts`, đã được `.gitignore`).
- Đã đọc: `AGENTS.md`, `package.json`, `next.config.mjs`, `.gitignore`, toàn bộ 4 tài liệu trong `docs/`, `lib/*.ts`, toàn bộ page trong `app/`, các component session/review/practice/library/settings/nav.
- Không tồn tại: `CLAUDE.md` (ARCH-03 dự kiến thêm ở GIT-03), `app/api/`, `proxy.ts`, Supabase/DB client, test, `.env.example`.
- Giới hạn kiểm tra: không chạy `pnpm dev`/build và không chạy lệnh `git` trực tiếp; trạng thái Git được suy ra từ `.git/HEAD`, refs và `.git/index`.

### 12.2 Chức năng đã có (IMPLEMENTED — chỉ UI/logic client)

- App shell responsive + navigation + Dark Theme.
- 5 loại exercise component: Flashcard, Kanji Intro, Choice, Assembly (kana/kanji, có `joiner`), Recall (có xử lý IME).
- Helper thuần: deterministic `shuffle`, `normalizeAnswer` (bỏ dấu tiếng Việt), `isRecallCorrect`, `jpSizeClass`.
- Review session UI với 4 rating và phím tắt.
- Speed Matching: timer, chọn cặp, score/combo/mistake.
- Library: tab + search trong memory.

### 12.3 Chức năng demo/mock

| Khu vực | Giới hạn |
| --- | --- |
| Dashboard, Learn overview, Review overview, Progress | Số liệu từ `lib/mock-data.ts` hoặc hard-code |
| Learning session | Vocab cố định `v-gakkou`, `v-jikan`; Kanji cố định `k-gaku`, `k-yasu`, `k-mei`; 7 bước tuyến tính/item; kết quả trong `useState` |
| Review session | Queue mock 8 card; interval `<1m/6m/1d/4d` hard-code; không lưu |
| Speed Matching | 60 giây hard-code; mock vocab; không lưu |
| Settings | Chỉ React state |
| Rapid Fire, Recall Sprint | Placeholder trỏ về `/practice` |

### 12.4 Chức năng chưa triển khai

Supabase/PostgreSQL/Auth; persistence; sync; Learning Queue; 5-Stage model V6; checkpoint; Skill S4 Hán Việt trong flow Vocabulary (chỉ hiện trong explanation); Free Recall Meaning và Hán Việt; hint tracking; FSRS thật; card generation; practice logs; Vocabulary Matching, Hán Việt Assembly, Recall Challenge; import CSV/JSON; backup/restore; xử lý từ chỉ có Kana; module Kanji độc lập theo V6; tests.

### 12.5 Trạng thái task

| Task | Trạng thái | Bằng chứng |
| --- | --- | --- |
| GIT-01 | Hoàn thành (bằng chứng gián tiếp) | Repo có commit `afbd50d` và remote `origin`; `ui-audit.md` §11 tham chiếu audit GIT-01 |
| ARCH-02 — UI/source audit | **Hoàn thành** (người dùng xác nhận) | `docs/ui-audit.md` (untracked) |
| PLAN-01 — MVP scope | **Hoàn thành** (người dùng xác nhận) | `docs/mvp-scope.md` (untracked) |
| ARCH-03 — Kiến trúc | **Hoàn thành** (người dùng xác nhận) | `docs/architecture.md` (untracked; header ghi "Draft để chủ dự án review") |
| UX-01 — Audit user flow | **Hoàn thành** (người dùng xác nhận) | `docs/ux-flow-audit.md` (untracked; header ghi "Draft để chủ dự án review") |
| PROJECT_SPEC.md | Bản này — chờ review | `docs/PROJECT_SPEC.md` (untracked) |
| GIT-03, SPEC-01…03, QA-01, DB-01, AUTH-01, DATA-01, LEARN-01, REVIEW-01, DASH-01, TODAY-01, BACKUP-01, LIB-01, SETTINGS-01, PRACTICE-01 | Chưa bắt đầu | Task do ARCH-03 §10.1 đề xuất; không có code/commit tương ứng |

Lưu ý: bốn tài liệu ARCH-02, PLAN-01, ARCH-03, UX-01 **chưa được commit** (mọi branch vẫn ở `afbd50d`). Header của chúng vẫn ghi "Draft", trong khi chủ dự án đã xác nhận hoàn thành — nên cập nhật header khi commit (GIT-03).

### 12.6 Mâu thuẫn giữa tài liệu cũ / source và V6

| ID | Nguồn cũ | Nội dung cũ | V6 (ưu tiên) | Cần chủ dự án kiểm tra |
| --- | --- | --- | --- | --- |
| C-01 | PLAN-01 §9 Q1, §10 | Data/auth platform là Open Decision | Supabase + PostgreSQL + Supabase Auth đã CONFIRMED | Cập nhật PLAN-01 hoặc ghi ADR |
| C-02 | PLAN-01 §2.5, §3, P0-5 | "Không ép Lesson cố định", "free learning queue", người học chọn Vocabulary/Kanji, không có lesson | Có Daily Lessons ~5 phút (Duolingo); Learning Path chủ đề đang cân nhắc | Xác nhận Daily Lesson thay cho "free learning session"; Learning Path có trái nguyên tắc "không ép thứ tự" không |
| C-03 | PLAN-01 §3, Q14 | Practice không reschedule FSRS là *đề xuất* | CONFIRMED | — |
| C-04 | Source `VOCAB_STAGES` | 7 bước/item: Introduction, Hiragana recognition, Kana assembly, Kanji introduction, Kanji recognition, Kanji assembly, Recall; mỗi bước 1 câu | 5 Stage với checkpoint nhiều lượt, xen kẽ | Refactor learning engine |
| C-05 | Source `StageTrack` | Cho nhảy tự do giữa các bước | Stage progression theo checkpoint | Giữ khả năng xem lại không? |
| C-06 | Source vocab flow | Không có Hán Việt Recognition/Assembly/Recall; Recall chỉ Meaning → Reading; không có Meaning recognition | S4 Hán Việt là Skill bắt buộc; Free Recall cho Meaning, Kana, Hán Việt | — |
| C-07 | Source Recall | Chấp nhận Romaji như đáp án Kana; mock dùng `gakkou` | Romaji chỉ là hỗ trợ; ví dụ dùng `gakkō` | OD-12 |
| C-08 | Source Practice | Rapid Fire, Recall Sprint, Word Builder | Danh sách V6: Vocabulary Matching, Kana/Kanji/Hán Việt Assembly, Speed Matching, Recall Challenge | Recall Sprint = Recall Challenge? Rapid Fire, Word Builder giữ hay bỏ? |
| C-09 | Source Learn page | "How a session works": Discover / Recognize / Build / Recall (4 bước) | 5 Stage | Cập nhật copy UI |
| C-10 | Source session complete | "They'll show up in tomorrow's review" | Card eligibility PENDING | OD-06 |
| C-11 | Source Kanji flow | Kanji độc lập: Introduction, Reading (Hán Việt) recognition, Meaning recognition, Component assembly, Recall Hán Việt | Skill/Stage Kanji độc lập PENDING | Có dùng flow v0 làm điểm xuất phát? |
| C-12 | PLAN-01 §6 | Out of scope: "Memorize toàn bộ On/Kun" | Kanji chứa readings | Không mâu thuẫn trực tiếp; phạm vi readings PENDING |
| C-13 | Source `VocabItem` | `word` bắt buộc, không mô hình từ chỉ có Kana | Từ chỉ có Kana bỏ qua Stage 3–4 | Data model |
| C-14 | Tên dự án | `package.json` "my-project", title "Nihongo", thư mục `nihongo-app-design` | "Projap" | Thống nhất tên? |
| C-15 | ARCH-03 §10.3, UX-01 §7.1 (V5) | "Vocabulary là đơn vị chính"; mode Kanji riêng bị coi là mâu thuẫn, D-10 hỏi giữ/ẩn/hoãn | V6 CONFIRMED có module Kanji độc lập (flow PENDING) | D-10 nên đóng thành "giữ"; chỉ còn mở phần flow (OD-05) và thời điểm (P0/P1) |
| C-16 | UX-01 UXI-03, UXI-04; PLAN-01 | Chữ "Lesson" và "Lesson 4 — School life" bị coi là trái nguyên tắc "không theo bài học cố định" | V6 dùng **Daily Lessons**; Learning Path chủ đề đang cân nhắc | Xác nhận: "Lesson" = phiên động ~5 phút, không phải chuỗi bài cố định. UXI-03/04 cần diễn giải lại |
| C-17 | ARCH-03, UX-01 | Tên "Learn Today" + Daily Session Planner, tồn tại song song với Learn | V6: "Daily Lessons" là module A | Learn Today = Daily Lessons? Có còn trang Learn riêng (học tự do từ Library) không? |
| C-18 | ARCH-03 §6.1, UX-01 FG-07 (V5) | Không tách Hán Việt từng chữ; Stage 3 không giới thiệu từng chữ Kanji với On/Kun | V6 Stage 3: Kanji + Hán Việt toàn từ (khớp). Nhưng module Kanji độc lập học từng chữ | Stage 3 có hiển thị từng chữ (学 HỌC, 校 HIỆU) làm ngữ cảnh không, hay chỉ cả từ? |
| C-19 | ARCH-03 §10.1 | Task "SPEC-01 Learning Flow V5 spec" vào `docs/specs/` | PROJECT_SPEC §5 đã mô tả V6 | SPEC-01 còn cần file riêng hay PROJECT_SPEC thay thế? |
| C-20 | ARCH-03 §7.3 | "Đạt Stage 5 → eligible for FSRS" | Card eligibility chưa chốt | OD-06 |
| C-21 | UX-01 FG-06 | Free Recall Kana "không nhận romaji" (theo V5) | V6 chỉ nói Romaji không phải skill | OD-12 |

---

## 13. MVP Scope

### 13.1 P0 — bắt buộc cho MVP

| ID | Hạng mục | Nhãn |
| --- | --- | --- |
| P0-01 | Giữ và nối UI v0 (shell, theme, components) với dữ liệu thật | CONFIRMED (reuse) |
| P0-02 | Supabase Auth, một learner, sync desktop/mobile | CONFIRMED |
| P0-03 | Schema + seed N5 Vocabulary/Kanji + quan hệ; Library đọc DB | CONFIRMED (content), PROPOSED (seed size) |
| P0-04 | Daily Lessons ~5 phút với Learning Queue và 5 Stage cho Vocabulary | CONFIRMED |
| P0-05 | 4 Skill, checkpoint theo threshold khởi đầu, attempt log, hint tracking | CONFIRMED |
| P0-06 | Pause/Resume không mất bằng chứng | CONFIRMED (yêu cầu), cơ chế PENDING |
| P0-07 | FSRS Review với 4 rating, server-authoritative, review log | CONFIRMED |
| P0-08 | Dashboard từ dữ liệu thật (due, tiến độ hôm nay, đã học) | PROPOSED |
| P0-09 | Import Vocabulary CSV/JSON (validate, preview) | CONFIRMED |
| P0-10 | Backup/restore learner data | CONFIRMED |
| P0-11 | Settings lưu và đồng bộ | PROPOSED |
| P0-12 | Quality baseline: typecheck không bỏ qua, unit test domain logic, không commit secret | PROPOSED |

### 13.2 P1

| ID | Hạng mục | Nhãn |
| --- | --- | --- |
| P1-01 | Practice/Mini-games đầy đủ danh sách V6 + practice logs | CONFIRMED tính năng; ưu tiên P1 là PROPOSED |
| P1-02 | Module Kanji độc lập đầy đủ (sau khi chốt taxonomy) | PROPOSED |
| P1-03 | Learning Path theo chủ đề (nếu chọn) | PENDING |
| P1-04 | Progress charts, achievements, XP/streak thật | PROPOSED |
| P1-05 | Import Kanji, import history, rejection report | PROPOSED |
| P1-06 | Backup management nâng cao | PROPOSED |

Ghi chú: nếu chủ dự án muốn ít nhất một mini-game trong P0 (vd. Speed Matching với practice log), cần chốt — OD-15.

### 13.3 Out of Scope (MVP)

N4–N1; Grammar, Listening, Speaking; nhận dạng nét viết tay; gõ Kanji bằng IME là bắt buộc; multi-user/admin; social/leaderboard; AI tutor; offline-first/PWA; native app; Light theme/redesign; microservices.

### 13.4 Acceptance Criteria (MVP)

**Daily Lessons & Learning Queue**

- [ ] Một Lesson mặc định kết thúc trong khoảng ~5 phút với người học bình thường.
- [ ] `学校` đi được từ Stage 1 → 5 qua nhiều Lesson; `これ` (chỉ Kana) đi 1 → 2 → 5.
- [ ] Checkpoint Stage 2/4/5 chỉ đạt khi đủ lượt đúng độc lập theo cấu hình V1.
- [ ] Câu đúng có hint/xem đáp án được lưu nhưng không tính checkpoint.
- [ ] Trả lời sai không làm giảm Stage hay xóa checkpoint đã đạt; skill sai xuất hiện lại sau ít nhất một câu khác.
- [ ] Refresh giữa Lesson không mất Attempt đã trả lời; mở trên thiết bị khác thấy cùng Stage.
- [ ] Không câu nào cùng từ + cùng skill được tính hai lượt liên tiếp.

**FSRS Review**

- [ ] Due queue chỉ chứa card có `due <= now` (theo time policy đã chốt).
- [ ] Mỗi rating tạo đúng state/due theo FSRS version đã chọn; review log được append.
- [ ] Submit trùng không áp dụng hai lần.
- [ ] Practice và Daily Lesson không thay đổi `due` của bất kỳ card nào.

**Persistence / Auth**

- [ ] Người chưa đăng nhập không đọc/ghi learner data.
- [ ] Cùng tài khoản trên PC và mobile thấy cùng tiến độ sau reload.
- [ ] Không có secret trong Git hoặc client bundle.

**Import / Backup**

- [ ] CSV/JSON hợp lệ được preview đúng số dòng; dòng lỗi có lý do và vị trí.
- [ ] Backup vừa export restore được về cùng progress/review state; file không hợp lệ không làm đổi dữ liệu.

**UI / Quality**

- [ ] Các route v0 vẫn render trên desktop và mobile; không overflow ngang ở 320–390 px.
- [ ] Không màn hình production nào import `lib/mock-data.ts`.
- [ ] Typecheck và build pass khi tắt `ignoreBuildErrors`; domain logic có unit test.

---

## 14. Open Decisions

| ID | Quyết định | Phương án / câu hỏi | Ảnh hưởng | Cần trước |
| --- | --- | --- | --- | --- |
| **OD-01** | Learning Path hay Fully Dynamic Lessons | (a) Path theo chủ đề cố định; (b) hoàn toàn động theo tiến độ; (c) lai: path chọn tập từ, queue động bên trong | Planner, content schema (topic/tag), Dashboard | SPEC-02 (trước DB-01: có bảng topic không) |
| **OD-02** | FSRS Card Taxonomy | 1 card tổng hợp / 2 card (Meaning, Reading) / 4 card theo Skill; card Kana-only; card Kanji độc lập | `review_cards`, số review/ngày | SPEC-03, DB-01 |
| **OD-03** | Learning Queue Algorithm | Cách chọn câu tiếp theo, trọng số skill yếu, độ dài khoảng xen kẽ, số lần lặp tối đa | Learning engine | SPEC-02 |
| **OD-04** | Định nghĩa "độc lập" và "khoảng cách" | Số câu xen giữa tối thiểu; có tính theo thời gian/phiên khác không | Checkpoint evaluation | SPEC-01 |
| **OD-05** | Independent Kanji Learning Flow | Skill taxonomy, Stage, checkpoint cho Kanji; dùng flow v0 làm cơ sở? Quan hệ với tiến độ Kanji trong Vocabulary | Kanji module, schema | SPEC-04 |
| **OD-06** | Card eligibility | E1 sau Stage 5 / E2 theo skill checkpoint / E3 tạo sớm, active sau | Nối Daily Lessons → Review | SPEC-03 |
| **OD-07** | Session persistence | Resume chính xác (lưu queue) vs session mới từ state | `learning_sessions`, UX | SPEC-02, DB-01 |
| **OD-08** | Daily Session Planner | Số từ mới/phiên, tỷ lệ mới/cũ, giới hạn/ngày, tách Vocab/Kanji | Settings, Dashboard | SPEC-02 |
| **OD-09** | Database schema chi tiết | ERD, kiểu dữ liệu, index, RLS, content dùng chung hay theo user | Toàn bộ backend | Trước migration |
| **OD-10** | Skill strength | Công thức; Practice/Review có cập nhật không | Weak items, queue | SPEC-02 |
| **OD-11** | Từ Katakana và okurigana | S2 với Katakana; Kanji Assembly/Hán Việt cho từ như 休む | Content model, exercises | SPEC-01, DATA-01 |
| **OD-12** | Romaji | Chuẩn `gakkō` vs `gakkou`; Free Recall Kana có chấp nhận Romaji; ẩn/hiện Romaji | Content, answer matching | SPEC-01 |
| **OD-13** | Kanji Recall trong Stage 5 (không IME) | Assembly không gợi ý? Chọn từ nhiều distractor hơn? Tự đánh giá? | Exercise design | SPEC-01 |
| **OD-14** | Đáp án Free Recall Meaning/Hán Việt | Đồng nghĩa, chấp nhận gần đúng, nhiều nghĩa | Answer matching | SPEC-01 |
| **OD-15** | Practice trong P0 hay P1 | Có cần ít nhất một game có log trong MVP | Roadmap | Phase plan |
| **OD-16** | Kỹ thuật: duyệt ADR-003…007 của ARCH-03; atomic review (D-04: Postgres RPC hay transaction server) | ADR-005 đề xuất Server Actions cho mutation UI, Route Handlers cho file/auth callback | Kiến trúc | AUTH-01, REVIEW-01 |
| **OD-17** | Kỹ thuật: FSRS library & parameters | `ts-fsrs`? version, desired retention, optimize | Review | SPEC-03 |
| **OD-18** | Kỹ thuật: Auth UX & one-account | Email/password, magic link, OAuth; tắt signup/allowlist | Auth | AUTH-01 |
| **OD-19** | Kỹ thuật: Time policy | Timezone nghiệp vụ (UTC+7?), ranh giới "ngày học" | Due, streak, quota | SPEC-03 |
| **OD-20** | Kỹ thuật: Deployment & environments | Vercel + Supabase Cloud? Region; local/preview/prod | Hạ tầng | Release |
| **OD-21** | Kỹ thuật: Test stack | Vitest/Jest, E2E (Playwright?) | Quality | QA-01 |
| **OD-22** | Import/Backup policy | Duplicate identity, conflict, restore replace/merge, mã hóa backup | Import/Export | DATA-01, BACKUP-01 |
| **OD-23** | Learn Today vs Learn (C-17) | Daily Lessons có thay toàn bộ Learn không; giữ lối "học tự do" (Library → "Học từ này", UXI-10)? | Navigation, routes | LEARN-01 |
| **OD-24** | Mức server grading (ARCH-03 D-07) | Gửi đáp án xuống client để feedback tức thì hay chấm hoàn toàn trên server | Latency, DTO | LEARN-01 |
| **OD-25** | Giữ hay bỏ `@vercel/analytics` (D-09) | Quyền riêng tư dữ liệu học | Hosting | Release |
| **OD-26** | Ngôn ngữ giao diện (D-13, UXI-17) | Copy tiếng Anh hay tiếng Việt; `lang` | Toàn bộ copy UI | LEARN-01 |
| **OD-27** | Thời điểm module Kanji độc lập (C-15) | P0 hay P1 | Roadmap | SPEC-04 |

**Ánh xạ với `docs/architecture.md` §10.2:** D-01 → OD-20 · D-02 → OD-18 · D-03 → OD-17 · D-04 → OD-16 (atomic review) · D-05 → OD-19 · D-06 → OD-07 · D-07 → OD-24 · D-08 → OD-20 · D-09 → OD-25 · D-10 → OD-05/OD-27 (phần "giữ module" đã CONFIRMED bởi V6) · D-11 → OD-03 · D-12 → OD-02 · D-13 → OD-26.

---

## 15. Development Roadmap

> Task ID **dùng lại bộ mã đã đề xuất trong ARCH-03 §10.1** để tránh hai hệ thống tên. Thứ tự dưới đây đã điều chỉnh theo V6 và vẫn là **PROPOSED**. Mỗi task: inspect → plan → **chờ duyệt** → implement.

### 15.1 Các giai đoạn

| Phase | Task | Mục tiêu | Ghi chú V6 |
| --- | --- | --- | --- |
| 0 — Docs | **GIT-03** | Commit `docs/` (5 file) + tạo `CLAUDE.md` trên branch docs, PR, review, merge | Cập nhật header "Draft" của ARCH-03/UX-01 |
| 1 — Quyết định học tập | **SPEC-01** Learning Flow V6 | Chốt các điểm còn mở của §5: OD-04, OD-11, OD-12, OD-13, OD-14; quyết định SPEC-01 là file riêng hay chính §5 (C-19) | |
| | **SPEC-02** Learning Queue + Daily Session Planner | OD-03, OD-07, OD-08, OD-10, OD-01 | Gộp planner vào đây vì Daily Lessons là module chính trong V6 |
| | **SPEC-03** FSRS Card Taxonomy | OD-02, OD-06, OD-17, OD-19 | |
| | **SPEC-04** Kanji độc lập *(mới)* | OD-05, OD-27 | Có thể sau MVP nếu OD-27 = P1 |
| 2 — Quality | **QA-01** | Scripts `typecheck`/`lint`/`test`, kế hoạch bỏ `ignoreBuildErrors`, chọn test stack (OD-21) | Làm song song Phase 1 |
| 3 — Database | **DB-01** | ERD + migration + RLS + test RLS, dựa trên §10 | Cần SPEC-01…03 |
| 4 — Hạ tầng | **AUTH-01** | `@supabase/ssr`, `proxy.ts`, login, DAL `getCurrentUser`, `.env.example` | OD-18, OD-16 |
| 5 — Content | **DATA-01** | Seed N5 nhỏ (gồm từ Kana-only để test nhánh Stage 1→2→5), schema import | |
| 6 — Engine thuần | *(trong LEARN-01 hoặc tách)* | Checkpoint evaluator, queue, grading — unit test với `学校`, `これ` | Có thể làm trước DB-01 |
| 7 — Daily Lessons | **LEARN-01** | Vertical slice: phiên ~5 phút, attempt lưu server, checkpoint, khóa StageTrack (UXI-01), resume | |
| | **TODAY-01** | Màn Daily Lessons/Learn Today, "học thêm phiên", summary thật | Có thể gộp vào LEARN-01 tùy OD-23 |
| 8 — Review | **REVIEW-01** | FSRS adapter, card generation, due queue, transaction, idempotency, empty state | |
| 9 — Dashboard | **DASH-01**, **SETTINGS-01** | Số liệu thật, empty state; settings persist | |
| 10 — Data portability | **BACKUP-01**, import (trong DATA-01 hoặc tách) | Backup/restore versioned, atomic; import CSV/JSON có preview | |
| 11 — Library & Practice | **LIB-01**, **PRACTICE-01** | Chi tiết từ, "Học từ này"; practice logs + mini-games V6 | |
| 12 — Kanji | **KANJI-01** *(mới)* | Module Kanji độc lập theo SPEC-04 | |
| 13 — Release | **QA-02** *(mới)* | Runtime QA 320/390/1440 px, E2E critical flow, deploy (OD-20) | |

### 15.2 Dependency giữa các task

```mermaid
flowchart TD
    GIT03[GIT-03 Commit docs + CLAUDE.md]
    SPEC01[SPEC-01 Learning Flow V6] --> SPEC02[SPEC-02 Queue + Planner]
    SPEC01 --> SPEC03[SPEC-03 FSRS Card Taxonomy]
    SPEC01 --> SPEC04[SPEC-04 Kanji flow]
    SPEC02 --> DB01[DB-01 Schema + RLS]
    SPEC03 --> DB01
    QA01[QA-01 Quality baseline] --> LEARN01
    DB01 --> AUTH01[AUTH-01 Supabase Auth]
    DB01 --> DATA01[DATA-01 Seed + import schema]
    AUTH01 --> LEARN01[LEARN-01 Daily Lessons slice]
    DATA01 --> LEARN01
    SPEC02 --> LEARN01
    LEARN01 --> TODAY01[TODAY-01 Daily Lessons screen]
    LEARN01 --> REVIEW01[REVIEW-01 FSRS Review]
    SPEC03 --> REVIEW01
    LEARN01 --> DASH01[DASH-01 Dashboard]
    REVIEW01 --> DASH01
    AUTH01 --> SET01[SETTINGS-01]
    DB01 --> BK01[BACKUP-01]
    LEARN01 --> LIB01[LIB-01]
    LEARN01 --> PR01[PRACTICE-01]
    SPEC04 --> KJ01[KANJI-01]
    DB01 --> KJ01
    DASH01 --> QA02[QA-02 Release]
    BK01 --> QA02
```

Engine thuần (checkpoint/queue/grading) không phụ thuộc database, có thể code + test ngay sau SPEC-01/02.

### 15.3 Next Recommended Actions

1. **Review PROJECT_SPEC** và trả lời các mâu thuẫn §12.6 — ưu tiên C-15, C-16, C-17, C-19 vì chúng quyết định cách đặt tên và cấu trúc module.
2. **GIT-03:** commit năm tài liệu `docs/` lên branch docs và thêm `CLAUDE.md` trỏ tới PROJECT_SPEC (cần chủ dự án duyệt).
3. **SPEC-03 + SPEC-02 (một phần):** chốt OD-02 (Card Taxonomy), OD-06 (eligibility), OD-07 (session persistence) — đầu vào bắt buộc của DB-01.
4. **SPEC-01:** chốt OD-11/OD-12 (Katakana, okurigana, Romaji) để seed data không phải sửa lại.
5. **Duyệt ADR-003…007** trong ARCH-03 (OD-16), chọn phương thức đăng nhập (OD-18) và time policy (OD-19).
6. Song song: **QA-01** và engine thuần với unit test cho `学校` và `これ`.

---

## 16. Glossary

| Thuật ngữ | Định nghĩa trong Projap |
| --- | --- |
| **Lesson** | Một Daily Lesson / Learning Session ~5 phút gồm nhiều câu hỏi lấy từ Learning Queue, trộn nhiều từ và skill. Hoàn thành Lesson không bắt buộc từ nào lên Stage. |
| **Stage** | Một trong 5 bước tiến trình của **một Vocabulary**: 1 Introduction, 2 Kana Learning, 3 Kanji & Hán Việt Introduction, 4 Mixed Learning, 5 Retrieval Check. |
| **Skill** | Năng lực ghi nhớ của một từ: S1 Meaning, S2 Kana, S3 Kanji, S4 Hán Việt (toàn từ). Romaji không phải Skill. |
| **Exercise Type** | Dạng câu hỏi: Recognition (chọn), Assembly (ghép), Flashcard Active Recall, Free Recall (gõ), Introduction. |
| **Checkpoint** | Điều kiện bằng chứng để hoàn thành một Stage; khi đạt thì được giữ, không mất khi sai sau đó. |
| **Attempt** | Một lần trả lời một câu trong Daily Lesson, kèm đúng/sai, hint, xem đáp án; append-only. |
| **Independent correct** | Attempt đúng, không hint, không xem đáp án, đã xen kẽ với câu khác — loại duy nhất tính vào checkpoint. |
| **Learning Queue** | Bộ máy chọn và sắp xếp câu hỏi trong Lesson: trộn từ/skill/exercise, lặp skill chưa đạt sau khi xen kẽ. |
| **Daily Session Planner** | Phần quyết định tập từ và mục tiêu cho một Lesson (PENDING). |
| **Review Card** | Đơn vị FSRS lên lịch, gắn với một Vocabulary/Kanji và một mục tiêu ghi nhớ. |
| **Official Review** | Phiên ôn trong module FSRS Review; nguồn duy nhất cập nhật FSRS state. |
| **FSRS** | Free Spaced Repetition Scheduler — thuật toán lên lịch ôn dựa trên stability/difficulty, nhận rating Again/Hard/Good/Easy. |
| **Practice** | Luyện tập tự do/mini-game; lưu practice log; không đổi lịch FSRS. |
| **Progress** | Tổng hợp trạng thái học: Stage, checkpoint, skill strength, số card, lịch sử — luôn truy vết được về attempt/review log. |
| **Skill strength** | Mức mạnh hiện tại của một skill, biến động theo kết quả gần đây; khác với checkpoint. |
| **Initial learning complete** | Từ đã đạt checkpoint Stage 5. Không đồng nghĩa với Mastery. |
| **Mastery** | Ghi nhớ dài hạn ổn định, được phản ánh qua FSRS (vd. stability cao) chứ không qua một phiên học. Định nghĩa định lượng: PENDING. |
| **Hán Việt** | Âm đọc Hán Việt; trong Vocabulary là của **toàn bộ từ** (学校 → HỌC HIỆU). |
| **CONFIRMED / PROPOSED / PENDING / IMPLEMENTED** | Nhãn trạng thái — xem đầu tài liệu. |

---

## Phụ lục — Quy tắc bảo trì tài liệu

1. Khi một Open Decision được chốt: đổi nhãn PENDING → CONFIRMED tại chỗ, ghi ADR, xóa/đánh dấu dòng trong §14.
2. Khi một tính năng được merge: cập nhật §12 với bằng chứng (file/commit), đổi PROPOSED → IMPLEMENTED.
3. Không ghi API key, password, URL project bí mật vào tài liệu.
4. Mỗi thay đổi lớn tăng phiên bản ở đầu tài liệu.
