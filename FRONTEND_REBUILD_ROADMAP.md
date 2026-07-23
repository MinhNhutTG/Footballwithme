# Roadmap: Xây lại toàn bộ Frontend từ đầu

Mục tiêu: dựng lại toàn bộ frontend từ con số 0 theo đúng thứ tự dưới đây, để học React từ nền tảng đến nâng cao bằng chính project FootballWithMe. Mỗi module có file `.md` riêng, code mẫu đầy đủ để đối chiếu (giống style `COMMENTS_MODULE.md`).

## Code ở đâu

Đã tạo sẵn thư mục **`frontend-rebuild/`** cạnh `frontend/` — dự án Vite mới, `src/` còn trống (chỉ có sẵn cấu trúc thư mục `api/ components/ context/ data/ hooks/ i18n/ pages/`), đã copy sẵn config (Tailwind v4, PostCSS, ESLint, `.env`, `index.css` design tokens, favicon) và chạy `npm install` xong. `frontend/` cũ giữ nguyên để đối chiếu khi cần xem code gốc.

```
cd frontend-rebuild
npm run dev        # chạy ở http://localhost:5174/ (frontend cũ vẫn ở 5173 — có thể mở song song để so sánh)
```

Bắt đầu gõ code từ **Bước 1 của `REBUILD_01_FOUNDATION.md`** (`src/api/client.js`) — dev server sẽ báo lỗi "không tìm thấy `src/main.jsx`" cho tới khi làm xong Bước 10 của module đó (đây là điều bình thường, không phải bug).

Backend không đổi — cả `frontend` và `frontend-rebuild` cùng trỏ về `http://localhost:5000/api` (xem `.env`), nên nhớ chạy `cd backend && npm run dev` (hoặc lệnh tương ứng) song song.

---

## Thứ tự module

| # | Module | Tài liệu | Trạng thái |
|---|--------|----------|-----------|
| 1 | Nền tảng: providers, Context Theme/Lang, UI kit, Layout & điều hướng | `REBUILD_01_FOUNDATION.md` | ⏳ Chưa bắt đầu |
| 2 | Xác thực: AuthContext, Login, Register | `REBUILD_02_AUTH.md` | ⏳ Chưa bắt đầu |
| 3 | Dữ liệu bài viết: PostsContext, Home, Category, ArticleDetail | `REBUILD_03_POSTS.md` | ⏳ Chưa bắt đầu |
| 4 | Tìm kiếm & Yêu thích: FavoritesContext, Search, Favorites | `REBUILD_04_SEARCH_FAVORITES.md` | ⏳ Chưa bắt đầu |
| 5 | Trang quản trị: CRUD bài viết + quản lý user | `REBUILD_05_ADMIN.md` | ⏳ Chưa bắt đầu |
| 6 | Trang tĩnh: About, Contact, NotFound | `REBUILD_06_STATIC_PAGES.md` | ⏳ Chưa bắt đầu |
| 7 | Trang cá nhân (Profile) | `REBUILD_07_PROFILE.md` | ⏳ Chưa bắt đầu |
| 8 | Bình luận (Comments) | `REBUILD_08_COMMENTS.md` | ⏳ Chưa bắt đầu |

**Cập nhật 2026-07-23:** Module 7 và 8 từng được làm trên `frontend/` cũ (`PROFILE_MODULE.md`, `COMMENTS_MODULE.md`) nhưng **chưa hề được rebuild trong `frontend-rebuild`** — đã verify: không có route `/ho-so`, không có file Profile trong `pages/`; `components/comment/` chỉ là folder rỗng. `REBUILD_07_PROFILE.md`/`REBUILD_08_COMMENTS.md` là 2 tài liệu mới, viết lại theo đúng cấu trúc `frontend-rebuild` hiện tại (tận dụng `api/users.js` và `components/ui/Avatar.jsx` đã có sẵn từ Module 5).

---

## Vì sao thứ tự này

```
1 Nền tảng ──▶ 2 Auth ──▶ 3 Posts ──▶ 4 Search/Favorites ──▶ 5 Admin ──▶ 6 Trang tĩnh
                  │                        │
                  └────────▶ 7 Profile (cần AuthContext)
                                           │
                             3 ──▶ 8 Comments (cần bài viết để bình luận vào)
```

- **Module 1** phải làm trước tiên vì mọi trang đều nằm trong `<Layout>` và dùng `useLang`/`useTheme`.
- **Module 2 (Auth)** cần xong trước vì Header, Profile, Admin, Favorites (khi đăng nhập) đều phụ thuộc `useAuth`.
- **Module 3 (Posts)** là xương sống dữ liệu — Home/Category/ArticleDetail/Search/Favorites/Admin đều đọc từ đây.
- **Module 4** dùng lại `usePosts` + `useAuth` vừa xong.
- **Module 5 (Admin)** phức tạp nhất (CRUD, sort, filter, rich text editor) nên để gần cuối.
- **Module 6** đơn giản nhất, không phụ thuộc gì — làm cuối để "dọn nốt".
- **Module 7, 8** làm sau cùng vì phụ thuộc module trước (Profile cần Auth; Comments gắn vào cuối ArticleDetail của module 3) — dù đã có tiền lệ ở `frontend/` cũ, vẫn cần viết lại từ đầu trong `frontend-rebuild`.

---

## Concept map — biết mỗi concept nằm ở module nào

| Concept | Module |
|---------|--------|
| Component, Props, JSX, Conditional/List rendering | 1 |
| Context tự tạo (`createContext` + Provider + custom hook) | 1 (Theme, Lang), 2 (Auth), 3 (Posts), 4 (Favorites) |
| `useEffect` + `localStorage` | 1, 2 |
| React Router: `Routes/Route/Outlet`, `NavLink`, `Link`, `useNavigate`, `useParams` | 1, 2, 3 |
| Fetch wrapper (`apiRequest`) + async/await error handling | 2 |
| Protected route / redirect nếu chưa login | 2, 7 (Profile) |
| `useCallback` (hàm ổn định trong Context) | 3 |
| `useMemo` (derived data: filter theo tag, tìm kiếm) | 3, 4, 5 |
| `useSearchParams` | 4 (đã làm trước ở Search.jsx trong lịch sử) |
| `dangerouslySetInnerHTML` (nội dung đã sanitize ở backend) | 3 |
| CRUD form phức tạp + mảng lồng nhau (steps) | 5 |
| Tích hợp thư viện ngoài (Tiptap rich text editor) | 5 |
| Bảng dữ liệu: search + filter + sort (`useMemo`) | 5 |
| `useState`, `useRef`, `useReducer`, `useMemo`, `useCallback`, `React.memo` | 7 (Profile) |
| Custom Hook, Context tự tạo nâng cao, Optimistic Update, `useLayoutEffect`, Portal, `forwardRef`, `useTransition` | 8 (Comments) |

---

## Cách dùng tài liệu

Mỗi file `REBUILD_0X_*.md` có cấu trúc:
1. **Tổng quan** — file nào cần tạo, thứ tự tạo.
2. **Từng bước** — Học được (concept) → Làm (code mẫu đầy đủ) → Kiểm tra (input/output mong đợi).

Gõ lại từng bước, chạy thử (`npm run dev`), rồi mới sang bước kế — đừng copy-paste cả file cùng lúc, mục tiêu là hiểu vì sao mỗi dòng code tồn tại.
