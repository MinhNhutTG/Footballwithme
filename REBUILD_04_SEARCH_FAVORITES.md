# Module 4: Tìm kiếm & Yêu thích

Module ngắn — dùng lại gần như toàn bộ hạ tầng đã có (`usePosts`, `useAuth`, `ArticleCard`). Điểm mới: `FavoritesContext` phải hoạt động cho cả khách chưa đăng nhập (lưu `localStorage`) lẫn user đã đăng nhập (lưu qua API), và `useSearchParams` để state tìm kiếm sống trong URL thay vì chỉ trong component.

---

## Tổng quan file sẽ tạo

```
1. context/FavoritesContext.jsx   — toggle yêu thích, 2 chế độ guest/logged-in
2. pages/Search.jsx                — useSearchParams + useMemo filter
3. pages/Favorites.jsx
```

`api/auth.js` đã có sẵn `toggleFavorite(postId, token)` từ Module 2.

---

## Bước 1 — `context/FavoritesContext.jsx`

**Học được:** 1 Context có thể chọn "chiến lược lưu trữ" khác nhau tuỳ điều kiện runtime (`user` tồn tại hay không) mà nơi gọi (`isFavorite`, `toggleFavorite`) không cần biết chi tiết.

**Vấn đề:** Khách chưa đăng nhập vẫn muốn "lưu tạm" bài yêu thích để dùng thử — không thể gọi API (cần token). Khi đăng nhập, dữ liệu phải đồng bộ lên server để dùng được ở thiết bị khác.

**Làm:**
```jsx
// context/FavoritesContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { toggleFavorite as toggleFavoriteRequest } from '../api/auth';

const FavoritesContext = createContext(null);

function toMap(ids) {
  return Object.fromEntries((ids || []).map((id) => [id, true]));
}

export function FavoritesProvider({ children }) {
  const { user, token, setFavorites } = useAuth();
  const [guestLiked, setGuestLiked] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fwm-favorites') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!user) localStorage.setItem('fwm-favorites', JSON.stringify(guestLiked));
  }, [guestLiked, user]);

  const liked = user ? toMap(user.favorites) : guestLiked;

  const toggleFavorite = async (id) => {
    if (user) {
      try {
        const { favorites } = await toggleFavoriteRequest(id, token);
        setFavorites(favorites);
      } catch {
        // bỏ qua lỗi mạng, UI chỉ đơn giản là không cập nhật
      }
    } else {
      setGuestLiked((prev) => ({ ...prev, [id]: !prev[id] }));
    }
  };

  const isFavorite = (id) => Boolean(liked[id]);

  return (
    <FavoritesContext.Provider value={{ liked, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
```

**Vì sao `FavoritesProvider` phải nằm bên trong `AuthProvider`?** Nó gọi `useAuth()` ngay dòng đầu — nếu đặt ngoài `AuthProvider`, `useAuth()` trả về `null` (giá trị mặc định của `createContext(null)`) và destructure `{ user, token, setFavorites }` sẽ crash.

**Điểm đáng chú ý:** `liked` **không** merge guest + user — khi đăng nhập, danh sách yêu thích lúc còn là khách bị bỏ qua hoàn toàn (chỉ dùng `user.favorites` từ server). Đây là giới hạn đã biết của thiết kế hiện tại, không phải bug cần fix ở module này.

**Input/output cần đạt:**
```
Chưa đăng nhập: toggleFavorite('post1') → guestLiked['post1'] = true, lưu vào localStorage['fwm-favorites']
Đã đăng nhập: toggleFavorite('post1') → gọi POST /api/auth/favorites/post1 → cập nhật user.favorites qua setFavorites
```

---

## Bước 2 — `pages/Search.jsx`

**Học được:** `useSearchParams` — state sống trong query string (`?q=...&cat=...`) thay vì `useState` nội bộ. Lợi ích: F5 refresh hoặc gửi link cho người khác vẫn giữ nguyên kết quả tìm kiếm.

**Làm:**
```jsx
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { usePosts } from '../context/PostsContext';
import ArticleCard from '../components/article/ArticleCard';
import Chip from '../components/ui/Chip';
import { CATEGORIES } from '../data/categories';

function Search() {
  const { t } = useLang();
  const { posts } = usePosts();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const category = searchParams.get('cat') || 'all';

  const setParam = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!value || value === 'all') next.delete(key);
      else next.set(key, value);
      return next;
    });
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((a) => {
      if (category !== 'all' && a.category !== category) return false;
      if (!q) return true;
      const haystack = [a.title.vi, a.title.en, a.excerpt.vi, a.excerpt.en, a.category, ...a.tags]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [posts, query, category]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <input
        type="search"
        autoFocus
        value={query}
        onChange={(e) => setParam('q', e.target.value)}
        placeholder={t.search.placeholder}
        className="w-full rounded-fwm-lg border border-fwm-line bg-fwm-card px-5 py-4 text-fwm-text placeholder:text-fwm-muted focus:border-fwm-accent focus:outline-none"
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Chip active={category === 'all'} onClick={() => setParam('cat', 'all')}>{t.category.allTags}</Chip>
        {CATEGORIES.map((cat) => (
          <Chip key={cat.id} active={category === cat.id} onClick={() => setParam('cat', cat.id)}>
            {t.categories[cat.id].label}
          </Chip>
        ))}
      </div>

      {query && (
        <p className="mt-6 text-sm text-fwm-muted">
          {t.search.resultsFor} <span className="text-fwm-text">"{query}"</span> — {results.length} {t.search.resultsCount}
        </p>
      )}

      <div className="mt-6">
        {results.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-head text-lg font-bold text-fwm-text">{t.search.empty}</p>
            <p className="mt-1 text-sm text-fwm-muted">{t.search.emptyDesc}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((article) => <ArticleCard key={article.id} article={article} />)}
          </div>
        )}
      </div>
    </section>
  );
}

export default Search;
```

