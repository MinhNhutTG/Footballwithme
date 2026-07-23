# Module 3: Dữ liệu bài viết (Posts) — Home, Category, ArticleDetail

Xây xương sống dữ liệu của cả app: `PostsContext` fetch danh sách bài viết 1 lần, dùng chung cho Home/Category/ArticleDetail/Search/Favorites/Admin. Đây là module dài nhất vì có 3 trang + nhiều component hiển thị bài viết.

---

## Backend đã có sẵn

| Method | URL | Auth | Body | Trả về |
|--------|-----|------|------|--------|
| GET | `/api/posts` | Không | — | `Post[]` (thêm query `?category=skill` để lọc) |
| GET | `/api/posts/:id` | Không | — | `Post` |
| POST | `/api/posts` | Admin | xem shape bên dưới | `Post` |
| PUT | `/api/posts/:id` | Admin | như trên | `Post` |
| DELETE | `/api/posts/:id` | Admin | — | `{ success: true }` |

Shape `Post` (mỗi field song ngữ là `{ vi, en }`):
```
{
  _id, category: 'skill'|'tactic'|'exp'|'player',
  gradient, tags: string[],
  title: {vi,en}, excerpt: {vi,en}, intro: {vi,en}, body: {vi,en} (HTML, đã sanitize server-side),
  quote: {vi,en}, mistake: {vi,en},
  steps: [{ title:{vi,en}, desc:{vi,en}, keys: [{kind,label}] }],  // chỉ có nếu category === 'skill'
  createdAt, updatedAt
}
```

---

## Tổng quan file sẽ tạo

```
1. api/posts.js                        — fetchPosts/fetchPost/createPost/updatePost/deletePost
2. context/PostsContext.jsx             — Context tự tạo + useCallback refetch
3. components/article/ArticleCard.jsx   — thẻ bài viết (dùng ở Home/Category/Search/Favorites)
4. components/article/PopularItem.jsx   — item trong sidebar "Phổ biến"
5. components/category/CategoryTile.jsx — ô chuyên mục lớn ở Home
6. components/skill/GamepadKey.jsx      — icon nút bấm gamepad
7. components/skill/SkillStep.jsx       — 1 bước hướng dẫn kỹ năng
8. pages/Home.jsx
9. pages/Category.jsx                   — /chuyen-muc và /chuyen-muc/:id (2 chế độ trong 1 file)
10. pages/ArticleDetail.jsx             — /bai-viet/:id
```

---

## Bước 1 — `api/posts.js`

**Học được:** Chuẩn hoá data ngay ở tầng API (`normalize`) — backend trả `_id` (Mongo), nhưng React Router dùng `useParams` trả `id` dạng string thường; chuẩn hoá 1 lần ở đây để phần còn lại của app chỉ cần biết `article.id`.

**Làm:**
```js
// api/posts.js
import { apiRequest } from './client';

function normalize(post) {
  return { ...post, id: post._id };
}

export async function fetchPosts(category) {
  const query = category ? `?category=${category}` : '';
  const posts = await apiRequest(`/posts${query}`);
  return posts.map(normalize);
}

export async function fetchPost(id) {
  const post = await apiRequest(`/posts/${id}`);
  return normalize(post);
}

export async function createPost(data, token) {
  const post = await apiRequest('/posts', { method: 'POST', body: data, token });
  return normalize(post);
}

export async function updatePost(id, data, token) {
  const post = await apiRequest(`/posts/${id}`, { method: 'PUT', body: data, token });
  return normalize(post);
}

export async function deletePost(id, token) {
  return apiRequest(`/posts/${id}`, { method: 'DELETE', token });
}
```

---

## Bước 2 — `context/PostsContext.jsx`

**Học được:** `useCallback` để tạo hàm `refetch` **ổn định** (không đổi identity mỗi render) — cần thiết vì `refetch` nằm trong dependency array của `useEffect` bên dưới; nếu không bọc `useCallback`, `refetch` là hàm mới mỗi render → `useEffect` chạy lại vô hạn.

**Làm:**
```jsx
// context/PostsContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fetchPosts } from '../api/posts';

const PostsContext = createContext(null);

export function PostsProvider({ children }) {
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

  return (
    <PostsContext.Provider value={{ posts, loading, error, refetch }}>
      {children}
    </PostsContext.Provider>
  );
}

export function usePosts() {
  return useContext(PostsContext);
}
```

