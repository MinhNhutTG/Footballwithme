# Module 8: Hệ thống bình luận (Comments)

Xây dựng phần bình luận dưới mỗi bài viết trong `frontend-rebuild` — mỗi bước thêm đúng 1 khái niệm React mới.
Đây là bản rebuild của module Comments cũ (`COMMENTS_MODULE.md`, làm trên `frontend/`) — cùng tính năng và cùng thứ tự concept, viết lại từ đầu để khớp với cấu trúc `frontend-rebuild` hiện tại.

Nên làm **sau khi xong Module 7 (Profile)** — Comments dùng lại `useAuth()` và quen thuộc với reducer/controlled input rồi mới học thêm Context tự tạo, Portal, forwardRef.

---

## Tổng quan những gì sẽ xây dựng

```
ArticleDetail — phần cuối trang:
┌────────────────────────────────────────┐
│  ── Bình luận (3) ───────────────────  │
│                                        │
│  [NV]  Nguyễn Văn A                    │
│        "Bài viết rất hữu ích!"         │
│        2 giờ trước             [Xóa]   │
│                                        │
│  ── Thêm bình luận ────────────────    │
│  [Viết bình luận của bạn...         ]  │
│                                [Gửi]   │
└────────────────────────────────────────┘
```

Nút **Xóa** chỉ hiện nếu comment là của mình hoặc mình là admin.
Chưa đăng nhập → thấy link "Đăng nhập để bình luận" thay vì form.
Comment mới xuất hiện ngay khi gửi, không cần đợi server (optimistic update).

---

## Backend đã có sẵn

| Method | URL | Auth | Body | Trả về |
|--------|-----|------|------|--------|
| GET | `/api/comments?postId=xxx` | Không cần | — | `[{ _id, postId, text, author: { _id, name }, createdAt }]` |
| POST | `/api/comments` | Cần token | `{ postId, text }` | object comment vừa tạo |
| DELETE | `/api/comments/:id` | Cần token | — | `{ success: true }` |

Quy tắc DELETE: chỉ xóa được nếu là tác giả hoặc admin (backend tự kiểm tra qua `req.user`, không cần frontend giả định).

`article.id` trong `frontend-rebuild` đã là `post._id` từ MongoDB (xem `normalize()` trong `api/posts.js`) — dùng thẳng làm `postId`, không cần convert gì thêm.

---

## Tổng quan file sẽ tạo/sửa

```
1. api/comments.js                          — getComments/addComment/deleteComment
2. hooks/useComments.js                     — custom hook, quản lý state + optimistic update
3. context/CommentContext.jsx               — chia sẻ state cho cây component con
4. components/comment/CommentItem.jsx        — 1 dòng comment
5. components/comment/CommentInput.jsx       — form nhập, forwardRef
6. components/comment/ConfirmModal.jsx       — modal xác nhận xóa, dùng Portal
7. components/comment/CommentSection.jsx     — ráp tất cả lại
8. components/common/ErrorBoundary.jsx       — class component, bắt lỗi render
9. pages/ArticleDetail.jsx                  — gắn <CommentSection> vào cuối trang
10. i18n/dict.js                             — thêm section `comment` (vi + en)
```

---

## Bước 1 — Component tĩnh

**Học được:** Tạo component mới, tách UI thành nhiều phần nhỏ, gắn vào trang có sẵn.

**Làm:**
- `components/comment/CommentItem.jsx` — render 1 comment: avatar (dùng lại `components/ui/Avatar` với `initials` lấy từ tên tác giả), tên tác giả, nội dung, thời gian tương đối, nút Xóa
- `components/comment/CommentSection.jsx` — tiêu đề "Bình luận", danh sách 2-3 comment hardcode dùng `<CommentItem>`, và 1 `<textarea>` + nút Gửi (chưa có logic)
- `pages/ArticleDetail.jsx` — import và thêm `<CommentSection postId={article.id} />` ngay trước thẻ đóng cuối cùng (`</>`)

**Gợi ý tính thời gian tương đối:**
```js
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}
```

**Style gợi ý** (đúng token đang dùng trong dự án): card `rounded-fwm-lg border border-fwm-line bg-fwm-card`, nút Xóa `text-fwm-pink`, nút Gửi `bg-fwm-accent text-fwm-ink rounded-fwm-pill`.

**Kiểm tra:** Vào bất kỳ bài viết nào → thấy phần bình luận tĩnh ở cuối trang, không lỗi console.

---

## Bước 2 — Custom Hook: `useComments`

**Học được:** Custom Hook — hàm bắt đầu bằng `use`, bên trong dùng được hook khác — dùng để tách logic ra khỏi component để component chỉ lo render.

