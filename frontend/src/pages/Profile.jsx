import { useEffect, useMemo, useRef, useReducer, useCallback } from 'react';
import { useAuth } from '../context/AuthContext'
import { useNavigate } from "react-router-dom";
import { useLang } from '../context/LangContext';
import Avatar from "../components/ui/Avatar";

import { updateMe } from '../api/users';

const initialState = (user) => ({
  name: user?.name || '',
  bio: user?.bio || '',
  preview: null,
  saving: false,
  error: '',
  success: false,
});

function reducer(state, action) {
  switch (action.type) {
    case 'SET_NAME': return { ...state, name: action.payload, error: '', success: false };
    case 'SET_BIO': return { ...state, bio: action.payload, error: '', success: false };
    case 'SET_PREVIEW': return { ...state, preview: action.payload };
    case 'SUBMIT_START': return { ...state, saving: true, error: '', success: false };
    case 'SUBMIT_OK': return { ...state, saving: false, success: true };
    case 'SUBMIT_ERROR': return { ...state, saving: false, error: action.payload };
    default: return state;
  }
}

function Profile() {
  const navigate = useNavigate();
  const { user, token, updateUser } = useAuth();
  const { t } = useLang();

  const [state, dispatch] = useReducer(reducer, user, initialState);
  const { name, bio, preview, saving, error, success } = state;

  useEffect(() => {
    if (!user) {
      navigate('/dang-nhap', { replace: true });
    }
  }, [user, navigate])

  const hasChange = useMemo(() => {
    return name !== user?.name || bio !== (user?.bio || '');
  }, [name, bio, user])
  const fileInputRef = useRef(null);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { dispatch({ type: 'SET_PREVIEW', payload: ev.target.result }) };
    reader.readAsDataURL(file);
  }, [])

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current.click();
  }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      dispatch({ type: 'SUBMIT_ERROR', payload: t.profile.errorName });
      return;
    }
    dispatch({ type: 'SUBMIT_START' });
    try {
      await updateMe({ name, bio }, token);
      updateUser({ name, bio });
      dispatch({ type: 'SUBMIT_OK' });
    } catch (err) {
      dispatch({ type: 'SUBMIT_ERROR', payload: err.message || t.profile.errorSave });
    }
  }, [name, bio, token, updateUser, t])

  const initials = useMemo(() => {
    return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  }, [name])


  if (!user) return null;


  return (
    <section className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-head text-3xl font-black text-fwm-text">{t.profile.heading}</h1>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <Avatar initials={initials} preview={preview} onClick={handleAvatarClick} hint={t.profile.avatarHint} />
        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />

        <div>
          <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">
            {t.profile.name}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => dispatch({ type: 'SET_NAME', payload: e.target.value })}
            className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">
            {t.profile.bio}
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => dispatch({ type: 'SET_BIO', payload: e.target.value })}
            placeholder={t.profile.bioPlaceholder}
            className="w-full resize-none rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text placeholder:text-fwm-muted focus:border-fwm-accent focus:outline-none"
          />
        </div>

        {error && (
          <p className="rounded-fwm bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">{error}</p>
        )}
        {success && (
          <p className="rounded-fwm bg-green-500/10 px-4 py-3 text-sm font-bold text-green-600">{t.profile.saved}</p>
        )}

        <button
          type="submit"
          disabled={!hasChange || saving}
          className="w-full rounded-fwm-pill bg-fwm-accent px-5 py-3 font-head text-sm font-bold text-fwm-ink shadow-fwm transition hover:brightness-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? t.profile.saving : t.profile.save}
        </button>
      </form>

      <div className="mt-8 rounded-fwm-lg border border-fwm-line bg-fwm-card p-4 text-sm text-fwm-muted">
        <p><span className="font-bold text-fwm-text">{t.profile.email}</span> {user.email}</p>
        <p className="mt-1"><span className="font-bold text-fwm-text">{t.profile.memberSince}</span> {new Date(user.createdAt).toLocaleDateString('vi-VN')}</p>
      </div>
    </section>
  );
}

export default Profile;
