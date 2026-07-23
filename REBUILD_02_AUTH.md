# Module 2: Xác thực (Auth)

Xây `AuthContext` — Context tự tạo quan trọng nhất vì gần như mọi module sau đều phụ thuộc nó (`Header`, `Profile`, `Admin`, `Favorites`, `Comments`).

---

## Backend đã có sẵn

| Method | URL | Auth | Body | Trả về |
|--------|-----|------|------|--------|
| POST | `/api/auth/register` | Không | `{ name, email, password }` | `{ user, token }` |
| POST | `/api/auth/login` | Không | `{ email, password }` | `{ user, token }` |
| GET | `/api/auth/me` | Cần token | — | `{ user }` |
| POST | `/api/auth/favorites/:postId` | Cần token | — | `{ favorites: [postId, ...] }` (toggle thêm/bớt) |

`user` trả về có shape: `{ _id, name, email, role: 'user'|'admin', favorites: [postId], bio, createdAt }` (password không bao giờ trả về — model tự xoá trong `toJSON`).

---

## Tổng quan file sẽ tạo

```
1. api/auth.js               — login/register/toggleFavorite
2. context/AuthContext.jsx    — lưu token+user, persist localStorage
3. pages/Login.jsx
4. pages/Register.jsx
5. pages/AdminLogin.jsx
6. main.jsx                   — thêm AuthProvider
7. App.jsx                    — thêm route /dang-nhap, /dang-ky, /admin/login
```

---

## Bước 1 — `api/auth.js`

**Học được:** Tách các lệnh gọi API theo domain (auth riêng, posts riêng, users riêng...) — dễ tìm, dễ mock khi test.

**Làm:**
```js
// api/auth.js
import { apiRequest } from './client';

export function login({ email, password }) {
  return apiRequest('/auth/login', { method: 'POST', body: { email, password } });
}

export function register({ name, email, password }) {
  return apiRequest('/auth/register', { method: 'POST', body: { name, email, password } });
}

export function toggleFavorite({ postId, token }) {
  return apiRequest(`/auth/favorites/${postId}`, { method: 'POST', token });
}
```

Tham số truyền vào dạng object `{ email, password }` thay vì liệt kê riêng từng tham số — gọi hàm rõ nghĩa hơn (`login({ email, password })`) và không lo nhầm thứ tự khi hàm có nhiều tham số cùng kiểu string.

---

## Bước 2 — `context/AuthContext.jsx`

**Học được:** Context tự tạo phức tạp hơn Theme/Lang — vừa lưu state (`token`, `user`), vừa expose hàm nghiệp vụ (`login`, `register`, `logout`, `updateUser`, `setFavorites`) để nơi khác gọi mà không cần biết chi tiết cách persist.

**Vấn đề cần giải quyết:** Sau khi login, cần (1) lưu `token`+`user` vào state để re-render UI ngay, và (2) lưu vào `localStorage` để refresh trang không bị đăng xuất.

**Làm:**
```jsx
// context/AuthContext.jsx
import { createContext, useContext, useState } from 'react';
import { login as loginRequest, register as registerRequest } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('fwm-token'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fwm-user') || 'null');
    } catch {
      return null;
    }
  });

  const persist = (data) => {
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('fwm-token', data.token);
    localStorage.setItem('fwm-user', JSON.stringify(data.user));
    return data.user;
  };

  const login = async (email, password) => persist(await loginRequest({ email, password }));

  const register = async (name, email, password) =>
    persist(await registerRequest({ name, email, password }));

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('fwm-token');
    localStorage.removeItem('fwm-user');
  };

  const setFavorites = (favorites) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, favorites };
      localStorage.setItem('fwm-user', JSON.stringify(next));
      return next;
    });
  };

  const updateUser = (fields) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...fields };
      localStorage.setItem('fwm-user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{ token, user, isAdmin: user?.role === 'admin', login, register, logout, setFavorites, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

**Vì sao có `setFavorites` và `updateUser` riêng thay vì gọi `setUser` trực tiếp ở nơi khác?** Context nên là nơi duy nhất biết cách persist state ra `localStorage`. Nếu để `Favorites`/`Profile` tự gọi `setUser`, chúng sẽ phải tự lo đồng bộ `localStorage`, dễ quên và gây bug (state React đúng nhưng localStorage cũ).

**Input/output cần đạt:**
```
login('a@b.com', '123456') thành công
→ token, user có giá trị
→ localStorage có 'fwm-token' và 'fwm-user'
→ isAdmin === true nếu user.role === 'admin'

