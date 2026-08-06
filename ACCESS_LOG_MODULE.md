# Module: Nhật ký truy cập (Access Log)

Ghi lại mỗi lần có người mở 1 trang trên web, admin xem được danh sách này trong Admin Dashboard (tab mới "Nhật ký truy cập").

## Khảo sát hiện trạng (trước khi viết spec)

- `VIEWS_MODULE.md` đã có sẵn, nhưng đó là **đếm view theo từng bài viết** (`Post.views: Number`, không lưu dòng nào, không có IP/user/thời điểm) — hoàn toàn khác với "log truy cập" (cần lưu từng lượt riêng lẻ để xem lại).
- `backend/src/server.js` hiện **không có bất kỳ middleware log request nào** (không `morgan`, không log console/DB) — đây là tính năng mới hoàn toàn, không có gì để tái dùng ngoài các pattern route/middleware sẵn có.
- `backend/src/middleware/auth.js` chỉ có `protect` (bắt buộc có token, 401 nếu không) và `adminOnly`. Không có middleware "auth tuỳ chọn" (decode token nếu có, không chặn nếu không có) — cần route ghi log là **public** (khách chưa đăng nhập cũng phải ghi được) nhưng vẫn muốn biết ai đã đăng nhập nếu có.
- `frontend-rebuild/src/pages/Admin.jsx`: tab chuyển bằng state `section` (`useState('posts')`), không phải nested route. Tab "Người dùng" tách riêng thành `UsersPanel.jsx` (tự fetch, tự quản lý state) — đây là pattern sẽ tái dùng cho tab Log.
- Toàn bộ backend hiện **chưa có phân trang thật ở backend** (mọi API admin trả mảng phẳng, `ADMIN_PAGINATION_MODULE.md` chỉ cắt trang ở frontend sau khi fetch hết). Log sẽ phình to liên tục (không như Post/User), nên module này là nơi đầu tiên cần phân trang thật `?page=&limit=` → `{data, total, page, pages}` — không có sẵn convention để theo, tự thiết kế mới.
- `frontend-rebuild/src/components/common/Layout.jsx` bọc **toàn bộ route** (kể cả trang login, admin...) qua `<Outlet />` — đây là chỗ hợp lý nhất để bắt sự kiện "vừa mở 1 trang" bằng `useLocation()`, không cần sửa từng page riêng lẻ.

## Quyết định đã chốt

Đã hỏi qua `AskUserQuestion` trước khi viết spec:

1. **Ghi log mỗi khi mở 1 trang (frontend gọi API), không phải mọi request backend.** Frontend gọi `POST /api/logs` 1 lần mỗi khi đổi route (giống hệt cách `viewPost` đang gọi khi mở bài viết) — không dùng middleware log-mọi-request ở backend vì sẽ lẫn cả các API nội bộ (comment, reaction...) không phải "ai vào trang nào".
2. **Không lưu IP, không lưu user-agent.** Mỗi dòng log chỉ có: `path` (đường dẫn trang), `createdAt` (thời điểm, tự động từ `timestamps`), và `user` (id người dùng nếu đã đăng nhập, `null` nếu là khách). Không đụng tới dữ liệu nhạy cảm (IP, trình duyệt).
3. **Tự động xoá log cũ hơn 30 ngày** bằng TTL index của MongoDB (`expireAfterSeconds`) — Mongo tự dọn, không cần cron job riêng, tránh collection phình vô hạn.

## Kiến trúc

```
Layout.jsx (bọc mọi route)
  └─ useLocation() đổi pathname → logVisit(path, token)  [fire-and-forget, lỗi không chặn UI]
       └─ POST /api/logs {path}        (public, optionalAuth — có token thì gắn user, không có vẫn cho qua)
                                        │
                                        ▼
                          logController.create
                                        │
                                        ▼
                     VisitLog collection — path, user (ObjectId|null), createdAt
                     TTL index trên createdAt, expireAfterSeconds = 30 ngày

Admin.jsx (tab "Nhật ký truy cập")
  └─ LogsPanel(token) → GET /api/logs?page=&limit=   (protect + adminOnly)
                                        │
                                        ▼
                          logController.list
                          → { data, total, page, pages }  (phân trang thật ở backend, khác mọi API khác trong repo)
```

