# SEC-01 — Auth & Authorization cho một người dùng

> Trạng thái: **Đã chốt — chủ dự án duyệt ngày 2026-10-23** (đồng ý toàn bộ SEC-D1…D5, xem §12)
>
> Ngày: 2026-10-21
>
> Phụ thuộc: `docs/architecture.md` (ARCH-03 §5), ERD V6 của DB-01 (đang review), `docs/PROJECT_SPEC.md` §9.3, §10.7
>
> Phạm vi: thiết kế, **không có code hay migration**. Triển khai thuộc AUTH-01 (đăng nhập), DB-02 (policy SQL), SEC-02 (kiểm thử).

Nhãn dùng trong tài liệu: **CONFIRMED** (đã chốt) · **PROPOSED** (đề xuất trong SEC-01, cần duyệt) · **PENDING** (chưa quyết định).

---

## 1. Mục tiêu bảo mật

Ứng dụng chạy public trên Internet nhưng chỉ phục vụ **một người học**. Yêu cầu:

1. Người lạ mở URL không đọc, không ghi được dữ liệu học.
2. Chỉ chủ tài khoản đăng nhập được; không ai tự đăng ký thêm tài khoản.
3. Mọi thao tác ghi đi qua server đã xác thực; client không tự chọn `user_id`.
4. Không secret nào nằm trong client bundle, Git hoặc log.
5. Kể cả khi code server có bug, database vẫn chặn truy cập trái phép (RLS).

## 2. Auth và Authorization khác nhau thế nào

| | Authentication (xác thực) | Authorization (phân quyền) |
| --- | --- | --- |
| Câu hỏi | "Bạn là ai?" | "Bạn được làm gì với dữ liệu này?" |
| Ai lo | Supabase Auth: đăng nhập, phát JWT, refresh session | DAL trên server (kiểm tra) + RLS trong PostgreSQL (chặn ở tầng dữ liệu) |
| Kết quả | JWT chứa `sub` = user id | Cho phép/từ chối từng SELECT/INSERT/UPDATE/DELETE |

Đăng nhập thành công **chưa** có nghĩa là được đọc mọi thứ. RLS mới quyết định từng dòng dữ liệu.

## 3. Threat model

| # | Mối đe dọa | Biện pháp |
| --- | --- | --- |
| T1 | Người lạ mở URL, xem trang | `proxy.ts` redirect về `/login`; page gọi DAL `getClaims()` |
| T2 | Người lạ gọi thẳng Supabase Data API bằng publishable key (key này công khai trong browser) | Không có policy cho role `anon` → mọi truy vấn bị từ chối |
| T3 | Người lạ tự đăng ký tài khoản rồi đọc dữ liệu | Tắt sign-up; RLS so `user_id = auth.uid()` nên tài khoản lạ không thấy dữ liệu của chủ |
| T4 | Gọi trực tiếp Server Action bằng POST, bỏ qua UI | Mỗi Server Action/Route Handler tự gọi `getClaims()` |
| T5 | Client gửi `user_id` giả | Server không nhận `user_id` từ client; DB đặt `default auth.uid()` + `WITH CHECK` |
| T6 | Lộ secret key | Secret key chỉ ở máy dev/CI cho script; không có trong app runtime, Git, `NEXT_PUBLIC_*` |
| T7 | CDN/ISR cache response chứa cookie session của người khác | Trang có dữ liệu cá nhân luôn dynamic; áp cache headers từ Supabase client |
| T8 | XSS đánh cắp session | Không render HTML thô từ dữ liệu import; React escape mặc định |
| T9 | Brute-force mật khẩu | Mật khẩu mạnh; rate limit có sẵn của Supabase Auth; MFA (P1) |

**Rủi ro chấp nhận (PROPOSED):** chủ tài khoản, khi đã đăng nhập, về kỹ thuật có thể dùng chính JWT của mình gọi Data API để ghi thẳng vào bảng tiến độ (vd. tự tạo checkpoint). Vì người đó cũng là người duy nhất dùng app, đây là "tự gian lận", không phải lỗ hổng lộ dữ liệu. MVP chấp nhận rủi ro này; nếu muốn chặn hẳn, xem §8 SEC-D4.

## 4. Mô hình danh tính

