# Module: Quản lý bình luận trong Admin

Module fullstack tiếp theo sau Layout Admin + Icon Font (`ADMIN_LAYOUT_MODULE.md`/`ICON_FONT_MODULE.md`, ✅). Thêm 1 tab "Bình luận" trong Admin để xem/xoá bình luận vi phạm tập trung — hiện admin phải tự vào từng bài viết tìm đúng comment, hoặc vào thẳng DB.

## Khảo sát hiện trạng (trước khi viết spec)

- **`Comment` model** (`backend/src/models/Comment.js`): `postId` (String, không phải ref `Post`), `text`, `author` (ref `User`), `parentId` (ref `Comment`, `null` = comment gốc, chỉ 1 cấp lồng), `isDeleted` (soft-delete flag).
- **Quyền xoá đã có sẵn ở backend, không cần đổi gì**: `commentController.js` hàm `remove` đã cho phép **admin xoá bất kỳ comment nào** (`isAdmin = req.user.role === 'admin'`), không chỉ tác giả. Logic xoá đã đúng (reply → hard-delete; comment gốc còn reply → soft-delete giữ thread; comment gốc hết reply → hard-delete) — module này **chỉ thêm nơi liệt kê**, không đụng logic xoá.
- **Chưa có endpoint list toàn hệ thống**: `GET /api/comments` hiện bắt buộc query `postId`, chỉ trả comment của 1 bài. Cần thêm endpoint mới, không phá endpoint public cũ.
- **`analyticsController.js` đã đếm `Comment.countDocuments({isDeleted: false})`** cho tổng quan Thống kê — endpoint mới dùng cùng filter `isDeleted: false` để nhất quán (comment đã soft-delete không còn ý nghĩa hiển thị lại — nội dung đã bị xoá rỗng).
- **`postId` là String nhưng thực chất là `Post._id`** (frontend dùng `post.id` = `post._id` để tạo comment) — có thể join lấy tiêu đề bài viết bằng `Post.find({_id: {$in: postIds}})`.
- **Frontend chưa có hàm gọi list toàn cục** (`api/comments.js` chỉ có `getComments(postId)`, `addComment`, `deleteComment`) — nhưng `deleteComment(id, token)` **dùng lại được nguyên vẹn** cho nút xoá trong Admin, không cần API mới cho việc xoá.
- **Quy ước xoá trong Admin hiện tại: xoá trực tiếp, không có modal xác nhận** (`AdminTableRow.jsx` xoá bài viết, `UsersPanel.jsx` xoá user đều gọi thẳng `handleDelete`, không `confirm()`) — module này theo đúng quy ước đó cho nhất quán, khác với trang public (`ConfirmModal` khi user tự xoá comment của mình — 2 ngữ cảnh khác nhau, không cần đồng nhất).
- **Pattern tham khảo trực tiếp: `LogsPanel.jsx` + `logController.list`** — cùng shape phân trang `{data, total, page, pages}`, cùng cách admin-only qua `protect + adminOnly` như `logRoutes.js`.

## Quyết định đã chốt

Chốt qua `AskUserQuestion`:
1. **Phạm vi đơn giản**: danh sách toàn bộ comment + nút xoá, dùng lại quyền xoá đã có sẵn ở backend. **Không** thêm cơ chế "báo cáo vi phạm" từ người dùng (không thêm field/model report mới) — nằm ngoài phạm vi.
2. **Hiển thị phẳng theo thời gian mới nhất trước**, gồm cả comment gốc lẫn reply không phân biệt, kèm link tới bài viết chứa comment đó — giống hệt layout `LogsPanel`.

---

## Kiến trúc chung

```
GET /api/comments/admin?page=&limit=   (protect + adminOnly)
        │
        ▼
commentController.listAll()
  Comment.find({isDeleted:false}).populate(author).sort(createdAt:-1).skip/limit
  + join postTitle từ Post._id (batch, không N+1 query)
        │
        ▼
{ data: [...comments kèm postTitle], total, page, pages }

CommentsPanel.jsx (Admin) — pattern y hệt LogsPanel.jsx
  bảng: Nội dung | Tác giả | Bài viết (link) | Thời gian | Xoá
  xoá → gọi thẳng deleteComment(id, token) đã có sẵn, refetch trang hiện tại

Admin.jsx → NAV_GROUPS nhóm "Nội dung" thêm mục "Bình luận"
```

---

## Bước 1 — Backend: `commentController.js` thêm `listAll`

**Sửa `backend/src/controllers/commentController.js`** — thêm `require('../models/Post')` ở đầu file, thêm hàm mới, và thêm vào `module.exports`:

```js
const Post = require('../models/Post');
```
đặt cạnh `const Comment = require('../models/Comment');` ở đầu file.

