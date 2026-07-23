# Module: Trang Profile Người Dùng

Xây dựng trang `/ho-so` từ đầu đến cuối — mỗi bước thêm đúng 1 khái niệm React mới.
Backend đã có sẵn, bạn chỉ cần viết frontend.

---

## Tổng quan những gì sẽ xây dựng

```
/ho-so  (yêu cầu đăng nhập)
┌─────────────────────────────────┐
│  [Avatar - 2 chữ cái đầu tên]  │  ← nhấn vào → chọn ảnh từ máy
│                                 │
│  Họ tên:  [_________________]  │
│  Bio:     [_________________]  │
│           [_________________]  │
│                                 │
│  [Lưu thay đổi]  ← disabled    │  ← chỉ bật khi có thay đổi thực
│       khi chưa đổi gì           │
│                                 │
│  Email: user@example.com        │  ← read-only
│  Thành viên từ: 01/01/2025      │
└─────────────────────────────────┘
```

---

## Backend đã có sẵn

Hai endpoint mới, dùng đúng như các endpoint khác trong `api/`:

| Method | URL | Body | Trả về |
|--------|-----|------|--------|
| GET | `/api/users/me` | — | object user đầy đủ |
| PUT | `/api/users/me` | `{ name, bio }` | object user sau khi cập nhật |

Field mới trong user: `bio` (string, tối đa 300 ký tự, mặc định `""`).
Cần truyền `token` trong header — giống mọi request cần auth.

---

## Bước 1 — Component tĩnh + Route

**Học được:** Tạo page component mới, đăng ký route.

**Làm:**
- Tạo file `frontend/src/pages/Profile.jsx`
- Render một trang tĩnh: tiêu đề "Hồ sơ của bạn", một hình tròn placeholder cho avatar, hai input rỗng (tên, bio), một nút Lưu
- Mở `App.jsx`, thêm route path `/ho-so` trỏ vào `<Profile />`

**Kiểm tra:** Vào `http://localhost:5173/ho-so` thấy trang tĩnh, không lỗi console.

---

## Bước 2 — Điền dữ liệu từ user context

**Học được:** `useState` để quản lý giá trị input; đọc dữ liệu từ context.

**Làm:**
- Trong `Profile.jsx`, dùng `useAuth()` để lấy `user`
- Khai báo 2 state: `name` (giá trị ban đầu từ `user.name`) và `bio` (từ `user.bio || ''`)
- Gắn `value` + `onChange` vào 2 input → controlled inputs

**Input/output cần đạt:**
```
user = { name: "Nguyễn Văn A", bio: "Mê eFootball" }
→ input tên hiển thị "Nguyễn Văn A"
→ input bio hiển thị "Mê eFootball"
→ gõ vào input thì state cập nhật
```

**Kiểm tra:** Gõ vào input tên, giá trị thay đổi. Mở React DevTools, thấy state thay đổi theo.

---

## Bước 3 — Protected Route

**Học được:** `useEffect` để chạy side-effect sau render; `useNavigate` để redirect bằng code.

**Làm:**
- Thêm 1 `useEffect` trong `Profile.jsx`: nếu `!user` thì `navigate('/dang-nhap', { replace: true })`
- Thêm `if (!user) return null` ngay sau effect để tránh flash nội dung

**Tại sao `replace: true`?** Ghi đè history thay vì thêm — nhấn Back không quay lại trang profile.

**Kiểm tra:** Logout, rồi vào `http://localhost:5173/ho-so` → tự động chuyển về `/dang-nhap`.

---

## Bước 4 — useMemo: tính initials + hasChanged

**Học được:** `useMemo` để tính derived value — chỉ tính lại khi dependency đổi.

**Khác với `useState`:** `useMemo` không lưu state mà *tính toán từ state có sẵn*. Không cần gọi setter, không trigger thêm render.

**Làm:**

Tính `initials` — hiển thị trong avatar placeholder:
```
"Nguyễn Văn An"  →  "NV"
"Messi"          →  "M"
""               →  "?"
```
Logic: split theo khoảng trắng → lấy ký tự đầu mỗi từ → nối lại → viết hoa → lấy tối đa 2 ký tự.
Dependency: `[name]`

Tính `hasChanged` — dùng để `disable` nút Lưu:
```
hasChanged = (name !== user.name) || (bio !== (user.bio || ''))
```
Dependency: `[name, bio, user]`