| Mục | Quyết định | Nhãn |
| --- | --- | --- |
| Provider | Supabase Auth | CONFIRMED |
| Số tài khoản | Đúng 1 (chủ dự án) | CONFIRMED |
| Phương thức đăng nhập | **Email + password** | PROPOSED (SEC-D1) |
| Tạo tài khoản | Tạo thủ công trong Supabase Dashboard (Authentication → Users) | PROPOSED |
| Đăng ký công khai | **Tắt** ("Allow new users to sign up" = off) | PROPOSED |
| Đánh dấu chủ | `app_metadata.role = "owner"` (chỉ đặt được bằng secret key/Dashboard; người dùng không tự sửa được) | PROPOSED |
| MFA (TOTP) | Tùy chọn, P1 | PROPOSED |
| Session | Cookie qua `@supabase/ssr`; refresh trong `proxy.ts` | PROPOSED (ARCH-03 ADR-003) |
| Kiểm tra ở server | `supabase.auth.getClaims()` trong DAL | PROPOSED |

Lý do chọn email + password cho MVP: đăng nhập được ngay trên cả PC và điện thoại, không phụ thuộc email server. Magic link cần gửi email mỗi lần đăng nhập; SMTP mặc định của Supabase có giới hạn gửi rất thấp, chỉ hợp để thử. OAuth (Google) cần thêm cấu hình Google Cloud, không cần thiết cho một người.

### Quy tắc dùng hàm auth ở server

| Hàm | Dùng khi | Không dùng khi |
| --- | --- | --- |
| `getClaims()` | Mọi kiểm tra quyền ở server (DAL, Server Action, Route Handler, proxy) | — |
| `getUser()` | Cần bản ghi user mới nhất (hiếm) | Kiểm tra quyền thường xuyên (chậm, có network call) |
| `getSession()` | — | **Không bao giờ** dùng để ra quyết định quyền ở server: nó chỉ đọc cookie, không xác minh |

Chỉ refresh session ở **một nơi** (`proxy.ts`). Refresh token dùng một lần; refresh ở nhiều chỗ gây đăng xuất ngẫu nhiên.

## 5. Key và biến môi trường

Supabase hiện có hai loại key mới thay cho `anon`/`service_role` (key cũ dự kiến bị ngừng cuối 2026). Dự án dùng **key mới** ngay từ đầu.

| Key | Postgres role | Bỏ qua RLS? | Được ở đâu |
| --- | --- | --- | --- |
| Publishable `sb_publishable_…` | `anon` (chưa đăng nhập) / `authenticated` (đã đăng nhập) | Không | Browser và server. An toàn **chỉ khi RLS đúng** |
| Secret `sb_secret_…` | `service_role` | **Có** | Chỉ script local/CI (seed, importer, migration). Không dùng trong request path của app |

### `.env.example` (đề xuất, không chứa giá trị thật)

```bash
# Public — được nhúng vào client bundle
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Secret — KHÔNG có prefix NEXT_PUBLIC_, KHÔNG dùng trong app runtime
# Chỉ dùng cho script seed/import chạy trên máy dev
SUPABASE_SECRET_KEY=
```

Quy tắc:

1. Chỉ hai biến `NEXT_PUBLIC_SUPABASE_*` ở trên được có prefix `NEXT_PUBLIC_`.
2. `.env.local` đã bị `.gitignore` chặn (Implemented). Chỉ commit `.env.example`.
3. Không log key, JWT hoặc cookie.
4. Hosting production chỉ cần hai biến public. Secret key **không** cấu hình trên hosting trừ khi có task được duyệt cần đến.

### Vì sao frontend không được cầm DB admin key?

Mọi thứ gửi xuống browser đều đọc được: chỉ cần mở DevTools hoặc xem file JS. Secret key mang role `service_role` có thuộc tính **bỏ qua RLS**, nên ai lấy được nó sẽ đọc, sửa, xóa toàn bộ database mà không cần đăng nhập. Publishable key thì khác: nó công khai nhưng vô hại, vì mọi truy vấn bằng nó vẫn phải qua RLS. Vì vậy an toàn của app nằm ở **RLS + giữ kín secret key**, không phải ở việc giấu publishable key.

## 6. Ma trận quyền (SELECT / INSERT / UPDATE / DELETE)

Áp dụng cho ERD V6 của DB-01 và ba bảng SEC-01 đề nghị DB-01 bổ sung (`KANJI`, `VOCABULARY_KANJI`, `LEARNER_SETTINGS`; đánh dấu ✱).

Ký hiệu:

- **own** = chỉ dòng có `user_id = (select auth.uid())`
- **all** = mọi dòng, với role `authenticated`
- **—** = không có policy → bị từ chối
- **script** = chỉ secret key (service_role) từ script local

Role `anon` (chưa đăng nhập): **không có policy nào ở mọi bảng**, nên không đọc/ghi được gì.

### 6.1 Nội dung dùng chung

| Bảng | SELECT | INSERT | UPDATE | DELETE | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| `vocabularies` | all | script | script | script | Importer DATA-03 chạy như script local |
| `kanji` ✱ | all | script | script | script | |
| `vocabulary_kanji` ✱ | all | script | script | script | |

