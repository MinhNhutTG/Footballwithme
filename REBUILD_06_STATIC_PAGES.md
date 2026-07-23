# Module 6: Trang tĩnh — About, Contact, NotFound

Module cuối, ngắn nhất — không có gì mới về concept, chỉ ráp lại những gì đã học (Context, controlled form, route catch-all) vào 3 trang đơn giản.

---

## Tổng quan file sẽ tạo

```
1. pages/About.jsx
2. pages/Contact.jsx
3. pages/NotFound.jsx
```

---

## Bước 1 — `pages/About.jsx`

**Học được:** Không có gì mới — chỉ là ví dụ dùng `usePosts().posts.length` và `CATEGORIES.length` làm số liệu thống kê "sống" thay vì hard-code.

**Làm:**
```jsx
import { useLang } from '../context/LangContext';
import { usePosts } from '../context/PostsContext';
import { CATEGORIES } from '../data/categories';

function About() {
  const { t } = useLang();
  const { posts } = usePosts();

  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-head text-3xl font-black text-fwm-text sm:text-4xl">{t.about.heading}</h1>
      <p className="mt-5 text-lg leading-relaxed text-fwm-muted">{t.about.desc}</p>
      <p className="mt-4 leading-relaxed text-fwm-muted">{t.about.mission}</p>

      <div className="mt-10 grid grid-cols-3 gap-4 border-t border-fwm-line pt-8">
        <div>
          <div className="font-head text-3xl font-extrabold text-fwm-accent">{posts.length}+</div>
          <div className="mt-1 text-sm text-fwm-muted">{t.about.statArticles}</div>
        </div>
        <div>
          <div className="font-head text-3xl font-extrabold text-fwm-accent">{CATEGORIES.length}</div>
          <div className="mt-1 text-sm text-fwm-muted">{t.about.statCategories}</div>
        </div>
        <div>
          <div className="font-head text-3xl font-extrabold text-fwm-accent">8K+</div>
          <div className="mt-1 text-sm text-fwm-muted">{t.about.statMembers}</div>
        </div>
      </div>
    </section>
  );
}

export default About;
```

**Bổ sung `dict.js` mục `about`:**
```
about: {
  heading: 'Về FootballWithMe',
  desc: 'FootballWithMe là nơi tổng hợp kỹ năng, chiến thuật và kinh nghiệm thực chiến eFootball cho người chơi Việt Nam, viết lại dễ hiểu từ cộng đồng.',
  mission: 'Sứ mệnh của chúng tôi là giúp người chơi mới rút ngắn thời gian học hỏi và chơi eFootball tự tin hơn mỗi ngày.',
  statArticles: 'Bài viết', statCategories: 'Chuyên mục', statMembers: 'Thành viên cộng đồng',
}
```

---

## Bước 2 — `pages/Contact.jsx`

**Học được:** Form không gọi API thật — chỉ đổi 1 state `sent` để chuyển UI sang màn "đã gửi thành công". Đây là ví dụ tối giản của pattern "controlled form + submit" mà không cần Context hay async.

**Làm:**
```jsx
import { useState } from 'react';
import { useLang } from '../context/LangContext';
import Button from '../components/ui/Button';

function Contact() {
  const { t } = useLang();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  if (sent) {
    return (
      <section className="mx-auto max-w-xl px-4 py-24 text-center">
        <span className="text-4xl">✅</span>
        <h1 className="mt-4 font-head text-2xl font-black text-fwm-text">{t.contact.successTitle}</h1>
        <p className="mt-2 text-fwm-muted">{t.contact.successDesc}</p>
        <Button to="/" variant="primary" className="mt-6 inline-flex">{t.contact.backHome}</Button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-head text-3xl font-black text-fwm-text">{t.contact.heading}</h1>
      <p className="mt-3 text-fwm-muted">{t.contact.desc}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.contact.name}</label>
          <input required value={form.name} onChange={handleChange('name')}
            className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none" />
        </div>
        <div>
          <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.contact.email}</label>
          <input required type="email" value={form.email} onChange={handleChange('email')}
            className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none" />
        </div>
        <div>
          <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.contact.message}</label>
          <textarea required rows={5} value={form.message} onChange={handleChange('message')}
            className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none" />
        </div>
        <Button type="submit" variant="primary" className="w-full">{t.contact.send}</Button>
      </form>
    </section>
  );
}

export default Contact;
```