Thêm hàm mới (đặt sau hàm `list` có sẵn):
```js
async function listAll(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Comment.find({ isDeleted: false })
        .populate('author', 'name avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Comment.countDocuments({ isDeleted: false }),
    ]);

    const postIds = [...new Set(data.map((c) => c.postId))];
    const posts = await Post.find({ _id: { $in: postIds } }).select('title');
    const titleById = Object.fromEntries(posts.map((p) => [p._id.toString(), p.title.vi]));

    const withPostTitle = data.map((c) => ({
      ...c.toObject(),
      postTitle: titleById[c.postId] || null,
    }));

    res.json({ data: withPostTitle, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
}
```

Đổi dòng cuối file từ:
```js
module.exports = { list, create, remove };
```
thành:
```js
module.exports = { list, create, remove, listAll };
```

Điểm cần hiểu:
- **`postTitle: null`** khi bài viết chứa comment đó đã bị xoá (comment mồ côi) — frontend cần xử lý trường hợp này (Bước 3), không giả định `postTitle` luôn có giá trị.
- **Không dùng `$in` với vòng lặp query riêng từng comment** (tránh N+1 query) — gom hết `postId` duy nhất trước, query `Post` đúng 1 lần, rồi map lại bằng object tra cứu `titleById`.

---

## Bước 2 — Backend: route `GET /api/comments/admin`

**Sửa `backend/src/routes/commentRoutes.js`:**

Đổi:
```js
const express = require('express');
const { list, create, remove } = require('../controllers/commentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', list);
router.post('/', protect, create);
router.delete('/:id', protect, remove);

module.exports = router;
```
thành:
```js
const express = require('express');
const { list, create, remove, listAll } = require('../controllers/commentController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/admin', protect, adminOnly, listAll);
router.get('/', list);
router.post('/', protect, create);
router.delete('/:id', protect, remove);

module.exports = router;
```

**Lưu ý thứ tự route:** `/admin` đặt **trước** `/` — thật ra ở đây không bắt buộc vì `/` không có tham số động kiểu `/:id` để nuốt nhầm `/admin` (khác tình huống gotcha `/me` vs `/:id` đã gặp ở Delete Account), nhưng đặt trước vẫn là thói quen tốt, dễ đọc.

**Kiểm tra (curl/Postman):**
- `GET /api/comments/admin` không token → `401`.
- `GET /api/comments/admin` với token user thường (không phải admin) → `403`.
- `GET /api/comments/admin` với token admin → trả `{data:[...], total, page:1, pages}`, mỗi phần tử có `postTitle` (hoặc `null` nếu bài đã xoá), `author` đã populate `{name, avatarUrl}`.
- `GET /api/comments?postId=xxx` (endpoint cũ) vẫn hoạt động y hệt trước — không bị ảnh hưởng.

---

## Bước 3 — Frontend: `api/comments.js` thêm `fetchAllComments`

**Sửa `frontend-rebuild/src/api/comments.js`** — thêm hàm mới, giữ nguyên 3 hàm có sẵn:

```js
export function fetchAllComments(page, limit, token) {
    return apiRequest(`/comments/admin?page=${page}&limit=${limit}`, { token });
}
```

---

## Bước 4 — Frontend: `CommentsPanel.jsx`

**Tạo file mới `frontend-rebuild/src/components/admin/CommentsPanel.jsx`** — bám sát cấu trúc `LogsPanel.jsx` có sẵn:

```jsx
import { fetchAllComments, deleteComment } from '../../api/comments'
import { useEffect, useState } from 'react'

function CommentsPanel({ token }) {
    const [comments, setComments] = useState([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        fetchAllComments(page, 20, token)
            .then((res) => {
                setComments(res.data);
                setPages(res.pages);
                setTotal(res.total);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }, [page, token])

    const handleDelete = async (id) => {
        setError('');
        try {
            await deleteComment(id, token);
            setComments((prev) => prev.filter((c) => c._id !== id));
            setTotal((t) => t - 1);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div>
            <div className="mb-5 flex items-center justify-between">
                <h1 className="font-head text-2xl font-black text-fwm-text">Bình luận</h1>
                <span className="text-sm text-fwm-muted">{total}</span>
            </div>
            {error && <p className="mb-4 text-sm text-fwm-pink">{error}</p>}

            {loading ? <p className="text-fwm-muted">...</p> :
                comments.length === 0 ? (<p className="text-fwm-muted">Chưa có bình luận nào.</p>) : (
                    <div>
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-fwm-line text-left">
                                    <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Nội dung</th>
                                    <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Tác giả</th>
                                    <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Bài viết</th>
                                    <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Thời gian</th>
                                    <th className="pb-2 text-right font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comments.map((c) => (
                                    <tr key={c._id} className="border-b border-fwm-line last:border-0">
                                        <td className="max-w-xs py-3 pr-4 text-sm text-fwm-text">
                                            <span className="line-clamp-2" title={c.text}>{c.text}</span>
                                        </td>
                                        <td className="py-3 pr-4 text-sm text-fwm-muted">{c.author?.name || '(đã xoá)'}</td>
                                        <td className="py-3 pr-4 text-sm">
                                            {c.postTitle ? (
                                                <a href={`/bai-viet/${c.postId}`} target="_blank" rel="noopener noreferrer" className="text-fwm-accent hover:underline">
                                                    {c.postTitle}
                                                </a>
                                            ) : (
                                                <span className="text-fwm-muted">(bài viết đã xoá)</span>
                                            )}
                                        </td>
                                        <td className="py-3 pr-4 text-sm text-fwm-muted">
                                            {new Date(c.createdAt).toLocaleString()}
                                        </td>
                                        <td className="py-3 text-right">
                                            <button type="button" onClick={() => handleDelete(c._id)} className="font-head text-xs font-bold text-fwm-pink hover:underline">
                                                Xoá
                                            </button>
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
                            >Trước</button>
                            <span className="text-xs text-fwm-muted">Trang {page}/{pages}</span>
                            <button
                                type="button"
                                disabled={page >= pages}
                                onClick={() => setPage((p) => p + 1)}
                                className="rounded-fwm-pill border border-fwm-line px-4 py-2 text-xs font-bold text-fwm-text disabled:cursor-not-allowed disabled:opacity-40"
                            >Sau</button>
                        </div>
                    </div>
                )
            }
        </div>
    )
}

export default CommentsPanel;
```

