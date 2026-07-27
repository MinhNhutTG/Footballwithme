# Module: Upload Ảnh & Video (Fullstack — Cloudinary)

Module đầu tiên theo hướng **fullstack theo tính năng** (không còn học React thuần theo `REACT_ROADMAP.md`). Khác với Profile/Comments trước đây (backend đã có sẵn, chỉ viết frontend), module này **backend chưa tồn tại — phải xây từ đầu** cùng với frontend.

---

## Hiện trạng đã khảo sát trong code

- `backend/`: không có `multer`, không có `cloudinary`, không có route upload nào. `Post` model không có field ảnh/video (chỉ có `gradient` — class Tailwind cho nền màu). `User` model không có field avatar.
- `frontend-rebuild/src/pages/Profile.jsx`: **đã có sẵn UI upload avatar** — input file (`accept="image/*"`), `handleFileChange`, state `preview` hiển thị ảnh xem trước qua `<Avatar preview={...}>`. Nhưng đây chỉ là preview cục bộ (`URL.createObjectURL` hoặc tương tự) — **không gửi lên server, không lưu lại**. Đây là phần dở dang rõ nhất.
- Toàn bộ nơi hiển thị "ảnh" bài viết (`ArticleCard`, `ArticleDetail`, `Category`, `PopularItem`, `AdminTableRow`) đều dùng `bg-gradient-to-br ${gradient}` — chưa có ảnh thật bao giờ.

→ Hai tính năng con, độc lập, làm tuần tự:

1. **Avatar người dùng** — nhỏ, frontend đã có 90%, chỉ thiếu backend + nối API thật. Làm trước để dựng xong "đường ống" upload dùng chung.
2. **Ảnh cover bài viết (Admin)** — tái dùng đường ống upload ở bước 1, thêm field vào `Post`, thay `gradient` bằng ảnh thật (giữ `gradient` làm fallback khi chưa có ảnh). Video: gộp vào bước này dưới dạng field `videoUrl` tùy chọn (Cloudinary lưu được cả video, không cần service riêng).

---

## Kiến trúc chung (dùng cho cả 2 tính năng)

```
[Frontend]                         [Backend]                      [Cloudinary]
<input type="file">
   │ chọn file
   ▼
FormData (field "file")
   │ POST /api/uploads  (header: token)
   ▼
                              multer (memoryStorage, giới hạn size/mime)
                                   │ buffer
                                   ▼
                              cloudinary.uploader.upload_stream
                                   │──────────────────────────────▶ lưu file, tối ưu ảnh
                                   ◀────────────────────────────── trả về { secure_url, ... }
                              trả JSON { url: secure_url }
   ◀───────────────────────────────
lưu url vào state → PUT /api/users/me { avatarUrl: url }
   hoặc gộp vào payload tạo/sửa Post
```

Một endpoint upload **dùng chung** cho cả avatar lẫn ảnh/video bài viết — không tạo 2 route riêng, tránh trùng lặp logic multer/cloudinary.

### Package cần cài (backend)

```bash
cd backend
npm install multer cloudinary
```

- `multer`: đọc `multipart/form-data`, không cần lưu ổ cứng (`memoryStorage`) vì file được đẩy thẳng lên Cloudinary.
- `cloudinary`: SDK chính thức, có `uploader.upload_stream` nhận buffer trực tiếp.

### Setup Cloudinary (bạn tự làm, không nằm trong code)

1. Tạo tài khoản free tại cloudinary.com.
2. Vào Dashboard, lấy 3 giá trị: `Cloud name`, `API Key`, `API Secret`.
3. Thêm vào `backend/.env`:
   ```
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```

---

## Phần 1 — Avatar người dùng

### Bước 1 — Backend: cấu hình Cloudinary + endpoint upload chung

**Học được:** `multer` xử lý multipart form-data; upload buffer lên service ngoài bằng stream; tạo route dùng chung cho nhiều tính năng.

**Làm:**

Tạo `backend/src/config/cloudinary.js`:

```js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
```

Tạo `backend/src/middleware/upload.js`:

```js
const multer = require('multer');

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error('Định dạng file không được hỗ trợ'));
    }
    cb(null, true);
  },
});

module.exports = upload;
```

Tạo `backend/src/controllers/uploadController.js`:

```js
const cloudinary = require('../config/cloudinary');

exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Chưa chọn file' });

    const resourceType = req.file.mimetype.startsWith('video') ? 'video' : 'image';

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: resourceType, folder: 'footballwithme' },
        (error, uploadResult) => (error ? reject(error) : resolve(uploadResult))
      );
      stream.end(req.file.buffer);
    });

    res.json({ url: result.secure_url, resourceType });
  } catch (err) {
    next(err);
  }
};
```

Tạo `backend/src/routes/uploadRoutes.js`:

```js
const express = require('express');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth'); // dùng đúng tên export hiện có trong middleware/auth.js
const { uploadFile } = require('../controllers/uploadController');

const router = express.Router();

router.post('/', protect, upload.single('file'), uploadFile);

module.exports = router;
```

