# ARCH-02 — Audit giao diện và source v0

> Trạng thái: Verified source audit
>
> Ngày audit: 2026-10-14
>
> Source: commit `afbd50d` (`chore: import original v0 UI`)
>
> Phạm vi: chỉ đọc `app/`, `components/`, `lib/` và các file cấu hình; không đánh giá một backend chưa tồn tại.

## 1. Mục đích và cách đọc tài liệu

Tài liệu này trả lời câu hỏi: **source v0 hiện có gì, phần nào thực sự hoạt động trong browser, và phần nào mới chỉ là demo**. Các nhận định dưới đây là sự thật đã kiểm tra trực tiếp từ source, trừ nơi được ghi rõ là đề xuất.

Quy ước:

- **Functional UI**: có tương tác client-side hoạt động, nhưng chưa mặc nhiên có persistence.
- **Demo-only**: hiển thị hoặc tương tác bằng mock data/React state, không phản ánh dữ liệu thật sau refresh.
- **Placeholder**: có card/nút/route trình bày ý tưởng nhưng feature riêng chưa được triển khai.

## 2. Kiến trúc và technology stack đã xác nhận

### 2.1 Stack

| Lớp | Công nghệ đã xác nhận | Bằng chứng |
| --- | --- | --- |
| Framework | Next.js 16.4.0, App Router | `package.json`; cấu trúc `app/` |
| UI runtime | React 19 | `package.json` |
| Ngôn ngữ | TypeScript 5.7.3, `strict: true` | `package.json`, `tsconfig.json` |
| Styling | Tailwind CSS 4.3.3 + PostCSS | `package.json`, `postcss.config.mjs` |
| UI primitives | Base UI, shadcn configuration | `@base-ui/react`, `shadcn`, `components.json` |
| Icons | Lucide React | `package.json` và imports trong pages/components |
| Animation | `tw-animate-css` và keyframes tùy chỉnh | `app/globals.css` |
| Package manager | pnpm 12.3.4 | `packageManager` và `pnpm-lock.yaml` |
| Analytics | Vercel Analytics, chỉ render ở production | `app/layout.tsx:1`, `app/layout.tsx:35` |
| Backend/API/database | Chưa có | Không có Route Handler, `fetch`, database client hay data-access module |
| Authentication | Chưa có | Không có auth dependency, session hoặc protected route |
| SRS | Chưa có FSRS thật | Rating interval đang hard-code trong `lib/learning-engine.ts:228-233` |

`next.config.mjs` đang đặt `typescript.ignoreBuildErrors: true`. Đây là rủi ro chất lượng vì production build có thể bỏ qua TypeScript error. Việc thay đổi cấu hình này không thuộc task audit.

### 2.2 Kiến trúc runtime hiện tại

```text
Browser
├── Server Components: page/layout tĩnh và đọc mock data trực tiếp
├── Client Components: local React state, timer, form, exercise interaction
└── Không có HTTP/data boundary
          │
          v
lib/mock-data.ts + pure in-memory helpers
          │
          └── Không database, không sync, không persistence
```

Root layout cấu hình metadata, Inter/Noto Sans JP và Vercel Analytics. Route group `(main)` cung cấp shell dùng chung gồm desktop sidebar, mobile top bar và mobile bottom navigation (`app/(main)/layout.tsx`). Các full-screen session nằm ngoài route group này.

## 3. Tất cả pages và routes

