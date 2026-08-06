# Module: Gửi email liên hệ cho admin

Trang "Liên hệ" (`/lien-he`) hiện có form nhưng **không gửi đi đâu cả** — `handleSubmit` chỉ `setSent(true)` ngay tại chỗ, không gọi API nào. Module này nối form đó với backend, gửi email thật cho admin qua Resend (hạ tầng đã có sẵn từ `FORGOT_PASSWORD_MODULE.md`).

## Khảo sát hiện trạng (trước khi viết spec)

- `frontend-rebuild/src/pages/Contact.jsx`: form có `name`, `email`, `message` (state cục bộ), nút submit gọi `handleSubmit` chỉ `e.preventDefault(); setSent(true);` — **không có bất kỳ lệnh gọi API nào**, tin nhắn gõ xong biến mất, không ai nhận được gì.
- **Chưa có route/controller `contact` nào ở backend** (grep không ra kết quả) — module này là điểm cuối hoàn toàn mới, không có gì để sửa lại, chỉ thêm mới.
- **Route công khai, không đăng nhập** (khác `reply`/`comment` đều yêu cầu `protect`) — bất kỳ ai cũng gọi được `POST /api/contact` mà không cần token, nên **bắt buộc phải rate-limit** để tránh bị spam mail admin hoặc lợi dụng làm bàn đạp gửi mail rác qua Resend. `backend/src/middleware/rateLimit.js` đã có `authLimiter` (15 phút / 20 lần) dùng cho các route auth — thêm 1 limiter riêng cho contact, số lần cho phép thấp hơn (không ai hợp lệ gửi liên hệ 20 lần/15 phút).
- **Cách gửi email hiện có luôn `await` chặn response** (`sendResetEmail`, `sendVerificationEmail` ở `authController.js`) — module này **giữ nguyên convention đó** (khác với `sendReplyNotification` ở `REPLY_EMAIL_MODULE.md` cố tình không `await`), vì gửi liên hệ là hành động người dùng **chủ động chờ kết quả** (họ cần biết tin nhắn có gửi được hay không để quyết định thử lại), không phải tác dụng phụ của 1 hành động khác như reply.
- `backend/.env.example` hiện thiếu cả `RESEND_API_KEY`/`FRONTEND_URL` (dù đã dùng thật trong code từ trước — vấn đề có sẵn, không thuộc phạm vi sửa ở đây) — module này chỉ thêm đúng dòng biến môi trường mới của mình (`ADMIN_EMAIL`) vào file, không dọn lại các dòng thiếu cũ.

## Quyết định đã chốt

Đã hỏi qua `AskUserQuestion` trước khi viết spec:

1. **Email nhận là 1 địa chỉ cố định qua biến môi trường `ADMIN_EMAIL`** — không truy vấn DB tìm user `role: 'admin'`. Đơn giản, không phụ thuộc DB, đổi email nhận chỉ cần sửa `.env` (backend) + biến môi trường tương ứng trên Render, không phải sửa code/deploy lại.
2. **Chỉ gửi email, không lưu vào DB.** Không thêm model `ContactMessage`, không thêm tab trong Admin Dashboard — đúng phạm vi đã yêu cầu ("gửi mail cho admin"), không tự mở rộng thêm.

**Quyết định kỹ thuật khác (không cần hỏi, suy ra trực tiếp):**
- **`replyTo` = email người gửi** — để admin mở email lên bấm "Trả lời" là nhắn thẳng lại được người liên hệ, không phải copy tay địa chỉ email từ nội dung.
- **Escape HTML** nội dung `name`/`email`/`message` trước khi nhét vào template — giống lý do đã áp dụng ở `sendReplyNotification.js` (`REPLY_EMAIL_MODULE.md`): đây là dữ liệu tự do do người dùng (ẩn danh, không cần đăng nhập) gõ vào, nguy cơ chèn HTML/script vào email admin nhận được cao hơn cả comment (comment còn cần tài khoản, đây thì không).

## Kiến trúc

