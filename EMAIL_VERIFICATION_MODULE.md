# Module: Xác thực email khi đăng ký

> **✅ Trạng thái: đã code đủ 4 bước (2026-08-04), đã commit & push (`2d873c5`), nhưng CHƯA test luồng thật và CHƯA chạy migration ân xá user cũ** (`db.users.updateMany({}, {$set:{isVerified:true}})`) — bắt buộc chạy migration trước khi test đăng nhập, nếu không mọi user cũ sẽ bị chặn.

Module fullstack tiếp theo sau Forgot/Reset Password. Tái dùng nguyên hạ tầng gửi mail **Resend** vừa chuyển sang (`config/mailer.js` đã sẵn `RESEND_API_KEY`) — module này **không cần cài thêm package hay setup .env mới**.

Quyết định đã chốt (qua `AskUserQuestion`):
- **Chặn đăng nhập** nếu email chưa xác thực (không chỉ nhắc nhở).
- Tài khoản đăng nhập bằng **Google tự động `isVerified: true`** — không gửi mail xác thực riêng (Google đã xác thực hộ).

---

## ⚠️ Cảnh báo migration — đọc trước khi làm Bước 2

Field mới `isVerified` sẽ `default: false`. Nếu không xử lý, **toàn bộ user đã đăng ký từ trước (kể cả tài khoản Google cũ) sẽ bị khoá đăng nhập ngay khi bạn deploy Bước 2**, vì họ chưa từng qua luồng verify mới này.

→ Sau khi thêm field vào `User.js` (Bước 1) nhưng **trước khi** bật chặn login (Bước 2), chạy 1 lệnh MongoDB một lần (Compass, mongosh, hoặc Atlas UI) để "ân xá" toàn bộ user cũ:
```js
db.users.updateMany({}, { $set: { isVerified: true } })
```
Từ thời điểm đó trở đi, chỉ user **đăng ký mới** mới bắt đầu với `isVerified: false` và phải tự xác thực.

---

## Kiến trúc chung

```
[Frontend]                    [Backend]                        [Resend]
Đăng ký (name, email, password)
   │ POST /api/auth/register
   ▼
                        Tạo user (isVerified: false mặc định)
                        Sinh token ngẫu nhiên (crypto) — giống hệt forgot-password
                        Lưu HASH token + hạn 24h vào User
                        Gửi email chứa link: FRONTEND_URL/xac-thuc-email/<token gốc>
                                                                    │──────▶ Resend gửi mail
   ◀─────────────── trả message "kiểm tra email", KHÔNG trả token (chưa được login)

Người dùng bấm link trong mail
   │ POST /api/auth/verify-email { token }
   ▼
                        Hash token, so khớp + còn hạn
                        Nếu hợp lệ → isVerified = true, xoá token
   ◀─────────────── trả message thành công → điều hướng qua trang đăng nhập

Đăng nhập (email, password)
   │ POST /api/auth/login
   ▼
                        So password đúng nhưng isVerified === false
   ◀─────────────── 403 { message, code: 'EMAIL_NOT_VERIFIED' }
                        (frontend hiện nút "Gửi lại email xác thực")
```

**Vì sao không trả token ngay lúc đăng ký:** tài khoản chưa verify không nên có phiên đăng nhập hợp lệ — nếu trả token, user vẫn "đăng nhập được" ngay dù backend sẽ chặn ở request tiếp theo, gây trải nghiệm lộn xộn (vào được trang chủ rồi lại bị đá ra).

**Vì sao `resend-verification` luôn trả message chung chung:** giống nguyên tắc chống account enumeration đã áp dụng ở `forgot-password`.

---

## Bước 1 — Backend: field `isVerified` + token, util gửi mail

**Học được:** tái dùng nguyên mẫu hình "lưu hash token + hạn dùng" đã học ở Forgot Password, áp dụng cho một mục đích khác (verify thay vì reset). Cùng 1 pattern, 2 use case — dấu hiệu tốt để nhận ra khi nào nên tách thành 1 hàm dùng chung, nhưng ở quy mô project này cứ viết lặp lại tương tự cho rõ ràng, không cần trừu tượng hoá vội.

**Làm, trong `backend/src/models/User.js`, thêm 3 dòng sau `googleId`:**
```js
isVerified: { type: Boolean, default: false },
verificationToken: { type: String, default: undefined },
verificationTokenExpires: { type: Date, default: undefined },
```