| Route | Source | Nội dung | Trạng thái thực tế |
| --- | --- | --- | --- |
| `/` | `app/(main)/page.tsx` | Dashboard | Demo-only; toàn bộ số liệu từ `userProfile` và `vocabulary` mock |
| `/learn` | `app/(main)/learn/page.tsx` | Tổng quan Vocabulary/Kanji | Demo-only; progress/count mock, links sang session hoạt động |
| `/library` | `app/(main)/library/page.tsx` | Thư viện Vocabulary/Kanji | Functional UI trên mock data; search và đổi tab hoạt động |
| `/review` | `app/(main)/review/page.tsx` | Due count và forecast | Demo-only; due/retention/forecast hard-code hoặc mock |
| `/practice` | `app/(main)/practice/page.tsx` | Danh sách game và settings | Mixed; chỉ Speed Matching có game riêng |
| `/progress` | `app/(main)/progress/page.tsx` | Statistics, activity, achievement | Demo-only; dữ liệu mock |
| `/settings` | `app/(main)/settings/page.tsx` | Daily goal và switches | Functional UI nhưng state chỉ tồn tại trong component |
| `/learn/session?mode=vocab` | `app/learn/session/page.tsx` | Progressive Vocabulary session | Functional demo; dùng 2 từ hard-code, kết quả chỉ trong memory |
| `/learn/session?mode=kanji` | `app/learn/session/page.tsx` | Progressive Kanji session | Functional demo; dùng 3 Kanji hard-code, kết quả chỉ trong memory |
| `/review/session` | `app/review/session/page.tsx` | Review cards và 4 ratings | Functional demo; queue mock, không FSRS/persistence |
| `/practice/speed-matching` | `app/practice/speed-matching/page.tsx` | Speed Matching 60 giây | Functional demo; vocabulary mock, score không được lưu |

Không có route `/kanji` riêng. Kanji hiện được truy cập qua `/learn` và query `mode=kanji`.

## 4. Reusable UI components nên giữ lại

### 4.1 Application shell và navigation

- `components/nav/app-sidebar.tsx`: desktop sidebar, active-route state.
- `components/nav/mobile-top-bar.tsx`: navigation trên mobile.
- `components/nav/mobile-bottom-nav.tsx`: bottom navigation trên mobile.
- `components/nav/nav-items.ts`: một nguồn cấu hình navigation dùng chung.
- `components/page-header.tsx`: heading/eyebrow/description nhất quán.

### 4.2 Shared design primitives

- `components/action-button.ts`: variants cho button/link CTA.
- `components/progress-bar.tsx`: progress indicator tái sử dụng.
- `components/ui/button.tsx`: UI button primitive.
- `components/sparkles.tsx`: decoration dùng trong visual language hiện tại.
- `lib/utils.ts`: `cn()` kết hợp `clsx` với `tailwind-merge`.
- `lib/tones.ts`: màu semantic dùng xuyên suốt UI.

### 4.3 Learning components

- `components/learning/learning-session.tsx`: session orchestrator và step renderer.
- `components/learning/stage-track.tsx`: hiển thị/chuyển stage.
- `components/learning/session-header.tsx`, `session-complete.tsx`: full-screen session shell.
- `components/learning/exercise-panel.tsx`, `exercise-footer.tsx`, `prompt-display.tsx`, `answer-option.tsx`: cấu trúc exercise chung.
- `components/learning/steps/*`: Flashcard, Choice, Assembly, Kanji Intro và Recall.
- `components/learning/japanese-flashcard.tsx`: flip interaction và typography tiếng Nhật.

Các component này đã encode phần lớn visual system, responsive behavior và interaction pattern của v0. Khi nối dữ liệu thật, nên thay nguồn data/callback ở boundary thay vì viết lại UI.

### 4.4 Review, game, dashboard và settings

- Review: `review-session.tsx`, `review-card-view.tsx`, `review-rating-buttons.tsx`.
- Practice: `game-card.tsx`, `game-settings.tsx`, `speed-matching-game.tsx`.
- Dashboard: `greeting.tsx`, `review-hero-card.tsx`, `dashboard-stat-card.tsx`, `learning-card.tsx`, `daily-progress.tsx`, `quick-training.tsx`.
- Library: `library-browser.tsx`.
- Settings: `settings-form.tsx`.

## 5. Learning và game logic hiện có

### 5.1 Learning engine

`lib/learning-engine.ts` là pure in-memory module và có các phần có thể tái sử dụng:

- Deterministic shuffle (`shuffle`) để server/client render cùng thứ tự.
- Normalize và so sánh recall answer (`normalizeAnswer`, `isRecallCorrect`).
- Type-safe exercise definitions thông qua `LearningStep` trong `lib/types.ts`.
- Vocabulary flow gồm Introduction, Hiragana Recognition, Kana Assembly, Kanji Introduction, Kanji Recognition, Kanji Assembly và Recall.
- Kanji flow gồm Introduction, Reading Recognition, Meaning Recognition, Component Assembly và Recall.
- Builder sinh `ChoiceStep`, `AssemblyStep`, `RecallStep` từ `VocabItem`/`KanjiItem`.

Phần không thể coi là production logic:

- `buildLearningSession()` chọn cố định 3 Kanji `k-gaku`, `k-yasu`, `k-mei` (`lib/learning-engine.ts:219-222`).
- Vocabulary session chọn cố định `v-gakkou`, `v-jikan` (`lib/learning-engine.ts:224-225`).
- Không có learning queue, unlock rule, quota, mastery threshold hoặc persisted skill state.
- `LearningSession` giữ `index`, `results` và `run` bằng `useState` (`components/learning/learning-session.tsx:32-34`); refresh sẽ mất kết quả.

### 5.2 Review logic

`components/review/review-session.tsx` hỗ trợ reveal answer, rating Again/Hard/Good/Easy, keyboard shortcuts Space/Enter và 1–4, completion summary và restart.

Tuy nhiên rating chỉ được append vào local state; không có request hoặc storage. Các interval `<1m`, `6m`, `1d`, `4d` là constant trong `lib/learning-engine.ts:228-233`, không phải kết quả FSRS.

### 5.3 Speed Matching

`lib/speed-matching.ts` tạo board từ mock vocabulary, shuffle hai cột và thay cặp đúng bằng item tiếp theo. `components/practice/speed-matching-game.tsx` quản lý timer, selection, score, combo, mistake và restart.

Game có interaction thật nhưng:

- Duration hard-code 60 giây (`speed-matching-game.tsx:11`).
- Chỉ dùng vocabulary mock, không lọc theo item người dùng đã học.
- Không ghi practice log hoặc đồng bộ kết quả.
- `GameSettings` chỉ đổi React state, chưa cấu hình game đang chạy.

## 6. Mock data và hard-coded values

Nguồn chính là `lib/mock-data.ts`:

- 16 vocabulary N5.
- 12 Kanji N5.
- 8 review cards.
- Một profile tên `Minh` với streak, quota, learned totals và retention giả.
- Weekly activity và achievements giả.
- `strength` của từng từ là số hard-code, không được tính từ review history.

Các hard-coded value khác:

- Dashboard: estimated 14 phút, 8 từ mới, 3 Kanji mới và streak-week count 4 (`app/(main)/page.tsx:17`, `:56`, `:65`, `:82`).
- Learn overview: “5 words”, “3 characters” và bốn stage mô tả tĩnh (`app/(main)/learn/page.tsx:6-11`, `:22-34`).
- Review forecast: 31 ngày mai, 18 trong 3 ngày, 96 trong tuần (`app/(main)/review/page.tsx:9-14`).
- Practice catalog: Rapid Fire và Recall Sprint trỏ lại `/practice`, không có route riêng (`app/(main)/practice/page.tsx:17-24`, `:35-42`).
- Settings goals: 10/20/30/50, default 30 (`components/settings/settings-form.tsx:30-33`).

## 7. Bằng chứng ít nhất ba screen dùng mock data

### 7.1 Dashboard `/`

- Import trực tiếp `userProfile, vocabulary` từ mock: `app/(main)/page.tsx:8`.
- Due count, learned totals, retention và daily goal đều đọc từ profile mock: `:15-38`, `:82`.
- Weak count được tính từ `vocabulary[].strength` hard-code: `:11`.

### 7.2 Review `/review` và `/review/session`

- Overview import `reviewQueue, userProfile`: `app/(main)/review/page.tsx:6`.
- Forecast tương lai hard-code: `app/(main)/review/page.tsx:9-14`.
- Session nhận nguyên `reviewQueue` mock: `app/review/session/page.tsx:3`, `:8`.

### 7.3 Progress `/progress`

- Import `achievements`, `userProfile`, `weeklyActivity`: `app/(main)/progress/page.tsx:4`.
- Stats và chart được tính hoàn toàn từ các array/object mock: `:8-17`.

### 7.4 Library `/library`

- `LibraryBrowser` import trực tiếp `kanjiList, vocabulary`: `components/library/library-browser.tsx:5`.
- Search chỉ filter arrays trong memory: `:21-31`.

### 7.5 Learning và Speed Matching

- Learning engine import mock source: `lib/learning-engine.ts:1`.
- Speed Matching import mock vocabulary: `lib/speed-matching.ts:2`.

## 8. Functional UI so với demo/placeholder