**Gắn vào JSX:**
- Avatar placeholder hiển thị `initials`
- Nút Lưu có `disabled={!hasChanged}`

**Kiểm tra:** Mở trang, nút Lưu bị disabled. Xóa 1 chữ trong input tên → nút Lưu bật lên. Gõ lại đúng tên cũ → nút tắt lại.

---

## Bước 5 — useRef: click ẩn vào input file

**Học được:** `useRef` để trỏ vào DOM element và gọi method trực tiếp — không gây re-render.

**Tại sao không dùng `useState`?** `ref` không hiển thị gì trên UI, chỉ cần "cầm tay" element DOM. Thay đổi `.current` không cần re-render.

**Làm:**
- Khai báo `const fileInputRef = useRef(null)`
- Thêm một `<input type="file" accept="image/*" className="hidden" ref={fileInputRef} />`
- Khi nhấn vào vùng avatar: `fileInputRef.current.click()`
- Khi input file `onChange`: đọc file bằng `FileReader`, khi đọc xong lưu base64 vào state `preview`
- Nếu `preview` có giá trị: hiển thị `<img src={preview}>` trong avatar, ngược lại hiển thị `initials`

**Input/output cần đạt:**
```
Nhấn vào avatar → hộp thoại chọn file mở ra
Chọn ảnh       → ảnh hiển thị ngay trong avatar (chưa cần lưu lên server)
```

**Kiểm tra:** Nhấn avatar, chọn 1 file ảnh từ máy, avatar đổi sang ảnh vừa chọn.

---

## Bước 6 — Tách Avatar thành component riêng

**Học được:** Khi nào nên tách component; `memo` để bỏ qua re-render không cần thiết.

**Vấn đề cần giải quyết:** Mỗi khi bạn gõ 1 ký tự trong input tên, toàn bộ `Profile.jsx` re-render — bao gồm cả avatar (dù ảnh không đổi). Nếu avatar render phức tạp, đây là lãng phí.

**Làm:**
- Tạo file `frontend/src/components/ui/Avatar.jsx`
- Props: `name` (string), `preview` (string | null), `size` ('sm' | 'md' | 'lg')
- Wrap component bằng `memo`:
  ```js
  import { memo } from 'react'
  const Avatar = memo(function Avatar({ name, preview, size }) { ... })
  ```
- Trong `Profile.jsx`: thay avatar placeholder bằng `<Avatar name={initials} preview={preview} size="lg" />`

**Điều kiện để `memo` thực sự hoạt động:** Props truyền vào phải ổn định giữa các render. `name` và `preview` là string → ổn. Nếu truyền thêm `onClick` (là hàm), cần `useCallback` — bước sau.

**Kiểm tra:** Mở React DevTools → Profiler → gõ vào input tên → Avatar không bị highlight re-render (nếu không có hàm trong props).

---

## Bước 7 — useReducer: gom state lại

**Học được:** `useReducer` khi nhiều state liên quan nhau hoặc một action cần đổi nhiều field cùng lúc.

**Vấn đề hiện tại:** Bạn đang có nhiều `useState` riêng lẻ:
```js
const [name, setName] = useState(...)
const [bio, setBio] = useState(...)
const [preview, setPreview] = useState(null)
const [loading, setLoading] = useState(false)
const [error, setError] = useState('')
const [success, setSuccess] = useState(false)
```
Khi submit form, bạn phải gọi `setLoading(true)`, `setError('')`, `setSuccess(false)` cùng lúc — dễ quên, dễ bug.

**Làm:**
Thay toàn bộ bằng 1 reducer:

```
state = { name, bio, preview, loading, error, success }

Actions:
  INIT          payload: { name, bio }        → khởi tạo từ user
  SET_FIELD     payload: { field, value }     → đổi name hoặc bio, xóa error/success
  SET_PREVIEW   payload: { value }            → cập nhật ảnh
  SUBMIT_START  (không payload)               → loading=true, xóa error/success
  SUBMIT_OK     (không payload)               → loading=false, success=true
  SUBMIT_ERROR  payload: { error }            → loading=false, error=message
```

Quy tắc viết reducer:
- Không sửa state trực tiếp, luôn trả về object mới (`{ ...state, ... }`)
- `default: return state`

**Kiểm tra:** Mọi tính năng từ các bước trước vẫn hoạt động như cũ.

---

