# Module: Hệ thống Bình luận (Comments)

Xây dựng phần bình luận dưới mỗi bài viết — mỗi bước thêm đúng 1 khái niệm React mới.
Backend đã có sẵn, bạn chỉ cần viết frontend.

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
│  [MB]  Minh Bảo                        │
│        "Cảm ơn tác giả nhiều"          │
│        1 ngày trước            [Xóa]   │
│                                        │
│  ── Thêm bình luận ────────────────    │
│  [Viết bình luận của bạn...         ]  │
│                                [Gửi]   │
└────────────────────────────────────────┘
```

Nút **Xóa** chỉ hiện nếu comment là của mình hoặc là admin.
Chưa đăng nhập → thấy link "Đăng nhập để bình luận".
Comment mới xuất hiện ngay khi gửi (không cần đợi server).

---

## Backend đã có sẵn

| Method | URL | Auth | Body | Trả về |
|--------|-----|------|------|--------|
| GET | `/api/comments?postId=xxx` | Không cần | — | `[{ _id, postId, text, author: { _id, name }, createdAt }]` |
| POST | `/api/comments` | Cần token | `{ postId, text }` | object comment vừa tạo |
| DELETE | `/api/comments/:id` | Cần token | — | `{ success: true }` |

Quy tắc DELETE: chỉ xóa được nếu là tác giả hoặc admin.

---

## Bước 1 — Component tĩnh

**Học được:** Tạo component mới, tách UI thgoi ành nhiều phần nhỏ, gắn vào trang có sẵn.

**Làm:**
- Tạo `components/comment/CommentItem.jsx` — render 1 comment: avatar chữ cái đầu tên, tên tác giả, nội dung text, thời gian (vd: "2 giờ trước"), nút Xóa
- Tạo `components/comment/CommentSection.jsx` — render tiêu đề "Bình luận", danh sách 2-3 comment hardcode dùng `<CommentItem>`, và form textarea + nút Gửi (chưa có logic)
- `pages/ArticleDetail.jsx` — import và thêm `<CommentSection postId={article.id} />` ở cuối trang (trước thẻ đóng `</div>` cuối cùng)

**Gợi ý tính thời gian:**
```js
const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
};
```

**Kiểm tra:** Vào bất kỳ bài viết → thấy phần bình luận tĩnh bên dưới, không lỗi console.

---

## Bước 2 — Custom Hook: `useComments`

**Học được:** Custom Hook — hàm bắt đầu bằng `use`, bên trong dùng được hook khác. Dùng để tách logic ra khỏi component.

**Tại sao cần Custom Hook?**
`CommentSection` đang vừa fetch data, vừa quản lý state, vừa render UI — quá nhiều trách nhiệm. Custom Hook giúp component chỉ lo phần render.

**Làm:**
- Tạo `api/comments.js` — 3 hàm dùng `apiRequest` từ `api/client.js`:
  - `getComments(postId)` → `GET /comments?postId=xxx`
  - `addComment(postId, text, token)` → `POST /comments`
  - `deleteComment(id, token)` → `DELETE /comments/:id`

- Tạo `hooks/useComments.js`:
```js
export function useComments(postId) {
  const { user, token } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // useEffect: gọi getComments(postId) khi mount, setLoading, setComments, setError

  // addComment(text): gọi addCommentAPI rồi append comment mới vào state
  // deleteComment(id): gọi deleteCommentAPI rồi filter khỏi state

  return { comments, loading, error, addComment, deleteComment, user };
}
```

- `CommentSection.jsx`:
  - Xóa data hardcode
  - Thêm `const { comments, loading, error, addComment, deleteComment, user } = useComments(postId)`
  - Hiển thị loading khi `loading === true`
  - Hiển thị error nếu có
  - Nút Xóa chỉ hiện nếu `user && user._id === comment.author._id`
  - Nếu chưa đăng nhập: hiện link "Đăng nhập để bình luận" thay vì form

**Input/output cần đạt:**
```
postId = "abc123"
→ hook tự gọi GET /api/comments?postId=abc123
→ comments hiển thị đúng
→ gửi comment → xuất hiện trong danh sách
→ xóa comment → biến khỏi danh sách
```

**Kiểm tra:** F12 → Network → thấy request `GET /api/comments?postId=xxx` khi vào trang bài viết. Gửi comment → thấy `POST /api/comments`.

---

## Bước 3 — Optimistic Update

**Học được:** Cập nhật UI *ngay lập tức* trước khi API trả về — người dùng thấy kết quả tức thì; rollback nếu lỗi.

**Vấn đề hiện tại:** Nhấn Gửi → đợi API → mới thấy comment xuất hiện. Nếu mạng chậm, cảm giác app bị đứng.

**Làm** — cập nhật hàm `addComment` trong `hooks/useComments.js`:
```
addComment(text):
  1. Tạo comment tạm: { _id: `temp-${Date.now()}`, text, author: { _id: user._id, name: user.name }, createdAt: new Date().toISOString(), isTemp: true }
  2. setComments(prev => [...prev, tempComment])   ← hiện ngay trên UI
  3. await addCommentAPI(postId, text, token)
  4. Thành công → thay tempComment bằng comment thật: setComments(prev => prev.map(c => c._id === tempId ? real : c))
  5. Thất bại → xóa tempComment: setComments(prev => prev.filter(c => c._id !== tempId)) + setError(...)
