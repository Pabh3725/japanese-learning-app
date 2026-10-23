# PLAN-01 — Phạm vi MVP Projap

> Trạng thái: **Hoàn thành — chủ dự án xác nhận**. Một số Open Decision đã được chốt sau đó; xem `docs/PROJECT_SPEC.md` §12.6 và §14.
>
> Ngày: 2026-10-14
>
> Nguyên tắc: phần **Confirmed** là yêu cầu đã được người dùng xác nhận; phần **Proposed** chưa phải quyết định kiến trúc cuối cùng.

## 1. Mục đích tài liệu

Tài liệu này định nghĩa **MVP cần giải quyết vấn đề gì và điều kiện nào chứng minh feature đã hoàn thành**. Nó không tự động chốt nhà cung cấp database, auth, deployment hoặc chi tiết data model. Những lựa chọn đó được liệt kê ở mục Open Decisions để chủ dự án quyết định trước implementation.

## 2. Confirmed product requirements

Các yêu cầu sau đã được xác nhận:

1. Đây là Personal Japanese Learning Web App cho một learner profile.
2. Nội dung ban đầu là JLPT N5; N4 được thực hiện sau.
3. Học cả Vocabulary và Kanji.
4. Kanji cần readings, Hán Việt và meanings.
5. Không ép người dùng theo chuỗi Lesson 1 → Lesson 2 cố định.
6. Có flashcard và progressive exercise stages.
7. Official review dùng FSRS-based spaced repetition.
8. Learning progress phải tồn tại sau browser refresh.
9. Progress phải đồng bộ giữa PC và mobile.
10. Có import vocabulary bằng CSV/JSON.
11. Có backup và restore user data.
12. Giữ nguyên visual language, Dark Theme, typography, layout và responsive behavior của UI v0.

Các yêu cầu trên không tự xác nhận một database provider, auth provider, hosting platform, FSRS library, import conflict policy hoặc mastery algorithm cụ thể.

## 3. Product principles cho MVP

- **Free learning, guided progression:** người học chọn Vocabulary hoặc Kanji; hệ thống chọn item/stage phù hợp mà không buộc theo lesson cố định.
- **Skill-specific progress:** một đáp án sai không reset toàn bộ item nếu những skill khác vẫn mạnh.
- **Official review khác practice:** FSRS review thay đổi lịch card; game/practice chỉ ghi practice result trừ khi có quyết định sản phẩm khác.
- **Server/data source is authoritative:** refresh hoặc đổi thiết bị không được làm mất lịch và progress đã lưu.
- **UI preservation:** thay data source và behavior ở boundary; không rewrite các v0 components đang tốt.
- **N5 depth before N4 breadth:** chứng minh full learning loop bằng một dataset N5 nhỏ, sạch trước khi mở rộng nội dung.

Hai nguyên tắc “skill-specific progress” và “practice khác official review” là **đề xuất kiến trúc sản phẩm** phù hợp mục tiêu học dài hạn; chủ dự án cần xác nhận ở Open Decisions.

## 4. Proposed P0 scope

P0 là phạm vi tối thiểu để sản phẩm có một learning loop thật, bền vững và đồng bộ.

### P0-1 — Preserve và connect v0 application shell

- Giữ navigation, responsive layout, theme token, typography và các reusable UI components.
- Thay mock imports bằng typed data/view-model boundaries theo từng feature.
- Không yêu cầu redesign hoặc theme mới.

### P0-2 — One learner identity và cross-device data access

- Một learner đăng nhập an toàn và truy cập cùng profile trên PC/mobile.
- Dữ liệu cá nhân không public dù ứng dụng được deploy trên Internet.
- Session hết hạn có behavior rõ, không âm thầm mất mutation.

Lựa chọn auth/provider chưa được chốt.

### P0-3 — N5 content model và library

- Lưu Vocabulary: Kanji spelling nếu có, kana, romaji tùy chọn, nghĩa tiếng Việt, Hán Việt, JLPT level.
- Lưu Kanji: character, Hán Việt, nghĩa, readings cần thiết và component/stroke metadata nếu có.
- Quan hệ Vocabulary–Kanji ổn định.
- Library search/filter đọc dữ liệu thật.
- Seed ban đầu có thể giới hạn khoảng 30–50 từ và 10–20 Kanji chất lượng.

