# Module: Thiết kế lại layout trang Quản trị (Admin)

Module tiếp theo sau Cài đặt Website (`SETTINGS_MODULE.md`, ✅). Không phải tính năng mới — chỉ tổ chức lại layout/điều hướng trang `/admin` cho thuận tiện hơn, không đổi logic nghiệp vụ của từng tab.

## Khảo sát hiện trạng (trước khi thiết kế lại)

Đọc toàn bộ `frontend-rebuild/src/pages/Admin.jsx` (302 dòng), phát hiện 4 vấn đề cụ thể — đây là cơ sở cho các quyết định thiết kế bên dưới, không phải cảm tính:

1. **Sidebar vỡ trên mobile/tablet.** Layout hiện là `grid-cols-1 lg:grid-cols-[200px_1fr]` — dưới `lg` (1024px), sidebar 6 nút xếp **phía trên** nội dung theo chiều dọc, chiếm hết chiều rộng màn hình. Mỗi lần đổi tab trên điện thoại phải cuộn qua ~250px nút bấm mới thấy nội dung.
2. **6 nút text phẳng, không phân nhóm, không icon.** `Bài viết/Người dùng/Nhật ký truy cập/Thống kê/Danh mục/Cài đặt` xếp liền nhau bằng `space-y-1`, không có gợi ý phân loại (nội dung vs hệ thống vs phân tích) — quét mắt tìm đúng tab ngày càng chậm khi số tab tăng (đã tăng từ 4 → 6 qua các module gần đây, có thể tăng tiếp).
3. **Đổi tab không lưu vào URL.** `section` là `useState('posts')` thuần — F5 lại trang hoặc copy link gửi cho người khác luôn quay về tab "Bài viết", mất ngữ cảnh đang xem (vd đang ở "Người dùng" để xử lý report, F5 nhầm là mất).
4. **Tab "Bài viết" không nhất quán kiến trúc với 5 tab còn lại.** `UsersPanel`/`LogsPanel`/`AnalyticsPanel`/`CategoryPanel`/`SettingsPanel` đều là component riêng trong `components/admin/`. Riêng logic bài viết (search + filter chuyên mục + sort + phân trang + form tạo/sửa, ~150 dòng) nằm thẳng trong `Admin.jsx`, lồng trong nhánh `else` của chuỗi ternary 6 nhánh — khó đọc, khó bảo trì, không soi gương được với các tab khác.

Không đụng tới logic bên trong từng panel con (`UsersPanel`, `CategoryPanel`,...) — chỉ tổ chức lại khung ngoài + tách `PostsPanel` cho nhất quán.

## Quyết định thiết kế

Không hỏi lại qua `AskUserQuestion` cho lượt này — bạn đã chủ động giao quyền quyết định thiết kế ("bằng tư duy của lập trình viên thiết kế UI"). 3 thay đổi, mỗi thay đổi giải quyết đúng 1 vấn đề đã khảo sát ở trên, không thêm gì ngoài phạm vi:

1. **Sidebar desktop giữ nguyên vị trí nhưng thêm icon + phân nhóm 3 nhóm** (Nội dung / Phân tích / Hệ thống) + **sticky** (`lg:sticky lg:top-24`) để không mất điều hướng khi cuộn bảng dài. **Trên mobile/tablet (`<lg`), thay hẳn bằng thanh tab cuộn ngang** (`flex overflow-x-auto`) nằm compact phía trên nội dung — giải quyết vấn đề #1 và #2.
2. **Đổi `useState('posts')` sang `useSearchParams`** (`/admin?tab=users`) — tab hiện tại nằm trong URL, F5/copy link giữ đúng ngữ cảnh. Tab mặc định (`posts`) không thêm query string thừa. Giải quyết vấn đề #3.
3. **Tách `PostsPanel.jsx`** — copy nguyên logic từ nhánh `else` hiện tại trong `Admin.jsx` sang file riêng, cùng chữ ký prop `{ token }` như các panel khác. `Admin.jsx` sau khi tách chỉ còn phần khung layout (~70 dòng thay vì ~300). Giải quyết vấn đề #4.

