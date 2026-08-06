# Module: Email thông báo khi có người trả lời bình luận

Khi user A trả lời (reply) 1 bình luận gốc của user B, gửi email báo cho B biết — dựa trên hạ tầng Reply (`COMMENT_REPLY_MODULE.md`, đã code xong) và hạ tầng email Resend đã có sẵn (`FORGOT_PASSWORD_MODULE.md`, `EMAIL_VERIFICATION_MODULE.md`).

## Khảo sát hiện trạng (trước khi viết spec)

- **Hạ tầng email đã có, tái dùng nguyên:** `backend/src/config/mailer.js` export thẳng client `resend` (`new Resend(process.env.RESEND_API_KEY)`). Mỗi loại email có 1 file riêng trong `backend/src/utils/` (`sendResetEmail.js`, `sendVerificationEmail.js`), tự chứa cả HTML template, gọi `resend.emails.send({from, to, subject, html})`. Sender cố định: `'FootballWithMe <noreply@minhnhutsoftware.id.vn>'`. Không có helper `sendEmail()` generic dùng chung — module này sẽ thêm 1 file mới cùng kiểu: `sendReplyNotification.js`.
- **Cách gọi hiện tại luôn `await` chặn response** — ví dụ `authController.js` (`forgotPassword`): `await sendResetEmail(user.email, resultUrl); res.json(...)`. Module này **cố tình lệch khỏi convention đó** (xem Quyết định #1).
- **Comment/Reply hiện tại** (`backend/src/controllers/commentController.js`, hàm `create`): khi tạo reply, biến `parent` (kết quả `Comment.findById(parentId)`) đã có sẵn trong scope, không cần fetch lại — nhưng `parent.author` là `ObjectId` chưa populate, cần 1 query `User.findById` riêng để lấy email/tên người nhận. `comment.author.name` (người **vừa reply**, tức người gửi thông báo) đã được populate sẵn ở dòng `comment.populate('author', 'name avatarUrl')` ngay sau khi tạo — không cần query thêm để lấy tên người trả lời.
- **`User.js`**: có `email`, `name`. Không có field bật/tắt thông báo (`emailNotifications` không tồn tại) — xem Quyết định #3.
- **Không có deep-link tới 1 comment cụ thể**: frontend hiện không có `id="comment-..."` hay xử lý `#hash` nào — link trong email chỉ trỏ được tới trang bài viết nói chung (xem Quyết định #2).
- **Không có hàng đợi/background job** (`bull`, `agenda`...) trong repo — "chạy nền" ở module này chỉ đơn giản là **không `await` Promise gửi email**, tận dụng việc backend là 1 process Node chạy liên tục (`app.listen`, deploy trên Render) chứ không phải serverless function bị đóng băng ngay sau khi trả response (khác Vercel functions — ở đó không `await` là nguy hiểm, dễ bị cắt ngang trước khi Promise chạy xong).

## Quyết định đã chốt

Đã hỏi qua `AskUserQuestion` trước khi viết spec:

1. **Không chặn response tạo reply (fire-and-forget).** `notifyReplyAuthor(...)` được gọi **không `await`** trong `create` — reply hiện lên ngay sau khi lưu DB xong, không phải đợi Resend API trả lời. Lỗi gửi email (Resend lỗi, mạng chậm...) chỉ log ra console, không ảnh hưởng gì tới việc tạo reply đã thành công. Lý do lệch khỏi convention `await` hiện có (forgot-password/verify email): những email đó là hành động hiếm, người dùng chủ động chờ; còn reply là thao tác UI thường xuyên, không nên bắt user chờ thêm 1 lần gọi API bên thứ 3.
2. **Email chỉ link tới trang bài viết** (`FRONTEND_URL/bai-viet/:postId`), không nhảy thẳng tới đúng comment — vì frontend chưa có cơ chế anchor/scroll tới 1 comment cụ thể, xây thêm phần đó nằm ngoài phạm vi "gửi email" của module này.
3. **Chưa có tuỳ chọn tắt thông báo** — MVP luôn gửi, không thêm field `emailNotifications`/UI bật-tắt ở bước này. Có thể làm sau nếu thực sự cần, không thiết kế trước cho nhu cầu chưa phát sinh.

**Quyết định kỹ thuật khác (không cần hỏi, suy ra trực tiếp từ logic đã có):**
- **Không tự gửi mail cho chính mình** — nếu `rootComment.author` trùng người vừa reply (tự trả lời comment của chính mình) thì bỏ qua, không gọi API Resend.
- **Comment gốc đã bị xoá mềm (`isDeleted`) vẫn nhận được thông báo reply mới** — vì theo `COMMENT_REPLY_MODULE.md`, thread vẫn tiếp tục sau khi xoá mềm, tác giả gốc vẫn hợp lý muốn biết có người vừa trả lời vào thread đó. Nội dung email hiển thị `"(bình luận đã bị xoá)"` thay vì text thật (đã bị xoá, không còn gì để hiện).
- **Escape HTML** của `replierName`/`originalText`/`replyText` trước khi nhét vào template — 3 giá trị này đều là dữ liệu do user gõ (tên, nội dung comment), nếu không escape thì 1 comment chứa `<script>` hoặc thẻ HTML lạ có thể phá layout hoặc chèn nội dung tuỳ ý vào email nhận được. Các email hiện có (`sendResetEmail`/`sendVerificationEmail`) không cần escape vì chỉ nhét link do server tự sinh, không có input tự do từ user — nhưng module này nhét thẳng nội dung comment nên bắt buộc phải escape.

## Kiến trúc

```
POST /api/comments {postId, text, parentId}   (đã có, không đổi route)
        │
        ▼
commentController.create
        │  (sau khi comment.populate('author', 'name avatarUrl') thành công)
        │
        ├──► res.status(201).json(comment)              [trả response ngay]
        │
        └──► notifyReplyAuthor(rootComment, comment, postId)   [KHÔNG await]
                    │
                    ▼
             User.findById(rootComment.author).select('name email')
                    │
                    ▼
             sendReplyNotification(email, {replierName, originalText, replyText, postUrl})
                    │
                    ▼
             resend.emails.send({...})   (config/mailer.js — hạ tầng có sẵn)
```

---

## Bước 1 — Backend: `utils/sendReplyNotification.js`

Tạo file mới `backend/src/utils/sendReplyNotification.js`:

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

async function sendReplyNotification(to, { replierName, originalText, replyText, postUrl }) {
    const safeReplierName = escapeHtml(replierName);
    const safeOriginalText = escapeHtml(originalText);
    const safeReplyText = escapeHtml(replyText);

    await resend.emails.send({
        from: 'FootballWithMe <noreply@minhnhutsoftware.id.vn>',
        to,
        subject: `${safeReplierName} đã trả lời bình luận của bạn`,
        html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 480px; margin: 0 auto;">
          <h2 style="font-size: 18px;">${safeReplierName} đã trả lời bình luận của bạn trên FootballWithMe</h2>

          <p style="color: #666; font-size: 13px; margin-bottom: 4px;">Bình luận của bạn:</p>
          <blockquote style="margin: 0 0 16px; padding: 12px 16px; background: #f5f5f5; border-left: 3px solid #ccc; font-size: 14px;">
            ${safeOriginalText}
          </blockquote>

          <p style="color: #666; font-size: 13px; margin-bottom: 4px;">Trả lời:</p>
          <blockquote style="margin: 0 0 20px; padding: 12px 16px; background: #f5f5f5; border-left: 3px solid #22c55e; font-size: 14px;">
            ${safeReplyText}
          </blockquote>

          <a href="${postUrl}" style="display: inline-block; padding: 10px 20px; background: #22c55e; color: #fff; text-decoration: none; border-radius: 999px; font-weight: bold; font-size: 14px;">
            Xem bài viết
          </a>
        </body>
        </html>
        `,
    });
}

module.exports = sendReplyNotification;
```

**Kiểm tra:** chưa test được (chưa có nơi gọi) — bỏ qua, test gộp ở cuối Bước 2.

---

## Bước 2 — Backend: gọi từ `commentController.js`

Sửa `backend/src/controllers/commentController.js` — từ:

```js
const Comment = require('../models/Comment');

async function list(req, res, next) {
  try {
    const { postId } = req.query;
    if (!postId) return res.status(400).json({ message: 'postId is required' });

    const comments = await Comment.find({ postId })
      .populate('author', 'name avatarUrl')
      .sort({ createdAt: 1 });

    res.json(comments);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { postId, text, parentId } = req.body;
    if (!postId || !text?.trim()) {
      return res.status(400).json({ message: 'postId and text are required' });
    }

    let resolvedParentId = null;
    if (parentId) {
      const parent = await Comment.findById(parentId);
      if (!parent) return res.status(404).json({ message: 'Parent comment not found' });
      // Luôn gắn reply về comment gốc, kể cả khi bấm "Trả lời" từ 1 reply khác (flatten 1 cấp)
      resolvedParentId = parent.parentId ? parent.parentId : parent._id;
    }

    const comment = await Comment.create({
      postId,
      text: text.trim(),
      author: req.user.id,
      parentId: resolvedParentId,
    });

    await comment.populate('author', 'name avatarUrl');
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
}
```

thành:

```js
const Comment = require('../models/Comment');
const User = require('../models/User');
const sendReplyNotification = require('../utils/sendReplyNotification');

async function notifyReplyAuthor(rootComment, replyComment, postId) {
  try {
    const recipient = await User.findById(rootComment.author).select('name email');
    if (!recipient) return;

    const postUrl = `${process.env.FRONTEND_URL}/bai-viet/${postId}`;
    const originalText = rootComment.isDeleted ? '(bình luận đã bị xoá)' : rootComment.text;

    await sendReplyNotification(recipient.email, {
      replierName: replyComment.author.name,
      originalText,
      replyText: replyComment.text,
      postUrl,
    });
  } catch (err) {
    console.error('Gửi email thông báo reply thất bại:', err.message);
  }
}

async function list(req, res, next) {
  try {
    const { postId } = req.query;
    if (!postId) return res.status(400).json({ message: 'postId is required' });

    const comments = await Comment.find({ postId })
      .populate('author', 'name avatarUrl')
      .sort({ createdAt: 1 });

    res.json(comments);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { postId, text, parentId } = req.body;
    if (!postId || !text?.trim()) {
      return res.status(400).json({ message: 'postId and text are required' });
    }

    let resolvedParentId = null;
    let rootComment = null;
    if (parentId) {
      const parent = await Comment.findById(parentId);
      if (!parent) return res.status(404).json({ message: 'Parent comment not found' });
      // Luôn gắn reply về comment gốc, kể cả khi bấm "Trả lời" từ 1 reply khác (flatten 1 cấp)
      resolvedParentId = parent.parentId ? parent.parentId : parent._id;
      rootComment = parent.parentId ? await Comment.findById(resolvedParentId) : parent;
    }

    const comment = await Comment.create({
      postId,
      text: text.trim(),
      author: req.user.id,
      parentId: resolvedParentId,
    });

    await comment.populate('author', 'name avatarUrl');

    if (rootComment && rootComment.author.toString() !== req.user.id) {
      // Không await — gửi email chạy nền, không chặn response tạo reply
      notifyReplyAuthor(rootComment, comment, postId);
    }

    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
}
```

Hàm `remove` **giữ nguyên không đổi** — chỉ thêm import `User`, `sendReplyNotification` và hàm `notifyReplyAuthor` mới ở đầu file, sửa `create`.

Điểm cần hiểu rõ:

- `rootComment` chỉ khác `parent` trong 1 trường hợp không thể xảy ra qua UI hiện tại (gọi thẳng API với `parentId` là id của 1 reply, không phải comment gốc — UI chỉ hiện nút "Trả lời" ở comment gốc). Xử lý cả 2 trường hợp cho chắc (phòng khi có client khác gọi API trực tiếp) bằng 1 dòng `parent.parentId ? await Comment.findById(resolvedParentId) : parent`.
- Check `rootComment.author.toString() !== req.user.id` để **không tự gửi mail cho chính mình** khi tự trả lời comment của mình.
- `notifyReplyAuthor(...)` gọi **không có `await`** phía trước — đây là chỗ khác biệt quan trọng nhất so với pattern gửi email hiện có trong repo (forgot-password/verify email đều `await`). Bản thân hàm `notifyReplyAuthor` vẫn là `async function` và **tự `try/catch` bên trong nó** — nếu không bắt lỗi ở đây, 1 Promise bị reject mà không ai `await`/`.catch()` sẽ tạo ra `UnhandledPromiseRejection`, có thể làm crash tiến trình Node tuỳ theo cấu hình — đây là lý do bắt buộc phải có `try/catch` trong chính hàm được gọi fire-and-forget, không thể bỏ qua.

**Kiểm tra bằng Postman + hộp mail thật:**
1. User A tạo 1 comment gốc trên 1 bài viết bất kỳ.
2. User B (tài khoản khác, có email thật nhận được) `POST /api/comments` với `parentId` = id comment của A → response `201` trả về **ngay lập tức** (không phải đợi email gửi xong — so sánh thời gian phản hồi với việc gọi `forgot-password` để thấy khác biệt).
3. Kiểm tra hộp mail của **A** → nhận được email "B đã trả lời bình luận của bạn", đúng nội dung comment gốc + nội dung reply, nút "Xem bài viết" trỏ đúng `FRONTEND_URL/bai-viet/<postId>`.
4. **A** tự trả lời chính comment gốc của mình → **không** có email nào được gửi (tự kiểm tra hộp mail A, hoặc thêm `console.log` tạm trong lúc test để xác nhận `notifyReplyAuthor` không được gọi).
5. Comment gốc của A đã bị **xoá mềm** (có ít nhất 1 reply khác từ trước) → user C tiếp tục reply vào thread đó → A vẫn nhận được email, phần "Bình luận của bạn" hiện `"(bình luận đã bị xoá)"` thay vì nội dung thật.
6. Thử 1 comment gốc có nội dung chứa `<b>test</b>` hoặc `<script>alert(1)</script>` rồi để người khác reply → mở email nhận được, xác nhận đoạn đó hiện ra như **chữ thường** (`&lt;script&gt;...`), không bị render thành thẻ HTML/chạy script — xác nhận escape hoạt động đúng.
7. Tắt tạm `RESEND_API_KEY` (hoặc đổi sai giá trị) rồi thử reply → API tạo reply vẫn trả `201` bình thường, reply vẫn hiện trên UI, chỉ có log lỗi "Gửi email thông báo reply thất bại" xuất hiện ở console backend — xác nhận lỗi gửi email không làm hỏng luồng tạo reply.
