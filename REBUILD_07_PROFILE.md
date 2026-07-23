# Module 7: Trang hồ sơ (Profile)

Xây dựng trang `/ho-so` trong `frontend-rebuild` — mỗi bước thêm đúng 1 khái niệm React mới.
Đây là bản rebuild của module Profile cũ (`PROFILE_MODULE.md`, làm trên `frontend/`) — cùng tính năng, nhưng viết lại từ đầu trong `frontend-rebuild` và tận dụng những gì module Admin (Bước 5) đã dựng sẵn.

---

## Backend đã có sẵn

| Method | URL | Auth | Body | Trả về |
|--------|-----|------|------|--------|
| GET | `/api/users/me` | Cần token | — | object `User` đầy đủ |
| PUT | `/api/users/me` | Cần token | `{ name, bio }` | object `User` sau khi cập nhật |

Field `bio` (string, tối đa 300 ký tự, mặc định `''`) đã có trong `User` model.

## Đã có sẵn trong `frontend-rebuild` — khỏi làm lại

Vì Module 5 (Admin) đã dùng chung `api/users.js`, 3 thứ dưới đây **đã tồn tại và dùng được ngay**, khác với hồi làm `PROFILE_MODULE.md` trên `frontend/` phải tạo từ đầu:

- `api/users.js` → đã có sẵn `getMe(token)` và `updateMe(data, token)`
- `context/AuthContext.jsx` → đã có sẵn `updateUser(fields)` (merge vào `user` + đồng bộ localStorage), theo đúng mẫu `setFavorites`
- `components/ui/Avatar.jsx` → đã có sẵn, dùng `memo`, props: `initials`, `preview`, `onClick`, `hint`, `size` (`'sm' | 'md' | 'lg'`) — chưa nơi nào dùng tới, Profile sẽ là nơi dùng đầu tiên
- `components/layout/SiteHeader.jsx` → nút tên user đã trỏ sẵn `<Button to="/ho-so" variant="ghost">{user.name}</Button>` — không cần sửa gì

Vậy module này chỉ còn lại: 1 page mới + reducer + i18n.

---

## Tổng quan file sẽ tạo/sửa

```
1. pages/Profile.jsx        — tạo mới, chứa toàn bộ logic
2. App.jsx                  — thêm route /ho-so
3. i18n/dict.js              — thêm section `profile` (vi + en)
```

---

## Bước 1 — Component tĩnh + Route

**Học được:** Tạo page component mới, đăng ký route trong `App.jsx`.

**Làm:**
- Tạo `pages/Profile.jsx`, theo bố cục các page đơn khác (vd. `Login.jsx`): `<section className="mx-auto max-w-2xl px-4 py-12">`
- Render tĩnh: tiêu đề, `<Avatar initials="?" size="lg" />`, 2 input (tên, bio — input thường + textarea), 1 nút "Lưu thay đổi"
- Trong `App.jsx`: thêm `<Route path="/ho-so" element={<Profile />} />` (đặt trước route `*` catch-all)

**Kiểm tra:** Vào `http://localhost:5174/ho-so` thấy trang tĩnh, không lỗi console.

---

## Bước 2 — Controlled inputs từ user

**Học được:** `useState` để quản lý giá trị input; đọc dữ liệu ban đầu từ context có sẵn.

**Làm:**
- `const { user, token, updateUser } = useAuth();`
- `const [name, setName] = useState(user?.name || '');`
- `const [bio, setBio] = useState(user?.bio || '');`
- Gắn `value` + `onChange` vào input tên và textarea bio

**Input/output cần đạt:**
```
user = { name: "Nguyễn Văn A", bio: "Mê eFootball" }
→ input tên hiển thị "Nguyễn Văn A"
→ textarea bio hiển thị "Mê eFootball"
→ gõ vào input → state cập nhật theo
```

**Kiểm tra:** Gõ vào input, giá trị thay đổi theo. Mở React DevTools thấy state cập nhật.

---

## Bước 3 — Protected Route

**Học được:** `useEffect` chạy side-effect sau render; `useNavigate` để redirect bằng code.

**Làm:**
```jsx
useEffect(() => {
  if (!user) navigate('/dang-nhap', { replace: true });
}, [user, navigate]);

if (!user) return null;
```