**Không đổi:** màu sắc/token thiết kế (`fwm-*`), cách từng panel con hoạt động bên trong, cấu trúc route (`/admin` vẫn 1 URL duy nhất, chỉ thêm query param `?tab=`).

---

## Kiến trúc mới

```
Admin.jsx (khung layout, ~70 dòng)
  ├── useSearchParams() → section = searchParams.get('tab') || 'posts'
  ├── NAV_GROUPS (config data, không lặp JSX 6 lần như cũ)
  │     Nội dung:   📝 Bài viết · 🗂️ Danh mục
  │     Phân tích:  📊 Thống kê · 🕒 Nhật ký truy cập
  │     Hệ thống:   👤 Người dùng · ⚙️ Cài đặt
  │
  ├── <nav lg:hidden>          — thanh tab cuộn ngang, mobile/tablet
  ├── <aside hidden lg:block>  — sidebar sticky phân nhóm, desktop
  └── PANELS[section] || PostsPanel  — render đúng 1 panel, mọi component
        đã có sẵn (PostsPanel là file MỚI, tách từ code cũ)
```

---

## Bước 1 — Tách `PostsPanel.jsx`

**Tạo file mới `frontend-rebuild/src/components/admin/PostsPanel.jsx`** — nguyên logic phần "Bài viết" đang nằm trong `Admin.jsx`, chỉ đổi tên biến `posts`/`loading`/`error`/`view`/... vẫn giữ y hệt (local state riêng của panel này, không phải đổi kiến trúc dữ liệu):

