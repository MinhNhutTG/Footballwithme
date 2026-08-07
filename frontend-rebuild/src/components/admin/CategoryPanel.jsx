import { useState } from 'react'
import { createCategory, updateCategory, deleteCategory } from '../../api/categories'
import { uploadFile } from '../../api/upload'
import { useLang } from '../../context/LangContext'
import { useCategories } from '../../context/CategoryContext'
import Button from '../ui/Button'

const EMPTY_FORM = {
    slug: '', labelVi: '', labelEn: '', descVi: '', descEn: '',
    gradient: 'from-fwm-card to-fwm-card-2', imageUrl: '', hasSteps: false,
};

function toFormValues(cat) {
    return {
        slug: cat.slug,
        labelVi: cat.label.vi, labelEn: cat.label.en,
        descVi: cat.desc?.vi || '', descEn: cat.desc?.en || '',
        gradient: cat.gradient, imageUrl: cat.imageUrl || '', hasSteps: cat.hasSteps,
    };
}

function CategoryPanel({ token }) {
    const { t } = useLang();
    const { categories, refetch } = useCategories();
    const [view, setView] = useState('list');
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);

    const handleChange = (field) => (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm((f) => ({ ...f, [field]: value }));
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setError('');
        setUploading(true);
        uploadFile(file, token)
            .then((res) => setForm((f) => ({ ...f, imageUrl: res.url })))
            .catch((err) => setError(err.message))
            .finally(() => setUploading(false));
    };

    const handleNew = () => { setForm(EMPTY_FORM); setEditingId(null); setError(''); setView('form'); };
    const handleEdit = (cat) => { setForm(toFormValues(cat)); setEditingId(cat._id); setError(''); setView('form'); };
    const handleCancel = () => { setView('list'); setEditingId(null); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            slug: form.slug,
            label: { vi: form.labelVi, en: form.labelEn },
            desc: { vi: form.descVi, en: form.descEn },
            gradient: form.gradient,
            imageUrl: form.imageUrl,
            hasSteps: form.hasSteps,
        };
        try {
            if (editingId) {
                await updateCategory(editingId, payload, token);
            } else {
                await createCategory(payload, token);
            }
            await refetch();
            setView('list');
            setEditingId(null);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        setError('');
        try {
            await deleteCategory(id, token);
            await refetch();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div>
            <div className="mb-5 flex items-center justify-between">
                <h1 className="font-head text-2xl font-black text-fwm-text">
                    {view === 'list' ? t.admin.categoriesHeading : editingId ? t.admin.editCategory : t.admin.addCategory}
                </h1>
                {view === 'list' && (
                    <Button variant="primary" onClick={handleNew}>{t.admin.addCategory}</Button>
                )}
            </div>

            {error && <p className="mb-4 text-sm text-fwm-pink">{error}</p>}

            {view === 'form' ? (
                <form onSubmit={handleSubmit} className="space-y-4 rounded-fwm-lg border border-fwm-line bg-fwm-card p-5">
                    <div>
                        <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.formSlug}</label>
                        <input
                            required
                            disabled={!!editingId}
                            value={form.slug}
                            onChange={handleChange('slug')}
                            pattern="[a-z0-9-]+"
                            className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none disabled:opacity-50"
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.formLabelVi}</label>
                            <input required value={form.labelVi} onChange={handleChange('labelVi')}
                                className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                        </div>
                        <div>
                            <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.formLabelEn}</label>
                            <input required value={form.labelEn} onChange={handleChange('labelEn')}
                                className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.formDescVi}</label>
                            <textarea rows={2} value={form.descVi} onChange={handleChange('descVi')}
                                className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                        </div>
                        <div>
                            <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.formDescEn}</label>
                            <textarea rows={2} value={form.descEn} onChange={handleChange('descEn')}
                                className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.formImage}</label>
                        <input type="file" accept="image/*" onChange={handleFileUpload}
                            className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-sm text-fwm-text" />
                        {form.imageUrl && <img src={form.imageUrl} alt="" className="mt-2 h-32 w-full rounded-fwm object-cover" />}
                    </div>
                    <div>
                        <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.formGradient}</label>
                        <input required value={form.gradient} onChange={handleChange('gradient')}
                            className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                        {!form.imageUrl && <div className={`mt-2 h-10 w-full rounded-fwm bg-gradient-to-br ${form.gradient}`} />}
                    </div>
                    <label className="flex items-center gap-2 text-sm text-fwm-text">
                        <input type="checkbox" checked={form.hasSteps} onChange={handleChange('hasSteps')} />
                        {t.admin.formHasSteps}
                    </label>

                    <div className="flex gap-3 pt-2">
                        <Button type="submit" variant="primary" disabled={uploading}>{uploading ? 'Đang tải ảnh lên...' : t.admin.save}</Button>
                        <Button type="button" variant="ghost" onClick={handleCancel}>{t.admin.cancel}</Button>
                    </div>
                </form>
            ) : categories.length === 0 ? (
                <p className="text-fwm-muted">{t.admin.categoriesEmpty}</p>
            ) : (
                <div className="overflow-x-auto rounded-fwm-lg border border-fwm-line bg-fwm-card p-4">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-fwm-line text-left">
                                <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.colSlug}</th>
                                <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.colLabel}</th>
                                <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.colHasSteps}</th>
                                <th className="pb-2 text-right font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.colActions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((cat) => (
                                <tr key={cat._id} className="border-b border-fwm-line last:border-0">
                                    <td className="py-3 pr-4 text-sm text-fwm-muted">{cat.slug}</td>
                                    <td className="py-3 pr-4">
                                        {cat.imageUrl ? (
                                            <img src={cat.imageUrl} alt="" className="mr-2 inline-block h-4 w-6 rounded-fwm-sm object-cover align-middle" />
                                        ) : (
                                            <span className={`mr-2 inline-block h-4 w-6 rounded-fwm-sm bg-gradient-to-br ${cat.gradient} align-middle`} />
                                        )}
                                        <span className="font-head text-sm font-bold text-fwm-text">{cat.label.vi}</span>
                                    </td>
                                    <td className="py-3 pr-4 text-sm text-fwm-muted">{cat.hasSteps ? t.admin.yes : t.admin.no}</td>
                                    <td className="py-3 text-right">
                                        <button type="button" onClick={() => handleEdit(cat)} className="mr-3 font-head text-xs font-bold text-fwm-accent hover:underline">{t.admin.edit}</button>
                                        <button type="button" onClick={() => handleDelete(cat._id)} className="font-head text-xs font-bold text-fwm-pink hover:underline">{t.admin.delete}</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default CategoryPanel;