logout()
→ token, user về null
→ localStorage xoá 2 key trên
```

---

## Bước 3 — `pages/Login.jsx`

**Học được:** Controlled form cơ bản (2 input + `useState`), gọi hàm async từ Context, bắt lỗi hiển thị UI, điều hướng sau khi thành công (`useNavigate`).

**Làm:**
```jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

function Login() {
  const { t } = useLang();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError(t.auth.errorLogin);
    }
  };

  return (
    <section className="mx-auto max-w-sm px-4 py-20">
      <h1 className="font-head text-2xl font-black text-fwm-text">{t.auth.loginHeading}</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">
            {t.auth.email}
          </label>
          <input
            required
            type="text"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">
            {t.auth.password}
          </label>
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
          />
        </div>
        {error && <p className="text-sm text-fwm-pink">{error}</p>}
        <Button type="submit" variant="primary" className="w-full">
          {t.auth.submitLogin}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-fwm-muted">
        {t.auth.noAccount}{' '}
        <Link to="/dang-ky" className="font-bold text-fwm-accent hover:underline">
          {t.auth.goRegister}
        </Link>
      </p>
    </section>
  );
}

export default Login;
```

**Bổ sung `dict.js`** (mục `auth` cho cả 2 ngôn ngữ):
```js
// vi
auth: {
  loginHeading: 'Đăng nhập', registerHeading: 'Tạo tài khoản',
  name: 'Họ tên', email: 'Email', password: 'Mật khẩu',
  submitLogin: 'Đăng nhập', submitRegister: 'Đăng ký',
  noAccount: 'Chưa có tài khoản?', hasAccount: 'Đã có tài khoản?',
  goRegister: 'Đăng ký ngay', goLogin: 'Đăng nhập ngay',
  errorLogin: 'Email hoặc mật khẩu không đúng.',
  errorRegister: 'Không thể đăng ký, email có thể đã được sử dụng.',
},
// en
auth: {
  loginHeading: 'Log in', registerHeading: 'Create an account',
  name: 'Name', email: 'Email', password: 'Password',
  submitLogin: 'Log in', submitRegister: 'Sign up',
  noAccount: "Don't have an account?", hasAccount: 'Already have an account?',
  goRegister: 'Sign up now', goLogin: 'Log in now',
  errorLogin: 'Incorrect email or password.',
  errorRegister: "Couldn't sign up, the email may already be in use.",
},
```

---

## Bước 4 — `pages/Register.jsx`

**Học được:** Giống Login nhưng 3 input + validation HTML5 (`minLength={6}` khớp với `User.js` backend yêu cầu `minlength: 6`).

**Làm:**
```jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

function Register() {
  const { t } = useLang();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(name, email, password);
      navigate('/');
    } catch {
      setError(t.auth.errorRegister);
    }
  };

  return (
    <section className="mx-auto max-w-sm px-4 py-20">
      <h1 className="font-head text-2xl font-black text-fwm-text">{t.auth.registerHeading}</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">
            {t.auth.name}
          </label>
          <input required type="text" autoComplete="name" value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none" />
        </div>
        <div>
          <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">
            {t.auth.email}
          </label>
          <input required type="email" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none" />
        </div>
        <div>
          <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">
            {t.auth.password}
          </label>
          <input required type="password" minLength={6} autoComplete="new-password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none" />
        </div>
        {error && <p className="text-sm text-fwm-pink">{error}</p>}
        <Button type="submit" variant="primary" className="w-full">
          {t.auth.submitRegister}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-fwm-muted">
        {t.auth.hasAccount}{' '}
        <Link to="/dang-nhap" className="font-bold text-fwm-accent hover:underline">
          {t.auth.goLogin}
        </Link>
      </p>
    </section>
  );
}

