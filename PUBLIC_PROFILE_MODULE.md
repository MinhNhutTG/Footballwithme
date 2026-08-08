# Module: Hồ sơ công khai (xem trang cá nhân user khác)

Module fullstack tiếp theo sau SEO (`SEO_MODULE.md`, ✅). Thêm trang `/nguoi-dung/:id` xem thông tin công khai của 1 user — hiện `Profile.jsx` (`/ho-so`) chỉ hoạt động cho chính người đang đăng nhập (đọc từ `AuthContext`, không nhận `:id` từ URL), không thể tái sử dụng để xem người khác.

## Khảo sát hiện trạng (trước khi viết spec)

- **`User` model có nhiều field nhạy cảm** (`email`, `password`, `googleId`, `role`, `isVerified`, `resetPasswordToken/Expires`, `verificationToken/Expires`, `favorites`) — `toJSON()` hiện chỉ tự xoá `password`, **không** xoá các field nhạy cảm khác. `userController.list()` (dùng cho Admin) trả nguyên user (chấp nhận được vì chỉ admin gọi), nhưng **không được copy pattern đó sang endpoint public mới** — phải tự `select()` đúng field công khai (`name avatarUrl bio createdAt`).
- **Chưa có endpoint public nào lấy 1 user theo `id`** — `GET /api/users/me` cần token (chính mình), `GET /api/users` cần `adminOnly` (toàn bộ danh sách). Cần viết mới.
- **`Profile.jsx` không dùng được cho người khác** — không nhận `:id` từ URL, còn chứa cả form đổi mật khẩu/xoá tài khoản (tuyệt đối riêng tư) — phải tạo **trang mới** `PublicProfile.jsx`, không sửa `Profile.jsx`.
- **Route gotcha đã từng gặp ở Delete Account** (`DELETE /users/me` bị `/:id` nuốt mất vì khai báo sau) — áp dụng lại bài học: `GET /:id` (public, mới) phải khai báo **sau** `GET /count` và `GET /me` (2 route cụ thể hiện có), nếu không `:id` sẽ nuốt mất khi ai đó gọi đúng `/count`/`/me`.
- **`id` trong URL có thể không hợp lệ** (gõ tay sai, hoặc user đã bị admin xoá) — `User.findById()` với chuỗi không đúng định dạng ObjectId sẽ throw `CastError`, rơi vào error handler chung (thường trả 500, không đúng ý nghĩa) — cần tự validate `mongoose.Types.ObjectId.isValid()` trước, trả `404` rõ ràng.
- **`commentController.js` đã populate `author` với đúng field an toàn** (`name avatarUrl`, không lộ email/role) — nơi duy nhất trong UI công khai đang hiện tên/avatar tác giả khác là `CommentItem.jsx`, hiện là text/ảnh tĩnh, chưa có link nào.
- **Pattern đặt tên route tiếng Việt nhất quán**: `/bai-viet/:id`, `/chuyen-muc/:id` → route mới đặt `/nguoi-dung/:id`.

## Quyết định đã chốt

Chốt qua `AskUserQuestion`:
1. **Phạm vi: chỉ thông tin cơ bản** — tên, avatar, bio, ngày tham gia. **Không** thêm danh sách bình luận gần đây (giữ gọn, không cần thêm endpoint comment lọc theo tác giả).
2. **Gắn link ở đúng 1 nơi đã khảo sát**: `CommentItem.jsx` (tên + avatar tác giả comment) — không lan sang chỗ khác.

---

## Kiến trúc chung

```
GET /api/users/:id     (public, KHÔNG cần token)
        │
        ▼
userController.getPublic
  validate ObjectId hợp lệ → 404 nếu không
  User.findById(id).select('name avatarUrl bio createdAt')
  không tìm thấy → 404
        │
        ▼
{ _id, name, avatarUrl, bio, createdAt }   (KHÔNG có email/role/googleId/...)

PublicProfile.jsx (trang MỚI, /nguoi-dung/:id)
  useParams() → id → fetchPublicUser(id) → hiện avatar/tên/bio/ngày tham gia
  404/user đã xoá → thông báo "Không tìm thấy người dùng"

CommentItem.jsx → bọc avatar + tên tác giả bằng <Link to={`/nguoi-dung/${comment.author._id}`}>
```

---

## Bước 1 — Backend: `userController.js` thêm `getPublic`

**Sửa `backend/src/controllers/userController.js`** — thêm import ở đầu file:

```js
const mongoose = require('mongoose');
```

Thêm hàm mới (đặt sau hàm `count`):

```js
async function getPublic(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = await User.findById(req.params.id).select('name avatarUrl bio createdAt');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
}
```

Đổi dòng cuối file:
```js
module.exports = { list, count, updateRole, remove, getMe, updateMe, changePassword, deleteMe };
```
thành:
```js
module.exports = { list, count, updateRole, remove, getMe, updateMe, changePassword, deleteMe, getPublic };
```

Điểm cần hiểu: `.select('name avatarUrl bio createdAt')` là **whitelist** (chỉ lấy đúng 4 field liệt kê, không phải loại trừ) — an toàn hơn hẳn so với lấy nguyên `user` rồi tự xoá field nhạy cảm (dễ quên xoá sót khi sau này thêm field mới vào `User` model).

---

## Bước 2 — Backend: route `GET /api/users/:id`

**Sửa `backend/src/routes/userRoutes.js`:**

Đổi:
```js
const { list, count, updateRole, remove, getMe, updateMe, changePassword, deleteMe } = require('../controllers/userController');
```
thành:
```js
const { list, count, updateRole, remove, getMe, updateMe, changePassword, deleteMe, getPublic } = require('../controllers/userController');
```

