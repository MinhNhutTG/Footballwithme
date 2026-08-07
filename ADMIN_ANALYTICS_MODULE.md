# Module: Thống kê trực quan cho Admin (Analytics Dashboard)

> **✅ Trạng thái: đã hoàn thành và verify (2026-08-07).** Ngoại lệ quy trình: module này do Claude code trực tiếp theo yêu cầu tường minh của người dùng ("code đi", xác nhận qua `AskUserQuestion` chỉ áp dụng 1 lần cho module này), không phải người dùng tự gõ như các module trước. Người dùng đã tự test luồng thật trên UI (tab "Thống kê" trong `/admin`) và xác nhận chạy đúng. Chưa commit/push.

Module fullstack tiếp theo sau nhóm Auth/Profile + Phân trang Admin + Lượt xem/Phổ biến + Reaction + Reply + Notifications + Sitemap + Contact + Access Log (tất cả ✅). Thêm 1 tab mới "Thống kê" trong Admin Dashboard, tổng hợp trực quan (biểu đồ) từ dữ liệu đã có sẵn rải rác (`Post.views`, `Reaction`, `Comment`, `VisitLog`) — hiện chưa nơi nào gộp lại thành 1 bức tranh tổng quan cho admin.

## Khảo sát hiện trạng (trước khi viết spec)

- **Chưa có chart library nào** trong `frontend-rebuild/package.json` — cần cài mới.
- **`Admin.jsx`** dùng pattern `section` state (`'posts' | 'users' | 'logs'`) với nav bên trái, mỗi section render 1 component riêng (`UsersPanel`, `LogsPanel`) nhận `token` qua prop — tab mới sẽ theo đúng pattern này (`'analytics'` + `AnalyticsPanel`).
- **Dữ liệu đã có sẵn, chỉ cần tổng hợp lại, không cần field/model mới:**
  - `Post.views` (Number) — tổng lượt xem, top bài viết xem nhiều.
  - `Post.category` (enum `skill|tactic|exp|player`) — phân bố bài viết theo chuyên mục.
  - `Reaction` (collection riêng, có `type` + `postId`) — phân bố cảm xúc toàn site (không lọc theo 1 bài cụ thể như `reactionController.countByType` hiện có, cần bản gộp toàn site).
  - `Comment` (có `isDeleted` — reply luôn hard-delete, chỉ comment gốc có `parentId=null` mới có thể bị soft-delete) — đếm bình luận còn hiệu lực.
  - `VisitLog` (`path` + `user` + `createdAt`, **TTL tự xoá sau 30 ngày**) — nguồn duy nhất có mốc thời gian để vẽ biểu đồ lượt truy cập theo ngày.
  - `User` — tổng số người dùng.
- **`middleware/auth.js`** đã có sẵn `protect` + `adminOnly` (dùng y hệt `logRoutes.js`), không cần thêm middleware mới.
- **`i18n/dict.js`** có `t.categories[id].label` (bilingual, dùng cho nhãn biểu đồ chuyên mục) và `config/reactions.js` có `REACTIONS` (label tiếng Việt cho 4 loại cảm xúc, dùng lại y nguyên — icon ảnh hiện tại là placeholder, xem `REACTIONS_MODULE.md`).

## Quyết định đã chốt

Chốt qua `AskUserQuestion`, 2 câu:

1. **Chart library:** dùng **Recharts** (thêm 1 dependency mới `recharts` vào `frontend-rebuild/package.json`) thay vì tự vẽ SVG tay — đổi lại tốc độ code, có sẵn responsive/tooltip/legend.
2. **Nguồn dữ liệu biểu đồ lượt truy cập theo ngày:** dùng `VisitLog`, lấy **7 ngày gần nhất**. Giới hạn đã biết rõ: `VisitLog` có TTL tự xoá sau 30 ngày (`visitLogSchema.index({createdAt:1}, {expireAfterSeconds: 60*60*24*30})` trong `models/VisitLog.js`) — dù chọn khung 7 ngày, **không thể xem xu hướng dài hạn quá 30 ngày** vì dữ liệu cũ hơn không còn tồn tại trong DB, đây là giới hạn kiến trúc có sẵn từ `ACCESS_LOG_MODULE.md`, không phải thứ module này có thể khắc phục.

**Không có quyết định bảo mật mới phát sinh** — endpoint mới dùng lại nguyên `protect` + `adminOnly` đã có, không mở public.

---

## Kiến trúc chung