**Làm:**

**2a — `api/comments.js`** (theo đúng pattern các file `api/*.js` khác, dùng `apiRequest`):
```js
import { apiRequest } from './client';

export function getComments(postId) {
  return apiRequest(`/comments?postId=${postId}`);
}

export function addComment(postId, text, token) {
  return apiRequest('/comments', { method: 'POST', body: { postId, text }, token });
}

export function deleteComment(id, token) {
  return apiRequest(`/comments/${id}`, { method: 'DELETE', token });
}
```

**2b — `hooks/useComments.js`:**
```js
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getComments, addComment as addCommentAPI, deleteComment as deleteCommentAPI } from '../api/comments';

export function useComments(postId) {
  const { user, token } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getComments(postId)
      .then(setComments)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [postId]);

  async function addComment(text) {
    const comment = await addCommentAPI(postId, text, token);
    setComments((prev) => [...prev, comment]);
  }

  async function removeComment(id) {
    await deleteCommentAPI(id, token);
    setComments((prev) => prev.filter((c) => c._id !== id));
  }

  return { comments, loading, error, addComment, removeComment, user };
}
```

**2c — `CommentSection.jsx`:**
- Xóa data hardcode, thay bằng `const { comments, loading, error, addComment, removeComment, user } = useComments(postId)`
- Hiển thị trạng thái loading / error
- Nút Xóa trong `CommentItem` chỉ hiện nếu `user && (user._id === comment.author._id || user.role === 'admin')`
- Nếu chưa đăng nhập (`!user`): hiện link "Đăng nhập để bình luận" (`<Link to="/dang-nhap">`) thay vì form

**Input/output cần đạt:**
```
postId = "abc123"
→ hook tự gọi GET /api/comments?postId=abc123 khi mount
→ comments hiển thị đúng
→ gửi comment → xuất hiện trong danh sách
→ xóa comment → biến khỏi danh sách
```

**Kiểm tra:** F12 → Network → vào trang bài viết thấy `GET /api/comments?postId=...`. Gửi comment → thấy `POST /api/comments`.

---

## Bước 3 — Optimistic Update

**Học được:** Cập nhật UI *ngay lập tức* trước khi API trả về — người dùng thấy kết quả tức thì; rollback nếu lỗi.

**Vấn đề hiện tại:** Nhấn Gửi → phải đợi API → mới thấy comment xuất hiện. Nếu mạng chậm, cảm giác app bị đứng.

**Làm** — cập nhật `addComment` trong `hooks/useComments.js`:
```js
async function addComment(text) {
  const tempId = `temp-${Date.now()}`;
  const temp = {
    _id: tempId,
    text,
    author: { _id: user._id, name: user.name },
    createdAt: new Date().toISOString(),
    isTemp: true,
  };
  setComments((prev) => [...prev, temp]);

  try {
    const real = await addCommentAPI(postId, text, token);
    setComments((prev) => prev.map((c) => (c._id === tempId ? real : c)));
  } catch (err) {
    setComments((prev) => prev.filter((c) => c._id !== tempId));
    setError(err.message);
  }
}
```

**Input/output cần đạt:**
```
Nhấn Gửi → comment xuất hiện ngay (chưa cần đợi server)
→ API thành công: comment đổi sang dữ liệu thật từ server
→ API thất bại: comment biến mất, hiện thông báo lỗi
```

**Kiểm tra:** DevTools → Network → Offline → gửi comment → comment xuất hiện rồi biến mất sau vài giây kèm thông báo lỗi.

---

## Bước 4 — Context tự tạo: `CommentContext`

**Học được:** Tạo Context từ đầu (`createContext` + `Provider` + custom hook đọc context) — khác Module 7 (Profile) chỉ *dùng* context có sẵn (`AuthContext`).

**Vấn đề:** `removeComment` và `user` đang phải truyền từ `CommentSection` xuống `CommentItem` qua props. Nếu sau này thêm 1 lớp component ở giữa (vd. `CommentList`), phải truyền qua thêm 1 tầng nữa — prop drilling.

**Làm:**

`context/CommentContext.jsx`:
```jsx
import { createContext, useContext } from 'react';
import { useComments } from '../hooks/useComments';

const CommentContext = createContext(null);

export function CommentProvider({ postId, children }) {
  const value = useComments(postId);
  return <CommentContext.Provider value={value}>{children}</CommentContext.Provider>;
}

export function useCommentContext() {
  return useContext(CommentContext);
}
```

- `CommentSection.jsx`: xóa `useComments(postId)` trực tiếp; wrap toàn bộ JSX trong `<CommentProvider postId={postId}>`; bên trong dùng `useCommentContext()`
- `CommentItem.jsx`: xóa prop `onDelete`; lấy `removeComment` và `user` từ `useCommentContext()`