```jsx
import { useState, useEffect, useMemo } from 'react';
import { fetchPosts, createPost, updatePost, deletePost } from '../../api/posts';
import { usePosts } from '../../context/PostsContext';
import { useCategories } from '../../context/CategoryContext';
import Button from '../ui/Button';
import AdminTableRow from './AdminTableRow';
import SortableHeader from './SortableHeader';
import PostForm from './PostForm';

function toFormValues(post) {
    return {
        titleVi: post.title.vi, titleEn: post.title.en,
        excerptVi: post.excerpt.vi, excerptEn: post.excerpt.en,
        introVi: post.intro?.vi || '', introEn: post.intro?.en || '',
        bodyVi: post.body?.vi || '', bodyEn: post.body?.en || '',
        quoteVi: post.quote?.vi || '', quoteEn: post.quote?.en || '',
        mistakeVi: post.mistake?.vi || '', mistakeEn: post.mistake?.en || '',
        category: post.category,
        steps: (post.steps || []).map((step) => ({
            titleVi: step.title?.vi || '', titleEn: step.title?.en || '',
            descVi: step.desc?.vi || '', descEn: step.desc?.en || '',
            keyKind: step.keys?.[0]?.kind || 'default', keyLabel: step.keys?.[0]?.label || '',
        })),
        coverImageUrl: post.coverImageUrl || '',
        videoUrl: post.videoUrl || '',
    };
}

const POSTS_PER_PAGE = 6;

function PostsPanel({ token }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [view, setView] = useState('list');
    const [editingId, setEditingId] = useState(null);
    const [postSearch, setPostSearch] = useState('');
    const [postCategoryFilter, setPostCategoryFilter] = useState('all');
    const [postSort, setPostSort] = useState({ key: null, dir: 'asc' });
    const [postPage, setPostPage] = useState(1);

    const { refetch: refetchPublicPosts } = usePosts();
    const { categories } = useCategories();

    useEffect(() => {
        setLoading(true);
        fetchPosts()
            .then((res) => setPosts(res.data)).catch((err) => setError(err.message)).finally(() => setLoading(false))
    }, []);

    useEffect(() => {
        setPostPage(1);
    }, [postSearch, postCategoryFilter, postSort])

    const handleNew = () => { setEditingId(null); setView('new'); };
    const handleEdit = (id) => { setEditingId(id); setView('edit'); };
    const handleCancel = () => { setView('list'); setEditingId(null); };

    const handleSubmit = async (form) => {
        const category = categories.find((c) => c.slug === form.category);
        const payload = {
            category: form.category,
            gradient: category?.gradient,
            title: { vi: form.titleVi, en: form.titleEn },
            excerpt: { vi: form.excerptVi, en: form.excerptEn },
            intro: { vi: form.introVi, en: form.introEn },
            body: { vi: form.bodyVi, en: form.bodyEn },
            quote: { vi: form.quoteVi, en: form.quoteEn },
            mistake: { vi: form.mistakeVi, en: form.mistakeEn },
            steps: category?.hasSteps
                ? form.steps.map((step) => ({
                    title: { vi: step.titleVi, en: step.titleEn },
                    desc: { vi: step.descVi, en: step.descEn },
                    keys: [{ kind: step.keyKind, label: step.keyLabel }],
                }))
                : [],
            coverImageUrl: form.coverImageUrl,
            videoUrl: form.videoUrl,
        };

        try {
            if (view === 'edit' && editingId) {
                const updated = await updatePost(editingId, payload, token);
                setPosts((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
            } else {
                const created = await createPost(payload, token);
                setPosts((prev) => [created, ...prev]);
            }
            setView('list');
            setEditingId(null);
            refetchPublicPosts();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deletePost(id, token);
            setPosts((prev) => prev.filter((p) => p.id != id));
            refetchPublicPosts();
        } catch (err) {
            setError(err.message);
        }
    };

    const togglePostSort = (key) => (
        setPostSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))
    );

    const visiblePosts = useMemo(() => {
        const q = postSearch.trim().toLowerCase();
        let list = posts.filter((p) => {
            if (postCategoryFilter !== 'all' && p.category !== postCategoryFilter) return false;
            if (!q) return true;
            return `${p.title.vi} ${p.title.en}`.toLocaleLowerCase().includes(q);
        });
        if (postSort.key) {
            list = [...list].sort((a, b) => {
                const av = postSort.key === 'title' ? a.title.vi : a.category;
                const bv = postSort.key === 'title' ? b.title.vi : b.category;
                const cmp = av.localeCompare(bv);
                return postSort.dir === 'asc' ? cmp : -cmp;
            });
        }
        return list;
    }, [posts, postSearch, postCategoryFilter, postSort]);

    const totalPages = Math.max(1, Math.ceil(visiblePosts.length / POSTS_PER_PAGE));
    const pagedPosts = useMemo(() => visiblePosts.slice((postPage - 1) * POSTS_PER_PAGE, postPage * POSTS_PER_PAGE), [visiblePosts, postPage]);
    useEffect(() => {
        if (postPage > totalPages) setPostPage(totalPages);
    }, [postPage, totalPages]);
    const editingPost = posts.find((p) => p.id === editingId);

    return (
        <div>
            <div className="mb-5 flex items-center justify-between">
                <h1 className="font-head text-2xl font-black text-fwm-text">
                    {view === 'list' ? 'Quản trị nội dung' : view === 'new' ? 'Bài viết mới' : 'Sửa bài viết'}
                </h1>
                {view === 'list' && (
                    <Button variant="primary" onClick={handleNew}>Thêm bài viết</Button>
                )}
            </div>
            {view === 'list' ? (
                <>
                    {error && <p className="mb-4 text-sm text-fwm-pink">{error}</p>}
                    {loading ? (
                        <p className="text-fwm-muted">....</p>
                    ) : posts.length === 0 ? (
                        <p className="text-fwm-muted">Chưa có bài viết nào.</p>
                    ) : (
                        <>
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                                <input
                                    type="search"
                                    value={postSearch}
                                    onChange={(e) => setPostSearch(e.target.value)}
                                    placeholder="Tìm theo tiêu đề..."
                                    className="flex-1 rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-sm text-fwm-text placeholder:text-fwm-muted focus:border-fwm-accent focus:outline-none"
                                />
                                <select
                                    value={postCategoryFilter}
                                    onChange={(e) => setPostCategoryFilter(e.target.value)}
                                    className="rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none"
                                >
                                    <option value="all">Tất cả chuyên mục</option>
                                    {categories.map((c) => (
                                        <option key={c._id} value={c.slug}>{c.label.vi}</option>
                                    ))}
                                </select>
                            </div>
                            {visiblePosts.length === 0 ? (
                                <p className="text-fwm-muted">Không tìm thấy kết quả phù hợp.</p>
                            ) : (
                                <>
                                    <div className="overflow-x-auto rounded-fwm-lg border border-fwm-line bg-fwm-card p-4">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-fwm-line text-left">
                                                    <SortableHeader label="Tiêu đề" sortKey="title" sort={postSort} onSort={togglePostSort} />
                                                    <SortableHeader label="Chuyên mục" sortKey="category" sort={postSort} onSort={togglePostSort} />
                                                    <th className="pb-2 text-right font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Hành động</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pagedPosts.map((p) => (
                                                    <AdminTableRow key={p.id} post={p} onEdit={handleEdit} onDelete={handleDelete}></AdminTableRow>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {totalPages > 1 && (
                                        <div className="mt-4 flex items-center justify-between">
                                            <p className="text-sm text-fwm-muted">
                                                Trang {postPage}/{totalPages} — {visiblePosts.length} bài viết
                                            </p>
                                            <div className="flex gap-2">
                                                <Button type="button" variant="ghost" disabled={postPage <= 1} onClick={() => setPostPage((p) => p - 1)}>
                                                    Trước
                                                </Button>
                                                <Button type="button" variant="ghost" disabled={postPage >= totalPages} onClick={() => setPostPage((p) => p + 1)}>
                                                    Sau
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </>
            ) : (
                <PostForm initial={editingPost ? toFormValues(editingPost) : undefined} categories={categories} onSubmit={handleSubmit} onCancel={handleCancel} token={token} />
            )}
        </div>
    );
}

export default PostsPanel;
```