Nếu sau này có **UI import** trong app, thêm policy INSERT/UPDATE cho người có `app_metadata.role = 'owner'` (SEC-D3).

### 6.2 Trạng thái học (user-owned)

| Bảng | SELECT | INSERT | UPDATE | DELETE | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| `learner_vocabulary` | own | own | own | — | Stage, trạng thái |
| `learner_skill_progress` | own | own | own | — | Số liệu skill |
| `checkpoint_completions` | own | own | — | — | Huy chương đã đạt: không sửa, không xóa |
| `learner_settings` ✱ | own | own | own | — | Quota, timezone |

### 6.3 Daily Lessons

| Bảng | SELECT | INSERT | UPDATE | DELETE | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| `lesson_sessions` | own | own | own | — | UPDATE `status`, `completed_at` |
| `lesson_queue_items` | own | own | own | — | UPDATE `status`. `payload` chứa đáp án không được gửi nguyên xuống client |
| `lesson_attempts` | own | own | — | — | **Append-only** |
| `xp_events` | own | own | — | — | Append-only; chống cộng trùng bằng `client_event_id` |

### 6.4 FSRS Review

| Bảng | SELECT | INSERT | UPDATE | DELETE | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| `review_cards` | own | own | own | — | INSERT khi tạo card; UPDATE chỉ qua luồng submit review (server) |
| `review_logs` | own | own | — | — | **Append-only**; ghi cùng transaction với UPDATE card |

### 6.5 Practice

| Bảng | SELECT | INSERT | UPDATE | DELETE | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| `practice_sessions` | own | own | own | — | UPDATE `ended_at` |
| `practice_attempts` | own | own | — | — | Append-only. **Không** có quyền nào chạm `review_cards` |

### 6.6 Vì sao không có DELETE

Dữ liệu học là lịch sử, không nên mất vì một click nhầm hay một bug. Các trường hợp thật sự cần xóa (restore backup, reset tiến độ) sẽ làm qua **một database function có kiểm tra owner** trong task BACK-01, không mở DELETE chung.

## 7. Yêu cầu gửi DB-01 (để RLS hoạt động)

ERD V6 hiện chưa có các cột sau. Đây là **điều kiện cần** của SEC-01, đề nghị bổ sung khi review DB-01:

1. **`user_id uuid not null default auth.uid() references auth.users(id)`** trên mọi bảng ở §6.2–6.5. Đặt cột trực tiếp ở từng bảng (kể cả bảng con như `lesson_attempts`) để policy không phải JOIN, theo khuyến nghị của Supabase.
2. **Index** trên `user_id` của mọi bảng có policy.
3. **`client_event_id` + `UNIQUE (user_id, client_event_id)`** cho `lesson_attempts`, `practice_attempts`, `review_logs`, `xp_events` (chống double submit; liên quan SRS-03).
4. **`version`** (hoặc dùng `last_review_at`) trên `review_cards` cho optimistic concurrency giữa hai thiết bị.
5. **Bật RLS trên mọi bảng** trong schema `public`, kể cả bảng content.

## 8. Mẫu policy (minh họa, không phải migration)

Chỉ để Người A/B hình dung. SQL thật viết ở DB-02.

```sql
-- Bật RLS
alter table public.lesson_attempts enable row level security;

-- Đọc dữ liệu của chính mình
create policy "Owner reads own lesson attempts"
on public.lesson_attempts
for select
to authenticated
using ( (select auth.uid()) = user_id );

-- Ghi thêm dữ liệu của chính mình (không cho đặt user_id của người khác)
create policy "Owner inserts own lesson attempts"
on public.lesson_attempts
for insert
to authenticated
with check ( (select auth.uid()) = user_id );

-- Không tạo policy UPDATE/DELETE → append-only

-- Bảng content: chỉ đọc khi đã đăng nhập
create policy "Authenticated reads vocabularies"
on public.vocabularies
for select
to authenticated
using ( true );
```

Quy tắc viết policy:

- Mỗi thao tác một policy riêng, không dùng `for all`.
- Luôn ghi `to authenticated`.
- Viết `(select auth.uid())` để Postgres cache kết quả theo câu lệnh.
- SELECT/DELETE dùng `USING`; INSERT dùng `WITH CHECK`; UPDATE dùng cả hai.
- Dữ liệu phân quyền (role owner) đặt trong `app_metadata`, **không** dùng `user_metadata` vì người dùng tự sửa được.

## 9. Server bảo vệ thao tác ghi

