# Module: Xoá tài khoản (Delete Account)

Module fullstack tiếp theo sau Xác thực email (`EMAIL_VERIFICATION_MODULE.md`), khép lại nhóm module Auth/Profile. Đặt trong `Profile.jsx`, dưới khối "Đổi mật khẩu" (`CHANGE_PASSWORD_MODULE.md`) — cùng trang, không phải trang riêng.

---

## Quyết định đã chốt

**Xác nhận xoá khác nhau theo 2 loại tài khoản** (chốt qua `AskUserQuestion`):
- User **đã có** `password` → bắt nhập lại password đúng mới xoá được (giống logic `changePassword`). Bản thân việc nhập đúng password là bước xác nhận, không cần thêm bước nào khác.
- User **chưa có** `password` (tài khoản Google thuần) → không có gì để nhập lại, dùng **xác nhận 2 lần bằng dialog**: bấm "Xoá tài khoản" → hiện cảnh báo hậu quả → bấm lần 2 "Tôi hiểu, xoá vĩnh viễn" mới thực sự gọi API.

**Cascade xoá comment (quyết định kỹ thuật, không phải hỏi người dùng):** `Comment.author` là `ObjectId` bắt buộc trỏ tới `User`, và `CommentItem.jsx` đọc thẳng `comment.author.name` không kiểm tra null. Nếu xoá `User` mà để comment mồ côi, `populate('author', ...)` sẽ trả `author: null` và **crash trang** (`Cannot read properties of null`) ngay khi ai đó mở bài viết có comment của người đã xoá tài khoản. → Bắt buộc xoá luôn toàn bộ comment của user đó cùng lúc xoá tài khoản.

**Favorites không cần xử lý riêng:** `favorites` là mảng `postId` lưu ngay trên document `User` (không phải bảng riêng, không ai khác tham chiếu tới) — xoá `User` là tự động mất theo, không có gì "mồ côi".

---

## Kiến trúc chung

```
[Frontend Profile.jsx]                      [Backend /api/users]
"Vùng nguy hiểm" → Xoá tài khoản
  │
  ├─ user.hasPassword: form nhập password
  │     │ DELETE /users/me { password }
  │     ▼
  └─ !user.hasPassword: dialog xác nhận 2 lần
        │ DELETE /users/me {}
        ▼
                                    Tìm user theo req.user.id
                                    Nếu user.password tồn tại:
                                        → so password với comparePassword, sai thì 401
                                    Comment.deleteMany({author: user._id})
                                    User.findByIdAndDelete(user._id)
        ◀─────────────── { success: true } hoặc lỗi
  │
  ▼
logout() (AuthContext) + navigate('/')
```

Không cần token/email riêng — bảo mật dựa vào middleware `protect` (JWT) đã có sẵn, giống hệt `changePassword`/`updateMe`.

---

## Bước 1 — Backend: endpoint `DELETE /users/me`

**Làm, trong `backend/src/controllers/userController.js`:**

1. Thêm import `Comment` ở đầu file (chưa có, `User` là model duy nhất được import hiện tại):
```js
const User = require('../models/User');
const Comment = require('../models/Comment');
```

2. Thêm hàm mới `deleteMe`, đặt sau `changePassword`:
```js
async function deleteMe(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.password) {
      const { password } = req.body;
      if (!password || !(await user.comparePassword(password))) {
        return res.status(401).json({ message: 'Password is incorrect' });
      }
    }

    await Comment.deleteMany({ author: user._id });
    await User.findByIdAndDelete(user._id);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
```
Lưu ý thứ tự: xoá `Comment` **trước** khi xoá `User` — nếu đảo ngược, `user._id` vẫn còn dùng được (biến JS, không phụ thuộc DB) nên thực ra không bug, nhưng giữ thứ tự "dọn dữ liệu phụ thuộc trước, xoá gốc sau" là thói quen đúng nói chung.

3. Sửa `module.exports` cuối file, thêm `deleteMe`:
```js
module.exports = { list, updateRole, remove, getMe, updateMe, changePassword, deleteMe };
```

**Làm, trong `backend/src/routes/userRoutes.js`:**

1. Sửa dòng import, thêm `deleteMe`:
```js
const { list, updateRole, remove, getMe, updateMe, changePassword, deleteMe } = require('../controllers/userController');
```

2. Thêm route mới, đặt cạnh `router.put('/change-password', ...)`:
```js
router.delete('/me', protect, deleteMe);
```

**Kiểm tra bằng Postman/curl** (cần Bearer token của user đã đăng nhập):
- User **có mật khẩu**: gọi thiếu/sai `password` → phải nhận lỗi 401 "Password is incorrect", tài khoản vẫn còn nguyên (kiểm tra lại bằng `GET /users/me`). Gọi đúng `password` → nhận `{ success: true }`, gọi `GET /users/me` lại bằng token cũ → phải lỗi (user không còn tồn tại).
- User **Google thuần, chưa có password**: gọi `DELETE /users/me` với body rỗng `{}` → phải xoá thành công ngay (không cần password).
- Tạo 1 comment bằng tài khoản test trước khi xoá → sau khi xoá tài khoản, vào lại bài viết đó (`GET /posts/:id` + `GET /comments?postId=...`) → phải **không còn** comment đó, và trang không bị lỗi.