**Vì sao expose cả `refetch`?** Khi Admin (Module 5) tạo/sửa/xoá bài viết qua `api/posts.js` trực tiếp (không qua Context, vì Admin cần cả bài chưa public), trang public (Home/Category) cần 1 cách để "làm mới" danh sách của mình → gọi `refetch()` từ Context sau khi Admin lưu xong.

**Input/output cần đạt:**
```
usePosts() → { posts: [], loading: true, error: '', refetch }
Sau khi fetch xong → posts: Post[], loading: false
```

---

## Bước 3 — `components/article/ArticleCard.jsx`

**Học được:** Component hiển thị dùng lại ở 5 nơi (Home, Category, Search, Favorites, ArticleDetail-related) — mọi logic yêu thích (`isFavorite`/`toggleFavorite`) nằm gọn trong chính card, nơi gọi nó không cần biết.

**Làm:**
```jsx
import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext';
import { useFavorites } from '../../context/FavoritesContext';

function ArticleCard({ article }) {
  const { lang, t } = useLang();
  const { isFavorite, toggleFavorite } = useFavorites();
  const liked = isFavorite(article.id);
  const catLabel = t.categories[article.category]?.label;

  return (
    <article className="group rounded-fwm-lg border border-fwm-line bg-fwm-card p-3 transition duration-300 hover:-translate-y-1.5 hover:shadow-fwm">
      <Link
        to={`/bai-viet/${article.id}`}
        className={`relative block aspect-[16/10] overflow-hidden rounded-fwm bg-gradient-to-br ${article.gradient}`}
      >
        <span className="absolute left-3 top-3 rounded-fwm-pill bg-fwm-ink/70 px-3 py-1 font-head text-xs font-bold uppercase tracking-wide text-white">
          {catLabel}
        </span>
        <span className="absolute inset-0 flex items-center justify-center font-head text-sm font-bold text-white/70">
          [ {article.tags.join(' · ')} ]
        </span>
      </Link>

      <div className="mt-3 flex items-start justify-between gap-2">
        <h3 className="font-head text-base font-bold leading-snug text-fwm-text">
          <Link to={`/bai-viet/${article.id}`} className="hover:text-fwm-accent">
            {article.title[lang]}
          </Link>
        </h3>
        <button
          type="button"
          aria-label="favorite"
          onClick={() => toggleFavorite(article.id)}
          className={`shrink-0 text-lg transition active:scale-90 ${liked ? 'text-fwm-pink' : 'text-fwm-muted hover:text-fwm-pink'}`}
        >
          {liked ? '♥' : '♡'}
        </button>
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm text-fwm-muted">{article.excerpt[lang]}</p>
    </article>
  );
}

export default ArticleCard;
```

> Component này dùng `useFavorites()` — Context của Module 4. Nếu làm module 3 trước 4, tạm thời comment 2 dòng liên quan favorite hoặc làm Module 4 song song (nó rất ngắn).

---

## Bước 4 — `components/article/PopularItem.jsx`

**Làm:**
```jsx
import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext';

function PopularItem({ article, rank }) {
  const { lang, t } = useLang();

  return (
    <Link to={`/bai-viet/${article.id}`} className="flex items-center gap-3 rounded-fwm px-2 py-2.5 transition hover:bg-fwm-pill">
      <span className="font-head text-xl font-black text-fwm-muted/60">{String(rank).padStart(2, '0')}</span>
      <span className={`h-12 w-16 shrink-0 rounded-fwm bg-gradient-to-br ${article.gradient}`} />
      <span className="min-w-0">
        <span className="block truncate font-head text-sm font-bold text-fwm-text">{article.title[lang]}</span>
        <span className="text-xs text-fwm-muted">{t.categories[article.category]?.label}</span>
      </span>
    </Link>
  );
}

export default PopularItem;
```

---

## Bước 5 — `components/category/CategoryTile.jsx`

**Làm:**
```jsx
import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext';

function CategoryTile({ category, index }) {
  const { t } = useLang();
  const meta = t.categories[category.id];

  return (
    <Link
      to={`/chuyen-muc/${category.id}`}
      className={`group relative block overflow-hidden rounded-fwm-lg bg-gradient-to-br ${category.gradient} p-5 transition duration-300 hover:-translate-y-1.5 hover:shadow-fwm`}
    >
      <span className="font-head text-4xl font-black text-white/30">{String(index + 1).padStart(2, '0')}</span>
      <h3 className="mt-6 font-head text-xl font-extrabold text-white">{meta.label}</h3>
      <p className="mt-1 text-sm text-white/85">{meta.desc}</p>
    </Link>
  );
}

export default CategoryTile;
```