```
Admin.jsx (section='analytics')
        │
        ▼
  AnalyticsPanel.jsx  ──fetch──▶  GET /api/analytics/overview  (protect + adminOnly)
        │                              │
        │                              ▼
        │                     analyticsController.getOverview
        │                              │
        │              Promise.all([ Post, User, Comment, Reaction, VisitLog ])
        │                              │
        ▼                              ▼
  {totals, topPosts, reactionCounts, categoryCounts, traffic}
        │
        ▼
  Recharts: BarChart (traffic 7 ngày) + BarChart (bài viết/chuyên mục)
          + PieChart (cảm xúc) + bảng top 5 bài viết + 4 stat card
```

1 endpoint duy nhất gộp mọi số liệu (không tách nhiều API nhỏ) — dashboard chỉ load 1 lần khi vào tab, không cần tối ưu từng phần riêng.

---

## Bước 1 — Backend: `analyticsController.js`

**Tạo file mới `backend/src/controllers/analyticsController.js`:**

```js
const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Reaction = require('../models/Reaction');
const VisitLog = require('../models/VisitLog');

const CATEGORY_IDS = ['skill', 'tactic', 'exp', 'player'];

async function getOverview(req, res, next) {
  try {
    const now = new Date();
    const trafficStart = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

    const [
      totalPosts,
      totalUsers,
      totalComments,
      viewsAgg,
      topPosts,
      reactionAgg,
      categoryAgg,
      trafficAgg,
    ] = await Promise.all([
      Post.countDocuments(),
      User.countDocuments(),
      Comment.countDocuments({ isDeleted: false }),
      Post.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
      Post.find().sort({ views: -1 }).limit(5).select('title category views'),
      Reaction.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Post.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      VisitLog.aggregate([
        { $match: { createdAt: { $gte: trafficStart } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totalViews = viewsAgg[0]?.total || 0;

    const reactionCounts = { like: 0, dislike: 0, haha: 0, angry: 0 };
    reactionAgg.forEach((r) => { reactionCounts[r._id] = r.count; });

    const categoryCounts = {};
    CATEGORY_IDS.forEach((id) => { categoryCounts[id] = 0; });
    categoryAgg.forEach((c) => { categoryCounts[c._id] = c.count; });

    const trafficMap = {};
    trafficAgg.forEach((t) => { trafficMap[t._id] = t.count; });
    const traffic = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      traffic.push({ date: key, count: trafficMap[key] || 0 });
    }

    res.json({
      totals: { posts: totalPosts, users: totalUsers, comments: totalComments, views: totalViews },
      topPosts,
      reactionCounts,
      categoryCounts,
      traffic,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getOverview };
```

Điểm cần hiểu, không phải chỗ dễ gõ sai nhưng dễ hiểu nhầm logic:
- `traffic` build bằng vòng `for` lặp đúng 7 ngày (`i` từ 6 xuống 0), **không dùng thẳng kết quả `trafficAgg`** — vì `$group` chỉ trả về những ngày *có* lượt truy cập, ngày nào 0 lượt sẽ vắng mặt hoàn toàn trong `trafficAgg`. Nếu render thẳng `trafficAgg` lên biểu đồ, những ngày 0 lượt sẽ bị nhảy cóc mất khỏi trục X thay vì hiện cột cao 0.
- `$dateToString` mặc định theo UTC (không truyền `timezone`) — khớp với `d.toISOString().slice(0,10)` cũng UTC, nên 2 bên map đúng key với nhau. Không cần chỉnh timezone.

---

## Bước 2 — Backend: route + mount vào `server.js`

**Tạo file mới `backend/src/routes/analyticsRoutes.js`:**

```js
const express = require('express');
const { getOverview } = require('../controllers/analyticsController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/overview', protect, adminOnly, getOverview);

module.exports = router;
```

**Sửa `backend/src/server.js`** — thêm require cạnh `logRoutes`:
```js
const analyticsRoutes = require('./routes/analyticsRoutes');
```
Thêm mount cạnh `app.use('/api/logs', logRoutes);`:
```js
app.use('/api/analytics', analyticsRoutes);
```

**Kiểm tra (Postman/curl, cần token admin):**
- `GET /api/analytics/overview` không có token → 401.
- Token user thường (không phải admin) → 403.
- Token admin → trả đủ 5 field: `totals`, `topPosts`, `reactionCounts`, `categoryCounts`, `traffic` (mảng đúng 7 phần tử, mỗi phần tử có `date`+`count`).

---

## Bước 3 — Frontend: cài `recharts` + `api/analytics.js`

**Cài package**, chạy trong `frontend-rebuild/`:
```
npm install recharts
```

**Tạo file mới `frontend-rebuild/src/api/analytics.js`:**
```js
import { apiRequest } from '../api/client';

export function fetchAnalytics(token) {
    return apiRequest('/analytics/overview', { token });
}
```

---

## Bước 4 — Frontend: thêm key i18n vào `dict.js`