```
Contact.jsx (form: name, email, message)
        │  handleSubmit (async, chờ kết quả — khác pattern reply)
        ▼
POST /api/contact   (public, có rate limit riêng — contactLimiter)
        │
        ▼
contactController.submit
        │  validate required + giới hạn độ dài
        ▼
sendContactEmail({name, email, message})
        │
        ▼
resend.emails.send({
  to: process.env.ADMIN_EMAIL,
  replyTo: email,       ← admin bấm Trả lời là nhắn thẳng người gửi
  ...
})
```

---

## Bước 1 — Backend: thêm `contactLimiter`

Sửa `backend/src/middleware/rateLimit.js` — từ:

```js
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later.' },
});

module.exports = { authLimiter };
```

thành:

```js
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later.' },
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Bạn gửi liên hệ quá nhiều lần, vui lòng thử lại sau.' },
});

module.exports = { authLimiter, contactLimiter };
```

---

## Bước 2 — Backend: `utils/sendContactEmail.js`

Tạo file mới `backend/src/utils/sendContactEmail.js`:

```js
const resend = require('../config/mailer')

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function sendContactEmail({ name, email, message }) {
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message);

    await resend.emails.send({
        from: 'FootballWithMe <noreply@minhnhutsoftware.id.vn>',
        to: process.env.ADMIN_EMAIL,
        replyTo: email,
        subject: `[Liên hệ] Tin nhắn mới từ ${safeName}`,
        html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 480px; margin: 0 auto;">
          <h2 style="font-size: 18px;">Tin nhắn liên hệ mới từ FootballWithMe</h2>
          <p><strong>Họ tên:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p style="color: #666; font-size: 13px; margin-bottom: 4px;">Nội dung:</p>
          <blockquote style="margin: 0; padding: 12px 16px; background: #f5f5f5; border-left: 3px solid #22c55e; font-size: 14px; white-space: pre-wrap;">${safeMessage}</blockquote>
        </body>
        </html>
        `,
    });
}

module.exports = sendContactEmail;
```

`replyTo` đặt thẳng bằng `email` gốc (chưa escape) — field này Resend dùng để set header `Reply-To` thật của email, không phải nội dung hiển thị nên không cần escape HTML (khác `safeEmail` chỉ dùng để in ra trong `<p>`).

---

## Bước 3 — Backend: Controller + Routes

Tạo file mới `backend/src/controllers/contactController.js`:

```js
const sendContactEmail = require('../utils/sendContactEmail');

async function submit(req, res, next) {
  try {
    const { name, email, message } = req.body;
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ message: 'name, email and message are required' });
    }
    if (name.length > 100 || message.length > 2000) {
      return res.status(400).json({ message: 'name or message too long' });
    }

    await sendContactEmail({ name: name.trim(), email: email.trim(), message: message.trim() });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { submit };
