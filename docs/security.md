# SEC-01 — Auth & Authorization (cập nhật AUTH-01 theo Design V7)

> Trạng thái: **Đã chốt — chủ dự án duyệt ngày 2026-10-23** (đồng ý toàn bộ SEC-D1…D5, xem §12)
>
> **Cập nhật 2026-11-04 (AUTH-01, Design V7):** ứng dụng phục vụ **nhiều người học**, đăng nhập bằng **username + mật khẩu** (không cần email), ai cũng tự đăng ký được. Các mục bị thay đổi được đánh dấu **V7**; SEC-D1 được thay bằng SEC-D6, SEC-D7 (§12).
>
> Ngày: 2026-10-21
>
> Phụ thuộc: `docs/architecture.md` (ARCH-03 §5), ERD V6 của DB-01 (đang review), `docs/PROJECT_SPEC.md` §9.3, §10.7
>
> Phạm vi: thiết kế, **không có code hay migration**. Triển khai thuộc AUTH-01 (đăng nhập), DB-02 (policy SQL), SEC-02 (kiểm thử).

Nhãn dùng trong tài liệu: **CONFIRMED** (đã chốt) · **PROPOSED** (đề xuất trong SEC-01, cần duyệt) · **PENDING** (chưa quyết định).

---

## 1. Mục tiêu bảo mật

Ứng dụng chạy public trên Internet và phục vụ **nhiều người học** (V7). Yêu cầu:

1. Người chưa đăng nhập không đọc, không ghi được dữ liệu học.
2. Mỗi người học chỉ đọc/ghi được dữ liệu **của chính mình**; ai cũng tự đăng ký được (V7).
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
| T3 | Một người học (hoặc người lạ vừa đăng ký) đọc dữ liệu của người khác | V7: ai cũng tự đăng ký được; RLS so `user_id = auth.uid()` nên mỗi tài khoản chỉ thấy dòng của mình. Đây là lớp bảo vệ chính, nên mọi bảng user-owned bắt buộc có RLS |
| T4 | Gọi trực tiếp Server Action bằng POST, bỏ qua UI | Mỗi Server Action/Route Handler tự gọi `getClaims()` |
| T5 | Client gửi `user_id` giả | Server không nhận `user_id` từ client; DB đặt `default auth.uid()` + `WITH CHECK` |
| T6 | Lộ secret key | Secret key chỉ ở máy dev/CI cho script; không có trong app runtime, Git, `NEXT_PUBLIC_*` |
| T7 | CDN/ISR cache response chứa cookie session của người khác | Trang có dữ liệu cá nhân luôn dynamic; áp cache headers từ Supabase client |
| T8 | XSS đánh cắp session | Không render HTML thô từ dữ liệu import; React escape mặc định |
| T9 | Brute-force mật khẩu | Mật khẩu tối thiểu 8 ký tự; rate limit có sẵn của Supabase Auth; Supabase lưu mật khẩu đã băm (app không bao giờ thấy) |
| T12 | Dò username nào tồn tại | Đăng nhập sai chỉ báo chung "Wrong username or password". Form đăng ký vẫn lộ "username đã có người dùng" — chấp nhận ở MVP (username không phải bí mật) |
| T10 | Open redirect qua tham số `next` ở `/login` | Chỉ nhận đường dẫn nội bộ bắt đầu bằng `/`, không phải `//` (AUTH-01) |
| T11 | Đăng xuất ngoài ý muốn qua link hoặc prefetch | `/auth/signout` chỉ nhận POST (AUTH-01) |

**Rủi ro chấp nhận (PROPOSED):** người học, khi đã đăng nhập, về kỹ thuật có thể dùng chính JWT của mình gọi Data API để ghi thẳng vào bảng tiến độ **của mình** (vd. tự cộng điểm). RLS vẫn chặn ghi vào dữ liệu người khác, nên đây là "tự gian lận", không phải lỗ hổng lộ dữ liệu. MVP chấp nhận rủi ro này; nếu muốn chặn hẳn, xem SEC-D4. V7: khi có nhiều người học và có so sánh giữa người dùng (leaderboard), cần xem lại rủi ro này.

## 4. Mô hình danh tính

