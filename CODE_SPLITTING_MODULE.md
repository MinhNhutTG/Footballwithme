# Module: Code splitting theo route (tối ưu hiệu năng)

Không phải tính năng mới — giảm dung lượng bundle JS chính tải lúc mở web lần đầu. Khác `PERFORMANCE_MODULE.md` (file cũ thuộc `REACT_ROADMAP.md` đã tạm dừng, nói về re-render/memoization) — module này về **bundle size**, một vấn đề khác hẳn.

## Khảo sát hiện trạng (trước khi viết spec)

- **Build hiện cảnh báo 1 file JS ~1.19MB** (`npx vite build` — "Some chunks are larger than 500 kB after minification") — mọi trang, mọi thư viện đều dồn chung 1 file, tải hết ngay cả khi khách chỉ vào xem 1 bài viết.
- **`App.jsx` import tất cả trang bằng `import X from './pages/X'` (static)** — không có `React.lazy()`/`Suspense` nào, Vite không tự tách chunk nếu code không có "điểm cắt" `import()` động.
- **Phát hiện quan trọng nhất — 2 thư viện nặng nhất chỉ dùng trong Admin, không liên quan gì tới khách xem web công khai:**
  - `recharts` (biểu đồ, ~9.6MB unpacked) — chỉ `AnalyticsPanel.jsx` dùng (tab Thống kê trong Admin).
  - `@tiptap/*` (rich text editor, ~8.5MB unpacked) — chỉ `RichTextEditor.jsx` dùng (form Admin tạo/sửa bài viết + danh mục).
  - Cả 2 đang bị **mọi khách công khai tải về** dù 99% người dùng không bao giờ vào `/admin` — đây là phần lãng phí lớn nhất, sửa đúng chỗ này lợi ích cao nhất so với công sức bỏ ra.
- **`Layout.jsx`** (`components/common/Layout.jsx`) bọc `<Outlet />` cho mọi route — đây là chỗ đặt `<Suspense>` hợp lý nhất: khi 1 trang đang tải chunk, Header/Footer vẫn hiện nguyên, chỉ vùng nội dung giữa hiện loading — trải nghiệm mượt hơn hẳn so với đặt `<Suspense>` bọc luôn cả `<Routes>` ở `App.jsx` (sẽ làm mất luôn cả Header/Footer mỗi lần chuyển trang).
- **React Router v7 dùng theo kiểu JSX `<Routes>/<Route>` (không phải `createBrowserRouter` data router)** — cách chuẩn để code-split ở kiểu này là `React.lazy()` + `Suspense`, không cần đổi sang API router khác (đổi API router là thay đổi kiến trúc lớn hơn nhiều, ngoài phạm vi).

## Quyết định (không cần hỏi lại — kỹ thuật chuẩn, rủi ro thấp)

**Lazy-load toàn bộ trang trong `App.jsx`, TRỪ `Home.jsx`** — `Home` là trang khách vào đầu tiên nhiều nhất (landing page), giữ `import` tĩnh để hiện ngay không phải chờ thêm 1 lượt tải chunk. Các trang còn lại (kể cả `Admin` — nơi có 2 thư viện nặng nhất) chuyển sang `React.lazy()`.

---

## Kiến trúc

```
main bundle (tải ngay khi mở web)
  ├── React, Router, Context providers, Layout, Header, Footer
  └── Home.jsx (giữ tĩnh — trang vào đầu tiên)

chunk riêng (chỉ tải khi ghé đúng route đó)
  ├── ArticleDetail.jsx, Category.jsx, Search.jsx, Favorites.jsx, About.jsx, Contact.jsx,...
  ├── Login.jsx, Register.jsx, ForgotPassword.jsx,...
  └── Admin.jsx  → kéo theo cả recharts + @tiptap chỉ tải khi vào /admin
        (PostsPanel, CategoryPanel, SettingsPanel, CommentsPanel, UsersPanel,
         LogsPanel, AnalyticsPanel — toàn bộ cây con của Admin đi theo 1 chunk)

Layout.jsx → bọc <Suspense> quanh <Outlet /> → chuyển trang chỉ "trắng" phần
              nội dung giữa, Header/Footer không biến mất
```

---

## Bước 1 — `App.jsx`: đổi sang `React.lazy()`

**Dán lại toàn bộ `frontend-rebuild/src/App.jsx`:**