---

## Bước 6 — `components/skill/GamepadKey.jsx` + `SkillStep.jsx`

**Học được:** Map 1 giá trị enum (`kind`) sang class CSS qua object tra cứu (`KIND_STYLES`) — tránh chuỗi `if/else` hoặc `switch` dài.

**`GamepadKey.jsx`:**
```jsx
const KIND_STYLES = {
  cir: 'border-red-400/50 bg-red-500/20 text-red-300',
  sq: 'border-pink-400/50 bg-pink-500/20 text-pink-300',
  tri: 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300',
  cross: 'border-blue-400/50 bg-blue-500/20 text-blue-300',
  default: 'border-fwm-line bg-fwm-pill text-fwm-text',
};

function GamepadKey({ kind = 'default', label }) {
  const shape = kind === 'default' ? 'rounded-fwm-sm px-2.5' : 'rounded-full';
  return (
    <span className={`inline-flex h-8 min-w-8 items-center justify-center border font-head text-xs font-bold ${shape} ${KIND_STYLES[kind] || KIND_STYLES.default}`}>
      {label}
    </span>
  );
}

export default GamepadKey;
```

**`SkillStep.jsx`:**
```jsx
import { useLang } from '../../context/LangContext';
import GamepadKey from './GamepadKey';

function SkillStep({ step, index }) {
  const { lang } = useLang();

  return (
    <div className="flex gap-4 rounded-fwm-lg border border-fwm-line bg-fwm-card p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fwm-accent font-head text-sm font-black text-fwm-ink">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="font-head text-sm font-bold text-fwm-text">{step.title[lang]}</h4>
        <p className="mt-1 text-sm text-fwm-muted">{step.desc[lang]}</p>
        <div className="mt-3 flex gap-2">
          {step.keys.map((key, i) => (
            <GamepadKey key={i} kind={key.kind} label={key.label} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default SkillStep;
```

---

## Bước 7 — `pages/Home.jsx`

**Học được:** Kết hợp data tĩnh (hero section, `data/categories.js`) với data động (`usePosts().posts.slice(0, 6)`).

**Làm:**
```jsx
import { useLang } from '../context/LangContext';
import { usePosts } from '../context/PostsContext';
import SectionHeading from '../components/common/SectionHeading';
import ArticleCard from '../components/article/ArticleCard';
import CategoryTile from '../components/category/CategoryTile';
import Button from '../components/ui/Button';
import { CATEGORIES } from '../data/categories';

const COMBO_KEYS = [
  { label: '△', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' },
  { label: '□', className: 'bg-pink-500/20 text-pink-300 border-pink-400/40' },
  { label: '✕', className: 'bg-blue-500/20 text-blue-300 border-blue-400/40' },
  { label: '○', className: 'bg-red-500/20 text-red-300 border-red-400/40' },
];

function Home() {
  const { t } = useLang();
  const { posts } = usePosts();
  const latest = posts.slice(0, 6);

  return (
    <div className="animate-fwm-in">
      <section className="relative overflow-hidden border-b border-fwm-line bg-fwm-bg-deep">
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center rounded-fwm-pill border border-fwm-line bg-fwm-pill px-3 py-1 font-head text-xs font-bold uppercase tracking-wider text-fwm-accent">
              {t.hero.kicker}
            </span>
            <h1 className="mt-5 font-head text-4xl font-black leading-[1.1] text-fwm-text sm:text-5xl">
              {t.hero.headline1}<br />
              <span className="text-fwm-accent">{t.hero.headline2}</span>
            </h1>
            <p className="mt-5 max-w-md text-base text-fwm-muted">{t.hero.desc}</p>
            <div className="mt-6 flex items-center gap-2">
              {COMBO_KEYS.map((key, i) => (
                <span key={i} className={`flex h-9 w-9 items-center justify-center rounded-full border font-head text-sm font-bold ${key.className}`}>
                  {key.label}
                </span>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button to="/chuyen-muc" variant="primary">{t.hero.ctaPrimary}</Button>
              <Button to="/chuyen-muc" variant="ghost">{t.hero.ctaSecondary}</Button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-fwm-line pt-6">
              <div><div className="font-head text-2xl font-extrabold text-fwm-text">120+</div><div className="text-xs text-fwm-muted">{t.hero.statArticles}</div></div>
              <div><div className="font-head text-2xl font-extrabold text-fwm-text">40+</div><div className="text-xs text-fwm-muted">{t.hero.statSkills}</div></div>
              <div><div className="font-head text-2xl font-extrabold text-fwm-text">8K+</div><div className="text-xs text-fwm-muted">{t.hero.statPlayers}</div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading title={t.section.latest} viewAllTo="/chuyen-muc" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map((article) => <ArticleCard key={article.id} article={article} />)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading title={t.section.categories} />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((cat, i) => <CategoryTile key={cat.id} category={cat} index={i} />)}
        </div>
      </section>
    </div>
  );
}

export default Home;
```

