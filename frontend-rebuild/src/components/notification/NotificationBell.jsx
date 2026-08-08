import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext';
import { useNotifications } from '../../hooks/useNotifications';
import IconButton from '../ui/IconButton';

function NotificationBell() {
    const { t } = useLang();
    const { notifications, unreadCount, openNotifications } = useNotifications();
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    async function handleToggle() {
        const next = !open;
        setOpen(next);
        if (next) {
            await openNotifications();
        }
    }

    return (
        <div className="relative hidden sm:block" ref={wrapperRef}>
            <IconButton label={t.notification.heading} onClick={handleToggle} className="relative">
                <i className="fa-solid fa-bell" aria-hidden="true"></i>
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-fwm-pink px-1 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </IconButton>

            {open && (
                <div className="absolute right-0 top-12 z-50 w-80 rounded-fwm-lg border border-fwm-line bg-fwm-card shadow-lg">
                    <div className="border-b border-fwm-line px-4 py-3">
                        <p className="font-head text-sm font-bold text-fwm-text">{t.notification.heading}</p>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <p className="px-4 py-6 text-center text-sm text-fwm-muted">{t.notification.empty}</p>
                        ) : (
                            notifications.map((n) => (
                                <Link
                                    key={n._id}
                                    to={n.link}
                                    onClick={() => setOpen(false)}
                                    className={`block border-b border-fwm-line px-4 py-3 text-sm transition last:border-0 hover:bg-fwm-pill ${n.isRead ? 'text-fwm-muted' : 'font-bold text-fwm-text'}`}
                                >
                                    {n.message}
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationBell;
