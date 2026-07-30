# Module: Đổi mật khẩu (khi đã đăng nhập)

Module fullstack tiếp theo sau Forgot/Reset Password (xem `FORGOT_PASSWORD_MODULE.md`). Khác biệt quan trọng: đây là hành động của user **đã đăng nhập** (dùng token JWT hiện có, không cần email/token reset), đặt trong trang `Profile.jsx` — không phải luồng "quên mật khẩu" qua email.

---

## Quyết định đã chốt

**Tài khoản đăng nhập bằng Google chưa có mật khẩu** (`User.js`: `password` không bắt buộc khi có `googleId`). Đã chốt qua `AskUserQuestion`: cho phép tài khoản dạng này **đặt mật khẩu lần đầu mà không cần nhập mật khẩu cũ** — sau đó họ vừa đăng nhập được bằng Google vừa bằng email/mật khẩu.

→ Backend cần phân biệt 2 trường hợp:
- User **đã có** `password` → bắt buộc nhập đúng `currentPassword` mới cho đổi.
- User **chưa có** `password` (tài khoản Google thuần) → bỏ qua bước xác minh, cho đặt `newPassword` luôn.

→ Frontend cần biết user hiện có mật khẩu hay chưa để quyết định hiện/ẩn ô "Mật khẩu hiện tại" — nhưng `User.toJSON()` xoá hẳn field `password` khỏi mọi response, nên phải tự thêm cờ `hasPassword` (boolean) vào response của `getMe`.

---

## Kiến trúc chung

```
[Frontend Profile.jsx]              [Backend /api/users]
Form "Đổi mật khẩu"
(ẩn/hiện ô mật khẩu cũ theo user.hasPassword)
   │ PUT /users/change-password { currentPassword?, newPassword }
   ▼
                          Tìm user theo req.user.id (từ middleware protect)
                          Nếu user.password đã tồn tại:
                              → so currentPassword với comparePassword, sai thì 401
                          Gán user.password = newPassword, user.save()
                          (pre('save') hook có sẵn tự hash, giống Forgot/Reset Password)
   ◀─────────────── trả message thành công/thất bại
```

Không cần token/email ở module này — bảo mật dựa vào middleware `protect` (JWT) đã có sẵn, giống hệt cơ chế `updateMe`.

---

## Bước 1 — Backend: cờ `hasPassword` + endpoint `change-password`

**Học được:** phân biệt giữa dữ liệu lưu trong DB (`user.password` trên document Mongoose gốc) và dữ liệu trả về client (`user.toJSON()` đã lọc bớt) — muốn thêm 1 field phái sinh (derived field) không nằm trong schema, phải tự build object response thủ công thay vì trả thẳng `res.json(user)`.

**Làm, trong `backend/src/controllers/userController.js`:**

1. Sửa hàm `getMe` để thêm cờ `hasPassword`:
```js
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const data = user.toJSON();
    data.hasPassword = !!user.password;
    res.json(data);
  } catch (err) {
    next(err);
  }
}
```
Lưu ý: check `!!user.password` (trên document gốc), không phải `!!data.password` (đã bị `toJSON()` xoá mất trước đó).

2. Thêm hàm mới `changePassword`, đặt sau `updateMe`:
```js
async function changePassword(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { currentPassword, newPassword } = req.body;
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    if (user.password) {
      if (!currentPassword || !(await user.comparePassword(currentPassword))) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
}
```
Dùng `user.save()` (không phải `findByIdAndUpdate`) để `pre('save')` hook hash password tự chạy — giống hệt cách `resetPassword` làm ở module trước.

3. Sửa `module.exports` cuối file:
```js
module.exports = { list, updateRole, remove, getMe, updateMe, changePassword };
```

**Làm, trong `backend/src/routes/userRoutes.js`:**

1. Sửa dòng import, thêm `changePassword`:
```js
const { list, updateRole, remove, getMe, updateMe, changePassword } = require('../controllers/userController');
```

2. Thêm route mới, đặt cạnh `router.put('/me', ...)`:
```js
router.put('/change-password', protect, changePassword);
```

**Kiểm tra bằng Postman/curl** (cần Bearer token của user đã đăng nhập):
- Với user **đã có mật khẩu**: gọi thiếu/sai `currentPassword` → phải nhận lỗi 401 "Current password is incorrect". Gọi đúng `currentPassword` + `newPassword` hợp lệ → nhận `{ message: "Password updated successfully" }`. Đăng nhập lại bằng mật khẩu mới để xác nhận.
- Với user **đăng nhập bằng Google, chưa có mật khẩu**: gọi chỉ với `newPassword` (không cần `currentPassword`) → phải thành công. Sau đó thử đăng nhập bằng email + `newPassword` vừa đặt → phải đăng nhập được (xác nhận vừa Google vừa email/mật khẩu đều dùng được).
- Gọi `newPassword` ngắn hơn 6 ký tự → phải báo lỗi 400.