**Bổ sung `dict.js` mục `hero`** (đủ 2 ngôn ngữ, tự điền theo văn phong đã dùng ở các mục khác):
```
hero: {
  kicker: 'eFOOTBALL CONTENT HUB',
  headline1: 'Chơi hay hơn,', headline2: 'mỗi trận một bước tiến.',
  desc: 'Kỹ năng, chiến thuật và kinh nghiệm thực chiến eFootball — tổng hợp từ cộng đồng, viết lại dễ hiểu cho người mới.',
  ctaPrimary: 'Khám phá bài viết', ctaSecondary: 'Xem chuyên mục',
  statArticles: 'bài viết', statSkills: 'kỹ năng', statPlayers: 'người chơi theo dõi',
}
```

**Kiểm tra:** Vào `/` → thấy hero + 6 bài viết mới nhất + 4 ô chuyên mục. Nếu backend chưa seed data, `latest` rỗng — không lỗi, chỉ không hiện card nào.

---

## Bước 8 — `pages/Category.jsx`: 2 chế độ trong 1 file

**Học được:** 1 file route xử lý 2 URL khác nhau (`/chuyen-muc` và `/chuyen-muc/:id`) bằng cách kiểm tra `useParams().id` có tồn tại không, rồi render 1 trong 2 sub-component nội bộ. `useMemo` để tính `tags` và `categoryArticles` — tránh tính lại filter/dedupe mỗi lần re-render không liên quan.

**Làm:**
```jsx
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { usePosts } from '../context/PostsContext';
import SectionHeading from '../components/common/SectionHeading';
import ArticleCard from '../components/article/ArticleCard';
import CategoryTile from '../components/category/CategoryTile';
import PopularItem from '../components/article/PopularItem';
import Chip from '../components/ui/Chip';
import { CATEGORIES } from '../data/categories';

function CategoryOverview() {
  const { t } = useLang();
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <SectionHeading title={t.section.categories} />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map((cat, i) => <CategoryTile key={cat.id} category={cat} index={i} />)}
      </div>
    </section>
  );
}

function CategoryDetail({ categoryId }) {
  const { t } = useLang();
  const { posts } = usePosts();
  const [activeTag, setActiveTag] = useState('all');

  const category = CATEGORIES.find((c) => c.id === categoryId);
  const meta = t.categories[categoryId];
  const categoryArticles = useMemo(
    () => posts.filter((a) => a.category === categoryId),
    [posts, categoryId]
  );
  const tags = useMemo(
    () => Array.from(new Set(categoryArticles.flatMap((a) => a.tags))),
    [categoryArticles]
  );
  const filtered = activeTag === 'all' ? categoryArticles : categoryArticles.filter((a) => a.tags.includes(activeTag));
  const popular = posts.slice(0, 5);

  if (!category) return null;

  return (
    <div>
      <section className={`border-b border-fwm-line bg-gradient-to-br ${category.gradient} px-4 py-14`}>
        <div className="mx-auto max-w-6xl">
          <h1 className="font-head text-3xl font-black text-white sm:text-4xl">{meta.label}</h1>
          <p className="mt-2 max-w-md text-white/85">{meta.desc}</p>
          <p className="mt-4 font-head text-xs font-bold uppercase tracking-wide text-white/70">
            {categoryArticles.length} {t.category.countSuffix}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 lg:grid-cols-[1fr_280px]">
        <div>
          <div className="mb-6 flex flex-wrap gap-2">
            <Chip active={activeTag === 'all'} onClick={() => setActiveTag('all')}>{t.category.allTags}</Chip>
            {tags.map((tag) => (
              <Chip key={tag} active={activeTag === tag} onClick={() => setActiveTag(tag)}>{tag}</Chip>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="text-fwm-muted">{t.category.empty}</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {filtered.map((article) => <ArticleCard key={article.id} article={article} />)}
            </div>
          )}
        </div>

        <aside>
          <h3 className="mb-3 font-head text-sm font-bold uppercase tracking-wide text-fwm-text">{t.category.popularHeading}</h3>
          <div className="rounded-fwm-lg border border-fwm-line bg-fwm-card p-2">
            {popular.map((article, i) => <PopularItem key={article.id} article={article} rank={i + 1} />)}
          </div>
        </aside>
      </section>
    </div>
  );
}

function Category() {
  const { id } = useParams();
  return id ? <CategoryDetail categoryId={id} /> : <CategoryOverview />;
}

export default Category;
```