```

**Input/output cần đạt:**
```
Nhấn Gửi → comment xuất hiện ngay (chưa cần đợi server)
→ API thành công: comment đổi sang dữ liệu thật từ server
→ API thất bại: comment biến mất, hiện thông báo lỗi
```

**Kiểm tra:** Tắt mạng (DevTools → Network → Offline) → gửi comment → comment xuất hiện rồi biến mất sau vài giây.

---

## Bước 4 — Context tự tạo: `CommentContext`

**Học được:** Tạo Context từ đầu (`createContext` + `Provider` + custom hook) — khác với module Profile chỉ *dùng* context có sẵn.

**Vấn đề:** `deleteComment` đang đi từ `CommentSection` → xuống `CommentItem` qua props. Nếu sau này thêm lớp `CommentList` ở giữa, phải truyền qua thêm 1 lớp nữa (prop drilling).

**Làm:**
- Tạo `context/CommentContext.jsx`:
```jsx
const CommentContext = createContext(null);

export function CommentProvider({ postId, children }) {
  const hook = useComments(postId);
  return (
    <CommentContext.Provider value={hook}>
      {children}
    </CommentContext.Provider>
  );
}

export function useCommentContext() {
  return useContext(CommentContext);
}
```
- `CommentSection.jsx`:
  - Xóa dòng `const { ... } = useComments(postId)`
  - Wrap toàn bộ JSX trong `<CommentProvider postId={postId}>`
  - Dùng `const { comments, loading, ... } = useCommentContext()` thay vì nhận từ hook trực tiếp
- `CommentItem.jsx`:
  - Xóa prop `onDelete`
  - Lấy `deleteComment` và `user` từ `useCommentContext()`

**Input/output cần đạt:**
```
Trước: <CommentSection> → truyền deleteComment → <CommentItem>
Sau:   <CommentItem> tự lấy deleteComment từ context, không cần prop
```

**Kiểm tra:** Mở React DevTools → Components → thấy `CommentProvider` bao ngoài `CommentSection`. Chức năng xóa vẫn hoạt động bình thường.

---

## Bước 5 — useLayoutEffect: scroll đến comment mới

**Học được:** `useLayoutEffect` chạy *trước khi* browser vẽ lên màn hình — dùng khi cần thay đổi DOM mà không muốn người dùng thấy trạng thái trung gian.

**Khác với useEffect:**
```
useEffect:       render → browser paint → effect chạy   (có thể thấy flash)
useLayoutEffect: render → effect chạy  → browser paint  (không thấy flash)
```

**Khi nào dùng `useLayoutEffect`?** Khi effect của bạn thay đổi vị trí scroll hoặc đọc kích thước DOM — nếu dùng `useEffect`, người dùng sẽ thấy vị trí cũ 1 frame rồi mới nhảy xuống.

**Làm** trong `CommentSection.jsx`:
```jsx
import { useLayoutEffect, useRef } from 'react';

const listRef = useRef(null);

useLayoutEffect(() => {
  const el = listRef.current;
  if (el) el.scrollTop = el.scrollHeight;
}, [comments.length]);  // chạy mỗi khi số comment thay đổi
```
- Gắn `ref={listRef}` vào `<div>` bao danh sách comment
- Thêm `className="max-h-96 overflow-y-auto"` vào div đó để có scroll

**Input/output cần đạt:**
```
Gửi comment → danh sách tự cuộn xuống thấy comment mới
→ không bị giật (không thấy flash vị trí cũ)
```

**Kiểm tra:** Có 5+ comment, gửi thêm → danh sách tự scroll xuống ngay, mượt mà.

---

## Bước 6 — Portal: modal xác nhận xóa

**Học được:** `createPortal` render component vào DOM node nằm *ngoài* cây component — thường dùng để modal không bị crop bởi `overflow: hidden` của component cha.

**Tại sao cần Portal?** Nếu `CommentSection` có `overflow: hidden`, modal confirm sẽ bị cắt. Portal đưa modal ra thẳng `document.body`, thoát khỏi mọi ràng buộc CSS của component cha.

**Làm:**
- Tạo `components/comment/ConfirmModal.jsx`:
```jsx
import { createPortal } from 'react-dom';

