# Module: Trung tâm thông báo (chuông thông báo)

Icon chuông trong header, hiện số thông báo chưa đọc, bấm vào xổ ra danh sách — dùng chung cho cả user thường lẫn admin (2 đối tượng này cùng đi qua 1 `SiteHeader` duy nhất, không phải 2 nơi khác nhau). Thiết kế **mở rộng được cho nhiều loại thông báo sau này** (ví dụ: có bài viết mới) — module này chỉ bật 1 loại đầu tiên: có người trả lời bình luận của bạn (tái dùng đúng điểm hook đã có ở `REPLY_EMAIL_MODULE.md`).

## Khảo sát hiện trạng (trước khi viết spec)

- **Chưa có model `Notification` nào** — đây là tính năng mới hoàn toàn ở tầng DB.
- **`SiteHeader.jsx`** dùng chung cho mọi route (kể cả `/admin`, vì `/admin` cũng nằm trong `<Layout>` như mọi trang khác) — chuông chỉ cần gắn 1 lần ở đây là tự động có cho cả user lẫn admin, không cần làm 2 nơi.
- Khu vực icon bên phải header (`lang`, `theme` — dùng `IconButton`) là chỗ tự nhiên để thêm chuông, theo đúng style emoji đã dùng nhất quán trong app (🔍, ♥, ☀️/🌙 — không dùng icon library nào), nên chuông cũng dùng emoji 🔔, không thêm dependency mới.
- **Chưa có dropdown/popover nào trong codebase** (đã grep, không có pattern click-outside sẵn) — phải tự viết từ đầu bằng `useRef` + lắng nghe `mousedown` trên `document`.
- **Điểm hook có sẵn**: `commentController.js`, hàm `notifyReplyAuthor` (đã có từ `REPLY_EMAIL_MODULE.md`) — hiện chỉ gửi email. Module này thêm bước tạo `Notification` document ngay cạnh, dùng đúng dữ liệu đã có sẵn trong scope (`rootComment`, `comment` vừa tạo đã populate `author`), không cần query thêm gì để lấy dữ liệu cơ bản.
- **Các email hiện có đều hard-code tiếng Việt**, không qua i18n (`sendResetEmail`, `sendVerificationEmail`, `sendReplyNotification`) — module này giữ nhất quán: `message` của thông báo cũng lưu sẵn tiếng Việt tại thời điểm tạo, không xây dựng hệ thống dịch động cho từng loại thông báo (đúng mức độ phức tạp hiện có của app, không phát sinh yêu cầu i18n mới).
- **Bell chỉ hiện ở desktop** (`hidden sm:block`) — giống hệt 2 icon `lang`/`theme` đang có (`hidden sm:inline-flex`), không phải giới hạn mới do module này tạo ra. `MobileMenu.jsx` hiện chỉ render link + nút logout, không có chỗ cắm icon — mở rộng mobile nằm ngoài phạm vi module này.

## Quyết định đã chốt

Đã hỏi qua `AskUserQuestion` trước khi viết spec:

1. **Cập nhật badge bằng fetch khi đổi route + poll mỗi 60 giây** — không dùng WebSocket (không có hạ tầng realtime nào trong repo, thêm Socket.IO là 1 khoản hạ tầng mới không cần thiết ở quy mô hiện tại). `useNotifications` tự có `useEffect` theo `location.pathname` (dùng `useLocation()` ngay trong hook, độc lập với `Layout.jsx` — không tận dụng chung effect của Access Log vì 2 việc khác mối quan tâm) + `setInterval` 60s riêng.
2. **Mở chuông là tự động đánh dấu đã đọc hết** — giống hành vi phổ biến (Facebook/Gmail), không cần thêm nút "Đánh dấu đã đọc" hay bấm từng cái riêng.

**Quyết định kỹ thuật khác (không cần hỏi, suy ra trực tiếp):**
- **`type` là 1 enum mở rộng được** (`['reply']` lúc này, thêm `'new_post'` sau chỉ cần thêm giá trị vào mảng — không đổi schema). `message` là text hiển thị sẵn (build lúc tạo notification), `link` là đường dẫn frontend để bấm vào nhảy tới — cả 2 field đủ tổng quát cho bất kỳ loại thông báo nào sau này, không cần thêm field riêng theo từng loại.
- **Tạo `Notification` không chặn việc gửi email** — 2 side-effect (tạo notification, gửi email) đặt trong 2 khối `try/catch` **riêng biệt** bên trong `notifyReplyAuthor` (khác bản gốc chỉ có 1 `try/catch` bọc cả hàm) — để lỗi ở 1 phía (ví dụ DB tạm lỗi) không kéo theo bỏ luôn phía kia (email vẫn gửi được dù ghi Notification thất bại, và ngược lại).

