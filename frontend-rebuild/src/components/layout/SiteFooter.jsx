import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext';
import { useCategories } from '../../context/CategoryContext';

function SiteFooter() {
    const { lang, t } = useLang();
    const { categories } = useCategories();
    const siteLinks = [
        { to: '/', label: t.nav.home },
        { to: '/gioi-thieu', label: t.nav.about },
        { to: '/lien-he', label: t.nav.contact },
        { to: '/admin', label: t.nav.admin },
    ];
    return (
        <footer className="border-t border-fwm-line bg-fwm-bg-deep">
            <div className="mx-auto max-w-6xl px-4 py-10">
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-fwm bg-fwm-accent font-head text-sm font-black text-fwm-ink">eF</span>
                            <span className="font-head text-base font-extrabold text-fwm-text">FootballWithMe</span>
                        </div>
                        <p className="mt-3 max-w-xs text-sm text-fwm-muted">{t.footer.tagline}</p>
                    </div>

                    <div>
                        <h4 className="font-head text-sm font-bold uppercase tracking-wide text-fwm-text">{t.footer.categoriesHeading}</h4>
                        <ul className="mt-3 space-y-2">
                            {categories.map((cat) => (
                                <li key={cat._id}>
                                    <Link to={`/chuyen-muc/${cat.slug}`} className="text-sm text-fwm-muted hover:text-fwm-accent">
                                        {cat.label[lang]}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-head text-sm font-bold uppercase tracking-wide text-fwm-text">{t.footer.siteLinksHeading}</h4>
                        <ul className="mt-3 space-y-2">
                            {siteLinks.map((link) => (
                                <li key={link.to}>
                                    <Link to={link.to} className="text-sm text-fwm-muted hover:text-fwm-accent">{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <p className="mt-8 border-t border-fwm-line pt-6 text-xs text-fwm-muted">{t.footer.note}</p>
            </div>
        </footer>
    )
}

export default SiteFooter;
