# Module 5: Trang quản trị (Admin)

Module phức tạp nhất: CRUD bài viết với form nhiều field song ngữ + mảng lồng nhau (steps), tích hợp rich text editor bên thứ ba (Tiptap), và bảng quản lý user với search/filter/sort. Nên làm sau khi đã quen với Context, `useMemo`, controlled form.

---

## Backend đã có sẵn

Posts (Module 3 đã có `api/posts.js`), thêm Users:

| Method | URL | Auth | Body | Trả về |
|--------|-----|------|------|--------|
| GET | `/api/users` | Admin | — | `User[]` |
| PUT | `/api/users/:id/role` | Admin | `{ role: 'user'\|'admin' }` | `User` đã cập nhật |
| DELETE | `/api/users/:id` | Admin | — | `{ success: true }` |
| GET | `/api/users/me` | Cần token | — | `User` (dùng ở Profile) |
| PUT | `/api/users/me` | Cần token | `{ name, bio }` | `User` (dùng ở Profile) |

Chỉ `protect` (cần token) + `adminOnly` (role phải là admin) mới gọi được các route quản trị — 401/403 nếu vi phạm, xử lý bằng `apiRequest` đã throw `Error` sẵn.

---

## Tổng quan file sẽ tạo

```
1. api/users.js                        — fetchUsers/updateUserRole/deleteUser/getMe/updateMe
2. components/admin/SortableHeader.jsx  — nút <th> click để đổi hướng sort
3. components/admin/AdminTableRow.jsx   — 1 dòng bảng bài viết
4. components/admin/RichTextEditor.jsx  — bọc thư viện Tiptap
5. components/admin/PostForm.jsx        — form tạo/sửa bài viết
6. components/admin/UsersPanel.jsx       — bảng quản lý user
7. pages/Admin.jsx                       — ráp tất cả lại, 2 section (posts/users)
```

Cài thư viện rich text trước khi làm Bước 4:
```bash
npm install @tiptap/react @tiptap/starter-kit
```

---

## Bước 1 — `api/users.js`

**Làm:**
```js
// api/users.js
import { apiRequest } from './client';

export function fetchUsers(token) {
  return apiRequest('/users', { token });
}

export function updateUserRole(id, role, token) {
  return apiRequest(`/users/${id}/role`, { method: 'PUT', body: { role }, token });
}

export function deleteUser(id, token) {
  return apiRequest(`/users/${id}`, { method: 'DELETE', token });
}

export function getMe(token) {
  return apiRequest('/users/me', { token });
}

export function updateMe(data, token) {
  return apiRequest('/users/me', { method: 'PUT', body: data, token });
}
```

---

## Bước 2 — `components/admin/SortableHeader.jsx`

**Học được:** Component `<th>` dùng lại cho mọi cột có thể sort — nhận state `sort` (`{ key, dir }`) từ cha và tự quyết định hiện mũi tên nào (`↑`/`↓`/`↕`).

**Làm:**
```jsx
function SortableHeader({ label, sortKey, sort, onSort, className = '' }) {
  const active = sort.key === sortKey;
  const arrow = active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕';

  return (
    <th className={`pb-2 font-head text-xs font-bold uppercase tracking-wide ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 transition ${active ? 'text-fwm-accent' : 'text-fwm-muted hover:text-fwm-text'}`}
      >
        {label} <span className="text-[10px]">{arrow}</span>
      </button>
    </th>
  );
}

export default SortableHeader;
```

**Pattern toggle sort dùng ở cả 2 nơi gọi nó (Posts và Users):**
```js
const toggleSort = (key) =>
  setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
```
Bấm cùng 1 cột 2 lần liên tiếp → đảo chiều `asc`/`desc`; bấm cột khác → luôn bắt đầu lại từ `asc`.

---

## Bước 3 — `components/admin/AdminTableRow.jsx`