## Kiến trúc

```
SiteHeader.jsx (dùng chung user + admin)
  └─ NotificationBell → useNotifications() → useAuth() (token) + useLocation() (đổi route)
       ├─ GET  /api/notifications/unread-count   (protect) → { count }   [đổi route + poll 60s]
       ├─ GET  /api/notifications                (protect) → [...]      [khi bấm mở chuông]
       └─ POST /api/notifications/mark-read      (protect) → { success } [khi bấm mở chuông, nếu count > 0]

commentController.create (đã có, POST /api/comments)
  └─ notifyReplyAuthor(rootComment, comment, postId)   [không await — đã có từ trước]
       ├─ Notification.create({recipient, type:'reply', message, link})   [try/catch riêng]
       └─ sendReplyNotification(...)                                      [try/catch riêng, đã có từ trước]
```

---

## Bước 1 — Backend: Model `Notification`

Tạo file mới `backend/src/models/Notification.js`:

```js
const mongoose = require('mongoose');

const NOTIFICATION_TYPES = ['reply'];

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    message: { type: String, required: true },
    link: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification = mongoose.model('Notification', notificationSchema);
Notification.TYPES = NOTIFICATION_TYPES;

module.exports = Notification;
```

**Kiểm tra:** chưa test được (chưa có nơi tạo/đọc) — bỏ qua, test gộp ở cuối Bước 3.

---

## Bước 2 — Backend: Controller + Routes

Tạo file mới `backend/src/controllers/notificationController.js`:

```js
const Notification = require('../models/Notification');

async function list(req, res, next) {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
}

async function unreadCount(req, res, next) {
  try {
    const count = await Notification.countDocuments({ recipient: req.user.id, isRead: false });
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    await Notification.updateMany({ recipient: req.user.id, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, unreadCount, markAllRead };
```

Tạo file mới `backend/src/routes/notificationRoutes.js`:

```js
const express = require('express');
const { list, unreadCount, markAllRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, list);
router.get('/unread-count', protect, unreadCount);
router.post('/mark-read', protect, markAllRead);

module.exports = router;
```

Sửa `backend/src/server.js` — từ:

```js
const { generate: generateSitemap } = require('./controllers/sitemapController');
const errorHandler = require('./middleware/errorHandler');
```

thành:

```js
const { generate: generateSitemap } = require('./controllers/sitemapController');
const notificationRoutes = require('./routes/notificationRoutes');
const errorHandler = require('./middleware/errorHandler');
```

và từ:

```js
app.use('/api/logs', logRoutes);
app.use('/api/uploads', uploadRoutes);
```

thành:

```js
app.use('/api/logs', logRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/uploads', uploadRoutes);
```

Cả 3 route đều `protect` — admin cũng chỉ là 1 `User` bình thường (không có field/role đặc biệt nào tách riêng ở đây), nên không cần `adminOnly` cho bất kỳ route nào trong module này.

---

## Bước 3 — Backend: tạo notification khi có reply

Sửa `backend/src/controllers/commentController.js` — từ:

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
```

thành:

```js
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const sendReplyNotification = require('../utils/sendReplyNotification');