**Sửa `frontend-rebuild/src/i18n/dict.js`** — thêm vào khối `admin` tiếng Việt (cạnh `pagePrefix: 'Trang',` đã có, trước dấu `}` đóng khối `admin`):
```js
            analyticsHeading: 'Thống kê',
            statPosts: 'Bài viết',
            statUsers: 'Người dùng',
            statViews: 'Lượt xem',
            statComments: 'Bình luận',
            chartTrafficTitle: 'Lượt truy cập 7 ngày gần nhất',
            chartCategoryTitle: 'Bài viết theo chuyên mục',
            chartReactionTitle: 'Cảm xúc bài viết',
            topPostsTitle: 'Bài viết xem nhiều nhất',
            colViews: 'Lượt xem',
```

Thêm bản tiếng Anh tương ứng vào khối `admin` thứ 2 (cạnh `pagePrefix: 'Page',`):
```js
            analyticsHeading: 'Analytics',
            statPosts: 'Posts',
            statUsers: 'Users',
            statViews: 'Views',
            statComments: 'Comments',
            chartTrafficTitle: 'Traffic — last 7 days',
            chartCategoryTitle: 'Posts by category',
            chartReactionTitle: 'Post reactions',
            topPostsTitle: 'Most viewed posts',
            colViews: 'Views',
```

`colTitle` (nhãn cột "Tiêu đề"/"Title") đã có sẵn trong cả 2 khối từ trước, không cần thêm lại.

---

## Bước 5 — Frontend: `AnalyticsPanel.jsx`

**Tạo file mới `frontend-rebuild/src/components/admin/AnalyticsPanel.jsx`:**

```jsx
import { useEffect, useState } from 'react'
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, Legend,
} from 'recharts'
import { fetchAnalytics } from '../../api/analytics'
import { useLang } from '../../context/LangContext'
import { REACTIONS } from '../../config/reactions'

const REACTION_COLORS = { like: '#34d399', dislike: '#f87171', haha: '#fbbf24', angry: '#fb7185' };
const CATEGORY_COLORS = { skill: '#f59e0b', tactic: '#6366f1', exp: '#14b8a6', player: '#ec4899' };

function StatCard({ label, value }) {
    return (
        <div className="rounded-fwm-lg border border-fwm-line bg-fwm-card p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-fwm-muted">{label}</p>
            <p className="mt-1 font-head text-2xl font-black text-fwm-text">{value}</p>
        </div>
    );
}

function AnalyticsPanel({ token }) {
    const { t, lang } = useLang();
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetchAnalytics(token)
            .then(setData)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [token]);

    if (loading) return <p className="text-fwm-muted">...</p>;
    if (error) return <p className="text-sm text-fwm-pink">{error}</p>;
    if (!data) return null;

    const categoryData = Object.entries(data.categoryCounts).map(([id, count]) => ({
        id, count, label: t.categories[id]?.label || id,
    }));

    const reactionData = REACTIONS.map((r) => ({
        type: r.type, label: r.label, count: data.reactionCounts[r.type] || 0,
    }));

    const trafficData = data.traffic.map((d) => ({
        ...d, label: d.date.slice(5).split('-').reverse().join('/'),
    }));

    return (
        <div>
            <h1 className="mb-5 font-head text-2xl font-black text-fwm-text">{t.admin.analyticsHeading}</h1>

            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label={t.admin.statPosts} value={data.totals.posts} />
                <StatCard label={t.admin.statUsers} value={data.totals.users} />
                <StatCard label={t.admin.statViews} value={data.totals.views} />
                <StatCard label={t.admin.statComments} value={data.totals.comments} />
            </div>

            <div className="mb-6 rounded-fwm-lg border border-fwm-line bg-fwm-card p-4">
                <h2 className="mb-3 font-head text-sm font-bold text-fwm-text">{t.admin.chartTrafficTitle}</h2>
                <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={trafficData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-fwm-line)" />
                        <XAxis dataKey="label" stroke="var(--color-fwm-muted)" fontSize={12} />
                        <YAxis allowDecimals={false} stroke="var(--color-fwm-muted)" fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#ffd93d" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-fwm-lg border border-fwm-line bg-fwm-card p-4">
                    <h2 className="mb-3 font-head text-sm font-bold text-fwm-text">{t.admin.chartCategoryTitle}</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={categoryData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-fwm-line)" />
                            <XAxis type="number" allowDecimals={false} stroke="var(--color-fwm-muted)" fontSize={12} />
                            <YAxis type="category" dataKey="label" stroke="var(--color-fwm-muted)" fontSize={12} width={90} />
                            <Tooltip />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                {categoryData.map((c) => (
                                    <Cell key={c.id} fill={CATEGORY_COLORS[c.id]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="rounded-fwm-lg border border-fwm-line bg-fwm-card p-4">
                    <h2 className="mb-3 font-head text-sm font-bold text-fwm-text">{t.admin.chartReactionTitle}</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={reactionData} dataKey="count" nameKey="label" innerRadius={40} outerRadius={80}>
                                {reactionData.map((r) => (
                                    <Cell key={r.type} fill={REACTION_COLORS[r.type]} />
                                ))}
                            </Pie>
                            <Legend />
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="rounded-fwm-lg border border-fwm-line bg-fwm-card p-4">
                <h2 className="mb-3 font-head text-sm font-bold text-fwm-text">{t.admin.topPostsTitle}</h2>
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-fwm-line text-left">
                            <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.colTitle}</th>
                            <th className="pb-2 text-right font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.colViews}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.topPosts.map((p) => (
                            <tr key={p._id} className="border-b border-fwm-line last:border-0">
                                <td className="py-3 pr-4 text-sm text-fwm-text">{p.title[lang]}</td>
                                <td className="py-3 text-right text-sm text-fwm-muted">{p.views}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AnalyticsPanel;
```