---

## Bước 1 — Backend: Model `VisitLog`

Tạo file mới `backend/src/models/VisitLog.js`:

```js
const mongoose = require('mongoose');

const visitLogSchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

visitLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('VisitLog', visitLogSchema);
```

`expireAfterSeconds: 60 * 60 * 24 * 30` = 30 ngày. Mongo có 1 background task quét index này định kỳ (khoảng mỗi 60 giây) để xoá document hết hạn — không xoá ngay lập tức đúng giây thứ 2,592,000 nhưng chênh lệch không đáng kể với mục đích dọn log.

**Kiểm tra:** chưa test được (chưa có controller dùng model) — bỏ qua, test gộp ở cuối Bước 2.

---

## Bước 2 — Backend: thêm middleware `optionalAuth`

Sửa `backend/src/middleware/auth.js` — từ:

```js
const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = { protect, adminOnly };
```

thành:

```js
const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // Token sai/hết hạn khi ghi log thì coi như khách, không chặn request
    }
  }
  next();
};

module.exports = { protect, adminOnly, optionalAuth };
```

Khác `protect`: không bao giờ trả 401. Có token hợp lệ → gắn `req.user`. Không có token, hoặc token sai/hết hạn → vẫn `next()` bình thường, `req.user` là `undefined` (route ghi log coi đó là khách).

---

## Bước 3 — Backend: Controller

Tạo file mới `backend/src/controllers/logController.js`:

```js
const VisitLog = require('../models/VisitLog');

async function create(req, res, next) {
  try {
    const { path } = req.body;
    if (!path) return res.status(400).json({ message: 'path is required' });

    await VisitLog.create({ path, user: req.user?.id || null });
    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      VisitLog.find()
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      VisitLog.countDocuments(),
    ]);

    res.json({ data, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list };
```

- `create`: không có middleware `protect` bắt buộc, `req.user` có thể `undefined` (khách) — `req.user?.id || null` xử lý cả 2 trường hợp.
- `list`: `page`/`limit` từ query string, chặn giá trị âm/0/quá lớn (`limit` tối đa 100/lần). `pages: Math.ceil(total / limit) || 1` — phòng trường hợp `total = 0` thì `pages` vẫn là `1` (không phải `0`, để nút "Trang 1/0" khỏi kỳ cục khi log rỗng).

---

## Bước 4 — Backend: Routes + mount vào `server.js`

Tạo file mới `backend/src/routes/logRoutes.js`:

```js
const express = require('express');
const { create, list } = require('../controllers/logController');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', optionalAuth, create);
router.get('/', protect, adminOnly, list);

module.exports = router;
```

Sửa `backend/src/server.js` — từ:

```js
const reactionRoutes = require('./routes/reactionRoutes')
const errorHandler = require('./middleware/errorHandler');
```

thành:

```js
const reactionRoutes = require('./routes/reactionRoutes')
const logRoutes = require('./routes/logRoutes')
const errorHandler = require('./middleware/errorHandler');
```

và từ:

```js
app.use('/api/reactions', reactionRoutes);
app.use('/api/uploads', uploadRoutes);
```

thành:

```js
app.use('/api/reactions', reactionRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/uploads', uploadRoutes);
```

**Kiểm tra bằng Postman:**
1. `POST /api/logs` với body `{"path": "/bai-viet/123"}`, **không** gắn header `Authorization` → `201 {success: true}`. Kiểm tra Mongo: document mới có `user: null`.
2. `POST /api/logs` với cùng body, **có** gắn `Authorization: Bearer <token hợp lệ>` → `201`, document mới có `user` = đúng id user đó.
3. `GET /api/logs` không token → `401`. Có token nhưng không phải admin → `403`. Có token admin → `200 {data, total, page, pages}`, `data` là mảng đã `populate('user', 'name email')`.
4. `GET /api/logs?page=2&limit=5` → đúng 5 dòng tiếp theo (bỏ qua 5 dòng đầu).

---

## Bước 5 — Frontend: `api/logs.js`

Tạo file mới `frontend-rebuild/src/api/logs.js`:

```js
import { apiRequest } from '../api/client';

export function logVisit(path, token) {
    return apiRequest('/logs', { method: 'POST', body: { path }, token });
}

export function fetchLogs(page, limit, token) {
    return apiRequest(`/logs?page=${page}&limit=${limit}`, { token });
}
```

