# Lộ trình học React — FootballWithMe

Mỗi module = 1 tính năng thật trong project. Đi từ đơn giản đến nâng cao.
Học xong 5 module = đủ nền tảng để làm việc với React ở môi trường production.

> **Rebuild toàn bộ frontend từ đầu:** nếu muốn gõ lại toàn bộ `frontend/src` từ con số 0 để luyện tay, xem `FRONTEND_REBUILD_ROADMAP.md` — bộ 6 file `REBUILD_0X_*.md` phủ hết Module 1 và 2 bên dưới (Setup, Auth, Posts, Search/Favorites, Admin, trang tĩnh), cộng thêm liên kết tới `PROFILE_MODULE.md`/`COMMENTS_MODULE.md` đã xong.

---

## Bản đồ tổng thể

```
CƠ BẢN ──────────────────────────────────────────────── NÂNG CAO
   │                                                         │
Module 0    Module 1    Module 2    Module 3    Module 4    Module 5
(Lý thuyết) (Profile)  (Comments) (Toast+HOC) (Perf)     (Testing)
   │            │           │           │          │          │
HOC_REACT.md  DONE      DESIGNED    ← cần thiết kế →
```

---

## Module 0 — Lý thuyết nền (HOC_REACT.md)

Không build feature, chỉ đọc code có sẵn trong project.

| # | Concept | File ví dụ trong project |
|---|---------|--------------------------|
| 1 | Component | `components/ui/Button.jsx` |
| 2 | Props | `components/article/ArticleCard.jsx` |
| 3 | JSX | Bất kỳ file nào |
| 4 | useState | `pages/Login.jsx` |
| 5 | Event & Form | `pages/Login.jsx` |
| 6 | Conditional rendering | `pages/ArticleDetail.jsx` |
| 7 | List rendering | `pages/Home.jsx` |
| 8 | useEffect | `context/ThemeContext.jsx` |
| 9 | Routing | `App.jsx`, `pages/ArticleDetail.jsx` |
| 10 | Context API (dùng) | `context/AuthContext.jsx` |
| 11 | Custom Hook (khái niệm) | `context/FavoritesContext.jsx` |
| 12 | Gọi API | `api/client.js`, `context/PostsContext.jsx` |
| 13 | useCallback | `context/PostsContext.jsx` |
| 14 | Kiến trúc project | `main.jsx` |

---

## Module 1 — Trang Hồ Sơ `/ho-so` ✅ DONE

**Tài liệu:** `PROFILE_MODULE.md`

| Bước | Concept | Trạng thái |
|------|---------|-----------|
| 1 | Component tĩnh + Route mới | ✅ |
| 2 | useState — controlled inputs | ✅ |
| 3 | useEffect — protected route | ✅ |
| 4 | useMemo — derived values | ✅ |
| 5 | useRef — DOM access trực tiếp | ✅ |
| 6 | React.memo — bỏ qua re-render | ✅ |
| 7 | useReducer — gom nhiều state | ✅ |
| 8 | useCallback — hàm ổn định | ✅ |
| 9 | Kết nối API + error/success UI | ✅ |
| 10 | i18n + UX hoàn thiện | ✅ |
| 11 | useSearchParams (bonus) | ✅ |

---

## Module 2 — Hệ thống Bình luận (Comments) ⏳ CHƯA BẮT ĐẦU

**Tài liệu:** `COMMENTS_MODULE.md`

| Bước | Concept | Trạng thái |
|------|---------|-----------|
| 1 | Component composition | ⏳ |
| 2 | **Custom Hook** — tự tạo `useComments` | ⏳ |
| 3 | **Context tự tạo** — `CommentContext` | ⏳ |
| 4 | **Optimistic Update** — UI trước, API sau | ⏳ |
| 5 | **useLayoutEffect** — scroll trước khi paint | ⏳ |
| 6 | **Portal** — modal ra ngoài DOM tree | ⏳ |
| 7 | **forwardRef** — ref từ cha vào con | ⏳ |
| 8 | **useTransition** — update không khẩn cấp | ⏳ |
| 9 | **Error Boundary** — class component bắt lỗi | ⏳ |
| 10 | **useIntersectionObserver** — infinite scroll | ⏳ |

---

## Module 3 — Toast Thông báo + HOC ⏳ CHƯA THIẾT KẾ