---

## Bước 2 — Frontend: "Vùng nguy hiểm" trong `Profile.jsx`

**Làm, trong `frontend-rebuild/src/api/users.js`, thêm hàm mới:**
```js
export function deleteAccount(data, token){
    return apiRequest('/users/me', {method: 'DELETE', body: data, token});
}
```

**Làm, trong `frontend-rebuild/src/pages/Profile.jsx`:**

1. Import thêm `deleteAccount` từ `../api/users` (cùng dòng với `changePassword`), và lấy thêm `logout` từ `useAuth()` (dòng `const { user, token, updateUser } = useAuth();` hiện tại thiếu `logout`).

2. Thêm state riêng, đặt cạnh khối state của "Đổi mật khẩu":
```js
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [deletePassword, setDeletePassword] = useState('');
const [deleteError, setDeleteError] = useState('');
const [deleteLoading, setDeleteLoading] = useState(false);
```

3. Thêm handler:
```js
const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteError('');
    setDeleteLoading(true);
    try {
        await deleteAccount({ password: user.hasPassword ? deletePassword : undefined }, token);
        logout();
        navigate('/');
    }
    catch (err) {
        setDeleteError(err.message);
    }
    finally {
        setDeleteLoading(false);
    }
};
```
Lưu ý: gọi `logout()` **sau khi** `deleteAccount` thành công (không phải trước) — nếu xoá thất bại (vd. sai password), token vẫn còn để user thử lại, không bị đá ra ngoài oan.

4. Thêm JSX — đặt sau khối `<div className="mt-12 ...">` (Đổi mật khẩu) hiện có, trước `{state.error && ...}`:
```jsx
<div className="mt-12 border-t border-fwm-line pt-8">
    <h2 className="font-head text-lg font-black text-fwm-pink">Vùng nguy hiểm</h2>
    <p className="mt-2 text-sm text-fwm-muted">
        Xoá tài khoản sẽ xoá vĩnh viễn thông tin cá nhân và toàn bộ bình luận của bạn. Hành động này không thể hoàn tác.
    </p>

    {!showDeleteConfirm ? (
        <Button
            type="button"
            variant="ghost"
            className="mt-4 border-fwm-pink text-fwm-pink hover:bg-fwm-pink/10"
            onClick={() => setShowDeleteConfirm(true)}
        >
            Xoá tài khoản
        </Button>
    ) : (
        <form onSubmit={handleDeleteAccount} className="mt-4 space-y-4 rounded-fwm border border-fwm-pink/40 p-4">
            {user.hasPassword ? (
                <div>
                    <label htmlFor="delete-password" className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">
                        Nhập mật khẩu để xác nhận
                    </label>
                    <input
                        id="delete-password"
                        required
                        type="password"
                        autoComplete="current-password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-pink focus:outline-none"
                    />
                </div>
            ) : (
                <p className="text-sm text-fwm-pink">
                    Bấm "Tôi hiểu, xoá vĩnh viễn" để xoá tài khoản ngay lập tức. Hành động này không thể hoàn tác.
                </p>
            )}
            {deleteError && <p className="text-sm text-fwm-pink">{deleteError}</p>}
            <div className="flex gap-3">
                <Button
                    type="submit"
                    variant="ghost"
                    className="border-fwm-pink text-fwm-pink hover:bg-fwm-pink/10"
                    disabled={deleteLoading}
                >
                    {deleteLoading ? 'Đang xoá...' : (user.hasPassword ? 'Xác nhận xoá tài khoản' : 'Tôi hiểu, xoá vĩnh viễn')}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError(''); }}
                >
                    Huỷ
                </Button>
            </div>
        </form>
    )}
</div>
```

**Kiểm tra:**
- User thường (có mật khẩu): vào `/ho-so` → bấm "Xoá tài khoản" → hiện ô nhập password → nhập sai → báo lỗi "Password is incorrect", tài khoản chưa mất, vẫn ở nguyên trang. Bấm "Huỷ" → form đóng lại, state reset. Nhập đúng password → bị đăng xuất + điều hướng về `/`, thử đăng nhập lại bằng tài khoản đó → phải báo lỗi (không tồn tại).
- User Google (chưa có mật khẩu): bấm "Xoá tài khoản" → hiện cảnh báo (không có ô nhập) → bấm "Tôi hiểu, xoá vĩnh viễn" → xoá ngay, đăng xuất + về `/`.
- Tài khoản có để lại comment ở 1-2 bài viết trước khi xoá → sau khi xoá, mở lại các bài viết đó → **không còn thấy** comment cũ, trang hiển thị bình thường, không lỗi console.
- Refresh lại trang sau khi bị đăng xuất do xoá tài khoản → không tự đăng nhập lại (đúng hành vi `logout()` đã xoá `localStorage`).

---

## Còn cần bạn chốt

Không có — quyết định về cách xác nhận đã chốt qua `AskUserQuestion` trước khi viết tài liệu này.
