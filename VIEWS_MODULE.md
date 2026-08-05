# Module: Lượt xem bài viết + "Phổ biến" tính thật

Module fullstack tiếp theo sau Phân trang Admin (`ADMIN_PAGINATION_MODULE.md`, ✅ xong). Mục tiêu: tính năng hướng tới người dùng để tạo "social proof" (thấy bài đang được nhiều người đọc → tò mò bấm vào), đồng thời sửa đúng chỗ đang giả hiện tại — sidebar "Phổ biến" ở `Category.jsx` và `ArticleDetail.jsx` hiện chỉ lấy 5 bài đầu tiên trong mảng (`posts.slice(0, 5)`), không dựa trên bất kỳ số liệu thật nào.

Module thứ 2 trong cặp module "thu hút người dùng" đã bàn — module còn lại (Like/Dislike/Haha/Giận dữ bằng icon cartoon AI-generated) làm **sau**, xem ghi chú ở cuối file.

---

## Quyết định đã chốt

Chốt qua `AskUserQuestion`, 2 câu:

1. **Cách tính view:** tăng **mỗi lần mở trang bài viết**, không phân biệt user/session (kể cả F5 liên tục vẫn +1 mỗi lần). Không cần bảng phụ lưu "ai đã xem" — chỉ số tham khảo, không phải dữ liệu nghiệp vụ cần chính xác tuyệt đối.
2. **Hiển thị công khai:** **có** — hiện số lượt xem ngay trên `ArticleCard` (danh sách bài viết) và `ArticleDetail` (trang chi tiết), không chỉ dùng ngầm để sắp xếp.

**Không cần migration DB:** khác với field `isVerified` ở module Email Verification (field đó *chặn* đăng nhập nên bắt buộc phải ân xá dữ liệu cũ trước), field `views` mới chỉ dùng để *hiển thị/sắp xếp*, không chặn gì cả — Mongoose tự áp `default: 0` cho các document cũ chưa có field này ngay khi đọc, không cần chạy lệnh update thủ công.

---

## Kiến trúc chung

```
[ArticleDetail.jsx]                           [Backend /api/posts]
mount / đổi article.id
  │
  ├─ hiện ngay views cũ (từ PostsContext, có thể hơi cũ)
  │
  └─ POST /posts/:id/view (không cần body/token)
        │
        ▼
                                    Post.findByIdAndUpdate(id, {$inc:{views:1}})
        ◀─────────────── { views: <số mới> }
  │
  ▼
setViews(res.views) → hiện số mới nhất ngay, không cần refetch toàn bộ PostsContext


[Category.jsx] / [ArticleDetail.jsx] — sidebar "Phổ biến"
  posts (từ context, không đổi cách fetch)
      │
      ▼
  popular = [...posts].sort theo views giảm dần .slice(0, 5)   ← thay cho posts.slice(0,5) cũ
```

Không đụng `PostsContext.jsx` — sidebar "Phổ biến" chỉ sort lại mảng `posts` đã có sẵn trong context, không cần refetch. Bài đang xem có thể không phản ánh view mới nhất ở sidebar bài *khác* ngay lập tức (vì context không tự cập nhật), nhưng không sao — sidebar hiển thị top 5 bài *khác* bài đang xem, không ảnh hưởng tới trải nghiệm ngay lúc đó.

---

## Bước 1 — Backend: field `views` + endpoint `POST /posts/:id/view`

**Làm, trong `backend/src/models/Post.js`:**

Thêm field mới, đặt cạnh `videoUrl`:
```js
coverImageUrl: {type: String, default: ''},
videoUrl: {type: String, default: ''},
views: { type: Number, default: 0 },
```

**Làm, trong `backend/src/controllers/postController.js`:**

1. Thêm hàm mới `incrementView`, đặt sau `getById`:
```js
async function incrementView(req, res, next) {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ views: post.views });
  } catch (err) {
    next(err);
  }
}
```
Dùng `$inc` (tăng ở tầng DB) chứ không phải đọc `post.views` rồi `+1` rồi save lại — tránh race condition khi nhiều người mở cùng lúc (2 request đọc cùng giá trị cũ, cả 2 đều +1 rồi ghi đè, mất 1 lượt).

2. Sửa `module.exports` cuối file, thêm `incrementView`:
```js
module.exports = { list, getById, create, update, remove, incrementView };
```

**Làm, trong `backend/src/routes/postRoutes.js`:**

