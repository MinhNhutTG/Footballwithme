# Module: SEO — meta title/description động + field trong Settings

Nối tiếp `SETTINGS_MODULE.md` (✅) — lúc viết spec đó đã cố tình **không** đụng `<title>`/meta SEO, ghi rõ "tránh lan rộng ngoài yêu cầu ban đầu". Giờ làm phần đó.

## Khảo sát hiện trạng (trước khi viết spec)

- **`frontend-rebuild/index.html`**: `<title>FootballWithMe</title>` tĩnh cứng, **không có bất kỳ thẻ `<meta name="description">` hay Open Graph nào** — mọi trang (Home, bài viết, chuyên mục,...) đều hiện chung 1 tiêu đề trên tab trình duyệt và kết quả tìm kiếm Google, không phân biệt nội dung.
- **Đây là SPA thuần client-render (Vite + React, không SSR/SSG)** — ràng buộc kỹ thuật quan trọng: Googlebot hiện chạy được JavaScript nên `<title>`/meta gắn bằng JS **vẫn giúp ích cho việc index của Google**, nhưng bot quét preview link của Facebook/Discord/Zalo **không chạy JS**, nên **sẽ không thấy** các thẻ này — phạm vi module này dừng ở title/meta description, không làm Open Graph/Twitter Card (cần thêm 1 tầng server-side riêng phát hiện bot, phức tạp hơn nhiều, đã hỏi qua `AskUserQuestion` và bạn chọn KHÔNG làm phần đó ở module này).
- **`SITEMAP_MODULE.md`** (đã xong) lo phần "Google biết URL nào tồn tại" — module này lo phần "mỗi URL hiện tiêu đề/mô tả gì" — 2 việc bổ trợ nhau, không trùng.
- **`SiteSettings` đã có `siteName` + `description{vi,en}`** (dùng cho Header/Footer) — tận dụng lại làm fallback: `siteName` làm hậu tố `<title>` (`"{Tiêu đề trang} | {siteName}"`), nhưng **`description` (tagline Footer) không tái dùng thẳng làm meta description** — 2 mục đích khác nhau (tagline thương hiệu thường ngắn/cảm xúc, meta description nên súc tích/đúng trọng tâm để hiện đẹp trên kết quả tìm kiếm) → thêm field mới riêng `seo.metaDescription`, fallback 2 lớp: field SEO riêng → nếu rỗng thì mới lùi về `description` chung.
- **Chưa có thư viện quản lý `<head>` động nào** (`react-helmet`/`react-helmet-async`) — cần cài mới. Chọn `react-helmet-async` (bản duy trì tốt, tương thích React 19).
- **Các trang cần tiêu đề/mô tả riêng theo nội dung thật** (không chỉ đọc từ Settings): `ArticleDetail.jsx` (tiêu đề + excerpt bài viết), `Category.jsx` phần `CategoryDetail` (tên + mô tả chuyên mục). `Home.jsx`/`About.jsx`/`Contact.jsx` dùng tiêu đề tĩnh + fallback mô tả từ Settings.

## Quyết định đã chốt

Chốt qua `AskUserQuestion`: **thêm field Settings + gắn `<title>`/meta description động cho từng trang** (không làm Open Graph/Twitter Card — nằm ngoài phạm vi vì cần hạ tầng server-side riêng cho bot không chạy JS).

---

## Kiến trúc chung

```
SiteSettings.seo.metaDescription {vi,en}   (field MỚI, riêng biệt với description/tagline Footer)
        │
        ▼
<SEO title description />  (component dùng chung, đọc useSettings()+useLang())
  title:       nếu có prop → "{title} | {siteName}", không có → chỉ {siteName} (dùng cho Home)
  description: prop description → seo.metaDescription[lang] → description[lang] (3 lớp fallback)
        │
        ▼
<Helmet><title>...</title><meta name="description".../></Helmet>   (react-helmet-async)

Home.jsx        → <SEO />                                        (không prop, dùng toàn fallback)
About.jsx       → <SEO title={...} description={...} />           (nội dung tĩnh của trang)
Contact.jsx     → <SEO title={...} description={...} />
Category.jsx    → CategoryOverview: <SEO title={...} />
                   CategoryDetail:  <SEO title={category.label} description={category.desc} />
ArticleDetail.jsx → <SEO title={article.title} description={article.excerpt} />
```

