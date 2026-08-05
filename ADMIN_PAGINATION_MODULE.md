# Module: Phân trang bảng bài viết trong Admin

> **✅ Trạng thái: đã hoàn thành và verify (2026-08-06).**

Module fullstack tiếp theo sau nhóm Auth/Profile (Upload, Google Auth, Forgot/Change Password, Email Verification, Delete Account — tất cả ✅). Chỉ đụng tới `Admin.jsx`, không đụng `PostsContext.jsx` hay bất kỳ trang công khai nào (`Home`, `Category`, `Search`, `Favorites`, `ArticleDetail`, `About`) — 6 trang đó vẫn dùng nguyên `posts` đầy đủ từ context như hiện tại, không thay đổi gì.

---

## Quyết định đã chốt

Chốt qua `AskUserQuestion`, 2 câu:

1. **Phạm vi:** chỉ làm bảng Admin (`Admin.jsx`) trước, không đụng `PostsContext` dùng chung ở 6 trang công khai. Lý do: `Admin.jsx` đã có state/fetch bài viết riêng (`fetchPosts()` trong `useEffect`, tách biệt hoàn toàn khỏi `usePosts()` — biến `refetchPublicPosts` chỉ để đồng bộ lại context sau khi thêm/sửa/xoá, không đọc `posts` từ đó) nên làm phân trang ở đây không rủi ro đập vỡ các trang khác.
2. **Tầng làm:** **frontend-only** — cắt trang (`slice`) trên mảng đã fetch hết + đã search/filter/sort, không sửa backend. Lý do: `Admin.jsx` vốn đã fetch toàn bộ bài viết 1 lần rồi tự search/filter/sort ở client (`postSearch`, `postCategoryFilter`, `postSort` trong `useMemo` tên `visiblePosts`) — thêm `slice()` trên kết quả `visiblePosts` là đủ, không cần viết lại search/filter/sort thành query param gửi lên server.

**Không cần hỏi thêm gì khác** — không có quyết định bảo mật/kiến trúc nào khác phát sinh (không có API mới, không có field DB mới).

---

## Kiến trúc chung

```
Admin.jsx
  posts (state, fetch 1 lần toàn bộ — không đổi)
      │
      ▼
  visiblePosts = filter(postSearch, postCategoryFilter) + sort(postSort)   ← đã có sẵn, không đổi
      │
      ▼  (MỚI)
  postPage (state, mặc định 1)
  totalPages = ceil(visiblePosts.length / POSTS_PER_PAGE)
  pagedPosts = visiblePosts.slice((postPage-1)*POSTS_PER_PAGE, postPage*POSTS_PER_PAGE)
      │
      ▼
  <table> render pagedPosts thay vì visiblePosts
  <PaginationBar postPage totalPages onPrev onNext />
```

2 chỗ cần tự canh, không phải chuyện "code sai cú pháp" mà là logic dễ quên:
- Đổi `postSearch`/`postCategoryFilter`/`postSort` mà không reset `postPage` về 1 → nếu đang ở trang 3, gõ tìm kiếm ra kết quả chỉ còn 1 trang, `pagedPosts` sẽ rỗng (`slice` ra ngoài mảng) dù rõ ràng có kết quả — trông giống bug "tìm không ra" nhưng thực ra là quên reset trang.
- Xoá bài viết cuối cùng của trang cuối (vd. trang 3 chỉ có 1 bài, xoá nó) → `totalPages` giảm xuống 2 nhưng `postPage` vẫn là 3 → `pagedPosts` rỗng, phải tự lùi `postPage` về `totalPages` mới.

---

## Bước 1 — Thêm state, hằng số và tính `pagedPosts`

**Làm, trong `frontend-rebuild/src/pages/Admin.jsx`:**

1. Thêm hằng số ở đầu file (ngoài component, cạnh `toFormValues`):
```js
const POSTS_PER_PAGE = 10;
```

2. Thêm state mới, đặt cạnh `postSort`:
```js
const [postPage, setPostPage] = useState(1);
```

3. Reset `postPage` về 1 mỗi khi filter/search/sort đổi — thêm `useEffect` mới (cần `useEffect` đã import sẵn ở dòng 1):
```js
useEffect(() => {
    setPostPage(1);
}, [postSearch, postCategoryFilter, postSort]);
```

