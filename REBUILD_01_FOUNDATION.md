# Module 1: Nền tảng — Providers, Context Theme/Lang, UI Kit, Layout

Xây lại phần "khung xương" mà mọi trang khác đều đứng lên trên: fetch wrapper, 2 Context đơn giản nhất (Theme, Lang), bộ UI kit dùng chung, và Layout/Header/Footer. Xong module này, app chạy được với route rỗng, đổi được theme/ngôn ngữ, có header/footer đầy đủ.

---

## Tổng quan file sẽ tạo (theo đúng thứ tự)

```
1. api/client.js              — fetch wrapper dùng chung cho mọi API call
2. i18n/dict.js                — object chứa toàn bộ text VI/EN
3. context/LangContext.jsx     — Context tự tạo #1 (đơn giản nhất)
4. context/ThemeContext.jsx     — Context tự tạo #2 (có localStorage + side effect)
5. data/categories.js           — data tĩnh (id + gradient), label lấy từ dict qua id
6. components/ui/Button.jsx     — atom: nút bấm dùng chung
7. components/ui/Chip.jsx        — atom: filter tag
8. components/ui/IconButton.jsx  — atom: nút icon tròn
9. components/ui/Avatar.jsx      — atom: avatar tròn (dùng React.memo)
10. components/common/SectionHeading.jsx — atom: tiêu đề section + link "Xem tất cả"
11. components/common/Layout.jsx  — khung layout dùng Outlet
12. components/layout/MobileMenu.jsx — menu mobile
13. components/layout/SiteHeader.jsx  — header (dùng cả 2 context)
14. components/layout/SiteFooter.jsx  — footer
15. App.jsx + main.jsx            — ráp Router + Provider
```

---

## Bước 1 — `api/client.js`: fetch wrapper dùng chung

**Học được:** Tách logic gọi API ra 1 hàm chung để không lặp lại `fetch` + xử lý lỗi ở mọi nơi.

**Vấn đề:** Nếu mỗi file API tự viết `fetch(...)`, xử lý header/token/lỗi sẽ lặp lại hàng chục lần. Viết 1 hàm `apiRequest` bọc `fetch`, mọi file khác chỉ gọi hàm này.

**Làm:**
```js
// api/client.js
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || 'Request failed');
  }

  return data;
}
```

**Input/output cần đạt:**
```
apiRequest('/posts')                              → GET không token
apiRequest('/posts', { method: 'POST', body, token }) → POST có Authorization header
Server trả lỗi (400/401/...)                       → throw Error với message từ server
```

**Kiểm tra:** Chưa gọi được gì vì chưa có provider — bỏ qua kiểm tra runtime ở bước này, sẽ test khi có Module 2 (Auth) gọi `apiRequest` thật.

---

## Bước 2 — `i18n/dict.js`: object chứa text VI/EN

**Học được:** i18n thủ công đơn giản nhất — 1 object lồng nhau theo `lang.section.key`, không cần thư viện.

**Làm:** Tạo `i18n/dict.js` export `dict = { vi: {...}, en: {...} }`. Cấu trúc theo từng trang: `nav`, `hero`, `section`, `categories`, `footer`, `category`, `article`, `search`, `favorites`, `admin`, `about`, `profile`, `auth`, `contact`.