---

## Bước 1 — Backend: thêm field `seo.metaDescription` vào `SiteSettings`

**Sửa `backend/src/models/SiteSettings.js`:**

```js
const mongoose = require('mongoose');

const bilingualString = { vi: String, en: String };

const siteSettingsSchema = new mongoose.Schema(
  {
    siteName: { type: String, default: 'FootballWithMe' },
    description: { type: bilingualString, default: () => ({ vi: '', en: '' }) },
    logoUrl: { type: String, default: '' },
    socialLinks: { type: [{ label: String, url: String }], default: [] },
    seo: {
      type: { metaDescription: bilingualString },
      default: () => ({ metaDescription: { vi: '', en: '' } }),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
```

**Không cần đổi `settingsController.js`/`settingsRoutes.js`** — `get`/`update` đã tổng quát (`Object.assign(settings, req.body)`), tự nhận field mới không cần sửa gì. **Không cần migration** — document Settings hiện có sẽ tự nhận `seo: {metaDescription: {vi:'', en:''}}` làm default ngay khi Mongoose đọc lại (field mới có default an toàn, không khoá tính năng nào).

**Kiểm tra:** `GET /api/settings` → response giờ có thêm `seo: {metaDescription: {vi:'', en:''}}`.

---

## Bước 2 — Frontend: cài `react-helmet-async` + wrap `HelmetProvider`

```bash
cd frontend-rebuild
npm install react-helmet-async
```

**Sửa `frontend-rebuild/src/main.jsx`** — thêm import:
```js
import { HelmetProvider } from 'react-helmet-async';
```

Bọc thêm 1 lớp ngoài cùng — đổi từ:
```jsx
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
```
thành:
```jsx
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider>
```
(và thêm `</HelmetProvider>` khớp trước `</StrictMode>` ở phần đóng thẻ phía dưới cùng file).

**Kiểm tra:** `npm run build` không lỗi.

---

## Bước 3 — Frontend: component `SEO.jsx` dùng chung

**Tạo file mới `frontend-rebuild/src/components/common/SEO.jsx`:**

```jsx
import { Helmet } from 'react-helmet-async';
import { useSettings } from '../../context/SettingsContext';
import { useLang } from '../../context/LangContext';

function SEO({ title, description }) {
    const { settings } = useSettings();
    const { lang } = useLang();
    const siteName = settings?.siteName || 'FootballWithMe';
    const fallbackDescription = settings?.seo?.metaDescription?.[lang] || settings?.description?.[lang] || '';
    const fullTitle = title ? `${title} | ${siteName}` : siteName;
    const metaDescription = description || fallbackDescription;

    return (
        <Helmet>
            <title>{fullTitle}</title>
            {metaDescription && <meta name="description" content={metaDescription} />}
        </Helmet>
    );
}

export default SEO;
```

Điểm cần hiểu:
- **Không truyền `title`** (như `Home.jsx` ở Bước 4) → `fullTitle` chỉ là `siteName`, không có dấu `|` thừa — đúng chuẩn SEO cho trang chủ (thường chỉ hiện tên site, không lặp "Trang chủ | ...").
- **`description` (prop) ưu tiên cao nhất**, rồi mới tới `seo.metaDescription[lang]`, cuối cùng mới `description[lang]` (tagline Footer) — 3 lớp fallback, trang càng có nội dung cụ thể (bài viết/chuyên mục) càng ưu tiên dùng đúng nội dung đó thay vì mô tả chung chung.
- **`{metaDescription && <meta .../>}`** — nếu cả 3 lớp đều rỗng (Settings mới tạo, admin chưa nhập gì) thì không render thẻ `meta` rỗng (thẻ `content=""` không có ý nghĩa, thà không có còn hơn).

---

