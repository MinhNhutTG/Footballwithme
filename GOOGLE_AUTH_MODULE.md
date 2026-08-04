# Module: Đăng nhập/Đăng ký bằng Google (Google Identity Services)

> **✅ Trạng thái: đã hoàn thành và verify (2026-07-29).** Lưu ý: từ module Xác thực email (2026-08-04), tài khoản tạo/liên kết qua Google được set thẳng `isVerified: true`, không cần xác thực email riêng.

Làm **trước** module "Quên mật khẩu" (đổi ý theo yêu cầu 2026-07-28) — spec quên mật khẩu đã viết sẵn ở `FORGOT_PASSWORD_MODULE.md`, quay lại làm sau khi module này xong.

Đã chốt 2 quyết định kiến trúc:
- **Luồng:** Google Identity Services (ID token) — không redirect, không cần Client Secret ở backend.
- **Trùng email với tài khoản mật khẩu có sẵn:** tự động liên kết (gán `googleId` vào user cũ, cho đăng nhập bằng cả 2 cách).

---

## Kiến trúc chung

```
[Frontend]                              [Backend]                       [Google]
Nút "Đăng nhập bằng Google"
   │ (script GIS render sẵn nút thật của Google)
   ▼
Người dùng chọn tài khoản Google
   │ Google trả về "credential" (ID token, JWT do Google ký)
   ▼
POST /api/auth/google { credential }
   ▼
                              google-auth-library verify credential
                              bằng GOOGLE_CLIENT_ID ──────────────────▶ Google xác minh chữ ký token
                                                       ◀──────────────── payload { sub, email, name }

                              Tìm User theo googleId HOẶC email
                                - có rồi (đã link) → đăng nhập luôn
                                - có email nhưng chưa có googleId → gán googleId vào (tự liên kết)
                                - chưa có → tạo user mới, không cần password
                              Ký JWT hệ thống y hệt login thường
   ◀─────────────────────────────── { user, token }
lưu vào AuthContext y hệt login/register hiện có
```

Điểm khác biệt so với `login`/`register` hiện có: **không cần `password`** cho tài khoản tạo qua Google — phải sửa `User` model để `password` không bắt buộc trong trường hợp này.

### Package cần cài (backend)

```bash
cd backend
npm install google-auth-library
```

### Setup Google Cloud Console (bạn tự làm, không nằm trong code)