Gõ dần theo nhu cầu từng module — ở Module 1 chỉ cần tối thiểu để Header/Footer chạy:
```js
export const dict = {
  vi: {
    nav: {
      home: 'Trang chủ', category: 'Chuyên mục', search: 'Tìm kiếm',
      favorites: 'Yêu thích', about: 'Giới thiệu', contact: 'Liên hệ',
      admin: 'Quản trị', login: 'Đăng nhập', register: 'Đăng ký', logout: 'Đăng xuất',
    },
    footer: {
      tagline: 'Nội dung eFootball cho người chơi Việt — kỹ năng, chiến thuật, kinh nghiệm.',
      categoriesHeading: 'Chuyên mục', siteLinksHeading: 'Trang',
      note: '© FootballWithMe. Nội dung mang tính tham khảo, tổng hợp từ cộng đồng eFootball.',
    },
    categories: {
      skill: { label: 'Kỹ năng', desc: 'Kỹ thuật cá nhân, combo điều khiển' },
      tactic: { label: 'Chiến thuật', desc: 'Sơ đồ, chỉ thị, vận hành đội hình' },
      exp: { label: 'Kinh nghiệm', desc: 'Bài học thực chiến từ cộng đồng' },
      player: { label: 'Người chơi', desc: 'Phân tích cầu thủ, build đội hình' },
    },
    section: { latest: 'Bài viết mới nhất', categories: 'Chuyên mục nổi bật', viewAll: 'Xem tất cả' },
  },
  en: {
    nav: {
      home: 'Home', category: 'Categories', search: 'Search',
      favorites: 'Favorites', about: 'About', contact: 'Contact',
      admin: 'Admin', login: 'Log in', register: 'Sign up', logout: 'Log out',
    },
    footer: {
      tagline: 'eFootball content for the Vietnamese player base — skills, tactics, experience.',
      categoriesHeading: 'Categories', siteLinksHeading: 'Site',
      note: '© FootballWithMe. Content is for reference, curated from the eFootball community.',
    },
    categories: {
      skill: { label: 'Skill', desc: 'Personal technique, controller combos' },
      tactic: { label: 'Tactics', desc: 'Formations, instructions, team play' },
      exp: { label: 'Experience', desc: 'Real match lessons from the community' },
      player: { label: 'Players', desc: 'Player analysis, squad building' },
    },
    section: { latest: 'Latest articles', categories: 'Featured categories', viewAll: 'View all' },
  },
};
```

> Các phần còn lại của `dict` (`hero`, `category`, `article`, `search`, `favorites`, `admin`, `about`, `profile`, `auth`, `contact`) sẽ thêm dần khi làm tới module tương ứng — không cần viết hết ngay bây giờ.

**Kiểm tra:** Không có UI để test ngay — sẽ dùng `t.nav.home` ở Bước 8 (SiteHeader).

---

## Bước 3 — `context/LangContext.jsx`: Context tự tạo đầu tiên

**Học được:** Công thức chuẩn của 1 Context tự tạo: `createContext` + `Provider` component + custom hook `useXxx` để nơi khác không cần import `useContext` + `XxxContext` mỗi lần.

**Làm:**
```jsx
// context/LangContext.jsx
import { createContext, useContext, useState } from 'react';
import { dict } from '../i18n/dict';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(
    () => localStorage.getItem('fwm-lang') || 'vi'
  );

  const toggleLang = () =>
    setLang((l) => {
      const next = l === 'vi' ? 'en' : 'vi';
      localStorage.setItem('fwm-lang', next);
      return next;
    });

  const t = dict[lang];

  return (
    <LangContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
```

**Input/output cần đạt:**
```
useLang() → { lang: 'vi', toggleLang, t: dict.vi }
gọi toggleLang() → lang đổi thành 'en', t đổi thành dict.en, localStorage lưu 'en'
```

**Kiểm tra:** Chưa test được vì chưa có Provider bọc App — sẽ test ở Bước 9 khi ráp `main.jsx`.

---

## Bước 4 — `context/ThemeContext.jsx`: Context có side effect

**Học được:** `useState` với hàm khởi tạo lazy (`useState(() => ...)`) để đọc `localStorage` chỉ 1 lần lúc mount, và `useEffect` để đồng bộ state ra ngoài (DOM attribute + localStorage) mỗi khi state đổi.

**Làm:**
```jsx
// context/ThemeContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('fwm-theme') || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fwm-theme', theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

**Vì sao dùng `useEffect` thay vì set attribute trực tiếp trong render?** Thay đổi DOM (`document.documentElement`) là side effect — không được làm trực tiếp trong thân component, phải đặt trong `useEffect` để React kiểm soát đúng thời điểm chạy (sau khi commit).

**Kiểm tra:** Test cùng lúc với Bước 9.

---

## Bước 5 — `data/categories.js`

**Học được:** Tách data tĩnh (không đổi ngôn ngữ được: `id`, `gradient` class) ra khỏi phần dịch (label/desc nằm trong `dict.categories`).

**Làm:**
```js
// data/categories.js
export const CATEGORIES = [
  { id: 'skill', gradient: 'from-amber-400 via-orange-500 to-pink-500' },
  { id: 'tactic', gradient: 'from-indigo-500 via-blue-500 to-cyan-400' },
  { id: 'exp', gradient: 'from-emerald-400 via-teal-500 to-cyan-500' },
  { id: 'player', gradient: 'from-fuchsia-500 via-pink-500 to-rose-400' },
];
```
Dùng chung: `t.categories[cat.id].label` lấy tên hiển thị, `cat.gradient` lấy màu nền.

---

## Bước 6 — UI Kit: `Button`, `Chip`, `IconButton`, `Avatar`, `SectionHeading`

**Học được:** Component "atom" — nhỏ, không biết gì về nghiệp vụ, chỉ nhận props và render. Đây là nền cho toàn bộ UI phía sau. Cũng là nơi thấy `React.memo` lần đầu (đã học kỹ ở `PROFILE_MODULE.md` bước 6, ở đây chỉ áp dụng lại).

**Làm — `components/ui/Button.jsx`** (polymorphic: render `<Link>`, `<a>` hoặc `<button>` tuỳ prop):
```jsx
import { Link } from 'react-router-dom';