```text
Browser ──POST──► Server Action / Route Handler
                     1. getClaims()          → không có user: 401
                     2. validate input (schema)
                     3. bỏ qua mọi user_id client gửi
                     4. chấm lại / tính checkpoint / FSRS trên server
                     5. Supabase server client (publishable key + JWT của user)
                              │
                              ▼
                     PostgreSQL: RLS kiểm tra lần cuối
```

| Thao tác | Đi qua | Ai tính kết quả |
| --- | --- | --- |
| Đăng nhập/đăng xuất | Browser client hoặc Server Action → Supabase Auth | Supabase Auth |
| Trả lời câu trong Lesson | Server Action `submitAttempt` | Server chấm lại, đánh giá checkpoint |
| Chấm Again/Hard/Good/Easy | Server Action `submitReview` | Server chạy FSRS với giờ server |
| Ghi kết quả mini-game | Server Action `submitPracticeAttempt` | Server; không chạm `review_cards` |
| Đổi settings | Server Action | Server validate |
| Import CSV/JSON | Script local (MVP) | Script với secret key |
| Backup/Restore | Route Handler (BACK-01) | Server; restore qua DB function |

Browser client của Supabase **chỉ dùng cho đăng nhập/đăng xuất**, không query bảng dữ liệu.

## 10. Cấu hình Supabase Dashboard (checklist cho AUTH-01)

- [ ] Authentication → Sign-in providers: bật Email, **tắt "Allow new users to sign up"**.
- [ ] Tạo user chủ dự án thủ công; đặt `app_metadata.role = "owner"`.
- [ ] Authentication → URL Configuration: Site URL = domain production; Redirect URLs gồm `http://localhost:3000/**` và domain production.
- [ ] API keys: dùng publishable/secret key mới; không dùng legacy `anon`/`service_role`.
- [ ] Mọi bảng trong `public` bật RLS; Security Advisor không báo bảng thiếu RLS.
- [ ] Môi trường dev và production dùng project riêng nếu có thể (OD-20, ARCH-03 D-08).

## 11. Kịch bản kiểm thử cho SEC-02

| # | Kịch bản | Kỳ vọng |
| --- | --- | --- |
| 1 | Chưa đăng nhập, mở `/` | Redirect `/login` |
| 2 | Chưa đăng nhập, gọi Data API `select * from lesson_attempts` bằng publishable key | 0 dòng / bị từ chối |
| 3 | Chưa đăng nhập, POST trực tiếp Server Action `submitReview` | 401, không có log mới |
| 4 | Gọi API sign-up | Bị từ chối |
| 5 | Tài khoản test thứ hai (tạo bằng Dashboard trên project dev) đọc bảng tiến độ | Chỉ thấy dữ liệu của chính nó (0 dòng) |
| 6 | Đã đăng nhập, INSERT `lesson_attempts` với `user_id` của người khác | Bị `WITH CHECK` từ chối |
| 7 | Đã đăng nhập, UPDATE/DELETE `review_logs` | Bị từ chối (không có policy) |
| 8 | Đã đăng nhập, INSERT vào `vocabularies` | Bị từ chối (chỉ script) |
| 9 | Tìm `sb_secret_` trong `.next/static` sau `pnpm build` và trong Git history | Không tìm thấy |
| 10 | Response trang Dashboard | Có `Cache-Control` không cho cache công khai |

## 12. Quyết định (đã chốt 2026-10-23)

Chủ dự án đồng ý toàn bộ đề xuất dưới đây. Các mục trong tài liệu ghi PROPOSED nhưng thuộc SEC-D1…D5 nay được coi là **CONFIRMED**.

| ID | Câu hỏi | Quyết định |
| --- | --- | --- |
| SEC-D1 | Phương thức đăng nhập | Email + password; MFA TOTP ở P1 |
| SEC-D2 | Thêm `user_id` vào mọi bảng user-owned (yêu cầu với DB-01) | Có |
| SEC-D3 | Ghi content (import) qua đâu ở MVP | Script local với secret key; UI import + policy owner để sau |
| SEC-D4 | Chấp nhận rủi ro chủ tài khoản tự ghi thẳng qua Data API | Chấp nhận ở MVP. Nếu muốn chặn: thu hồi INSERT/UPDATE của `authenticated` trên bảng tiến độ và ghi qua DB function `security definer` |
| SEC-D5 | Không mở DELETE; restore/reset qua DB function | Có |

## 13. Liên kết

- [Supabase — API keys](https://supabase.com/docs/guides/api/api-keys)
- [Supabase — Creating a Supabase client for SSR (Next.js)](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase — RLS policy guidelines](https://supabase.com/docs/guides/ai-tools/ai-prompts/database-rls-policies)