**Làm:**
```jsx
import { useLang } from '../../context/LangContext';

function AdminTableRow({ post, onEdit, onDelete }) {
  const { lang, t } = useLang();

  return (
    <tr className="border-b border-fwm-line last:border-0">
      <td className="py-3 pr-4">
        <span className={`mr-3 inline-block h-8 w-12 rounded-fwm-sm bg-gradient-to-br ${post.gradient} align-middle`} />
        <span className="font-head text-sm font-bold text-fwm-text">{post.title[lang]}</span>
      </td>
      <td className="py-3 pr-4 text-sm text-fwm-muted">{t.categories[post.category]?.label}</td>
      <td className="py-3 text-right">
        <button type="button" onClick={() => onEdit(post.id)} className="mr-3 font-head text-xs font-bold text-fwm-accent hover:underline">
          {t.admin.edit}
        </button>
        <button type="button" onClick={() => onDelete(post.id)} className="font-head text-xs font-bold text-fwm-pink hover:underline">
          {t.admin.delete}
        </button>
      </td>
    </tr>
  );
}

export default AdminTableRow;
```

---

## Bước 4 — `components/admin/RichTextEditor.jsx`: tích hợp Tiptap

**Học được:** Cách bọc 1 thư viện ngoài (`@tiptap/react`) thành component controlled quen thuộc (`value` + `onChange`) — hook `useEditor` của Tiptap tự quản lý DOM contenteditable bên trong, ta chỉ cần đồng bộ HTML ra ngoài qua `onUpdate`.