export default Register;
```

---

## Bước 5 — `pages/AdminLogin.jsx`

**Học được:** Dùng lại `login()` có sẵn nhưng thêm 1 điều kiện nghiệp vụ riêng (chỉ cho vào nếu `role === 'admin'`) — cho thấy Context chỉ lo cơ chế chung, còn điều kiện đặc thù từng trang tự xử lý ở component.

**Làm:**
```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(email, password);
      if (user.role !== 'admin') {
        setError('Tài khoản này không có quyền quản trị.');
        return;
      }
      navigate('/admin');
    } catch {
      setError('Email hoặc mật khẩu không đúng.');
    }
  };

  return (
    <section className="mx-auto max-w-sm px-4 py-20">
      <h1 className="font-head text-2xl font-black text-fwm-text">Đăng nhập quản trị</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">
            Tên đăng nhập / Email
          </label>
          <input required type="text" autoComplete="username" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none" />
        </div>
        <div>
          <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Mật khẩu</label>
          <input required type="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none" />
        </div>
        {error && <p className="text-sm text-fwm-pink">{error}</p>}
        <Button type="submit" variant="primary" className="w-full">Đăng nhập</Button>
      </form>
    </section>
  );
}

export default AdminLogin;
```

**Lưu ý quan trọng:** `login()` gọi thành công vẫn set `token`/`user` vào Context+localStorage **trước khi** kiểm tra role — nghĩa là user thường login nhầm vào `/admin/login` vẫn bị lưu phiên đăng nhập (chỉ không được điều hướng vào `/admin`). Đây là hành vi hiện tại của code gốc, chấp nhận được vì `Admin.jsx` (Module 5) tự chặn lại nếu `!isAdmin`.

---

## Bước 6 — Ráp nối `main.jsx` + `App.jsx`

**`main.jsx`** — thêm `AuthProvider`, nằm trong `LangProvider`, ngoài `BrowserRouter`:
```jsx
import { AuthProvider } from './context/AuthContext.jsx';
// ...
<ThemeProvider>
  <LangProvider>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </LangProvider>
</ThemeProvider>
```

**`App.jsx`** — thêm 3 route:
```jsx
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLogin from './pages/AdminLogin';
// ... trong <Route element={<Layout />}>
<Route path="/dang-nhap" element={<Login />} />
<Route path="/dang-ky" element={<Register />} />
<Route path="/admin/login" element={<AdminLogin />} />
```

**Input/output cần đạt:**
```
Vào /dang-ky → điền form → submit → gọi POST /api/auth/register
→ thành công: chuyển về "/", Header đổi thành hiện tên user + nút Đăng xuất
→ thất bại (email trùng): hiện "Không thể đăng ký, email có thể đã được sử dụng."

Vào /dang-nhap → login → chuyển về "/", refresh trang (F5) → vẫn đăng nhập (nhờ localStorage)

Đăng xuất → Header trở lại nút Đăng nhập/Đăng ký
```

**Kiểm tra:** F12 → Application → Local Storage → thấy `fwm-token`, `fwm-user` sau khi login; biến mất sau khi logout. F12 → Network → thấy `POST /api/auth/login` hoặc `/register`.

---

## Xong module này, bạn có

- `useAuth()` dùng được ở mọi component con của `AuthProvider`.
- Header (Module 1) giờ hoạt động đầy đủ: hiện tên user, nút Admin nếu `isAdmin`, đăng xuất.
- Nền tảng để làm `Profile` (đã có sẵn ở `PROFILE_MODULE.md`), `Favorites` (Module 4), `Admin` (Module 5).

Tiếp theo: `REBUILD_03_POSTS.md`.