```jsx
import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/common/Layout';
import Home from './pages/Home'

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const Category = lazy(() => import('./pages/Category'));
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'));
const Search = lazy(() => import('./pages/Search'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Admin = lazy(() => import('./pages/Admin'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Profile = lazy(() => import('./pages/Profile'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/dang-nhap" element={<Login />} />
        <Route path="/dang-ky" element={<Register />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/chuyen-muc" element={<Category></Category>} />
        <Route path="/chuyen-muc/:id" element={<Category />}></Route>
        <Route path="/bai-viet/:id" element={<ArticleDetail />}></Route>
        <Route path="/tim-kiem" element={<Search />} ></Route>
        <Route path='/yeu-thich' element={<Favorites />}></Route>
        <Route path='/admin' element={<Admin/>}></Route>
        <Route path='/gioi-thieu' element={<About/>} />
        <Route path='/lien-he' element={<Contact/>} />
        <Route path='/ho-so' element={<Profile/>} />
        <Route path='/nguoi-dung/:id' element={<PublicProfile/>} />
        <Route path="/quen-mat-khau" element={<ForgotPassword/>}/>
        <Route path="/dat-lai-mat-khau/:token" element={<ResetPassword/>}/>
        <Route path="/xac-thuc-email/:token" element={<VerifyEmail/>}/>
        <Route path='*' element={<NotFound/>}></Route>
      </Route>
    </Routes>
  );
}

export default App;
```

Điểm cần hiểu:
- **`Home` import tĩnh (`import Home from './pages/Home'`), các trang khác `lazy(() => import(...))`** — đây là điểm dễ gõ nhầm nhất, đừng lazy-hoá luôn `Home` theo quán tính.
- **`lazy()` chỉ hoạt động đúng với `export default`** — mọi file trang hiện tại đều đã `export default function X()`, không cần đổi gì ở các file trang.
- **Chưa thêm `<Suspense>` ở bước này** — nếu build/chạy thử ngay sau bước 1 mà chưa làm Bước 2, React sẽ báo lỗi "A component suspended while responding to synchronous input" (thiếu boundary `Suspense` bọc quanh) — 2 bước phải làm liền nhau, không tách rời test giữa chừng.

---

## Bước 2 — `Layout.jsx`: bọc `<Suspense>` quanh `<Outlet />`

**Sửa `frontend-rebuild/src/components/common/Layout.jsx`:**

Thêm import:
```js
import { Suspense } from 'react';
```

Đổi:
```jsx
            <main className="flex-1">
                <Outlet />
            </main>
```
thành:
```jsx
            <main className="flex-1">
                <Suspense fallback={<div className="flex justify-center py-24"><p className="text-fwm-muted">Đang tải...</p></div>}>
                    <Outlet />
                </Suspense>
            </main>
```

**Kiểm tra:**
- `npx vite build` → xem phần liệt kê file: giờ phải thấy **nhiều file `.js` nhỏ** thay vì 1 file ~1.19MB duy nhất (mỗi trang 1 chunk riêng, `Admin` sẽ là chunk lớn nhất còn lại vì kéo theo recharts+tiptap, nhưng **không còn nằm trong bundle chính** nữa).
- Mở trang chủ (`/`) → hiện ngay, không thấy chữ "Đang tải..." (vì `Home` vẫn tĩnh).
- Chuyển sang `/gioi-thieu` hoặc bấm vào 1 bài viết → có thể thấy thoáng qua chữ "Đang tải..." ở vùng giữa (Header/Footer không biến mất, không "trắng xoá" cả trang) rồi nội dung hiện ra.
- Vào `/admin` → vẫn hoạt động y hệt trước (mọi tab, mọi chức năng không đổi gì về logic) — chỉ khác là lần đầu vào `/admin` sẽ có 1 nhịp tải chunk ngắn (chứa recharts+tiptap) mà các trang công khai trước đó không phải tải.
- Mở tab Network trong DevTools, F5 lại trang chủ → tổng dung lượng JS tải về lúc đầu **giảm rõ rệt** so với trước (không còn kéo theo recharts/tiptap ngay từ đầu).

---

## Còn cần bạn chốt

Không có — đây là pattern chuẩn (`React.lazy`/`Suspense`), quyết định duy nhất (giữ `Home` tĩnh, phần còn lại lazy) là lựa chọn kỹ thuật ít rủi ro, đã giải thích lý do ở trên.