function ConfirmModal({ message, onConfirm, onCancel }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-80 rounded-fwm-lg bg-fwm-card p-6 shadow-xl">
        <p className="text-sm text-fwm-text">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-fwm-pill px-4 py-2 text-sm font-bold text-fwm-muted hover:text-fwm-text"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="rounded-fwm-pill bg-red-500 px-4 py-2 text-sm font-bold text-white hover:brightness-95"
          >
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
- `CommentItem.jsx`: thêm state `showModal`; khi nhấn "Xóa" → `setShowModal(true)` → render `<ConfirmModal>`; khi xác nhận mới gọi `deleteComment`

**Input/output cần đạt:**
```
Nhấn Xóa → modal nổi lên giữa màn hình
Nhấn Hủy → modal đóng, comment còn nguyên
Nhấn Xóa (trong modal) → modal đóng, comment biến mất
```

**Kiểm tra:** Mở DevTools → Elements → khi modal mở, thấy nó nằm trực tiếp trong `<body>`, KHÔNG nằm trong `#root`.

---

## Bước 7 — forwardRef: CommentInput tự focus

**Học được:** `forwardRef` cho phép component cha nhận ref DOM từ component con — để gọi `.focus()` hoặc method khác trên element bên trong con.

**Vấn đề:** `textarea` input nằm trong component con. Component cha muốn focus vào nó khi trang load — nhưng không thể ref trực tiếp vào element bên trong component con.

**Làm:**
- Tạo `components/comment/CommentInput.jsx` bằng `forwardRef`:
```jsx
import { forwardRef, useState } from 'react';

const CommentInput = forwardRef(function CommentInput({ onSubmit, submitting }, ref) {
  const [text, setText] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await onSubmit(text.trim());
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex gap-3">
      <textarea
        ref={ref}              // ref được gắn vào đây
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
- `CommentSection.jsx`:
  - Xóa form cũ, thay bằng `<CommentInput ref={inputRef} onSubmit={addComment} />`
  - Thêm `const inputRef = useRef(null)`
  - Thêm `useEffect(() => { inputRef.current?.focus(); }, [])` để auto-focus khi trang load

**Input/output cần đạt:**
```
Vào trang bài viết → cursor tự động nằm trong ô bình luận
```

**Kiểm tra:** Vào trang bài viết, cuộn xuống phần bình luận → ô textarea đang được focus (viền sáng lên).

---

## Bước 8 — useTransition: filter comment mượt

**Học được:** `useTransition` đánh dấu một state update là *không khẩn cấp* — React ưu tiên render UI trước, rồi mới xử lý update đó. Tránh UI bị đơ khi tính toán nặng.

**Làm** trong `CommentSection.jsx`:
```jsx
import { useTransition, useMemo, useState } from 'react';

const [filter, setFilter] = useState('');
const [isPending, startTransition] = useTransition();

const handleFilter = (value) => {
  startTransition(() => setFilter(value));
};

const filtered = useMemo(
  () => comments.filter((c) =>
    c.text.toLowerCase().includes(filter.toLowerCase())
  ),
  [comments, filter]
);
```
- Thêm `<input>` tìm kiếm comment phía trên danh sách, gọi `handleFilter` khi `onChange`
- Render `filtered` thay vì `comments`
- Khi `isPending === true`: thêm `className="opacity-60"` vào div danh sách

**Input/output cần đạt:**
```
Gõ nhanh vào ô lọc → input cập nhật ngay, không lag
→ danh sách lọc cập nhật sau 1 chút (không chặn input)
→ trong lúc cập nhật: danh sách hơi mờ (opacity 60%)
```

**Kiểm tra:** Thêm 10+ comment, gõ nhanh vào ô lọc → input không bị giật.

---

## Bước 9 — Error Boundary: bắt lỗi render

**Học được:** `Error Boundary` là class component đặc biệt — bắt lỗi trong quá trình render và hiện fallback UI thay vì crash toàn app. React chưa có hook tương đương, đây là trường hợp hiếm hoi cần class component.

**Làm:**
- Tạo `components/common/ErrorBoundary.jsx`:
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
- `ArticleDetail.jsx`: wrap `<CommentSection>`:
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

**Kiểm tra:** Tạm thời thêm `throw new Error('test')` vào đầu hàm render của `CommentSection` → thấy fallback UI thay vì màn hình trắng → xóa dòng throw đi.

---

## Thứ tự file cần tạo/sửa

```
Bước 4    context/CommentContext.jsx              (tạo mới)
          components/comment/CommentSection.jsx   (dùng CommentProvider + useCommentContext)
          components/comment/CommentItem.jsx      (xóa prop onDelete, dùng context)

Bước 5    components/comment/CommentSection.jsx   (useLayoutEffect + listRef)

Bước 6    components/comment/ConfirmModal.jsx     (tạo mới — Portal)
          components/comment/CommentItem.jsx      (thêm showModal state)

Bước 7    components/comment/CommentInput.jsx     (tạo mới — forwardRef)
          components/comment/CommentSection.jsx   (dùng CommentInput + inputRef)

Bước 8    components/comment/CommentSection.jsx   (useTransition + filter input)

Bước 9    components/common/ErrorBoundary.jsx     (tạo mới — class component)
          pages/ArticleDetail.jsx                 (wrap ErrorBoundary)
```
