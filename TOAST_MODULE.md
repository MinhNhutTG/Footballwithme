# Module 3: Toast Thông báo + HOC

Xây hệ thống thông báo toast (popup góc màn hình) và refactor cách protect route bằng HOC.
Mỗi bước thêm đúng 1 concept mới.

---

## Tổng quan UI sẽ xây dựng

```
┌─────────────────────────────────────────────────────┐
│  [Header]                                           │
│                                                     │
│  [Nội dung trang...]               ┌────────────┐  │
│                                    │ ✓ Đã lưu   │  ← Toast xuất hiện
│                                    │   hồ sơ    │     góc phải dưới
│                                    └────────────┘  │
│  [Footer]                                           │
└─────────────────────────────────────────────────────┘
```

Toast đóng tự động sau 3 giây, hoặc nhấn × để đóng.
Có thể xếp chồng nhiều toast cùng lúc.
Loại: success (xanh), error (đỏ), info (xám).

---

## Concept map

| Bước | Concept | Tại sao cần |
|------|---------|------------|
| 1 | **React.lazy + Suspense** | Trang Admin nặng — chỉ load khi cần |
| 2 | **HOC** | Tái sử dụng logic bảo vệ route |
| 3 | **Compound Components** | Toast API linh hoạt, dễ dùng |
| 4 | **Context + dispatch từ xa** | Trigger toast từ bất kỳ component nào |
| 5 | **useDeferredValue** | Search article không làm lag |
| 6 | **useId** | Label + input luôn có ID đúng chuẩn |
| 7 | **Render Props** | DataTable tái sử dụng được |
| 8 | **useImperativeHandle** | Toast ref có method `.dismiss()` |

---

## Không cần backend mới

Module này hoàn toàn frontend. Dùng lại API từ module 1 + 2.

---

## Bước 1 — React.lazy + Suspense: lazy load trang Admin

**Học được:** Tách bundle JS thành nhiều file nhỏ — trang Admin chỉ được download khi user thật sự vào `/admin`.

**Vấn đề hiện tại:** `App.jsx` import `Admin` ở đầu file → khi user vào trang Home, browser vẫn download toàn bộ code của Admin (dù chưa cần). Đây là lãng phí.

**Cơ chế:**
```
Import bình thường:
  import Admin from './pages/Admin'         ← load ngay khi App load
  → bundle chứa tất cả code của Admin

React.lazy:
  const Admin = lazy(() => import('./pages/Admin'))  ← chỉ load khi render <Admin />
  → tạo ra file riêng: chunk-Admin.js
  → chỉ download khi user vào /admin
```

**Làm:**
- Trong `App.jsx`, đổi các trang ít dùng sang lazy:
```js
import { lazy, Suspense } from 'react';

const Admin = lazy(() => import('./pages/Admin'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
```
- Wrap `<Routes>` trong `<Suspense>`:
```jsx
<Suspense fallback={<div className="py-32 text-center text-fwm-muted">Đang tải...</div>}>
  <Routes>
    ...
  </Routes>
</Suspense>
```

**Kiểm tra:** Mở Network tab (Filter: JS) → vào trang Home: không thấy file Admin → vào `/admin`: xuất hiện file `Admin-[hash].js` được download.

---

## Bước 2 — HOC (Higher-Order Component): `withAuth`

**Học được:** HOC là hàm nhận một component, trả về component mới có thêm logic — cách tái sử dụng logic mà không dùng hook.

**Pattern:**
```
HOC = hàm nhận Component → trả về Component mới

function withAuth(WrappedComponent) {
  return function AuthenticatedComponent(props) {
    // logic bảo vệ ở đây
    return <WrappedComponent {...props} />;
  };
}
```

**So sánh với Custom Hook:**
```
Custom Hook:  tái sử dụng LOGIC (stateful, side effects)
HOC:          tái sử dụng BEHAVIOR (wrap component, thêm props, điều kiện render)
```

**Vấn đề hiện tại:** `Profile.jsx` tự xử lý redirect bằng `useEffect`. Nếu có 10 trang cần đăng nhập, sẽ phải copy logic này vào 10 trang.