| Khu vực | Tương tác hiện có | Giới hạn demo |
| --- | --- | --- |
| Navigation/responsive shell | Hoạt động | Không có auth/protected routes |
| Library | Tab và search hoạt động | Chỉ search mock arrays |
| Vocabulary/Kanji session | Năm loại exercise, feedback, progress, restart | Item cố định; kết quả mất khi refresh |
| Review session | Reveal, keyboard, 4 ratings, completion | Không FSRS, due date hoặc save |
| Speed Matching | Timer, matching, score/combo/mistake | Không practice log; mock content |
| Settings | Buttons/switches thay đổi | Không persist; không tác động feature khác |
| Dashboard/Progress | Render và responsive | Số liệu giả |
| Rapid Fire | Card marketing | Placeholder, quay lại `/practice` |
| Recall Sprint | Card marketing | Placeholder, quay lại `/practice` |
| Word Builder | Link sang learning session | Không phải game/session độc lập |

## 9. API, backend và database integrations

Đã search trong `app/`, `components/`, `lib/` và dependencies:

- Không có `app/api/**/route.ts`.
- Không có `fetch`, Axios hoặc server action (`'use server'`).
- Không có Supabase, Firebase, Prisma, Drizzle, ORM hoặc database driver.
- Không có environment variable nghiệp vụ; chỉ kiểm tra `NODE_ENV` để bật Analytics production.
- Không có localStorage/sessionStorage/IndexedDB.

Kết luận: **ứng dụng hiện là frontend prototype độc lập; browser refresh không thể giữ learning progress và hai thiết bị không thể đồng bộ**.

## 10. Code nên reuse thay vì rewrite

1. Giữ nguyên `app/globals.css`, font setup và token màu để bảo toàn Dark Theme.
2. Giữ navigation shell và responsive breakpoints.
3. Giữ các exercise components; đưa dữ liệu thật vào qua typed props/session model.
4. Giữ `LearningStep` union và pure answer/shuffle helpers; mở rộng bằng test thay vì thay toàn bộ.
5. Giữ Review/Session shells; thay local rating callback bằng application service/server mutation.
6. Giữ Speed Matching state machine; thay mock item selector và thêm practice-result boundary.
7. Giữ Dashboard cards, Library browser và Settings form; thay mock imports bằng query/view models.
8. Giữ `toneStyles`, `cn`, button variants và accessibility labels.

Không nên giữ nguyên dưới dạng production truth: mock IDs chọn cố định, hard-coded review intervals, fake retention/strength, forecast tĩnh và component-local settings/progress.

## 11. Đối chiếu với audit GIT-01

| Kết luận GIT-01 | Cross-check 2026-10-14 |
| --- | --- |
| Project root là `nihongo-app-design` | Xác nhận đúng |
| Next.js 16, React 19, TypeScript, Tailwind 4, pnpm | Xác nhận đúng từ `package.json`/lockfile |
| Có Dashboard, Learn, Library, Review, Practice, Progress, Settings | Xác nhận đúng từ App Router |
| Vocabulary/Kanji learning, Review và Speed Matching có interaction | Xác nhận đúng từ client components |
| Data/progress là mock hoặc local state | Xác nhận đúng; không có persistence API |
| Rapid Fire và Recall Sprint là placeholder | Xác nhận đúng từ href quay lại `/practice` |
| Không có backend/database/auth/FSRS | Xác nhận đúng |
| Dark Theme và responsive shell đã tồn tại | Xác nhận đúng từ CSS/layout/components |
| Repository chưa có Git | Chỉ đúng tại thời điểm GIT-01; hiện repo đã có commit `afbd50d` và remote `origin` |

## 12. Rủi ro cần quản lý ở các task sau

- Không đặt database calls trực tiếp rải rác trong presentational components; tạo data/application boundary rõ.
- Không gọi practice score là SRS review; hai loại event có semantics khác nhau.
- Không tính “mastered” chỉ từ một session client-side.
- Không để `ignoreBuildErrors` trở thành quality gate dài hạn.
- Cần test cho `learning-engine.ts`, answer normalization, queue selection, FSRS adapter và persistence flow.
- Cần kiểm tra overflow ở viewport rất hẹp khoảng 320 px trong Vocabulary Session; không redesign trước khi có task UI riêng.
- Khi thay mock data, giữ component contracts để giảm diff và tránh phá v0 design.