| Mục | Quyết định | Nhãn |
| --- | --- | --- |
| Provider | Supabase Auth | CONFIRMED |
| Số tài khoản | **Nhiều người học** | CONFIRMED (V7) |
| Phương thức đăng nhập | **Username + mật khẩu**, không email (Supabase provider Email với địa chỉ nội bộ `username@users.projap.invalid`) | CONFIRMED (V7, SEC-D6) |
| Tạo tài khoản | Người học tự đăng ký ở `/login` | CONFIRMED (V7) |
| Đăng ký công khai | **Mở**; "Confirm email" **tắt** (không có email thật để gửi) | CONFIRMED (V7, SEC-D7) |
| Quên mật khẩu | Không có tự phục hồi qua email; admin đặt lại trong Supabase Dashboard (Authentication → Users) | CONFIRMED (V7) — giới hạn đã biết |
| Settings mặc định | Trigger `on_auth_user_created` tạo `learner_settings` khi có tài khoản mới | IMPLEMENTED (AUTH-01) |
| Đánh dấu chủ | Không cần trong MVP | V7 (bỏ) |
| MFA | Không có trong MVP | V7 |
| Session | Cookie qua `@supabase/ssr`; refresh trong `proxy.ts` | PROPOSED (ARCH-03 ADR-003) |
| Kiểm tra ở server | `supabase.auth.getClaims()` trong DAL | PROPOSED |

Lý do V7 chọn username + mật khẩu (2026-11-04): đơn giản nhất cho người học, không cần email hay cấu hình Google Cloud; vẫn an toàn vì Supabase quản lý mật khẩu và RLS cách ly dữ liệu. Phương án "chỉ username, không mật khẩu" đã bị loại vì ai biết username là vào được tài khoản người khác, và server sẽ phải dùng secret key trong request path.

Luồng đăng nhập (AUTH-01): form `/login` → Server Function `signIn`/`signUp` → `signInWithPassword` / `signUp` với email nội bộ → Supabase ghi cookie session → chuyển về trang người dùng định vào. Quy tắc username: 3–20 ký tự, chữ thường, số, gạch dưới (`lib/auth/username.ts`).

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

- [ ] Authentication → Sign In / Providers: **Email bật**, **"Confirm email" tắt** (V7).
- [ ] "Allow new users to sign up": **bật** (V7 — nhiều người học).
- [ ] Authentication → URL Configuration: Site URL = domain production (tạm thời `http://localhost:3000`); Redirect URLs gồm `http://localhost:3000/**` và domain production.
- [ ] API keys: dùng publishable/secret key mới; không dùng legacy `anon`/`service_role`.
- [ ] Mọi bảng trong `public` bật RLS; Security Advisor không báo bảng thiếu RLS.
- [ ] Môi trường dev và production dùng project riêng nếu có thể (OD-20, ARCH-03 D-08).

## 11. Kịch bản kiểm thử cho SEC-02

| # | Kịch bản | Kỳ vọng |
| --- | --- | --- |
| 1 | Chưa đăng nhập, mở `/` | Redirect `/login` |
| 2 | Chưa đăng nhập, gọi Data API `select * from lesson_attempts` bằng publishable key | 0 dòng / bị từ chối |
| 3 | Chưa đăng nhập, POST trực tiếp Server Action `submitReview` | 401, không có log mới |
| 4 | Đăng nhập với mật khẩu sai 10 lần liên tiếp | Bị Supabase giới hạn tốc độ; thông báo không cho biết username có tồn tại không |
| 5 | Tài khoản thứ hai đăng nhập, đọc bảng tiến độ | Chỉ thấy dữ liệu của chính nó; có đúng 1 dòng `learner_settings` của mình |
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

**Quyết định V7 (chốt 2026-11-04, AUTH-01):**

| ID | Câu hỏi | Quyết định |
| --- | --- | --- |
| SEC-D1 | Phương thức đăng nhập | **Thay bằng SEC-D6** |
| SEC-D6 | Phương thức đăng nhập | Username + mật khẩu, không email; không dùng Google OAuth |
| SEC-D7 | Ai được đăng ký | Bất kỳ ai; cách ly dữ liệu bằng RLS |
| SEC-D8 | Tạo settings mặc định | Trigger database `on_auth_user_created`, không phụ thuộc code app |

## 13. Liên kết

- [Supabase — API keys](https://supabase.com/docs/guides/api/api-keys)
- [Supabase — Creating a Supabase client for SSR (Next.js)](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase — RLS policy guidelines](https://supabase.com/docs/guides/ai-tools/ai-prompts/database-rls-policies)