const VARIANTS = {
  primary: 'bg-fwm-accent text-fwm-ink hover:brightness-95 shadow-fwm',
  ghost: 'bg-fwm-pill text-fwm-text border border-fwm-line hover:bg-fwm-card',
};

function Button({ to, href, variant = 'primary', className = '', children, ...rest }) {
  const classes = `font-head inline-flex items-center justify-center gap-2 rounded-fwm-pill px-5 py-3 text-sm font-bold transition active:scale-95 ${VARIANTS[variant]} ${className}`;

  if (to) return <Link to={to} className={classes} {...rest}>{children}</Link>;
  if (href) return <a href={href} className={classes} {...rest}>{children}</a>;
  return <button className={classes} {...rest}>{children}</button>;
}

export default Button;
```

**`components/ui/Chip.jsx`** (toggle filter):
```jsx
function Chip({ active = false, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-fwm-pill border px-3.5 py-1.5 font-head text-xs font-bold uppercase tracking-wide transition ${
        active ? 'border-fwm-accent bg-fwm-accent text-fwm-ink' : 'border-fwm-line bg-fwm-pill text-fwm-muted hover:text-fwm-text'
      }`}
    >
      {children}
    </button>
  );
}

export default Chip;
```

**`components/ui/IconButton.jsx`:**
```jsx
function IconButton({ label, active = false, className = '', children, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
        active ? 'border-fwm-accent bg-fwm-accent text-fwm-ink' : 'border-fwm-line bg-fwm-pill text-fwm-text hover:bg-fwm-card'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export default IconButton;
```

**`components/ui/Avatar.jsx`** (dùng lại từ module Profile — bọc `memo` vì render trong danh sách comment, không cần re-render khi cha đổi state khác):
```jsx
import { memo } from 'react';

const SIZES = { sm: 'h-9 w-9 text-sm', md: 'h-14 w-14 text-lg', lg: 'h-24 w-24 text-2xl' };

const Avatar = memo(function Avatar({ initials, preview, onClick, hint, size = 'lg' }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`flex shrink-0 overflow-hidden items-center justify-center rounded-full bg-fwm-accent font-head font-black text-fwm-ink ${SIZES[size]} ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        {preview ? <img src={preview} alt="avatar" className="h-full w-full object-cover" /> : initials}
      </div>
      {hint && <p className="text-xs text-fwm-muted">{hint}</p>}
    </div>
  );
});

export default Avatar;
```

**`components/common/SectionHeading.jsx`:**
```jsx
import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext';

function SectionHeading({ title, viewAllTo }) {
  const { t } = useLang();
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 className="font-head text-2xl font-extrabold text-fwm-text sm:text-3xl">{title}</h2>
      {viewAllTo && (
        <Link to={viewAllTo} className="shrink-0 text-sm font-semibold text-fwm-accent hover:underline">
          {t.section.viewAll} →
        </Link>
      )}
    </div>
  );
}

export default SectionHeading;
```

**Kiểm tra:** Chưa render được (chưa có route) — kiểm tra khi ráp Header ở Bước 8.

---

## Bước 7 — `components/common/Layout.jsx`: khung layout với `Outlet`

**Học được:** `<Outlet />` của react-router — nơi route con được render vào bên trong 1 layout cố định (Header/Footer luôn hiện, phần giữa đổi theo route).

**Làm:**
```jsx
import { Outlet } from 'react-router-dom';
import SiteHeader from '../layout/SiteHeader';
import SiteFooter from '../layout/SiteFooter';

function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-fwm-bg text-fwm-text">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