## Bước 4 — Frontend: gắn `<SEO>` vào từng trang

**`frontend-rebuild/src/pages/Home.jsx`** — thêm import:
```js
import SEO from '../components/common/SEO'
```
Thêm ngay dòng đầu tiên bên trong JSX trả về (trước `<section className="relative overflow-hidden...`):
```jsx
    return (
        <div className="animate-fwm-in">
            <SEO />
```

**`frontend-rebuild/src/pages/About.jsx`** — thêm import:
```js
import SEO from '../components/common/SEO'
```
Thêm ngay dòng đầu tiên bên trong `<section>`:
```jsx
        <section className="mx-auto max-w-3xl px-4 py-16">
            <SEO title={t.about.heading} description={t.about.desc} />
```

**`frontend-rebuild/src/pages/Contact.jsx`** — thêm import:
```js
import SEO from '../components/common/SEO'
```
Thêm `<SEO title={t.contact.heading} description={t.contact.desc} />` ngay đầu JSX trả về (trước phần tử gốc hiện có).

**`frontend-rebuild/src/pages/Category.jsx`** — thêm import:
```js
import SEO from '../components/common/SEO'
```
Trong `CategoryOverview`, thêm ngay đầu `<section>`:
```jsx
        <section className="mx-auto max-w-6xl px-4 py-14">
            <SEO title={t.section.categories} />
```
Trong `CategoryDetail`, thêm **sau** dòng `if (!category) return null;` (bắt buộc sau, vì cần `category` chắc chắn tồn tại mới đọc `.label`/`.desc` được):
```jsx
    if (!category) return null;
    return (
        <>
            <SEO title={category.label[lang]} description={category.desc?.[lang]} />
```

**`frontend-rebuild/src/pages/ArticleDetail.jsx`** — thêm import:
```js
import SEO from '../components/common/SEO'
```
Thêm **sau** khối `if (!article) {...}` (tương tự lý do trên, cần `article` chắc chắn tồn tại):
```jsx
    const currentCategory = categories.find((c) => c.slug === article.category);
    const hasSteps = !!currentCategory?.hasSteps;
```
đổi thành:
```jsx
    const currentCategory = categories.find((c) => c.slug === article.category);
    const hasSteps = !!currentCategory?.hasSteps;
```
và thêm `<SEO title={article.title[lang]} description={article.excerpt[lang]} />` làm dòng đầu tiên trong JSX trả về (trước `<article` hoặc phần tử gốc hiện có của khối `return (...)` chính, sau khối early-return `if (!article)`).

**Kiểm tra:**
- Mở từng trang, xem tab trình duyệt đổi đúng tiêu đề (`F12` → Elements → `<head>` → thấy `<title>` và `<meta name="description">` đổi đúng theo trang).
- Vào 1 bài viết cụ thể → tab hiện `"{Tên bài viết} | FootballWithMe"`, không phải tên chung chung.
- Vào trang chủ → tab chỉ hiện đúng tên site, không có dấu `|` thừa.

---

## Bước 5 — Frontend: thêm ô nhập SEO vào `SettingsPanel.jsx`

**Sửa `frontend-rebuild/src/components/admin/SettingsPanel.jsx`:**

Đổi `EMPTY_FORM`:
```js
const EMPTY_FORM = {
    siteName: '', descriptionVi: '', descriptionEn: '', logoUrl: '', socialLinks: [],
};
```
thành:
```js
const EMPTY_FORM = {
    siteName: '', descriptionVi: '', descriptionEn: '', logoUrl: '', socialLinks: [],
    seoDescriptionVi: '', seoDescriptionEn: '',
};
```

Đổi `toFormValues`:
```js
function toFormValues(settings) {
    return {
        siteName: settings.siteName || '',
        descriptionVi: settings.description?.vi || '',
        descriptionEn: settings.description?.en || '',
        logoUrl: settings.logoUrl || '',
        socialLinks: settings.socialLinks || [],
    };
}
```
thành:
```js
function toFormValues(settings) {
    return {
        siteName: settings.siteName || '',
        descriptionVi: settings.description?.vi || '',
        descriptionEn: settings.description?.en || '',
        logoUrl: settings.logoUrl || '',
        socialLinks: settings.socialLinks || [],
        seoDescriptionVi: settings.seo?.metaDescription?.vi || '',
        seoDescriptionEn: settings.seo?.metaDescription?.en || '',
    };
}
```

