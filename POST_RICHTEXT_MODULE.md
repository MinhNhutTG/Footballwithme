# Module: Nâng ô nhập bài viết (Intro/Trích dẫn/Lỗi thường gặp) thành rich text

> **✅ Trạng thái: đã hoàn thành, đã commit/push (`b11e87c`).** Ngoại lệ quy trình (Claude code trực tiếp, xác nhận riêng qua `AskUserQuestion` cho module này). Đã tự verify: `npx vite build` sạch, backend cú pháp hợp lệ, sanitize lọc đúng `<script>`/`onerror` nhưng giữ thẻ hợp lệ (test bằng `node -e` gọi thẳng `sanitizeBilingualRichText`). Chưa test UI thật (gõ định dạng trong Admin, xem hiển thị ngoài trang) — cần người dùng tự kiểm tra.

Module fullstack tiếp theo sau Thống kê Admin (`ADMIN_ANALYTICS_MODULE.md`, ✅). Người dùng phản ánh cách viết bài hiện tại "rất cứng nhắc" so với diễn đàn/blog thật — khảo sát code xác nhận đúng: mọi bài viết bị ép vào khung cố định `intro → (steps nếu skill) → body → quote → mistake`, và trong khung đó, chỉ `body` có rich text editor (Tiptap, đã có sẵn từ trước — component `RichTextEditor.jsx`), còn `intro`/`quote`/`mistake`/`excerpt` vẫn là `<textarea>` chữ thường, không gõ đậm/nghiêng/danh sách được.

## Khảo sát hiện trạng (trước khi viết spec)

- **`RichTextEditor.jsx`** (Tiptap + `StarterKit`) đã tồn tại sẵn, đang dùng cho `body` — tái dùng y nguyên component này cho 3 ô mới, không cần viết editor mới.
- **`Post` model** (`backend/src/models/Post.js`): `intro`, `quote`, `mistake` đều đã là `bilingualString` (`{vi: String, en: String}`) — **không cần sửa schema**, Mongoose String không kiểm tra định dạng, HTML string lưu được y như plain text.
- **`backend/src/utils/sanitize.js`**: có sẵn `sanitizeRichText(html)` (dùng `sanitize-html`, allowlist thẻ `p/br/strong/b/em/i/s/strike/h2/h3/ul/ol/li/blockquote/code/pre/hr`) và `sanitizePostBody(body)` — nhưng `sanitizePostBody` **chỉ bọc cho field `body`**, chưa dùng cho field nào khác.
- **`backend/src/controllers/postController.js`**: `create`/`update` chỉ gọi `sanitizePostBody(req.body.body)`, các field khác đi thẳng từ `req.body` không qua sanitize — nếu chỉ đổi frontend mà quên sửa đây, `intro`/`quote`/`mistake` sẽ lưu HTML **chưa được sanitize**, nguy cơ XSS nếu sau này có editor/nguồn nhập khác không phải Tiptap.
- **`frontend-rebuild/src/pages/ArticleDetail.jsx`**: hiện render `intro`/`quote`/`mistake` bằng interpolation chữ thường (`{article.intro[lang]}`) — nếu chỉ đổi ô nhập mà không sửa chỗ này, HTML lưu trong DB sẽ hiện thẳng thẻ `<p>`, `<strong>`... dạng chữ thô ngoài trang, không render thành định dạng thật.
- **`excerpt`** (khảo sát riêng, không nằm trong phạm vi module này — đã hỏi và chốt giữ nguyên): dùng làm dòng tóm tắt ngắn trong `ArticleCard.jsx` và so khớp tìm kiếm dạng chuỗi thường trong `Search.jsx` (`p.excerpt.vi`/`p.excerpt.en` nằm trong mảng `haystack` để `.includes(q)`) — giữ `<textarea>` chữ thường là đúng, không đụng tới.

## Quyết định đã chốt

Chốt qua `AskUserQuestion`, 2 câu:

1. **Phạm vi thay đổi:** chỉ nâng cấp ô nhập (giữ nguyên khung cố định `intro→steps→body→quote→mistake`, giữ nguyên style hiển thị từng khối) — **không** gộp thành 1 ô viết tự do kiểu diễn đàn thật, cũng không làm block editor kiểu Notion (đánh giá không hợp quy mô project hiện tại).
2. **`excerpt` giữ nguyên `<textarea>` chữ thường**, không nâng lên rich text — vì nó là tóm tắt ngắn dùng cho card + tìm kiếm dạng chuỗi, không phải nội dung dài cần định dạng.