Đăng ký route trong `backend/src/server.js` (theo đúng cách các route khác đang được `app.use('/api/...', ...)`):

```js
app.use('/api/uploads', require('./routes/uploadRoutes'));
```

> Kiểm tra tên hàm export thật trong `middleware/auth.js` trước khi import — file trên đang giả định export tên `protect`, có thể project đang đặt tên khác.

**Kiểm tra:** Dùng Postman/curl gửi `POST http://localhost:5000/api/uploads` với header `token`, body `form-data` field `file` là 1 ảnh → nhận về `{ url: "https://res.cloudinary.com/...", resourceType: "image" }`. Vào Cloudinary Dashboard → Media Library thấy file trong folder `footballwithme`.

---

### Bước 2 — Backend: thêm field `avatarUrl` vào User

**Học được:** Thêm field vào Mongoose schema có sẵn, mở rộng route update không phá field cũ.

**Làm:**

Trong `backend/src/models/User.js`, thêm 1 dòng sau `bio`:

```js
avatarUrl: { type: String, default: '' },
```

Trong `backend/src/controllers/userController.js`, tìm hàm xử lý `PUT /api/users/me` (cập nhật `name`/`bio`), thêm `avatarUrl` vào danh sách field được nhận và gán:

```js
const { name, bio, avatarUrl } = req.body;
if (name !== undefined) user.name = name;
if (bio !== undefined) user.bio = bio;
if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
```

**Kiểm tra:** `PUT /api/users/me` với body `{ "avatarUrl": "https://res.cloudinary.com/..." }` → response trả về user có `avatarUrl` mới. `GET /api/users/me` sau đó vẫn thấy giá trị đã lưu (persist đúng trong MongoDB).

---

### Bước 3 — Frontend: nối upload thật vào `Profile.jsx`

**Học được:** Gửi `FormData` bằng `fetch`, không set header `Content-Type` thủ công (browser tự set kèm boundary); cập nhật state sau khi có URL thật thay vì chỉ preview cục bộ.

**Làm:** Trong `frontend-rebuild/src/api/`, thêm hàm mới (đặt cùng chỗ các hàm gọi API khác, ví dụ `api/uploads.js`):

```js
export async function uploadFile(file, token) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/uploads`, {
    method: 'POST',
    headers: { token },
    body: formData,
  });

  if (!res.ok) throw new Error('Upload thất bại');
  return res.json(); // { url, resourceType }
}
```

Trong `Profile.jsx`, sửa `handleFileChange`: giữ nguyên phần set `preview` để người dùng thấy ảnh ngay (UX phản hồi tức thì), nhưng **thêm** gọi `uploadFile` ở background, rồi lưu `url` trả về vào state form (field sẽ được gửi kèm khi bấm "Lưu thay đổi" cùng `name`/`bio` qua `PUT /users/me`) — không tự upload xong là lưu DB ngay, giữ đúng hành vi "Lưu thay đổi" hiện tại của trang (chỉ persist khi bấm nút Lưu).

> Đây là điểm cần bạn quyết định khi gõ: upload ngay khi chọn file (rồi disable nút chọn lại trong lúc chờ) hay chờ tới lúc bấm "Lưu thay đổi" mới upload? Cách 1 đơn giản hơn cho bước học đầu tiên.

**Kiểm tra:** Chọn ảnh trong `/ho-so` → thấy preview ngay → bấm "Lưu thay đổi" → reload trang → avatar vẫn còn (vì đã lưu `avatarUrl` thật trong DB, không còn là blob URL tạm).

---

## Phần 2 — Ảnh cover + video cho bài viết (Admin)

*(Viết chi tiết từng bước sau khi Phần 1 chạy xong — vì Phần 2 tái dùng nguyên `api/uploads.js` và endpoint `/api/uploads` đã có ở Phần 1, không cần xây lại. Sơ bộ các việc cần làm:)*

- `Post` model: thêm `coverImageUrl: { type: String, default: '' }` và `videoUrl: { type: String, default: '' }`.
- Admin form tạo/sửa bài viết: thêm 2 input file (ảnh, video tùy chọn), gọi `uploadFile` trước khi `createPost`/`updatePost`, gộp URL vào payload.
- `ArticleCard`, `ArticleDetail`, `Category`, `PopularItem`, `AdminTableRow`: nếu `coverImageUrl` có giá trị → render `<img>`/`<video>` thay vì `div` gradient; nếu rỗng → giữ nguyên gradient cũ làm fallback (không phá bài viết cũ chưa có ảnh).

---

## Còn cần bạn chốt

1. **Cách làm việc:** phần fullstack này (đặc biệt backend — multer/Cloudinary hoàn toàn mới) bạn muốn tự gõ theo spec như trên, hay để mình `Edit` thẳng vào code rồi bạn review?
2. **Phần 2 (ảnh/video bài viết):** làm ngay sau Phần 1, hay dừng lại kiểm tra kỹ Phần 1 trước?