**Kiểm tra:** file mới build được (chưa gắn vào đâu cả ở bước này) — `npx vite build` không lỗi import/cú pháp.

---

## Bước 2 — Viết lại `Admin.jsx`: layout data-driven + sidebar phân nhóm + tab mobile + URL sync

**Dán lại toàn bộ `frontend-rebuild/src/pages/Admin.jsx`:**

```jsx
import { useAuth } from '../context/AuthContext'
import { useSearchParams } from 'react-router-dom'
import PostsPanel from '../components/admin/PostsPanel'
import UsersPanel from '../components/admin/UsersPanel'
import LogsPanel from '../components/admin/LogsPanel'
import AnalyticsPanel from '../components/admin/AnalyticsPanel'
import CategoryPanel from '../components/admin/CategoryPanel'
import SettingsPanel from '../components/admin/SettingsPanel'
import Button from '../components/ui/Button'

const NAV_GROUPS = [
    {
        heading: 'Nội dung', items: [
            { key: 'posts', label: 'Bài viết', icon: '📝' },
            { key: 'categories', label: 'Danh mục', icon: '🗂️' },
        ]
    },
    {
        heading: 'Phân tích', items: [
            { key: 'analytics', label: 'Thống kê', icon: '📊' },
            { key: 'logs', label: 'Nhật ký truy cập', icon: '🕒' },
        ]
    },
    {
        heading: 'Hệ thống', items: [
            { key: 'users', label: 'Người dùng', icon: '👤' },
            { key: 'settings', label: 'Cài đặt', icon: '⚙️' },
        ]
    },
];
const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

const PANELS = {
    users: UsersPanel,
    logs: LogsPanel,
    analytics: AnalyticsPanel,
    categories: CategoryPanel,
    settings: SettingsPanel,
};

function Admin() {
    const { token, user, isAdmin } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const section = searchParams.get('tab') || 'posts';
    const setSection = (key) => setSearchParams(key === 'posts' ? {} : { tab: key });

    if (!isAdmin) {
        return (
            <section className="mx-auto max-w-md px-4 py-24 text-center">
                <h1 className="font-head text-2xl font-black text-fwm-text">Quản trị nội dung</h1>
                <p className="mt-3 text-fwm-muted">Bạn cần đăng nhập với quyền quản trị để truy cập trang này.</p>
                <Button to="/admin/login" variant="primary" className="mt-6 inline-flex">Đăng nhập</Button>
            </section>
        );
    }

    const Panel = PANELS[section];

    return (
        <section className="mx-auto max-w-6xl px-4 py-8">
            <nav className="mb-6 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                {NAV_ITEMS.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => setSection(item.key)}
                        className={`flex shrink-0 items-center gap-1.5 rounded-fwm-pill px-3.5 py-2 font-head text-sm font-bold ${section === item.key ? 'bg-fwm-accent text-fwm-ink' : 'bg-fwm-pill text-fwm-text'}`}
                    >
                        <span>{item.icon}</span>{item.label}
                    </button>
                ))}
            </nav>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
                <aside className="hidden lg:block">
                    <nav className="sticky top-24 space-y-5">
                        {NAV_GROUPS.map((group) => (
                            <div key={group.heading}>
                                <p className="mb-1.5 px-3 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">
                                    {group.heading}
                                </p>
                                <div className="space-y-1">
                                    {group.items.map((item) => (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onClick={() => setSection(item.key)}
                                            className={`flex w-full items-center gap-2.5 rounded-fwm px-3 py-2.5 text-left font-head text-sm font-bold ${section === item.key ? 'bg-fwm-accent text-fwm-ink' : 'text-fwm-text hover:bg-fwm-pill'}`}
                                        >
                                            <span>{item.icon}</span>{item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>
                </aside>
                <div className="min-w-0">
                    {Panel ? <Panel token={token} currentUserId={user?._id} /> : <PostsPanel token={token} />}
                </div>
            </div>
        </section>
    );
}

export default Admin;
```

