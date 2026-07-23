import { useState } from "react";
import { useLang } from '../../context/LangContext'
import { useTheme } from '../../context/ThemeContext'
import { NavLink, Link } from "react-router-dom";
import  IconButton  from '../ui/IconButton'
import  Button  from '../ui/Button'
import MobileMenu from '../layout/MobileMenu'
import { useNavigate } from 'react-router-dom'
import {useAuth} from '../../context/AuthContext'
function SiteHeader() {
    const{user, isAdmin, logout} = useAuth();
    const { lang, toggleLang, t } = useLang();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const navItems = [
        { to: '/', label: t.nav.home },
        { to: '/chuyen-muc', label: t.nav.category },
        { to: '/gioi-thieu', label: t.nav.about },
        { to: '/lien-he', label: t.nav.contact }
    ]

    const mobileOnlyItems = [
        { to: '/tim-kiem', label: t.nav.search },
        { to: '/yeu-thich', label: t.nav.favorites },
        ...(isAdmin ? [{ to: '/admin', label: t.nav.admin }] : []),
        ...(user ? [] : [
            { to: '/dang-nhap', label: t.nav.login },
            { to: '/dang-ky', label: t.nav.register },
        ]),
    ];

    const handleLogout = () => { logout(); navigate('/'); };

    return (
        <header className="sticky top-0 z-40 border-b border-fwm-line bg-fwm-bg-deep/95 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
                <Link to="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-fwm bg-fwm-accent font-head text-base font-black text-fwm-ink">eF</span>
                    <span className="font-head text-lg font-extrabold text-fwm-text">FootballWithMe</span>
                </Link>
                <nav className="hidden items-center gap-1 lg:flex">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `rounded-fwm-pill px-3.5 py-2 font-head text-sm font-bold transition
                                ${isActive ? 'bg-fwm-pill text-fwm-accent' : 'text-fwm-muted hover:text-fwm-text'}`}>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="flex items-center gap-2">
                    <Link to='/tim-kiem' aria-label={t.nav.search} title={t.nav.search}
                        className="hidden h-10 w-10 items-center justify-center rounded-full border border-fwm-line bg-fwm-pill text-fwm-text transition hover:bg-fwm-card sm:inline-flex"
                    >
                        🔍
                    </Link>
                    <Link to='/yeu-thich' aria-label={t.nav.favorites} title={t.nav.favorites}
                        className="hidden h-10 w-10 items-center justify-center rounded-full border border-fwm-line bg-fwm-pill text-fwm-text transition hover:bg-fwm-card sm:inline-flex"
                    >
                        ♥
                    </Link>
                    <IconButton label="VN|EN" onClick={toggleLang} className="hidden text-xs sm:inline-flex" >
                        {lang === 'vi' ? 'VI' : 'EN'}
                    </IconButton>
                    <IconButton label="theme" onClick={toggleTheme} className="hidden sm:inline-flex">
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </IconButton>
                    {user ? (
                        <div className="hidden items-center gap-2 sm:flex">
                            {isAdmin && <Button to="/admin" variant="ghost">{t.nav.admin}</Button>}
                            <Button to="/ho-so" variant="ghost">{user.name}</Button>
                            <Button variant="primary" onClick={handleLogout}>{t.nav.logout}</Button>
                        </div>
                    ) : (
                        <div className="hidden items-center gap-2 sm:flex">
                            <Button to="/dang-nhap" variant="ghost">{t.nav.login}</Button>
                            <Button to="/dang-ky" variant="primary">{t.nav.register}</Button>
                        </div>
                    )}
                    <button type="button" aria-label="menu" onClick={() => setMenuOpen((o) => !o)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-fwm border border-fwm-line text-fwm-text lg:hidden">
                        {menuOpen ? '✕' : '☰'}
                    </button>
                </div>
            </div>
            <MobileMenu
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                navItems={[...navItems, ...mobileOnlyItems]}
                onLogout={user ? handleLogout : null}
                logoutLabel={t.nav.logout}
            />

        </header>
    )
}

export default SiteHeader;