Thêm route mới — **đặt sau** `DELETE /me` (đúng thứ tự: route cụ thể trước, route động `:id` sau):
```js
router.get('/count', count);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/change-password', protect, changePassword);
router.delete('/me', protect, deleteMe);
router.get('/:id', getPublic);
router.get('/', protect, adminOnly, list);
router.put('/:id/role', protect, adminOnly, updateRole);
router.delete('/:id', protect, adminOnly, remove);
```

**Kiểm tra (curl/Postman):**
- `GET /api/users/<id hợp lệ của 1 user thật>` (không token) → `200`, chỉ có `{_id, name, avatarUrl, bio, createdAt}`, **không** có `email`/`role`/`googleId`.
- `GET /api/users/<id không tồn tại nhưng đúng định dạng ObjectId>` → `404`.
- `GET /api/users/abc123` (id sai định dạng hoàn toàn) → `404` (không phải `500`).
- `GET /api/users/count` và `GET /api/users/me` (kèm token) vẫn hoạt động y hệt trước — không bị `:id` nuốt mất.

---

## Bước 3 — Frontend: `api/users.js` thêm `fetchPublicUser`

**Sửa `frontend-rebuild/src/api/users.js`** — thêm hàm mới:

```js
export function fetchPublicUser(id){
    return apiRequest(`/users/${id}`);
}
```

---

## Bước 4 — Frontend: trang mới `PublicProfile.jsx`

**Tạo file mới `frontend-rebuild/src/pages/PublicProfile.jsx`:**

```jsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchPublicUser } from '../api/users';
import SEO from '../components/common/SEO';

function PublicProfile() {
    const { id } = useParams();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');
        fetchPublicUser(id)
            .then(setUser)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]);

    const initials = user?.name?.trim().split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';

    if (loading) return null;

    if (error || !user) {
        return (
            <section className="mx-auto max-w-md px-4 py-24 text-center">
                <h1 className="font-head text-2xl font-black text-fwm-text">Không tìm thấy người dùng</h1>
                <p className="mt-3 text-fwm-muted">Tài khoản này có thể đã bị xoá.</p>
                <Link to="/" className="mt-6 inline-flex font-head text-sm font-bold text-fwm-accent">Về trang chủ</Link>
            </section>
        );
    }

    return (
        <section className="mx-auto max-w-md px-4 py-16 text-center">
            <SEO title={user.name} />
            <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-fwm-accent font-head text-2xl font-black text-fwm-ink">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
            </div>
            <h1 className="mt-4 font-head text-2xl font-black text-fwm-text">{user.name}</h1>
            {user.bio && <p className="mt-2 text-fwm-muted">{user.bio}</p>}
            <p className="mt-4 text-xs text-fwm-muted">Tham gia từ {new Date(user.createdAt).toLocaleDateString('vi-VN')}</p>
        </section>
    );
}

export default PublicProfile;
```

Điểm cần hiểu:
- **`if (loading) return null` đặt sau mọi hook** (`useState`/`useEffect`) — không đặt trước, vi phạm Rules of Hooks.
- **`error || !user`** (không chỉ `error`) — trường hợp `id` không tồn tại, backend trả `404` với body `{message:...}`, `apiRequest` (`client.js`) sẽ `throw` vì `!res.ok`, rơi vào `.catch()` → `error` có giá trị, `user` vẫn `null` → nhánh lỗi hiện đúng. Nhưng phòng thêm trường hợp API trả `200` với body rỗng bất thường, kiểm tra cả `!user` cho chắc.

**Sửa `frontend-rebuild/src/App.jsx`** — thêm import:
```js
import PublicProfile from './pages/PublicProfile';
```
Thêm route mới (đặt cạnh route `/ho-so`):
```jsx
        <Route path='/ho-so' element={<Profile/>} />
        <Route path='/nguoi-dung/:id' element={<PublicProfile/>} />
```

**Kiểm tra:** truy cập thẳng `/nguoi-dung/<id thật>` → hiện đúng avatar/tên/bio/ngày tham gia. Truy cập `/nguoi-dung/000000000000000000000000` (id giả đúng định dạng) → hiện "Không tìm thấy người dùng".

---

## Bước 5 — Frontend: gắn link trong `CommentItem.jsx`

**Sửa `frontend-rebuild/src/components/comment/CommentItem.jsx`** — thêm import:
```js
import { Link } from 'react-router-dom'
```

Đổi:
```jsx
                <Avatar initials={initial} size="sm" preview={comment.author.avatarUrl} />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <p className="font-head text-sm font-bold text-fwm-text">{comment.author.name}</p>
```
thành:
```jsx
                <Link to={`/nguoi-dung/${comment.author._id}`} className="shrink-0">
                    <Avatar initials={initial} size="sm" preview={comment.author.avatarUrl} />
                </Link>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <Link to={`/nguoi-dung/${comment.author._id}`} className="font-head text-sm font-bold text-fwm-text hover:text-fwm-accent">
                            {comment.author.name}
                        </Link>
```

**Kiểm tra:** vào 1 bài viết có bình luận, bấm avatar hoặc tên tác giả 1 comment bất kỳ → điều hướng đúng sang `/nguoi-dung/<id của người đó>`, hiện đúng thông tin công khai của họ. Bấm vào comment của chính mình → vẫn sang trang public profile của chính mình (không phải `/ho-so`) — đúng hành vi mong đợi, vì link này luôn trỏ theo `author._id`, không phân biệt có phải chính mình hay không.

---

## Còn cần bạn chốt

Không có — phạm vi (chỉ thông tin cơ bản, không kèm danh sách bình luận) và vị trí gắn link (chỉ `CommentItem.jsx`) đã chốt qua `AskUserQuestion` trước khi viết tài liệu này.