Trong `handleSubmit`, đổi `payload`:
```js
        const payload = {
            siteName: form.siteName,
            description: { vi: form.descriptionVi, en: form.descriptionEn },
            logoUrl: form.logoUrl,
            socialLinks: form.socialLinks,
        };
```
thành:
```js
        const payload = {
            siteName: form.siteName,
            description: { vi: form.descriptionVi, en: form.descriptionEn },
            logoUrl: form.logoUrl,
            socialLinks: form.socialLinks,
            seo: { metaDescription: { vi: form.seoDescriptionVi, en: form.seoDescriptionEn } },
        };
```

Thêm 1 khối mới vào JSX, đặt **sau** khối "Logo" và **trước** khối "Link mạng xã hội" (tìm đoạn `<p className="mt-1 text-xs text-fwm-muted">Chưa upload thì Header/Footer tự hiện logo chữ mặc định.</p>` — thêm ngay sau `</div>` đóng khối Logo):

```jsx
                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Mô tả SEO (VI)</label>
                    <textarea rows={2} maxLength={160} value={form.seoDescriptionVi} onChange={handleChange('seoDescriptionVi')}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                </div>
                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Mô tả SEO (EN)</label>
                    <textarea rows={2} maxLength={160} value={form.seoDescriptionEn} onChange={handleChange('seoDescriptionEn')}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                </div>
                <p className="text-xs text-fwm-muted">Hiện trên kết quả tìm kiếm Google cho các trang không có mô tả riêng (Trang chủ, Giới thiệu, Liên hệ...). Nên viết dưới 160 ký tự.</p>
```

Điểm cần hiểu: `maxLength={160}` là giới hạn nhập liệu ở form (UX nhắc admin), không phải validate bắt buộc ở backend — Google tự cắt bớt mô tả dài hơn ~160 ký tự khi hiển thị kết quả tìm kiếm, để admin tự do nhập dài hơn vẫn được lưu, chỉ là hiển thị sẽ bị cắt.

**Kiểm tra:**
- Vào `/admin?tab=settings`, thấy 2 ô "Mô tả SEO (VI)/(EN)" mới, nằm giữa Logo và Link mạng xã hội.
- Nhập mô tả SEO → Lưu → F5 → giá trị vẫn giữ (đọc đúng từ `settings.seo.metaDescription`).
- Vào trang chủ (`/`) → `<meta name="description">` đổi đúng theo nội dung vừa nhập (vì Home không truyền `description` riêng, rơi vào fallback `seo.metaDescription`).
- Vào 1 bài viết → `<meta name="description">` vẫn là excerpt của bài viết đó, **không** bị đè bởi mô tả SEO chung (đúng thứ tự ưu tiên 3 lớp).

---

## Bước 6 — Gợi ý SEO tự viết trong Admin (không dùng thư viện ngoài)

Đã cân nhắc `yoastseo` (npm, engine thật của Yoast, không phụ thuộc WordPress) nhưng **phần readability của nó không hỗ trợ tiếng Việt** — ngôn ngữ chính của site — nên chỉ dùng được cho bản EN. Thay vào đó: tự viết vài check độ dài/nội dung đơn giản, không phụ thuộc ngôn ngữ (chỉ đếm ký tự/từ, không phân tích cú pháp), không thêm dependency nặng.

**Phạm vi:** checklist hiện ở `PostForm.jsx` (tiêu đề/mô tả ngắn/nội dung/ảnh cover của bài viết) và `SettingsPanel.jsx` (tên site/mô tả SEO) — cập nhật **live** theo state form, không lưu gì vào DB, thuần hiển thị gợi ý.

**Tạo file mới `frontend-rebuild/src/utils/seoChecks.js`:**