**Input/output cần đạt:**
```
Trước: <CommentSection> → truyền removeComment qua props → <CommentItem>
Sau:   <CommentItem> tự lấy removeComment từ context, không cần props
```

**Kiểm tra:** React DevTools → Components → thấy `CommentProvider` bao ngoài phần còn lại của `CommentSection`. Chức năng xóa vẫn hoạt động như cũ.

---

## Bước 5 — useLayoutEffect: scroll đến comment mới

**Học được:** `useLayoutEffect` chạy *trước khi* browser vẽ lên màn hình — dùng khi thay đổi DOM (vd. vị trí scroll) mà không muốn người dùng thấy trạng thái trung gian.

**Khác với `useEffect`:**
```
useEffect:       render → browser paint → effect chạy   (có thể thấy flash 1 frame)
useLayoutEffect: render → effect chạy  → browser paint  (không thấy flash)
```

**Làm** trong `CommentSection.jsx`:
```jsx
import { useLayoutEffect, useRef } from 'react';

const listRef = useRef(null);

useLayoutEffect(() => {
  const el = listRef.current;
  if (el) el.scrollTop = el.scrollHeight;
}, [comments.length]);
```
- Gắn `ref={listRef}` vào `<div>` bao danh sách comment
- Thêm class `max-h-96 overflow-y-auto` vào div đó để có thanh scroll

**Kiểm tra:** Có 5+ comment, gửi thêm 1 comment → danh sách tự cuộn xuống ngay, không giật.

---

## Bước 6 — Portal: modal xác nhận xóa

**Học được:** `createPortal` render component vào DOM node nằm *ngoài* cây component hiện tại — thường dùng để modal không bị crop bởi `overflow-hidden` của component cha (`CommentSection` đang có `max-h-96 overflow-y-auto` từ Bước 5, đúng tình huống cần Portal).

**Làm:**

`components/comment/ConfirmModal.jsx`:
```jsx
import { createPortal } from 'react-dom';

function ConfirmModal({ message, onConfirm, onCancel }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-80 rounded-fwm-lg bg-fwm-card p-6 shadow-fwm">
        <p className="text-sm text-fwm-text">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-fwm-pill px-4 py-2 font-head text-sm font-bold text-fwm-muted hover:text-fwm-text">
            Hủy
          </button>
          <button onClick={onConfirm} className="rounded-fwm-pill bg-fwm-pink px-4 py-2 font-head text-sm font-bold text-white hover:brightness-95">
            Xóa
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ConfirmModal;
```

- `CommentItem.jsx`: thêm state `showModal`; nhấn "Xóa" → `setShowModal(true)` → render `<ConfirmModal>`; chỉ gọi `removeComment` thật khi xác nhận trong modal

**Kiểm tra:** DevTools → Elements → khi modal mở, nó nằm trực tiếp trong `<body>`, KHÔNG nằm trong `#root` / không nằm trong div `overflow-y-auto` của danh sách.

---

## Bước 7 — forwardRef: `CommentInput` tự focus

**Học được:** `forwardRef` cho phép component cha nhận ref DOM từ bên trong component con — để gọi `.focus()` (hoặc method DOM khác) lên element nằm sâu bên trong con.

**Vấn đề:** `<textarea>` nằm trong component con `CommentInput`. Component cha (`CommentSection`) muốn focus vào nó khi trang load, nhưng không ref trực tiếp được vào element bên trong con nếu không có `forwardRef`.

**Làm:**

`components/comment/CommentInput.jsx`:
```jsx
import { forwardRef, useState } from 'react';

const CommentInput = forwardRef(function CommentInput({ onSubmit, submitting }, ref) {
  const [text, setText] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    await onSubmit(text.trim());
    setText('');
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
      <textarea
        ref={ref}
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Viết bình luận của bạn..."
        className="flex-1 resize-none rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-sm text-fwm-text placeholder:text-fwm-muted focus:border-fwm-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={!text.trim() || submitting}
        className="self-end rounded-fwm-pill bg-fwm-accent px-5 py-3 font-head text-sm font-bold text-fwm-ink shadow-fwm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? 'Đang gửi...' : 'Gửi'}
      </button>
    </form>
  );
});

export default CommentInput;
```

- `CommentSection.jsx`: thay form cũ bằng `<CommentInput ref={inputRef} onSubmit={addComment} />`; thêm `const inputRef = useRef(null)`; thêm `useEffect(() => { inputRef.current?.focus(); }, [])`

**Kiểm tra:** Vào trang bài viết, cuộn xuống phần bình luận → textarea đang được focus sẵn (viền sáng lên), gõ được ngay không cần click.