Điểm dễ nhầm nếu tự gõ lại:
- **`NAV_GROUPS` là data, không phải JSX lặp tay** — sidebar desktop và thanh tab mobile cùng đọc chung 1 nguồn (`NAV_ITEMS` = làm phẳng `NAV_GROUPS`), sửa 1 tab (thêm/đổi tên/icon) chỉ cần sửa đúng 1 chỗ, tự động lên cả 2 nơi.
- **`<Panel token={token} currentUserId={user?._id} />`** — truyền `currentUserId` cho MỌI panel dù chỉ `UsersPanel` dùng tới, các panel còn lại (`CategoryPanel`, `SettingsPanel`,...) đơn giản bỏ qua prop lạ này (React không báo lỗi khi component nhận prop không dùng tới) — đánh đổi hợp lý để giữ code render data-driven gọn, không phải viết lại nhánh ternary như cũ.
- **`Panel` chỉ có 5 key** (`users/logs/analytics/categories/settings`) — `section === 'posts'` (mặc định) sẽ không khớp key nào trong `PANELS`, `Panel` thành `undefined`, rơi vào nhánh `: <PostsPanel token={token} />` — đây là cách xử lý tab mặc định, **không phải thiếu sót bỏ quên** `posts` khỏi `PANELS`.
- **`setSection(key === 'posts' ? {} : { tab: key })`** — cố tình không set `?tab=posts` để URL tab mặc định gọn (`/admin` thay vì `/admin?tab=posts`), các tab khác mới có query param.
- **`min-w-0` trên `<div>` bọc panel** — CSS Grid item mặc định không co lại dưới kích thước nội dung bên trong (vd bảng rộng), thiếu `min-w-0` có thể khiến cả layout bị đẩy tràn ngang ở màn hình hẹp dù bảng đã có `overflow-x-auto` riêng.
- **`lg:top-24`** (96px) cho sidebar sticky — đủ để không bị `SiteHeader` (`sticky top-0`, cao ~64px) đè lên khi cuộn, còn dư khoảng cách để không dính sát mép.

**Kiểm tra:**
- Desktop (≥1024px): sidebar bên trái hiện đủ 3 nhóm, icon + label rõ ràng, tab đang chọn tô nền vàng accent. Cuộn trang xuống khi đang ở tab "Bài viết" (bảng dài) → sidebar dính lại (`sticky`), không mất khỏi màn hình.
- Thu nhỏ cửa sổ trình duyệt xuống dưới 1024px (hoặc mở DevTools responsive mode, chọn iPhone/iPad) → sidebar biến mất, thay bằng 1 thanh pill cuộn ngang phía trên, đủ 6 tab, cuộn ngang mượt bằng ngón tay/chuột.
- Bấm qua từng tab (kể cả trên thanh mobile lẫn sidebar desktop) → URL đổi thành `/admin?tab=users`, `/admin?tab=settings`,... riêng tab "Bài viết" thì URL về lại `/admin` (không có query).
- Đang ở `/admin?tab=logs`, nhấn F5 → vẫn ở đúng tab "Nhật ký truy cập", không bị bật về "Bài viết".
- Tab "Bài viết": mọi chức năng cũ vẫn hoạt động y hệt — thêm/sửa/xoá bài viết, tìm kiếm, lọc chuyên mục, sort theo tiêu đề/chuyên mục, phân trang 6 bài/trang.
- Các tab còn lại (`Người dùng`/`Nhật ký`/`Thống kê`/`Danh mục`/`Cài đặt`) hiển thị và hoạt động y hệt trước khi đổi layout — module này **không đổi logic bên trong**, chỉ đổi khung ngoài.

