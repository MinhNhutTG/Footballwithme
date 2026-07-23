import { useMemo } from 'react';
import { useLang } from '../context/LangContext';
import { usePosts } from '../context/PostsContext';
import ArticleCard from '../components/article/ArticleCard';
import Chip from '../components/ui/Chip';
import { CATEGORIES } from '../data/categories';
import { useSearchParams } from 'react-router-dom';

function Search() {
  const { t } = useLang();
  const { posts } = usePosts();
  // const [query, setQuery] = useState('');
  // const [category, setCategory] = useState('all');
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const category = searchParams.get('cat') || 'all';

  const setParam = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!value || value === 'all') next.delete(key);
      else next.set(key, value);
      return next;
    });
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((a) => {
      if (category !== 'all' && a.category !== category) return false;
      if (!q) return true;
      const haystack = [
        a.title.vi,
        a.title.en,
        a.excerpt.vi,
        a.excerpt.en,
        a.category,
        ...a.tags,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [posts, query, category]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <input
        type="search"
        autoFocus
        value={query}
        onChange={(e) => setParam('q', e.target.value)}
        placeholder={t.search.placeholder}
        className="w-full rounded-fwm-lg border border-fwm-line bg-fwm-card px-5 py-4 text-fwm-text placeholder:text-fwm-muted focus:border-fwm-accent focus:outline-none"
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Chip active={category === 'all'} onClick={() => setParam('cat', 'all')}>
          {t.category.allTags}
        </Chip>
        {CATEGORIES.map((cat) => (
          <Chip key={cat.id} active={category === cat.id} onClick={() => setParam('cat', cat.id)}>
            {t.categories[cat.id].label}
          </Chip>
        ))}
      </div>

      {query && (
        <p className="mt-6 text-sm text-fwm-muted">
          {t.search.resultsFor} <span className="text-fwm-text">“{query}”</span> —{' '}
          {results.length} {t.search.resultsCount}
        </p>
      )}

      <div className="mt-6">
        {results.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-head text-lg font-bold text-fwm-text">{t.search.empty}</p>
            <p className="mt-1 text-sm text-fwm-muted">{t.search.emptyDesc}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default Search;
