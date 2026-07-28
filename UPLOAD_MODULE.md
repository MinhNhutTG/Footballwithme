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

Đã khảo sát lại code thật (2026-07-28), sửa 1 điểm sai trong bản sơ bộ trước: **`Category.jsx`/`CategoryTile.jsx` KHÔNG liên quan** — gradient ở đó là `category.gradient` (màu nền banner chuyên mục, định nghĩa tĩnh trong `data/categories.js`), khác hẳn `post.gradient` (màu nền thẻ từng bài viết). Chỉ 4 nơi thật sự hiển thị ảnh/gradient của **từng bài viết**: `ArticleCard.jsx`, `ArticleDetail.jsx` (2 chỗ: banner đầu trang + khối video), `PopularItem.jsx`, `AdminTableRow.jsx`.

Tái dùng nguyên `api/upload.js` và endpoint `/api/uploads` đã có ở Phần 1 — không xây lại pipeline upload.

### Bước 1 — Backend: thêm field vào `Post` model

**Học được:** so sánh với `updateMe` ở Phần 1 — `postController.js` (`create`/`update`) đã spread thẳng `req.body` vào payload sẵn từ trước (không có allowlist field thủ công), nên bước này **chỉ cần sửa model**, không cần đụng vào controller.

**Làm:** trong `backend/src/models/Post.js`, thêm 2 dòng sau `gradient`:

```js
coverImageUrl: { type: String, default: '' },
videoUrl: { type: String, default: '' },
```

**Kiểm tra:** `POST /api/posts` (hoặc `PUT /api/posts/:id`) với body có thêm `"coverImageUrl": "https://..."` → response trả về post có field này. Không cần sửa gì ở `postController.js`.

---

### Bước 2 — Frontend: thêm input file trong form Admin

**Học được:** truyền `token` xuống component con để tự gọi API cần xác thực (`PostForm` hiện chưa nhận `token` — khác `Profile.jsx` vốn tự có `token` từ `useAuth()` ngay trong cùng component).

**Làm, trong `Admin.jsx`:**

1. `toFormValues(post)` — thêm 2 dòng vào object trả về:
```js
coverImageUrl: post.coverImageUrl || '', videoUrl: post.videoUrl || '',
```
2. Chỗ render `<PostForm .../>` (view === 'new'/'edit') — truyền thêm `token`:
```jsx
<PostForm initial={editingPost ? toFormValues(editingPost) : undefined} onSubmit={handleSubmit} onCancel={handleCancel} token={token} />
```
3. Trong `handleSubmit`, object `payload` — thêm 2 field:
```js
coverImageUrl: form.coverImageUrl,
videoUrl: form.videoUrl,
```

**Làm, trong `PostForm.jsx`:**

1. Import thêm: `import { uploadFile } from '../../api/upload';`
2. `EMPTY_FORM` — thêm `coverImageUrl: '', videoUrl: '',`
3. Nhận thêm prop: `function PostForm({ initial, onSubmit, onCancel, token }) {`
4. Thêm handler dùng chung cho cả 2 loại file (đặt cạnh `handleChange`/`handleRichChange`):
```js
const handleFileUpload = (field) => (e) => {
  const file = e.target.files[0];
  if (!file) return;
  uploadFile(file, token).then((res) => setForm((f) => ({ ...f, [field]: res.url })));
};
```
5. Thêm khối UI mới (đặt trước khối `{form.category === 'skill' && (...)}`), input ảnh cover luôn hiện, input video chỉ hiện khi `category === 'skill'` (khớp đúng chỗ `ArticleDetail.jsx` hiện chỉ render khối video cho bài `skill`):
```jsx
<div>
  <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Ảnh cover</label>
  <input type="file" accept="image/*" onChange={handleFileUpload('coverImageUrl')}
    className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-sm text-fwm-text" />
  {form.coverImageUrl && <img src={form.coverImageUrl} alt="" className="mt-2 h-32 w-full rounded-fwm object-cover" />}
</div>

{form.category === 'skill' && (
  <div>
    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Video hướng dẫn (tùy chọn)</label>
    <input type="file" accept="video/*" onChange={handleFileUpload('videoUrl')}
      className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-sm text-fwm-text" />
    {form.videoUrl && <video src={form.videoUrl} controls className="mt-2 h-32 w-full rounded-fwm object-cover" />}
  </div>
)}
```

> Không cần preview cục bộ bằng `FileReader` như `Profile.jsx` — video/ảnh Cloudinary trả `secure_url` public ngay sau khi upload xong, dùng thẳng URL đó làm preview luôn (đơn giản hơn, đổi lại người dùng phải chờ upload xong mới thấy preview thay vì thấy ngay).

**Kiểm tra:** vào Admin → Thêm bài viết → chọn ảnh cover → thấy preview hiện ra sau khi upload xong → Lưu → Cloudinary Dashboard có file mới, DB có `coverImageUrl`.

---

