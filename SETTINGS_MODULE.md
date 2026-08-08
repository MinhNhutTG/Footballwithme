# Module: Cài đặt Website (Settings) + đổi logo

Module fullstack tiếp theo sau Phân trang công khai (`POSTS_PAGINATION_MODULE.md`, ✅). Thêm 1 trang "Cài đặt" trong Admin để quản lý Tên site / Mô tả / **Logo** (ảnh) / Link mạng xã hội — thay cho việc hard-code trực tiếp trong code như hiện tại.

## Khảo sát hiện trạng (trước khi viết spec)

- **Logo hiện tại không phải ảnh** — chỉ là text/CSS: badge `<span>` chữ "eF" (nền `bg-fwm-accent`) + `<span>` text "FootballWithMe", lặp lại y hệt ở **2 file riêng biệt** không dùng chung component: `SiteHeader.jsx` dòng 40-43 và `SiteFooter.jsx` dòng 19-22.
- `favicon.svg` ở `frontend-rebuild/public/` là 1 SVG hình học tím, chỉ dùng làm favicon tab trình duyệt (`index.html` dòng 6), **không liên quan** tới logo hiển thị trong UI — module này không đụng tới favicon.
- `frontend-rebuild/public/icons.svg` có sẵn 1 số symbol icon mạng xã hội (bluesky/discord/github/x) nhưng là asset còn sót từ template Vite mặc định, **không được import/dùng ở đâu trong `src/`** — không phù hợp để tái dùng ép buộc (không phải social platform mà site này chắc chắn cần), nên phần "link mạng xã hội" thiết kế tự do (nhãn + URL tự nhập, không ràng buộc icon cố định).
- **Chưa có cơ chế lưu cấu hình site nào ở backend** — không có model/controller/route tên `Settings`/`Config`. Phải tạo mới hoàn toàn.
- **Chưa có tab "Cài đặt" trong Admin** — sidebar hiện có 5 tab cố định (`posts/users/logs/analytics/categories`), implement bằng `<button onClick={() => setSection(...)}>` lặp lại thủ công trong `Admin.jsx` (không phải mảng cấu hình).
- **Cơ chế upload ảnh có sẵn, tái dùng được nguyên vẹn**: `POST /api/uploads` (Cloudinary, `protect`, nhận `multipart/form-data` field `file`) + hàm `uploadFile(file, token)` ở `frontend-rebuild/src/api/upload.js`. Pattern dùng lại y hệt `CategoryPanel.jsx` (`handleFileUpload` → `uploadFile()` → set field `imageUrl`/`logoUrl` vào state form).
- **`SiteFooter.jsx` hiện có sẵn `t.footer.tagline`** (dòng 23, đọc từ dict tĩnh `vi`/`en`) — module này thay bằng field `description` lấy từ Settings, **giữ `t.footer.tagline` làm fallback** khi admin chưa nhập mô tả (nhất quán với cách xử lý logo, xem "Quyết định đã chốt" #3).
- **`GET /api/posts`/`GET /api/categories` đều public (không cần token)** — endpoint đọc Settings cũng phải public tương tự, vì `SiteHeader`/`SiteFooter` hiển thị ở **mọi trang, kể cả khách chưa đăng nhập**.

## Quyết định đã chốt

Chốt qua `AskUserQuestion`:

1. **Phạm vi trang Settings: Logo + Tên site + Mô tả (song ngữ vi/en) + Link mạng xã hội tự do** (nhãn + URL, không giới hạn platform cụ thể, hiển thị ở Footer).
2. **Logo áp dụng ở cả Header lẫn Footer, tách logic đang lặp ở 2 file thành 1 component `Logo.jsx` dùng chung** — sửa 1 chỗ, đồng bộ cả 2 nơi, tránh lệch như hiện tại.
3. **Khi admin chưa upload logo, giữ nguyên logo chữ hiện tại ("eF" + "FootballWithMe") làm fallback** — không có state "trống logo" gây vỡ layout ngay sau khi deploy tính năng. Áp dụng cùng triết lý fallback cho `description` (dùng `t.footer.tagline` tĩnh khi Settings chưa có mô tả).

**Hệ quả kỹ thuật phát sinh (không cần hỏi lại):**
- Settings là **singleton** (chỉ 1 document duy nhất trong DB, không có danh sách/CRUD nhiều bản ghi như Category) — dùng `findOne()`, nếu chưa có thì `create({})` tự động ngay trong `GET` (Mongoose tự áp `default` cho mọi field) → **không cần migration/seed script** như `seedCategories.js`, vì mọi default đều an toàn (không khoá tính năng gì, khác hẳn gotcha `isVerified: false` mặc định khoá login).
- `siteName`/`logoUrl` **không song ngữ** (tên brand/URL ảnh không có khái niệm dịch), chỉ `description` song ngữ `{vi, en}` giống pattern `Category.desc`.
- **Không đụng `<title>` HTML, SEO meta, sitemap** — phạm vi chỉ dừng ở Header/Footer hiển thị, tránh lan rộng ngoài yêu cầu ban đầu (đổi `<title>` cần fetch Settings trước khi render lần đầu, phức tạp hơn nhiều so với việc chỉ cần cho Header/Footer vốn đã nằm sau mọi Provider).

---

## Kiến trúc chung

```
GET  /api/settings              (public — Header/Footer mọi trang đều cần đọc)
PUT  /api/settings   (protect + adminOnly)
        │
        ▼
settingsController
  get()    → findOne(); nếu chưa có thì create({}) (default rỗng, tự "seed" lần đầu)
  update() → findOne() (hoặc create({})) rồi Object.assign(req.body) + save()
        │
        ▼
SiteSettings { siteName, description:{vi,en}, logoUrl, socialLinks:[{label,url}] }

SettingsContext.jsx  → fetchSettings() 1 lần lúc app mount (giống CategoryContext),
                        expose {settings, loading, error, refetch}

Logo.jsx (component dùng chung, đọc useSettings())
  ├── SiteHeader.jsx  → thay badge "eF"+text hard-code bằng <Logo />
  └── SiteFooter.jsx  → thay badge "eF"+text hard-code bằng <Logo compact />
                          + description fallback t.footer.tagline
                          + cột "Kết nối" render settings.socialLinks (nếu có)

Admin.jsx → tab mới "Cài đặt" (section='settings') → SettingsPanel.jsx
              (form: siteName, description vi/en, upload logo + nút xoá logo,
               danh sách social link thêm/xoá động — giống pattern steps trong PostForm.jsx)
```

---

## Bước 1 — Backend: model `SiteSettings`

**Tạo file mới `backend/src/models/SiteSettings.js`:**

```js
const mongoose = require('mongoose');

const bilingualString = { vi: String, en: String };

const siteSettingsSchema = new mongoose.Schema(
  {
    siteName: { type: String, default: 'FootballWithMe' },
    description: { type: bilingualString, default: () => ({ vi: '', en: '' }) },
    logoUrl: { type: String, default: '' },
    socialLinks: { type: [{ label: String, url: String }], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
```

**Kiểm tra:** không cần chạy migration gì — mọi field đều có `default`, document đầu tiên tự tạo ngay lần gọi `GET /api/settings` đầu tiên (xem Bước 2).

---

## Bước 2 — Backend: `settingsController.js`

**Tạo file mới `backend/src/controllers/settingsController.js`:**

```js
const SiteSettings = require('../models/SiteSettings');

async function get(req, res, next) {
  try {
    let settings = await SiteSettings.findOne();
    if (!settings) settings = await SiteSettings.create({});
    res.json(settings);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    let settings = await SiteSettings.findOne();
    if (!settings) settings = await SiteSettings.create({});
    Object.assign(settings, req.body);
    await settings.save();
    res.json(settings);
  } catch (err) {
    next(err);
  }
}

module.exports = { get, update };
```

Điểm cần hiểu: `Object.assign(settings, req.body)` ghi đè trực tiếp lên Mongoose document (không phải object thường) — Mongoose vẫn track được thay đổi để `save()` áp dụng đúng, kể cả field lồng nhau như `description`/`socialLinks` (ghi đè toàn bộ, không merge từng phần — đúng ý muốn vì frontend luôn gửi state form đầy đủ).

---

## Bước 3 — Backend: routes + mount

**Tạo file mới `backend/src/routes/settingsRoutes.js`:**

```js
const express = require('express');
const { get, update } = require('../controllers/settingsController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', get);
router.put('/', protect, adminOnly, update);

module.exports = router;
```

**Sửa `backend/src/server.js`** — thêm 2 dòng (theo đúng pattern các route khác):

```js
const settingsRoutes = require('./routes/settingsRoutes');
```
đặt cạnh các `require('./routes/...')` khác (sau dòng `categoryRoutes`).

```js
app.use('/api/settings', settingsRoutes);
```
đặt cạnh các `app.use('/api/...')` khác (sau dòng `/api/categories`).

**Kiểm tra (curl/Postman):**
- `GET /api/settings` (không cần token) → lần đầu tự tạo, trả về `{siteName:'FootballWithMe', description:{vi:'',en:''}, logoUrl:'', socialLinks:[], _id, createdAt, updatedAt}`.
- `PUT /api/settings` không kèm token → `401`.
- `PUT /api/settings` kèm token admin, body `{siteName:'Test'}` → trả về document với `siteName:'Test'`, các field khác giữ nguyên. Gọi lại `GET` → thấy đúng giá trị mới (đã lưu DB thật, không phải chỉ trả về tạm).

---

## Bước 4 — Frontend: `api/settings.js`

**Tạo file mới `frontend-rebuild/src/api/settings.js`:**

```js
import { apiRequest } from './client';

export function fetchSettings() {
    return apiRequest('/settings');
}

export function updateSettings(payload, token) {
    return apiRequest('/settings', { method: 'PUT', body: payload, token });
}
```

---

## Bước 5 — Frontend: `context/SettingsContext.jsx`

**Tạo file mới `frontend-rebuild/src/context/SettingsContext.jsx`** — bám sát pattern `CategoryContext.jsx` có sẵn:

```jsx
import { createContext, useCallback, useContext, useState, useEffect } from "react";
import { fetchSettings } from '../api/settings'

const settingsContext = createContext(null);

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const refetch = useCallback(() => {
        setLoading(true);
        return fetchSettings()
            .then((data) => setSettings(data))
            .catch((err) => setError(err.message))
            .finally(() => { setLoading(false) })
    }, [])

    useEffect(() => {
        refetch();
    }, [refetch]);

    return (
        <settingsContext.Provider value={{ settings, loading, error, refetch }}>
            {children}
        </settingsContext.Provider>
    )
}

export function useSettings() {
    return useContext(settingsContext);
}
```

**Sửa `frontend-rebuild/src/main.jsx`** — thêm import:
```js
import { SettingsProvider } from './context/SettingsContext.jsx'
```

Và bọc thêm 1 lớp Provider — đổi từ:
```jsx
        <AuthProvider>
          <FavoritesProvider>
            <CategoryProvider>
              <PostsProvider>
```
thành:
```jsx
        <AuthProvider>
          <FavoritesProvider>
            <CategoryProvider>
              <SettingsProvider>
                <PostsProvider>
```

(và thêm `</SettingsProvider>` khớp trước `</CategoryProvider>` ở phần đóng thẻ phía dưới — thứ tự lồng không quan trọng do 3 Provider này độc lập, chỉ cần đóng/mở đúng cặp).

**Kiểm tra:** `settings` ban đầu là `null` lúc đang loading — mọi nơi đọc `settings?.xxx` phải dùng optional chaining, không giả định `settings` luôn có giá trị (xem Bước 6, `Logo.jsx` đã xử lý đúng qua `settings?.logoUrl`).

---

## Bước 6 — Frontend: component `Logo.jsx` dùng chung + gắn vào Header/Footer

**Tạo file mới `frontend-rebuild/src/components/layout/Logo.jsx`:**

```jsx
import { useSettings } from '../../context/SettingsContext';

function Logo({ compact = false }) {
    const { settings } = useSettings();
    const badgeSize = compact ? 'h-8 w-8 text-sm' : 'h-9 w-9 text-base';
    const nameSize = compact ? 'text-base' : 'text-lg';
    const siteName = settings?.siteName || 'FootballWithMe';

    return (
        <>
            {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt={siteName} className={`${badgeSize} rounded-fwm object-cover`} />
            ) : (
                <span className={`flex ${badgeSize} items-center justify-center rounded-fwm bg-fwm-accent font-head font-black text-fwm-ink`}>eF</span>
            )}
            <span className={`font-head ${nameSize} font-extrabold text-fwm-text`}>{siteName}</span>
        </>
    );
}

export default Logo;
```

**Sửa `frontend-rebuild/src/components/layout/SiteHeader.jsx`:**

Thêm import (cạnh các import khác):
```js
import Logo from './Logo'
```

Đổi:
```jsx
                <Link to="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-fwm bg-fwm-accent font-head text-base font-black text-fwm-ink">eF</span>
                    <span className="font-head text-lg font-extrabold text-fwm-text">FootballWithMe</span>
                </Link>
```
thành:
```jsx
                <Link to="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
                    <Logo />
                </Link>
```

**Sửa `frontend-rebuild/src/components/layout/SiteFooter.jsx`** — dán lại toàn bộ file (thêm import, dùng `Logo`, đổi tagline sang đọc Settings có fallback, thêm cột "Kết nối"):

```jsx
import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext';
import { useCategories } from '../../context/CategoryContext';
import { useSettings } from '../../context/SettingsContext';
import Logo from './Logo';

function SiteFooter() {
    const { lang, t } = useLang();
    const { categories } = useCategories();
    const { settings } = useSettings();
    const siteLinks = [
        { to: '/', label: t.nav.home },
        { to: '/gioi-thieu', label: t.nav.about },
        { to: '/lien-he', label: t.nav.contact },
        { to: '/admin', label: t.nav.admin },
    ];
    const description = settings?.description?.[lang] || t.footer.tagline;
    const socialLinks = settings?.socialLinks || [];

    return (
        <footer className="border-t border-fwm-line bg-fwm-bg-deep">
            <div className="mx-auto max-w-6xl px-4 py-10">
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Logo compact />
                        </div>
                        <p className="mt-3 max-w-xs text-sm text-fwm-muted">{description}</p>
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

                    {socialLinks.length > 0 && (
                        <div>
                            <h4 className="font-head text-sm font-bold uppercase tracking-wide text-fwm-text">{t.footer.socialHeading}</h4>
                            <ul className="mt-3 space-y-2">
                                {socialLinks.map((link, i) => (
                                    <li key={i}>
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-fwm-muted hover:text-fwm-accent">
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <p className="mt-8 border-t border-fwm-line pt-6 text-xs text-fwm-muted">{t.footer.note}</p>
            </div>
        </footer>
    )
}

export default SiteFooter;
```

Điểm dễ nhầm nếu tự gõ lại:
- Grid đổi từ `sm:grid-cols-3` (cố định 3 cột) sang `sm:grid-cols-2 lg:grid-cols-4` — khi **chưa có** social link, cột 4 không render, 3 khối còn lại nằm lọt trong lưới 4 cột ở màn hình lớn (để trống 1 ô cuối hàng) — đây là đánh đổi chấp nhận được để không phải viết CSS điều kiện phức tạp, không phải bug.
- `settings?.description?.[lang]` — dùng `[lang]` (bracket) vì `lang` là biến (`'vi'`/`'en'`), không phải `.vi`/`.en` cố định như code cũ.
- `rel="noopener noreferrer"` bắt buộc đi kèm `target="_blank"` cho link social (mở tab mới, tránh lỗ hổng `window.opener` trỏ ngược về site — không phải chi tiết thừa).

**Sửa `frontend-rebuild/src/i18n/dict.js`** — thêm 1 key `socialHeading` vào object `footer` ở **cả 2 khối `vi` và `en`**:

Trong khối `vi` (dòng ~8-12), đổi:
```js
        footer: {
            tagline: 'Nội dung eFootball cho người chơi Việt — kỹ năng, chiến thuật, kinh nghiệm.',
            categoriesHeading: 'Chuyên mục', siteLinksHeading: 'Trang',
            note: '© FootballWithMe. Nội dung mang tính tham khảo, tổng hợp từ cộng đồng eFootball.',
        },
```
thành:
```js
        footer: {
            tagline: 'Nội dung eFootball cho người chơi Việt — kỹ năng, chiến thuật, kinh nghiệm.',
            categoriesHeading: 'Chuyên mục', siteLinksHeading: 'Trang', socialHeading: 'Kết nối',
            note: '© FootballWithMe. Nội dung mang tính tham khảo, tổng hợp từ cộng đồng eFootball.',
        },
```

Trong khối `en` (dòng ~194-198, cấu trúc y hệt), đổi tương tự:
```js
        footer: {
            tagline: 'eFootball content for the Vietnamese player base — skills, tactics, experience.',
            categoriesHeading: 'Categories', siteLinksHeading: 'Site', socialHeading: 'Connect',
            note: '© FootballWithMe. Reference content, curated from the eFootball community.',
        },
```
(giữ nguyên `categoriesHeading`/`siteLinksHeading`/`note` sẵn có, chỉ thêm `socialHeading`).

**Kiểm tra:** mở trang bất kỳ (Home) → Header vẫn hiện đúng "eF" + "FootballWithMe" như trước (chưa đổi logo). Cuộn xuống Footer → tagline vẫn hiện đúng câu cũ (vì Settings mới tạo có `description` rỗng, fallback về `t.footer.tagline`), cột "Kết nối" **không hiện** (vì `socialLinks` rỗng) — đúng như thiết kế, chưa có gì để hiện.

---

## Bước 7 — Frontend: `SettingsPanel.jsx` (form Admin)

**Tạo file mới `frontend-rebuild/src/components/admin/SettingsPanel.jsx`:**

```jsx
import { useState, useEffect } from 'react'
import { updateSettings } from '../../api/settings'
import { uploadFile } from '../../api/upload'
import { useSettings } from '../../context/SettingsContext'
import Button from '../ui/Button'

const EMPTY_FORM = {
    siteName: '', descriptionVi: '', descriptionEn: '', logoUrl: '', socialLinks: [],
};

function toFormValues(settings) {
    return {
        siteName: settings.siteName || '',
        descriptionVi: settings.description?.vi || '',
        descriptionEn: settings.description?.en || '',
        logoUrl: settings.logoUrl || '',
        socialLinks: settings.socialLinks || [],
    };
}

function SettingsPanel({ token }) {
    const { settings, loading, refetch } = useSettings();
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (settings) setForm(toFormValues(settings));
    }, [settings]);

    const handleChange = (field) => (e) => { setSaved(false); setForm((f) => ({ ...f, [field]: e.target.value })); };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setError('');
        setSaved(false);
        setUploading(true);
        uploadFile(file, token)
            .then((res) => setForm((f) => ({ ...f, logoUrl: res.url })))
            .catch((err) => setError(err.message))
            .finally(() => setUploading(false));
    };

    const addSocialLink = () => { setSaved(false); setForm((f) => ({ ...f, socialLinks: [...f.socialLinks, { label: '', url: '' }] })); };
    const removeSocialLink = (index) => { setSaved(false); setForm((f) => ({ ...f, socialLinks: f.socialLinks.filter((_, i) => i !== index) })); };
    const updateSocialLink = (index, field) => (e) => {
        setSaved(false);
        setForm((f) => ({
            ...f,
            socialLinks: f.socialLinks.map((link, i) => (i === index ? { ...link, [field]: e.target.value } : link)),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const payload = {
            siteName: form.siteName,
            description: { vi: form.descriptionVi, en: form.descriptionEn },
            logoUrl: form.logoUrl,
            socialLinks: form.socialLinks,
        };
        try {
            await updateSettings(payload, token);
            await refetch();
            setSaved(true);
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) return null;

    return (
        <div>
            <h1 className="mb-5 font-head text-2xl font-black text-fwm-text">Cài đặt Website</h1>

            {error && <p className="mb-4 text-sm text-fwm-pink">{error}</p>}
            {saved && <p className="mb-4 text-sm text-fwm-accent">Đã lưu.</p>}

            <form onSubmit={handleSubmit} className="space-y-4 rounded-fwm-lg border border-fwm-line bg-fwm-card p-5">
                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Tên site</label>
                    <input required value={form.siteName} onChange={handleChange('siteName')}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Mô tả (VI)</label>
                        <textarea rows={2} value={form.descriptionVi} onChange={handleChange('descriptionVi')}
                            className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                    </div>
                    <div>
                        <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Mô tả (EN)</label>
                        <textarea rows={2} value={form.descriptionEn} onChange={handleChange('descriptionEn')}
                            className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                    </div>
                </div>

                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Logo</label>
                    <input type="file" accept="image/*" onChange={handleFileUpload}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-sm text-fwm-text" />
                    {form.logoUrl && (
                        <div className="mt-2 flex items-center gap-3">
                            <img src={form.logoUrl} alt="" className="h-16 w-16 rounded-fwm object-cover" />
                            <button type="button" onClick={() => { setSaved(false); setForm((f) => ({ ...f, logoUrl: '' })); }}
                                className="font-head text-xs font-bold text-fwm-pink hover:underline">
                                Xoá logo
                            </button>
                        </div>
                    )}
                    <p className="mt-1 text-xs text-fwm-muted">Chưa upload thì Header/Footer tự hiện logo chữ mặc định.</p>
                </div>

                <div>
                    <div className="mb-1 flex items-center justify-between">
                        <label className="block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Link mạng xã hội</label>
                        <Button type="button" variant="ghost" onClick={addSocialLink}>Thêm link</Button>
                    </div>
                    <div className="space-y-3">
                        {form.socialLinks.map((link, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input placeholder="Nhãn (vd: Facebook)" value={link.label} onChange={updateSocialLink(index, 'label')}
                                    className="w-40 rounded-fwm border border-fwm-line bg-fwm-card-2 px-3 py-2 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none" />
                                <input placeholder="https://..." value={link.url} onChange={updateSocialLink(index, 'url')}
                                    className="flex-1 rounded-fwm border border-fwm-line bg-fwm-card-2 px-3 py-2 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none" />
                                <button type="button" onClick={() => removeSocialLink(index)} className="font-head text-xs font-bold text-fwm-pink hover:underline">
                                    Xoá
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button type="submit" variant="primary" disabled={uploading}>{uploading ? 'Đang tải ảnh lên...' : 'Lưu'}</Button>
                </div>
            </form>
        </div>
    );
}

export default SettingsPanel;
```

Điểm dễ nhầm nếu tự gõ lại:
- **`useEffect` đồng bộ `form` từ `settings`** (không set trực tiếp `useState(settings)` lúc khai báo) — vì `settings` là `null` lúc component mount đầu tiên (`SettingsContext` đang fetch), phải đợi `settings` có giá trị rồi mới đổ vào `form` qua effect, nếu không `toFormValues(null)` sẽ crash (đọc `.siteName` trên `null`).
- **`if (loading) return null`** đặt sau mọi hook (`useState`/`useEffect`) — không đặt early-return trước hook, vi phạm Rules of Hooks (số lượng hook gọi phải cố định mỗi lần render).
- `setSaved(false)` gọi lại ở **mọi hàm thay đổi form** (change/upload/add/remove social link) — để dòng "Đã lưu." tự ẩn ngay khi người dùng sửa tiếp, tránh hiểu lầm là bản sửa mới cũng đã lưu.
- Form này **không có nút "Hủy"** như `CategoryPanel`/`PostForm` — vì không có khái niệm "thoát khỏi form" (Settings luôn ở đúng 1 trạng thái, không phải list→form→list).

---

## Bước 8 — Frontend: gắn tab "Cài đặt" vào `Admin.jsx`

**Sửa `frontend-rebuild/src/pages/Admin.jsx`** — thêm import (cạnh các import panel khác):
```js
import SettingsPanel from '../components/admin/SettingsPanel'
```

Thêm 1 nút sidebar — đổi:
```jsx
                        <button type="button" onClick={() => setSection('categories')} className={`block w-full rounded-fwm px-3 py-2.5 text-left font-head text-sm font-bold ${section === 'categories' ? 'bg-fwm-accent text-fwm-ink' : 'text-fwm-text hover:bg-fwm-pill'}`}>
                            Danh mục
                        </button>
                    </nav>
```
thành:
```jsx
                        <button type="button" onClick={() => setSection('categories')} className={`block w-full rounded-fwm px-3 py-2.5 text-left font-head text-sm font-bold ${section === 'categories' ? 'bg-fwm-accent text-fwm-ink' : 'text-fwm-text hover:bg-fwm-pill'}`}>
                            Danh mục
                        </button>
                        <button type="button" onClick={() => setSection('settings')} className={`block w-full rounded-fwm px-3 py-2.5 text-left font-head text-sm font-bold ${section === 'settings' ? 'bg-fwm-accent text-fwm-ink' : 'text-fwm-text hover:bg-fwm-pill'}`}>
                            Cài đặt
                        </button>
                    </nav>
```

Thêm 1 nhánh render — đổi:
```jsx
                    ) : section === 'categories' ? (
                        <CategoryPanel token={token}></CategoryPanel>
                    ) : (<>
```
thành:
```jsx
                    ) : section === 'categories' ? (
                        <CategoryPanel token={token}></CategoryPanel>
                    ) : section === 'settings' ? (
                        <SettingsPanel token={token}></SettingsPanel>
                    ) : (<>
```

**Kiểm tra:**
- Vào `/admin`, thấy nút "Cài đặt" mới ở cuối sidebar, bấm vào hiện form đúng như Bước 7.
- Đổi Tên site → Lưu → F5 lại trang `/admin` → giá trị vẫn giữ (đọc từ DB, không phải state tạm).
- Upload 1 ảnh logo → Lưu → mở lại Home (`/`) ở tab khác → Header **và** Footer đều đổi sang ảnh mới (cả 2 nơi đồng bộ qua `Logo.jsx` dùng chung, đúng quyết định #2).
- Bấm "Xoá logo" → Lưu → Header/Footer quay lại logo chữ "eF"+"FootballWithMe" mặc định (đúng fallback quyết định #3).
- Thêm 2 link mạng xã hội (vd Facebook + Discord) → Lưu → xuống Footer thấy cột "Kết nối" xuất hiện với đúng 2 link, bấm mở đúng URL ở tab mới.
- Xoá hết social link đã thêm → Lưu → cột "Kết nối" biến mất khỏi Footer (không hiện tiêu đề rỗng).
- Vào Admin bằng tài khoản không phải admin (hoặc gọi thẳng `PUT /api/settings` không token) → bị chặn, không sửa được.

---

## Còn cần bạn chốt

Không có — phạm vi (Logo+Tên site+Mô tả+Social links), vị trí áp dụng (Header+Footer dùng chung component), và hành vi fallback khi chưa có logo đã chốt qua `AskUserQuestion` trước khi viết tài liệu này.
