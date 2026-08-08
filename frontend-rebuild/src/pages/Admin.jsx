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
                        <i className={item.icon} aria-hidden="true"></i>{item.label}
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
                                            <i className={item.icon} aria-hidden="true"></i>{item.label}
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