Điểm dễ nhầm nếu tự gõ lại: `reactionData`/`categoryData` build từ `REACTIONS`/`data.categoryCounts` (đã có đủ 4 key mặc định 0 từ backend) — **không** lấy trực tiếp `Object.entries(data.reactionCounts)` cho phần reaction vì thứ tự hiển thị nên khớp thứ tự cố định trong `REACTIONS` (Like → Dislike → Haha → Giận dữ), không phụ thuộc thứ tự key JS trả về.

---

## Bước 6 — Frontend: gắn tab mới vào `Admin.jsx`

**Sửa `frontend-rebuild/src/pages/Admin.jsx`:**

1. Thêm import cạnh `import LogsPanel from '../components/admin/LogsPanel'`:
```js
import AnalyticsPanel from '../components/admin/AnalyticsPanel'
```

2. Thêm nút nav mới, đặt ngay sau nút "Nhật ký truy cập" (trong `<nav className="space-y-1">`):
```jsx
<button type="button" onClick={() => setSection('analytics')} className={`block w-full rounded-fwm px-3 py-2.5 text-left font-head text-sm font-bold ${section === 'analytics' ? 'bg-fwm-accent text-fwm-ink' : 'text-fwm-text hover:bg-fwm-pill'}`}>
    Thống kê
</button>
```

3. Thêm nhánh render — sửa điều kiện hiện có (`section === 'users' ? ... : section === 'logs' ? ... : (...)`) thành thêm 1 nhánh nữa **trước** nhánh mặc định (Bài viết):
```jsx
{section === 'users' ? (
    <UsersPanel token={token} currentUserId={user?._id}></UsersPanel>
) : section === 'logs' ? (
    <LogsPanel token={token}></LogsPanel>
) : section === 'analytics' ? (
    <AnalyticsPanel token={token}></AnalyticsPanel>
) : (<>
```
Phần `(<>` này là điểm bắt đầu của khối JSX "Bài viết" đã có sẵn — **giữ nguyên toàn bộ nội dung bên trong không đổi gì**, chỉ chèn thêm đúng 1 nhánh `section === 'analytics' ? (...) :` vào trước nó.

**Kiểm tra cuối:**
- Vào `/admin`, thấy nút "Thống kê" trong sidebar bên trái, đứng sau "Nhật ký truy cập".
- Bấm vào → hiện đủ 4 stat card, 3 biểu đồ (traffic 7 ngày dạng cột, bài viết theo chuyên mục dạng cột ngang, cảm xúc dạng pie), bảng top 5 bài viết xem nhiều nhất.
- Số liệu khớp thực tế: tổng bài viết = số dòng trong tab "Bài viết", tổng người dùng = số dòng trong tab "Người dùng".
- Đổi ngôn ngữ (nút toggle VI/EN) → toàn bộ nhãn biểu đồ/tiêu đề đổi theo, tên bài viết trong bảng top 5 cũng đổi theo `title[lang]`.
- Tài khoản không phải admin không vào được `/admin` từ trước (không đổi gì thêm ở đây) nên không cần test riêng quyền truy cập tab này.
- Nếu site mới deploy chưa có lượt truy cập nào trong 7 ngày gần nhất → biểu đồ traffic vẫn hiện đủ 7 cột, tất cả cao 0 (không bị lỗi rỗng/trắng trang).

---

## Còn cần bạn chốt

Không có — cả 2 quyết định (chart library, nguồn data traffic) đã chốt qua `AskUserQuestion` trước khi viết tài liệu này.
