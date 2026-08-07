# Module: Quản lý danh mục (Category Management)

> **✅ Trạng thái: đã code đủ 15 bước (2026-08-07), CHƯA test UI thật, chưa commit.** Ngoại lệ quy trình (Claude code trực tiếp, xác nhận riêng qua `AskUserQuestion` do quy mô lớn ~20 file). Đã chạy migration `seedCategories.js` (4 danh mục cũ đã có trong DB). Đã tự verify: `npx vite build` sạch, cú pháp backend hợp lệ, `GET /api/categories` trả đúng 4 danh mục (chỉ `skill` có `hasSteps: true`), `POST` không token → 401, tra DB xác nhận category không tồn tại trả về `null` (validate ở `postController` sẽ hoạt động đúng) và category `skill` đang có 4 bài viết (xác nhận chặn xoá sẽ có tác dụng thật khi test). Chưa test được qua UI thật (cần đăng nhập admin thật — không có sẵn thông tin đăng nhập để tự test luồng CRUD qua trình duyệt).

Module fullstack tiếp theo sau Rich text Intro/Trích dẫn/Lỗi thường gặp (`POST_RICHTEXT_MODULE.md`, ✅). Hiện tại 4 danh mục (`skill`/`tactic`/`exp`/`player`) bị hardcode rải rác trong code — không có ở DB, không có UI quản lý, muốn đổi tên/màu/thêm danh mục mới phải sửa tay nhiều file. Module này đưa danh mục thành dữ liệu thật trong MongoDB, thêm tab "Danh mục" trong Admin để CRUD.

## Khảo sát hiện trạng (trước khi viết spec)

Khảo sát qua Explore agent, xác nhận **4 nơi hardcode danh sách category độc lập nhau** (dễ lệch):
- `backend/src/models/Post.js` — `category: { type: String, enum: ['skill','tactic','exp','player'], required: true }`.
- `backend/src/controllers/analyticsController.js` — `const CATEGORY_IDS = ['skill','tactic','exp','player']`.
- `frontend-rebuild/src/data/categories.js` — mảng `CATEGORIES` chỉ có `id` + `gradient`.
- `frontend-rebuild/src/i18n/dict.js` — khối `categories: {...}` (label + desc), **lặp lại 2 lần** (khối VI và khối EN).
- Ngoại lệ: `backend/src/controllers/sitemapController.js` đọc động qua `Post.schema.path('category').enumValues` — không hardcode riêng, nhưng phụ thuộc vào enum sắp bị bỏ ở module này nên cũng phải sửa.

**Điểm quan trọng phát hiện khi khảo sát:** field "Bước hướng dẫn kỹ năng" (steps + video upload) trong form tạo/sửa bài viết (`PostForm.jsx`, `Admin.jsx`) đang **gắn cứng với đúng category id `'skill'`** (`form.category === 'skill'`) — không tổng quát hoá theo bất kỳ thuộc tính nào của category.

**17 file bị ảnh hưởng** khi chuyển category từ hardcode sang dữ liệu DB (liệt kê đầy đủ trong các bước bên dưới).

## Quyết định đã chốt

Chốt qua `AskUserQuestion`, 3 câu:

1. **Phạm vi: CRUD đầy đủ** — admin thêm/sửa/xoá danh mục tuỳ ý, không giới hạn cố định 4 cái. Cần model `Category` riêng ở backend, bỏ enum cứng trên `Post`, chuyển `data/categories.js` + khối `categories` trong `dict.js` sang fetch từ API.
2. **"Bước hướng dẫn kỹ năng" tổng quát hoá bằng field `hasSteps: Boolean`** trên `Category` — admin bật/tắt được cho **bất kỳ** danh mục nào, không chỉ riêng `'skill'`. Thay mọi chỗ đang so sánh `category === 'skill'` bằng tra `category.hasSteps`.
3. **Chặn xoá danh mục nếu còn bài viết** — backend trả lỗi rõ ràng (409) nếu còn `Post` tham chiếu tới `category.slug` đó, không cho xoá thẳng và không tự động gỡ liên kết bài viết.

**1 quyết định kỹ thuật phát sinh khi viết spec (hệ quả trực tiếp, không cần hỏi lại thêm):** `slug` (định danh category, dùng làm giá trị `Post.category` và trong URL `/chuyen-muc/:slug`) **không cho sửa sau khi tạo** — chỉ sửa được `label`/`desc`/`gradient`/`hasSteps`. Lý do: nếu cho đổi `slug`, mọi `Post.category` đang lưu giá trị cũ sẽ "mồ côi" ngay lập tức (không còn category nào khớp), phải cascade-update toàn bộ Post liên quan mới an toàn — vượt quá phạm vi "chặn xoá nếu còn bài viết" đã chốt. Muốn đổi slug thật sự: xoá danh mục cũ (sau khi đã chuyển hết bài viết sang danh mục khác) rồi tạo danh mục mới.

**Định danh dùng `slug` (String) chứ không phải `ObjectId` populate/ref** — khớp với cách `Reaction.postId`/`Comment.postId` trong project đã dùng String thay vì `ref` Mongoose, giữ nhất quán quy ước sẵn có, và giữ nguyên được giá trị `Post.category` hiện tại (chuỗi `'skill'`, `'tactic'`...) không cần migrate dữ liệu Post nào.

---

## Kiến trúc chung

```
CategoryProvider (mới, giống PostsProvider)
  fetch GET /api/categories lúc app khởi động
        │
        ▼
  categories: [{_id, slug, label:{vi,en}, desc:{vi,en}, gradient, hasSteps}]
        │
   ┌────┴─────────────────────────────┐
   ▼                                   ▼
Trang công khai                   Admin Dashboard
(Home, Category, Search,          Tab "Bài viết": PostForm dropdown động,
 Footer, ArticleCard,              hasSteps thay 'skill' hardcode
 PopularItem, AdminTableRow)       Tab "Danh mục" (MỚI): CategoryPanel
   │                                    CRUD qua /api/categories
   ▼
đọc category.label[lang]/desc[lang]     (protect + adminOnly cho
thay vì t.categories[id]                 create/update/delete)
```

`Post.category` vẫn là `String` như cũ (không đổi kiểu dữ liệu, không migrate Post nào) — chỉ bỏ `enum` cứng, validate chuyển sang tầng controller (`postController.js` tra `Category.findOne({slug})` trước khi tạo/sửa bài viết).

---

## BACKEND

### Bước 1 — Model `Category.js`

**Tạo file mới `backend/src/models/Category.js`:**