## Bước 8 — useCallback: tối ưu kết hợp với memo

**Học được:** `useCallback` để giữ tham chiếu hàm ổn định — cần thiết khi truyền hàm vào component có `memo`.

**Vấn đề:** `Avatar` có `memo`, nhưng nếu bạn truyền `onClick` vào:
```jsx
<Avatar onClick={() => fileInputRef.current.click()} ... />
```
Arrow function này tạo mới mỗi lần render → `memo` so sánh thấy prop đổi → re-render lại bình thường. `memo` vô dụng.

**Làm:**
```js
const handleAvatarClick = useCallback(() => {
  fileInputRef.current?.click()
}, [])  // [] vì không phụ thuộc state nào
```
Truyền `handleAvatarClick` xuống `Avatar`.

Tương tự, wrap `handleFieldChange` bằng `useCallback` nếu bạn truyền xuống component con.

**Kiểm tra:** React DevTools Profiler → gõ input → Avatar không re-render.

---

## Bước 9 — Kết nối API

**Học được:** Gọi API trong event handler; sync kết quả về context.

**Làm:**

**9a — `api/users.js`:** Thêm 2 hàm (xem pattern từ các hàm đã có trong file):
- `getMe(token)` → `GET /users/me`
- `updateMe(data, token)` → `PUT /users/me` với body `{ name, bio }`

**9b — `AuthContext.jsx`:** Thêm hàm `updateUser(partial)` vào context.
Xem `setFavorites` làm mẫu — logic tương tự: merge partial vào `prev`, lưu lại localStorage.
Nhớ expose `updateUser` trong `value={{ ... }}`.

**9c — `Profile.jsx`:** Xử lý submit:
```
1. Validate: name.trim() không được rỗng → dispatch SUBMIT_ERROR
2. dispatch SUBMIT_START
3. await updateMe({ name, bio }, token)
4. Nếu thành công: updateUser({ name, bio }) rồi dispatch SUBMIT_OK
5. Nếu lỗi: dispatch SUBMIT_ERROR với message
```

**Input/output cần đạt:**
```
Đổi tên → nhấn Lưu → loading...
→ thành công: thông báo xanh "Đã lưu!", tên trên header cập nhật ngay
→ lỗi mạng: thông báo đỏ "Không thể lưu..."
```

**Kiểm tra:** Đổi tên → Lưu → refresh trang → tên vẫn giữ nguyên (đã lưu DB).

---

## Bước 10 — Hoàn thiện UX

**Làm nốt các chi tiết:**

**`SiteHeader.jsx`:** Đổi nút tên user thành link dẫn đến `/ho-so`

**`i18n/dict.js`:** Thêm section `profile` cho cả `vi` và `en`:

```
Các key cần có (bạn tự viết nội dung):
  heading, name, bio, bioPlaceholder,
  save, saving, saved,
  avatarHint, errorName, errorSave, memberSince
```

---

## Bước 11 (Bonus) — useSearchParams trong Search.jsx

**Học được:** Lưu UI state lên URL — link chia sẻ được, F5 không mất bộ lọc.

**Vấn đề hiện tại:** `Search.jsx` dùng `useState` cho `category`. F5 mất bộ lọc.

**Làm:** Thay `useState` bằng `useSearchParams` từ `react-router-dom`:
```
Trước: const [category, setCategory] = useState('all')
Sau:   category đọc từ URL param ?category=skill
       setCategory ghi vào URL thay vì state
```

Dùng `{ replace: true }` khi set để không tạo history entry mới mỗi lần filter.

**Kiểm tra:** Chọn filter "Kỹ năng" → URL thành `/tim-kiem?category=skill` → F5 → bộ lọc vẫn còn.

---

## Thứ tự các file cần tạo/sửa

```
Bước 1        pages/Profile.jsx        (tạo mới)
              App.jsx                  (thêm route)

Bước 2-5      pages/Profile.jsx        (thêm dần từng bước)

Bước 6        components/ui/Avatar.jsx (tạo mới)
              pages/Profile.jsx        (dùng Avatar)

Bước 7-8      pages/Profile.jsx        (refactor state)

Bước 9        api/users.js             (thêm 2 hàm)
              context/AuthContext.jsx  (thêm updateUser)
              pages/Profile.jsx        (kết nối API)

Bước 10       components/layout/SiteHeader.jsx
              i18n/dict.js

Bước 11       pages/Search.jsx
```
