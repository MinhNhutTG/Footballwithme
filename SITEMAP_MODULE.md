# Module: Sitemap.xml + robots.txt

Nối tiếp việc xác minh Google Search Console đã xong (xem README, mục xác minh domain qua file HTML) — có xác minh domain mà chưa có sitemap thì Google vẫn phải tự bò tìm link, rất chậm mới index hết bài viết. Module này thêm `sitemap.xml` (liệt kê URL để Google biết crawl gì) và `robots.txt` (khai báo vị trí sitemap + chặn crawl trang admin).

## Khảo sát hiện trạng (trước khi viết spec)

- **2 domain khác nhau**: frontend `https://footballwithme-base.vercel.app` (Vercel, static SPA build từ `frontend-rebuild/`), backend `https://footballwithme-backend.onrender.com` (Render, Express). Dữ liệu bài viết (nguồn để liệt kê URL) chỉ có ở backend/MongoDB.
- **Ràng buộc kỹ thuật của chuẩn sitemap**: 1 file `sitemap.xml` chỉ được phép liệt kê URL **cùng host** với nơi chính file đó được truy cập (Google không chấp nhận sitemap ở domain A liệt kê URL của domain B, trừ khi khai báo sở hữu chéo phức tạp) — nên **không thể** đặt file này thẳng ở backend rồi submit link backend cho Google, vì URL bài viết thật (`/bai-viet/:id`) nằm ở domain frontend.
- `frontend-rebuild/vercel.json` hiện chỉ có 1 rule: `{ "source": "/(.*)", "destination": "/index.html" }` (SPA fallback, y hệt rule đã dùng để serve file xác minh Google tĩnh trong `public/`). Vercel **rewrites hỗ trợ destination là 1 URL tuyệt đối** (dùng để proxy sang domain khác) — đây là cách duy nhất để "sitemap nằm ở domain frontend" mà nội dung vẫn do backend sinh ra từ DB thật.
- `backend/src/models/Post.js`: `category` là `enum: ['skill', 'tactic', 'exp', 'player']` ngay trong schema Mongoose — có thể lấy list này bằng `Post.schema.path('category').enumValues` thay vì hard-code lại 1 mảng category id riêng (tránh 2 nơi định nghĩa lệch nhau khi sau này đổi category).
- `Post` có `timestamps: true` → có sẵn `updatedAt` để làm `<lastmod>` cho từng bài viết, không cần thêm field mới.
- Route "không thuộc `/api`" đã có tiền lệ: `app.get('/api/health', ...)` định nghĩa thẳng trong `server.js`, không qua file route riêng — `/sitemap.xml` cũng sẽ định nghĩa kiểu này (tại domain root, đúng chuẩn sitemap, không phải `/api/sitemap.xml`).
- `process.env.FRONTEND_URL` đã là convention có sẵn (dùng ở `authController.js`, `commentController.js`) để build link trỏ về frontend — tái dùng y hệt, không thêm biến môi trường mới.
- File proxy này được **Vercel gọi server-to-server** (không phải trình duyệt fetch trực tiếp) nên không phát sinh vấn đề CORS gì cả — không cần sửa `cors()` config trong `server.js`.

## Quyết định đã chốt

Đã hỏi qua `AskUserQuestion` trước khi viết spec:

1. **Backend sinh XML động, Vercel rewrite proxy qua domain frontend** — không dùng file `sitemap.xml` tĩnh generate tay/lúc build rồi bỏ vào `frontend-rebuild/public/` (cách này giống hệt file xác minh Google, nhưng sẽ lỗi thời ngay khi admin đăng bài mới, phải tự nhớ chạy lại script — không phục vụ đúng mục đích "Google tự biết bài mới"). Mỗi lần Google (hoặc ai đó) gọi `footballwithme-base.vercel.app/sitemap.xml`, Vercel âm thầm forward request đó sang `footballwithme-backend.onrender.com/sitemap.xml`, backend query Mongo lấy danh sách bài viết **mới nhất tại thời điểm gọi**, trả XML — không có độ trễ "phải build lại".

## Kiến trúc

```
Google / crawler                    Admin đăng bài mới
      │                                    │
      ▼                                    ▼
footballwithme-base.vercel.app/sitemap.xml    Post document mới trong MongoDB
      │
      │  vercel.json rewrite (proxy, server-to-server, không qua browser)
      ▼
footballwithme-backend.onrender.com/sitemap.xml
      │
      ▼
sitemapController.generate
      │
      ├─ Post.find().select('_id updatedAt')     → mỗi bài 1 <url><loc>.../bai-viet/:id</loc><lastmod>...</lastmod></url>
      ├─ Post.schema.path('category').enumValues  → mỗi category 1 <url><loc>.../chuyen-muc/:id</loc></url>
      └─ STATIC_PATHS (/, /gioi-thieu, /lien-he, /chuyen-muc)
      │
      ▼
res.type('application/xml').send(xml)   → Google luôn thấy đúng bài viết mới nhất, không cần build lại gì
```

`robots.txt` thì **để tĩnh** trong `frontend-rebuild/public/` (giống file xác minh Google) — không cần động vì nội dung gần như không đổi (luật chặn crawl + 1 dòng trỏ tới sitemap).

---

## Bước 1 — Backend: Controller sinh sitemap XML

Tạo file mới `backend/src/controllers/sitemapController.js`:

```js
const Post = require('../models/Post');

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
    const categories = Post.schema.path('category').enumValues;
    const posts = await Post.find().select('_id updatedAt').sort({ updatedAt: -1 });

    const urls = [
      ...STATIC_PATHS.map((path) => ({ loc: `${baseUrl}${path}` })),
      ...categories.map((cat) => ({ loc: `${baseUrl}/chuyen-muc/${cat}` })),
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

- `escapeXml` phòng trường hợp `FRONTEND_URL` hoặc id có ký tự đặc biệt (thực tế hiếm gặp vì đều do server tự sinh, nhưng vẫn nên escape khi build XML thủ công bằng string, tránh XML lỗi cú pháp nếu có ký tự lạ).
- `categories` lấy trực tiếp từ Mongoose schema thay vì hard-code mảng riêng — đổi enum ở `Post.js` sau này thì sitemap tự động theo, không phải sửa 2 chỗ.
- Không dùng `.populate()`/lấy nguyên document — chỉ `.select('_id updatedAt')` vì sitemap không cần nội dung bài viết, tránh tải dữ liệu thừa khi số bài viết tăng lên.

Sửa `backend/src/server.js` — từ:

```js
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Backend is running!',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
```

thành:

```js
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Backend is running!',
    timestamp: new Date().toISOString()
  });
});

app.get('/sitemap.xml', generateSitemap);

app.use('/api/auth', authRoutes);
```

và thêm import ở đầu file — từ:

```js
const logRoutes = require('./routes/logRoutes')
const errorHandler = require('./middleware/errorHandler');
```

thành:

```js
const logRoutes = require('./routes/logRoutes')
const { generate: generateSitemap } = require('./controllers/sitemapController');
const errorHandler = require('./middleware/errorHandler');
```

Đặt route thẳng trong `server.js` (không tạo file `sitemapRoutes.js` riêng) — theo đúng tiền lệ `/api/health` đã làm y hệt kiểu này, và sitemap chỉ có 1 route duy nhất nên không cần tách file route.

**Kiểm tra:** mở thẳng `https://footballwithme-backend.onrender.com/sitemap.xml` (hoặc `http://localhost:5000/sitemap.xml` khi chạy local) trên trình duyệt → thấy XML liệt kê đủ: 4 static path, 4 category, và toàn bộ bài viết hiện có, `<loc>` toàn bộ trỏ về domain **frontend** (`FRONTEND_URL`), không phải domain backend.

---

## Bước 2 — Frontend: proxy `/sitemap.xml` sang backend qua `vercel.json`

Sửa `frontend-rebuild/vercel.json` — từ:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

thành:

```json
{
  "rewrites": [
    { "source": "/sitemap.xml", "destination": "https://footballwithme-backend.onrender.com/sitemap.xml" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Bắt buộc để rule `/sitemap.xml` lên trước rule catch-all `/(.*)`** — Vercel khớp rewrite theo thứ tự, rule đứng trước thắng; nếu để catch-all lên trước, mọi request kể cả `/sitemap.xml` sẽ bị nuốt vào `/index.html` trước khi tới được rule proxy.

**Kiểm tra:** deploy lại frontend (Vercel tự build khi push), mở `https://footballwithme-base.vercel.app/sitemap.xml` → phải ra đúng y hệt nội dung XML đã thấy ở Bước 1 (không phải HTML của SPA), header response `Content-Type: application/xml`.

---

## Bước 3 — Frontend: `robots.txt`

Tạo file mới `frontend-rebuild/public/robots.txt`:

```
User-agent: *
Allow: /
Disallow: /admin

Sitemap: https://footballwithme-base.vercel.app/sitemap.xml
```

- `Disallow: /admin` chặn crawl toàn bộ `/admin` và `/admin/login` (robots.txt khớp theo tiền tố đường dẫn, không cần khai riêng từng route con) — trang quản trị không có giá trị SEO, không nên để lọt vào kết quả tìm kiếm.
- Đặt trong `public/` giống file xác minh Google (`google0abb2647eb0df704.html`) — Vite copy nguyên xi ra root khi build, request tới `/robots.txt` khớp file tĩnh trước khi rơi vào rewrite catch-all (đúng cơ chế đã xác nhận khi làm file xác minh Google).

**Kiểm tra:** sau khi deploy, mở `https://footballwithme-base.vercel.app/robots.txt` → thấy đúng nội dung trên, không bị rewrite thành `index.html`.

---

## Kiểm tra cuối (sau khi deploy cả frontend lẫn backend)

1. `https://footballwithme-base.vercel.app/sitemap.xml` trả về XML hợp lệ (không phải HTML), `<loc>` toàn bộ là domain frontend.
2. Đăng 1 bài viết mới qua Admin Dashboard → gọi lại `/sitemap.xml` (không cần deploy lại gì) → thấy bài mới xuất hiện ngay trong danh sách `<url>`.
3. Xoá 1 bài viết → gọi lại `/sitemap.xml` → bài đó biến mất khỏi danh sách.
4. `https://footballwithme-base.vercel.app/robots.txt` mở được, có dòng `Sitemap: https://footballwithme-base.vercel.app/sitemap.xml` đúng domain frontend, có `Disallow: /admin`.
5. Vào Google Search Console (đã xác minh domain từ trước) → mục Sitemaps → submit `sitemap.xml` → status chuyển "Success", số URL phát hiện khớp số bài viết + static path + category hiện có.