```js
const mongoose = require('mongoose');

const bilingualString = { vi: String, en: String };

const categorySchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9-]+$/,
    },
    label: { type: bilingualString, required: true },
    desc: { type: bilingualString, default: () => ({ vi: '', en: '' }) },
    gradient: { type: String, default: 'from-fwm-card to-fwm-card-2' },
    hasSteps: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
```

`match: /^[a-z0-9-]+$/` chặn slug chứa ký tự lạ ngay từ tầng schema — vì slug này được nhúng thẳng vào URL `/chuyen-muc/:slug`, không được có khoảng trắng/dấu tiếng Việt/ký tự đặc biệt.

---

### Bước 2 — `categoryController.js` + `categoryRoutes.js` + mount `server.js`

**Tạo file mới `backend/src/controllers/categoryController.js`:**

```js
const Category = require('../models/Category');
const Post = require('../models/Post');

async function list(req, res, next) {
  try {
    const categories = await Category.find().sort({ createdAt: 1 });
    res.json(categories);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Slug đã tồn tại' });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { slug, ...rest } = req.body; // slug không cho sửa sau khi tạo
    const category = await Category.findByIdAndUpdate(req.params.id, rest, {
      new: true,
      runValidators: true,
    });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const postCount = await Post.countDocuments({ category: category.slug });
    if (postCount > 0) {
      return res.status(409).json({ message: `Còn ${postCount} bài viết thuộc danh mục này, không thể xoá` });
    }

    await category.deleteOne();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
```

**Tạo file mới `backend/src/routes/categoryRoutes.js`:**

```js
const express = require('express');
const { list, create, update, remove } = require('../controllers/categoryController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', list);
router.post('/', protect, adminOnly, create);
router.put('/:id', protect, adminOnly, update);
router.delete('/:id', protect, adminOnly, remove);

module.exports = router;
```

`GET /` **để public**, không qua `protect` — trang công khai (Home, Category, Search, Footer...) cần đọc danh sách category mà không cần đăng nhập.

**Sửa `backend/src/server.js`** — thêm require cạnh `analyticsRoutes`:
```js
const categoryRoutes = require('./routes/categoryRoutes');
```
Thêm mount cạnh `app.use('/api/analytics', analyticsRoutes);`:
```js
app.use('/api/categories', categoryRoutes);
```

---

### Bước 3 — Bỏ enum trên `Post.js` + validate category ở `postController.js`

**Sửa `backend/src/models/Post.js`** — đổi field `category`, bỏ `enum`:
```js
category: {
  type: String,
  required: true,
},
```

**Sửa `backend/src/controllers/postController.js`** — dán lại toàn bộ file (thêm import `Category` + validate ở `create`/`update`, giữ nguyên phần sanitize đã có từ `POST_RICHTEXT_MODULE.md`):

```js
const Post = require('../models/Post');
const Category = require('../models/Category');
const { sanitizeBilingualRichText } = require('../utils/sanitize');

async function list(req, res, next) {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    const posts = await Post.find(filter).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const category = await Category.findOne({ slug: req.body.category });
    if (!category) return res.status(400).json({ message: 'Danh mục không hợp lệ' });

    const payload = {
      ...req.body,
      body: sanitizeBilingualRichText(req.body.body),
      intro: sanitizeBilingualRichText(req.body.intro),
      quote: sanitizeBilingualRichText(req.body.quote),
      mistake: sanitizeBilingualRichText(req.body.mistake),
    };
    const post = await Post.create(payload);
    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    if (req.body.category) {
      const category = await Category.findOne({ slug: req.body.category });
      if (!category) return res.status(400).json({ message: 'Danh mục không hợp lệ' });
    }

    const payload = {
      ...req.body,
      body: sanitizeBilingualRichText(req.body.body),
      intro: sanitizeBilingualRichText(req.body.intro),
      quote: sanitizeBilingualRichText(req.body.quote),
      mistake: sanitizeBilingualRichText(req.body.mistake),
    };
    const post = await Post.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function incrementViews(req, res, next) {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id,
      { $inc: { views: 1 } }, { new: true });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ views: post.views });
  }
  catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove, incrementViews };
```

**Vì sao bước này bắt buộc phải làm cùng lúc với Bước 1-2, không tách riêng:** bỏ `enum` trên `Post.category` mà không thêm validate ở controller sẽ mất hẳn khả năng chặn giá trị category rác (trước đây Mongoose tự chặn qua enum) — bất kỳ chuỗi nào cũng tạo được bài viết, kể cả category không tồn tại.

---

### Bước 4 — `sitemapController.js` + `analyticsController.js` đọc category động

**Sửa `backend/src/controllers/sitemapController.js`** — dán lại toàn bộ file:

```js
const Post = require('../models/Post');
const Category = require('../models/Category');

const STATIC_PATHS = ['/', '/gioi-thieu', '/lien-he', '/chuyen-muc'];

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function generate(req, res, next) {
  try {
    const baseUrl = process.env.FRONTEND_URL;
    const [categories, posts] = await Promise.all([
      Category.find().select('slug'),
      Post.find().select('_id updatedAt').sort({ updatedAt: -1 }),
    ]);

    const urls = [
      ...STATIC_PATHS.map((path) => ({ loc: `${baseUrl}${path}` })),
      ...categories.map((cat) => ({ loc: `${baseUrl}/chuyen-muc/${cat.slug}` })),
      ...posts.map((post) => ({
        loc: `${baseUrl}/bai-viet/${post._id}`,
        lastmod: post.updatedAt.toISOString(),
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
  </url>`
  )
  .join('\n')}
</urlset>`;

    res.type('application/xml').send(xml);
  } catch (err) {
    next(err);
  }
}

module.exports = { generate };
```

**Sửa `backend/src/controllers/analyticsController.js`** — thay hardcode `CATEGORY_IDS` bằng query động, dán lại toàn bộ file:

```js
const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Reaction = require('../models/Reaction');
const VisitLog = require('../models/VisitLog');
const Category = require('../models/Category');

async function getOverview(req, res, next) {
  try {
    const now = new Date();
    const trafficStart = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

    const [
      totalPosts,
      totalUsers,
      totalComments,
      viewsAgg,
      topPosts,
      reactionAgg,
      categoryAgg,
      trafficAgg,
      allCategories,
    ] = await Promise.all([
      Post.countDocuments(),
      User.countDocuments(),
      Comment.countDocuments({ isDeleted: false }),
      Post.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
      Post.find().sort({ views: -1 }).limit(5).select('title category views'),
      Reaction.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Post.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      VisitLog.aggregate([
        { $match: { createdAt: { $gte: trafficStart } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
      ]),
      Category.find().select('slug'),
    ]);

    const totalViews = viewsAgg[0]?.total || 0;

    const reactionCounts = { like: 0, dislike: 0, haha: 0, angry: 0 };
    reactionAgg.forEach((r) => { reactionCounts[r._id] = r.count; });

    const categoryCounts = {};
    allCategories.forEach((c) => { categoryCounts[c.slug] = 0; });
    categoryAgg.forEach((c) => { categoryCounts[c._id] = c.count; });

    const trafficMap = {};
    trafficAgg.forEach((t) => { trafficMap[t._id] = t.count; });
    const traffic = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      traffic.push({ date: key, count: trafficMap[key] || 0 });
    }

    res.json({
      totals: { posts: totalPosts, users: totalUsers, comments: totalComments, views: totalViews },
      topPosts,
      reactionCounts,
      categoryCounts,
      traffic,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getOverview };
```