**Tại sao `replace: true`?** Ghi đè history thay vì thêm entry mới — nhấn Back sau khi vào `/ho-so` không quay lại trang vừa bị redirect khỏi.

**Kiểm tra:** Đăng xuất, vào thẳng `/ho-so` → tự động chuyển về `/dang-nhap`.

---

## Bước 4 — useMemo: initials + hasChanged

**Học được:** `useMemo` tính derived value từ state có sẵn, chỉ tính lại khi dependency đổi — khác `useState` ở chỗ không lưu trạng thái riêng, không có setter.

**Làm:**

Tính `initials`:
```
"Nguyễn Văn An"  →  "NV"
"Messi"          →  "M"
""               →  "?"
```
Logic: `trim()` → split theo khoảng trắng → lấy ký tự đầu mỗi từ → nối lại → viết hoa → lấy tối đa 2 ký tự. Dependency: `[name]`.

Tính `hasChanged` (dùng để `disabled` nút Lưu):
```js
const hasChanged = useMemo(
  () => name.trim() !== user.name || bio !== (user.bio || ''),
  [name, bio, user]
);
```

**Gắn vào JSX:** `<Avatar initials={initials} size="lg" />`, nút Lưu có `disabled={!hasChanged}`.

**Kiểm tra:** Mở trang, nút Lưu bị mờ/disabled. Sửa 1 ký tự trong tên → nút bật lên. Gõ lại đúng như cũ → nút tắt lại.

---

## Bước 5 — useRef: đổi avatar qua input file ẩn

**Học được:** `useRef` trỏ vào DOM element và gọi method trực tiếp — không gây re-render.

**Tại sao không dùng `useState` cho ref?** Vì bản thân `ref` không hiển thị gì lên UI, chỉ cần "cầm tay" element DOM để gọi `.click()`. Đổi `.current` không cần re-render.

**Làm:**
```jsx
const fileInputRef = useRef(null);

<input
  type="file"
  accept="image/*"
  ref={fileInputRef}
  onChange={handleFileChange}
  className="hidden"
/>
```
- `handleAvatarClick = () => fileInputRef.current?.click()` — gắn vào `onClick` của `<Avatar>`
- `handleFileChange`: đọc file bằng `FileReader`, đọc xong thì lưu base64 vào state `preview`
- Truyền `preview` vào `<Avatar initials={initials} preview={preview} onClick={handleAvatarClick} size="lg" />`

**Input/output cần đạt:**
```
Nhấn vào avatar → hộp thoại chọn file mở ra
Chọn ảnh        → ảnh hiển thị ngay trong avatar (chưa lưu server)
```

**Kiểm tra:** Nhấn avatar, chọn ảnh từ máy → avatar đổi ngay sang ảnh vừa chọn.

---

## Bước 6 — Dùng lại `Avatar` (đã có `memo` sẵn)

**Học được:** Điều kiện để `memo` thực sự có tác dụng — props truyền vào phải ổn định giữa các lần render.

Khác với `PROFILE_MODULE.md` cũ (phải tự tạo `Avatar.jsx` + tự bọc `memo` ở bước này), `components/ui/Avatar.jsx` trong `frontend-rebuild` **đã được bọc `memo` sẵn từ trước**. Việc của bạn ở bước này không phải là tạo component, mà là **kiểm chứng** nó có tối ưu thật không.

**Làm:** Không cần sửa code — chỉ cần mở React DevTools → Profiler → gõ vào input tên → xem `Avatar` có bị highlight re-render không.

- Nếu **không** re-render: tốt, vì `initials`/`preview` chỉ đổi khi dependency của chúng đổi.
- Nếu **có** re-render: nguyên nhân gần như chắc chắn là `handleAvatarClick` — một arrow function tạo mới mỗi lần render phá vỡ `memo`. Đây chính là vấn đề Bước 8 sẽ giải quyết bằng `useCallback`.

**Kiểm tra:** Ghi lại quan sát (re-render hay không) — Bước 8 sẽ đối chiếu lại.

---

## Bước 7 — useReducer: gom state

**Học được:** `useReducer` khi nhiều state liên quan nhau hoặc một action cần đổi nhiều field cùng lúc.

**Vấn đề hiện tại:** Đang có nhiều `useState` riêng lẻ (`name`, `bio`, `preview`, và sắp cần thêm `loading`, `error`, `success` ở Bước 9). Khi submit, phải gọi nhiều setter cùng lúc — dễ quên, dễ bug.