**Bổ sung `dict.js` mục `category`:**
```
category: { allTags: 'Tất cả', empty: 'Chưa có bài viết nào cho bộ lọc này.', popularHeading: 'Phổ biến', countSuffix: 'bài viết' }
```

**Input/output cần đạt:**
```
/chuyen-muc              → thấy 4 ô chuyên mục lớn
/chuyen-muc/skill        → thấy header màu gradient category, chip filter theo tag, danh sách bài, sidebar Phổ biến
Bấm 1 chip tag           → danh sách lọc lại theo tag đó (client-side, không gọi API)
```

---

## Bước 9 — `pages/ArticleDetail.jsx`

**Học được:** `dangerouslySetInnerHTML` để render HTML đã soạn sẵn (rich text từ Admin, Module 5) — **chỉ an toàn vì HTML đã được `sanitize-html` xử lý ở backend trước khi lưu, và chỉ admin mới ghi được**. Không bao giờ dùng `dangerouslySetInnerHTML` với nội dung do user thường tự nhập mà chưa qua sanitize.

**Làm:**
```jsx
import { Link, useParams } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useFavorites } from '../context/FavoritesContext';
import { usePosts } from '../context/PostsContext';
import ArticleCard from '../components/article/ArticleCard';
import PopularItem from '../components/article/PopularItem';
import SkillStep from '../components/skill/SkillStep';

function ArticleDetail() {
  const { id } = useParams();
  const { lang, t } = useLang();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { posts, loading } = usePosts();

  const article = posts.find((a) => a.id === id);

  if (!article) {
    if (loading) return null;
    return (
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-fwm-muted">{t.category.empty}</p>
        <Link to="/" className="mt-4 inline-block font-head text-sm font-bold text-fwm-accent">
          {t.contact.backHome}
        </Link>
      </section>
    );
  }

  const liked = isFavorite(article.id);
  const isSkill = article.category === 'skill';
  const popular = posts.slice(0, 5);
  const related = posts.filter((a) => a.category === article.category && a.id !== article.id).slice(0, 3);

  return (
    <div>
      <section className={`relative border-b border-fwm-line bg-gradient-to-br ${article.gradient} px-4 py-16`}>
        <div className="mx-auto max-w-4xl">
          <Link to={`/chuyen-muc/${article.category}`} className="font-head text-xs font-bold uppercase tracking-wide text-white/80 hover:text-white">
            ← {t.categories[article.category]?.label}
          </Link>
          <h1 className="mt-3 font-head text-3xl font-black text-white sm:text-4xl">{article.title[lang]}</h1>
          <div className="mt-4 flex items-center gap-3">
            {article.tags.map((tag) => (
              <span key={tag} className="rounded-fwm-pill bg-fwm-ink/60 px-3 py-1 text-xs font-bold text-white">{tag}</span>
            ))}
            <button
              type="button"
              onClick={() => toggleFavorite(article.id)}
              className={`ml-auto text-2xl transition active:scale-90 ${liked ? 'text-fwm-pink' : 'text-white/70 hover:text-fwm-pink'}`}
              aria-label="favorite"
            >
              {liked ? '♥' : '♡'}
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 lg:grid-cols-[1fr_280px]">
        <article className="min-w-0">
          {isSkill && (
            <div className="mb-8 overflow-hidden rounded-fwm-lg border border-fwm-line bg-fwm-card-2">
              <div className={`relative flex aspect-video items-center justify-center bg-gradient-to-br ${article.gradient}`}>
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-2xl text-fwm-ink">▶</span>
              </div>
              <p className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.article.videoCaption}</p>
            </div>
          )}

          <p className="text-lg leading-relaxed text-fwm-text">{article.intro[lang]}</p>

          {isSkill && article.steps && (
            <div className="mt-8">
              <h2 className="mb-4 font-head text-xl font-extrabold text-fwm-text">{t.article.stepsHeading}</h2>
              <div className="space-y-3">
                {article.steps.map((step, i) => <SkillStep key={i} step={step} index={i} />)}
              </div>
            </div>
          )}

          <div
            className="prose-content mt-8 leading-relaxed text-fwm-muted"
            // sanitized server-side (sanitize-html) before storage, admin-only write access
            dangerouslySetInnerHTML={{ __html: article.body[lang] }}
          />

          <blockquote className="mt-8 rounded-fwm-lg border-l-4 border-fwm-accent bg-fwm-card px-5 py-4 font-head text-lg font-bold italic text-fwm-text">
            "{article.quote[lang]}"
          </blockquote>

          <div className="mt-8 rounded-fwm-lg border border-fwm-pink/30 bg-fwm-pink/10 px-5 py-4">
            <p className="font-head text-xs font-bold uppercase tracking-wide text-fwm-pink">{t.article.mistakeLabel}</p>
            <p className="mt-1.5 text-sm text-fwm-text">{article.mistake[lang]}</p>
          </div>
        </article>

        <aside>
          <h3 className="mb-3 font-head text-sm font-bold uppercase tracking-wide text-fwm-text">{t.category.popularHeading}</h3>
          <div className="rounded-fwm-lg border border-fwm-line bg-fwm-card p-2">
            {popular.map((a, i) => <PopularItem key={a.id} article={a} rank={i + 1} />)}
          </div>
        </aside>
      </section>

      {related.length > 0 && (
        <section className="mx-auto max-w-6xl border-t border-fwm-line px-4 py-12">
          <h2 className="mb-6 font-head text-xl font-extrabold text-fwm-text">{t.article.relatedHeading}</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}

export default ArticleDetail;
```

