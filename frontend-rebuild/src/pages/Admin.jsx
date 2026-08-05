import { useState, useEffect, useMemo } from "react";
import { fetchPosts, createPost, updatePost, deletePost } from '../api/posts'
import { useAuth } from '../context/AuthContext'
import UsersPanel from '../components/admin/UsersPanel'
import Button from '../components/ui/Button'
import AdminTableRow from '../components/admin/AdminTableRow'
import { CATEGORIES } from '../data/categories'
import SortableHeader from "../components/admin/SortableHeader";
import PostForm from "../components/admin/PostForm"
import { usePosts } from '../context/PostsContext'


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

function Admin() {
    const [section, setSection] = useState('posts');
    const { token, user, isAdmin, logout } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [view, setView] = useState('list');
    const [editingId, setEditingId] = useState(null);
    const [postSearch, setPostSearch] = useState('');
    const [postCategoryFilter, setPostCategoryFilter] = useState('all');
    const [postSort, setPostSort] = useState({ key: null, dir: 'asc' });
    // pagination state
    const [postPage, setPostPage] = useState(1);


    const { refetch: refetchPublicPosts } = usePosts();

    useEffect(() => {
        if (!isAdmin) return false;
        setLoading(true);
        fetchPosts()
            .then(setPosts).catch((err) => setError(err.message)).finally(() => setLoading(false))
    }, [isAdmin])

    useEffect(() => {
        setPostPage(1);
    }, [postSearch, postCategoryFilter, postSort])

    const handleNew = () => { setEditingId(null); setView('new'); };

    const handleEdit = (id) => { setEditingId(id); setView('edit'); };

    const handleCancel = () => { setView('list'); setEditingId(null); };

    const handleSubmit = async (form) => {

        const category = CATEGORIES.find((c) => c.id === form.category);
        const payload = {
            category: form.category,
            title: { vi: form.titleVi, en: form.titleEn },
            excerpt: { vi: form.excerptVi, en: form.excerptEn },
            intro: { vi: form.introVi, en: form.introEn },
            body: { vi: form.bodyVi, en: form.bodyEn },
            quote: { vi: form.quoteVi, en: form.quoteEn },
            mistake: { vi: form.mistakeVi, en: form.mistakeEn },
            steps: form.category === 'skill'
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
            }
            else {
                const created = await createPost({ ...payload, gradient: category?.gradient }, token);
                setPosts((prev) => [created, ...prev]);
            }
            setView('list');
            setEditingId(null);
            refetchPublicPosts();
        }
        catch (err) {
            setError(err.message);
        }
    }

    const handleDelete = async (id) => {
        try {
            await deletePost(id, token);
            setPosts((prev) => (prev.filter((p) => p.id != id)));
            refetchPublicPosts();
        }
        catch (err) {
            setError(err.message);
        }
    }

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


    if (!isAdmin) {
        return (
            <section className="mx-auto max-w-md px-4 py-24 text-center">
                <h1 className="font-head text-2xl font-black text-fwm-text">Quản trị nội dung</h1>
                <p className="mt-3 text-fwm-muted">Bạn cần đăng nhập với quyền quản trị để truy cập trang này.</p>
                <Button to="/admin/login" variant="primary" className="mt-6 inline-flex">Đăng nhập</Button>
            </section>
        );
    }

    return (
        <section className="mx-auto max-w-6xl px-4 py-10">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[200px_1fr]">
                <aside>
                    <nav className="space-y-1">
                        <button type="button" onClick={() => setSection('posts')} className={`block w-full rounded-fwm px-3 py-2.5 text-left font-head text-sm font-bold ${section === 'posts' ? 'bg-fwm-accent text-fwm-ink' : 'text-fwm-text hover:bg-fwm-pill'}`}>
                            Bài viết
                        </button>
                        <button type="button" onClick={() => setSection('users')} className={`block w-full rounded-fwm px-3 py-2.5 text-left font-head text-sm font-bold ${section === 'users' ? 'bg-fwm-accent text-fwm-ink' : 'text-fwm-text hover:bg-fwm-pill'}`}>
                            Người dùng
                        </button>
                    </nav>
                </aside>
                <div>
                    {section === 'users' ? (
                        <UsersPanel token={token} currentUserId={user?._id}></UsersPanel>
                    ) : (<>
                        <div>
                            <div className="mb-5 flex items-center justify-between">
                                <h1 className="font-head text-2xl font-black text-fwm-text">
                                    {view === 'list' ? 'Quản trị nội dung' : view === 'new' ? 'Bài viết mới' : 'Sửa bài viết'}
                                </h1>
                                {view === 'list' && (
                                    <Button variant="primary" onClick={handleNew}>Thêm bài viết</Button>
                                )}
                            </div>
                            {view === 'list' ? (<>
                                {error && <p className="mb-4 text-sm text-fwm-pink">{error}</p>}
                                {loading ? (<>
                                    <p className="text-fwm-muted">....</p>
                                </>) :

                                    posts.length === 0 ? (<>
                                        <p className="text-fwm-muted">Chưa có bài viết nào.</p>
                                    </>) : (
                                        <>
                                            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                                                <input
                                                    type="search"
                                                    value={postSearch}
                                                    onChange={(e) => setPostSearch(e.target.value)}
                                                    placeholder="Tìm theo tiêu đề..."
                                                    className="flex-1 rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-sm text-fwm-text placeholder:text-fwm-muted focus:border-fwm-accent focus:outline-none"
                                                ></input>
                                                <select
                                                    value={postCategoryFilter}
                                                    onChange={(e) => setPostCategoryFilter(e.target.value)}
                                                    className="rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none"
                                                >
                                                    <option value="all">Tất cả chuyên mục</option>
                                                    {CATEGORIES.map((c) => {
                                                        return <option key={c.id} value={c.id}> {c.id}</option>
                                                    })}
                                                </select>
                                            </div>
                                            {visiblePosts.length === 0 ? (<p className="text-fwm-muted">Không tìm thấy kết quả phù hợp.</p>) : (
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
                                                                {
                                                                    pagedPosts.map((p) => (
                                                                        <AdminTableRow key={p.id} post={p} onEdit={handleEdit} onDelete={handleDelete}></AdminTableRow>
                                                                    ))
                                                                }
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    {totalPages > 1 && (
                                                        <div className="mt-4 flex items-center justify-between">
                                                            <p className="text-sm text-fwm-muted">
                                                                Trang {postPage}/{totalPages} — {visiblePosts.length} bài viết
                                                            </p>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    disabled={postPage <= 1}
                                                                    onClick={() => setPostPage((p) => p - 1)}
                                                                >
                                                                    Trước
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    disabled={postPage >= totalPages}
                                                                    onClick={() => setPostPage((p) => p + 1)}
                                                                >
                                                                    Sau
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    )
                                }
                            </>) : (<>
                                <PostForm initial={editingPost ? toFormValues(editingPost) : undefined} onSubmit={handleSubmit} onCancel={handleCancel} token={token} />
                            </>)}

                        </div>
                    </>)}
                </div>
            </div>
        </section>
    );
}

export default Admin;