# CLAUDE.md — Projap

@AGENTS.md

## Đọc trước mọi task

1. `docs/PROJECT_SPEC.md` — Single Source of Truth (Learning Design V6). Khi tài liệu khác mâu thuẫn, spec này được ưu tiên.
2. Tài liệu chi tiết theo nhu cầu:
   - `docs/architecture.md` (ARCH-03) — DAL, Auth/session, ADR.
   - `docs/ux-flow-audit.md` (UX-01) — mã `UXI-xx`, `FG-xx`.
   - `docs/ui-audit.md` (ARCH-02) — hiện trạng source v0.
   - `docs/mvp-scope.md` (PLAN-01) — P0/P1, acceptance criteria.
3. Task được giao theo Task ID trong plan dự án (vd. `DB-01`, `VOC-03`). Đọc mục spec liên quan trước khi lên plan.

## Nhãn trạng thái trong spec

- **CONFIRMED**: đã chốt, dùng làm yêu cầu.
- **PROPOSED**: đề xuất, không triển khai như quyết định cuối khi chưa được duyệt.
- **PENDING**: chưa quyết định. Không tự chọn ngầm; hỏi chủ dự án (xem §14 Open Decisions).
- **IMPLEMENTED**: đã xác minh trong source.

## Quy trình làm việc

- Inspect → plan → **chờ duyệt** → implement.
- Không commit, push, merge hoặc deploy khi chưa được chủ dự án đồng ý.
- Làm trên branch `feature/*` hoặc `docs/*`, không làm trực tiếp trên `main`. Mọi thay đổi vào `main` qua Pull Request có review.
- Không sửa file ngoài phạm vi task.

## Ràng buộc kỹ thuật

- Stack đã chốt: Next.js App Router (16.x), React, TypeScript, Tailwind CSS, pnpm, Supabase (PostgreSQL + Auth). Không đề xuất PHP, Firebase hay MongoDB.
- Next.js 16 có breaking changes (vd. `middleware` → `proxy`). Đọc `node_modules/next/dist/docs/` trước khi viết code liên quan.
- Giữ UI v0 (Dark Theme, layout, components). Thay data source và callback ở boundary, không viết lại component.
- Không truy cập database trực tiếp từ component; đi qua Data Access Layer server-only.
- Chỉ Official Review cập nhật FSRS. Daily Lessons ghi learning attempts; Practice ghi practice logs.
- Không commit secret. Chỉ publishable/anon key được dùng prefix `NEXT_PUBLIC_`.

## Ngôn ngữ

Trao đổi và tài liệu bằng tiếng Việt; giữ thuật ngữ kỹ thuật, code, path và identifier bằng tiếng Anh.