1. Sửa dòng import, thêm `incrementView`:
```js
const { list, getById, create, update, remove, incrementView } = require('../controllers/postController');
```

2. Thêm route mới, đặt sau `router.get('/:id', getById);`:
```js
router.post('/:id/view', incrementView);
```
Không route nào (public) nhận `POST` trên path `/:id` hay `/`, nên **không có rủi ro thứ tự route** như bug đã gặp ở `userRoutes.js` (`DELETE /users/me` bị `DELETE /:id` bắt nhầm) — route mới đủ đặc thù (`/:id/view`, 2 đoạn path), đặt ở đâu trong file cũng an toàn. Không cần `protect` — xem bài viết không cần đăng nhập.

**Kiểm tra bằng Postman/curl:**
- `POST /api/posts/<id-thật>/view` nhiều lần liên tiếp → mỗi lần response `{ views: n }` với `n` tăng dần đúng 1 đơn vị.
- `POST /api/posts/000000000000000000000000/view` (id giả hợp lệ format nhưng không tồn tại) → 404 "Post not found".
- `GET /api/posts/<id>` sau đó → `views` đã lưu đúng trong DB.

---

## Bước 2 — Frontend: gọi API tăng view + hiện số trên `ArticleDetail`

**Làm, trong `frontend-rebuild/src/api/posts.js`, thêm hàm mới:**
```js
export async function viewPost(id){
    return apiRequest(`/posts/${id}/view`, {method: 'POST'});
}
```

**Làm, trong `frontend-rebuild/src/pages/ArticleDetail.jsx`:**

1. Thêm import `useState, useEffect` từ `'react'` (file hiện chưa import gì từ `react` cả — component thuần derive từ context, không có state riêng) và `viewPost` từ `'../api/posts'`:
```js
import { useState, useEffect } from 'react'
import { viewPost } from '../api/posts'
```

2. **Quan trọng — thứ tự hook:** `article` được tìm bằng `posts.find(...)`, sau đó có `if (!article) return (...)` sớm. Hook (`useState`/`useEffect`) **bắt buộc phải đặt trước** dòng `if (!article)` đó — không được đặt sau, nếu không React sẽ báo lỗi "Rules of Hooks" (số lượng hook gọi ra không nhất quán giữa các lần render, vì có lúc return sớm trước khi tới hook, có lúc không). Sửa đoạn đầu hàm thành:
```js
function ArticleDetail({ articleId }) {
    const { id } = useParams();
    const { posts, loading } = usePosts();
    const { lang, t } = useLang();
    const { isFavorite, toggleFavorites } = useFavorites();

    const article = posts.find((p) => p.id === id);

    const [views, setViews] = useState(article?.views);

    useEffect(() => {
        if (!article) return;
        setViews(article.views);
        viewPost(article.id)
            .then((res) => setViews(res.views))
            .catch(() => {});
    }, [article?.id]);

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
    const isSkill = article.category === 'skill';
    const liked = isFavorite(article.id);
    const popular = posts.slice(0, 5);
    const related = posts.filter((a) => a.category === article.category && a.id !== article.id).slice(0, 3);
```
(`popular` sẽ sửa lại cách tính ở Bước 3, chưa đụng ở bước này.)

Lý do dùng state riêng `views` thay vì đọc thẳng `article.views`: sau khi gọi API tăng thành công, muốn hiện ngay con số **mới nhất** (server trả về) mà không cần đợi `PostsContext` refetch lại toàn bộ danh sách bài viết — refetch cả mảng chỉ để cập nhật 1 con số là lãng phí.

3. Thêm hiển thị số lượt xem trong JSX — đặt cạnh nút yêu thích (favorite), trong khối `<div className="mt-4 flex items-center gap-3">`:
```jsx
<div className="mt-4 flex items-center gap-3">
    {article.tags.map((tag) => (
        <span key={tag} className="rounded-fwm-pill bg-fwm-ink/60 px-3 py-1 text-xs font-bold text-white">
            {tag}
        </span>
    ))}
    <span className="text-xs font-bold text-white/70">
        {views ?? 0} lượt xem
    </span>
    <button
        type="button"
        onClick={() => toggleFavorites(article.id)}
        className={`ml-auto text-2xl transition active:scale-90 ${liked ? 'text-fwm-pink' : 'text-white/70 hover:text-fwm-pink'}`}
        aria-label="favorite"
    >
        {liked ? '♥' : '♡'}
    </button>
</div>
```