**Làm:**
- Tạo `components/common/withAuth.jsx`:
```jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function withAuth(WrappedComponent) {
  return function AuthenticatedComponent(props) {
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
      if (!user) navigate('/dang-nhap', { replace: true });
    }, [user, navigate]);

    if (!user) return null;

    return <WrappedComponent {...props} />;
  };
}
```
- Trong `Profile.jsx`: xóa useEffect redirect + `if (!user) return null` → thay bằng:
```jsx
// Cuối file, thay vì export default Profile:
export default withAuth(Profile);
```

**Kiểm tra:** Logout → vào `/ho-so` → redirect về `/dang-nhap`. Mở React DevTools → thấy `AuthenticatedComponent` wrap bên ngoài `Profile`.

---

## Bước 3 — Compound Components: thiết kế Toast API

**Học được:** Compound Components là pattern cho phép các component con giao tiếp với nhau qua Context ẩn — người dùng (developer) dùng API trực quan như HTML tag.

**Ví dụ API khi xong:**
```jsx
// Người dùng (developer) viết:
<Toast.Container>
  <Toast.Item type="success" message="Đã lưu!" onClose={...} />
  <Toast.Item type="error" message="Lỗi!" onClose={...} />
</Toast.Container>

// Thay vì phải viết:
<div className="fixed bottom-4 right-4 flex flex-col gap-2">
  <div className="bg-green-500 ...">Đã lưu!</div>
  <div className="bg-red-500 ...">Lỗi!</div>
</div>
```

**Tại sao Compound Components tốt hơn 1 component duy nhất?**
- Người dùng kiểm soát được cấu trúc (thêm animation, spacing riêng)
- Dễ đọc — trông như HTML semantic
- Dễ extend — thêm `Toast.Heading`, `Toast.Action` sau này mà không đổi API cũ

**Làm:**
- Tạo `components/ui/Toast.jsx`:
```jsx
// Container — quản lý layout
function ToastContainer({ children }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {children}
    </div>
  );
}

// Item — 1 thông báo đơn
function ToastItem({ type = 'info', message, onClose }) {
  const styles = {
    success: 'bg-green-500/90 text-white',
    error: 'bg-red-500/90 text-white',
    info: 'bg-fwm-card border border-fwm-line text-fwm-text',
  };

  return (
    <div className={`flex items-center gap-3 rounded-fwm px-4 py-3 shadow-lg ${styles[type]}`}>
      <span className="flex-1 text-sm font-bold">{message}</span>
      <button onClick={onClose} className="text-lg leading-none opacity-70 hover:opacity-100">×</button>
    </div>
  );
}

// Gom vào 1 object — đây là Compound Component
const Toast = { Container: ToastContainer, Item: ToastItem };
export default Toast;
```

**Kiểm tra:** Dùng thử trong 1 trang bất kỳ:
```jsx
<Toast.Container>
  <Toast.Item type="success" message="Test!" onClose={() => {}} />
</Toast.Container>
```
Thấy toast xuất hiện góc dưới phải.

---

## Bước 4 — ToastContext: trigger từ bất kỳ đâu

**Học được:** Context + dispatch pattern — cho phép component ở bất kỳ độ sâu nào trigger action mà không cần prop drilling.

**Vấn đề:** Toast cần hiện ở root layout (để nổi lên trên mọi thứ), nhưng action trigger lại xuất phát từ component con sâu bên trong (Profile save, Comment add...). Không thể truyền `showToast` qua props qua nhiều lớp.

**Giải pháp — ToastContext:**
```
ToastProvider (ở root)
├── quản lý danh sách toast (useReducer)
├── render <Toast.Container> + các <Toast.Item>
└── cung cấp hàm showToast(message, type) qua context

Profile.jsx (con sâu)
└── const { showToast } = useToast()
    showToast('Đã lưu!', 'success')  ← trigger từ đây
```