---

## Bản sửa 2 — bỏ thanh tab ngang mobile, dùng 1 sidebar responsive duy nhất

Sau khi thêm tab "Bình luận" (`COMMENT_MODERATION_MODULE.md`), sidebar có **7 mục** — thanh tab cuộn ngang ở Bản sửa 1 (dùng cho `<lg`) bắt đầu bộc lộ đúng vấn đề mà thiết kế "xếp hàng ngang" luôn gặp: càng nhiều mục càng dễ tràn/xấu, không mở rộng tốt. Phản hồi: **bỏ hẳn thanh tab ngang riêng cho mobile, chỉ dùng 1 sidebar trái — phải duy nhất ở mọi kích thước màn hình**, không đổi cấu trúc sang dạng khác theo breakpoint nữa.

**Giải pháp:** 1 `<aside>` responsive duy nhất (không còn 2 khối `<nav>` tách biệt như Bản sửa 1):
- **Dưới `lg`**: dải icon hẹp (~64px), chỉ hiện icon, không hiện label/tên nhóm — vẫn đứng y nguyên bên trái, không đẩy nội dung xuống dưới như thiết kế gốc trước Bản sửa 1.
- **Từ `lg` trở lên**: y hệt Bản sửa 1 — sidebar 220px, đủ label + tên nhóm + sticky.
- Cùng 1 nguồn `NAV_GROUPS`, cùng 1 khối JSX — không cần `NAV_ITEMS` (mảng làm phẳng chỉ phục vụ thanh tab ngang cũ) nữa, xoá luôn.

**Dán lại toàn bộ `frontend-rebuild/src/pages/Admin.jsx`:**

```jsx
import { useAuth } from '../context/AuthContext'
import { useSearchParams } from 'react-router-dom'
import PostsPanel from '../components/admin/PostsPanel'
import UsersPanel from '../components/admin/UsersPanel'
import LogsPanel from '../components/admin/LogsPanel'
import AnalyticsPanel from '../components/admin/AnalyticsPanel'
import CategoryPanel from '../components/admin/CategoryPanel'
import SettingsPanel from '../components/admin/SettingsPanel'
import CommentsPanel from '../components/admin/CommentsPanel'
import Button from '../components/ui/Button'

const NAV_GROUPS = [
    {
        heading: 'Nội dung', items: [
            { key: 'posts', label: 'Bài viết', icon: 'fa-solid fa-file-lines' },
            { key: 'categories', label: 'Danh mục', icon: 'fa-solid fa-folder-open' },
            { key: 'comments', label: 'Bình luận', icon: 'fa-solid fa-comments' },
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

const PANELS = {
    users: UsersPanel,
    logs: LogsPanel,
    analytics: AnalyticsPanel,
    categories: CategoryPanel,
    settings: SettingsPanel,
    comments: CommentsPanel,
};

function Admin() {
    const { token, user, isAdmin } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const section = searchParams.get('tab') || 'posts';
    const setSection = (key) => setSearchParams(key === 'posts' ? {} : { tab: key });

    if (!isAdmin) {
        return (
            <section className="mx-auto max-w-md px-4 py-24 text-center">
                <h1 className="font-head text-2xl font-black text-fwm-text">Quản trị nội dung</h1>
                <p className="mt-3 text-fwm-muted">Bạn cần đăng nhập với quyền quản trị để truy cập trang này.</p>
                <Button to="/admin/login" variant="primary" className="mt-6 inline-flex">Đăng nhập</Button>
            </section>
        );
    }

    const Panel = PANELS[section];

    return (
        <section className="mx-auto max-w-6xl px-4 py-8">
            <div className="grid grid-cols-[64px_1fr] gap-4 sm:gap-6 lg:grid-cols-[220px_1fr] lg:gap-8">
                <aside>
                    <nav className="space-y-1 lg:sticky lg:top-24 lg:space-y-5">
                        {NAV_GROUPS.map((group) => (
                            <div key={group.heading}>
                                <p className="mb-1.5 hidden px-3 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted lg:block">
                                    {group.heading}
                                </p>
                                <div className="space-y-1">
                                    {group.items.map((item) => (
                                        <button
                                            key={item.key}
                                            type="button"
                                            aria-label={item.label}
                                            title={item.label}
                                            onClick={() => setSection(item.key)}
                                            className={`flex w-full items-center justify-center gap-2.5 rounded-fwm px-2 py-2.5 text-left font-head text-sm font-bold lg:justify-start lg:px-3 ${section === item.key ? 'bg-fwm-accent text-fwm-ink' : 'text-fwm-text hover:bg-fwm-pill'}`}
                                        >
                                            <i className={item.icon} aria-hidden="true"></i>
                                            <span className="hidden lg:inline">{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>
                </aside>
                <div className="min-w-0">
                    {Panel ? <Panel token={token} currentUserId={user?._id} /> : <PostsPanel token={token} />}
                </div>
            </div>
        </section>
    );
}

export default Admin;
```