**Kiểm tra:**
- Mở 1 bài viết → số "lượt xem" hiện ra, F5 lại vài lần → số tăng dần đúng 1 mỗi lần (khớp DB nếu check lại `GET /posts/:id`).
- Mở bài viết A rồi bấm sang bài viết B (không F5, chỉ đổi route) → số lượt xem đổi đúng theo bài B, không giữ số cũ của A (nhờ `[article?.id]` trong dependency của `useEffect`).
- Console không có cảnh báo đỏ liên quan "Rules of Hooks" / "change in the order of Hooks".

---

## Bước 3 — Frontend: hiện view trên `ArticleCard` + sort "Phổ biến" theo view thật

**Làm, trong `frontend-rebuild/src/components/article/ArticleCard.jsx`:**

Thêm dòng hiện số lượt xem, đặt sau đoạn excerpt:
```jsx
<p className="mt-1.5 line-clamp-2 text-sm text-fwm-muted">
    {article.excerpt[lang]}
</p>
<p className="mt-2 text-xs text-fwm-muted">
    {article.views ?? 0} lượt xem
</p>
```

**Làm, trong `frontend-rebuild/src/pages/Category.jsx`, trong `CategoryDetail`:**

Sửa dòng:
```js
const popular = posts.slice(0, 5);
```
thành:
```js
const popular = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
```
Dùng `[...posts]` để tạo mảng mới trước khi `.sort()` — `Array.prototype.sort()` sắp xếp **tại chỗ** (mutate mảng gốc), nếu sort thẳng lên `posts` sẽ làm xáo trộn thứ tự `posts` gốc trong `PostsContext`, ảnh hưởng ngược lên các chỗ khác đang dùng `posts` theo thứ tự `createdAt` từ backend (vd. `Home.jsx` lấy `posts.slice(0,6)` làm "mới nhất").

**Làm, trong `frontend-rebuild/src/pages/ArticleDetail.jsx`:**

Sửa đúng dòng tương tự (đã có sẵn từ Bước 2, giờ mới đổi cách tính):
```js
const popular = posts.slice(0, 5);
```
thành:
```js
const popular = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
```

**Kiểm tra:**
- Vào trang `Home.jsx` → mục "Mới nhất" vẫn đúng thứ tự theo ngày tạo như cũ (không bị ảnh hưởng bởi việc sort ở chỗ khác — xác nhận `[...posts].sort()` không mutate `posts` gốc).
- Mở đi mở lại 1 bài viết cụ thể nhiều lần cho tới khi nó có view cao nhất → vào `Category.jsx` (đúng chuyên mục đó) hoặc `ArticleDetail.jsx` của bài khác cùng chuyên mục → bài đó phải nhảy lên hạng 1 trong sidebar "Phổ biến" (có thể cần F5 lại trang vì `PostsContext` không tự refetch).
- `ArticleCard` ở `Home.jsx`/`Category.jsx`/`Search.jsx`/`Favorites.jsx` đều hiện đúng số lượt xem tương ứng mỗi bài (component dùng chung, không cần sửa gì thêm ở 4 trang đó).

---

## Còn cần bạn chốt

Không có — 2 quyết định (cách tính view, có hiển thị công khai không) đã chốt qua `AskUserQuestion` trước khi viết tài liệu này.

---

## Ghi chú: module tiếp theo sau module này

Sau khi module Lượt xem/Phổ biến xong, làm tiếp **Reaction bài viết** (Like/Dislike/Haha/Giận dữ, icon là ảnh cầu thủ phong cách cartoon do AI tạo) — quy mô lớn hơn hẳn 1 nút Like đơn thuần:
- Cần model mới `Reaction` (không phải thêm field đếm đơn giản trên `Post`) — mỗi user chỉ được 1 reaction/bài viết, đổi loại reaction thì cập nhật chứ không cộng dồn (khác hẳn `views` — cần `unique index` trên `(postId, userId)`).
- Cần quyết định: 4 icon cố định hay cho phép thêm loại sau này; ảnh AI-generated lưu ở đâu (Cloudinary như avatar/cover, hay bundle tĩnh trong `frontend-rebuild/public`/`src/assets` vì icon dùng chung cho mọi bài, không phải nội dung do user upload).
- Sẽ khảo sát lại `FavoritesContext.jsx` (đang có pattern tương tự "user đánh dấu bài viết") trước khi viết spec, để tái dùng đúng pattern nếu hợp lý.

Sẽ viết spec riêng (`REACTIONS_MODULE.md`) sau khi module này xong và verify.