**Tạo `backend/src/utils/sendVerificationEmail.js`** (copy cấu trúc từ `sendResetEmail.js`, đổi nội dung):
```js
const resend = require('../config/mailer')

async function sendVerificationEmail(to, verifyUrl) {
    await resend.emails.send({
        from: 'FootballWithMe <noreply@minhnhutsoftware.id.vn>',
        to,
        subject: 'Xác thực email - FootballWithMe',
        html: `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Xác thực email</title>
        </head>
        <body style="margin:0; padding:0; background-color:#f2f4f7; font-family: 'Segoe UI', Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f4f7; padding:30px 0;">
                <tr>
                    <td align="center">
                        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                            <tr>
                                <td style="padding:0;">
                                    <img
                                        src="https://res.cloudinary.com/deumqjwte/image/upload/v1785398516/banner_m4zm5a.png"
                                        alt="FootballWithMe"
                                        width="600"
                                        style="display:block; width:100%; max-width:600px; height:auto; border:0;"
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:40px 40px 20px;">
                                    <h2 style="margin:0 0 16px; color:#1a1a1a; font-size:20px;">Xác thực tài khoản của bạn</h2>
                                    <p style="margin:0 0 24px; color:#4a4a4a; font-size:15px; line-height:1.6;">
                                        Cảm ơn bạn đã đăng ký <strong>FootballWithMe</strong>. Nhấn vào nút bên dưới để xác thực email và bắt đầu đăng nhập.
                                    </p>
                                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                                        <tr>
                                            <td style="border-radius:8px; background-color:#2e7d32;">
                                                <a href="${verifyUrl}" target="_blank" style="display:inline-block; padding:14px 36px; color:#ffffff; text-decoration:none; font-size:15px; font-weight:600; border-radius:8px;">
                                                    Xác thực email
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                    <p style="margin:0 0 8px; color:#8a8a8a; font-size:13px; line-height:1.5; text-align:center;">
                                        Hoặc copy đường link sau vào trình duyệt:
                                    </p>
                                    <p style="margin:0 0 24px; text-align:center; word-break:break-all;">
                                        <a href="${verifyUrl}" style="color:#2e7d32; font-size:13px;">${verifyUrl}</a>
                                    </p>
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff8e1; border-radius:8px; margin-bottom:8px;">
                                        <tr>
                                            <td style="padding:14px 16px; color:#8a6d00; font-size:13px; line-height:1.5;">
                                                ⏱️ Liên kết này sẽ <strong>hết hạn sau 24 giờ</strong>. Nếu không phải bạn đăng ký, vui lòng bỏ qua email này.
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td style="background-color:#f7f8fa; padding:24px 40px; text-align:center; border-top:1px solid #eaeaea;">
                                    <p style="margin:0 0 6px; color:#9a9a9a; font-size:12px;">
                                        © ${new Date().getFullYear()} FootballWithMe. All rights reserved.
                                    </p>
                                    <p style="margin:0; color:#b0b0b0; font-size:11px;">
                                        Email này được gửi tự động, vui lòng không trả lời.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `,
    });
}

module.exports = sendVerificationEmail;
```

**Kiểm tra:** chưa test được (cần route gọi tới) — làm tiếp Bước 2.

---

## Bước 2 — Backend: sửa `register`/`login`/`googleAuth` + 2 hàm mới

**Làm, trong `backend/src/controllers/authController.js`:**

1. Thêm import ở đầu file:
```js
const sendVerificationEmail = require('../utils/sendVerificationEmail');
```

2. Sửa hàm `register` — sinh token verify thay vì trả JWT ngay:
```js
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !name ||
      !email ||
      !password
    ) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const user = await User.create({ name, email, password });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.verificationToken = hashedToken;
    user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const verifyUrl = `${process.env.FRONTEND_URL}/xac-thuc-email/${rawToken}`;
    await sendVerificationEmail(user.email, verifyUrl);

    res.status(201).json({ message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản trước khi đăng nhập.' });
  } catch (err) {
    next(err);
  }
};
```

3. Sửa hàm `login` — chặn nếu chưa verify (thêm **sau** khi so password đúng, **trước** khi ký token):
```js
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Vui lòng xác thực email trước khi đăng nhập', code: 'EMAIL_NOT_VERIFIED' });
    }

    const token = signToken(user);
    res.json({ user, token });
```

4. Sửa hàm `googleAuth` — set `isVerified: true` ở cả 2 nhánh tạo mới và link tài khoản:
```js
    let user = await (User.findOne({ $or: [{ googleId }, { email }] }));
    if (!user) {
      user = await (User.create({ name, email, googleId, isVerified: true }));
    }
    else if (!user.googleId) {
      user.googleId = googleId;
      user.isVerified = true;
      await user.save();
    }
```