**Làm:** Gom thành 1 reducer:
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

Quy tắc viết reducer: không sửa state trực tiếp, luôn trả object mới (`{ ...state, ... }`); có `default: return state`.

**Kiểm tra:** Mọi tính năng từ Bước 1-6 vẫn hoạt động y như cũ (đổi tên/bio, nút Lưu bật/tắt, đổi avatar).

---

## Bước 8 — useCallback: tối ưu kết hợp với memo

**Học được:** `useCallback` giữ tham chiếu hàm ổn định giữa các lần render — cần thiết khi truyền hàm xuống component có `memo`.

**Làm:**
```js
const handleAvatarClick = useCallback(() => {
  fileInputRef.current?.click();
}, []); // [] vì không phụ thuộc state nào
```
Truyền `handleAvatarClick` xuống `<Avatar onClick={...} />` thay vì arrow function inline.

**Đối chiếu lại Bước 6:** Nếu Bước 6 bạn thấy `Avatar` bị re-render khi gõ input — giờ mở lại Profiler, gõ input lần nữa: `Avatar` không còn bị highlight nữa.

**Kiểm tra:** React DevTools Profiler → gõ vào input tên → `Avatar` không re-render.

---

## Bước 9 — Kết nối API thật

**Học được:** Gọi API trong event handler; đồng bộ kết quả về `AuthContext` để cả app (vd. `SiteHeader`) thấy tên mới ngay lập tức.

Nhắc lại: `getMe`/`updateMe` (trong `api/users.js`) và `updateUser` (trong `AuthContext.jsx`) **đã có sẵn** — không cần viết thêm, chỉ cần gọi đúng.

**Làm** — hàm submit trong `Profile.jsx`:
```
1. Validate: name.trim() rỗng → dispatch SUBMIT_ERROR, dừng lại
2. dispatch SUBMIT_START
3. await updateMe({ name: name.trim(), bio }, token)
4. Thành công:
   - updateUser({ name: name.trim(), bio })   ← đồng bộ context, SiteHeader tự cập nhật
   - dispatch SUBMIT_OK
5. Lỗi (catch): dispatch SUBMIT_ERROR với err.message
```

**Input/output cần đạt:**
```
Đổi tên → nhấn Lưu → nút hiện "Đang lưu..."
→ thành công: thông báo xanh, nút Lưu tắt lại (hasChanged=false vì user đã cập nhật), tên trên header đổi ngay
→ lỗi mạng: thông báo đỏ, dữ liệu trong form giữ nguyên
```

**Kiểm tra:** Đổi tên → Lưu → F5 refresh trang → tên vẫn giữ nguyên (đã lưu MongoDB, không phải chỉ lưu local).

---

## Bước 10 — i18n

**Học được:** Thêm 1 feature mới vào hệ thống i18n dict đã có, theo đúng cấu trúc `vi`/`en` song song.

**Làm:** Trong `i18n/dict.js`, thêm section `profile` cho cả `dict.vi` và `dict.en`:
```
Các key cần có (tự viết nội dung, đối chiếu 2 ngôn ngữ):
  heading, name, bio, bioPlaceholder,
  save, saving, saved,
  avatarHint, errorName, errorSave, memberSince
```
Dùng `t.profile.xxx` trong `Profile.jsx` thay cho text tiếng Việt hard-code.

**Không cần sửa `SiteHeader.jsx`** — link `/ho-so` đã có sẵn từ trước.

**Kiểm tra:** Chuyển ngôn ngữ (nút VI/EN trên header) khi đang ở `/ho-so` → toàn bộ text trên trang đổi theo, không còn chữ tiếng Việt cứng khi ở chế độ `en`.

---

## Thứ tự file cần tạo/sửa

```
Bước 1        pages/Profile.jsx        (tạo mới, JSX tĩnh)
              App.jsx                  (thêm route /ho-so)

Bước 2-5      pages/Profile.jsx        (thêm dần state, effect, memo, ref)

Bước 6        (không sửa code — chỉ quan sát Profiler)

Bước 7-8      pages/Profile.jsx        (refactor sang reducer + useCallback)

Bước 9        pages/Profile.jsx        (gọi updateMe + updateUser có sẵn)

Bước 10       i18n/dict.js             (thêm section profile)
```
