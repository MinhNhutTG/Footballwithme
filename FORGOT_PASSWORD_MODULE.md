# Module: Quên mật khẩu (Fullstack — Nodemailer + Gmail App Password)

> **✅ Trạng thái: đã hoàn thành và verify (2026-07-30).** Provider email đã đổi từ Nodemailer/Gmail (mô tả trong spec gốc bên dưới) sang **Resend** ngay sau khi module "xong" — `config/mailer.js` export client `Resend`, biến env là `RESEND_API_KEY` (không phải `EMAIL_USER`/`EMAIL_APP_PASSWORD`). Sender: `FootballWithMe <noreply@minhnhutsoftware.id.vn>`. Hạ tầng Resend này được tái sử dụng nguyên cho module Xác thực email (`EMAIL_VERIFICATION_MODULE.md`).

Module fullstack thứ 3 (sau Auth/Posts/Comments/Profile có sẵn và Upload ảnh/video Cloudinary). Backend **chưa có** cơ chế gửi email nào (`nodemailer` chưa cài) — phải xây từ đầu, tương tự cách Upload module từng xây pipeline Cloudinary từ đầu.

Đã chốt: dùng **Nodemailer qua SMTP Gmail + App Password** (không dùng service email chuyên dụng như SendGrid/Resend để đơn giản, phù hợp project học tập).

---

## Kiến trúc chung

```
[Frontend]                    [Backend]                        [Gmail SMTP]
Nhập email
   │ POST /api/auth/forgot-password
   ▼
                        Tìm user theo email
                        Sinh token ngẫu nhiên (crypto)
                        Lưu HASH của token + hạn 30 phút vào User
                        Gửi email chứa link: FRONTEND_URL/dat-lai-mat-khau/<token gốc>
                                                                    │──────▶ Gmail gửi mail
   ◀─────────────── luôn trả message chung chung (không lộ email có tồn tại hay không)

Người dùng mở email → bấm link → vào trang nhập mật khẩu mới
   │ POST /api/auth/reset-password { token, password }
   ▼
                        Hash token nhận được, so khớp với hash đã lưu + còn hạn
                        Nếu hợp lệ → cập nhật password (hash qua pre('save') có sẵn)
                        Xoá token khỏi User
   ◀─────────────── trả kết quả thành công/thất bại
```

**Vì sao lưu HASH của token, không lưu token gốc:** giống nguyên tắc không lưu password gốc — nếu DB bị lộ, kẻ tấn công không thể dùng trực tiếp giá trị trong DB để reset mật khẩu người khác (phải có token gốc, chỉ nằm trong email). Token gốc chỉ tồn tại trong đường link gửi qua email, không bao giờ lưu vào DB.

**Vì sao luôn trả message chung chung ở bước "quên mật khẩu":** tránh lộ thông tin "email này có tồn tại trong hệ thống hay không" cho kẻ dò email hàng loạt (user enumeration).

### Package cần cài (backend)

```bash
cd backend
npm install nodemailer
```

### Setup Gmail App Password (bạn tự làm, không nằm trong code)

1. Bật xác minh 2 bước (2-Step Verification) cho tài khoản Gmail dùng để gửi mail.
2. Vào [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords), tạo App Password mới (chọn app "Mail").
3. Copy chuỗi 16 ký tự được cấp, thêm vào `backend/.env`:
   ```
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
   FRONTEND_URL=http://localhost:5173
   ```
   (`FRONTEND_URL` dùng để build link reset gửi trong email — khớp cổng Vite đang chạy, xem `CORS_ORIGIN` hiện có trong `.env` để biết đúng port.)

---

## Bước 1 — Backend: thêm field token vào `User` + config gửi mail

**Học được:** sinh token ngẫu nhiên an toàn bằng `crypto`, lưu **hash** của token (không lưu token gốc) kèm hạn dùng — mẫu hình chuẩn cho mọi luồng "magic link" (reset password, verify email, invite...).

**Làm:**

Trong `backend/src/models/User.js`, thêm 2 dòng sau `avatarUrl`:
```js
resetPasswordToken: { type: String, default: undefined },
resetPasswordExpires: { type: Date, default: undefined },
```