```js
export function checkLength(text, min, max) {
    const len = (text || '').trim().length;
    if (len === 0) return { status: 'fail', message: 'Chưa nhập' };
    if (len < min) return { status: 'warn', message: `${len} ký tự — nên dài hơn (tối thiểu ~${min})` };
    if (len > max) return { status: 'warn', message: `${len} ký tự — nên ngắn hơn (tối đa ~${max})` };
    return { status: 'pass', message: `${len} ký tự — độ dài tốt` };
}

export function checkWordCount(html, min) {
    const text = (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(' ').length : 0;
    if (words === 0) return { status: 'fail', message: 'Chưa có nội dung' };
    if (words < min) return { status: 'warn', message: `${words} từ — nên viết dài hơn (tối thiểu ~${min} từ)` };
    return { status: 'pass', message: `${words} từ — độ dài nội dung tốt` };
}

export function checkPresence(value, presentMessage, missingMessage) {
    return value ? { status: 'pass', message: presentMessage } : { status: 'warn', message: missingMessage };
}
```

Điểm cần hiểu:
- **`checkWordCount` tự `replace(/<[^>]*>/g, ' ')` bóc thẻ HTML trước khi đếm từ** — `body` lưu dạng HTML (từ `RichTextEditor`/Tiptap), đếm thẳng chuỗi HTML sẽ tính nhầm cả tên thẻ (`<p>`, `<strong>`,...) thành "từ".
- **Ngưỡng chọn theo quy ước phổ biến của Yoast/Rank Math** (không phải số tự nghĩ ra): tiêu đề 30-60 ký tự, meta description 120-160 ký tự, nội dung chính tối thiểu ~300 từ — các ngưỡng này **language-agnostic** (chỉ đếm ký tự/từ theo khoảng trắng), không cần phân tích ngữ pháp nên áp dụng được cho cả tiếng Việt.

**Tạo file mới `frontend-rebuild/src/components/admin/SeoChecklist.jsx`:**

```jsx
const STATUS_STYLE = {
    pass: { icon: 'fa-solid fa-circle-check', className: 'text-emerald-400' },
    warn: { icon: 'fa-solid fa-triangle-exclamation', className: 'text-fwm-accent' },
    fail: { icon: 'fa-solid fa-circle-xmark', className: 'text-fwm-pink' },
};

function SeoChecklist({ items }) {
    return (
        <div className="rounded-fwm-lg border border-fwm-line bg-fwm-card-2 p-4">
            <h3 className="mb-3 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Gợi ý SEO</h3>
            <ul className="space-y-2">
                {items.map((item, i) => {
                    const style = STATUS_STYLE[item.status];
                    return (
                        <li key={i} className="flex items-start gap-2 text-sm">
                            <i className={`${style.icon} ${style.className} mt-0.5`} aria-hidden="true"></i>
                            <span className="text-fwm-text">
                                <span className="font-bold">{item.label}:</span> <span className="text-fwm-muted">{item.message}</span>
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default SeoChecklist;
```

**Sửa `frontend-rebuild/src/components/admin/PostForm.jsx`:**

Đổi dòng import đầu tiên:
```js
import { useState, useEffect } from 'react';
```
thành:
```js
import { useState, useEffect, useMemo } from 'react';
```

Thêm import mới (cạnh `import { uploadFile } from '../../api/upload';`):
```js
import { checkLength, checkWordCount, checkPresence } from '../../utils/seoChecks';
import SeoChecklist from './SeoChecklist';
```

Thêm `useMemo` tính checklist — đặt sau khối `useEffect` tự điền category (sau dòng `}, [categories]);`):
```js
  const seoItems = useMemo(() => [
    { label: 'Tiêu đề (VI)', ...checkLength(form.titleVi, 30, 60) },
    { label: 'Mô tả ngắn (VI)', ...checkLength(form.excerptVi, 120, 160) },
    { label: 'Nội dung chính (VI)', ...checkWordCount(form.bodyVi, 300) },
    { label: 'Ảnh cover', ...checkPresence(form.coverImageUrl, 'Đã có ảnh cover', 'Chưa có ảnh cover — bài viết sẽ hiện gradient mặc định') },
  ], [form.titleVi, form.excerptVi, form.bodyVi, form.coverImageUrl]);
```

