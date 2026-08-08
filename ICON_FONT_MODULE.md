# Module: Đổi icon emoji sang Font Awesome

Không phải tính năng mới — thay icon chức năng UI đang dùng emoji Unicode (🔍♥☀️🌙☰📝...) bằng icon font chuyên nghiệp (Font Awesome), theo yêu cầu "toàn bộ dự án đổi icon lại, không dùng icon AI nữa".

## Khảo sát hiện trạng (trước khi viết spec)

Grep toàn bộ `frontend-rebuild/src` tìm ký tự emoji/glyph dùng làm icon, tìm thấy ở **6 file**:

| File | Icon hiện tại | Ý nghĩa |
|---|---|---|
| `components/layout/SiteHeader.jsx` | 🔍 | Link tìm kiếm |
| | ♥ | Link yêu thích |
| | ☀️ / 🌙 | Nút đổi theme sáng/tối |
| | ☰ / ✕ | Nút mở/đóng menu mobile |
| `components/article/ArticleCard.jsx` | ♥ / ♡ | Trạng thái đã/chưa yêu thích (toggle) |
| `pages/ArticleDetail.jsx` | ♥ / ♡ | Trạng thái đã/chưa yêu thích (toggle, giống trên) |
| | ▶ | Nút play video placeholder (khi bài chưa có `videoUrl`) |
| `pages/Home.jsx` | ▶ | Nút play trong thẻ hero (giống trên) |
| `pages/Admin.jsx` | 📝🗂️📊🕒👤⚙️ | 6 icon sidebar/tab quản trị (vừa thêm ở module layout trước) |

**2 chỗ dùng ký hiệu/emoji nhưng CỐ TÌNH không đụng tới** (đã hỏi lại phạm vi qua `AskUserQuestion`, bạn chỉ chọn "Toàn bộ icon chức năng UI", không chọn phần Reaction):

- **4 ảnh PNG cartoon AI-generated cho Reaction** (`assets/reactions/*.png`, dùng trong `config/reactions.js`) — giữ nguyên, không nằm trong phạm vi module này.
- **`GamepadKey.jsx`** (△□✕○ ở `Home.jsx` biến `COMBO_KEYS`, và các phím tắt bước hướng dẫn trong `PostForm`) — đây **không phải icon UI cố định** mà là ký hiệu nút gamepad PS người dùng tự nhập text tự do (`keyLabel`) qua Admin, component chỉ render đúng chuỗi được truyền vào. Đổi sang icon font sẽ phải hard-code ánh xạ ký hiệu → icon, phá vỡ thiết kế "nhập text tự do" hiện tại — ngoài phạm vi yêu cầu (không phải "icon UI" theo đúng nghĩa).

## Quyết định đã chốt

Chốt qua `AskUserQuestion`:
1. **Thư viện: Font Awesome** (`@fortawesome/fontawesome-free`, dùng qua class CSS `<i className="fa-solid fa-...">`, không dùng gói React component riêng — cách dùng kinh điển, đúng nghĩa "icon font").
2. **Phạm vi: toàn bộ icon chức năng UI** — 6 file liệt kê ở bảng trên. Không đụng 4 ảnh Reaction, không đụng `GamepadKey`.

## Bước 1 — Cài đặt Font Awesome

```bash
cd frontend-rebuild
npm install @fortawesome/fontawesome-free
```

**Sửa `frontend-rebuild/src/main.jsx`** — thêm 1 dòng import CSS (nạp 1 lần duy nhất ở entry point, có hiệu lực toàn app), đặt cạnh `import './index.css'`:

```js
import '@fortawesome/fontawesome-free/css/all.min.css';
```

**Kiểm tra:** `npm install` chạy xong không lỗi, `node_modules/@fortawesome/fontawesome-free` tồn tại.

---

## Bước 2 — `SiteHeader.jsx`: 4 icon chức năng

Đổi từng icon (giữ nguyên `aria-label`/`title` đã có sẵn trên thẻ cha — đó mới là thứ trình đọc màn hình đọc, nên icon bên trong thêm `aria-hidden="true"` để không đọc trùng):

```jsx
🔍
```
→
```jsx
<i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
```

```jsx
♥
```
→
```jsx
<i className="fa-regular fa-heart" aria-hidden="true"></i>
```

```jsx
{theme === 'dark' ? '☀️' : '🌙'}
```
→
```jsx
{theme === 'dark' ? <i className="fa-solid fa-sun" aria-hidden="true"></i> : <i className="fa-solid fa-moon" aria-hidden="true"></i>}
```

```jsx
{menuOpen ? '✕' : '☰'}
```
→
```jsx
{menuOpen ? <i className="fa-solid fa-xmark" aria-hidden="true"></i> : <i className="fa-solid fa-bars" aria-hidden="true"></i>}
```