### P0-4 — CSV/JSON vocabulary import

- Upload/submit file theo schema được công bố.
- Validate encoding, required fields, enum/length và duplicate.
- Preview kết quả trước khi ghi; báo rõ accepted/rejected rows.
- Import lặp không tạo duplicate ngoài ý muốn.

Import Kanji hàng loạt không được xác nhận là P0; có thể seed/manual ở MVP nếu chủ dự án đồng ý.

### P0-5 — Free learning queue và progressive exercises

- Người học chọn Vocabulary hoặc Kanji, không chọn lesson tuyến tính bắt buộc.
- Hệ thống lấy item mới/đang học theo quota và trạng thái.
- Reuse Flashcard, Choice, Assembly, Kanji Intro và Recall components hiện có.
- Ghi từng attempt và skill result vào persistent storage.
- Refresh giữa session không được biến item đã hoàn thành thành chưa từng học; chính sách resume session cần được quyết định.

### P0-6 — Skill-specific learning progress

- Track tối thiểu các mục tiêu recall cần thiết cho Vocabulary và Kanji.
- Stage/unlock dựa trên dữ liệu đã lưu, không chỉ component index.
- Có cách xác định weak skill/item cho learning queue và dashboard.
- Mastery rule phải versioned/configurable hoặc được mô tả rõ, không hard-code rải rác trong UI.

Chi tiết skill taxonomy và threshold chưa được chốt.

### P0-7 — FSRS official review

- Due queue lấy card đến hạn từ persistent storage.
- Again/Hard/Good/Easy được tính bằng một FSRS implementation đã chọn.
- Card state, due time và append-only review history được lưu.
- Duplicate submission không reschedule card hai lần.
- Server/trusted layer quyết định review time và lịch mới; browser không gửi state FSRS tùy ý.
- Vocabulary và Kanji đều có thể tạo review card.

### P0-8 — Dashboard và settings tối thiểu

- Dashboard hiển thị từ dữ liệu thật: due now, new quota/progress hôm nay, learned Vocabulary/Kanji và weak items tối thiểu.
- Daily quota được lưu và đồng bộ.
- Không yêu cầu advanced charts hoặc achievement engine trong P0.

### P0-9 — Backup và restore

- Export được toàn bộ dữ liệu do người dùng sở hữu cần để phục hồi learning state.
- Backup có schema/version và timestamp.
- Restore validate toàn file trước mutation.
- Có preview/summary và policy conflict rõ; failure không để dữ liệu ở trạng thái nửa restore.
- Không export password, access token hoặc provider secret.

### P0-10 — Quality, responsive và deployable baseline

- Critical flow hoạt động ở desktop và mobile.
- Có unit tests cho pure learning/FSRS logic và integration tests cho persistence boundary quan trọng.
- Type checking là quality gate; không dựa lâu dài vào `ignoreBuildErrors`.
- Có environment separation và không commit secrets.

Hosting/deployment provider chưa được chốt trong tài liệu này.

## 5. Proposed P1 scope

P1 chỉ bắt đầu sau khi learning → persistence → review → sync loop P0 ổn định.

1. Nối Speed Matching với learned/unlocked items và ghi practice logs riêng.
2. Rapid Fire thực sự, thay cho placeholder hiện tại.
3. Recall Sprint thực sự.
4. Weak-word prioritization tốt hơn dựa trên skill history.
5. Progress charts, weekly activity thật và achievement system.
6. Game settings thật sự ảnh hưởng game và được persist.
7. Advanced import history, downloadable rejection report và undo import có kiểm soát.
8. Richer backup management: danh sách backup, compare và selective restore.
9. Content-management workflow tiện hơn cho developer, nếu import file P0 chưa đủ.

N4 không nằm trong P1 mặc định của MVP này vì requirement nói “N4 later”; thời điểm bắt đầu N4 là product decision riêng.

## 6. Out-of-scope cho MVP