---

## Bước 8 — useTransition: lọc comment mượt

**Học được:** `useTransition` đánh dấu 1 state update là *không khẩn cấp* — React ưu tiên phản hồi input trước, xử lý phần tính toán nặng sau. Tránh UI bị đơ.

**Làm** trong `CommentSection.jsx`:
```jsx
import { useTransition, useMemo, useState } from 'react';

const [filter, setFilter] = useState('');
const [isPending, startTransition] = useTransition();

function handleFilter(value) {
  startTransition(() => setFilter(value));
}

const filtered = useMemo(
  () => comments.filter((c) => c.text.toLowerCase().includes(filter.toLowerCase())),
  [comments, filter]
);
```
- Thêm 1 `<input>` lọc comment phía trên danh sách, gọi `handleFilter` ở `onChange`
- Render `filtered` thay vì `comments` trong danh sách
- Khi `isPending`: thêm class `opacity-60` vào div danh sách

**Kiểm tra:** Có 10+ comment, gõ nhanh vào ô lọc → input phản hồi ngay không giật, danh sách lọc theo sau kèm hiệu ứng mờ nhẹ.

---

## Bước 9 — Error Boundary: bắt lỗi render

**Học được:** Error Boundary là class component đặc biệt — bắt lỗi xảy ra *trong lúc render* của cây con và hiện fallback UI thay vì crash trắng cả app. React chưa có hook tương đương — đây là 1 trong số ít trường hợp bắt buộc dùng class component.

**Làm:**

`components/common/ErrorBoundary.jsx`:
```jsx
import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <p className="text-fwm-muted">Có lỗi xảy ra.</p>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
```

`pages/ArticleDetail.jsx` — wrap `<CommentSection>`:
```jsx
import ErrorBoundary from '../components/common/ErrorBoundary';

<ErrorBoundary fallback={
  <p className="mx-auto max-w-3xl px-4 py-8 text-sm text-fwm-muted">
    Không thể tải bình luận lúc này.
  </p>
}>
  <CommentSection postId={article.id} />
</ErrorBoundary>
```

**Kiểm tra:** Tạm thời thêm `throw new Error('test')` ở đầu hàm render của `CommentSection` → thấy fallback UI thay vì màn hình trắng → xóa dòng throw đi ngay sau khi kiểm tra xong.

---

## Bước 10 — i18n

**Học được:** Mở rộng hệ thống i18n dict có sẵn cho 1 feature mới.

**Làm:** Trong `i18n/dict.js`, thêm section `comment` cho cả `dict.vi` và `dict.en`:
```
Các key cần có (tự viết nội dung, đối chiếu 2 ngôn ngữ):
  heading, empty, placeholder, send, sending,
  loginToComment, deleteConfirm, deleteAction, cancel,
  filterPlaceholder, error
```
Dùng `t.comment.xxx` trong `CommentSection.jsx`/`CommentItem.jsx`/`ConfirmModal.jsx` thay text hard-code.

**Kiểm tra:** Chuyển ngôn ngữ khi đang xem 1 bài viết → toàn bộ text phần bình luận đổi theo, kể cả nội dung modal xác nhận xóa.

---

## Thứ tự file cần tạo/sửa

```
Bước 1    components/comment/CommentItem.jsx        (tạo mới)
          components/comment/CommentSection.jsx     (tạo mới, data hardcode)
          pages/ArticleDetail.jsx                   (gắn <CommentSection>)

Bước 2    api/comments.js                            (tạo mới)
          hooks/useComments.js                       (tạo mới)
          components/comment/CommentSection.jsx     (dùng useComments)

Bước 3    hooks/useComments.js                       (optimistic update trong addComment)

Bước 4    context/CommentContext.jsx                 (tạo mới)
          components/comment/CommentSection.jsx     (CommentProvider + useCommentContext)
          components/comment/CommentItem.jsx        (bỏ prop onDelete, dùng context)

Bước 5    components/comment/CommentSection.jsx     (useLayoutEffect + listRef)

Bước 6    components/comment/ConfirmModal.jsx        (tạo mới — Portal)
          components/comment/CommentItem.jsx        (thêm showModal state)

Bước 7    components/comment/CommentInput.jsx        (tạo mới — forwardRef)
          components/comment/CommentSection.jsx     (dùng CommentInput + inputRef)

Bước 8    components/comment/CommentSection.jsx     (useTransition + filter input)

Bước 9    components/common/ErrorBoundary.jsx        (tạo mới — class component)
          pages/ArticleDetail.jsx                   (wrap ErrorBoundary)

Bước 10   i18n/dict.js                                (thêm section comment)
```