### Bước 3 — Frontend: hiển thị ảnh/video thật, giữ gradient làm fallback

**Học được:** conditional render giữa ảnh thật và placeholder gradient — bài viết cũ chưa có ảnh vẫn phải hiển thị bình thường.

**Làm, từng file:**

**`ArticleCard.jsx`** — thẻ `<Link>` bọc ảnh (dòng 13-19), sửa thành:
```jsx
<Link to={`/bai-viet/${article.id}`} className={`relative block aspect-[16/10] overflow-hidden rounded-fwm ${article.coverImageUrl ? '' : `bg-gradient-to-br ${article.gradient}`}`}>
    {article.coverImageUrl && (
        <img src={article.coverImageUrl} alt={article.title[lang]} className="absolute inset-0 h-full w-full object-cover" />
    )}
    <span className="absolute left-3 top-3 rounded-fwm-pill bg-fwm-ink/70 px-3 py-1 font-head text-xs font-bold uppercase tracking-wide text-white">
        {catLabel}
    </span>
    {!article.coverImageUrl && (
        <span className="absolute inset-0 flex items-center justify-center font-head text-sm font-bold text-white/70">
            [{article.tags.join(' · ')}]
        </span>
    )}
</Link>
```
(chữ tag ở giữa chỉ là placeholder thay ảnh — ẩn đi khi đã có ảnh thật, badge chuyên mục ở góc trái thì giữ nguyên luôn hiện)

**`PopularItem.jsx`** — dòng 10, đổi `<span className={...gradient...} />` thành:
```jsx
{article.coverImageUrl ? (
    <img src={article.coverImageUrl} alt="" className="h-12 w-16 shrink-0 rounded-fwm object-cover" />
) : (
    <span className={`h-12 w-16 shrink-0 rounded-fwm bg-gradient-to-br ${article.gradient}`} />
)}
```

**`AdminTableRow.jsx`** — dòng 9, tương tự:
```jsx
{post.coverImageUrl ? (
    <img src={post.coverImageUrl} alt="" className="mr-3 inline-block h-8 w-12 rounded-fwm-sm object-cover align-middle" />
) : (
    <span className={`mr-3 inline-block h-8 w-12 rounded-fwm-sm bg-gradient-to-br ${post.gradient} align-middle`} />
)}
```

**`ArticleDetail.jsx`** — 2 chỗ:

1. Banner đầu trang (dòng 35-59) — ảnh cover làm nền thay gradient, thêm lớp phủ tối để chữ trắng vẫn đọc được:
```jsx
<section
    className={`relative border-b border-fwm-line px-4 py-16 ${article.coverImageUrl ? 'bg-cover bg-center' : `bg-gradient-to-br ${article.gradient}`}`}
    style={article.coverImageUrl ? { backgroundImage: `url(${article.coverImageUrl})` } : undefined}
>
    {article.coverImageUrl && <div className="absolute inset-0 bg-fwm-ink/50" />}
    <div className="relative mx-auto max-w-4xl">
        {/* giữ nguyên toàn bộ nội dung bên trong (Link, h1, tags, nút favorite) không đổi */}
    </div>
</section>
```
Lưu ý: chỉ thêm `relative` vào `<div className="mx-auto max-w-4xl">` (để nó nổi lên trên lớp phủ tối `absolute`) và thêm dòng `<div className="absolute inset-0 bg-fwm-ink/50" />` — không đổi gì nội dung bên trong.

2. Khối video (dòng 63-72), chỉ render khi `isSkill`:
```jsx
{isSkill && (
    <div className="mb-8 overflow-hidden rounded-fwm-lg border border-fwm-line bg-fwm-card-2">
        {article.videoUrl ? (
            <video src={article.videoUrl} controls className="aspect-video w-full" />
        ) : (
            <div className={`relative flex aspect-video items-center justify-center bg-gradient-to-br ${article.gradient}`}>
                <span className="animate-fwm-ring flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-2xl text-fwm-ink">▶</span>
            </div>
        )}
        <p className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-fwm-muted">
            {t.article.videoCaption}
        </p>
    </div>
)}
```

**Kiểm tra:** mở trang chủ/category — bài viết đã có `coverImageUrl` hiện ảnh thật, bài viết cũ (chưa có) vẫn hiện gradient như trước, không vỡ layout. Mở `ArticleDetail` của 1 bài `skill` có `videoUrl` → video phát được (dùng `controls` mặc định của thẻ `<video>`); bài `skill` chưa có video → vẫn hiện placeholder nút ▶ như cũ.

---

## Còn cần bạn chốt

1. **Cách làm việc:** phần fullstack này (đặc biệt backend — multer/Cloudinary hoàn toàn mới) bạn muốn tự gõ theo spec như trên, hay để mình `Edit` thẳng vào code rồi bạn review?
2. **Phần 2 (ảnh/video bài viết):** làm ngay sau Phần 1, hay dừng lại kiểm tra kỹ Phần 1 trước?