`logVisit` truyền `token` dù route là public — có đăng nhập thì `apiRequest` tự gắn header `Authorization` (xem `client.js`), không có thì `token` là `undefined`, header không gắn, vẫn gọi được bình thường.

---

## Bước 6 — Frontend: gắn log vào `Layout.jsx`

Sửa `frontend-rebuild/src/components/common/Layout.jsx` — từ:

```jsx
import SiteHeader from '../layout/SiteHeader'
import SiteFooter from '../layout/SiteFooter'
import { Outlet } from 'react-router-dom';

function Layout() {
    return (
        <div className="flex min-h-screen flex-col bg-fwm-bg text-fwm-text">

            <SiteHeader></SiteHeader>
            <main className="flex-1">
                <Outlet />
            </main>
            <SiteFooter></SiteFooter>
        </div>
    );
}

export default Layout;
```

thành:

```jsx
import SiteHeader from '../layout/SiteHeader'
import SiteFooter from '../layout/SiteFooter'
import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { logVisit } from '../../api/logs';

function Layout() {
    const location = useLocation();
    const { token } = useAuth();

    useEffect(() => {
        logVisit(location.pathname, token).catch(() => { });
    }, [location.pathname]);

    return (
        <div className="flex min-h-screen flex-col bg-fwm-bg text-fwm-text">

            <SiteHeader></SiteHeader>
            <main className="flex-1">
                <Outlet />
            </main>
            <SiteFooter></SiteFooter>
        </div>
    );
}

export default Layout;
```

Vài điểm cần hiểu rõ:

- Dependency array chỉ có `[location.pathname]`, **cố ý không thêm `token`** — mục đích là ghi log "mở trang X", nếu chỉ đăng nhập/đăng xuất mà không đổi trang thì không cần ghi thêm 1 dòng log mới (tránh log trùng vì lý do không liên quan tới "mở trang").
- `.catch(() => {})` — ghi log thất bại (backend down, mạng lỗi...) không được phép làm hỏng trải nghiệm xem trang, nên nuốt lỗi thầm lặng, không set state/hiện thông báo gì.
- `Layout` bọc **mọi route** kể cả `/admin`, `/dang-nhap`... nên admin tự mở trang cũng được ghi log như user thường — không lọc riêng, đơn giản và nhất quán.
- Ở môi trường dev, `StrictMode` khiến `useEffect` chạy 2 lần → mỗi lần đổi trang có thể ghi 2 dòng log thay vì 1 (giống hệt tình huống đã gặp và chấp nhận ở `VIEWS_MODULE.md`) — không xảy ra ở production build, không cần thêm guard chặn vì log chỉ để tham khảo, không phải số liệu tính phí.

---

## Bước 7 — Frontend: thêm khoá dịch

Sửa `frontend-rebuild/src/i18n/dict.js` — khối `admin` đã có (dòng 45 cho `vi`, dòng 192 cho `en`), thêm các key mới ngay trước dấu đóng `},` của khối, sau `youLabel`.

Khối `vi`, đổi từ:

```js
            deleteUser: 'Xóa tài khoản',
            usersEmpty: 'Chưa có người dùng nào.',
            youLabel: '(bạn)',
        },
```

thành:

```js
            deleteUser: 'Xóa tài khoản',
            usersEmpty: 'Chưa có người dùng nào.',
            youLabel: '(bạn)',
            logsHeading: 'Nhật ký truy cập',
            logsEmpty: 'Chưa có lượt truy cập nào.',
            colPath: 'Trang',
            colVisitor: 'Người truy cập',
            colTime: 'Thời gian',
            anonymousLabel: 'Khách (chưa đăng nhập)',
            prevPage: 'Trước',
            nextPage: 'Sau',
            pagePrefix: 'Trang',
        },
```

Khối `en`, đổi từ:

```js
            deleteUser: 'Delete account',
            usersEmpty: 'No users yet.',
            youLabel: '(you)',
        },
```

thành:

```js
            deleteUser: 'Delete account',
            usersEmpty: 'No users yet.',
            youLabel: '(you)',
            logsHeading: 'Access log',
            logsEmpty: 'No visits recorded yet.',
            colPath: 'Page',
            colVisitor: 'Visitor',
            colTime: 'Time',
            anonymousLabel: 'Guest (not logged in)',
            prevPage: 'Previous',
            nextPage: 'Next',
            pagePrefix: 'Page',
        },
```

---

## Bước 8 — Frontend: component `LogsPanel`

Tạo file mới `frontend-rebuild/src/components/admin/LogsPanel.jsx`:

```jsx
import { fetchLogs } from '../../api/logs'
import { useEffect, useState } from 'react'
import { useLang } from '../../context/LangContext'

function LogsPanel({ token }) {
    const { t } = useLang();
    const [logs, setLogs] = useState([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        fetchLogs(page, 20, token)
            .then((res) => {
                setLogs(res.data);
                setPages(res.pages);
                setTotal(res.total);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }, [page, token])

    return (
        <div>
            <div className="mb-5 flex items-center justify-between">
                <h1 className="font-head text-2xl font-black text-fwm-text">{t.admin.logsHeading}</h1>
                <span className="text-sm text-fwm-muted">{total}</span>
            </div>
            {error && <p className="mb-4 text-sm text-fwm-pink">{error}</p>}

            {loading ? <p className="text-fwm-muted">...</p> :
                logs.length === 0 ? (<p className="text-fwm-muted">{t.admin.logsEmpty}</p>) : (
                    <div>
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-fwm-line text-left">
                                    <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.colPath}</th>
                                    <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.colVisitor}</th>
                                    <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.colTime}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log._id} className="border-b border-fwm-line last:border-0">
                                        <td className="py-3 pr-4 text-sm text-fwm-text">{log.path}</td>
                                        <td className="py-3 pr-4 text-sm text-fwm-muted">
                                            {log.user ? log.user.name : t.admin.anonymousLabel}
                                        </td>
                                        <td className="py-3 pr-4 text-sm text-fwm-muted">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="mt-4 flex items-center justify-between">
                            <button
                                type="button"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                                className="rounded-fwm-pill border border-fwm-line px-4 py-2 text-xs font-bold text-fwm-text disabled:cursor-not-allowed disabled:opacity-40"
                            >{t.admin.prevPage}</button>
                            <span className="text-xs text-fwm-muted">{t.admin.pagePrefix} {page}/{pages}</span>
                            <button
                                type="button"
                                disabled={page >= pages}
                                onClick={() => setPage((p) => p + 1)}
                                className="rounded-fwm-pill border border-fwm-line px-4 py-2 text-xs font-bold text-fwm-text disabled:cursor-not-allowed disabled:opacity-40"
                            >{t.admin.nextPage}</button>
                        </div>
                    </div>
                )
            }

        </div>
    )
}

export default LogsPanel;
```

Đây là component **phân trang thật ở backend** đầu tiên trong repo (khác `UsersPanel`/bảng bài viết trong `Admin.jsx` — cả 2 đều fetch hết rồi cắt trang ở frontend). `page` đổi → `useEffect` refetch đúng trang đó từ server, không giữ toàn bộ log trong bộ nhớ trình duyệt.

---

## Bước 9 — Frontend: gắn tab "Nhật ký truy cập" vào `Admin.jsx`

Sửa `frontend-rebuild/src/pages/Admin.jsx`.

Thêm import, cùng nhóm với `UsersPanel` (dòng 4 hiện tại):

```jsx
import UsersPanel from '../components/admin/UsersPanel'
import LogsPanel from '../components/admin/LogsPanel'
```

Thêm nút tab thứ 3 trong `<nav>` (dòng 163-170 hiện tại). Đoạn:

```jsx
                    <nav className="space-y-1">
                        <button type="button" onClick={() => setSection('posts')} className={`block w-full rounded-fwm px-3 py-2.5 text-left font-head text-sm font-bold ${section === 'posts' ? 'bg-fwm-accent text-fwm-ink' : 'text-fwm-text hover:bg-fwm-pill'}`}>
                            Bài viết
                        </button>
                        <button type="button" onClick={() => setSection('users')} className={`block w-full rounded-fwm px-3 py-2.5 text-left font-head text-sm font-bold ${section === 'users' ? 'bg-fwm-accent text-fwm-ink' : 'text-fwm-text hover:bg-fwm-pill'}`}>
                            Người dùng
                        </button>
                    </nav>
```