**Bổ sung `dict.js` mục `article`:**
```
article: { mistakeLabel: 'Lỗi cần tránh', relatedHeading: 'Bài viết liên quan', backToCategory: 'Quay lại chuyên mục', stepsHeading: 'Hướng dẫn từng bước', videoCaption: 'Xem video minh họa' }
```

> Ghi chú: `<CommentSection postId={article.id} />` sẽ thêm vào cuối file này khi làm `COMMENTS_MODULE.md` (đã xong trong project — chỉ cần import + đặt sau phần related articles).

**Kiểm tra:** Vào 1 bài viết bất kỳ → thấy đủ: banner category + tiêu đề + tag + nút yêu thích, đoạn intro, (nếu category=skill) video giả lập + các bước hướng dẫn, nội dung HTML, quote, mistake box, sidebar phổ biến, bài viết liên quan.

---

## Ráp nối `App.jsx` + `main.jsx`

**`main.jsx`** — thêm `PostsProvider`, nằm trong `AuthProvider` (không phụ thuộc Auth nhưng đặt sau cho nhất quán thứ tự data-fetching), ngoài `BrowserRouter`:
```jsx
import { PostsProvider } from './context/PostsContext.jsx';
// ...
<AuthProvider>
  <PostsProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </PostsProvider>
</AuthProvider>
```

**`App.jsx`:**
```jsx
import Home from './pages/Home';
import Category from './pages/Category';
import ArticleDetail from './pages/ArticleDetail';
// ...
<Route path="/" element={<Home />} />
<Route path="/chuyen-muc" element={<Category />} />
<Route path="/chuyen-muc/:id" element={<Category />} />
<Route path="/bai-viet/:id" element={<ArticleDetail />} />
```

---

## Xong module này, bạn có

- Toàn bộ trải nghiệm đọc bài viết công khai: Home → Category → ArticleDetail.
- `usePosts()` dùng lại được ở Search, Favorites, Admin, About.

Tiếp theo: `REBUILD_04_SEARCH_FAVORITES.md`.