- JLPT N4–N1 content expansion.
- Grammar course, Listening, speaking/pronunciation scoring.
- Handwriting/stroke recognition.
- Teacher/student, admin portal hoặc multi-profile household.
- Social features, leaderboard, friend challenge.
- Fully adaptive AI tutor hoặc generated curriculum.
- Offline-first/PWA conflict resolution.
- Native mobile application.
- Light/Kawaii theme hoặc redesign v0.
- Advanced analytics/BI.
- Memorize toàn bộ On'yomi/Kun'yomi của mỗi Kanji ngay trong MVP.
- Microservices hoặc separate backend chỉ để tăng độ phức tạp kiến trúc.

## 7. End-to-end learning flow đề xuất

```text
Sign in
  │
  v
Dashboard đọc profile, quota, due cards và current progress
  │
  ├── Review due cards ──> FSRS rating ──> card + review history được lưu
  │
  └── Learn Vocabulary/Kanji
          │
          v
      Free learning queue chọn item phù hợp
          │
          v
      Flashcard → Recognition → Assembly → Recall
          │
          v
      Ghi attempt + cập nhật đúng skill progress
          │
          v
      Unlock stage/card khi rule được thỏa
          │
          v
      Dashboard/due queue phản ánh dữ liệu mới trên PC và mobile
```

Flow nội dung hỗ trợ:

```text
CSV/JSON → validate → preview → import transaction → Vocabulary/Kanji relation
Backup request → versioned export
Restore file → validate toàn bộ → preview conflict → atomic restore/merge
```

## 8. Acceptance criteria cho từng P0 feature

### P0-1 — UI preservation

- Tất cả route v0 đang dùng vẫn render được trên desktop/mobile.
- Dark Theme token, typography và navigation không bị thay bằng design mới.
- Learning/Review/Speed Matching components không bị rewrite nếu chỉ cần đổi data/callback.
- Không còn production screen đọc trực tiếp `lib/mock-data.ts` sau khi feature tương ứng được chuyển đổi.

### P0-2 — Identity và sync

- Người chưa xác thực không đọc hoặc sửa learner data.
- Cùng một tài khoản trên PC và mobile thấy cùng progress sau reload.
- Mutation luôn gắn với identity trusted; client không thể chọn tùy ý owner ID.
- Secret/server credential không xuất hiện trong client bundle hoặc Git.

### P0-3 — Content model/library

- Tìm được Vocabulary bằng spelling, kana, romaji hoặc nghĩa; tìm Kanji bằng character, Hán Việt hoặc nghĩa.
- Vocabulary–Kanji relation không phụ thuộc vào display text dễ thay đổi.
- Dataset N5 ban đầu qua validation và không có duplicate theo policy đã chốt.
- UI hiển thị đúng tiếng Nhật, Hán Việt và nghĩa tiếng Việt.

### P0-4 — Import

- File CSV và JSON hợp lệ cho preview đúng số row trước khi ghi.
- Row lỗi có reason và row number/path rõ.
- File malformed/oversized bị từ chối an toàn.
- Import cùng file hai lần tuân theo duplicate policy đã chốt.
- Failure giữa transaction không để lại import một phần không được báo cáo.

### P0-5 — Progressive learning

- Người học bắt đầu session từ Vocabulary hoặc Kanji mà không phải hoàn thành lesson cố định.
- Ít nhất Flashcard, Choice, Assembly và Recall chạy bằng dữ liệu thật.
- Kết quả mỗi step được persist và phản ánh sau refresh.
- Session không unlock item/stage trái rule đã chốt.

### P0-6 — Skill progress

- Mỗi attempt cập nhật đúng item/skill, không reset skill khác ngoài ý muốn.
- Weak item/skill được suy ra từ persisted evidence, không từ constant `strength` mock.
- Progress tổng hợp có thể truy vết về attempts/reviews.
- Logic có unit tests cho correct, incorrect, duplicate và boundary cases.

### P0-7 — FSRS review

- Due queue chỉ chứa card đến hạn theo clock/timezone policy đã chốt.
- Mỗi rating tạo đúng card state/due date theo FSRS version đã chọn.
- Review history được append; refresh không mất history.
- Gửi lặp cùng event không áp dụng rating hai lần.
- Hai thiết bị submit cạnh tranh không âm thầm ghi đè card bằng stale state.
- Practice/game attempt không reschedule official card nếu separation proposal được duyệt.