đổi thành:

```jsx
                    <nav className="space-y-1">
                        <button type="button" onClick={() => setSection('posts')} className={`block w-full rounded-fwm px-3 py-2.5 text-left font-head text-sm font-bold ${section === 'posts' ? 'bg-fwm-accent text-fwm-ink' : 'text-fwm-text hover:bg-fwm-pill'}`}>
                            Bài viết
                        </button>
                        <button type="button" onClick={() => setSection('users')} className={`block w-full rounded-fwm px-3 py-2.5 text-left font-head text-sm font-bold ${section === 'users' ? 'bg-fwm-accent text-fwm-ink' : 'text-fwm-text hover:bg-fwm-pill'}`}>
                            Người dùng
                        </button>
                        <button type="button" onClick={() => setSection('logs')} className={`block w-full rounded-fwm px-3 py-2.5 text-left font-head text-sm font-bold ${section === 'logs' ? 'bg-fwm-accent text-fwm-ink' : 'text-fwm-text hover:bg-fwm-pill'}`}>
                            Nhật ký truy cập
                        </button>
                    </nav>
```

(Giữ nguyên chữ tiếng Việt hardcode như 2 nút kia — 2 nút đó hiện cũng không dùng khoá dịch dù `t.admin.navPosts`/`navUsers` đã tồn tại sẵn (dead key có từ trước), nên nút mới làm giống y hệt cho nhất quán, không tự ý sửa 2 nút cũ.)

Sửa đoạn render nội dung (dòng 173-175 hiện tại). Đổi từ:

```jsx
                    {section === 'users' ? (
                        <UsersPanel token={token} currentUserId={user?._id}></UsersPanel>
                    ) : (<>
```

thành:

```jsx
                    {section === 'users' ? (
                        <UsersPanel token={token} currentUserId={user?._id}></UsersPanel>
                    ) : section === 'logs' ? (
                        <LogsPanel token={token}></LogsPanel>
                    ) : (<>
```

Phần `</>)}` đóng nhánh `posts` ở cuối khối (nguyên bản đang đóng bằng `)` cho nhánh `else` của ternary 2 nhánh) **giữ nguyên không đổi** — chỉ thêm 1 nhánh `else if` mới ở giữa, cấu trúc JSX phía sau (toàn bộ UI bảng bài viết) không đụng tới.

---

## Kiểm tra cuối (test tay luồng thật)

1. Mở trang chủ khi **chưa đăng nhập** → vào Mongo (hoặc gọi `GET /api/logs` bằng tài khoản admin) thấy 1 dòng log mới, `path: "/"`, `user: null`.
2. Đăng nhập, chuyển qua vài trang khác nhau (chi tiết bài viết, tìm kiếm, hồ sơ...) → mỗi lần đổi route thấy thêm 1 dòng log, `user` = đúng id tài khoản đang đăng nhập.
3. Bấm lại F5 trên cùng 1 trang (không đổi route) → **không** tăng thêm dòng log mới ngoài lần load đầu (trong dev có thể thấy x2 do StrictMode, đã ghi chú ở Bước 6 — không phải bug).
4. Vào `/admin` bằng tài khoản không phải admin → như cũ, không vào được (hành vi này không đổi, module không đụng tới phân quyền trang Admin).
5. Vào `/admin` bằng tài khoản admin, bấm tab "Nhật ký truy cập" → thấy bảng log, sắp xếp mới nhất lên đầu, cột "Người truy cập" hiện đúng tên user hoặc "Khách (chưa đăng nhập)".
6. Bấm "Sau"/"Trước" ở cuối bảng → đổi đúng trang, nút "Trước" bị disable ở trang 1, nút "Sau" bị disable ở trang cuối.
7. Gọi `GET /api/logs` bằng token của user thường (không phải admin) → `403`, xác nhận không lộ log cho user thường.
8. (Tuỳ chọn, cần chờ hoặc chỉnh tạm `expireAfterSeconds` xuống vài chục giây để test nhanh) — tạo 1 log, đợi qua thời gian TTL, xác nhận Mongo tự xoá document đó mà không cần thao tác gì thêm.