**1 quyết định kỹ thuật phát sinh khi viết spec (không cần hỏi lại — hệ quả trực tiếp từ quyết định #1 ở trên):** ô "Trích dẫn" hiện bọc cứng dấu ngoặc kép `"..."` quanh nội dung (`"{article.quote[lang]}"` trong JSX). Khi nội dung đổi từ 1 dòng chữ thường sang HTML rich text (có thể nhiều đoạn/định dạng), cặp ngoặc kép cứng không còn hợp lý — spec này **bỏ cặp ngoặc kép**, giữ nguyên khung `<blockquote>` viền trái màu accent.

---

## Kiến trúc chung

```
PostForm.jsx (admin)
  intro/quote/mistake: <textarea> ──▶ RichTextEditor (Tiptap, tái dùng)
        │
        ▼ (submit, HTML string)
  POST/PUT /api/posts
        │
        ▼
  postController.js: sanitizeBilingualRichText(body/intro/quote/mistake)  ← MỚI, áp cho cả 3 field
        │
        ▼
  MongoDB (Post.intro/quote/mistake: String, không đổi schema)
        │
        ▼
  ArticleDetail.jsx: {article.intro[lang]} ──▶ dangerouslySetInnerHTML (prose-content, giống body)
```

---

## Bước 1 — Backend: tổng quát hoá `sanitize.js` + áp dụng cho 3 field

**Sửa `backend/src/utils/sanitize.js`** — đổi tên `sanitizePostBody` thành hàm tổng quát dùng được cho mọi field bilingual rich text (không chỉ `body`):

```js
const sanitizeHtml = require('sanitize-html');

const RICH_TEXT_OPTIONS = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 's', 'strike',
    'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr',
  ],
  allowedAttributes: {},
};

function sanitizeRichText(html) {
  return sanitizeHtml(html || '', RICH_TEXT_OPTIONS);
}

function sanitizeBilingualRichText(field) {
  if (!field) return field;
  return {
    vi: sanitizeRichText(field.vi),
    en: sanitizeRichText(field.en),
  };
}

module.exports = { sanitizeRichText, sanitizeBilingualRichText };
```

**Sửa `backend/src/controllers/postController.js`** — đổi import và áp `sanitizeBilingualRichText` cho cả 4 field (`body` đã có từ trước + 3 field mới), ở cả `create` và `update`:

```js
const Post = require('../models/Post');
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

Toàn bộ file dán lại đầy đủ (không chỉ đoạn đổi) vì `sanitizePostBody` bị đổi tên — nếu chỉ sửa 2 dòng `create`/`update` mà quên đổi tên import, `sanitizePostBody is not defined` sẽ throw ngay khi gọi API.

**Kiểm tra (Postman/curl):**
- Tạo bài viết mới với `intro.vi` chứa `<script>alert(1)</script>` lẫn trong nội dung → response trả về **không còn** thẻ `<script>` (bị `sanitize-html` lọc, vì `script` không nằm trong `allowedTags`).
- Tạo bài viết với `intro.vi` chứa `<strong>đậm</strong>` (thẻ hợp lệ) → response giữ nguyên thẻ đó.

---

## Bước 2 — Frontend: `PostForm.jsx` đổi 3 ô sang `RichTextEditor`

**Sửa `frontend-rebuild/src/components/admin/PostForm.jsx`** — đổi 3 dòng gọi `textField(..., 'textarea')` thành `bodyField(...)` (hàm này đã có sẵn trong file, đang dùng cho `body`, chỉ cần gọi lại cho field khác):

Dòng hiện tại:
```jsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{textField('formIntroVi', 'introVi', 'textarea')}{textField('formIntroEn', 'introEn', 'textarea')}</div>
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{bodyField('formBodyVi', 'bodyVi')}{bodyField('formBodyEn', 'bodyEn')}</div>
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{textField('formQuoteVi', 'quoteVi', 'textarea')}{textField('formQuoteEn', 'quoteEn', 'textarea')}</div>
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{textField('formMistakeVi', 'mistakeVi', 'textarea')}{textField('formMistakeEn', 'mistakeEn', 'textarea')}</div>
```

Đổi thành:
```jsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{bodyField('formIntroVi', 'introVi')}{bodyField('formIntroEn', 'introEn')}</div>
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{bodyField('formBodyVi', 'bodyVi')}{bodyField('formBodyEn', 'bodyEn')}</div>
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{bodyField('formQuoteVi', 'quoteVi')}{bodyField('formQuoteEn', 'quoteEn')}</div>
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{bodyField('formMistakeVi', 'mistakeVi')}{bodyField('formMistakeEn', 'mistakeEn')}</div>
```

Dòng `excerpt` (`textField('formExcerptVi', 'excerptVi', 'textarea')`) **giữ nguyên, không đổi** — đúng quyết định đã chốt.

Không cần sửa gì khác trong file này: `EMPTY_FORM`, `handleChange`, `handleRichChange`, `toFormValues` (ở `Admin.jsx`) đều đã đọc/ghi các field này như chuỗi string sẵn, không phân biệt "chuỗi thường" hay "chuỗi HTML".

**Kiểm tra:**
- Mở form "Thêm bài viết"/"Sửa bài viết" → 3 ô Intro/Trích dẫn/Lỗi thường gặp (cả VI lẫn EN) giờ có thanh công cụ định dạng (B/I/S/H2/H3/•/1./") giống hệt ô Nội dung.
- Gõ đậm/nghiêng/danh sách trong ô Intro → lưu bài → mở lại để sửa → định dạng vẫn còn nguyên (không bị mất khi load lại từ DB).

---

## Bước 3 — Frontend: `ArticleDetail.jsx` render HTML thay vì chữ thường

**Sửa `frontend-rebuild/src/pages/ArticleDetail.jsx`** — 3 chỗ, đổi từ interpolation `{...}` sang `dangerouslySetInnerHTML`:

1. Khối Intro — đổi từ:
```jsx
<p className="text-lg leading-relaxed text-fwm-text">
    {article.intro[lang]}
</p>
```
thành:
```jsx
<div className="prose-content text-lg leading-relaxed text-fwm-text"
    // sanitized server-side (sanitize-html) before storage, admin-only write access
    dangerouslySetInnerHTML={{ __html: article.intro[lang] }} />
```

2. Khối Trích dẫn — đổi từ:
```jsx
<blockquote className="mt-8 rounded-fwm-lg border-l-4 border-fwm-accent bg-fwm-card px-5 py-4 font-head text-lg font-bold italic text-fwm-text">
    "{article.quote[lang]}"
</blockquote>
```
thành (bỏ cặp ngoặc kép `"..."`, theo quyết định đã chốt ở trên):
```jsx
<blockquote className="prose-content mt-8 rounded-fwm-lg border-l-4 border-fwm-accent bg-fwm-card px-5 py-4 font-head text-lg font-bold italic text-fwm-text"
    dangerouslySetInnerHTML={{ __html: article.quote[lang] }} />
```

3. Khối Lỗi thường gặp — đổi phần `<p>` bên trong (giữ nguyên `<p>` nhãn "Lỗi thường gặp" phía trên, không đụng):
```jsx
<div className="mt-8 rounded-fwm-lg border border-fwm-pink/30 bg-fwm-pink/10 px-5 py-4">
    <p className="font-head text-xs font-bold uppercase tracking-wide text-fwm-pink">
        {t.article.mistakeLabel}
    </p>
    <div className="prose-content mt-1.5 text-sm text-fwm-text"
        dangerouslySetInnerHTML={{ __html: article.mistake[lang] }} />
</div>
```

**Kiểm tra:**
- Mở 1 bài viết đã gõ định dạng (đậm/nghiêng/danh sách) ở Bước 2 → hiện đúng định dạng ngoài trang (không còn thấy thẻ `<p>`/`<strong>` dạng chữ thô).
- Mở lại 1 bài viết **cũ** (tạo trước module này, `intro`/`quote`/`mistake` là chữ thường không có thẻ HTML) → vẫn hiển thị đúng bình thường, không vỡ layout (chữ thường không chứa thẻ HTML thì `dangerouslySetInnerHTML` render y hệt như hiển thị text thường).
- **Trường hợp cần lưu ý riêng** (không phải bug, không cần sửa gì thêm — chỉ để biết nếu gặp): nếu bài viết cũ có sẵn ký tự `<`, `>`, hoặc `&` gõ trực tiếp trong `intro`/`quote`/`mistake` (ví dụ "cầu thủ dưới 20 tuổi" gõ tắt thành "< 20 tuổi"), khi render qua `dangerouslySetInnerHTML` các ký tự này sẽ bị hiểu nhầm thành mở đầu thẻ HTML, có thể làm mất đoạn văn sau đó. Nếu gặp bài nào hiển thị bị cụt sau khi làm xong module này, tra ký tự `<`/`>`/`&` thô trong field tương ứng của bài đó trong MongoDB.
- Khối Trích dẫn không còn dấu ngoặc kép cứng bao quanh — kiểm tra bằng mắt xem layout `<blockquote>` (viền trái, nền, chữ nghiêng) vẫn đẹp khi không có ngoặc kép.

---

## Còn cần bạn chốt

Không có — cả 2 quyết định (phạm vi thay đổi, giữ nguyên `excerpt`) đã chốt qua `AskUserQuestion` trước khi viết tài liệu này.
