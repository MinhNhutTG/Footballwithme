import { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext';

function UserMenu({ user, isAdmin, onLogout }) {
    const { t } = useLang();
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);

    const initials = useMemo(() => {
        return user.name.trim().split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
    }, [user.name]);

    useEffect(() => {
        function handleClickOutside(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative hidden sm:block" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-label={user.name}
                title={user.name}
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-fwm-accent font-head text-sm font-black text-fwm-ink"
            >
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
            </button>

            {open && (
                <div className="absolute right-0 top-12 z-50 w-48 rounded-fwm-lg border border-fwm-line bg-fwm-card py-1.5 shadow-lg">
                    <Link to="/ho-so" onClick={() => setOpen(false)} className="block truncate px-4 py-2 text-sm font-bold text-fwm-text hover:bg-fwm-pill">
                        {user.name}
                    </Link>
                    {isAdmin && (
                        <Link to="/admin" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-fwm-muted hover:bg-fwm-pill hover:text-fwm-text">
                            {t.nav.admin}
                        </Link>
                    )}
                    <button type="button" onClick={() => { setOpen(false); onLogout(); }} className="block w-full px-4 py-2 text-left text-sm text-fwm-pink hover:bg-fwm-pill">
                        {t.nav.logout}
                    </button>
                </div>
            )}
        </div>
    );
}

export default UserMenu;