1. Vào [console.cloud.google.com](https://console.cloud.google.com) → tạo project mới (hoặc dùng project có sẵn).
2. Vào **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
3. Application type: **Web application**.
4. **Authorized JavaScript origins**: thêm `http://localhost:5173` (khớp port Vite đang chạy, xem `CORS_ORIGIN` trong `backend/.env` nếu không chắc).
5. Không cần điền "Authorized redirect URIs" (luồng ID token không redirect).
6. Copy **Client ID** (dạng `xxxx.apps.googleusercontent.com`), thêm vào **2 nơi**:
   - `backend/.env`: `GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com`
   - `frontend-rebuild/.env`: `VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com` (cùng 1 giá trị, không phải 2 client khác nhau — file `.env` frontend có thể chưa tồn tại, tạo mới nếu cần, cạnh nơi `VITE_API_URL` được đọc trong `api/client.js`).
7. Không cần "Client Secret" — luồng ID token không dùng tới.

---

## Bước 1 — Backend: sửa `User` model cho phép tài khoản không có password

**Học được:** `required` trong Mongoose schema có thể là 1 hàm thay vì `true/false` cố định — cho phép field bắt buộc "có điều kiện" tùy theo giá trị field khác trong cùng document (`this` trỏ tới document đang validate).

**Làm:** trong `backend/src/models/User.js`:

1. Sửa dòng `password`, đổi `required: true` thành hàm điều kiện:
```js
password: { type: String, required: function () { return !this.googleId; }, minlength: 6 },
```

2. Thêm field mới, đặt sau `avatarUrl`:
```js
googleId: { type: String, default: undefined },
```

> Không đặt `unique: true` cho `googleId` ở mức schema để tránh lỗi khi nhiều document cùng có `googleId: undefined` (MongoDB coi `null`/`undefined` cũng là 1 giá trị trùng trong index unique, dễ lỗi `E11000 duplicate key` cho user thứ 2 không dùng Google) — kiểm tra trùng đã có sẵn qua logic `findOne({ $or: [...] })` ở Bước 2, không cần ràng buộc DB-level ở bước học này.

**Kiểm tra:** chưa test được ngay — cần Bước 2 mới tạo được user qua Google. Có thể test riêng: mở MongoDB Compass/shell, thử tạo tay 1 document User không có `password` nhưng có `googleId` → không báo lỗi validation.

---

## Bước 2 — Backend: endpoint `POST /api/auth/google`

**Học được:** xác minh 1 JWT do bên thứ 3 (Google) ký, khác với JWT tự ký ở `signToken` — không tự giải mã bằng `jwt.verify` với secret của mình, mà nhờ `google-auth-library` xác minh (nó tự tải public key của Google về để check chữ ký).

**Làm, trong `backend/src/controllers/authController.js`:**

1. Thêm import ở đầu file:
```js
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
```

2. Thêm hàm mới, đặt trước `module.exports`:
```js
const googleAuth = async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Missing Google credential' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    if (!user) {
      user = await User.create({ name, email, googleId });
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    const token = signToken(user);
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
};
```

> Nhánh `else if (!user.googleId)` chính là phần "tự động liên kết" đã chốt: nếu email đã tồn tại (đăng ký bằng mật khẩu từ trước) mà chưa từng gắn `googleId`, gắn luôn vào tài khoản đó thay vì tạo user trùng email (email đang `unique: true` nên tạo trùng sẽ lỗi).

3. Sửa dòng `module.exports` cuối file:
```js
module.exports = { register, login, me, toggleFavorite, googleAuth };
```

**Làm, trong `backend/src/routes/authRoutes.js`:**

1. Sửa dòng import, thêm `googleAuth`:
```js
const { register, login, me, toggleFavorite, googleAuth } = require('../controllers/authController');
```

2. Thêm route mới:
```js
router.post('/google', authLimiter, googleAuth);
```

**Kiểm tra:** chưa gọi tay được bằng Postman (cần `credential` thật do Google cấp, chỉ lấy được từ luồng đăng nhập thật trên trình duyệt) — test gộp chung với Bước 3.

---

## Bước 3 — Frontend: nút "Đăng nhập bằng Google" + nối API

**Học được:** dùng thư viện bên ngoài không qua `npm install` mà qua `<script>` tag load trực tiếp trong `index.html` (Google Identity Services yêu cầu cách này, không có bản npm chính thức tương đương) — rồi truy cập qua biến toàn cục `window.google`.

**Làm:**

1. Trong `frontend-rebuild/index.html`, thêm script vào `<head>`, sau đoạn `<link ... rel="stylesheet">`:
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

2. Trong `frontend-rebuild/src/api/auth.js`, thêm hàm mới:
```js
export function googleAuth(credential) {
    return apiRequest('/auth/google', { method: 'POST', body: { credential } });
}
```

3. Trong `frontend-rebuild/src/context/AuthContext.jsx`:
   - Import thêm `googleAuth as googleAuthRequest` cạnh dòng import `login`/`register` hiện có:
   ```js
   import { login as loginRequest, register as RegisterRequest, googleAuth as googleAuthRequest } from "../api/auth"
   ```
   - Thêm hàm mới, đặt cạnh `register`:
   ```js
   const loginWithGoogle = async (credential) => persist(await googleAuthRequest(credential));
   ```
   - Thêm `loginWithGoogle` vào object `value` của `<AuthContext.Provider>`:
   ```jsx
   <AuthContext.Provider value={{token, user, isAdmin: user?.role === 'admin',login, register, loginWithGoogle, logout, setFavorites, updateUser}} >
   ```

4. Tạo component mới `frontend-rebuild/src/components/auth/GoogleButton.jsx`:
```jsx
import { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

function GoogleButton({ onSuccess, onError }) {
  const { loginWithGoogle } = useAuth();
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!window.google || !buttonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try {
          const user = await loginWithGoogle(response.credential);
          onSuccess?.(user);
        } catch (err) {
          onError?.(err.message);
        }
      },
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'outline',
      size: 'large',
      width: 320,
    });
  }, [loginWithGoogle, onSuccess, onError]);

  return <div ref={buttonRef} className="flex justify-center" />;
}

export default GoogleButton;
```

> `useEffect` chạy sau khi component mount, lúc đó `window.google` đã sẵn sàng (script có `defer` nên chạy trước React mount) — nếu bạn F5 quá nhanh trong lúc mạng chậm, `window.google` có thể chưa tồn tại và nút không hiện; không cần xử lý edge case này ở bước học đầu tiên.

5. Trong `frontend-rebuild/src/pages/Login.jsx`, thêm nút Google — đặt sau `</form>`, trước đoạn `<p>` "chưa có tài khoản":
```jsx
<div className="mt-6 flex items-center gap-3">
    <div className="h-px flex-1 bg-fwm-line" />
    <span className="text-xs text-fwm-muted">hoặc</span>
    <div className="h-px flex-1 bg-fwm-line" />
</div>
<div className="mt-4">
    <GoogleButton onSuccess={() => navigate('/')} onError={setError} />
</div>
```
Nhớ import ở đầu file: `import GoogleButton from '../components/auth/GoogleButton';`

6. Trong `frontend-rebuild/src/pages/Register.jsx` — cùng 1 component `GoogleButton`, cùng 1 endpoint xử lý cả tạo mới lẫn đăng nhập, không cần thêm gì ở backend:
   - Import ở đầu file: `import GoogleButton from '../components/auth/GoogleButton';`
   - Thêm khối JSX **sau thẻ `</form>` đóng, trước thẻ `<p className="mt-6 ...">` hiện có** (dòng có `{t.auth.hasAccount}`):
   ```jsx
   <div className="mt-6 flex items-center gap-3">
       <div className="h-px flex-1 bg-fwm-line" />
       <span className="text-xs text-fwm-muted">hoặc</span>
       <div className="h-px flex-1 bg-fwm-line" />
   </div>
   <div className="mt-4">
       <GoogleButton onSuccess={() => navigate('/')} onError={setError} />
   </div>
   ```
   Không đổi gì khác trong file — `navigate` và `setError` đã có sẵn trong component.

**Kiểm tra:** F5 trang `/dang-nhap`, thấy nút Google thật (do Google tự render, không phải nút tự vẽ) → bấm → chọn tài khoản Google → được đăng nhập, chuyển về trang chủ, `user` trong `AuthContext` có `name`/`email` lấy từ Google. Thử với email Google **trùng** 1 tài khoản mật khẩu có sẵn trong DB → vẫn đăng nhập được vào đúng tài khoản đó (kiểm tra trong MongoDB thấy user cũ giờ có thêm field `googleId`, không tạo user mới trùng email).

---

## Còn cần bạn chốt

Không còn — 2 quyết định kiến trúc (luồng ID token, tự động liên kết email trùng) đã chốt trước khi viết spec này.