---

### Bước 5 — Migration bắt buộc: seed 4 danh mục cũ vào DB

**⚠️ Quan trọng — phải chạy TRƯỚC khi test bất kỳ tính năng nào ở Bước 1-4:** sau khi bỏ `enum` trên `Post.category`, `postController.js` giờ validate category bằng cách tra DB (`Category.findOne({slug})`) — nếu DB **chưa có Category nào**, MỌI request tạo/sửa bài viết sẽ bị chặn 400 "Danh mục không hợp lệ", kể cả gửi đúng `category: 'skill'` như trước. Đây là gotcha giống các lần trước (field mới khoá tính năng cũ) — phải chạy migration trước khi bật phần chặn.

**Tạo file mới `backend/src/seed/seedCategories.js`:**

```js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Category = require('../models/Category');

const CATEGORIES = [
  {
    slug: 'skill',
    label: { vi: 'Kỹ năng', en: 'Skill' },
    desc: { vi: 'Kỹ thuật cá nhân, combo điều khiển', en: 'Personal technique, controller combos' },
    gradient: 'from-amber-400 via-orange-500 to-pink-500',
    hasSteps: true,
  },
  {
    slug: 'tactic',
    label: { vi: 'Chiến thuật', en: 'Tactics' },
    desc: { vi: 'Sơ đồ, chỉ thị, vận hành đội hình', en: 'Formations, instructions, team play' },
    gradient: 'from-indigo-500 via-blue-500 to-cyan-400',
    hasSteps: false,
  },
  {
    slug: 'exp',
    label: { vi: 'Kinh nghiệm', en: 'Experience' },
    desc: { vi: 'Bài học thực chiến từ cộng đồng', en: 'Real match lessons from the community' },
    gradient: 'from-emerald-400 via-teal-500 to-cyan-500',
    hasSteps: false,
  },
  {
    slug: 'player',
    label: { vi: 'Người chơi', en: 'Players' },
    desc: { vi: 'Phân tích cầu thủ, build đội hình', en: 'Player analysis, squad building' },
    gradient: 'from-fuchsia-500 via-pink-500 to-rose-400',
    hasSteps: false,
  },
];

async function run() {
  await connectDB();

  for (const cat of CATEGORIES) {
    await Category.updateOne({ slug: cat.slug }, { $setOnInsert: cat }, { upsert: true });
  }

  console.log(`Seed categories xong (${CATEGORIES.length} danh mục).`);
  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Dùng `updateOne(..., { $setOnInsert: ... }, { upsert: true })` thay vì `insertMany` — chạy lại script này nhiều lần (vô tình chạy 2 lần) sẽ không tạo trùng category hay lỗi duplicate key, chỉ tạo mới nếu slug chưa tồn tại.

**Chạy 1 lần** (thư mục `backend/`):
```
node src/seed/seedCategories.js
```

**Kiểm tra:** `GET /api/categories` (không cần token) trả về đúng 4 category, đúng slug/label/gradient/`hasSteps` (chỉ `skill` có `hasSteps: true`).

---

## FRONTEND

### Bước 6 — `api/categories.js`

**Tạo file mới `frontend-rebuild/src/api/categories.js`:**

```js
import { apiRequest } from '../api/client';

export function fetchCategories() {
    return apiRequest('/categories');
}

export function createCategory(payload, token) {
    return apiRequest('/categories', { method: 'POST', body: payload, token });
}

export function updateCategory(id, payload, token) {
    return apiRequest(`/categories/${id}`, { method: 'PUT', body: payload, token });
}

export function deleteCategory(id, token) {
    return apiRequest(`/categories/${id}`, { method: 'DELETE', token });
}
```

---

### Bước 7 — `context/CategoryContext.jsx` + đăng ký `main.jsx`

**Tạo file mới `frontend-rebuild/src/context/CategoryContext.jsx`** (giống hệt cấu trúc `PostsContext.jsx` đã có):

```jsx
import { createContext, useCallback, useContext, useState, useEffect } from "react";
import { fetchCategories } from '../api/categories'

const categoryContext = createContext(null);

export function CategoryProvider({ children }) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const refetch = useCallback(() => {
        setLoading(true);
        return fetchCategories()
            .then((data) => setCategories(data))
            .catch((err) => setError(err.message))
            .finally(() => { setLoading(false) })
    }, [])

    useEffect(() => {
        refetch();
    }, [refetch]);

    return (
        <categoryContext.Provider value={{ categories, loading, error, refetch }}>
            {children}
        </categoryContext.Provider>
    )
}

export function useCategories() {
    return useContext(categoryContext);
}
```

**Sửa `frontend-rebuild/src/main.jsx`** — thêm import:
```js
import { CategoryProvider } from './context/CategoryContext.jsx'
```
Bọc thêm `<CategoryProvider>` cạnh `<PostsProvider>` (nhiều trang cần cả 2 cùng lúc, đặt lồng nhau thứ tự nào cũng được vì 2 context độc lập nhau):
```jsx
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>
          <FavoritesProvider>
            <CategoryProvider>
              <PostsProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </PostsProvider>
            </CategoryProvider>
          </FavoritesProvider>
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  </StrictMode>
);
```

---

### Bước 8 — `CategoryTile.jsx`

**Sửa `frontend-rebuild/src/components/article/CategoryTile.jsx`** — dán lại toàn bộ file (category giờ tự chứa label/desc bilingual, không cần tra `t.categories[id]` nữa):

```jsx
import { Link } from "react-router-dom"
import { useLang } from "../../context/LangContext";

