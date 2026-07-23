import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext';

function PopularItem({ article, rank }) {
  const { lang, t } = useLang();

  return (
    <Link
      to={`/bai-viet/${article.id}`}
      className="flex items-center gap-3 rounded-fwm px-2 py-2.5 transition hover:bg-fwm-pill"
    >
      <span className="font-head text-xl font-black text-fwm-muted/60">
        {String(rank).padStart(2, '0')}
      </span>
      <span
        className={`h-12 w-16 shrink-0 rounded-fwm bg-gradient-to-br ${article.gradient}`}
      />
      <span className="min-w-0">
        <span className="block truncate font-head text-sm font-bold text-fwm-text">
          {article.title[lang]}
        </span>
        <span className="text-xs text-fwm-muted">{t.categories[article.category]?.label}</span>
      </span>
    </Link>
  );
}

export default PopularItem;
