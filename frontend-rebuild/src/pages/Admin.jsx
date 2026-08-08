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