4. Sửa `useMemo` `visiblePosts` hiện có — **không đổi logic filter/sort bên trong**, chỉ thêm 1 `useMemo` mới ngay sau nó để cắt trang:
```js
const totalPages = Math.max(1, Math.ceil(visiblePosts.length / POSTS_PER_PAGE));

const pagedPosts = useMemo(
    () => visiblePosts.slice((postPage - 1) * POSTS_PER_PAGE, postPage * POSTS_PER_PAGE),
    [visiblePosts, postPage]
);
```
`totalPages` không cần `useMemo` (phép tính rẻ), nhưng `pagedPosts` nên có vì tạo mảng mới mỗi lần.

5. Kẹp `postPage` không vượt quá `totalPages` (xử lý case xoá bài cuối trang cuối) — thêm `useEffect` thứ 2, đặt sau `useEffect` ở bước 3:
```js
useEffect(() => {
    if (postPage > totalPages) setPostPage(totalPages);
}, [postPage, totalPages]);
```

**Kiểm tra (chưa cần UI, test bằng React DevTools hoặc console.log tạm):**
- `pagedPosts.length` không bao giờ vượt quá `POSTS_PER_PAGE` (10).
- Gõ vào ô tìm kiếm ra ít kết quả hơn → `postPage` tự về 1 (xem trong React DevTools).

---

## Bước 2 — UI thanh phân trang + đổi bảng render `pagedPosts`

**Làm, trong `frontend-rebuild/src/pages/Admin.jsx`:**

1. Đổi dòng render `<tbody>` từ `visiblePosts.map(...)` sang `pagedPosts.map(...)`:
```jsx
<tbody>
    {
        pagedPosts.map((p) => (
            <AdminTableRow key={p.id} post={p} onEdit={handleEdit} onDelete={handleDelete}></AdminTableRow>
        ))
    }
</tbody>
```
Lưu ý: `visiblePosts.length === 0` ở điều kiện hiển thị "Không tìm thấy kết quả phù hợp" phía trên **giữ nguyên `visiblePosts`, không đổi thành `pagedPosts`** — 2 khái niệm khác nhau (không có kết quả nào vs có kết quả nhưng đang xem trang khác).

2. Thêm thanh phân trang, đặt ngay sau khối `<div className="overflow-x-auto ...">...</div>` (bảng), trước dấu đóng `)}` của điều kiện `visiblePosts.length === 0 ? ... : (...)`:
```jsx
{totalPages > 1 && (
    <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-fwm-muted">
            Trang {postPage}/{totalPages} — {visiblePosts.length} bài viết
        </p>
        <div className="flex gap-2">
            <Button
                type="button"
                variant="ghost"
                disabled={postPage <= 1}
                onClick={() => setPostPage((p) => p - 1)}
            >
                Trước
            </Button>
            <Button
                type="button"
                variant="ghost"
                disabled={postPage >= totalPages}
                onClick={() => setPostPage((p) => p + 1)}
            >
                Sau
            </Button>
        </div>
    </div>
)}
```

**Kiểm tra:**
- Có nhiều hơn 10 bài viết → bảng chỉ hiện 10 dòng, thanh phân trang xuất hiện đúng số trang.
- Bấm "Sau" tới trang cuối → nút "Sau" tự disable, không bấm tiếp được. Bấm "Trước" về trang 1 → nút "Trước" disable.
- Gõ tìm kiếm ra kết quả ≤ 10 bài → thanh phân trang tự ẩn (`totalPages > 1` false), không còn dòng "Trang 1/1" thừa.
- Đang ở trang 2, đổi bộ lọc chuyên mục → tự nhảy về trang 1 (không bị kẹt ở trang cũ với danh sách mới).
- Đang ở trang cuối (vd. trang 2/2, còn đúng 1 bài) → xoá nốt bài đó → tự lùi về trang 1, không hiện bảng trống dù rõ ràng còn bài viết ở trang 1.
- Thêm bài viết mới (nút "Thêm bài viết") → bài mới được thêm vào đầu mảng `posts` (`setPosts((prev) => [created, ...prev])` — code cũ, không đổi) → nếu đang ở trang 2 trở đi, có thể không thấy ngay bài mới (nó đẩy các bài khác xuống, nằm ở trang 1) — đây là hành vi đúng theo thiết kế, không phải bug, không cần tự nhảy về trang 1 khi tạo mới (khác với khi search/filter/sort đổi).

---

## Còn cần bạn chốt

Không có — cả 2 quyết định (phạm vi, tầng làm) đã chốt qua `AskUserQuestion` trước khi viết tài liệu này.