**Làm:**
- Tạo `context/ToastContext.jsx`:
```jsx
const ToastContext = createContext(null);
let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, dispatch] = useReducer((state, action) => {
    switch (action.type) {
      case 'ADD': return [...state, action.payload];
      case 'REMOVE': return state.filter(t => t.id !== action.id);
      default: return state;
    }
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    const id = ++idCounter;
    dispatch({ type: 'ADD', payload: { id, message, type } });
    setTimeout(() => dispatch({ type: 'REMOVE', id }), 3000); // tự đóng
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast.Container>
        {toasts.map(t => (
          <Toast.Item key={t.id} type={t.type} message={t.message}
            onClose={() => dispatch({ type: 'REMOVE', id: t.id })} />
        ))}
      </Toast.Container>
    </ToastContext.Provider>
  );
}

export function useToast() { return useContext(ToastContext); }
```
- Trong `main.jsx`: thêm `<ToastProvider>` wrap bên ngoài
- Trong `Profile.jsx`: xóa success/error inline UI, thay bằng:
```js
const { showToast } = useToast();
// Sau khi save thành công:
showToast('Đã lưu hồ sơ!', 'success');
// Khi lỗi:
showToast(err.message, 'error');
```

**Kiểm tra:** Sửa tên → Lưu → thấy toast xanh góc phải → tự mất sau 3 giây.

---

## Bước 5 — useDeferredValue: search article không lag

**Học được:** `useDeferredValue` giống `useTransition` nhưng dùng cho *giá trị* thay vì *hàm* — React giữ giá trị cũ để render tức thì, cập nhật giá trị mới ở background.

**Khác với `useTransition`:**
```
useTransition:
  Bạn kiểm soát state update:
  startTransition(() => setFilter(value))  ← wrap setter

useDeferredValue:
  Bạn KHÔNG kiểm soát được state update (prop từ component khác):
  const deferredQuery = useDeferredValue(query)  ← wrap giá trị
```

**Khi nào dùng `useDeferredValue`?**
Khi giá trị đến từ bên ngoài (prop, context) mà bạn không thể wrap setter trong `startTransition`.

**Làm:** Trong `Search.jsx`:
```js
const query = searchParams.get('q') || '';
const deferredQuery = useDeferredValue(query);  // query cũ vẫn hiển thị trong lúc cập nhật

const isStale = query !== deferredQuery;  // đang trong quá trình cập nhật

const results = useMemo(() => {
  return posts.filter(...)  // dùng deferredQuery thay vì query
}, [posts, deferredQuery, category]);
```

```jsx
<div className={isStale ? 'opacity-60 transition-opacity' : ''}>
  {/* kết quả tìm kiếm */}
</div>
```

**Kiểm tra:** Gõ nhanh nhiều ký tự → danh sách hơi mờ trong lúc cập nhật, không bị đứng/giật.

---

## Bước 6 — useId: ID duy nhất cho accessibility

**Học được:** `useId` sinh ra ID duy nhất, ổn định giữa server và client — dùng để kết nối `<label>` với `<input>` cho accessibility.

**Vấn đề khi hardcode ID:**
```jsx
// Component tái sử dụng — nếu render 2 lần, 2 input có cùng id="name" → sai
<label htmlFor="name">Họ tên</label>
<input id="name" />
```

**Giải pháp:**
```jsx
import { useId } from 'react';

function FormField({ label, ...props }) {
  const id = useId();  // React sinh ra: ":r0:", ":r1:", ... không trùng nhau
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} {...props} />
    </>
  );
}
```

**Làm:**
- Tạo `components/ui/FormField.jsx` dùng `useId`
- Dùng lại trong `Profile.jsx` thay cho label + input tách biệt

**Kiểm tra:** Render 2 `<FormField>` cùng lúc → inspect HTML → thấy id khác nhau (`:r0:`, `:r1:`). Click vào label → input tương ứng được focus.

---

## Bước 7 — Render Props: DataTable tái sử dụng

**Học được:** Render Props là pattern truyền hàm render qua prop — component cha quyết định *dữ liệu*, người dùng quyết định *cách hiển thị*.

**Ví dụ:**
```jsx
// Component cha cung cấp dữ liệu
<DataTable
  data={posts}
  columns={['Tiêu đề', 'Chuyên mục', 'Hành động']}
  renderRow={(post) => (    ← đây là render prop
    <tr key={post.id}>
      <td>{post.title.vi}</td>
      <td>{post.category}</td>
      <td><button>Sửa</button></td>
    </tr>
  )}
/>
```

**Tại sao không dùng props bình thường?** Mỗi bảng (bài viết, users, comments) render row khác nhau. Nếu cứng thì phải tạo `PostTable`, `UserTable`, `CommentTable` riêng. Render prop tách phần dữ liệu/logic (DataTable) khỏi phần UI (renderRow).