---

## Bước 3 — `ArticleCard.jsx` + `ArticleDetail.jsx`: heart toggle

**Cả 2 file** có cùng pattern `{liked ? '♥' : '♡'}` — đổi thành:

```jsx
{liked ? <i className="fa-solid fa-heart" aria-hidden="true"></i> : <i className="fa-regular fa-heart" aria-hidden="true"></i>}
```

`fa-solid` (đặc/tô màu) khi đã thích, `fa-regular` (viền/rỗng) khi chưa — đúng tinh thần ♥/♡ gốc, không cần đổi logic `liked`/className màu đang có.

**Riêng `ArticleDetail.jsx`** có thêm 1 chỗ nút play video:
```jsx
<span className="animate-fwm-ring flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-2xl text-fwm-ink">▶</span>
```
→
```jsx
<span className="animate-fwm-ring flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-2xl text-fwm-ink"><i className="fa-solid fa-play" aria-hidden="true"></i></span>
```

---

## Bước 4 — `Home.jsx`: nút play trong thẻ hero

```jsx
<span className="animate-fwm-ring flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-fwm-ink">
    ▶
</span>
```
→
```jsx
<span className="animate-fwm-ring flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-fwm-ink">
    <i className="fa-solid fa-play" aria-hidden="true"></i>
</span>
```

**Không đụng `COMBO_KEYS`** (mảng `△□□✕○` phía trên component) — xem lý do ở phần khảo sát.

---

## Bước 5 — `Admin.jsx`: 6 icon sidebar/tab

Trong `NAV_GROUPS`, đổi giá trị `icon` của từng item từ emoji sang tên class Font Awesome (giữ nguyên cấu trúc mảng, chỉ đổi giá trị field `icon`), và đổi chỗ render `<span>{item.icon}</span>` thành `<i className={item.icon} aria-hidden="true"></i>`:

```jsx
const NAV_GROUPS = [
    {
        heading: 'Nội dung', items: [
            { key: 'posts', label: 'Bài viết', icon: 'fa-solid fa-file-lines' },
            { key: 'categories', label: 'Danh mục', icon: 'fa-solid fa-folder-open' },
        ]
    },
    {
        heading: 'Phân tích', items: [
            { key: 'analytics', label: 'Thống kê', icon: 'fa-solid fa-chart-column' },
            { key: 'logs', label: 'Nhật ký truy cập', icon: 'fa-solid fa-clock-rotate-left' },
        ]
    },
    {
        heading: 'Hệ thống', items: [
            { key: 'users', label: 'Người dùng', icon: 'fa-solid fa-user' },
            { key: 'settings', label: 'Cài đặt', icon: 'fa-solid fa-gear' },
        ]
    },
];
```

2 chỗ render (thanh tab mobile và sidebar desktop) đều có dòng `<span>{item.icon}</span>{item.label}` — đổi cả 2 thành:
```jsx
<i className={item.icon} aria-hidden="true"></i>{item.label}
```

**Điểm dễ nhầm:** `icon` giờ là **class CSS** (chuỗi `"fa-solid fa-xxx"`), không phải emoji — đổi tag render từ `<span>{item.icon}</span>` sang `<i className={item.icon}>` (dùng `className={item.icon}` để gắn class, không phải render `item.icon` làm text con bên trong `<i>`).

---

## Kiểm tra (sau khi làm hết 5 bước)

- `npx vite build` không lỗi.
- Header: icon kính lúp, tim, mặt trời/mặt trăng, hamburger/X đều hiện đúng hình Font Awesome (không còn emoji màu, icon giờ đơn sắc theo `currentColor`, tự đổi màu theo `text-fwm-*` class có sẵn).
- Bấm nút yêu thích trên `ArticleCard`/`ArticleDetail` → icon tim chuyển đặc/rỗng đúng theo trạng thái, màu vẫn đổi hồng khi đã thích (logic màu cũ không đổi).
- Trang chủ (hero card) và trang chi tiết bài (khi bài chưa có video) → icon play hình tam giác Font Awesome thay vì ▶ Unicode.
- `/admin`: cả sidebar desktop lẫn thanh tab mobile hiện icon Font Awesome tương ứng (tài liệu/folder/biểu đồ/đồng hồ/người dùng/bánh răng), không còn emoji.
- Reaction Like/Dislike/Haha/Giận dữ trên bài viết **không đổi gì** (vẫn 4 ảnh PNG cũ, đúng như đã chốt phạm vi).

## Còn cần bạn chốt

Không có — thư viện (Font Awesome) và phạm vi (icon chức năng UI, không gồm Reaction/GamepadKey) đã chốt qua `AskUserQuestion`.
