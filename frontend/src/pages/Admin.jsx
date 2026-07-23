import { useEffect, useMemo, useState } from 'react';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { usePosts } from '../context/PostsContext';
import Button from '../components/ui/Button';
import AdminTableRow from '../components/admin/AdminTableRow';
import PostForm from '../components/admin/PostForm';
import UsersPanel from '../components/admin/UsersPanel';
import SortableHeader from '../components/admin/SortableHeader';
import { fetchPosts, createPost, updatePost, deletePost } from '../api/posts';
import { CATEGORIES } from '../data/categories';

function toFormValues(post) {
  return {
    titleVi: post.title.vi,
    titleEn: post.title.en,
    excerptVi: post.excerpt.vi,
    excerptEn: post.excerpt.en,
    introVi: post.intro?.vi || '',
    introEn: post.intro?.en || '',
    bodyVi: post.body?.vi || '',
    bodyEn: post.body?.en || '',
    quoteVi: post.quote?.vi || '',
    quoteEn: post.quote?.en || '',
    mistakeVi: post.mistake?.vi || '',
    mistakeEn: post.mistake?.en || '',
    category: post.category,
    steps: (post.steps || []).map((step) => ({
      titleVi: step.title?.vi || '',
      titleEn: step.title?.en || '',
      descVi: step.desc?.vi || '',
      descEn: step.desc?.en || '',
      keyKind: step.keys?.[0]?.kind || 'default',
      keyLabel: step.keys?.[0]?.label || '',
    })),
  };
}

function Admin() {
  const { t, lang } = useLang();
  const { token, isAdmin, user, logout } = useAuth();
  const { refetch: refetchPublicPosts } = usePosts();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [section, setSection] = useState('posts');
  const [postSearch, setPostSearch] = useState('');
  const [postCategoryFilter, setPostCategoryFilter] = useState('all');
  const [postSort, setPostSort] = useState({ key: null, dir: 'asc' });

  const editingPost = posts.find((p) => p.id === editingId);

  const togglePostSort = (key) =>
    setPostSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));

  const visiblePosts = useMemo(() => {
    const q = postSearch.trim().toLowerCase();
    let list = posts.filter((p) => {
      if (postCategoryFilter !== 'all' && p.category !== postCategoryFilter) return false;
      if (!q) return true;
      return `${p.title.vi} ${p.title.en}`.toLowerCase().includes(q);
    });
    if (postSort.key) {
      list = [...list].sort((a, b) => {
        const av = postSort.key === 'title' ? a.title[lang] : t.categories[a.category]?.label || '';
        const bv = postSort.key === 'title' ? b.title[lang] : t.categories[b.category]?.label || '';
        const cmp = av.localeCompare(bv);
        return postSort.dir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [posts, postSearch, postCategoryFilter, postSort, lang, t]);

  useEffect(() => {
    if (!isAdmin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchPosts()
      .then(setPosts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const handleEdit = (id) => {
    setEditingId(id);
    setView('edit');
  };

  const handleDelete = async (id) => {
    try {
      await deletePost(id, token);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      refetchPublicPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleNew = () => {
    setEditingId(null);
    setView('new');
  };

  const handleCancel = () => {
    setView('list');
    setEditingId(null);
  };

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
    };

    try {
      if (view === 'edit' && editingId) {
        const updated = await updatePost(editingId, payload, token);
        setPosts((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      } else {
        const created = await createPost(
          { ...payload, gradient: category?.gradient },
          token
        );
        setPosts((prev) => [created, ...prev]);
      }
      setView('list');
      setEditingId(null);
      refetchPublicPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isAdmin) {
    return (
      <section className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-head text-2xl font-black text-fwm-text">
          {t.admin.heading}
        </h1>
        <p className="mt-3 text-fwm-muted">
          Bạn cần đăng nhập với quyền quản trị để truy cập trang này.
        </p>
        <Button to="/admin/login" variant="primary" className="mt-6 inline-flex">
          Đăng nhập
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[200px_1fr]">
        <aside>
          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => setSection('posts')}
              className={`block w-full rounded-fwm px-3 py-2.5 text-left font-head text-sm font-bold ${
                section === 'posts'
                  ? 'bg-fwm-accent text-fwm-ink'
                  : 'text-fwm-text hover:bg-fwm-pill'
              }`}
            >
              {t.admin.navPosts}
            </button>
            <button
              type="button"
              onClick={() => setSection('users')}
              className={`block w-full rounded-fwm px-3 py-2.5 text-left font-head text-sm font-bold ${
                section === 'users'
                  ? 'bg-fwm-accent text-fwm-ink'
                  : 'text-fwm-text hover:bg-fwm-pill'
              }`}
            >
              {t.admin.navUsers}
            </button>
          </nav>
          <div className="mt-6 rounded-fwm-lg border border-fwm-line bg-fwm-card p-4">
            <div className="font-head text-2xl font-extrabold text-fwm-text">
              {posts.length}
            </div>
            <div className="mt-1 text-xs text-fwm-muted">{t.admin.totalArticles}</div>
          </div>
          <div className="mt-4 text-xs text-fwm-muted">
            {user?.email}
            <button
              type="button"
              onClick={logout}
              className="mt-2 block font-head text-xs font-bold text-fwm-pink hover:underline"
            >
              Đăng xuất
            </button>
          </div>
        </aside>

        <div>
          {section === 'users' ? (
            <UsersPanel token={token} currentUserId={user?._id} />
          ) : (
            <>
              <div className="mb-5 flex items-center justify-between">
                <h1 className="font-head text-2xl font-black text-fwm-text">
                  {view === 'list'
                    ? t.admin.heading
                    : view === 'new'
                    ? t.admin.newPostTitle
                    : t.admin.editPostTitle}
                </h1>
                {view === 'list' && (
                  <Button variant="primary" onClick={handleNew}>
                    {t.admin.addNew}
                  </Button>
                )}
              </div>

              {error && <p className="mb-4 text-sm text-fwm-pink">{error}</p>}

              {view === 'list' ? (
                loading ? (
                  <p className="text-fwm-muted">…</p>
                ) : posts.length === 0 ? (
                  <p className="text-fwm-muted">{t.admin.empty}</p>
                ) : (
                  <div>
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                      <input
                        type="search"
                        value={postSearch}
                        onChange={(e) => setPostSearch(e.target.value)}
                        placeholder={t.admin.searchPosts}
                        className="flex-1 rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-sm text-fwm-text placeholder:text-fwm-muted focus:border-fwm-accent focus:outline-none"
                      />
                      <select
                        value={postCategoryFilter}
                        onChange={(e) => setPostCategoryFilter(e.target.value)}
                        className="rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none"
                      >
                        <option value="all">{t.admin.filterAllCategories}</option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {t.categories[cat.id].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {visiblePosts.length === 0 ? (
                      <p className="text-fwm-muted">{t.admin.noResults}</p>
                    ) : (
                      <div className="overflow-x-auto rounded-fwm-lg border border-fwm-line bg-fwm-card p-4">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-fwm-line text-left">
                              <SortableHeader
                                label={t.admin.colTitle}
                                sortKey="title"
                                sort={postSort}
                                onSort={togglePostSort}
                              />
                              <SortableHeader
                                label={t.admin.colCategory}
                                sortKey="category"
                                sort={postSort}
                                onSort={togglePostSort}
                              />
                              <th className="pb-2 text-right font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">
                                {t.admin.colActions}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {visiblePosts.map((post) => (
                              <AdminTableRow
                                key={post.id}
                                post={post}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <PostForm
                  initial={editingPost ? toFormValues(editingPost) : undefined}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                />
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default Admin;