**Bổ sung `dict.js` mục `contact`:**
```
contact: {
  heading: 'Liên hệ với chúng tôi',
  desc: 'Có góp ý, câu hỏi hoặc muốn đóng góp bài viết? Gửi tin nhắn cho chúng tôi.',
  name: 'Họ tên', email: 'Email', message: 'Nội dung', send: 'Gửi tin nhắn',
  successTitle: 'Đã gửi thành công!',
  successDesc: 'Cảm ơn bạn đã liên hệ, chúng tôi sẽ phản hồi sớm nhất có thể.',
  backHome: 'Về trang chủ',
}
```

---

## Bước 3 — `pages/NotFound.jsx`

**Học được:** Route catch-all `path="*"` của react-router — bắt mọi URL không khớp route nào khác, luôn đặt **cuối cùng** trong danh sách `<Route>`.

**Làm:**
```jsx
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-24 text-center">
      <h1 className="font-head text-4xl font-black text-fwm-accent">404</h1>
      <p className="mt-3 text-fwm-muted">Trang này chưa sẵn sàng hoặc không tồn tại.</p>
      <Link to="/" className="mt-6 inline-flex rounded-fwm-pill bg-fwm-accent px-5 py-2.5 font-head text-sm font-bold text-fwm-ink">
        Về trang chủ
      </Link>
    </section>
  );
}

export default NotFound;
```

---

## Ráp nối cuối cùng: `App.jsx` hoàn chỉnh

```jsx
import { Routes, Route } from 'react-router-dom';
import Layout from './components/common/Layout';
import Home from './pages/Home';
import Category from './pages/Category';
import ArticleDetail from './pages/ArticleDetail';
import Search from './pages/Search';
import Favorites from './pages/Favorites';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import Profile from './pages/Profile';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/chuyen-muc" element={<Category />} />
        <Route path="/chuyen-muc/:id" element={<Category />} />
        <Route path="/bai-viet/:id" element={<ArticleDetail />} />
        <Route path="/tim-kiem" element={<Search />} />
        <Route path="/yeu-thich" element={<Favorites />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/gioi-thieu" element={<About />} />
        <Route path="/lien-he" element={<Contact />} />
        <Route path="/dang-nhap" element={<Login />} />
        <Route path="/dang-ky" element={<Register />} />
        <Route path="/ho-so" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
```

**`main.jsx` hoàn chỉnh (thứ tự Provider cuối cùng):**
```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { LangProvider } from './context/LangContext.jsx';
import { FavoritesProvider } from './context/FavoritesContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { PostsProvider } from './context/PostsContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
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
  </StrictMode>
);
```

**Kiểm tra cuối cùng — smoke test toàn app:**
```
Vào /url-khong-ton-tai       → thấy trang 404
Đăng ký → đăng nhập → đổi tên trong /ho-so → lưu thành công
Vào 1 bài viết → bình luận → thấy comment mới ngay lập tức
Tìm kiếm → lọc theo chuyên mục → kết quả đúng
Yêu thích 1 bài → vào /yeu-thich → thấy đúng bài đó
Đăng nhập admin → thêm/sửa/xoá 1 bài viết → phản ánh đúng ở Home
Đổi theme, đổi ngôn ngữ → áp dụng toàn bộ site, giữ nguyên sau F5
```

---

## Xong toàn bộ 6 module rebuild + 2 module đã có (Profile, Comments)

Frontend đã được dựng lại hoàn chỉnh từ đầu, đi qua đúng những concept quan trọng nhất của React: Context tự tạo, custom hook, routing, controlled form, `useMemo`/`useCallback`, tích hợp thư viện ngoài, và các hook nâng cao (`useReducer`, `useLayoutEffect`, `useTransition`, Portal, `forwardRef`) đã học ở Profile/Comments.

Bước tiếp theo (nếu muốn học sâu hơn): `REACT_ROADMAP.md` Module 3 (Toast + HOC) → Module 4 (Performance) → Module 5 (Testing).
