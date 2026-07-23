# Học React qua Project FootballWithMe

Tài liệu này dạy bạn React từ đơn giản đến nâng cao, dùng chính code trong project này làm ví dụ. Mỗi khái niệm đều có file thực tế để bạn mở ra đọc ngay.

---

## Mục lục

1. [Component là gì?](#1-component-là-gì)
2. [Props — truyền dữ liệu vào component](#2-props--truyền-dữ-liệu-vào-component)
3. [JSX — HTML viết trong JavaScript](#3-jsx--html-viết-trong-javascript)
4. [useState — component nhớ dữ liệu](#4-usestate--component-nhớ-dữ-liệu)
5. [Xử lý sự kiện & Form](#5-xử-lý-sự-kiện--form)
6. [Conditional Rendering — hiển thị có điều kiện](#6-conditional-rendering--hiển-thị-có-điều-kiện)
7. [List Rendering — render danh sách](#7-list-rendering--render-danh-sách)
8. [useEffect — chạy code khi có thay đổi](#8-useeffect--chạy-code-khi-có-thay-đổi)
9. [Routing — điều hướng trang](#9-routing--điều-hướng-trang)
10. [Context API — chia sẻ dữ liệu toàn app](#10-context-api--chia-sẻ-dữ-liệu-toàn-app)
11. [Custom Hook — tái sử dụng logic](#11-custom-hook--tái-sử-dụng-logic)
12. [Gọi API — kết nối với backend](#12-gọi-api--kết-nối-với-backend)
13. [useCallback — tối ưu hiệu năng](#13-usecallback--tối-ưu-hiệu-năng)
14. [Kiến trúc tổng thể của project](#14-kiến-trúc-tổng-thể-của-project)

---

## 1. Component là gì?

**Khái niệm:** Component là một hàm JavaScript trả về JSX (giao diện). Mỗi component là một "mảnh ghép" độc lập của UI.

**File ví dụ:** `frontend/src/components/ui/Button.jsx`

```jsx
function Button({ to, href, variant = 'primary', className = '', children, ...rest }) {
  // ... logic ở đây
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}

export default Button;
```

**Điểm cần hiểu:**
- Tên component **phải viết hoa** chữ cái đầu (`Button`, không phải `button`)
- Hàm **phải return** một phần tử JSX
- `export default` để các file khác có thể import component này

**Cách dùng component Button trong project:**
```jsx
// frontend/src/pages/Home.jsx (dòng 67-70)
<Button to="/chuyen-muc" variant="primary">
  {t.hero.ctaPrimary}
</Button>
```

**Thực hành:** Mở `frontend/src/components/ui/Chip.jsx` và `frontend/src/components/common/SectionHeading.jsx` — đây là 2 component đơn giản nhất trong project.

---

## 2. Props — truyền dữ liệu vào component

**Khái niệm:** Props (properties) là dữ liệu bạn truyền từ component cha vào component con. Giống như tham số của hàm.

**File ví dụ:** `frontend/src/components/article/ArticleCard.jsx`

```jsx
// Component nhận prop "article"
function ArticleCard({ article }) {
  return (
    <article>
      <h3>{article.title[lang]}</h3>
      <p>{article.excerpt[lang]}</p>
    </article>
  );
}
```

**Cách truyền props từ component cha:**
```jsx
// frontend/src/pages/Home.jsx (dòng 82-84)
{latest.map((article) => (
  <ArticleCard key={article.id} article={article} />
))}
```

**Một số kiểu prop quan trọng trong project:**

| Prop | Ví dụ | Ý nghĩa |
|------|-------|---------|
| string | `variant="primary"` | Giá trị văn bản |
| object | `article={article}` | Truyền cả object |
| function | `onClick={() => toggleFavorite(id)}` | Truyền hàm callback |
| children | `<Button>Click me</Button>` | Nội dung bên trong tag |

**Default props:** Trong `Button.jsx`, `variant = 'primary'` — nếu không truyền `variant`, nó tự dùng `'primary'`.

**Spread props (`...rest`):** Trong `Button.jsx`, `...rest` cho phép truyền bất kỳ prop HTML nào (như `type="submit"`, `disabled`, v.v.) mà không cần khai báo từng cái.

---

## 3. JSX — HTML viết trong JavaScript

**Khái niệm:** JSX là cú pháp đặc biệt cho phép viết HTML trong JavaScript. Trình biên dịch sẽ chuyển JSX thành `React.createElement()`.

**Sự khác biệt JSX vs HTML:**

| HTML | JSX | Lý do |
|------|-----|-------|
| `class="..."` | `className="..."` | `class` là từ khóa JS |
| `for="..."` | `htmlFor="..."` | `for` là từ khóa JS |
| `onclick="..."` | `onClick={...}` | Sự kiện dùng camelCase |
| `style="color: red"` | `style={{ color: 'red' }}` | Style là object JS |

**Biểu thức trong JSX dùng `{}`:**
```jsx
// frontend/src/pages/Home.jsx
<h1 className="...">
  {t.hero.headline1}           {/* Biến */}
  <span>{t.hero.headline2}</span>
</h1>
```

**Self-closing tags:** Trong JSX, tag không có nội dung phải tự đóng:
```jsx
<input type="text" />   {/* Đúng */}
<input type="text">     {/* Sai — lỗi trong JSX */}
```

**Fragment:** Một component chỉ được return 1 element gốc. Nếu cần return nhiều, dùng `<>...</>`:
```jsx
return (
  <>
    <h1>Tiêu đề</h1>
    <p>Nội dung</p>
  </>
);
```

---

## 4. useState — component nhớ dữ liệu

**Khái niệm:** `useState` là hook cho phép component lưu và thay đổi dữ liệu. Khi state thay đổi, React tự động render lại component.

**File ví dụ:** `frontend/src/pages/Login.jsx`

```jsx
import { useState } from 'react';

function Login() {
  const [email, setEmail] = useState('');       // Giá trị ban đầu: chuỗi rỗng
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Khi user gõ, gọi setter để cập nhật state
  <input
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
}
```

**Cú pháp:** `const [state, setState] = useState(giáTrịBanĐầu)`

**Quy tắc quan trọng:**
- **Không bao giờ** sửa state trực tiếp: ~~`email = 'abc'`~~ → Phải dùng `setEmail('abc')`
- Mỗi lần gọi setter, component render lại
- State là bất đồng bộ — sau khi gọi `setEmail(...)`, giá trị `email` chưa đổi ngay

**Lazy initializer — khởi tạo state từ localStorage:**
```jsx
// frontend/src/context/AuthContext.jsx (dòng 7)
const [token, setToken] = useState(() => localStorage.getItem('fwm-token'));
```
Truyền **hàm** vào `useState` khi giá trị ban đầu cần tính toán (tốn kém). Hàm này chỉ chạy 1 lần đầu.

**Cập nhật state dựa trên state cũ:**
```jsx
// frontend/src/context/ThemeContext.jsx (dòng 14)
const toggleTheme = () =>
  setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
```
Khi state mới phụ thuộc vào state cũ, truyền **hàm** vào setter thay vì giá trị trực tiếp.

---

## 5. Xử lý sự kiện & Form

**Khái niệm:** React dùng event handler là hàm JavaScript. Với form, ta dùng `e.preventDefault()` để ngăn trang reload.

**File ví dụ:** `frontend/src/pages/Login.jsx`

```jsx
const handleSubmit = async (e) => {
  e.preventDefault();    // Ngăn browser gửi form theo cách cũ (reload trang)
  setError('');
  try {
    await login(email, password);
    navigate('/');         // Chuyển trang sau khi đăng nhập thành công
  } catch {
    setError(t.auth.errorLogin);   // Hiển thị lỗi
  }
};

<form onSubmit={handleSubmit}>
  ...
</form>
```

**Controlled Input:** Input mà React kiểm soát giá trị thông qua state.

```jsx
// Controlled: value luôn được set từ state
<input
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

Nếu bạn thấy `value={...}` trên input, đó là controlled input — React nắm quyền kiểm soát.

**Nút favorite trong ArticleCard.jsx:**
```jsx
<button
  type="button"
  onClick={() => toggleFavorite(article.id)}
>
  {liked ? '♥' : '♡'}
</button>
```

- `type="button"` ngăn button vô tình submit form
- `onClick` nhận một arrow function gọi `toggleFavorite` với argument

---

## 6. Conditional Rendering — hiển thị có điều kiện

**Khái niệm:** React render khác nhau dựa trên điều kiện. Có 3 cách phổ biến:

**Cách 1: Toán tử `&&` (AND)**
```jsx
// frontend/src/pages/ArticleDetail.jsx (dòng 62-65)
{isSkill && (
  <div className="mb-8 ...">
    {/* Chỉ hiện khi isSkill = true */}
  </div>
)}
```
Nếu điều kiện trái trả về `false`, React không render phần bên phải.

**Cách 2: Toán tử `? :` (ternary)**
```jsx
// frontend/src/components/article/ArticleCard.jsx (dòng 27-31)
<button
  className={`... ${liked ? 'text-fwm-pink' : 'text-fwm-muted hover:text-fwm-pink'}`}
>
  {liked ? '♥' : '♡'}
</button>
```

**Cách 3: `if` trả về sớm (early return)**
```jsx
// frontend/src/pages/ArticleDetail.jsx (dòng 15-23)
if (!article) {
  if (loading) return null;
  return (
    <section>
      <p>Không tìm thấy bài viết</p>
    </section>
  );
}
```
Early return là cách sạch nhất để xử lý loading state hoặc data không tồn tại.

---

## 7. List Rendering — render danh sách

**Khái niệm:** Dùng `.map()` để render mảng dữ liệu thành danh sách JSX. Mỗi phần tử **phải có prop `key` duy nhất**.

**File ví dụ:** `frontend/src/pages/Home.jsx`

```jsx
// Dòng 82-84
{latest.map((article) => (
  <ArticleCard key={article.id} article={article} />
))}
```

**Tại sao cần `key`?** React dùng `key` để biết element nào thay đổi khi danh sách cập nhật. Không có `key` → React render lại toàn bộ danh sách, tốn hiệu năng.

**Quy tắc key:**
- Phải **duy nhất** trong cùng danh sách
- Dùng `id` từ database khi có (tốt nhất)
- Tránh dùng `index` làm key nếu danh sách có thể thay đổi thứ tự

**Filter trước khi render:**
```jsx
// frontend/src/pages/ArticleDetail.jsx (dòng 27-29)
const related = posts.filter(
  (a) => a.category === article.category && a.id !== article.id
).slice(0, 3);
```

`.filter()` trả về mảng mới, `.slice(0, 3)` lấy tối đa 3 phần tử.

---

## 8. useEffect — chạy code khi có thay đổi

**Khái niệm:** `useEffect` chạy code "side effect" — những việc không phải render UI như: gọi API, thay đổi DOM, đăng ký event listener.

**Cú pháp:**
```jsx
useEffect(() => {
  // code chạy ở đây
}, [dependency]);
```

**3 trường hợp dependency:**

| Dependency | Khi nào chạy |
|-----------|--------------|
| Không có (bỏ qua) | Sau mỗi lần render |
| `[]` (mảng rỗng) | Chỉ 1 lần sau khi mount |
| `[a, b]` | Khi `a` hoặc `b` thay đổi |

**Ví dụ 1: Đồng bộ theme vào DOM**
```jsx
// frontend/src/context/ThemeContext.jsx (dòng 10-13)
useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('fwm-theme', theme);
}, [theme]);  // Chạy lại mỗi khi theme thay đổi
```

**Ví dụ 2: Fetch data khi component mount**
```jsx
// frontend/src/context/PostsContext.jsx (dòng 16-20)
useEffect(() => {
  refetch();
}, [refetch]);  // Chỉ chạy 1 lần (refetch là useCallback, không đổi)
```

**Lưu ý:** Nếu bạn đặt `[]` nhưng ESLint báo lỗi dependency, đó là dấu hiệu bạn đang bỏ sót dependency — hãy đọc cảnh báo, đừng ignore.

---

## 9. Routing — điều hướng trang

**Khái niệm:** React là Single Page Application (SPA) — chỉ có 1 trang HTML, React tự render nội dung khác nhau theo URL. `react-router-dom` xử lý việc này.

### 9.1. Cấu hình routes

**File:** `frontend/src/App.jsx`

```jsx
function App() {
  return (
    <Routes>
      <Route element={<Layout />}>          {/* Layout wrap tất cả */}
        <Route path="/" element={<Home />} />
        <Route path="/bai-viet/:id" element={<ArticleDetail />} />  {/* :id là dynamic */}
        <Route path="*" element={<NotFound />} />   {/* Bắt tất cả URL không khớp */}
      </Route>
    </Routes>
  );
}
```

**Nested Routes:** `<Layout>` là route cha. Nó dùng `<Outlet />` để render route con vào trong.

**File:** `frontend/src/components/common/Layout.jsx`
```jsx
function Layout() {
  return (
    <div>
      <SiteHeader />
      <main>
        <Outlet />   {/* Route con render ở đây */}
      </main>
      <SiteFooter />
    </div>
  );
}
```

### 9.2. Điều hướng bằng Link

```jsx
// Dùng Link thay vì <a href> để không reload trang
import { Link } from 'react-router-dom';

<Link to="/chuyen-muc">Chuyên mục</Link>
```

### 9.3. Điều hướng bằng code

```jsx
// frontend/src/pages/Login.jsx (dòng 8 & 19)
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
// Sau khi login thành công:
navigate('/');
```

### 9.4. Đọc URL params

```jsx
// frontend/src/pages/ArticleDetail.jsx (dòng 2 & 7)
import { useParams } from 'react-router-dom';

function ArticleDetail() {
  const { id } = useParams();  // Lấy :id từ URL /bai-viet/abc123
  const article = posts.find((a) => a.id === id);
}
```

---

## 10. Context API — chia sẻ dữ liệu toàn app

**Vấn đề:** Nếu nhiều component ở các tầng khác nhau đều cần dùng chung một dữ liệu (theme, user đang đăng nhập, ngôn ngữ...), bạn phải truyền props qua rất nhiều tầng — gọi là **"prop drilling"**.

**Giải pháp:** Context API — tạo "kho dữ liệu chung" để bất kỳ component nào cũng lấy được.

### 10.1. Cách tạo Context (Pattern trong project)

Mỗi context trong project đều theo cùng 1 pattern 3 bước:

```jsx
// frontend/src/context/ThemeContext.jsx
import { createContext, useContext, useState } from 'react';

// Bước 1: Tạo context
const ThemeContext = createContext(null);

// Bước 2: Tạo Provider — component bao bọc và cung cấp dữ liệu
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Bước 3: Tạo custom hook để dùng context dễ hơn
export function useTheme() {
  return useContext(ThemeContext);
}
```

### 10.2. Đặt Provider vào main.jsx

```jsx
// frontend/src/main.jsx
createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <LangProvider>
      <AuthProvider>
        <FavoritesProvider>
          <PostsProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </PostsProvider>
        </FavoritesProvider>
      </AuthProvider>
    </LangProvider>
  </ThemeProvider>
);
```

Provider nào ở ngoài cùng thì tồn tại lâu nhất. `AuthProvider` ở ngoài `FavoritesProvider` vì Favorites cần dùng Auth.

### 10.3. Dùng context trong component

```jsx
// Ở bất kỳ component nào, không cần truyền props
import { useTheme } from '../context/ThemeContext';

function SiteHeader() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>{theme}</button>;
}
```

### 10.4. Các Context trong project

| File | Dữ liệu quản lý |
|------|----------------|
| `ThemeContext.jsx` | Dark/light mode, đồng bộ vào DOM |
| `LangContext.jsx` | Ngôn ngữ VI/EN, cung cấp bản dịch `t` |
| `AuthContext.jsx` | User đang đăng nhập, token JWT |
| `FavoritesContext.jsx` | Bài viết yêu thích (user hoặc guest) |
| `PostsContext.jsx` | Danh sách bài viết từ API |

### 10.5. Context phức tạp hơn — AuthContext

```jsx
// frontend/src/context/AuthContext.jsx
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('fwm-token'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fwm-user') || 'null');
    } catch {
      return null;
    }
  });

  // Hàm helper dùng nội bộ
  const persist = (data) => {
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('fwm-token', data.token);
    localStorage.setItem('fwm-user', JSON.stringify(data.user));
    return data.user;
  };

  return (
    <AuthContext.Provider value={{
      token, user,
      isAdmin: user?.role === 'admin',   // Computed value — tính ngay trong value
      login: async (email, password) => persist(await loginRequest(email, password)),
      logout: () => { setToken(null); setUser(null); /* ... */ },
    }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**Điểm nổi bật:** `isAdmin: user?.role === 'admin'` — đây là **computed value**, tính toán từ state để component dùng context không cần tự tính.

---

## 11. Custom Hook — tái sử dụng logic

**Khái niệm:** Custom hook là hàm bắt đầu bằng `use` chứa logic có thể tái sử dụng. Bản chất là hàm bình thường nhưng có thể dùng các hook khác bên trong.

**Ví dụ đơn giản nhất — useTheme:**
```jsx
// Chỉ 3 dòng, nhưng cực kỳ tiện
export function useTheme() {
  return useContext(ThemeContext);
}

// Dùng:
const { theme, toggleTheme } = useTheme();
// Thay vì:
const { theme, toggleTheme } = useContext(ThemeContext); // Phải import ThemeContext
```

**Custom hook phức tạp hơn — trong FavoritesContext, context gọi context khác:**
```jsx
// frontend/src/context/FavoritesContext.jsx
export function FavoritesProvider({ children }) {
  const { user, token, setFavorites } = useAuth();  // Dùng Auth context

  const liked = user ? toMap(user.favorites) : guestLiked;  // Logic tính toán

  const toggleFavorite = async (id) => {
    if (user) {
      // User đã đăng nhập → gọi API
      const { favorites } = await toggleFavoriteRequest(id, token);
      setFavorites(favorites);
    } else {
      // Guest → lưu local
      setGuestLiked((prev) => ({ ...prev, [id]: !prev[id] }));
    }
  };
}
```

Logic "nếu đăng nhập thì API, không thì local" được **gói gọn** trong context — component dùng `useFavorites()` không cần biết điều này.

---

## 12. Gọi API — kết nối với backend

**Khái niệm:** React không tự gọi API. Bạn dùng `fetch` hoặc thư viện như `axios`. Project này dùng `fetch` với một wrapper function.

### 12.1. API Client (wrapper)

**File:** `frontend/src/api/client.js`

```jsx
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),  // Đính kèm token nếu có
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || 'Request failed');  // Throw error nếu HTTP 4xx/5xx
  }

  return data;
}
```

**Tại sao có wrapper?** Để không lặp code header, error handling ở mỗi nơi gọi API.

### 12.2. API functions

**File:** `frontend/src/api/posts.js`

```jsx
export async function fetchPosts(category) {
  const query = category ? `?category=${category}` : '';
  const posts = await apiRequest(`/posts${query}`);
  return posts.map(normalize);  // Chuẩn hóa data: thêm .id từ ._id của MongoDB
}
```

### 12.3. Gọi API trong Context (PostsContext)

```jsx
// frontend/src/context/PostsContext.jsx
const [posts, setPosts] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');

const refetch = useCallback(() => {
  setLoading(true);
  return fetchPosts()
    .then(setPosts)
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
}, []);

useEffect(() => {
  refetch();
}, [refetch]);
```

**Pattern loading/error/data** là pattern chuẩn khi fetch API:
- `loading = true` → Đang tải → Hiển thị spinner
- `error` → Có lỗi → Hiển thị thông báo lỗi  
- `posts` → Có data → Render data

### 12.4. Gọi API trong event handler (Login)

```jsx
// frontend/src/pages/Login.jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  try {
    await login(email, password);  // login() gọi API
    navigate('/');
  } catch {
    setError(t.auth.errorLogin);   // Bắt lỗi từ apiRequest
  }
};
```

**Biến môi trường:** `VITE_API_URL` trong file `.env` — khi build production, biến này trỏ tới URL backend thật thay vì localhost.

---

## 13. useCallback — tối ưu hiệu năng

**Khái niệm:** `useCallback` "ghi nhớ" một hàm — hàm sẽ không bị tạo lại sau mỗi lần render trừ khi dependency thay đổi.

**File ví dụ:** `frontend/src/context/PostsContext.jsx`

```jsx
const refetch = useCallback(() => {
  setLoading(true);
  return fetchPosts()
    .then(setPosts)
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
}, []);  // [] = không có dependency → hàm này luôn cùng một tham chiếu
```

**Tại sao cần ở đây?**

```jsx
useEffect(() => {
  refetch();
}, [refetch]);  // refetch là dependency của useEffect
```

Nếu `refetch` không có `useCallback`, mỗi lần render nó bị tạo lại → `useEffect` thấy `refetch` "thay đổi" → gọi API lại → vòng lặp vô tận.

**Khi nào dùng useCallback:**
- Hàm được đặt vào dependency array của `useEffect`
- Hàm được truyền xuống component con và component con đó được tối ưu với `memo`

**Đừng lạm dụng** — không phải hàm nào cũng cần `useCallback`.

---

## 14. Kiến trúc tổng thể của project

### Luồng dữ liệu

```
main.jsx
└── Providers (ThemeProvider, LangProvider, AuthProvider, ...)
    └── BrowserRouter
        └── App.jsx (Routes)
            └── Layout.jsx (Header + Outlet + Footer)
                └── Trang hiện tại (Home, ArticleDetail, ...)
                    └── Component con (ArticleCard, Button, ...)
```

### Cấu trúc thư mục

```
frontend/src/
├── api/          ← Hàm gọi API (không phải React)
│   ├── client.js     ← Wrapper fetch()
│   ├── auth.js       ← login, register, toggleFavorite
│   └── posts.js      ← fetchPosts, createPost, ...
├── context/      ← State toàn app (Context API)
│   ├── AuthContext.jsx
│   ├── ThemeContext.jsx
│   ├── LangContext.jsx
│   ├── FavoritesContext.jsx
│   └── PostsContext.jsx
├── pages/        ← Mỗi file = 1 trang (tương ứng 1 route)
├── components/   ← Component tái sử dụng
│   ├── ui/           ← Primitive: Button, Chip, IconButton
│   ├── common/       ← Layout, SectionHeading
│   ├── layout/       ← SiteHeader, SiteFooter, MobileMenu
│   ├── article/      ← ArticleCard, PopularItem
│   ├── skill/        ← SkillStep, GamepadKey
│   └── admin/        ← PostForm, UsersPanel, ...
├── i18n/         ← Bản dịch VI/EN
├── data/         ← Dữ liệu tĩnh (categories)
└── App.jsx       ← Định nghĩa Routes
```

### Lộ trình học theo project

**Tuần 1 — Đọc và hiểu:**
1. Đọc `main.jsx` — xem cấu trúc Provider
2. Đọc `App.jsx` — xem cách định nghĩa routes
3. Đọc `components/ui/Button.jsx` — component đơn giản nhất
4. Đọc `components/common/Layout.jsx` — hiểu Outlet

**Tuần 2 — State cơ bản:**
1. Đọc `pages/Login.jsx` — useState + form + async
2. Đọc `context/ThemeContext.jsx` — useState + useEffect đơn giản
3. Đọc `context/LangContext.jsx` — tương tự ThemeContext

**Tuần 3 — Context & Data flow:**
1. Đọc `context/AuthContext.jsx` — auth flow hoàn chỉnh
2. Đọc `context/PostsContext.jsx` — fetch API + loading state
3. Đọc `context/FavoritesContext.jsx` — context dùng context khác

**Tuần 4 — Tổng hợp:**
1. Đọc `pages/ArticleDetail.jsx` — dùng nhiều context + useParams
2. Đọc `pages/Home.jsx` — toàn bộ trang hoàn chỉnh
3. Thử tự thêm 1 feature nhỏ (ví dụ: thêm nút share bài viết)

---

## Câu hỏi thường gặp khi đọc code này

**Q: `?.` là gì?** (ví dụ: `user?.role`)
A: Optional chaining — nếu `user` là `null/undefined`, không throw lỗi, chỉ trả về `undefined`.

**Q: `??` là gì?** (ví dụ: `data ?? 'default'`)
A: Nullish coalescing — dùng giá trị bên phải nếu bên trái là `null` hoặc `undefined`.

**Q: `...prev` là gì?** (ví dụ: `{ ...prev, [id]: true }`)
A: Spread operator — copy tất cả properties của `prev` vào object mới, rồi ghi đè/thêm `[id]: true`.

**Q: `import.meta.env.VITE_API_URL` là gì?**
A: Vite đọc file `.env` và inject vào code. `VITE_` là prefix bắt buộc để biến được expose ra frontend.

**Q: `dangerouslySetInnerHTML` trong ArticleDetail là gì?**
A: Render HTML thuần từ string vào DOM. Nguy hiểm nếu HTML chứa script độc — project này an toàn vì HTML đã được sanitize ở backend trước khi lưu vào database.