5. Thêm 2 hàm mới, đặt sau `resetPassword`, trước `module.exports`:
```js
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.json({ message: 'Xác thực email thành công, bạn có thể đăng nhập.' });
  } catch (err) {
    next(err);
  }
};

const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (typeof email !== 'string' || !email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (user && !user.isVerified) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      user.verificationToken = hashedToken;
      user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
      await user.save();

      const verifyUrl = `${process.env.FRONTEND_URL}/xac-thuc-email/${rawToken}`;
      await sendVerificationEmail(user.email, verifyUrl);
    }

    res.json({ message: 'Nếu email tồn tại và chưa xác thực, link xác thực mới đã được gửi.' });
  } catch (err) {
    next(err);
  }
};
```

6. Sửa `module.exports` cuối file:
```js
module.exports = { register, login, me, toggleFavorite, googleAuth, forgotPassword, resetPassword, verifyEmail, resendVerification };
```

**Làm, trong `backend/src/routes/authRoutes.js`:**

1. Sửa dòng import controller, thêm 2 hàm:
```js
const { register, login, me, toggleFavorite, googleAuth, forgotPassword, resetPassword, verifyEmail, resendVerification } = require('../controllers/authController');
```

2. Thêm 2 route mới, đặt cạnh `reset-password`:
```js
router.post('/verify-email', authLimiter, verifyEmail);
router.post('/resend-verification', authLimiter, resendVerification);
```

**Kiểm tra (Postman/curl), theo đúng thứ tự:**
- `POST /api/auth/register` với email mới → nhận message "kiểm tra email", **không** có `token` trong response.
- `POST /api/auth/login` bằng tài khoản vừa đăng ký (chưa verify) → 403, `code: 'EMAIL_NOT_VERIFIED'`.
- Check hộp thư nhận mail "Xác thực email" → copy token trong link → `POST /api/auth/verify-email` body `{ "token": "..." }` → message thành công.
- `POST /api/auth/login` lại → thành công, nhận `token` như bình thường.
- Đăng nhập bằng Google (tài khoản mới) → không cần verify, vào thẳng được.

---

## Bước 3 — Frontend: trang "Xác thực email" + hàm API

**Làm, trong `frontend-rebuild/src/api/client.js`:** sửa đoạn throw để đính kèm `code` từ response (Login.jsx cần dựa vào đây để phân biệt lỗi "chưa xác thực" với lỗi sai mật khẩu):
```js
    if (!res.ok){
       const err = new Error(data?.message || 'Request failed');
       err.code = data?.code;
       throw err;
    }
```

**Làm, trong `frontend-rebuild/src/api/auth.js`, thêm 2 hàm:**
```js
export function verifyEmail(token){
    return apiRequest('/auth/verify-email', {method: 'POST', body: {token}});
}

export function resendVerification(email){
    return apiRequest('/auth/resend-verification', {method: 'POST', body: {email}});
}
```

**Tạo `frontend-rebuild/src/pages/VerifyEmail.jsx`** — khác các trang trước ở chỗ tự gọi API ngay khi vào trang (không có form), dùng `useEffect`:

Khung JSX tĩnh trước (3 trạng thái: đang xử lý / thành công / lỗi):
```jsx
import { useState, useEffect } from "react";
import { useParams, Link } from 'react-router-dom';
import { verifyEmail } from '../api/auth';

function VerifyEmail() {
    const { token } = useParams();
    const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
    const [message, setMessage] = useState('');

    return (
        <section className="mx-auto max-w-sm px-4 py-20 text-center">
            <div className="font-head text-2xl font-black text-fwm-text">Xác thực email</div>
            {status === 'loading' && <p className="mt-6 text-fwm-muted">Đang xác thực...</p>}
            {status === 'success' && <p className="mt-6 text-emerald-400">{message}</p>}
            {status === 'error' && <p className="mt-6 text-fwm-pink">{message}</p>}
            <p className="mt-6 text-sm text-fwm-muted">
                <Link to="/dang-nhap" className="font-bold text-fwm-accent hover:underline">
                    Về trang đăng nhập
                </Link>
            </p>
        </section>
    )
}

export default VerifyEmail;
```

JSX trên cần gọi API ngay khi `token` có sẵn → thêm `useEffect` (đã import ở trên), đặt trước `return`:
```jsx
    useEffect(() => {
        verifyEmail(token)
            .then((res) => {
                setMessage(res.message);
                setStatus('success');
            })
            .catch((err) => {
                setMessage(err.message);
                setStatus('error');
            });
    }, [token]);
```

**Sửa `frontend-rebuild/src/App.jsx`:** thêm import + route, đặt cạnh `/dat-lai-mat-khau/:token`:
```jsx
import VerifyEmail from './pages/VerifyEmail';
// ...
<Route path="/xac-thuc-email/:token" element={<VerifyEmail />} />
```