**Vì sao `setParam` dùng callback `(prev) => ...` thay vì đọc trực tiếp `searchParams`?** Giống pattern `setState(prev => ...)` — đảm bảo luôn build `next` từ giá trị URL params **mới nhất** tại thời điểm cập nhật, tránh mất field còn lại nếu gọi 2 lần `setParam` liên tiếp (vd gõ ô tìm kiếm ngay sau khi đổi category).

**Bổ sung `dict.js` mục `search`:**
```
search: {
  placeholder: 'Tìm bài viết, kỹ năng, chiến thuật...',
  resultsFor: 'Kết quả cho', resultsCount: 'bài viết được tìm thấy',
  empty: 'Không tìm thấy bài viết phù hợp.', emptyDesc: 'Thử từ khóa khác hoặc chọn một chuyên mục.',
}
```

**Input/output cần đạt:**
```
Gõ "combo" vào ô tìm kiếm → URL đổi thành /tim-kiem?q=combo
→ danh sách lọc theo từ khoá trong title/excerpt/category/tags (không phân biệt hoa thường)
Bấm chip "Kỹ năng" → URL thêm &cat=skill, kết quả lọc thêm theo category
F5 refresh trang → kết quả và chip active giữ nguyên (đọc lại từ URL)
```

---

## Bước 3 — `pages/Favorites.jsx`

**Học được:** Không cần state hay effect riêng — trang chỉ là 1 phép `filter` thuần trên 2 nguồn dữ liệu đã có sẵn từ Context (`posts` và `liked`).

**Làm:**
```jsx
import { useLang } from '../context/LangContext';
import { useFavorites } from '../context/FavoritesContext';
import { usePosts } from '../context/PostsContext';
import ArticleCard from '../components/article/ArticleCard';
import Button from '../components/ui/Button';
import SectionHeading from '../components/common/SectionHeading';

function Favorites() {
  const { t } = useLang();
  const { liked } = useFavorites();
  const { posts } = usePosts();

  const favoriteArticles = posts.filter((a) => liked[a.id]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <SectionHeading title={t.favorites.heading} />

      {favoriteArticles.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-head text-lg font-bold text-fwm-text">{t.favorites.empty}</p>
          <p className="mt-1 text-sm text-fwm-muted">{t.favorites.emptyDesc}</p>
          <Button to="/" variant="primary" className="mt-6 inline-flex">{t.favorites.browseCta}</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {favoriteArticles.map((article) => <ArticleCard key={article.id} article={article} />)}
        </div>
      )}
    </section>
  );
}

export default Favorites;
```

**Bổ sung `dict.js` mục `favorites`:**
```
favorites: { heading: 'Bài viết yêu thích', empty: 'Bạn chưa lưu bài viết nào.', emptyDesc: 'Nhấn vào biểu tượng tim trên bài viết để lưu lại đây.', browseCta: 'Khám phá bài viết' }
```

---

## Ráp nối `App.jsx` + `main.jsx`

**`main.jsx`** — `FavoritesProvider` nằm trong `AuthProvider`, ngoài `PostsProvider` (thứ tự không bắt buộc giữa 2 cái này vì không phụ thuộc nhau, nhưng để nhất quán với code gốc):
```jsx
<AuthProvider>
  <FavoritesProvider>
    <PostsProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PostsProvider>
  </FavoritesProvider>
</AuthProvider>
```

**`App.jsx`:**
```jsx
import Search from './pages/Search';
import Favorites from './pages/Favorites';
// ...
<Route path="/tim-kiem" element={<Search />} />
<Route path="/yeu-thich" element={<Favorites />} />
```

**Kiểm tra:** Chưa đăng nhập → bấm ♡ trên vài bài viết → vào `/yeu-thich` thấy đúng các bài đó. Đăng nhập → bấm ♡ 1 bài → F12 Network thấy `POST /api/auth/favorites/:id` → refresh trang vẫn còn favorite (lưu ở server).

---

## Xong module này, bạn có

- Toàn bộ tính năng public-facing hoàn chỉnh: đọc bài, tìm kiếm, lưu yêu thích (guest lẫn đã đăng nhập).

Tiếp theo: `REBUILD_05_ADMIN.md`.
