# Module: Phân trang công khai (Home + Category)

Module fullstack tiếp theo sau Quản lý danh mục (`CATEGORY_MANAGEMENT_MODULE.md`, ✅) + đợt code review vừa xong. Hiện `Home`/`Category`/`Search`/`Favorites` đều đọc chung 1 mảng `posts` fetch **toàn bộ 1 lần** từ `PostsContext` (`GET /api/posts` không tham số), mỗi trang tự filter/sort/slice ở client.

## Khảo sát hiện trạng (trước khi viết spec)

- **DB hiện chỉ có 10 bài viết** — vấn đề hiệu năng "fetch toàn bộ" chưa cấp bách về băng thông ở quy mô hiện tại, nhưng thiết kế đúng vẫn có giá trị khi nội dung tăng, và giải quyết luôn 1 lỗi có sẵn (`Category.jsx` từng vỡ layout — đã sửa ở lượt trước — một phần do dồn quá nhiều logic client-side vào 1 trang).
- **`backend/src/controllers/postController.js` hàm `list`**: chỉ nhận `category` filter, không có `page`/`limit`/`sort`, trả thẳng mảng JSON (không bọc `{data, total}`).
- **`frontend-rebuild/src/api/posts.js` `fetchPosts(category)`**: nhận 1 tham số `category` duy nhất (dạng vị trí, không phải object), trả về mảng đã `normalize`.
- **`PostsContext.jsx`**: fetch toàn bộ 1 lần lúc app mount, expose `{posts, loading, error, refetch}` — dùng chung bởi `Home`, `Category`, `Search`, `Favorites`, `ArticleDetail`, `About`.
- **Điểm quan trọng nhất phát hiện khi khảo sát — "Phổ biến" sidebar dùng ở CẢ `Category.jsx` lẫn `ArticleDetail.jsx` tự sort toàn bộ `posts` theo `views` ở client** (`[...posts].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,5)`) — nếu trang chỉ fetch 1 trang dữ liệu, logic này vỡ ngay vì không còn quyền truy cập toàn bộ mảng để sort.
- **Tag filter chip ở `Category.jsx`** hiện derive từ `categoryArticles` (đã filter theo category) — nếu chuyển sang phân trang, tag list tính từ 1 trang sẽ thiếu/đổi liên tục giữa các trang, cần nguồn riêng độc lập với trang hiện tại.
- **`Admin.jsx`** gọi `fetchPosts()` **độc lập hoàn toàn** với `PostsContext` (không qua `usePosts()`) — đổi shape response ở `list()` backend vẫn cần sửa `Admin.jsx` vì nó cũng gọi `fetchPosts()`, nhưng không liên quan gì tới logic filter/sort/phân trang riêng của Admin (đã có `ADMIN_PAGINATION_MODULE.md` xử lý phân trang phía Admin từ trước, không đụng lại).
- **`ArticleCard.jsx`/`PopularItem.jsx`** không cần field nội dung dài (`intro/body/quote/mistake/steps`) — nhưng module này **không** trim field khỏi response listing (xem "Quyết định đã chốt" #1) để giữ phạm vi gọn, chấp nhận payload dư thừa tạm thời.

## Quyết định đã chốt

Chốt qua `AskUserQuestion`:

1. **Phạm vi: chỉ `Category` (phân trang backend thật) + `Home` (giới hạn fetch 6 bài mới nhất, không cần nút trang).** `Search` và `Favorites` **giữ nguyên client-side** như hiện tại — chuyển search sang backend cần thêm regex/`$text` search phức tạp hơn nhiều, không đáng đầu tư ở quy mô 10 bài. `ArticleDetail`/`About` cũng giữ nguyên (vẫn dùng `usePosts()` full fetch qua `PostsContext`, không đổi gì).
2. **"Phổ biến" tách thành tham số `sort=views` tái dùng ngay trên endpoint `list` có sẵn** (không tạo route `/popular` riêng — tránh luôn rủi ro thứ tự route `/:id` từng gây bug ở project này trước đây) — gọi `fetchPosts({ sort: 'views', limit: 5 })`.

**Hệ quả kỹ thuật phát sinh (không cần hỏi lại — bắt buộc để giữ tương thích ngược):** đổi shape response của `GET /api/posts` từ mảng trần sang `{data, total, page, pages, tags}` ảnh hưởng **mọi nơi gọi `fetchPosts()`**, kể cả những chỗ không đụng tới phân trang (`PostsContext.jsx`, `Admin.jsx`) — 2 chỗ này phải sửa nhỏ (`.then(setPosts)` → `.then(res => setPosts(res.data))`) dù bản thân không nằm trong phạm vi module, nếu không sẽ vỡ ngay vì set cả object `{data,...}` vào state tưởng là mảng.

---

## Kiến trúc chung

```
GET /api/posts?category=X&tag=Y&page=N&limit=M&sort=views
        │
        ▼
postController.list()
  filter: {category, tags: tag}
  sort: views hoặc createdAt (mặc định)
  page+limit: optional — không truyền thì trả toàn bộ (tương thích ngược)
        │
        ▼
{ data: [...posts], total, page, pages, tags: [...] }
   (tags: distinct tags theo category, độc lập trang hiện tại — chỉ tính khi có category)

Home.jsx          → fetchPosts({limit: 6})                     (fetch riêng, không qua PostsContext)
Category.jsx      → fetchPosts({category, tag, page, limit})   (fetch riêng, own state)
                   → fetchPosts({sort:'views', limit:5})        ("Phổ biến", fetch riêng thứ 2)
PostsContext.jsx  → fetchPosts()                                (không đổi gì về hành vi, chỉ đổi cách đọc response)
Admin.jsx         → fetchPosts()                                (không đổi gì về hành vi, chỉ đổi cách đọc response)
Search/Favorites/ArticleDetail/About → usePosts() như cũ, không đụng
```

---

## Bước 1 — Backend: `postController.js` hàm `list`

**Sửa `backend/src/controllers/postController.js`** — chỉ đổi hàm `list`, các hàm khác giữ nguyên:

```js
async function list(req, res, next) {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.tag) filter.tags = req.query.tag;

    const page = req.query.page ? Math.max(1, parseInt(req.query.page)) : null;
    const limit = req.query.limit ? Math.max(1, parseInt(req.query.limit)) : null;
    const sortField = req.query.sort === 'views' ? { views: -1 } : { createdAt: -1 };

    let query = Post.find(filter).sort(sortField);
    if (limit) {
      query = query.limit(limit);
      if (page) query = query.skip((page - 1) * limit);
    }

    const [data, total, tags] = await Promise.all([
      query,
      Post.countDocuments(filter),
      req.query.category ? Post.distinct('tags', { category: req.query.category }) : Promise.resolve([]),
    ]);

    res.json({
      data,
      total,
      page: page || 1,
      pages: limit ? Math.max(1, Math.ceil(total / limit)) : 1,
      tags,
    });
  } catch (err) {
    next(err);
  }
}
```

Điểm cần hiểu, không phải chỗ dễ gõ sai nhưng dễ hiểu nhầm logic:
- `tags` luôn tính theo `{category: req.query.category}` (chỉ lọc category, **không** kèm `tags: tag` đang chọn) — nếu tính theo `filter` đầy đủ (có cả `tag` đang lọc), tag đang được chọn có thể tự biến mất khỏi danh sách chip do kết quả lọc chỉ còn đúng 1 tag đó.
- Không truyền `page`/`limit` (như `PostsContext`/`Admin.jsx` đang gọi) → `query` không `.limit()`/`.skip()` gì cả → **hành vi y hệt trước khi có module này**, chỉ khác ở chỗ response giờ bọc trong `{data,...}` thay vì mảng trần.
- `req.query.tag` filter bằng `filter.tags = req.query.tag` (không phải `$in`/`$elemMatch`) — Mongoose/MongoDB tự hiểu `{tags: "abc"}` nghĩa là "mảng `tags` có chứa phần tử `abc`", không cần operator đặc biệt.

**Kiểm tra (Postman/curl):**
- `GET /api/posts` (không tham số) → vẫn trả `{data: [...toàn bộ 10 bài...], total: 10, page: 1, pages: 1, tags: []}`.
- `GET /api/posts?category=skill&limit=2&page=1` → `data` chỉ 2 bài, `total` = tổng số bài category `skill` (không phải 2), `pages` = `ceil(total/2)`.
- `GET /api/posts?sort=views&limit=5` → 5 bài xem nhiều nhất toàn site, sort đúng theo `views` giảm dần.

---

## Bước 2 — Frontend: `api/posts.js` — đổi `fetchPosts` sang nhận object tham số

**Sửa `frontend-rebuild/src/api/posts.js`** — chỉ đổi hàm `fetchPosts`, các hàm khác giữ nguyên:

```js
export async function fetchPosts({ category, tag, page, limit, sort } = {}) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (tag) params.set('tag', tag);
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    if (sort) params.set('sort', sort);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiRequest(`/posts${query}`, { method: 'GET' });
    return { ...res, data: res.data.map((post) => normalize(post)) };
}
```

**Đổi chữ ký hàm — từ `fetchPosts(category)` (tham số vị trí, 1 chuỗi) sang `fetchPosts({category, tag, page, limit, sort})` (1 object, mọi field optional).** Đây là **breaking change** cho MỌI nơi đang gọi `fetchPosts(...)` — xem Bước 3-5, phải sửa hết các lời gọi cũ.

**Kiểm tra:** gọi thử `fetchPosts()` trong console trình duyệt (khi đã có `apiRequest` sẵn) → trả về object có `.data` là mảng, không phải mảng trần.

---

## Bước 3 — Frontend: sửa 2 nơi gọi `fetchPosts()` không đổi hành vi (bắt buộc, tránh vỡ)

**Sửa `frontend-rebuild/src/context/PostsContext.jsx`** — đổi đúng 1 dòng trong `refetch`:
```js
const refetch = useCallback(() => {
    setLoading(true);
    return fetchPosts()
        .then((res) => setPosts(res.data))
        .catch((err) => setError(err.message))
        .finally(() => { setLoading(false) })
}, [])
```

**Sửa `frontend-rebuild/src/pages/Admin.jsx`** — đổi đúng 1 dòng trong `useEffect` fetch bài viết:
```js
useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    fetchPosts()
        .then((res) => setPosts(res.data)).catch((err) => setError(err.message)).finally(() => setLoading(false))
}, [isAdmin])
```

**Kiểm tra:** `Search.jsx`, `Favorites.jsx`, `ArticleDetail.jsx`, `About.jsx` (đều đọc `posts` qua `usePosts()`, không gọi `fetchPosts()` trực tiếp) **không cần sửa gì** — vẫn nhận đúng mảng `posts` như cũ, vì `PostsContext` đã tự "bóc" `res.data` ra trước khi set vào state.

---

## Bước 4 — Frontend: `Home.jsx` — fetch riêng 6 bài mới nhất

**Sửa `frontend-rebuild/src/pages/Home.jsx`:**

1. Đổi import — xoá `import { usePosts } from '../context/PostsContext'`, thêm:
```js
import { useEffect, useState } from 'react'
import { fetchPosts } from '../api/posts'
```

2. Trong component `Home`, đổi:
```js
const { t } = useLang();
const { posts } = usePosts();
const { categories } = useCategories();
const lastes = posts.slice(0, 6);
```
thành:
```js
const { t } = useLang();
const { categories } = useCategories();
const [latest, setLatest] = useState([]);

useEffect(() => {
    fetchPosts({ limit: 6 })
        .then((res) => setLatest(res.data))
        .catch(() => {});
}, []);
```

3. Đổi dòng render (đổi tên biến `lastes` → `latest`, khớp tên mới):
```jsx
{lastes.map((article) => <ArticleCard key={article.id} article={article} ></ArticleCard>)}
```
thành:
```jsx
{latest.map((article) => <ArticleCard key={article.id} article={article} ></ArticleCard>)}
```

**Kiểm tra:** trang chủ vẫn hiện đúng 6 bài mới nhất như trước — chỉ khác ở chỗ backend giờ chỉ trả về đúng 6 bài thay vì trả cả 10 rồi cắt ở client.

---

## Bước 5 — Frontend: `Category.jsx` — phân trang thật + tách "Phổ biến"

**Sửa `frontend-rebuild/src/pages/Category.jsx`** — dán lại toàn bộ file (chỉ `CategoryDetail` đổi nhiều, `CategoryOverview`/`Category` giữ nguyên):

```jsx
import { useEffect, useState } from "react";
import CategoryTile from "../components/article/CategoryTile";
import SectionHeading from "../components/common/SectionHeading"
import { useLang } from "../context/LangContext"
import { useCategories } from "../context/CategoryContext";
import { fetchPosts } from "../api/posts";
import Chip from '../components/ui/Chip'
import ArticleCard from "../components/article/ArticleCard";
import PopularItem from '../components/article/PopularItem'
import Button from '../components/ui/Button'
import { useParams } from "react-router-dom";

const POSTS_PER_PAGE = 6;

function CategoryOverview() {
    const { t } = useLang();
    const { categories } = useCategories();
    return (
        <section className="mx-auto max-w-6xl px-4 py-14">
            <SectionHeading title={t.section.categories}></SectionHeading>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {categories.map((cat) => (
                    <CategoryTile key={cat._id} category={cat}></CategoryTile>
                ))}
            </div>
        </section>
    )
}

function CategoryDetail({ categoryId }) {
    const { lang, t } = useLang();
    const { categories } = useCategories();
    const [activeTag, setActiveTag] = useState('all');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState({ data: [], total: 0, pages: 1, tags: [] });
    const [loading, setLoading] = useState(true);
    const [popular, setPopular] = useState([]);

    const category = categories.find((c) => c.slug === categoryId);

    useEffect(() => {
        setPage(1);
    }, [categoryId, activeTag]);

    useEffect(() => {
        setLoading(true);
        fetchPosts({
            category: categoryId,
            tag: activeTag === 'all' ? undefined : activeTag,
            page,
            limit: POSTS_PER_PAGE,
        })
            .then(setResult)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [categoryId, activeTag, page]);

    useEffect(() => {
        fetchPosts({ sort: 'views', limit: 5 })
            .then((res) => setPopular(res.data))
            .catch(() => {});
    }, []);

    if (!category) return null;
    return (
        <>
            <section
                className={`relative border-b border-fwm-line px-4 py-14 ${category.imageUrl ? 'bg-cover bg-center' : `bg-gradient-to-br ${category.gradient}`}`}
                style={category.imageUrl ? { backgroundImage: `url(${category.imageUrl})` } : undefined}
            >
                {category.imageUrl && <div className="absolute inset-0 bg-fwm-ink/50" />}
                <div className="relative mx-auto max-w-6xl">
                    <h1 className="font-head text-3xl font-black text-white sm:text-4xl">
                        {category.label[lang]}
                    </h1>
                    <p className="mt-2 max-w-md text-white/85"> {category.desc[lang]}</p>
                    <p className="mt-4 font-head text-xs font-bold uppercase tracking-wide text-white/70">
                        {result.total} {t.category.countSuffix}
                    </p>
                </div>
            </section >
            <section className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 lg:grid-cols-[1fr_280px]">
                <div className="min-w-0">
                    <div className="mb-6 flex flex-wrap gap-2">
                        <Chip active={activeTag === 'all'} onClick={() => setActiveTag('all')}>
                            {t.category.allTags}
                        </Chip>
                        {result.tags.map((tag) => (
                            <Chip key={tag} active={activeTag === tag} onClick={() => setActiveTag(tag)}>{tag}</Chip>
                        ))}
                    </div>
                    {!loading && result.data.length === 0 ? (
                        <p className="text-fwm-muted">{t.category.empty}</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            {result.data.map((article) => <ArticleCard key={article.id} article={article}></ArticleCard>)}
                        </div>
                    )}
                    {result.pages > 1 && (
                        <div className="mt-6 flex items-center justify-between">
                            <p className="text-sm text-fwm-muted">
                                Trang {page}/{result.pages}
                            </p>
                            <div className="flex gap-2">
                                <Button type="button" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                                    Trước
                                </Button>
                                <Button type="button" variant="ghost" disabled={page >= result.pages} onClick={() => setPage((p) => p + 1)}>
                                    Sau
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <aside>
                    <h3 className="mb-3 font-head text-sm font-bold uppercase tracking-wide text-fwm-text">
                        {t.category.popularHeading}
                    </h3>
                    <div className="rounded-fwm-lg border border-fwm-line bg-fwm-card p-2">
                        {popular.map((article, i) => <PopularItem key={article.id} article={article} rank={i + 1}></PopularItem>)}
                    </div>
                </aside>
            </section>
        </>
    )
}

function Category() {
    const { id } = useParams();
    return id ? <CategoryDetail categoryId={id}></CategoryDetail> : <CategoryOverview></CategoryOverview>;
}

export default Category;
```

Điểm dễ nhầm nếu tự gõ lại:
- **2 `useEffect` fetch riêng biệt** — 1 cho danh sách bài viết chính (phụ thuộc `categoryId`/`activeTag`/`page`), 1 cho "Phổ biến" (chạy đúng 1 lần lúc mount, mảng dependency rỗng `[]`, không phụ thuộc category/tag/page vì "Phổ biến" luôn là top 5 toàn site). Gộp nhầm 2 effect này thành 1 sẽ khiến "Phổ biến" bị fetch lại không cần thiết mỗi lần đổi trang/tag.
- **`useEffect` reset `page` về 1** đặt tách riêng, chạy trước effect fetch chính, phụ thuộc `[categoryId, activeTag]` (không có `page` trong mảng dependency của effect này) — nếu lỡ thêm `page` vào đây sẽ tạo vòng lặp vô hạn (set `page` lại kích hoạt chính effect đang theo dõi `page`).
- **`result.tags`** (danh sách chip) lấy từ response backend, **không** derive từ `result.data` (bài viết trang hiện tại) — nếu lấy nhầm từ `result.data`, chip tag sẽ đổi khác nhau giữa các trang thay vì cố định theo toàn bộ category.
- **`!loading && result.data.length === 0`** — phải có `!loading` phía trước, nếu không lúc đang tải trang mới (giữa 2 trang) sẽ thấy chớp "Không tìm thấy kết quả" trước khi dữ liệu trang mới về.

**Kiểm tra:**
- Vào 1 category có nhiều hơn 6 bài (cần tạo thêm bài test qua Admin nếu category nào cũng đang <6 bài) → thấy nút phân trang, bấm "Sau" load đúng 6 bài tiếp theo, `total`/số đếm ở banner không đổi theo trang.
- Bấm chọn 1 tag chip → tự động về trang 1, danh sách lọc đúng theo tag, tag chip vẫn hiện đủ (không mất chip đang chọn).
- "Phổ biến" sidebar hiện đúng top 5 toàn site theo views, không đổi khi chuyển trang/đổi tag trong danh sách chính.
- Category có ≤ 6 bài → không hiện thanh phân trang (`result.pages > 1` false).
- Vào category rỗng (chưa có bài nào) → hiện đúng thông báo trống, không phải màn hình chớp trắng.

---

## Còn cần bạn chốt

Không có — cả 2 quyết định chính (phạm vi Category+Home, cách xử lý "Phổ biến") đã chốt qua `AskUserQuestion` trước khi viết tài liệu này.