**Kiểm tra:** vào thẳng `/xac-thuc-email/<token-sai-bat-ky>` → hiện lỗi "Token không hợp lệ...". Vào đúng link từ mail → hiện "Xác thực email thành công...".

---

## Bước 4 — Frontend: cập nhật `AuthContext`, `Register.jsx`, `Login.jsx`

**Học được:** phân biệt action nào cần "đăng nhập ngay" (login, Google) và action nào không (register giờ chỉ là "đăng ký xong, chờ verify") — không phải mọi hàm trong `AuthContext` đều phải gọi `persist`.

**Làm, trong `frontend-rebuild/src/context/AuthContext.jsx`,** sửa hàm `register` — bỏ `persist`, chỉ forward response:
```js
    const register = async (name, email, password) => RegisterRequest({name, email, password});
```

**Làm, trong `frontend-rebuild/src/pages/Register.jsx`:**

Thêm state mới cạnh `error`:
```js
    const [message, setMessage] = useState('');
```

Sửa `handleSumit` — bỏ `navigate("/")`, lưu message trả về thay vào đó:
```js
    const handleSumit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await register(name, email, password);
            setMessage(res.message);
        }
        catch {
            setError(t.auth.errorRegister);
        }
    }
```

JSX cần hiện `message` thành công (giống cách `error` đang hiện) — thêm ngay dưới dòng `{error && ...}` trong `<form>`:
```jsx
                {message && <p className="text-sm text-emerald-400">{message}</p>}
```

**Làm, trong `frontend-rebuild/src/pages/Login.jsx`:**

Login hiện tại nuốt hết lỗi vào 1 message chung (`catch { setError(t.auth.errorLogin) }`) — cần sửa để đọc được `err.code`. Thêm state mới cạnh `error`:
```js
    const [unverifiedEmail, setUnverifiedEmail] = useState('');
    const [resendMessage, setResendMessage] = useState('');
```

Sửa `handleSubmit`:
```js
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setUnverifiedEmail('');
        setResendMessage('');
        try {
            await login(email, password);
            navigate('/');
        }
        catch (err) {
            if (err.code === 'EMAIL_NOT_VERIFIED') {
                setUnverifiedEmail(email);
            } else {
                setError(t.auth.errorLogin);
            }
        }
    }
```

JSX cần 1 nhánh mới khi `unverifiedEmail` có giá trị (gọi `resendVerification`) — thêm hàm xử lý và import trước `handleSubmit`:
```js
    const handleResend = async () => {
        setResendMessage('');
        try {
            const res = await resendVerification(unverifiedEmail);
            setResendMessage(res.message);
        }
        catch {
            setResendMessage('Có lỗi xảy ra, thử lại sau.');
        }
    }
```
```js
import { resendVerification } from '../api/auth';
```

Thêm khối hiển thị trong `<form>`, ngay dưới `{error && ...}`:
```jsx
                {unverifiedEmail && (
                    <div className="rounded-fwm border border-fwm-line bg-fwm-card p-3 text-sm">
                        <p className="text-fwm-pink">Email chưa được xác thực.</p>
                        <button
                            type="button"
                            onClick={handleResend}
                            className="mt-1 font-bold text-fwm-accent hover:underline"
                        >
                            Gửi lại email xác thực
                        </button>
                        {resendMessage && <p className="mt-1 text-emerald-400">{resendMessage}</p>}
                    </div>
                )}
```

**Kiểm tra toàn bộ luồng:**
1. Đăng ký tài khoản mới → thấy message "kiểm tra email" ngay trên trang Register (không bị điều hướng đi đâu).
2. Thử đăng nhập ngay bằng tài khoản đó → thấy khối "Email chưa được xác thực" + nút gửi lại.
3. Bấm "Gửi lại email xác thực" → nhận thêm 1 mail mới.
4. Bấm link trong mail bất kỳ (mail đầu hoặc mail gửi lại) → trang `/xac-thuc-email/:token` báo thành công.
5. Quay lại `/dang-nhap`, đăng nhập lại → vào được, có token, `user.isVerified` (kiểm tra qua DB hoặc log) là `true`.
6. Đăng ký/đăng nhập bằng Google → vào thẳng luôn, không bị chặn.
7. **Trước khi coi module xong:** chạy lệnh MongoDB ở phần "Cảnh báo migration" để tài khoản cũ (kể cả tài khoản bạn đang dùng để test các module trước) không bị khoá ngoài ý muốn.

---

## Còn cần bạn chốt

Không có — kiến trúc đã rõ từ 2 quyết định đầu bài. Chỉ cần nhớ chạy lệnh migration MongoDB **trước khi** test Bước 2 bằng tài khoản cũ, nếu không sẽ tưởng nhầm là bug đăng nhập.