export default Layout;
```

---

## Bước 8 — `SiteHeader` + `MobileMenu`

**Học được:** Kết hợp nhiều Context trong 1 component (`useLang` + `useTheme` + `useAuth`), tính toán mảng nav động theo điều kiện (`isAdmin`, `user`), `NavLink` với callback className để style active link.

> `useAuth` chưa tồn tại ở module này — tạm thời import và để `user`/`isAdmin`/`logout` là `undefined`/`false`/no-op cho tới khi làm xong Module 2 (Auth). Không sao, header vẫn render được phần chưa đăng nhập.

**`components/layout/MobileMenu.jsx`:**
```jsx
import { NavLink } from 'react-router-dom';

function MobileMenu({ open, onClose, navItems, onLogout, logoutLabel }) {
  if (!open) return null;

  return (
    <div className="border-t border-fwm-line bg-fwm-bg-elev px-4 py-4 lg:hidden">
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `rounded-fwm px-3 py-2.5 font-head text-sm font-bold ${
                isActive ? 'bg-fwm-accent text-fwm-ink' : 'text-fwm-text hover:bg-fwm-pill'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
        {onLogout && (
          <button
            type="button"
            onClick={() => { onLogout(); onClose(); }}
            className="rounded-fwm px-3 py-2.5 text-left font-head text-sm font-bold text-fwm-pink hover:bg-fwm-pill"
          >
            {logoutLabel}
          </button>
        )}
      </nav>
    </div>
  );
}

export default MobileMenu;
```

**`components/layout/SiteHeader.jsx`:**
```jsx
import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useLang } from '../../context/LangContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import IconButton from '../ui/IconButton';
import Button from '../ui/Button';
import MobileMenu from './MobileMenu';

function SiteHeader() {
  const { lang, toggleLang, t } = useLang();
  const { theme, toggleTheme } = useTheme();
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { to: '/', label: t.nav.home },
    { to: '/chuyen-muc', label: t.nav.category },
    { to: '/gioi-thieu', label: t.nav.about },
    { to: '/lien-he', label: t.nav.contact },
  ];

  const mobileOnlyItems = [
    { to: '/tim-kiem', label: t.nav.search },
    { to: '/yeu-thich', label: t.nav.favorites },
    ...(isAdmin ? [{ to: '/admin', label: t.nav.admin }] : []),
    ...(user ? [] : [
      { to: '/dang-nhap', label: t.nav.login },
      { to: '/dang-ky', label: t.nav.register },
    ]),
  ];

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <header className="sticky top-0 z-40 border-b border-fwm-line bg-fwm-bg-deep/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-fwm bg-fwm-accent font-head text-base font-black text-fwm-ink">eF</span>
          <span className="font-head text-lg font-extrabold text-fwm-text">FootballWithMe</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-fwm-pill px-3.5 py-2 font-head text-sm font-bold transition ${
                  isActive ? 'bg-fwm-pill text-fwm-accent' : 'text-fwm-muted hover:text-fwm-text'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/tim-kiem" aria-label={t.nav.search} title={t.nav.search}
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-fwm-line bg-fwm-pill text-fwm-text transition hover:bg-fwm-card sm:inline-flex">
            🔍
          </Link>
          <Link to="/yeu-thich" aria-label={t.nav.favorites} title={t.nav.favorites}
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-fwm-line bg-fwm-pill text-fwm-text transition hover:bg-fwm-card sm:inline-flex">
            ♥
          </Link>
          <IconButton label="VI/EN" onClick={toggleLang} className="hidden text-xs sm:inline-flex">
            {lang === 'vi' ? 'VI' : 'EN'}
          </IconButton>
          <IconButton label="theme" onClick={toggleTheme} className="hidden sm:inline-flex">
            {theme === 'dark' ? '☀️' : '🌙'}
          </IconButton>
          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              {isAdmin && <Button to="/admin" variant="ghost">{t.nav.admin}</Button>}
              <Button to="/ho-so" variant="ghost">{user.name}</Button>
              <Button variant="primary" onClick={handleLogout}>{t.nav.logout}</Button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button to="/dang-nhap" variant="ghost">{t.nav.login}</Button>
              <Button to="/dang-ky" variant="primary">{t.nav.register}</Button>
            </div>
          )}

          <button type="button" aria-label="menu" onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-fwm border border-fwm-line text-fwm-text lg:hidden">
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        navItems={[...navItems, ...mobileOnlyItems]}
        onLogout={user ? handleLogout : null}
        logoutLabel={t.nav.logout}
      />
    </header>
  );
}

export default SiteHeader;
```

**Kiểm tra:** Sẽ chạy được sau Bước 10 (App.jsx + main.jsx) — lúc đó header phải hiện logo, nav, nút đổi theme/ngôn ngữ hoạt động, nút login/register (vì chưa đăng nhập).

---

## Bước 9 — `components/layout/SiteFooter.jsx`

**Học được:** Dùng `CATEGORIES` (data tĩnh) + `t.categories[cat.id]` (bản dịch) để build danh sách link động.

**Làm:**
```jsx
import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext';
import { CATEGORIES } from '../../data/categories';

function SiteFooter() {
  const { t } = useLang();

  const siteLinks = [
    { to: '/', label: t.nav.home },
    { to: '/gioi-thieu', label: t.nav.about },
    { to: '/lien-he', label: t.nav.contact },
    { to: '/admin', label: t.nav.admin },
  ];

  return (
    <footer className="border-t border-fwm-line bg-fwm-bg-deep">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-fwm bg-fwm-accent font-head text-sm font-black text-fwm-ink">eF</span>
              <span className="font-head text-base font-extrabold text-fwm-text">FootballWithMe</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-fwm-muted">{t.footer.tagline}</p>
          </div>

          <div>
            <h4 className="font-head text-sm font-bold uppercase tracking-wide text-fwm-text">{t.footer.categoriesHeading}</h4>
            <ul className="mt-3 space-y-2">
              {CATEGORIES.map((cat) => (
                <li key={cat.id}>
                  <Link to={`/chuyen-muc/${cat.id}`} className="text-sm text-fwm-muted hover:text-fwm-accent">
                    {t.categories[cat.id].label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-head text-sm font-bold uppercase tracking-wide text-fwm-text">{t.footer.siteLinksHeading}</h4>
            <ul className="mt-3 space-y-2">
              {siteLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-fwm-muted hover:text-fwm-accent">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-8 border-t border-fwm-line pt-6 text-xs text-fwm-muted">{t.footer.note}</p>
      </div>
    </footer>
  );
}

export default SiteFooter;
```

---

## Bước 10 — Ráp nối: `App.jsx` + `main.jsx`

**Học được:** Thứ tự lồng Provider quan trọng — Provider nào cần dữ liệu của Provider khác phải nằm **bên trong** provider đó. Ví dụ `FavoritesProvider` dùng `useAuth()` bên trong nó → phải nằm trong `AuthProvider`.

**Làm — `App.jsx`** (route rỗng tạm thời, các trang sẽ thêm dần ở module sau):
```jsx
import { Routes, Route } from 'react-router-dom';
import Layout from './components/common/Layout';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<div className="p-10 text-center">Trang chủ (sẽ làm ở Module 3)</div>} />
      </Route>
    </Routes>
  );
}

export default App;
```

**`main.jsx`** — thứ tự Provider (ghi chú lý do từng lớp):
```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { LangProvider } from './context/LangContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <LangProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </LangProvider>
    </ThemeProvider>
  </StrictMode>
);
```

> `AuthProvider`, `FavoritesProvider`, `PostsProvider` sẽ được thêm vào giữa `LangProvider` và `BrowserRouter` ở Module 2 và 3 — thứ tự cuối cùng:
> `Theme → Lang → Auth → Favorites → Posts → BrowserRouter → App`.

**Input/output cần đạt:**
```
npm run dev → mở localhost:5173
→ Thấy header (logo, nav Trang chủ/Chuyên mục/Giới thiệu/Liên hệ, nút VI/EN, nút theme, nút Đăng nhập/Đăng ký)
→ Bấm nút theme → nền đổi sáng/tối, refresh lại vẫn giữ theme đã chọn
→ Bấm nút VI/EN → chữ trong nav đổi ngôn ngữ
→ Thấy footer với 3 cột (logo+tagline, chuyên mục, trang)
```

**Kiểm tra:** Không có lỗi console. Resize xuống mobile → thấy nút ☰, bấm ra menu mobile đầy đủ nav.

---

## Xong module này, bạn có

- App chạy được với Header + Footer đầy đủ chức năng theme/ngôn ngữ.
- Bộ UI kit atom dùng lại xuyên suốt các module sau.
- 2 Context tự tạo đầu tiên (mẫu để làm Auth/Posts/Favorites ở các module sau).

Tiếp theo: `REBUILD_02_AUTH.md`.