**Làm:**
```jsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const TOOLBAR_BUTTONS = [
  { label: 'B', title: 'Đậm', action: (e) => e.chain().focus().toggleBold().run(), isActive: (e) => e.isActive('bold'), className: 'font-bold' },
  { label: 'I', title: 'Nghiêng', action: (e) => e.chain().focus().toggleItalic().run(), isActive: (e) => e.isActive('italic'), className: 'italic' },
  { label: 'S', title: 'Gạch ngang', action: (e) => e.chain().focus().toggleStrike().run(), isActive: (e) => e.isActive('strike'), className: 'line-through' },
  { label: 'H2', title: 'Tiêu đề lớn', action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), isActive: (e) => e.isActive('heading', { level: 2 }) },
  { label: 'H3', title: 'Tiêu đề nhỏ', action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(), isActive: (e) => e.isActive('heading', { level: 3 }) },
  { label: '•', title: 'Danh sách', action: (e) => e.chain().focus().toggleBulletList().run(), isActive: (e) => e.isActive('bulletList') },
  { label: '1.', title: 'Danh sách số', action: (e) => e.chain().focus().toggleOrderedList().run(), isActive: (e) => e.isActive('orderedList') },
  { label: '"', title: 'Trích dẫn', action: (e) => e.chain().focus().toggleBlockquote().run(), isActive: (e) => e.isActive('blockquote') },
];

function RichTextEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose-content min-h-[160px] rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-3 text-fwm-text focus:outline-none',
      },
    },
  });

  if (!editor) return null;

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1 rounded-fwm border border-fwm-line bg-fwm-card-2 p-1.5">
        {TOOLBAR_BUTTONS.map((btn) => (
          <button
            key={btn.label}
            type="button"
            title={btn.title}
            onClick={() => btn.action(editor)}
            className={`h-8 min-w-8 rounded-fwm-sm px-2 text-sm font-bold transition ${btn.className || ''} ${
              btn.isActive(editor) ? 'bg-fwm-accent text-fwm-ink' : 'text-fwm-text hover:bg-fwm-pill'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export default RichTextEditor;
```

**Vì sao check `if (!editor) return null`?** `useEditor` khởi tạo bất đồng bộ — lần render đầu tiên `editor` là `null`. Không check sẽ crash khi gọi `editor.isActive(...)`.

**Kiểm tra:** Gõ chữ, bấm nút "B" → chữ đang gõ tiếp theo in đậm; bấm lại → tắt đậm (toggle).

---

## Bước 5 — `components/admin/PostForm.jsx`

**Học được:** Form lớn với 1 object state duy nhất (`form`), các hàm helper sinh field lặp lại (`textField`, `bodyField`) để không copy-paste JSX 12 lần, và mảng lồng trong state (`steps`) — thêm/xoá/sửa từng phần tử bằng cách map lại toàn mảng.

**Làm:**
```jsx
import { useState } from 'react';
import { useLang } from '../../context/LangContext';
import Button from '../ui/Button';
import RichTextEditor from './RichTextEditor';
import GamepadKey from '../skill/GamepadKey';
import { CATEGORIES } from '../../data/categories';

const EMPTY_FORM = {
  titleVi: '', titleEn: '', excerptVi: '', excerptEn: '',
  introVi: '', introEn: '', bodyVi: '', bodyEn: '',
  quoteVi: '', quoteEn: '', mistakeVi: '', mistakeEn: '',
  category: CATEGORIES[0].id, steps: [],
};

const EMPTY_STEP = { titleVi: '', titleEn: '', descVi: '', descEn: '', keyKind: 'default', keyLabel: '' };

const KEY_KINDS = [
  { value: 'default', label: 'Chữ / nhãn thường' },
  { value: 'cir', label: 'Tròn (đỏ)' },
  { value: 'sq', label: 'Vuông (hồng)' },
  { value: 'tri', label: 'Tam giác (xanh lá)' },
  { value: 'cross', label: 'Chéo (xanh dương)' },
];

function PostForm({ initial, onSubmit, onCancel }) {
  const { t } = useLang();
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const handleRichChange = (field) => (html) => setForm((f) => ({ ...f, [field]: html }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const addStep = () => setForm((f) => ({ ...f, steps: [...f.steps, { ...EMPTY_STEP }] }));
  const removeStep = (index) => setForm((f) => ({ ...f, steps: f.steps.filter((_, i) => i !== index) }));
  const updateStep = (index, field) => (e) =>
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s, i) => (i === index ? { ...s, [field]: e.target.value } : s)),
    }));

  const textField = (labelKey, key, Tag = 'input') => (
    <div>
      <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin[labelKey]}</label>
      <Tag
        required
        value={form[key]}
        onChange={handleChange(key)}
        rows={Tag === 'textarea' ? 3 : undefined}
        className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none"
      />
    </div>
  );

  const bodyField = (labelKey, key) => (
    <div>
      <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin[labelKey]}</label>
      <RichTextEditor value={form[key]} onChange={handleRichChange(key)} />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-fwm-lg border border-fwm-line bg-fwm-card p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{textField('formTitleVi', 'titleVi')}{textField('formTitleEn', 'titleEn')}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{textField('formExcerptVi', 'excerptVi', 'textarea')}{textField('formExcerptEn', 'excerptEn', 'textarea')}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{textField('formIntroVi', 'introVi', 'textarea')}{textField('formIntroEn', 'introEn', 'textarea')}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{bodyField('formBodyVi', 'bodyVi')}{bodyField('formBodyEn', 'bodyEn')}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{textField('formQuoteVi', 'quoteVi', 'textarea')}{textField('formQuoteEn', 'quoteEn', 'textarea')}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{textField('formMistakeVi', 'mistakeVi', 'textarea')}{textField('formMistakeEn', 'mistakeEn', 'textarea')}</div>

      <div>
        <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.formCategory}</label>
        <select
          value={form.category}
          onChange={handleChange('category')}
          className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none"
        >
          {CATEGORIES.map((cat) => <option key={cat.id} value={cat.id}>{t.categories[cat.id].label}</option>)}
        </select>
      </div>

      {form.category === 'skill' && (
        <div className="rounded-fwm-lg border border-fwm-line bg-fwm-card-2 p-4">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-head text-sm font-bold uppercase tracking-wide text-fwm-text">{t.admin.stepsHeading}</h3>
            <Button type="button" variant="ghost" onClick={addStep}>{t.admin.addStep}</Button>
          </div>
          <p className="mb-3 text-xs text-fwm-muted">{t.admin.stepsHint}</p>

          <div className="space-y-4">
            {form.steps.map((step, index) => (
              <div key={index} className="rounded-fwm border border-fwm-line bg-fwm-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-head text-xs font-bold text-fwm-accent">{t.admin.stepN} {index + 1}</span>
                  <button type="button" onClick={() => removeStep(index)} className="font-head text-xs font-bold text-fwm-pink hover:underline">
                    {t.admin.removeStep}
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-fwm-muted">{t.admin.stepTitleVi}</label>
                    <input required value={step.titleVi} onChange={updateStep(index, 'titleVi')}
                      className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-3 py-2 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-fwm-muted">{t.admin.stepTitleEn}</label>
                    <input required value={step.titleEn} onChange={updateStep(index, 'titleEn')}
                      className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-3 py-2 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-fwm-muted">{t.admin.stepDescVi}</label>
                    <textarea required rows={2} value={step.descVi} onChange={updateStep(index, 'descVi')}
                      className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-3 py-2 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-fwm-muted">{t.admin.stepDescEn}</label>
                    <textarea required rows={2} value={step.descEn} onChange={updateStep(index, 'descEn')}
                      className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-3 py-2 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-fwm-muted">{t.admin.stepKeyKind}</label>
                    <select value={step.keyKind} onChange={updateStep(index, 'keyKind')}
                      className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-3 py-2 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none">
                      {KEY_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-fwm-muted">{t.admin.stepKeyLabel}</label>
                    <div className="flex items-center gap-3">
                      <input required value={step.keyLabel} onChange={updateStep(index, 'keyLabel')}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-3 py-2 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none" />
                      {step.keyLabel && <GamepadKey kind={step.keyKind} label={step.keyLabel} />}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary">{t.admin.save}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>{t.admin.cancel}</Button>
      </div>
    </form>
  );
}

export default PostForm;
```

**Vì sao `steps` chỉ hiện khi `form.category === 'skill'`?** Khớp với model backend: field `steps` chỉ có ý nghĩa với bài kỹ năng — bài category khác gửi `steps: []`.

---

## Bước 6 — `components/admin/UsersPanel.jsx`

**Học được:** Bảng dữ liệu với search + filter + sort kết hợp trong 1 `useMemo` — pattern giống hệt sẽ dùng lại ở bảng Posts trong `Admin.jsx`.

**Làm:**
```jsx
import { useEffect, useMemo, useState } from 'react';
import { useLang } from '../../context/LangContext';
import { fetchUsers, updateUserRole, deleteUser } from '../../api/users';
import SortableHeader from './SortableHeader';

function UsersPanel({ token, currentUserId }) {
  const { t } = useLang();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sort, setSort] = useState({ key: null, dir: 'asc' });

  useEffect(() => {
    fetchUsers(token)
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const toggleSort = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));

  const visibleUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;
      return `${u.name} ${u.email}`.toLowerCase().includes(q);
    });
    if (sort.key) {
      list = [...list].sort((a, b) => {
        let av = a[sort.key];
        let bv = b[sort.key];
        if (sort.key === 'createdAt') {
          av = new Date(av).getTime();
          bv = new Date(bv).getTime();
          return sort.dir === 'asc' ? av - bv : bv - av;
        }
        const cmp = String(av).localeCompare(String(bv));
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [users, search, roleFilter, sort]);

  const handleRoleChange = async (id, role) => {
    try {
      const updated = await updateUserRole(id, role, token);
      setUsers((prev) => prev.map((u) => (u._id === id ? updated : u)));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteUser(id, token);
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-head text-2xl font-black text-fwm-text">{t.admin.usersHeading}</h1>
      </div>

      {error && <p className="mb-4 text-sm text-fwm-pink">{error}</p>}

      {loading ? (
        <p className="text-fwm-muted">…</p>
      ) : users.length === 0 ? (
        <p className="text-fwm-muted">{t.admin.usersEmpty}</p>
      ) : (
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.admin.searchUsers}
              className="flex-1 rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-sm text-fwm-text placeholder:text-fwm-muted focus:border-fwm-accent focus:outline-none"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none"
            >
              <option value="all">{t.admin.filterAllRoles}</option>
              <option value="user">{t.admin.roleUser}</option>
              <option value="admin">{t.admin.roleAdmin}</option>
            </select>
          </div>

          {visibleUsers.length === 0 ? (
            <p className="text-fwm-muted">{t.admin.noResults}</p>
          ) : (
            <div className="overflow-x-auto rounded-fwm-lg border border-fwm-line bg-fwm-card p-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-fwm-line text-left">
                    <SortableHeader label={t.admin.colName} sortKey="name" sort={sort} onSort={toggleSort} />
                    <SortableHeader label={t.admin.colEmail} sortKey="email" sort={sort} onSort={toggleSort} />
                    <SortableHeader label={t.admin.colRole} sortKey="role" sort={sort} onSort={toggleSort} />
                    <SortableHeader label={t.admin.colJoined} sortKey="createdAt" sort={sort} onSort={toggleSort} />
                    <th className="pb-2 text-right font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.colActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((u) => {
                    const isSelf = u._id === currentUserId;
                    return (
                      <tr key={u._id} className="border-b border-fwm-line last:border-0">
                        <td className="py-3 pr-4 font-head text-sm font-bold text-fwm-text">
                          {u.name} {isSelf && <span className="text-fwm-muted">{t.admin.youLabel}</span>}
                        </td>
                        <td className="py-3 pr-4 text-sm text-fwm-muted">{u.email}</td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-fwm-pill px-2.5 py-1 text-xs font-bold ${u.role === 'admin' ? 'bg-fwm-accent text-fwm-ink' : 'bg-fwm-pill text-fwm-muted'}`}>
                            {u.role === 'admin' ? t.admin.roleAdmin : t.admin.roleUser}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-sm text-fwm-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 text-right">
                          {!isSelf && (
                            <>
                              <button type="button" onClick={() => handleRoleChange(u._id, u.role === 'admin' ? 'user' : 'admin')}
                                className="mr-3 font-head text-xs font-bold text-fwm-accent hover:underline">
                                {u.role === 'admin' ? t.admin.makeUser : t.admin.makeAdmin}
                              </button>
                              <button type="button" onClick={() => handleDelete(u._id)} className="font-head text-xs font-bold text-fwm-pink hover:underline">
                                {t.admin.deleteUser}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UsersPanel;
```

**Vì sao ẩn nút hành động khi `isSelf`?** Tự bảo vệ khỏi tự khoá quyền admin của chính mình hoặc tự xoá tài khoản đang dùng — kiểm tra hoàn toàn ở client, backend hiện không tự chặn trường hợp này nên UI phải gánh trách nhiệm.

---

## Bước 7 — `pages/Admin.jsx`: ráp tất cả

**Học được:** 1 trang lớn quản lý nhiều "view" nội bộ (`list`/`new`/`edit` cho posts, `posts`/`users` cho section) bằng vài biến state đơn giản thay vì thêm route con.

**Làm:**
```jsx
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
    setLoading(true);
    fetchPosts()
      .then(setPosts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const handleEdit = (id) => { setEditingId(id); setView('edit'); };

  const handleDelete = async (id) => {
    try {
      await deletePost(id, token);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      refetchPublicPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleNew = () => { setEditingId(null); setView('new'); };
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
    };

    try {
      if (view === 'edit' && editingId) {
        const updated = await updatePost(editingId, payload, token);
        setPosts((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      } else {
        const created = await createPost({ ...payload, gradient: category?.gradient }, token);
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
        <h1 className="font-head text-2xl font-black text-fwm-text">{t.admin.heading}</h1>
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
            <button type="button" onClick={() => setSection('posts')}
              className={`block w-full rounded-fwm px-3 py-2.5 text-left font-head text-sm font-bold ${section === 'posts' ? 'bg-fwm-accent text-fwm-ink' : 'text-fwm-text hover:bg-fwm-pill'}`}>
              {t.admin.navPosts}
            </button>
            <button type="button" onClick={() => setSection('users')}
              className={`block w-full rounded-fwm px-3 py-2.5 text-left font-head text-sm font-bold ${section === 'users' ? 'bg-fwm-accent text-fwm-ink' : 'text-fwm-text hover:bg-fwm-pill'}`}>
              {t.admin.navUsers}
            </button>
          </nav>
          <div className="mt-6 rounded-fwm-lg border border-fwm-line bg-fwm-card p-4">
            <div className="font-head text-2xl font-extrabold text-fwm-text">{posts.length}</div>
            <div className="mt-1 text-xs text-fwm-muted">{t.admin.totalArticles}</div>
          </div>
          <div className="mt-4 text-xs text-fwm-muted">
            {user?.email}
            <button type="button" onClick={logout} className="mt-2 block font-head text-xs font-bold text-fwm-pink hover:underline">Đăng xuất</button>
          </div>
        </aside>

        <div>
          {section === 'users' ? (
            <UsersPanel token={token} currentUserId={user?._id} />
          ) : (
            <>
              <div className="mb-5 flex items-center justify-between">
                <h1 className="font-head text-2xl font-black text-fwm-text">
                  {view === 'list' ? t.admin.heading : view === 'new' ? t.admin.newPostTitle : t.admin.editPostTitle}
                </h1>
                {view === 'list' && <Button variant="primary" onClick={handleNew}>{t.admin.addNew}</Button>}
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
                        {CATEGORIES.map((cat) => <option key={cat.id} value={cat.id}>{t.categories[cat.id].label}</option>)}
                      </select>
                    </div>

                    {visiblePosts.length === 0 ? (
                      <p className="text-fwm-muted">{t.admin.noResults}</p>
                    ) : (
                      <div className="overflow-x-auto rounded-fwm-lg border border-fwm-line bg-fwm-card p-4">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-fwm-line text-left">
                              <SortableHeader label={t.admin.colTitle} sortKey="title" sort={postSort} onSort={togglePostSort} />
                              <SortableHeader label={t.admin.colCategory} sortKey="category" sort={postSort} onSort={togglePostSort} />
                              <th className="pb-2 text-right font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.colActions}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visiblePosts.map((post) => (
                              <AdminTableRow key={post.id} post={post} onEdit={handleEdit} onDelete={handleDelete} />
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
```

**Vì sao `Admin.jsx` tự fetch `posts` riêng thay vì dùng `usePosts()`?** `usePosts()` (Module 3) chỉ fetch bài công khai qua endpoint public. Ở đây dùng thẳng `fetchPosts` từ `api/posts.js` để có state `posts` cục bộ, dễ cập nhật lạc quan sau create/update/delete mà không ảnh hưởng danh sách công khai — rồi mới gọi `refetchPublicPosts()` để đồng bộ lại cho phần Home/Category.

**Bổ sung `dict.js` mục `admin`** (cả `vi` và `en`):
```js
// vi
admin: {
  heading: 'Quản trị nội dung', addNew: 'Thêm bài viết',
  colTitle: 'Tiêu đề', colCategory: 'Chuyên mục', colActions: 'Hành động',
  edit: 'Sửa', delete: 'Xóa', cancel: 'Hủy', save: 'Lưu',
  formTitleVi: 'Tiêu đề (VI)', formTitleEn: 'Tiêu đề (EN)',
  formExcerptVi: 'Mô tả ngắn (VI)', formExcerptEn: 'Mô tả ngắn (EN)',
  formIntroVi: 'Đoạn mở đầu (VI)', formIntroEn: 'Đoạn mở đầu (EN)',
  formBodyVi: 'Nội dung chính (VI)', formBodyEn: 'Nội dung chính (EN)',
  formQuoteVi: 'Câu trích dẫn (VI)', formQuoteEn: 'Câu trích dẫn (EN)',
  formMistakeVi: 'Lỗi cần tránh (VI)', formMistakeEn: 'Lỗi cần tránh (EN)',
  formCategory: 'Chuyên mục',
  stepsHeading: 'Các bước hướng dẫn', stepsHint: 'Chỉ áp dụng cho bài thuộc chuyên mục Kỹ năng.',
  addStep: 'Thêm bước', removeStep: 'Xóa bước', stepN: 'Bước',
  stepTitleVi: 'Tiêu đề bước (VI)', stepTitleEn: 'Tiêu đề bước (EN)',
  stepDescVi: 'Mô tả bước (VI)', stepDescEn: 'Mô tả bước (EN)',
  stepKeyKind: 'Loại nút', stepKeyLabel: 'Nhãn nút',
  newPostTitle: 'Bài viết mới', editPostTitle: 'Sửa bài viết', empty: 'Chưa có bài viết nào.',
  totalArticles: 'Tổng bài viết', searchPosts: 'Tìm theo tiêu đề...', searchUsers: 'Tìm theo tên hoặc email...',
  filterAllCategories: 'Tất cả chuyên mục', filterAllRoles: 'Tất cả quyền', noResults: 'Không tìm thấy kết quả phù hợp.',
  navPosts: 'Bài viết', navUsers: 'Người dùng', usersHeading: 'Quản lý người dùng', totalUsers: 'Tổng người dùng',
  colName: 'Tên', colEmail: 'Email', colRole: 'Quyền', colJoined: 'Ngày tham gia',
  roleUser: 'Người dùng', roleAdmin: 'Quản trị', makeAdmin: 'Cấp quyền Admin', makeUser: 'Hạ về User',
  deleteUser: 'Xóa tài khoản', usersEmpty: 'Chưa có người dùng nào.', youLabel: '(bạn)',
},
// en
admin: {
  heading: 'Content admin', addNew: 'Add article',
  colTitle: 'Title', colCategory: 'Category', colActions: 'Actions',
  edit: 'Edit', delete: 'Delete', cancel: 'Cancel', save: 'Save',
  formTitleVi: 'Title (VI)', formTitleEn: 'Title (EN)',
  formExcerptVi: 'Excerpt (VI)', formExcerptEn: 'Excerpt (EN)',
  formIntroVi: 'Intro paragraph (VI)', formIntroEn: 'Intro paragraph (EN)',
  formBodyVi: 'Body content (VI)', formBodyEn: 'Body content (EN)',
  formQuoteVi: 'Quote (VI)', formQuoteEn: 'Quote (EN)',
  formMistakeVi: 'Mistake to avoid (VI)', formMistakeEn: 'Mistake to avoid (EN)',
  formCategory: 'Category',
  stepsHeading: 'Step-by-step guide', stepsHint: 'Only applies to articles in the Skill category.',
  addStep: 'Add step', removeStep: 'Remove step', stepN: 'Step',
  stepTitleVi: 'Step title (VI)', stepTitleEn: 'Step title (EN)',
  stepDescVi: 'Step description (VI)', stepDescEn: 'Step description (EN)',
  stepKeyKind: 'Key type', stepKeyLabel: 'Key label',
  newPostTitle: 'New article', editPostTitle: 'Edit article', empty: 'No articles yet.',
  totalArticles: 'Total articles', searchPosts: 'Search by title...', searchUsers: 'Search by name or email...',
  filterAllCategories: 'All categories', filterAllRoles: 'All roles', noResults: 'No matching results.',
  navPosts: 'Articles', navUsers: 'Users', usersHeading: 'User management', totalUsers: 'Total users',
  colName: 'Name', colEmail: 'Email', colRole: 'Role', colJoined: 'Joined',
  roleUser: 'User', roleAdmin: 'Admin', makeAdmin: 'Make admin', makeUser: 'Demote to user',
  deleteUser: 'Delete account', usersEmpty: 'No users yet.', youLabel: '(you)',
},
```

---

## Ráp nối `App.jsx`

```jsx
import Admin from './pages/Admin';
// ...
<Route path="/admin" element={<Admin />} />
```

**Input/output cần đạt:**
```
Chưa đăng nhập admin → vào /admin → thấy "Bạn cần đăng nhập với quyền quản trị" + nút tới /admin/login
Đăng nhập admin → /admin → thấy sidebar (Bài viết/Người dùng), bảng bài viết
Bấm "Thêm bài viết" → điền form đủ field → Lưu → bài mới xuất hiện đầu bảng, Home/Category cũng thấy bài mới (nhờ refetchPublicPosts)
Sửa 1 bài → form điền sẵn dữ liệu cũ → đổi field → Lưu → bảng cập nhật đúng dòng đó
Xoá 1 bài → biến khỏi bảng và khỏi Home/Category
Chuyển sang "Người dùng" → thấy bảng user, search/filter/sort hoạt động, không thấy nút hành động ở dòng chính mình
```

---

## Xong module này, bạn có

- Toàn bộ CMS nội bộ: CRUD bài viết + quản lý user, đầy đủ như bản gốc.

Tiếp theo: `REBUILD_06_STATIC_PAGES.md` (module cuối, đơn giản nhất).
