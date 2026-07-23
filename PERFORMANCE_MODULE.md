# Module 4: Tối ưu Hiệu năng (Performance)

Không build tính năng mới — tối ưu những gì đã có.
Học cách đo, phát hiện và fix vấn đề hiệu năng trong React.

---

## Tổng quan

Module này khác các module trước: không có "tính năng" mới cho user.
Mục tiêu: app chạy mượt hơn khi dữ liệu lớn, ít re-render thừa.

**Sau module này bạn có thể:**
- Dùng React DevTools Profiler để tìm component re-render thừa
- Xử lý danh sách 1000+ item mà không lag
- Giải thích khi nào nên/không nên dùng `memo`, `useMemo`, `useCallback`

---

## Bước 1 — React DevTools Profiler: đọc flame graph

**Học được:** Profiler cho thấy component nào render, mất bao lâu, render vì lý do gì.

**Làm:**
- Cài React DevTools (Chrome extension nếu chưa có)
- Mở DevTools → tab "Profiler" → nhấn Record → tương tác với app → Stop
- Đọc flame graph: chiều rộng = thời gian render; màu = mức độ chậm

**Bài tập:** Vào trang Home → Record → click thay đổi theme → Stop.
Xem component nào re-render. Tại sao toàn bộ app re-render khi đổi theme?

**Điểm cần hiểu:** Context value đổi → tất cả component đang consume context đó đều re-render.
→ Đây là lý do cần tách context nhỏ (ThemeContext riêng, AuthContext riêng, không gom vào 1 AppContext).

---

## Bước 2 — Memoization đúng chỗ

**Học được:** `memo`, `useMemo`, `useCallback` không phải luôn luôn tốt — chúng có chi phí riêng.

**Nguyên tắc:**

```
memo:         Dùng khi component render tốn kém VÀ props ổn định
useMemo:      Dùng khi tính toán tốn kém (lọc/sort mảng lớn)
useCallback:  Dùng khi hàm là dependency của useEffect hoặc prop của memo component

ĐỪNG dùng khi:
- Component render rất nhanh (< 1ms)
- Props thay đổi mỗi render anyway
- Chỉ để "cho an toàn"
```

**Bài tập thực tế:**
- Mở Profiler → nhấn vào nút yêu thích trên ArticleCard
- Xem những component nào re-render không cần thiết
- Áp dụng `memo` đúng chỗ → Profile lại → so sánh

---

## Bước 3 — Virtualized List: render 1000+ article

**Học được:** Thay vì render 1000 DOM node, chỉ render ~20 node đang hiển thị trong viewport. DOM node phía ngoài viewport được tái sử dụng.

**Cài đặt:**
```
npm install react-window
```

**Trước (render tất cả):**
```jsx
{posts.map(post => <ArticleCard key={post.id} article={post} />)}
// → 1000 DOM node → scroll lag
```

**Sau (chỉ render những gì nhìn thấy):**
```jsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}      // chiều cao container
  itemCount={posts.length}
  itemSize={200}    // chiều cao mỗi item
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>   {/* style này bắt buộc — react-window tính vị trí */}
      <ArticleCard article={posts[index]} />
    </div>
  )}
</FixedSizeList>
// → chỉ ~5 DOM node thật tại 1 thời điểm
```

**Khi nào cần:** Danh sách > 100 item có animation/phức tạp, hoặc > 500 item đơn giản.
Project FootballWithMe hiện tại ít bài nên không thực sự cần — nhưng biết cách dùng là quan trọng.

**Bài tập:** Tạo 200 bài viết giả bằng script → thấy lag → áp dụng `FixedSizeList` → smooth.

---

## Bước 4 — Code Splitting nâng cao

**Học được:** Ngoài `React.lazy` (bước 1 module 3), còn có thể split theo điều kiện.

**Lazy load component (không phải trang):**
```jsx
// Chỉ load Editor khi user click "Sửa"
const RichTextEditor = lazy(() => import('./RichTextEditor'));

function PostForm() {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <button onClick={() => setEditing(true)}>Sửa</button>
      {editing && (
        <Suspense fallback={<p>Đang tải editor...</p>}>
          <RichTextEditor />
        </Suspense>
      )}
    </>
  );
}
```

**Prefetch — load trước khi cần:**
```jsx
// Khi user hover vào link Admin → prefetch code của trang Admin
const AdminModule = import('./pages/Admin');  // bắt đầu download ngay

<Link
  to="/admin"
  onMouseEnter={() => AdminModule}  // trigger prefetch
>
  Admin
</Link>
```

---

## Bước 5 — Concurrent Features: hiểu sâu hơn

**Học được:** Hiểu cơ chế Concurrent Mode — React có thể dừng, tiếp tục, hay bỏ render.

**useTransition vs useDeferredValue — khi nào dùng cái nào:**

```
useTransition — bạn KIỂM SOÁT được state update:
  const [isPending, startTransition] = useTransition();
  startTransition(() => setFilter(value));
  // Dùng khi: bạn viết setter trong code của mình

useDeferredValue — bạn KHÔNG kiểm soát được:
  const deferred = useDeferredValue(propFromParent);
  // Dùng khi: giá trị đến từ props/context bạn không thể thay đổi
```

**Bài tập:** Trong Search.jsx hiện đang dùng `useDeferredValue`. Thử đổi sang `useTransition`.
Cả hai đều hoạt động — nhưng cái nào phù hợp hơn với cấu trúc hiện tại?

---

## Bước 6 (Bonus) — Web Worker: tính toán nặng ngoài main thread

**Học được:** JavaScript chạy trên 1 thread. Tính toán nặng (sort 10000 item, parse JSON lớn) block UI.
Web Worker cho phép chạy JS trên thread riêng — UI không bị đứng.

**Pattern với hook:**
```js
// hooks/useWorker.js
export function useWorker(workerFile) {
  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL(workerFile, import.meta.url));
    return () => workerRef.current.terminate();
  }, [workerFile]);

  const postMessage = useCallback((data) => {
    return new Promise(resolve => {
      workerRef.current.onmessage = (e) => resolve(e.data);
      workerRef.current.postMessage(data);
    });
  }, []);

  return postMessage;
}
```

**Lưu ý:** Web Worker không truy cập được DOM hay React state — chỉ nhận/trả dữ liệu thuần.
Phù hợp cho: sort/filter mảng lớn, parse CSV, mã hóa dữ liệu.

---

## Checklist sau module này

- [ ] Đọc được flame graph trong Profiler
- [ ] Giải thích được tại sao `memo` không luôn luôn tốt
- [ ] Implement được virtualized list
- [ ] Phân biệt được `useTransition` vs `useDeferredValue`
- [ ] Biết cách lazy load component (không chỉ trang)