**So sánh với Compound Component:**
```
Compound Component: cấu trúc JSX linh hoạt, người dùng tự sắp xếp tag
Render Props:       logic linh hoạt, cha cung cấp dữ liệu, con quyết định render
```

**Làm:**
- Tạo `components/ui/DataTable.jsx`:
```jsx
function DataTable({ data, columns, renderRow, emptyMessage = 'Không có dữ liệu' }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          {columns.map(col => <th key={col} className="...">{col}</th>)}
        </tr>
      </thead>
      <tbody>
        {data.length === 0
          ? <tr><td colSpan={columns.length}>{emptyMessage}</td></tr>
          : data.map(renderRow)   // ← gọi render prop
        }
      </tbody>
    </table>
  );
}
```
- Dùng trong `Admin.jsx` thay cho bảng hiện tại

**Kiểm tra:** Bảng Posts và bảng Users đều dùng cùng `DataTable`, chỉ khác `renderRow`.

---

## Bước 8 — useImperativeHandle: Toast với method `.dismiss()`

**Học được:** `useImperativeHandle` + `forwardRef` cho phép expose API tùy chỉnh thay vì DOM element thô — component cha gọi được `.focus()`, `.dismiss()`, `.reset()` như gọi object method.

**Vấn đề:** `forwardRef` thông thường expose DOM element → cha có thể gọi bất kỳ method DOM nào (quá nhiều quyền). `useImperativeHandle` giới hạn: chỉ expose đúng những method bạn muốn.

**Khác với `forwardRef` thường:**
```
forwardRef thường:
  Cha nhận ref → ref.current = <input> DOM node → gọi được ref.current.focus(), .blur(), .value, ...

useImperativeHandle:
  Cha nhận ref → ref.current = { focus: fn, dismiss: fn }  ← chỉ expose những gì bạn định nghĩa
```

**Làm:**
- Tạo `components/ui/ToastItem.jsx` với `forwardRef` + `useImperativeHandle`:
```jsx
const ToastItem = forwardRef(function ToastItem({ type, message, onClose }, ref) {
  const [visible, setVisible] = useState(true);

  useImperativeHandle(ref, () => ({
    dismiss() {
      setVisible(false);
      setTimeout(onClose, 300);  // đợi animation xong rồi xóa khỏi state
    }
  }));

  return (
    <div className={`... transition-opacity ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {message}
      <button onClick={() => ref.current.dismiss()}>×</button>
    </div>
  );
});
```

**Kiểm tra:** Trong DevTools Console:
```js
// Nếu bạn gán ref:
toastRef.current.dismiss()  // gọi được
toastRef.current.value      // undefined — không expose DOM
```

---

## Thứ tự file cần tạo/sửa

```
Bước 1    App.jsx                               (lazy import)

Bước 2    components/common/withAuth.jsx        (tạo mới)
          pages/Profile.jsx                     (export default withAuth(Profile))

Bước 3    components/ui/Toast.jsx              (tạo mới — Compound Component)

Bước 4    context/ToastContext.jsx             (tạo mới)
          main.jsx                             (thêm ToastProvider)
          pages/Profile.jsx                   (dùng useToast thay error/success inline)

Bước 5    pages/Search.jsx                    (useDeferredValue)

Bước 6    components/ui/FormField.jsx         (tạo mới — useId)
          pages/Profile.jsx                   (dùng FormField)

Bước 7    components/ui/DataTable.jsx         (tạo mới — Render Props)
          pages/Admin.jsx                     (dùng DataTable)

Bước 8    components/ui/Toast.jsx             (thêm useImperativeHandle vào ToastItem)
```

---

## So sánh 3 pattern tái sử dụng logic

| Pattern | Cái gì linh hoạt | Ví dụ trong module này |
|---------|-----------------|----------------------|
| **Custom Hook** | Logic (stateful) | `useComments`, `useToast` |
| **HOC** | Behavior bọc ngoài | `withAuth(Profile)` |
| **Render Props** | UI bên trong | `<DataTable renderRow={fn}>` |
| **Compound Components** | Cấu trúc JSX | `<Toast.Container>` + `<Toast.Item>` |
