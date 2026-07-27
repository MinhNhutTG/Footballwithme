import { useEffect, useMemo, useRef, useState, useCallback, useReducer } from "react";
import Avatar from "../components/ui/Avatar"
import Button from "../components/ui/Button"
import { useNavigate } from 'react-router-dom'
import { updateMe } from '../api/users'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { uploadFile } from "../api/upload";

function profileReducer(state, action) {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.value, error: '', success: false };
        case 'SET_PREVIEW':
            return { ...state, preview: action.value };
        case 'SUBMIT_START':
            return { ...state, loading: true, error: '', success: false };
        case 'SUBMIT_OK':
            return { ...state, loading: false, success: true };
        case 'SUBMIT_ERROR':
            return { ...state, loading: false, error: action.error };
        case 'SET_AVATAR_URL':
            return {...state, avatarUrl: action.value};
        default: return state;
    }
}


function Profile() {
    const { user, token, updateUser } = useAuth();
    const { t } = useLang();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [state, dispatch] = useReducer(profileReducer, {
        name: user?.name || '',
        bio: user?.bio || '',
        avatarUrl: user?.avatarUrl || '',
        preview: user?.avatarUrl || '',
        loading: false,
        error: '',
        success: false
    });


    useEffect(() => {
        if (!user) navigate('/dang-nhap', { replace: true });
    }, [user, navigate])

    const initials = useMemo(() => {
        return state.name.trim().split(' ').map((w) => (w[0])).join('').toUpperCase().slice(0, 2) || '?';
    }, [state.name])

    const hasChanged = useMemo(() =>
        state.name.trim() != user.name || 
        state.bio !== (user.bio || '' ) ||
        state.avatarUrl !== (user.avatarUrl || '')
        , [user, state.name, state.bio, state.avatarUrl]);

    const handleAvatarClick = useCallback(() => {
        fileInputRef.current.click();
    }, [])

    const handleFileChange = useCallback((e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => { dispatch({ type: 'SET_PREVIEW', value: ev.target.result }) };
        reader.readAsDataURL(file);
        uploadFile(file, token)
            .then((res)=> dispatch({type: 'SET_AVATAR_URL', value: res.url}))
            .catch((err)=> dispatch({type: 'SUBMIT_ERROR', error: err.message}));
    }, [token])

    const handleSubmit = useCallback(async () => {
        if (state.name.trim() === '') {
            dispatch({ type: 'SUBMIT_ERROR', error: t.profile.errorName });
            return;
        }
        dispatch({ type: 'SUBMIT_START' })
        try {
            await updateMe({ name: state.name.trim(), bio: state.bio , avatarUrl: state.avatarUrl}, token);
            updateUser({ name: state.name, bio: state.bio , avatarUrl: state.avatarUrl});
            dispatch({ type: 'SUBMIT_OK' })
        }
        catch (err) {
            dispatch({ type: 'SUBMIT_ERROR', error: err.message || t.profile.errorSave });
        }
    }, [state.name, state.bio, token, updateUser, t, state.avatarUrl]);


    if (!user) return null;
    return (
        <>
            <section className="mx-auto max-w-2xl px-4 py-12">
                <h1 className="font-head text-2xl font-black text-fwm-text">{t.profile.heading}</h1>

                <div className="mb-8 mt-6 flex flex-col items-center gap-2">
                    <Avatar initials={initials} size="lg" onClick={handleAvatarClick} preview={state.preview} hint={t.profile.avatarHint} />
                    {user.createdAt && (
                        <p className="text-xs text-fwm-muted">
                            {t.profile.memberSince} {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                    )}
                </div>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" ></input>

                <div className="mb-4">
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.profile.name}</label>
                    <input
                        placeholder={t.profile.name}
                        value={state.name}
                        onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'name', value: e.target.value })}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
                    />
                </div>
                <div className="mb-4">
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.profile.bio}</label>
                    <textarea
                        placeholder={t.profile.bioPlaceholder}
                        rows={4}
                        value={state.bio}
                        onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'bio', value: e.target.value })}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
                    />
                </div>

                <Button
                    onClick={handleSubmit}
                    disabled={!hasChanged || state.loading}
                    variant="primary"
                    className="w-full disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {state.loading ? t.profile.saving : t.profile.save}
                </Button>
                {state.error && <p className="mt-3 text-sm text-fwm-pink">{state.error}</p>}
                {state.success && <p className="mt-3 text-sm text-emerald-400">{t.profile.saved}</p>}
            </section>
        </>
    );
}

export default Profile;