Tạo `backend/src/config/mailer.js`:
```js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

module.exports = transporter;
```

Tạo `backend/src/utils/sendResetEmail.js`:
```js
const transporter = require('../config/mailer');

async function sendResetEmail(to, resetUrl) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: 'Đặt lại mật khẩu - FootballWithMe',
    html: `
      <p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản FootballWithMe.</p>
      <p>Bấm vào link dưới đây để đặt mật khẩu mới (hết hạn sau 30 phút):</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Nếu không phải bạn yêu cầu, hãy bỏ qua email này.</p>
    `,
  });
}

module.exports = sendResetEmail;
```

> Y hệt lỗi từng gặp ở `config/cloudinary.js` (Phần Upload): `dotenv.config()` phải chạy **trước** khi bất kỳ module nào `require` file cấu hình đọc `process.env` — `mailer.js` cũng sẽ đọc `process.env.EMAIL_USER` ngay lúc `require`, không đợi tới khi dùng. Kiểm tra thứ tự import/`dotenv.config()` trong `server.js` vẫn đúng như đã sửa ở module Upload (đã ổn từ trước, chỉ cần nhớ nguyên tắc khi thêm config mới).

**Kiểm tra:** chưa test được ở bước này (cần route gọi tới) — làm tiếp Bước 2 rồi test chung.

---

## Bước 2 — Backend: 2 endpoint `forgot-password` và `reset-password`

**Học được:** dùng `crypto.randomBytes` + `crypto.createHash` (built-in Node, không cần cài thêm); tái dùng `pre('save')` hook hash password có sẵn trong `User.js` bằng cách gán `user.password = password` rồi gọi `user.save()` (khác với `updateMe` dùng `findByIdAndUpdate` — ở đây bắt buộc dùng `.save()` để hook `pre('save')` chạy).

**Làm, trong `backend/src/controllers/authController.js`:**

1. Thêm import ở đầu file:
```js
const crypto = require('crypto');
const sendResetEmail = require('../utils/sendResetEmail');
```

2. Thêm 2 hàm mới, đặt trước `module.exports`:
```js
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (typeof email !== 'string' || !email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = Date.now() + 30 * 60 * 1000;
      await user.save();

      const resetUrl = `${process.env.FRONTEND_URL}/dat-lai-mat-khau/${rawToken}`;
      await sendResetEmail(user.email, resetUrl);
    }

    res.json({ message: 'Nếu email tồn tại trong hệ thống, link đặt lại mật khẩu đã được gửi.' });
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (err) {
    next(err);
  }
};
```

3. Sửa dòng `module.exports` cuối file, thêm 2 hàm mới:
```js
module.exports = { register, login, me, toggleFavorite, forgotPassword, resetPassword };
```

**Làm, trong `backend/src/routes/authRoutes.js`:**

1. Sửa dòng import controller, thêm 2 hàm:
```js
const { register, login, me, toggleFavorite, forgotPassword, resetPassword } = require('../controllers/authController');
```

2. Thêm 2 route mới (tái dùng `authLimiter` đã có sẵn — cả 2 endpoint này đều nhạy cảm, dễ bị dò/spam):
```js
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
```

**Kiểm tra:** dùng Postman/curl:
- `POST /api/auth/forgot-password` body `{ "email": "email-that-ton-tai@..." }` → nhận response `{ message: "Nếu email tồn tại..." }`, kiểm tra hộp thư Gmail (cả thư mục Spam) nhận được mail có link `http://localhost:5173/dat-lai-mat-khau/<token dài>`.
- Thử lại với email **không tồn tại** → vẫn nhận đúng response y hệt (không báo lỗi khác) — xác nhận không lộ thông tin.
- Copy token từ link email, gọi `POST /api/auth/reset-password` body `{ "token": "...", "password": "matkhaumoi123" }` → nhận `{ message: "Đặt lại mật khẩu thành công" }`. Đăng nhập lại bằng mật khẩu mới để xác nhận.
- Gọi lại `reset-password` với token cũ (đã dùng) → phải báo lỗi "Token không hợp lệ hoặc đã hết hạn" (vì đã bị xoá sau lần dùng đầu).

---

## Bước 3 — Frontend: trang "Quên mật khẩu" + "Đặt lại mật khẩu"