```

Tạo file mới `backend/src/routes/contactRoutes.js`:

```js
const express = require('express');
const { submit } = require('../controllers/contactController');
const { contactLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/', contactLimiter, submit);

module.exports = router;
```

Sửa `backend/src/server.js` — từ:

```js
const notificationRoutes = require('./routes/notificationRoutes');
const errorHandler = require('./middleware/errorHandler');
```

thành:

```js
const notificationRoutes = require('./routes/notificationRoutes');
const contactRoutes = require('./routes/contactRoutes');
const errorHandler = require('./middleware/errorHandler');
```

và từ:

```js
app.use('/api/notifications', notificationRoutes);
app.use('/api/uploads', uploadRoutes);
```

thành:

```js
app.use('/api/notifications', notificationRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/uploads', uploadRoutes);
```

Sửa `backend/.env.example` — thêm 1 dòng mới ở cuối file:

```
ADMIN_EMAIL=your_real_email@example.com
```

**Nhớ thêm biến `ADMIN_EMAIL` thật (email của bạn) vào `.env` local lẫn biến môi trường trên Render** — thiếu biến này thì `resend.emails.send` vẫn chạy nhưng `to: undefined`, Resend sẽ trả lỗi, `submit` bắn lỗi 500 (không phải im lặng mất tin nhắn).

**Kiểm tra bằng Postman:**
1. `POST /api/contact` thiếu `message` → `400 {message: 'name, email and message are required'}`.
2. `POST /api/contact` đủ `{name, email, message}` hợp lệ → `200 {success: true}`, kiểm tra hộp mail `ADMIN_EMAIL` nhận được, `Reply-To` đúng bằng `email` đã gửi.
3. Gọi liên tiếp 6 lần trong vài giây (cùng 1 IP) → từ lần thứ 6 trả về lỗi rate-limit (429), xác nhận `contactLimiter` hoạt động.
4. Thử `name`/`message` chứa `<script>alert(1)</script>` → mở email nhận được, xác nhận hiện ra như chữ thường (`&lt;script&gt;...`), không bị chạy script.

---

## Bước 4 — Frontend: `api/contact.js`

Tạo file mới `frontend-rebuild/src/api/contact.js`:

```js
import { apiRequest } from '../api/client';

export function sendContactMessage({ name, email, message }) {
    return apiRequest('/contact', { method: 'POST', body: { name, email, message } });
}
```

---

## Bước 5 — Frontend: thêm khoá dịch

Sửa `frontend-rebuild/src/i18n/dict.js` — khối `contact` đã có, thêm `sending`/`error`.

Khối `vi` — từ:

```js
        contact: {
            heading: 'Liên hệ với chúng tôi',
            desc: 'Có góp ý, câu hỏi hoặc muốn đóng góp bài viết? Gửi tin nhắn cho chúng tôi.',
            name: 'Họ tên', email: 'Email', message: 'Nội dung', send: 'Gửi tin nhắn',
            successTitle: 'Đã gửi thành công!',
            successDesc: 'Cảm ơn bạn đã liên hệ, chúng tôi sẽ phản hồi sớm nhất có thể.',
            backHome: 'Về trang chủ',
        },
```

thành:

```js
        contact: {
            heading: 'Liên hệ với chúng tôi',
            desc: 'Có góp ý, câu hỏi hoặc muốn đóng góp bài viết? Gửi tin nhắn cho chúng tôi.',
            name: 'Họ tên', email: 'Email', message: 'Nội dung', send: 'Gửi tin nhắn',
            sending: 'Đang gửi...',
            successTitle: 'Đã gửi thành công!',
            successDesc: 'Cảm ơn bạn đã liên hệ, chúng tôi sẽ phản hồi sớm nhất có thể.',
            backHome: 'Về trang chủ',
            error: 'Có lỗi xảy ra, vui lòng thử lại.',
        },
```

Khối `en` — từ:

```js
        contact: {
            heading: 'Contact us',
            desc: 'Have feedback, a question, or want to contribute an article? Send us a message.',
            name: 'Name', email: 'Email', message: 'Message', send: 'Send message',
            successTitle: 'Message sent!',
            successDesc: "Thanks for reaching out, we'll get back to you as soon as possible.",
            backHome: 'Back to home',
        },
```

thành:

```js
        contact: {
            heading: 'Contact us',
            desc: 'Have feedback, a question, or want to contribute an article? Send us a message.',
            name: 'Name', email: 'Email', message: 'Message', send: 'Send message',
            sending: 'Sending...',
            successTitle: 'Message sent!',
            successDesc: "Thanks for reaching out, we'll get back to you as soon as possible.",
            backHome: 'Back to home',
            error: 'Something went wrong, please try again.',
        },
```

---

## Bước 6 — Frontend: nối `Contact.jsx` vào API thật

Sửa `frontend-rebuild/src/pages/Contact.jsx` — từ:

```jsx
import { useState } from "react";
import {useLang} from '../context/LangContext'
import Button from '../components/ui/Button'

function Contact() {
    const [sent, setSent] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', message: '' });
    const {t} = useLang();
    const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        setSent(true);
    }
    if (sent) {
        return (
            <section className="mx-auto max-w-xl px-4 py-24 text-center">
                <span className="text-4xl">✅</span>
                <h1 className="mt-4 font-head text-2xl font-black text-fwm-text">{t.contact.successTitle}</h1>
                <p className="mt-2 text-fwm-muted">{t.contact.successDesc}</p>
                <Button to="/" variant="primary" className="mt-6 inline-flex">{t.contact.backHome}</Button>
            </section>
        );
    }
    return (
        <section className="mx-auto max-w-xl px-4 py-16">
            <h1 className="font-head text-3xl font-black text-fwm-text">{t.contact.heading}</h1>
            <p className="mt-3 text-fwm-muted">{t.contact.desc}</p>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.contact.name}</label>
                    <input required value={form.name} onChange={handleChange('name')}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                </div>
                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.contact.email}</label>
                    <input required type="email" value={form.email} onChange={handleChange('email')}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                </div>
                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.contact.message}</label>
                    <textarea required rows={5} value={form.message} onChange={handleChange('message')}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                </div>
                <Button type="submit" variant="primary" className="w-full">{t.contact.send}</Button>
            </form>
        </section>
    );
}

