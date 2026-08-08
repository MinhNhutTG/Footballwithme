import { useState, useEffect, useMemo } from 'react'
import { updateSettings } from '../../api/settings'
import { uploadFile } from '../../api/upload'
import { useSettings } from '../../context/SettingsContext'
import Button from '../ui/Button'
import { checkLength } from '../../utils/seoChecks'
import SeoChecklist from './SeoChecklist'

const EMPTY_FORM = {
    siteName: '', descriptionVi: '', descriptionEn: '', logoUrl: '', socialLinks: [],
    seoDescriptionVi: '', seoDescriptionEn: '',
};

function toFormValues(settings) {
    return {
        siteName: settings.siteName || '',
        descriptionVi: settings.description?.vi || '',
        descriptionEn: settings.description?.en || '',
        logoUrl: settings.logoUrl || '',
        socialLinks: settings.socialLinks || [],
        seoDescriptionVi: settings.seo?.metaDescription?.vi || '',
        seoDescriptionEn: settings.seo?.metaDescription?.en || '',
    };
}

function SettingsPanel({ token }) {
    const { settings, loading, refetch } = useSettings();
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (settings) setForm(toFormValues(settings));
    }, [settings]);

    const seoItems = useMemo(() => [
        { label: 'Tên site', ...checkLength(form.siteName, 10, 60) },
        { label: 'Mô tả SEO (VI)', ...checkLength(form.seoDescriptionVi, 120, 160) },
        { label: 'Mô tả SEO (EN)', ...checkLength(form.seoDescriptionEn, 120, 160) },
    ], [form.siteName, form.seoDescriptionVi, form.seoDescriptionEn]);

    const handleChange = (field) => (e) => { setSaved(false); setForm((f) => ({ ...f, [field]: e.target.value })); };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setError('');
        setSaved(false);
        setUploading(true);
        uploadFile(file, token)
            .then((res) => setForm((f) => ({ ...f, logoUrl: res.url })))
            .catch((err) => setError(err.message))
            .finally(() => setUploading(false));
    };

    const addSocialLink = () => { setSaved(false); setForm((f) => ({ ...f, socialLinks: [...f.socialLinks, { label: '', url: '' }] })); };
    const removeSocialLink = (index) => { setSaved(false); setForm((f) => ({ ...f, socialLinks: f.socialLinks.filter((_, i) => i !== index) })); };
    const updateSocialLink = (index, field) => (e) => {
        setSaved(false);
        setForm((f) => ({
            ...f,
            socialLinks: f.socialLinks.map((link, i) => (i === index ? { ...link, [field]: e.target.value } : link)),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const payload = {
            siteName: form.siteName,
            description: { vi: form.descriptionVi, en: form.descriptionEn },
            logoUrl: form.logoUrl,
            socialLinks: form.socialLinks,
            seo: { metaDescription: { vi: form.seoDescriptionVi, en: form.seoDescriptionEn } },
        };
        try {
            await updateSettings(payload, token);
            await refetch();
            setSaved(true);
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) return null;

    return (
        <div>
            <h1 className="mb-5 font-head text-2xl font-black text-fwm-text">Cài đặt Website</h1>

            {error && <p className="mb-4 text-sm text-fwm-pink">{error}</p>}
            {saved && <p className="mb-4 text-sm text-fwm-accent">Đã lưu.</p>}

            <form onSubmit={handleSubmit} className="space-y-4 rounded-fwm-lg border border-fwm-line bg-fwm-card p-5">
                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Tên site</label>
                    <input required value={form.siteName} onChange={handleChange('siteName')}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Mô tả (VI)</label>
                        <textarea rows={2} value={form.descriptionVi} onChange={handleChange('descriptionVi')}
                            className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                    </div>
                    <div>
                        <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Mô tả (EN)</label>
                        <textarea rows={2} value={form.descriptionEn} onChange={handleChange('descriptionEn')}
                            className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                    </div>
                </div>

                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Logo</label>
                    <input type="file" accept="image/*" onChange={handleFileUpload}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-sm text-fwm-text" />
                    {form.logoUrl && (
                        <div className="mt-2 flex items-center gap-3">
                            <img src={form.logoUrl} alt="" className="h-16 w-16 rounded-fwm object-cover" />
                            <button type="button" onClick={() => { setSaved(false); setForm((f) => ({ ...f, logoUrl: '' })); }}
                                className="font-head text-xs font-bold text-fwm-pink hover:underline">
                                Xoá logo
                            </button>
                        </div>
                    )}
                    <p className="mt-1 text-xs text-fwm-muted">Chưa upload thì Header/Footer tự hiện logo chữ mặc định.</p>
                </div>

                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Mô tả SEO (VI)</label>
                    <textarea rows={2} maxLength={160} value={form.seoDescriptionVi} onChange={handleChange('seoDescriptionVi')}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                </div>
                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Mô tả SEO (EN)</label>
                    <textarea rows={2} maxLength={160} value={form.seoDescriptionEn} onChange={handleChange('seoDescriptionEn')}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                </div>
                <p className="text-xs text-fwm-muted">Hiện trên kết quả tìm kiếm Google cho các trang không có mô tả riêng (Trang chủ, Giới thiệu, Liên hệ...). Nên viết dưới 160 ký tự.</p>

                <SeoChecklist items={seoItems} />

                <div>
                    <div className="mb-1 flex items-center justify-between">
                        <label className="block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Link mạng xã hội</label>
                        <Button type="button" variant="ghost" onClick={addSocialLink}>Thêm link</Button>
                    </div>
                    <div className="space-y-3">
                        {form.socialLinks.map((link, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input placeholder="Nhãn (vd: Facebook)" value={link.label} onChange={updateSocialLink(index, 'label')}
                                    className="w-40 rounded-fwm border border-fwm-line bg-fwm-card-2 px-3 py-2 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none" />
                                <input placeholder="https://..." value={link.url} onChange={updateSocialLink(index, 'url')}
                                    className="flex-1 rounded-fwm border border-fwm-line bg-fwm-card-2 px-3 py-2 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none" />
                                <button type="button" onClick={() => removeSocialLink(index)} className="font-head text-xs font-bold text-fwm-pink hover:underline">
                                    Xoá
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button type="submit" variant="primary" disabled={uploading}>{uploading ? 'Đang tải ảnh lên...' : 'Lưu'}</Button>
                </div>
            </form>
        </div>
    );
}

export default SettingsPanel;