**Học được:** đọc param động từ URL bằng `useParams` (đã dùng ở `ArticleDetail.jsx`/`Category.jsx`), áp dụng lại cho trang reset password nhận `token` từ URL.

**Làm, trong `frontend-rebuild/src/api/auth.js`, thêm 2 hàm:**
```js
export function forgotPassword(email) {
    return apiRequest('/auth/forgot-password', { method: 'POST', body: { email } });
}

export function resetPassword(token, password) {
    return apiRequest('/auth/reset-password', { method: 'POST', body: { token, password } });
}
```

**Tạo `frontend-rebuild/src/pages/ForgotPassword.jsx`** (dựa theo khung `Login.jsx`):
```jsx
import { useState } from "react";
import { Link } from 'react-router-dom';
import Button from "../components/ui/Button";
import { forgotPassword } from '../api/auth';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await forgotPassword(email);
            setMessage(res.message);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }

    return (
        <section className="mx-auto max-w-sm px-4 py-20">
            <div className="font-head text-2xl font-black text-fwm-text">Quên mật khẩu</div>
            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Email</label>
                    <input
                        required
                        type="email"
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
                    ></input>
                </div>
                {error && <p className="text-sm text-fwm-pink">{error}</p>}
                {message && <p className="text-sm text-emerald-400">{message}</p>}
                <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                    {loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
                </Button>
            </form>
            <p className="mt-6 text-center text-sm text-fwm-muted">
                <Link to="/dang-nhap" className="font-bold text-fwm-accent hover:underline">
                    Quay lại đăng nhập
                </Link>
            </p>
        </section>
    )
}

export default ForgotPassword;
```

**Tạo `frontend-rebuild/src/pages/ResetPassword.jsx`:**
```jsx
import { useState } from "react";
import { useParams, useNavigate, Link } from 'react-router-dom';
import Button from "../components/ui/Button";
import { resetPassword } from '../api/auth';

function ResetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await resetPassword(token, password);
            navigate('/dang-nhap');
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }

    return (
        <section className="mx-auto max-w-sm px-4 py-20">
            <div className="font-head text-2xl font-black text-fwm-text">Đặt lại mật khẩu</div>
            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Mật khẩu mới</label>
                    <input
                        required
                        type="password"
                        minLength={6}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
                    ></input>
                </div>
                {error && <p className="text-sm text-fwm-pink">{error}</p>}
                <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                    {loading ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
                </Button>
            </form>
            <p className="mt-6 text-center text-sm text-fwm-muted">
                <Link to="/dang-nhap" className="font-bold text-fwm-accent hover:underline">
                    Quay lại đăng nhập
                </Link>
            </p>
        </section>
    )
}

export default ResetPassword;
```

**Sửa `frontend-rebuild/src/App.jsx`:** thêm import + 2 route, đặt cạnh route `/dang-nhap`:
```jsx
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
// ...
<Route path="/quen-mat-khau" element={<ForgotPassword />} />
<Route path="/dat-lai-mat-khau/:token" element={<ResetPassword />} />
```

**Sửa `frontend-rebuild/src/pages/Login.jsx`:** thêm link "Quên mật khẩu?" — đặt trong `<form>`, ngay dưới ô mật khẩu (trước `{error && ...}`):
```jsx
<p className="text-right text-xs">
    <Link to="/quen-mat-khau" className="font-bold text-fwm-accent hover:underline">
        Quên mật khẩu?
    </Link>
</p>
```

**Kiểm tra:** vào `/quen-mat-khau` → nhập email → nhận thông báo chung chung → check Gmail có mail → bấm link trong mail → vào đúng `/dat-lai-mat-khau/<token>` → nhập mật khẩu mới → được chuyển về `/dang-nhap` → đăng nhập bằng mật khẩu mới thành công. Thử bấm lại đúng link email đó lần 2 → phải báo lỗi token hết hạn/đã dùng.

---

## Còn cần bạn chốt

Không có điểm nào cần hỏi thêm — kiến trúc đã rõ từ quyết định Nodemailer + Gmail App Password. Chỉ cần bạn tự tạo App Password thật (bước "Setup Gmail App Password" ở trên) trước khi test Bước 2.