Điểm dễ nhầm nếu tự gõ lại:
- **`grid-cols-[64px_1fr]` ở mọi kích thước, đổi thành `lg:grid-cols-[220px_1fr]` từ `lg` trở lên** — chỉ đổi độ rộng cột trái, cấu trúc 2 cột trái/phải giữ nguyên xuyên suốt, không còn nhánh "1 cột dồn nội dung xuống dưới" như thiết kế gốc trước Bản sửa 1.
- **`aria-label={item.label}` bắt buộc thêm mới** — vì `<span>{item.label}</span>` bị `hidden` (mất khỏi cây accessibility) ở màn hình nhỏ, nút chỉ còn icon không có text cho trình đọc màn hình nếu thiếu `aria-label` này.
- **`title={item.label}`** thêm để hiện tooltip khi rê chuột qua icon ở dải hẹp (không có tác dụng trên cảm ứng, nhưng vô hại, không cần bọc điều kiện riêng cho mobile).
- **`lg:sticky lg:top-24` đặt trên `<nav>` bên trong, không phải `<aside>` ngoài** — giữ nguyên vị trí đặt từ Bản sửa 1, không đổi.
- Đã xoá hẳn `const NAV_ITEMS = NAV_GROUPS.flatMap(...)` — biến này chỉ phục vụ thanh tab ngang cũ, nay không còn nơi nào dùng tới.

**Kiểm tra:**
- Thu nhỏ trình duyệt xuống dưới 1024px (hoặc mở DevTools responsive, chọn iPhone) → sidebar vẫn nằm cố định bên trái (không còn nhảy lên trên nội dung), chỉ còn dải icon hẹp ~64px, không tràn/không cuộn ngang dù có 7 mục.
- Rê chuột qua từng icon ở dải hẹp → hiện tooltip đúng tên mục (`title`).
- Từ 1024px trở lên → sidebar mở rộng đủ 220px, hiện đủ icon + label + tên nhóm + sticky khi cuộn, y hệt Bản sửa 1.
- Bấm chọn tab ở dải hẹp (mobile) → đổi đúng `?tab=` trên URL và hiện đúng panel, giống hệt hành vi cũ.
- Test với trình đọc màn hình (hoặc kiểm tra DOM qua DevTools) → mỗi nút ở dải hẹp có `aria-label` đúng tên mục dù không hiện chữ.

---

## Còn cần bạn chốt

Không có — bạn đã giao quyền quyết định thiết kế cho lượt này. Nếu sau khi dùng thử thấy hướng nào (icon/tên nhóm/vị trí sticky) chưa ưng, có thể chỉnh trực tiếp ở `NAV_GROUPS` trong `Admin.jsx` (đổi icon emoji hoặc câu chữ), không cần sửa gì ở tầng dữ liệu/logic.