export default Contact;
```

thành:

```jsx
import { useState } from "react";
import {useLang} from '../context/LangContext'
import Button from '../components/ui/Button'
import { sendContactMessage } from '../api/contact'

function Contact() {
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ name: '', email: '', message: '' });
    const {t} = useLang();
    const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        setError('');
        try {
            await sendContactMessage(form);
            setSent(true);
        } catch (err) {
            setError(err.message || t.contact.error);
        } finally {
            setSending(false);
        }
    }
    if (sent) {
        return (
            <section className="mx-auto max-w-xl px-4 py-24 text-center">
                <span className="text-4xl">✅</span>
                <h1 className="mt-4 font-head text-2xl font-black text-fwm-text">{t.contact.successTitle}</h1>
                <p className="mt-2 text-fwm-muted">{t.contact.successDesc}</p>
                <Button to="/" variant="primary" className="mt-6 inline-flex">{t.contact.backHome}</Button>
            </section>
        );
    }
    return (
        <section className="mx-auto max-w-xl px-4 py-16">
            <h1 className="font-head text-3xl font-black text-fwm-text">{t.contact.heading}</h1>
            <p className="mt-3 text-fwm-muted">{t.contact.desc}</p>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.contact.name}</label>
                    <input required value={form.name} onChange={handleChange('name')}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                </div>
                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.contact.email}</label>
                    <input required type="email" value={form.email} onChange={handleChange('email')}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                </div>
                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.contact.message}</label>
                    <textarea required rows={5} value={form.message} onChange={handleChange('message')}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                </div>
                {error && <p className="text-sm text-fwm-pink">{error}</p>}
                <Button type="submit" variant="primary" className="w-full" disabled={sending}>
                    {sending ? t.contact.sending : t.contact.send}
                </Button>
            </form>
        </section>
    );
}

export default Contact;
```

Điểm khác bản cũ: `handleSubmit` giờ là `async`, thật sự gọi `sendContactMessage` và **chỉ chuyển sang màn hình "Đã gửi thành công"** (`setSent(true)`) sau khi API trả về thành công — trước đây bấm nút là chuyển màn hình ngay bất kể có gửi được hay không. Thêm `error` hiển thị dưới form nếu API lỗi (ví dụ bị rate-limit), nút submit disable + đổi chữ thành "Đang gửi..." trong lúc chờ (không cho bấm gửi trùng nhiều lần liên tiếp).

---

## Kiểm tra cuối (test tay luồng thật)

1. Điền đủ 3 field, bấm "Gửi tin nhắn" → nút chuyển "Đang gửi...", disable trong lúc chờ → sau đó chuyển sang màn hình "Đã gửi thành công!".
2. Kiểm tra hộp mail `ADMIN_EMAIL` (email thật đã set) → nhận được đúng nội dung, tiêu đề có tên người gửi.
3. Bấm "Trả lời" ngay trên email đó → ô "To" tự điền đúng email người đã gửi liên hệ (xác nhận `replyTo` hoạt động).
4. Tắt mạng (hoặc sửa tạm `ADMIN_EMAIL` thành rỗng) rồi gửi thử → hiện thông báo lỗi dưới form, **không** nhảy sang màn hình thành công giả.
5. Gửi liên tục 6 lần trong vài phút → từ lần thứ 6 hiện lỗi giới hạn số lần gửi.
