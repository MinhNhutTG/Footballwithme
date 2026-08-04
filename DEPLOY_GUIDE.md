# Hướng dẫn Deploy FootballWithMe (miễn phí 100%)

Deploy bản `frontend-rebuild/` (frontend) + `backend/` (API) + MongoDB Atlas (database).

**Kiến trúc:**

```
MongoDB Atlas (free M0)  <--  Render (free Web Service, chạy backend/)
                                        ^
                                        | API call (VITE_API_URL)
                                        |
                            Vercel (free Hobby, chạy frontend-rebuild/)
```

**3 tài khoản cần tạo (đều free, chỉ cần email hoặc GitHub login):**
- [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas) — database
- [render.com](https://render.com) — backend API
- [vercel.com](https://vercel.com) — frontend

---

## Bước 0 — Chuẩn bị mã nguồn

Deploy chạy dựa trên GitHub, nên trước hết code phải được commit và push lên repo `github.com/MinhNhutTG/Footballwithme`.

```bash
git add <các file muốn commit>
git commit -m "..."
git push origin main
```

> Lưu ý: `.env` đã nằm trong `.gitignore` — không bao giờ commit file này (chứa `MONGO_URI`, `JWT_SECRET` thật). Repo chỉ cần `.env.example` làm mẫu.

Kiểm tra 2 file cấu hình đã có sẵn trong repo:
- `render.yaml` (ở thư mục gốc) — Render đọc file này để tự cấu hình backend.
- `frontend-rebuild/vercel.json` — Vercel đọc để xử lý routing SPA (React Router).

---

## Bước 1 — MongoDB Atlas (Database)

1. Tạo tài khoản tại mongodb.com/cloud/atlas.
2. Bấm **Build a Database** → chọn gói **M0 (Free)**.
3. Chọn nhà cung cấp/khu vực bất kỳ (khu vực gần Việt Nam như Singapore là tốt nhất) → **Create**.
4. **Database Access** (menu trái) → **Add New Database User**:
   - Username/password tự đặt, ghi lại cẩn thận.
5. **Network Access** (menu trái) → **Add IP Address** → chọn **Allow Access from Anywhere** (`0.0.0.0/0`).
   - Cần thiết vì Render không có IP tĩnh, không whitelist trước được.
6. Quay lại **Database** → bấm **Connect** → **Drivers** → copy connection string, dạng:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. Thay `<username>`/`<password>` bằng giá trị thật ở bước 4, và thêm tên database vào ngay sau `.net/`:
   ```
   mongodb+srv://myuser:mypass@cluster0.xxxxx.mongodb.net/footballwithme?retryWrites=true&w=majority
   ```
   → Đây chính là giá trị `MONGO_URI` dùng ở Bước 2.

---

## Bước 2 — Render (Backend API)

Repo đã có `render.yaml` ở thư mục gốc, khai báo sẵn:
- `rootDir: backend`
- `buildCommand: npm install`
- `startCommand: npm start`
- Các biến môi trường cần nhập tay: `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `RESEND_API_KEY`

**Các bước:**

1. Đăng ký/đăng nhập render.com bằng tài khoản GitHub (để Render truy cập repo dễ dàng).
2. Dashboard → **New +** → **Blueprint**.
3. Chọn repo `Footballwithme` → Render tự phát hiện `render.yaml` và hiện ra service `footballwithme-backend`.
4. Ở phần nhập biến môi trường, điền:
   - `MONGO_URI` = connection string từ Bước 1
   - `JWT_SECRET` = một chuỗi bí mật tự đặt, càng dài random càng tốt. Có thể tạo nhanh bằng lệnh:
     ```bash
     openssl rand -hex 32
     ```
   - `CORS_ORIGIN` = tạm thời điền `http://localhost:5174` (sẽ sửa lại đúng ở Bước 5, sau khi có URL Vercel thật)
   - `FRONTEND_URL` = tạm thời điền `http://localhost:5174` (sẽ sửa lại đúng ở Bước 5 cùng lúc với `CORS_ORIGIN` — dùng để tạo link xác thực email / đặt lại mật khẩu)
   - `GOOGLE_CLIENT_ID` = OAuth Client ID lấy từ [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (mục "OAuth 2.0 Client IDs")
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` = lấy từ Cloudinary Dashboard (cloudinary.com)
   - `RESEND_API_KEY` = API key tạo tại [resend.com](https://resend.com), dùng để gửi email xác thực/đặt lại mật khẩu
5. Bấm **Apply/Create** → Render build và deploy tự động (mất khoảng 2-5 phút).
6. Sau khi deploy xong, Render cấp 1 URL dạng:
   ```
   https://footballwithme-backend.onrender.com
   ```
7. Kiểm tra backend sống chưa bằng cách mở:
   ```
   https://footballwithme-backend.onrender.com/api/health
   ```
   Thấy JSON `{ "status": "Backend is running!", ... }` là thành công.

> **Lưu ý free tier của Render:** service sẽ "ngủ" (sleep) sau 15 phút không có request nào tới. Request đầu tiên sau khi ngủ sẽ chậm ~30-50 giây (cold start) để service khởi động lại — đây là giới hạn bình thường của gói free, không phải lỗi.

---

## Bước 3 — Vercel (Frontend `frontend-rebuild/`)

1. Đăng ký/đăng nhập vercel.com bằng tài khoản GitHub.
2. Dashboard → **Add New** → **Project**.
3. Import repo `Footballwithme`.
4. Ở màn hình cấu hình project:
   - **Root Directory**: bấm **Edit** → chọn `frontend-rebuild` (bắt buộc, vì repo có nhiều thư mục frontend).
   - **Framework Preset**: Vercel tự nhận diện **Vite**, giữ mặc định.
   - **Build Command**: mặc định `vite build` — giữ nguyên.
   - **Output Directory**: mặc định `dist` — giữ nguyên.
5. Mở phần **Environment Variables**, thêm:
   - `VITE_API_URL` = `https://footballwithme-backend.onrender.com/api` (URL Render thật từ Bước 2, nhớ thêm `/api` ở cuối)
   - `VITE_GOOGLE_CLIENT_ID` = cùng giá trị `GOOGLE_CLIENT_ID` đã điền ở Bước 2 (bắt buộc để nút đăng nhập Google hiển thị)
6. Bấm **Deploy**, chờ khoảng 1-2 phút.
7. Sau khi xong, Vercel cấp 1 URL dạng:
   ```
   https://footballwithme-xxxx.vercel.app
   ```

---

## Bước 4 — Nối lại CORS giữa 2 domain thật

Ở Bước 2 mình tạm để `CORS_ORIGIN` và `FRONTEND_URL` = `http://localhost:5174` — giờ cần sửa lại URL Vercel thật:

1. Quay lại Render dashboard → chọn service `footballwithme-backend` → tab **Environment**.
2. Sửa cả 2 biến `CORS_ORIGIN` và `FRONTEND_URL` = URL Vercel thật từ Bước 3.7, ví dụ:
   ```
   https://footballwithme-xxxx.vercel.app
   ```
   (không thêm dấu `/` ở cuối)
3. Nhớ thêm domain Vercel thật vào **Authorized JavaScript origins** trong Google Cloud Console (mục tạo `GOOGLE_CLIENT_ID`) — thiếu bước này thì Google Sign-In sẽ báo lỗi origin không hợp lệ trên production dù chạy được ở `localhost`.
4. Save → Render tự động redeploy lại backend với giá trị mới (~1-2 phút).

---

## Bước 5 — Test end-to-end

Vào URL Vercel thật, test lần lượt:

| Chức năng | Cách test |
|---|---|
| Trang chủ tải bài viết | Vào `/`, thấy danh sách bài viết |
| Đăng ký / xác thực email | Tạo tài khoản mới, kiểm tra mail nhận được, bấm link `/xac-thuc-email/:token`, đăng nhập lại thành công |
| Đăng nhập Google | Bấm nút Google, đăng nhập/đăng ký thành công |
| Quên mật khẩu | `/quen-mat-khau` → nhận mail → `/dat-lai-mat-khau/:token` → đặt mật khẩu mới → đăng nhập lại |
| Đổi mật khẩu | Đăng nhập, vào `/ho-so`, đổi mật khẩu khi đã biết mật khẩu hiện tại |
| Upload ảnh | Đổi avatar ở `/ho-so`, thêm ảnh bìa/video cho 1 bài viết trong Admin |
| Admin | Đăng nhập bằng tài khoản có `role: admin`, vào `/admin`, thêm/sửa/xoá 1 bài |
| Comment | Vào 1 bài viết, bình luận, thấy hiện ngay |
| Search / Favorites | Tìm kiếm, lọc chuyên mục, yêu thích 1 bài |
| 404 | Vào 1 URL không tồn tại, thấy trang NotFound |
| Theme / ngôn ngữ | Đổi theme và ngôn ngữ, F5 lại vẫn giữ nguyên |

Nếu thấy lỗi **CORS** trong Console (F12) → kiểm tra lại `CORS_ORIGIN` ở Render có khớp **chính xác** domain Vercel (kể cả `https://`, không thừa `/`).

Nếu gọi API bị treo lâu lần đầu (~30-50s) → bình thường, do Render free tier cold start (xem lưu ý Bước 2).

---

## Cách tạo tài khoản admin đầu tiên

Vì `/admin` yêu cầu `role: admin`, mà đăng ký thường chỉ tạo `role: user` — cần vào MongoDB Atlas sửa tay:

1. Atlas dashboard → **Browse Collections** → database `footballwithme` → collection `users`.
2. Tìm user vừa đăng ký (theo email) → **Edit Document**.
3. Sửa field `role` từ `"user"` thành `"admin"` → **Update**.
4. Đăng xuất/đăng nhập lại trên web để token mới có quyền admin.

---

## Free tier — giới hạn cần biết

| Dịch vụ | Giới hạn free | Ảnh hưởng |
|---|---|---|
| MongoDB Atlas M0 | 512MB storage | Đủ dùng cho project cá nhân/demo, không đủ cho app có traffic lớn |
| Render Web Service | Ngủ sau 15 phút không dùng, 750h/tháng | Cold start ~30-50s cho request đầu; 750h đủ chạy 24/7 (tháng có ~730h) |
| Vercel Hobby | Không giới hạn nhiều cho cá nhân | Chỉ cấm dùng cho mục đích thương mại |

---

## Xử lý sự cố thường gặp

- **Frontend gọi API ra lỗi `Failed to fetch`**: kiểm tra `VITE_API_URL` trên Vercel có đúng URL Render + `/api` không, và Render service có đang chạy (không bị crash) không.
- **Lỗi CORS**: `CORS_ORIGIN` trên Render phải khớp domain Vercel 100% (không dư `/`, đúng `https://`).
- **MongoDB connection error trên Render logs**: kiểm tra lại `MONGO_URI` có đúng username/password, và Network Access trên Atlas đã allow `0.0.0.0/0`.
- **Refresh trang con (`/bai-viet/123`) bị 404 trên Vercel**: kiểm tra `frontend-rebuild/vercel.json` có đúng rewrite rule `"source": "/(.*)", "destination": "/index.html"`.
- **Đổi code xong không thấy cập nhật trên Vercel/Render**: cả 2 dịch vụ tự động redeploy mỗi khi có commit mới push lên nhánh `main` — nhớ push code lên GitHub trước.