---

## Bước 2 — Frontend: form "Đổi mật khẩu" trong `Profile.jsx`

**Học được:** tái sử dụng cờ `hasPassword` đã có sẵn trong `user` (tự động lấy được từ `useEffect` gọi `getMe(token)` đã có sẵn trong `AuthContext.jsx` — không cần sửa gì thêm ở `AuthContext.jsx`, cờ này tự "chảy" vào `user` sau khi Bước 1 xong).

**Làm, trong `frontend-rebuild/src/api/users.js`, thêm hàm mới:**
```js
export function changePassword(data, token){
    return apiRequest('/users/change-password', {method: 'PUT', body: data, token});
}
```

**Làm, trong `frontend-rebuild/src/pages/Profile.jsx`:**

Đây là 1 khối form **độc lập** với form đổi tên/bio hiện có (không dùng chung `profileReducer` — dùng `useState` riêng, đơn giản hơn, giống cách `Login.jsx`/`ForgotPassword.jsx` đang làm).

1. Import thêm `changePassword` từ `../api/users` (cùng dòng với `updateMe`).

2. Thêm state riêng ngay dưới khai báo `useReducer` hiện có:
```js
const [currentPassword, setCurrentPassword] = useState('');
const [newPassword, setNewPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [pwError, setPwError] = useState('');
const [pwSuccess, setPwSuccess] = useState(false);
const [pwLoading, setPwLoading] = useState(false);
```

3. Thêm handler riêng (không dùng `dispatch`, không đụng tới `profileReducer`):
```js
const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    if (newPassword !== confirmPassword) {
        setPwError('Mật khẩu xác nhận không khớp');
        return;
    }
    setPwLoading(true);
    try {
        await changePassword(
            { currentPassword: user.hasPassword ? currentPassword : undefined, newPassword },
            token
        );
        setPwSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    }
    catch (err) {
        setPwError(err.message);
    }
    finally {
        setPwLoading(false);
    }
};
```

4. Thêm JSX — đặt sau khối `<Button>` lưu tên/bio hiện có, trước thẻ đóng `</section>`:
```jsx
<div className="mt-12 border-t border-fwm-line pt-8">
    <h2 className="font-head text-lg font-black text-fwm-text">
        {user.hasPassword ? 'Đổi mật khẩu' : 'Đặt mật khẩu'}
    </h2>

    <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
        {user.hasPassword && (
            <div>
                <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">
                    Mật khẩu hiện tại
                </label>
                <input
                    required
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
                />
            </div>
        )}
        <div>
            <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">
                Mật khẩu mới
            </label>
            <input
                required
                type="password"
                minLength={6}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
            />
        </div>
        <div>
            <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">
                Xác nhận mật khẩu mới
            </label>
            <input
                required
                type="password"
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
            />
        </div>
        {pwError && <p className="text-sm text-fwm-pink">{pwError}</p>}
        {pwSuccess && <p className="text-sm text-emerald-400">Đổi mật khẩu thành công.</p>}
        <Button type="submit" variant="primary" className="w-full" disabled={pwLoading}>
            {pwLoading ? 'Đang lưu...' : (user.hasPassword ? 'Đổi mật khẩu' : 'Đặt mật khẩu')}
        </Button>
    </form>
</div>
```

**Kiểm tra:**
- User thường (có mật khẩu): vào `/ho-so` → thấy ô "Mật khẩu hiện tại" → nhập sai → báo lỗi "Current password is incorrect" (message từ backend). Nhập đúng + mật khẩu mới → thành công → đăng xuất, đăng nhập lại bằng mật khẩu mới.
- User Google (chưa có mật khẩu): vào `/ho-so` → **không thấy** ô "Mật khẩu hiện tại", chỉ thấy "Đặt mật khẩu" + 2 ô mật khẩu mới/xác nhận → đặt thành công → đăng xuất, thử đăng nhập bằng email/mật khẩu vừa đặt → phải vào được, đồng thời nút "Đăng nhập Google" vẫn dùng được như cũ.
- Nhập 2 ô mật khẩu mới không khớp nhau → phải báo lỗi ngay ở client, không gọi API.

---

## Còn cần bạn chốt

Không có — quyết định về tài khoản Google đã chốt qua `AskUserQuestion` trước khi viết tài liệu này.