### P0-8 — Dashboard/settings

- Due, learned count, daily progress và weak items khớp persisted data.
- Daily quota lưu qua refresh và đồng bộ thiết bị.
- Empty/new-user state không hiển thị số mock.
- Dashboard không cần advanced chart để đạt P0.

### P0-9 — Backup/restore

- Backup mới có schema version, export time và learner-owned data cần thiết.
- Restore backup vừa export có thể tái tạo cùng content/progress/review state theo policy.
- Invalid hoặc unsupported version không làm đổi data.
- Người dùng nhìn thấy summary trước khi xác nhận restore.
- Restore có test cho success, invalid file, duplicate/conflict và transaction failure.

### P0-10 — Quality/release baseline

- Typecheck và production build pass mà không cần bỏ qua TypeScript errors.
- Critical E2E: sign in → learn → refresh → review → mở thiết bị/browser khác → thấy state mới.
- Viewport mobile thông dụng không horizontal overflow ở critical flow.
- Không có credential trong tracked files hoặc browser console.

## 9. Open architecture/product decisions

Các câu hỏi dưới đây cần chủ dự án quyết định. Implementation không nên tự chọn ngầm.

### Quyết định kiến trúc

1. **Data/auth platform:** Supabase PostgreSQL + Auth + RLS, hay Next.js với một hosted database/auth stack khác?
2. **Authentication UX:** email/password, magic link hay provider login? Làm sao giới hạn app về đúng một learner account khi deploy public?
3. **Server boundary:** dùng Server Actions cho internal UI mutations và Route Handlers chỉ cho import/export, hay chọn API contract khác?
4. **FSRS library/version:** chọn `ts-fsrs` hay implementation khác? Ai sở hữu adapter và parameter version?
5. **Atomic review:** transaction/RPC/row-lock được thực hiện ở database hay application layer nào?
6. **Time policy:** timezone nghiệp vụ, thời điểm server chuẩn và định nghĩa “ngày học” là gì?
7. **Deployment:** Vercel/Supabase Cloud hay nền tảng khác; region nào gần người dùng?
8. **Environment strategy:** local/preview/production dùng database/project riêng đến mức nào?

### Quyết định learning/product

9. **Skill taxonomy:** Vocabulary và Kanji cần những skill/card type cụ thể nào trong P0?
10. **Unlock/mastery rule:** bao nhiêu evidence và khoảng thời gian nào để unlock stage/card?
11. **New-item selection:** random, weak prerequisite, frequency hay user chọn tự do?
12. **Daily quota:** quota chung hay tách new Vocabulary/new Kanji/review?
13. **Session resume:** refresh giữa session tiếp tục đúng step hay chỉ giữ completed attempt rồi tạo session mới?
14. **Practice separation:** xác nhận game/practice không reschedule FSRS, chỉ ảnh hưởng weak-skill signal nếu có.
15. **Kanji readings:** lưu toàn bộ On/Kun hay chỉ context-relevant readings cho N5 MVP?

### Quyết định import/backup

16. **Duplicate identity:** Vocabulary duplicate theo spelling+kana, external stable ID hay quy tắc khác?
17. **Import conflict:** skip, update hay reject existing row? Field nào được phép update?
18. **Kanji import:** cần UI/import file ở P0 hay seed/manual migration là đủ?
19. **Backup scope:** bao gồm master content do app cung cấp hay chỉ learner-owned/progress data?
20. **Restore semantics:** replace toàn bộ, merge, hay cho chọn; có cần automatic pre-restore backup không?
21. **Backup security:** JSON plaintext download có đủ hay cần encryption/password?

## 10. Decision gate trước implementation

Không cần giải quyết toàn bộ 21 câu hỏi cùng lúc. Trước khi bắt đầu vertical slice đầu tiên, tối thiểu cần chốt:

1. Data/auth platform và one-account strategy.
2. Skill/card taxonomy tối thiểu.
3. FSRS library + server-authoritative transaction boundary.
4. Import duplicate/update policy.
5. Backup/restore semantics.
6. Timezone và study-day boundary.

Sau khi chốt, các quyết định kiến trúc quan trọng nên được ghi thành ADR riêng thay vì chỉnh ngầm trong tài liệu scope.