**Tài liệu:** `TOAST_MODULE.md` ← cần tạo

**Feature:** Hệ thống thông báo toast xuất hiện góc màn hình khi user thực hiện hành động (lưu profile, gửi comment, lỗi mạng...). Đồng thời refactor route protection bằng HOC.

| Bước | Concept mới |
|------|------------|
| 1 | **React.lazy + Suspense** — lazy load trang Admin & ít dùng |
| 2 | **HOC (Higher-Order Component)** — `withAuth(Component)` |
| 3 | **Compound Components** — `<Toast.Container>` + `<Toast.Item>` |
| 4 | **Render Props** — `<DataTable renderRow={fn}>` |
| 5 | **useId** — tạo ID unique cho accessibility (label + input) |
| 6 | **useImperativeHandle** — expose custom API qua forwardRef |
| 7 | **useDeferredValue** — search input không làm lag UI |
| 8 | **Context + dispatch từ ngoài** — toast trigger từ bất kỳ đâu |

---

## Module 4 — Tối ưu hiệu năng ⏳ CHƯA THIẾT KẾ

**Tài liệu:** `PERFORMANCE_MODULE.md` ← cần tạo

**Feature:** Tối ưu phần danh sách bài viết khi có hàng trăm item; đo lường hiệu năng bằng React DevTools.

| Bước | Concept mới |
|------|------------|
| 1 | **React DevTools Profiler** — đo re-render, tìm bottleneck |
| 2 | **Virtualized List** — chỉ render item trong viewport (`react-window`) |
| 3 | **Code splitting** — tách bundle theo route |
| 4 | **Concurrent Mode** — hiểu `startTransition` vs `useDeferredValue` |
| 5 | **Memoization strategy** — khi nào nên/không nên dùng `memo` |
| 6 | **Web Worker** (bonus) — chuyển tính toán nặng ra khỏi main thread |

---

## Module 5 — Testing ⏳ CHƯA THIẾT KẾ

**Tài liệu:** `TESTING_MODULE.md` ← cần tạo

**Feature:** Viết test cho các tính năng đã xây. Không build tính năng mới — học test những gì đã có.

| Bước | Concept mới |
|------|------------|
| 1 | **React Testing Library** — triết lý "test như user dùng" |
| 2 | **Test component đơn giản** — render + query + assert |
| 3 | **Test useState + event** — `userEvent.click`, `userEvent.type` |
| 4 | **Test async** — `waitFor`, mock `fetch` |
| 5 | **Test Context** — wrap component trong Provider khi test |
| 6 | **renderHook** — test custom hook độc lập |
| 7 | **Test với React Router** — `MemoryRouter` |
| 8 | **Snapshot testing** — phát hiện UI thay đổi ngoài ý muốn |
| 9 | **Coverage** — đo % code được test |

---

## Bản đồ concept: đã học ở đâu

| Concept | Module |
|---------|--------|
| Component, Props, JSX | 0 |
| useState, useEffect, useCallback, useMemo | 0 + 1 |
| useRef, useReducer, React.memo | 1 |
| useSearchParams, useNavigate, useParams | 0 + 1 |
| Context API (dùng) | 0 |
| Custom Hook | 2 |
| Context (tự tạo) | 2 |
| Optimistic Update | 2 |
| useLayoutEffect | 2 |
| Portal (createPortal) | 2 |
| forwardRef | 2 |
| useTransition | 2 |
| Error Boundary | 2 |
| useIntersectionObserver | 2 |
| React.lazy + Suspense | 3 |
| HOC | 3 |
| Compound Components | 3 |
| Render Props | 3 |
| useId | 3 |
| useImperativeHandle | 3 |
| useDeferredValue | 3 |
| React DevTools Profiler | 4 |
| Virtualized List | 4 |
| Code splitting | 4 |
| Concurrent Mode | 4 |
| React Testing Library | 5 |
| renderHook | 5 |
| Mock fetch | 5 |
| Snapshot testing | 5 |

---

## Thứ tự làm

```
Hiện tại → Module 2 (Comments) → Module 3 (Toast+HOC) → Module 4 (Perf) → Module 5 (Testing)
```

Không cần đợi xong 100% module trước mới sang module sau.
Module 2 + 3 là quan trọng nhất cho công việc thực tế.
Module 4 + 5 là điểm khác biệt giữa junior và mid-level.