Thêm `<SeoChecklist items={seoItems} />` ngay sau khối "Ảnh cover" (trước khối `{showSteps && (...)}` video hướng dẫn) — tìm đoạn:
```jsx
      <div>
        <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Ảnh cover</label>
        <input type="file" accept="image/*" onChange={handleFileUpload('coverImageUrl')}
          className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-sm text-fwm-text" />
        {form.coverImageUrl && <img src={form.coverImageUrl} alt="" className="mt-2 h-32 w-full rounded-fwm object-cover" />}
      </div>

      {showSteps && (
```
đổi thành:
```jsx
      <div>
        <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Ảnh cover</label>
        <input type="file" accept="image/*" onChange={handleFileUpload('coverImageUrl')}
          className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-sm text-fwm-text" />
        {form.coverImageUrl && <img src={form.coverImageUrl} alt="" className="mt-2 h-32 w-full rounded-fwm object-cover" />}
      </div>

      <SeoChecklist items={seoItems} />

      {showSteps && (
```

**Sửa `frontend-rebuild/src/components/admin/SettingsPanel.jsx`:**

Đổi dòng import đầu tiên:
```js
import { useState, useEffect } from 'react'
```
thành:
```js
import { useState, useEffect, useMemo } from 'react'
```

Thêm import mới (cạnh `import Button from '../ui/Button'`):
```js
import { checkLength } from '../../utils/seoChecks'
import SeoChecklist from './SeoChecklist'
```

Thêm `useMemo` — đặt sau khối `useEffect` đồng bộ `form` từ `settings`:
```js
    const seoItems = useMemo(() => [
        { label: 'Tên site', ...checkLength(form.siteName, 10, 60) },
        { label: 'Mô tả SEO (VI)', ...checkLength(form.seoDescriptionVi, 120, 160) },
        { label: 'Mô tả SEO (EN)', ...checkLength(form.seoDescriptionEn, 120, 160) },
    ], [form.siteName, form.seoDescriptionVi, form.seoDescriptionEn]);
```

Thêm `<SeoChecklist items={seoItems} />` ngay sau dòng gợi ý "Hiện trên kết quả tìm kiếm Google..." (trước khối "Link mạng xã hội"):
```jsx
                <p className="text-xs text-fwm-muted">Hiện trên kết quả tìm kiếm Google cho các trang không có mô tả riêng (Trang chủ, Giới thiệu, Liên hệ...). Nên viết dưới 160 ký tự.</p>

                <SeoChecklist items={seoItems} />

                <div>
                    <div className="mb-1 flex items-center justify-between">
                        <label className="block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Link mạng xã hội</label>
```

**Kiểm tra:**
- Mở form tạo bài viết mới (trống) → checklist hiện đủ 4 dòng, tất cả `fail`/`warn` (chưa nhập gì).
- Gõ tiêu đề ngắn (<30 ký tự) → dòng "Tiêu đề (VI)" chuyển `warn` (icon tam giác vàng). Gõ đủ 30-60 ký tự → chuyển `pass` (icon check xanh lá).
- Dán nội dung dài vào ô "Nội dung chính (VI)" (RichTextEditor) → dòng "Nội dung chính" tự cập nhật số từ đúng (không tính nhầm thẻ HTML).
- Upload ảnh cover → dòng "Ảnh cover" chuyển `pass` ngay lập tức.
- Vào `/admin?tab=settings` → checklist tương tự cho Tên site + 2 ô Mô tả SEO, cập nhật live khi gõ.
- Đây **chỉ là gợi ý hiển thị**, không chặn submit — bấm "Lưu" vẫn hoạt động bình thường dù checklist đang toàn `warn`/`fail`.

---

## Còn cần bạn chốt

Không có — phạm vi (title/meta description động, không làm Open Graph/Twitter Card) đã chốt qua `AskUserQuestion` trước khi viết tài liệu này.
