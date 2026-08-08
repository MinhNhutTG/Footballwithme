import { useState, useEffect } from 'react';
import { useLang } from '../../context/LangContext';
import Button from '../ui/Button';
import RichTextEditor from './RichTextEditor';
import GamepadKey from '../skill/GamepadKey';
import { uploadFile } from '../../api/upload';


const EMPTY_FORM = {
  titleVi: '', titleEn: '', excerptVi: '', excerptEn: '',
  introVi: '', introEn: '', bodyVi: '', bodyEn: '',
  quoteVi: '', quoteEn: '', mistakeVi: '', mistakeEn: '',
  category: '', steps: [],
  coverImageUrl: '',
  videoUrl: '',
};

const EMPTY_STEP = { titleVi: '', titleEn: '', descVi: '', descEn: '', keyKind: 'default', keyLabel: '' };

const KEY_KINDS = [
  { value: 'default', label: 'Chữ / nhãn thường' },
  { value: 'cir', label: 'Tròn (đỏ)' },
  { value: 'sq', label: 'Vuông (hồng)' },
  { value: 'tri', label: 'Tam giác (xanh lá)' },
  { value: 'cross', label: 'Chéo (xanh dương)' },
];

function PostForm({ initial, categories, onSubmit, onCancel, token }) {
  const { t } = useLang();
  const [form, setForm] = useState({ ...EMPTY_FORM, category: categories[0]?.slug || '', ...initial });
  const [fileError, setFileError] = useState('');
  const [uploading, setUploading] = useState(false);

  // categories có thể vẫn đang fetch lúc form mount (form.category rỗng) — tự
  // điền category đầu tiên ngay khi categories về, tránh submit "category: ''"
  // dù dropdown nhìn như đã chọn sẵn 1 mục.
  useEffect(() => {
    if (!form.category && categories.length > 0) {
      setForm((f) => ({ ...f, category: categories[0].slug }));
    }
  }, [categories]);

  const selectedCategory = categories.find((c) => c.slug === form.category);
  const showSteps = !!selectedCategory?.hasSteps;

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

  const handleFileUpload = (field) => (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileError('');
    setUploading(true);
    uploadFile(file, token)
      .then((res) => setForm((f) => ({ ...f, [field]: res.url })))
      .catch((err) => setFileError(err.message))
      .finally(() => setUploading(false));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-fwm-lg border border-fwm-line bg-fwm-card p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{textField('formTitleVi', 'titleVi')}{textField('formTitleEn', 'titleEn')}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{textField('formExcerptVi', 'excerptVi', 'textarea')}{textField('formExcerptEn', 'excerptEn', 'textarea')}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{bodyField('formIntroVi', 'introVi')}{bodyField('formIntroEn', 'introEn')}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{bodyField('formBodyVi', 'bodyVi')}{bodyField('formBodyEn', 'bodyEn')}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{bodyField('formQuoteVi', 'quoteVi')}{bodyField('formQuoteEn', 'quoteEn')}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{bodyField('formMistakeVi', 'mistakeVi')}{bodyField('formMistakeEn', 'mistakeEn')}</div>

      <div>
        <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.formCategory}</label>
        <select
          value={form.category}
          onChange={handleChange('category')}
          className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-fwm-text focus:border-fwm-accent focus:outline-none"
        >
          {categories.map((cat) => <option key={cat._id} value={cat.slug}>{cat.label.vi}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Ảnh cover</label>
        <input type="file" accept="image/*" onChange={handleFileUpload('coverImageUrl')}
          className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-sm text-fwm-text" />
        {form.coverImageUrl && <img src={form.coverImageUrl} alt="" className="mt-2 h-32 w-full rounded-fwm object-cover" />}
      </div>

      {showSteps && (
        <div>
          <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Video hướng dẫn (tùy chọn)</label>
          <input type="file" accept="video/*" onChange={handleFileUpload('videoUrl')}
            className="w-full rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-sm text-fwm-text" />
          {form.videoUrl && <video src={form.videoUrl} controls className="mt-2 h-32 w-full rounded-fwm object-cover" />}
        </div>
      )}

      {fileError && <p className="text-sm text-fwm-pink">{fileError}</p>}

      {showSteps && (
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
        <Button type="submit" variant="primary" disabled={uploading}>{uploading ? 'Đang tải file lên...' : t.admin.save}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>{t.admin.cancel}</Button>
      </div>
    </form>
  );
}

export default PostForm;