async function notifyReplyAuthor(rootComment, replyComment, postId) {
  const recipient = await User.findById(rootComment.author).select('name email').catch(() => null);
  if (!recipient) return;

  const postUrl = `${process.env.FRONTEND_URL}/bai-viet/${postId}`;
  const originalText = rootComment.isDeleted ? '(bình luận đã bị xoá)' : rootComment.text;

  try {
    await Notification.create({
      recipient: recipient._id,
      type: 'reply',
      message: `${replyComment.author.name} đã trả lời bình luận của bạn`,
      link: `/bai-viet/${postId}`,
    });
  } catch (err) {
    console.error('Tạo thông báo reply thất bại:', err.message);
  }

  try {
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
```

`create()` (hàm tạo comment/reply) **giữ nguyên không đổi** — vẫn gọi `notifyReplyAuthor(rootComment, comment, postId)` không `await` như cũ, chỉ bản thân `notifyReplyAuthor` đổi nội dung bên trong.

Điểm khác bản gốc: `User.findById(...)` giờ có `.catch(() => null)` ngay tại chỗ gọi (thay vì nằm trong 1 `try/catch` bao trùm cả hàm) — vì phần thân hàm giờ có 2 khối `try/catch` độc lập cho 2 side-effect (tạo notification, gửi email), nên bước lấy `recipient` ở đầu cũng cần tự xử lý lỗi riêng, không còn khối `try` ngoài cùng nào để "rơi vào" nữa.

**Kiểm tra bằng Postman:**
1. `GET /api/notifications/unread-count` với token hợp lệ, chưa có thông báo nào → `{count: 0}`.
2. User B reply vào comment gốc của User A → gọi lại bằng token của A → `{count: 1}`.
3. `GET /api/notifications` (token A) → thấy đúng 1 document, `type: 'reply'`, `message` đúng tên B, `link` đúng `/bai-viet/<postId>`, `isRead: false`.
4. `POST /api/notifications/mark-read` (token A) → sau đó gọi lại `unread-count` → `{count: 0}`.
5. Kiểm tra hộp mail A vẫn nhận được email như module `REPLY_EMAIL_MODULE.md` cũ — xác nhận notification mới không làm hỏng luồng email đã có.

---

## Bước 4 — Frontend: `api/notifications.js`

Tạo file mới `frontend-rebuild/src/api/notifications.js`:

```js
import { apiRequest } from '../api/client';

export function getNotifications(token) {
    return apiRequest('/notifications', { token });
}

export function getUnreadCount(token) {
    return apiRequest('/notifications/unread-count', { token });
}

export function markAllRead(token) {
    return apiRequest('/notifications/mark-read', { method: 'POST', token });
}
```

---

## Bước 5 — Frontend: thêm khoá dịch

Sửa `frontend-rebuild/src/i18n/dict.js` — thêm khối `notification` mới, cùng cấp với `comment`/`reaction`.

Khối `vi` (đặt ngay sau khối `reaction` hiện có):

```js
        notification: {
            heading: 'Thông báo',
            empty: 'Chưa có thông báo nào.',
        },
```

Khối `en`:

```js
        notification: {
            heading: 'Notifications',
            empty: 'No notifications yet.',
        },
```

---

## Bước 6 — Frontend: hook `useNotifications`

Tạo file mới `frontend-rebuild/src/hooks/useNotifications.js`:

```js
import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNotifications, getUnreadCount, markAllRead as markAllReadAPI } from '../api/notifications';

export function useNotifications() {
    const { token } = useAuth();
    const location = useLocation();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const refreshCount = useCallback(() => {
        if (!token) return;
        getUnreadCount(token).then((res) => setUnreadCount(res.count)).catch(() => {});
    }, [token]);

    useEffect(() => {
        refreshCount();
    }, [location.pathname, refreshCount]);

    useEffect(() => {
        if (!token) return;
        const interval = setInterval(refreshCount, 60000);
        return () => clearInterval(interval);
    }, [token, refreshCount]);

    const openNotifications = useCallback(async () => {
        if (!token) return;
        const list = await getNotifications(token);
        setNotifications(list);
        if (unreadCount > 0) {
            await markAllReadAPI(token);
            setUnreadCount(0);
        }
    }, [token, unreadCount]);

    return { notifications, unreadCount, openNotifications };
}
```

- Không bọc bằng Context/Provider như `Comment`/`Reaction` — state ở đây chỉ dùng trong đúng 1 component (`NotificationBell`, Bước 7), không cần chia sẻ xuống cây con nào, nên gọi hook thẳng là đủ, không cần thêm tầng Provider.
- `notifications` (danh sách) chỉ fetch khi `openNotifications()` được gọi (lúc bấm mở chuông) — không fetch sẵn danh sách đầy đủ mỗi 60s, chỉ poll **số lượng** (`unreadCount`, nhẹ hơn nhiều).

---

## Bước 7 — Frontend: component `NotificationBell`

Tạo file mới `frontend-rebuild/src/components/notification/NotificationBell.jsx`:

```jsx
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext';
import { useNotifications } from '../../hooks/useNotifications';
import IconButton from '../ui/IconButton';

function NotificationBell() {
    const { t } = useLang();
    const { notifications, unreadCount, openNotifications } = useNotifications();
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    async function handleToggle() {
        const next = !open;
        setOpen(next);
        if (next) {
            await openNotifications();
        }
    }

    return (
        <div className="relative hidden sm:block" ref={wrapperRef}>
            <IconButton label={t.notification.heading} onClick={handleToggle} className="relative">
                🔔
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-fwm-pink px-1 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </IconButton>

            {open && (
                <div className="absolute right-0 top-12 z-50 w-80 rounded-fwm-lg border border-fwm-line bg-fwm-card shadow-lg">
                    <div className="border-b border-fwm-line px-4 py-3">
                        <p className="font-head text-sm font-bold text-fwm-text">{t.notification.heading}</p>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <p className="px-4 py-6 text-center text-sm text-fwm-muted">{t.notification.empty}</p>
                        ) : (
                            notifications.map((n) => (
                                <Link
                                    key={n._id}
                                    to={n.link}
                                    onClick={() => setOpen(false)}
                                    className={`block border-b border-fwm-line px-4 py-3 text-sm transition last:border-0 hover:bg-fwm-pill ${n.isRead ? 'text-fwm-muted' : 'font-bold text-fwm-text'}`}
                                >
                                    {n.message}
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationBell;
```

- Click-outside tự viết bằng `useRef` + lắng nghe `mousedown` trên `document` (không có pattern sẵn để tái dùng, đã ghi ở phần Khảo sát).
- `n.isRead` dùng để tô đậm/nhạt từng dòng trong danh sách vừa fetch — phản ánh đúng trạng thái **tại thời điểm bấm mở** (trước khi `mark-read` chạy xong), giúp user vẫn phân biệt được thông báo nào là mới dù badge đã về 0 ngay sau đó.

---

## Bước 8 — Frontend: gắn vào `SiteHeader.jsx`

Sửa `frontend-rebuild/src/components/layout/SiteHeader.jsx`.

Thêm import, cùng nhóm với `IconButton` (dòng 5 hiện tại):

```jsx
import  IconButton  from '../ui/IconButton'
import NotificationBell from '../notification/NotificationBell'
```

Thêm `<NotificationBell />` ngay sau 2 `IconButton` (lang/theme) và trước khối `user ? (...) : (...)`. Đoạn hiện tại:

```jsx
                    <IconButton label="theme" onClick={toggleTheme} className="hidden sm:inline-flex">
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </IconButton>
                    {user ? (
```

đổi thành:

```jsx
                    <IconButton label="theme" onClick={toggleTheme} className="hidden sm:inline-flex">
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </IconButton>
                    {user && <NotificationBell />}
                    {user ? (
```

Chỉ hiện `NotificationBell` khi đã đăng nhập (`user` truthy) — khách chưa đăng nhập không có gì để nhận thông báo (mọi route trong module đều `protect`, gọi mà không có token sẽ luôn `401`).

---

## Kiểm tra cuối (test tay luồng thật)

1. Đăng nhập tài khoản A, mở bất kỳ trang nào → thấy icon 🔔 xuất hiện cạnh nút đổi ngôn ngữ/theme (desktop, màn hình đủ rộng — mobile thu gọn không hiện, giống 2 icon kia).
2. Dùng tài khoản B (trình duyệt khác/ẩn danh) trả lời 1 comment gốc của A.
3. Quay lại tab của A, **chuyển sang 1 trang khác** (không F5) → badge đỏ hiện số `1` trên chuông (không cần đợi đủ 60 giây, vì đổi route đã trigger fetch ngay).
4. Đứng yên không đổi trang, để tài khoản B reply thêm 1 lần nữa, đợi tối đa 60 giây (không thao tác gì) → badge tự tăng lên `2` mà không cần F5/đổi trang (xác nhận cơ chế poll hoạt động).
5. Bấm vào chuông → danh sách 2 thông báo hiện ra, đúng nội dung, badge đỏ **biến mất ngay lập tức**.
6. Đóng dropdown, F5 lại trang → badge không hiện lại số nữa (đã đánh dấu đọc thật ở server, không phải chỉ ẩn tạm ở client).
7. Bấm vào 1 dòng thông báo trong danh sách → chuyển đúng tới trang bài viết chứa comment đó (`link` đúng), dropdown tự đóng lại.
8. Bấm ra ngoài vùng dropdown (không bấm vào chuông hay bên trong danh sách) → dropdown tự đóng (xác nhận click-outside hoạt động).
9. Đăng xuất → icon chuông biến mất khỏi header hoàn toàn.