function CategoryTile({ category, index }) {
    const { lang } = useLang();
    return (
        <Link to={`/chuyen-muc/${category.slug}`} className={`group relative block overflow-hidden rounded-fwm-lg bg-gradient-to-br ${category.gradient} p-5 transition duration-300 hover:-translate-y-1.5 hover:shadow-fwm`}>
            <span className="font-head text-4xl font-black text-white/30">
                {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="font-head text-4xl font-black text-white/30">{category.label[lang]}</h3>
            <p className="mt-1 text-sm text-white/85">{category.desc[lang]}</p>
        </Link>
    )
}

export default CategoryTile;
```

---

### Bước 9 — `Category.jsx` (trang danh mục)

**Sửa `frontend-rebuild/src/pages/Category.jsx`** — dán lại toàn bộ file (đổi `CATEGORIES` tĩnh sang `useCategories()`, tiện xoá luôn 2 dòng `console.log` debug còn sót lại):

```jsx
import { useMemo, useState } from "react";
import CategoryTile from "../components/article/CategoryTile";
import SectionHeading from "../components/common/SectionHeading"
import { useLang } from "../context/LangContext"
import { useCategories } from "../context/CategoryContext";
import { usePosts } from "../context/PostsContext";
import Chip from '../components/ui/Chip'
import ArticleCard from "../components/article/ArticleCard";
import PopularItem from '../components/article/PopularItem'
import { useParams } from "react-router-dom";

function CategoryOverview() {
    const { t } = useLang();
    const { categories } = useCategories();
    return (
        <section className="mx-auto max-w-6xl px-4 py-14">
            <SectionHeading title={t.section.categories}></SectionHeading>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {categories.map((cat, i) => (
                    <CategoryTile key={cat._id} category={cat} index={i}></CategoryTile>
                ))}
            </div>
        </section>
    )
}

function CategoryDetail({ categoryId }) {
    const { lang, t } = useLang();
    const { posts } = usePosts();
    const { categories } = useCategories();
    const [activeTag, setActiveTag] = useState('all');
    const categoryArticles = useMemo(() => posts.filter((post) => post.category === categoryId), [categoryId, posts]);
    const tags = useMemo(() => Array.from(new Set(categoryArticles.flatMap((a) => a.tags))), [categoryArticles]);
    const filtered = activeTag === 'all' ? categoryArticles : categoryArticles.filter((cat) => cat.tags.includes(activeTag))

    const category = categories.find((c) => c.slug === categoryId);
    const popular = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

    if (!category) return null;
    return (
        <>
            <section className={`border-b border-fwm-line bg-gradient-to-br ${category.gradient} px-4 py-14`} >
                <div className="mx-auto max-w-6xl">
                    <h1 className="font-head text-3xl font-black text-white sm:text-4xl">
                        {category.label[lang]}
                    </h1>
                    <p className="mt-2 max-w-md text-white/85"> {category.desc[lang]}</p>
                    <p className="mt-4 font-head text-xs font-bold uppercase tracking-wide text-white/70">
                        {categoryArticles.length} {t.category.countSuffix}
                    </p>
                </div>
            </section >
            <section className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 lg:grid-cols-[1fr_280px]">
                <div className="mb-6 flex flex-wrap gap-2">
                    <Chip active={activeTag === 'all'} onClick={() => setActiveTag('all')}>
                        {t.category.allTags}
                    </Chip>
                    {tags.map((tag) => (
                        <Chip key={tag} active={activeTag === tag} onClick={() => setActiveTag(tag)}>{tag}</Chip>
                    ))}
                </div>
                {filtered.length === 0 ? (
                    <p className="text-fwm-muted">{t.category.empty}</p>
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {filtered.map((article) => <ArticleCard key={article.id} article={article}></ArticleCard>)}
                    </div>

                )}

                <aside>
                    <h3 className="mb-3 font-head text-sm font-bold uppercase tracking-wide text-fwm-text">
                        {t.category.popularHeading}
                    </h3>
                    <div className="rounded-fwm-lg border border-fwm-line bg-fwm-card p-2">
                        {popular.map((article, i) => <PopularItem key={article.id} article={article} rank={i + 1}  ></PopularItem>)}
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

---

### Bước 10 — `Home.jsx`, `Search.jsx`, `SiteFooter.jsx`, `About.jsx`

4 file này chỉ đổi **2 dòng mỗi file**: bỏ import `CATEGORIES` tĩnh, thay bằng `useCategories()`; và đổi `cat.id`/`c.id` thành `cat.slug`/`c.slug` (key React vẫn nên dùng `cat._id` cho chắc — Mongo `_id` luôn duy nhất, khác `slug` về mặt khái niệm dù giá trị runtime giống hệt id cũ).

**Sửa `frontend-rebuild/src/pages/Home.jsx`:**
```js
// Xoá dòng:
import { CATEGORIES } from '../data/categories'
// Thêm dòng:
import { useCategories } from '../context/CategoryContext'
```
Trong component `Home`, thêm khai báo:
```js
const { categories } = useCategories();
```
Đổi dòng render:
```jsx
{CATEGORIES.map((cat, i) => <CategoryTitle key={cat.id} category={cat} index={i} ></CategoryTitle>)}
```
thành:
```jsx
{categories.map((cat, i) => <CategoryTitle key={cat._id} category={cat} index={i} ></CategoryTitle>)}
```

**Sửa `frontend-rebuild/src/pages/Search.jsx`** — dán lại toàn bộ file:
```jsx
import { useMemo, useState } from "react";
import { useLang } from '../context/LangContext'
import Chip from '../components/ui/Chip'
import { useSearchParams } from 'react-router-dom'
import { useCategories } from '../context/CategoryContext'
import { usePosts } from '../context/PostsContext'
import ArticleCard from '../components/article/ArticleCard'
function Search() {

    const { lang, t } = useLang();
    const { posts } = usePosts();
    const { categories } = useCategories();
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const category = searchParams.get('cat') || 'all';
    const setParams = (key, value) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (!value || value === 'all') next.delete(key);
            else next.set(key, value);
            return next;
        })
    }

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        return posts.filter((p) => {
            if (category !== 'all' && p.category !== category) return false;
            if (!q) return true;
            const haystack = [p.title.vi, p.title.en, p.excerpt.vi, p.excerpt.en, p.category, ...p.tags]
                .join(' ')
                .toLowerCase();
            return haystack.includes(q);
        })
    }, [posts, query, category]);

    return (
        <section className="mx-auto max-w-6xl px-4 py-12">
            <input
                type="search"
                autoFocus
                value={query}
                onChange={(e) => setParams('q', e.target.value)}
                placeholder={t.search.placeholder}
                className="w-full rounded-fwm-lg border border-fwm-line bg-fwm-card px-5 py-4 text-fwm-text placeholder:text-fwm-muted focus:border-fwm-accent focus:outline-none"
            />

            <div className="mt-4 flex flex-wrap gap-2">
                <Chip active={category === 'all'} onClick={() => setParams('cat', 'all')} >{t.category.allTags}</Chip>
                {categories.map((c) => (
                    <Chip key={c._id} active={category === c.slug} onClick={() => setParams('cat', c.slug)}>
                        {c.label[lang]}
                    </Chip>
                ))}
            </div>

            {query && (
                <p className="mt-6 text-sm text-fwm-muted">
                    {t.search.resultsFor}
                    <span className="text-fwm-text">
                        "{query}"
                    </span>
                    — {results.length} {t.search.resultsCount}
                </p>
            )}

            <div className="mt-6">
                {results.length === 0 ? (
                    <div className="py-16 text-center">
                        <p className="font-head text-lg font-bold text-fwm-text">
                            {t.search.empty}
                        </p>
                        <p className="mt-1 text-sm text-fwm-muted">
                            {t.search.emptyDesc}
                        </p>
                    </div>) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {results.map((a) => (
                            <ArticleCard key={a.id} article={a}></ArticleCard>
                        ))}
                    </div>
                )}
            </div>

        </section>
    )
}


export default Search;
```

**Sửa `frontend-rebuild/src/components/layout/SiteFooter.jsx`** — dán lại toàn bộ file:
```jsx
import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext';
import { useCategories } from '../../context/CategoryContext';

function SiteFooter() {
    const { lang, t } = useLang();
    const { categories } = useCategories();
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
                            {categories.map((cat) => (
                                <li key={cat._id}>
                                    <Link to={`/chuyen-muc/${cat.slug}`} className="text-sm text-fwm-muted hover:text-fwm-accent">
                                        {cat.label[lang]}
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
    )
}

export default SiteFooter;
```

**Sửa `frontend-rebuild/src/pages/About.jsx`** — chỉ đổi 2 dòng:
```js
// Xoá:
import {CATEGORIES} from '../data/categories'
// Thêm:
import { useCategories } from '../context/CategoryContext'
```
Trong component, thêm khai báo cạnh `const { posts } = usePosts();`:
```js
const { categories } = useCategories();
```
Đổi:
```jsx
<div className="font-head text-3xl font-extrabold text-fwm-accent">{CATEGORIES.length}</div>
```
thành:
```jsx
<div className="font-head text-3xl font-extrabold text-fwm-accent">{categories.length}</div>
```

---

### Bước 11 — `ArticleCard.jsx`, `PopularItem.jsx`, `AdminTableRow.jsx`, `AnalyticsPanel.jsx`

Cả 4 file đang tra label qua `t.categories[article.category]?.label` — đổi sang tra trong danh sách `categories` lấy từ `useCategories()`.

**Sửa `frontend-rebuild/src/components/article/ArticleCard.jsx`:**
```js
// Thêm import:
import { useCategories } from '../../context/CategoryContext'
```
Trong component, thêm khai báo cạnh `const { isFavorite, toggleFavorites } = useFavorites();`:
```js
const { categories } = useCategories();
```
Đổi:
```js
const catLabel = t.categories[article.category]?.label;
```
thành:
```js
const catLabel = categories.find((c) => c.slug === article.category)?.label[lang];
```

**Sửa `frontend-rebuild/src/components/article/PopularItem.jsx`:**
```js
// Thêm import:
import { useCategories } from '../../context/CategoryContext'
```
Trong component, thêm khai báo cạnh `const { lang, t } = useLang();`:
```js
const { categories } = useCategories();
```
Đổi:
```jsx
{t.categories[article.category]?.label}
```
thành:
```jsx
{categories.find((c) => c.slug === article.category)?.label[lang]}
```

**Sửa `frontend-rebuild/src/components/admin/AdminTableRow.jsx`:**
```js
// Thêm import:
import { useCategories } from '../../context/CategoryContext'
```
Trong component, thêm khai báo cạnh `const { lang, t } = useLang();`:
```js
const { categories } = useCategories();
```
Đổi:
```jsx
{t.categories[post.category]?.label}
```
thành:
```jsx
{categories.find((c) => c.slug === post.category)?.label[lang]}
```

**Sửa `frontend-rebuild/src/components/admin/AnalyticsPanel.jsx`:**
```js
// Xoá import REACTIONS giữ nguyên, thêm:
import { useCategories } from '../../context/CategoryContext'
```
Đổi khai báo `CATEGORY_COLORS` — thêm bảng màu dự phòng cho category mới thêm sau này (không nằm trong 4 màu gốc):
```js
const CATEGORY_COLORS = { skill: '#f59e0b', tactic: '#6366f1', exp: '#14b8a6', player: '#ec4899' };
const FALLBACK_PALETTE = ['#eab308', '#0ea5e9', '#a855f7', '#22c55e', '#f97316', '#06b6d4'];
function colorForCategory(slug, index) {
    return CATEGORY_COLORS[slug] || FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}
```
Trong component `AnalyticsPanel`, thêm khai báo cạnh `const { t, lang } = useLang();`:
```js
const { categories } = useCategories();
```
Đổi:
```js
const categoryData = Object.entries(data.categoryCounts).map(([id, count]) => ({
    id, count, label: t.categories[id]?.label || id,
}));
```
thành:
```js
const categoryData = Object.entries(data.categoryCounts).map(([id, count], index) => ({
    id, count,
    label: categories.find((c) => c.slug === id)?.label[lang] || id,
    color: colorForCategory(id, index),
}));
```
Đổi chỗ dùng `<Cell fill={CATEGORY_COLORS[c.id]} />` (trong `<Bar>` biểu đồ "Bài viết theo chuyên mục") thành:
```jsx
{categoryData.map((c) => (
    <Cell key={c.id} fill={c.color} />
))}
```

---

### Bước 12 — `PostForm.jsx` (dropdown động + `hasSteps`)

**Sửa `frontend-rebuild/src/components/admin/PostForm.jsx`** — dán lại toàn bộ file:

```jsx
import { useState } from 'react';
import { useLang } from '../../context/LangContext';
import Button from '../ui/Button';
import RichTextEditor from './RichTextEditor';
import GamepadKey from '../skill/GamepadKey';
import { uploadFile } from '../../api/upload';


const EMPTY_FORM = {
  titleVi: '', titleEn: '', excerptVi: '', excerptEn: '',
  introVi: '', introEn: '', bodyVi: '', bodyEn: '',
  quoteVi: '', quoteEn: '', mistakeVi: '', mistakeEn: '',
  category: '', steps: [],
  coverImageUrl: '',
  videoUrl: '',
};

const EMPTY_STEP = { titleVi: '', titleEn: '', descVi: '', descEn: '', keyKind: 'default', keyLabel: '' };

const KEY_KINDS = [
  { value: 'default', label: 'Chữ / nhãn thường' },
  { value: 'cir', label: 'Tròn (đỏ)' },
  { value: 'sq', label: 'Vuông (hồng)' },
  { value: 'tri', label: 'Tam giác (xanh lá)' },
  { value: 'cross', label: 'Chéo (xanh dương)' },
];

function PostForm({ initial, categories, onSubmit, onCancel, token }) {
  const { t } = useLang();
  const [form, setForm] = useState({ ...EMPTY_FORM, category: categories[0]?.slug || '', ...initial });
  const [fileError, setFileError] = useState('');
  const [uploading, setUploading] = useState(false);

  const selectedCategory = categories.find((c) => c.slug === form.category);
  const showSteps = !!selectedCategory?.hasSteps;

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const handleRichChange = (field) => (html) => setForm((f) => ({ ...f, [field]: html }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const addStep = () => setForm((f) => ({ ...f, steps: [...f.steps, { ...EMPTY_STEP }] }));
  const removeStep = (index) => setForm((f) => ({ ...f, steps: f.steps.filter((_, i) => i !== index) }));
  const updateStep = (index, field) => (e) =>
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s, i) => (i === index ? { ...s, [field]: e.target.value } : s)),
    }));

  const textField = (labelKey, key, Tag = 'input') => (
    <div>
      <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin[labelKey]}</label>
      <Tag
        required
        value={form[key]}
        onChange={handleChange(key)}
        rows={Tag === 'textarea' ? 3 : undefined}
        className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none"
      />
    </div>
  );

  const bodyField = (labelKey, key) => (
    <div>
      <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin[labelKey]}</label>
      <RichTextEditor value={form[key]} onChange={handleRichChange(key)} />
    </div>
  );

  const handleFileUpload = (field) => (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileError('');
    setUploading(true);
    uploadFile(file, token)
      .then((res) => setForm((f) => ({ ...f, [field]: res.url })))
      .catch((err) => setFileError(err.message))
      .finally(() => setUploading(false));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-fwm-lg border border-fwm-line bg-fwm-card p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{textField('formTitleVi', 'titleVi')}{textField('formTitleEn', 'titleEn')}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{textField('formExcerptVi', 'excerptVi', 'textarea')}{textField('formExcerptEn', 'excerptEn', 'textarea')}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{bodyField('formIntroVi', 'introVi')}{bodyField('formIntroEn', 'introEn')}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{bodyField('formBodyVi', 'bodyVi')}{bodyField('formBodyEn', 'bodyEn')}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{bodyField('formQuoteVi', 'quoteVi')}{bodyField('formQuoteEn', 'quoteEn')}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{bodyField('formMistakeVi', 'mistakeVi')}{bodyField('formMistakeEn', 'mistakeEn')}</div>

      <div>
        <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.formCategory}</label>
        <select
          value={form.category}
          onChange={handleChange('category')}
          className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none"
        >
          {categories.map((cat) => <option key={cat._id} value={cat.slug}>{cat.label.vi}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Ảnh cover</label>
        <input type="file" accept="image/*" onChange={handleFileUpload('coverImageUrl')}
          className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-sm text-fwm-text" />
        {form.coverImageUrl && <img src={form.coverImageUrl} alt="" className="mt-2 h-32 w-full rounded-fwm object-cover" />}
      </div>

      {showSteps && (
        <div>
          <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Video hướng dẫn (tùy chọn)</label>
          <input type="file" accept="video/*" onChange={handleFileUpload('videoUrl')}
            className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-sm text-fwm-text" />
          {form.videoUrl && <video src={form.videoUrl} controls className="mt-2 h-32 w-full rounded-fwm object-cover" />}
        </div>
      )}

      {fileError && <p className="text-sm text-fwm-pink">{fileError}</p>}

      {showSteps && (
        <div className="rounded-fwm-lg border border-fwm-line bg-fwm-card-2 p-4">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-head text-sm font-bold uppercase tracking-wide text-fwm-text">{t.admin.stepsHeading}</h3>
            <Button type="button" variant="ghost" onClick={addStep}>{t.admin.addStep}</Button>
          </div>
          <p className="mb-3 text-xs text-fwm-muted">{t.admin.stepsHint}</p>

          <div className="space-y-4">
            {form.steps.map((step, index) => (
              <div key={index} className="rounded-fwm border border-fwm-line bg-fwm-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-head text-xs font-bold text-fwm-accent">{t.admin.stepN} {index + 1}</span>
                  <button type="button" onClick={() => removeStep(index)} className="font-head text-xs font-bold text-fwm-pink hover:underline">
                    {t.admin.removeStep}
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-fwm-muted">{t.admin.stepTitleVi}</label>
                    <input required value={step.titleVi} onChange={updateStep(index, 'titleVi')}
                      className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-3 py-2 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-fwm-muted">{t.admin.stepTitleEn}</label>
                    <input required value={step.titleEn} onChange={updateStep(index, 'titleEn')}
                      className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-3 py-2 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-fwm-muted">{t.admin.stepDescVi}</label>
                    <textarea required rows={2} value={step.descVi} onChange={updateStep(index, 'descVi')}
                      className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-3 py-2 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-fwm-muted">{t.admin.stepDescEn}</label>
                    <textarea required rows={2} value={step.descEn} onChange={updateStep(index, 'descEn')}
                      className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-3 py-2 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-fwm-muted">{t.admin.stepKeyKind}</label>
                    <select value={step.keyKind} onChange={updateStep(index, 'keyKind')}
                      className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-3 py-2 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none">
                      {KEY_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-fwm-muted">{t.admin.stepKeyLabel}</label>
                    <div className="flex items-center gap-3">
                      <input required value={step.keyLabel} onChange={updateStep(index, 'keyLabel')}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-3 py-2 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none" />
                      {step.keyLabel && <GamepadKey kind={step.keyKind} label={step.keyLabel} />}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" disabled={uploading}>{uploading ? 'Đang tải file lên...' : t.admin.save}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>{t.admin.cancel}</Button>
      </div>
    </form>
  );
}

export default PostForm;
```

**Đổi quan trọng cần hiểu:** `EMPTY_FORM.category` không còn lấy `CATEGORIES[0].id` ở module scope (categories giờ fetch async, không có sẵn lúc file này được load) — chuyển thành nhận `categories` qua **prop**, giá trị mặc định tính lúc khởi tạo `useState` bên trong component (`categories[0]?.slug || ''`). `showSteps` thay hoàn toàn 2 chỗ `form.category === 'skill'` cũ.

---

### Bước 13 — `CategoryPanel.jsx` (CRUD UI mới) + gắn vào `Admin.jsx`

**Tạo file mới `frontend-rebuild/src/components/admin/CategoryPanel.jsx`:**

```jsx
import { useState } from 'react'
import { createCategory, updateCategory, deleteCategory } from '../../api/categories'
import { useLang } from '../../context/LangContext'
import { useCategories } from '../../context/CategoryContext'
import Button from '../ui/Button'

const EMPTY_FORM = {
    slug: '', labelVi: '', labelEn: '', descVi: '', descEn: '',
    gradient: 'from-fwm-card to-fwm-card-2', hasSteps: false,
};

function toFormValues(cat) {
    return {
        slug: cat.slug,
        labelVi: cat.label.vi, labelEn: cat.label.en,
        descVi: cat.desc?.vi || '', descEn: cat.desc?.en || '',
        gradient: cat.gradient, hasSteps: cat.hasSteps,
    };
}

function CategoryPanel({ token }) {
    const { t } = useLang();
    const { categories, refetch } = useCategories();
    const [view, setView] = useState('list');
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState('');

    const handleChange = (field) => (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm((f) => ({ ...f, [field]: value }));
    };

    const handleNew = () => { setForm(EMPTY_FORM); setEditingId(null); setError(''); setView('form'); };
    const handleEdit = (cat) => { setForm(toFormValues(cat)); setEditingId(cat._id); setError(''); setView('form'); };
    const handleCancel = () => { setView('list'); setEditingId(null); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            slug: form.slug,
            label: { vi: form.labelVi, en: form.labelEn },
            desc: { vi: form.descVi, en: form.descEn },
            gradient: form.gradient,
            hasSteps: form.hasSteps,
        };
        try {
            if (editingId) {
                await updateCategory(editingId, payload, token);
            } else {
                await createCategory(payload, token);
            }
            await refetch();
            setView('list');
            setEditingId(null);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        setError('');
        try {
            await deleteCategory(id, token);
            await refetch();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div>
            <div className="mb-5 flex items-center justify-between">
                <h1 className="font-head text-2xl font-black text-fwm-text">
                    {view === 'list' ? t.admin.categoriesHeading : editingId ? t.admin.editCategory : t.admin.addCategory}
                </h1>
                {view === 'list' && (
                    <Button variant="primary" onClick={handleNew}>{t.admin.addCategory}</Button>
                )}
            </div>

            {error && <p className="mb-4 text-sm text-fwm-pink">{error}</p>}

            {view === 'form' ? (
                <form onSubmit={handleSubmit} className="space-y-4 rounded-fwm-lg border border-fwm-line bg-fwm-card p-5">
                    <div>
                        <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.formSlug}</label>
                        <input
                            required
                            disabled={!!editingId}
                            value={form.slug}
                            onChange={handleChange('slug')}
                            pattern="[a-z0-9-]+"
                            className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none disabled:opacity-50"
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.formLabelVi}</label>
                            <input required value={form.labelVi} onChange={handleChange('labelVi')}
                                className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                        </div>
                        <div>
                            <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.formLabelEn}</label>
                            <input required value={form.labelEn} onChange={handleChange('labelEn')}
                                className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.formDescVi}</label>
                            <textarea rows={2} value={form.descVi} onChange={handleChange('descVi')}
                                className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                        </div>
                        <div>
                            <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.formDescEn}</label>
                            <textarea rows={2} value={form.descEn} onChange={handleChange('descEn')}
                                className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.formGradient}</label>
                        <input required value={form.gradient} onChange={handleChange('gradient')}
                            className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                        <div className={`mt-2 h-10 w-full rounded-fwm bg-gradient-to-br ${form.gradient}`} />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-fwm-text">
                        <input type="checkbox" checked={form.hasSteps} onChange={handleChange('hasSteps')} />
                        {t.admin.formHasSteps}
                    </label>

                    <div className="flex gap-3 pt-2">
                        <Button type="submit" variant="primary">{t.admin.save}</Button>
                        <Button type="button" variant="ghost" onClick={handleCancel}>{t.admin.cancel}</Button>
                    </div>
                </form>
            ) : categories.length === 0 ? (
                <p className="text-fwm-muted">{t.admin.categoriesEmpty}</p>
            ) : (
                <div className="overflow-x-auto rounded-fwm-lg border border-fwm-line bg-fwm-card p-4">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-fwm-line text-left">
                                <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.colSlug}</th>
                                <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.colLabel}</th>
                                <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.colHasSteps}</th>
                                <th className="pb-2 text-right font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.colActions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((cat) => (
                                <tr key={cat._id} className="border-b border-fwm-line last:border-0">
                                    <td className="py-3 pr-4 text-sm text-fwm-muted">{cat.slug}</td>
                                    <td className="py-3 pr-4">
                                        <span className={`mr-2 inline-block h-4 w-6 rounded-fwm-sm bg-gradient-to-br ${cat.gradient} align-middle`} />
                                        <span className="font-head text-sm font-bold text-fwm-text">{cat.label.vi}</span>
                                    </td>
                                    <td className="py-3 pr-4 text-sm text-fwm-muted">{cat.hasSteps ? t.admin.yes : t.admin.no}</td>
                                    <td className="py-3 text-right">
                                        <button type="button" onClick={() => handleEdit(cat)} className="mr-3 font-head text-xs font-bold text-fwm-accent hover:underline">{t.admin.edit}</button>
                                        <button type="button" onClick={() => handleDelete(cat._id)} className="font-head text-xs font-bold text-fwm-pink hover:underline">{t.admin.delete}</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default CategoryPanel;
```

**Sửa `frontend-rebuild/src/pages/Admin.jsx`:**

1. Đổi import — xoá dòng `import { CATEGORIES } from '../data/categories'`, thêm 2 dòng:
```js
import CategoryPanel from '../components/admin/CategoryPanel'
import { useCategories } from '../context/CategoryContext'
```

2. Thêm khai báo trong component `Admin`, cạnh `const { refetch: refetchPublicPosts } = usePosts();`:
```js
const { categories } = useCategories();
```

3. Sửa `handleSubmit` — đổi 2 dòng dùng `CATEGORIES`/`'skill'`:
```js
const category = CATEGORIES.find((c) => c.id === form.category);
```
thành:
```js
const category = categories.find((c) => c.slug === form.category);
```
và:
```js
steps: form.category === 'skill'
    ? form.steps.map((step) => ({
```
thành:
```js
steps: category?.hasSteps
    ? form.steps.map((step) => ({
```

4. Thêm nút nav mới, đặt sau nút "Thống kê":
```jsx
<button type="button" onClick={() => setSection('categories')} className={`block w-full rounded-fwm px-3 py-2.5 text-left font-head text-sm font-bold ${section === 'categories' ? 'bg-fwm-accent text-fwm-ink' : 'text-fwm-text hover:bg-fwm-pill'}`}>
    Danh mục
</button>
```

5. Thêm nhánh render, trước nhánh mặc định (Bài viết):
```jsx
) : section === 'analytics' ? (
    <AnalyticsPanel token={token}></AnalyticsPanel>
) : section === 'categories' ? (
    <CategoryPanel token={token}></CategoryPanel>
) : (<>
```

6. Sửa dropdown filter category trong bảng danh sách bài viết:
```jsx
<option value="all">Tất cả chuyên mục</option>
{CATEGORIES.map((c) => {
    return <option key={c.id} value={c.id}> {c.id}</option>
})}
```
thành:
```jsx
<option value="all">Tất cả chuyên mục</option>
{categories.map((c) => (
    <option key={c._id} value={c.slug}>{c.label.vi}</option>
))}
```

7. Sửa `<PostForm>` — truyền thêm prop `categories`:
```jsx
<PostForm initial={editingPost ? toFormValues(editingPost) : undefined} categories={categories} onSubmit={handleSubmit} onCancel={handleCancel} token={token} />
```

---

### Bước 14 — `dict.js`: xoá khối `categories` cũ, thêm key mới cho `CategoryPanel`

**Xoá** khối `categories: {...}` ở **cả 2 nơi** (khối tiếng Việt và tiếng Anh) — không còn dùng vì label/desc giờ nằm thẳng trong dữ liệu category từ API:
```js
categories: {
    skill: { label: 'Kỹ năng', desc: 'Kỹ thuật cá nhân, combo điều khiển' },
    tactic: { label: 'Chiến thuật', desc: 'Sơ đồ, chỉ thị, vận hành đội hình' },
    exp: { label: 'Kinh nghiệm', desc: 'Bài học thực chiến từ cộng đồng' },
    player: { label: 'Người chơi', desc: 'Phân tích cầu thủ, build đội hình' },
},
```

**Thêm vào khối `admin` tiếng Việt** (cạnh `colViews: 'Lượt xem',` đã thêm ở module Analytics):
```js
categoriesHeading: 'Danh mục',
addCategory: 'Thêm danh mục',
editCategory: 'Sửa danh mục',
colSlug: 'Slug',
colLabel: 'Tên',
colHasSteps: 'Có bước hướng dẫn',
categoriesEmpty: 'Chưa có danh mục nào.',
formSlug: 'Slug (không đổi được sau khi tạo)',
formLabelVi: 'Tên (Tiếng Việt)',
formLabelEn: 'Tên (Tiếng Anh)',
formDescVi: 'Mô tả ngắn (Tiếng Việt)',
formDescEn: 'Mô tả ngắn (Tiếng Anh)',
formGradient: 'Gradient (class Tailwind, vd: from-amber-400 via-orange-500 to-pink-500)',
formHasSteps: 'Cho phép "Bước hướng dẫn kỹ năng" (steps + video)',
yes: 'Có',
no: 'Không',
```

**Thêm vào khối `admin` tiếng Anh** (cạnh `colViews: 'Views',`):
```js
categoriesHeading: 'Categories',
addCategory: 'Add category',
editCategory: 'Edit category',
colSlug: 'Slug',
colLabel: 'Label',
colHasSteps: 'Has steps guide',
categoriesEmpty: 'No categories yet.',
formSlug: 'Slug (cannot be changed after creation)',
formLabelVi: 'Label (Vietnamese)',
formLabelEn: 'Label (English)',
formDescVi: 'Short description (Vietnamese)',
formDescEn: 'Short description (English)',
formGradient: 'Gradient (Tailwind class, e.g. from-amber-400 via-orange-500 to-pink-500)',
formHasSteps: 'Enable "Skill steps guide" (steps + video)',
yes: 'Yes',
no: 'No',
```

---

### Bước 15 — Xoá file `data/categories.js`

Sau khi hoàn thành hết các bước trên, **không còn file nào import** `frontend-rebuild/src/data/categories.js` — xoá hẳn file này (kiểm tra lại bằng cách grep `from '.*data/categories'` trong toàn bộ `frontend-rebuild/src` trước khi xoá, đảm bảo không sót chỗ nào).

---

## Kiểm tra tổng thể sau khi hoàn thành

- Chạy `node src/seed/seedCategories.js` **trước tiên** — nếu quên bước này, mọi request tạo/sửa bài viết ở Admin sẽ báo lỗi 400 "Danh mục không hợp lệ" dù code không có bug gì.
- `GET /api/categories` (không token) trả về 4 category đúng dữ liệu cũ.
- Trang chủ, trang Danh mục, Tìm kiếm, Footer đều hiện đúng tên/mô tả 4 danh mục như trước khi đổi (không bị vỡ do thiếu optional chaining).
- Admin → tab "Danh mục": thêm 1 danh mục mới (vd. slug `review`, không tick "có bước hướng dẫn") → hiện ngay trong danh sách, cũng hiện ngay ở trang chủ/tìm kiếm (nhờ `refetch()` sau khi tạo).
- Admin → tạo bài viết mới, chọn danh mục vừa thêm (`review`) → **không** thấy field "Video hướng dẫn"/"Bước hướng dẫn kỹ năng" (vì `hasSteps: false`). Đổi sang chọn "Kỹ năng" (`hasSteps: true`) → 2 field đó xuất hiện lại.
- Admin → sửa danh mục `skill`, tick thêm "có bước hướng dẫn" cho 1 danh mục khác (vd. `tactic`) → vào tạo bài viết mới chọn `tactic` → field "Bước hướng dẫn" cũng xuất hiện (xác nhận tổng quát hoá đúng theo `hasSteps`, không còn hardcode `'skill'`).
- Thử xoá danh mục `skill` khi vẫn còn bài viết thuộc danh mục này → backend trả lỗi rõ ràng, danh mục **không** bị xoá.
- Xoá danh mục vừa tạo ở trên (`review`, chưa có bài viết nào) → xoá thành công, biến mất khỏi mọi nơi hiển thị.
- `sitemap.xml` (`GET /sitemap.xml` ở backend) vẫn liệt kê đủ URL `/chuyen-muc/:slug` cho từng category hiện có trong DB.
- Tab "Thống kê" (Analytics) → biểu đồ "Bài viết theo chuyên mục" vẫn hiện đủ, kể cả danh mục mới thêm (không bị thiếu do hardcode `CATEGORY_IDS` cũ).
- Đổi ngôn ngữ VI/EN → tên/mô tả danh mục ở mọi nơi đổi theo đúng `label[lang]`/`desc[lang]`.

## Còn cần bạn chốt

Không có — cả 3 quyết định chính (phạm vi CRUD, tổng quát hoá `hasSteps`, chặn xoá khi còn bài viết) đã chốt qua `AskUserQuestion` trước khi viết tài liệu này. Quyết định phụ (slug không sửa được sau khi tạo) là hệ quả kỹ thuật trực tiếp, đã giải thích lý do ở đầu file.
