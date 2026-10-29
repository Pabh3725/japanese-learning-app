# Projap

## Mô tả dự án

## Yêu cầu

- Node.js
- Corepack (được phân phối cùng các bản Node.js hiện hành)
- pnpm `12.3.4` — phiên bản được khai báo trong `package.json`

## Chạy môi trường phát triển

Mở PowerShell tại thư mục gốc của dự án:

```powershell
cd D:\japanese-learning-app
```

Cài dependencies và khởi động ứng dụng:

```powershell
corepack pnpm install
corepack pnpm dev
```

Mở [http://localhost:3000](http://localhost:3000) trong trình duyệt. Dừng máy chủ bằng `Ctrl+C`.

Nếu lệnh `pnpm` đã dùng được trong PowerShell, có thể bỏ `corepack` ở đầu lệnh. Nếu `corepack enable` báo lỗi quyền truy cập vào `C:\Program Files\nodejs`, hãy dùng trực tiếp `corepack pnpm ...` như các lệnh trên; không cần tạo shim `pnpm` toàn hệ thống.

## Build và chạy production

```powershell
corepack pnpm build
corepack pnpm start
```

Ứng dụng production mặc định chạy tại [http://localhost:3000](http://localhost:3000).