Điểm dễ nhầm nếu tự gõ lại:
- **`c.author?.name || '(đã xoá)'`** — dùng optional chaining vì `author` có thể `null` nếu tài khoản tác giả đã bị admin xoá (`UsersPanel` cho phép xoá user) nhưng comment vẫn còn — không giả định `author` luôn tồn tại.
- **Dùng thẻ `<a>` thường (không phải `<Link>` react-router)** cho link bài viết, kèm `target="_blank" rel="noopener noreferrer"` — mở tab mới để admin không mất vị trí đang phân trang trong danh sách comment; `<Link>` điều hướng cùng tab sẽ làm mất context này.
- **`handleDelete` cập nhật `comments`/`total` cục bộ bằng `filter`/giảm 1**, không gọi lại API load trang — nếu xoá hết comment cuối cùng của trang hiện tại (trang không phải trang 1) sẽ để lại danh sách rỗng cho tới khi đổi trang; chấp nhận được vì đây chỉ là hành vi hiển thị tạm thời, không phải lỗi dữ liệu (refresh trang F5 sẽ đồng bộ lại đúng).

---

## Bước 5 — Frontend: gắn tab "Bình luận" vào `Admin.jsx`

**Sửa `frontend-rebuild/src/pages/Admin.jsx`** — thêm import:
```js
import CommentsPanel from '../components/admin/CommentsPanel'
```

Thêm vào nhóm "Nội dung" trong `NAV_GROUPS` — đổi:
```js
    {
        heading: 'Nội dung', items: [
            { key: 'posts', label: 'Bài viết', icon: 'fa-solid fa-file-lines' },
            { key: 'categories', label: 'Danh mục', icon: 'fa-solid fa-folder-open' },
        ]
    },
```
thành:
```js
    {
        heading: 'Nội dung', items: [
            { key: 'posts', label: 'Bài viết', icon: 'fa-solid fa-file-lines' },
            { key: 'categories', label: 'Danh mục', icon: 'fa-solid fa-folder-open' },
            { key: 'comments', label: 'Bình luận', icon: 'fa-solid fa-comments' },
        ]
    },
```

Thêm vào `PANELS` — đổi:
```js
const PANELS = {
    users: UsersPanel,
    logs: LogsPanel,
    analytics: AnalyticsPanel,
    categories: CategoryPanel,
    settings: SettingsPanel,
};
```
thành:
```js
const PANELS = {
    users: UsersPanel,
    logs: LogsPanel,
    analytics: AnalyticsPanel,
    categories: CategoryPanel,
    settings: SettingsPanel,
    comments: CommentsPanel,
};
```

**Kiểm tra:**
- Vào `/admin?tab=comments` (hoặc bấm tab "Bình luận" mới) → hiện đúng bảng, phân trang 20 dòng/trang, mới nhất trước.
- Bấm link tên bài viết → mở đúng bài viết đó ở tab mới.
- Bấm "Xoá" trên 1 comment gốc **có** reply → biến mất khỏi danh sách Admin (vì đã `isDeleted:true`, bị lọc khỏi `listAll`), nhưng vào trang bài viết đó vẫn thấy dòng "Bình luận đã bị xoá" giữ chỗ cho thread reply (đúng hành vi soft-delete cũ, không đổi).
- Bấm "Xoá" trên 1 reply hoặc comment gốc không có reply → biến mất hoàn toàn cả 2 nơi (hard-delete).
- Tài khoản không phải admin gọi thẳng `GET /api/comments/admin` → `403`.

---

## Còn cần bạn chốt

Không có — phạm vi (danh sách đơn giản, không thêm cơ chế report) và cách hiển thị (phẳng theo thời gian, kèm link bài viết) đã chốt qua `AskUserQuestion` trước khi viết tài liệu này.
