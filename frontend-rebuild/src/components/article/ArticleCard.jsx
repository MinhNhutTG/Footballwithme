import { Link } from 'react-router-dom'
import { useLang } from "../../context/LangContext";
import { useFavorites } from '../../context/FavoritesContext'

function ArticleCard({ article }) {
    const { lang, t } = useLang();
    const { isFavorite, toggleFavorites } = useFavorites();
    const liked = isFavorite(article.id);
    const catLabel = t.categories[article.category]?.label;
    return (
       
            <article className="group rounded-fwm-lg border border-fwm-line bg-fwm-card p-3 transition duration-300 hover:-translate-y-1.5 hover:shadow-fwm">
                <Link to={`/bai-viet/${article.id}`} className={`relative block aspect-[16/10] overflow-hidden rounded-fwm bg-gradient-to-br ${article.gradient}`}>
                    <span className="absolute left-3 top-3 rounded-fwm-pill bg-fwm-ink/70 px-3 py-1 font-head text-xs font-bold uppercase tracking-wide text-white">
                        {catLabel}
                    </span>
                    <span className="absolute inset-0 flex items-center justify-center font-head text-sm font-bold text-white/70" >
                        [{article.tags.join(' · ')}]
                    </span>
                </Link>
                <div className="mt-3 flex items-start justify-between gap-2">
                    <h3 className="font-head text-base font-bold leading-snug text-fwm-text">
                        <Link to={`/bai-viet/${article.id}`} className="hover:text-fwm-accent">
                            {article.title[lang]}
                        </Link>
                    </h3>
                    <button
                        type="button"
                        aria-label="favorite"
                        onClick={() => toggleFavorites(article.id)}
                        className={`shrink-0 text-lg transition active:scale-90 ${liked ? 'text-fwm-pink' : 'text-fwm-muted hover:text-fwm-pink'}`}
                    >
                        {liked ? '♥' : '♡'}
                    </button>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm text-fwm-muted">
                    {article.excerpt[lang]}
                </p>
            </article>
        
    )
}

export default ArticleCard;