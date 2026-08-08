import { usePosts } from '../context/PostsContext'
import { Link, useParams } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useFavorites } from '../context/FavoritesContext'
import { useCategories } from '../context/CategoryContext'
import SkillStep from '../components/skill/SkillStep'
import PopularItem from '../components/article/PopularItem'
import ArticleCard from '../components/article/ArticleCard'
import ErrorBoundary from '../components/common/ErrorBoundary'
import { viewPost } from '../api/posts'
import { useEffect, useState } from 'react'
import CommentSection from '../components/comment/CommentSection'
import ReactionBar from '../components/reaction/ReactionBar'
function ArticleDetail({ articleId }) {
    const { id } = useParams();
    const { posts, loading } = usePosts();
    const { lang, t } = useLang();
    const { isFavorite, toggleFavorites } = useFavorites();
    const { categories } = useCategories();

    const article = posts.find((p) => p.id === id);
    const [views, setViews] = useState(article?.views || 0);
    useEffect(() => {
        if (!article) return;
        setViews(article.views);
        viewPost(article.id)
            .then((res) => setViews(res.views))
            .catch(() => { })
    }, [article?.id])
    if (!article) {
        if (loading) return null;
        return (
            <section className="mx-auto max-w-3xl px-4 py-20 text-center">
                <p className="text-fwm-muted">{t.category.empty}</p>
                <Link to="/" className="mt-4 inline-block font-head text-sm font-bold text-fwm-accent">
                    {t.contact.backHome}
                </Link>
            </section>
        );
    }
    const currentCategory = categories.find((c) => c.slug === article.category);
    const hasSteps = !!currentCategory?.hasSteps;
    const liked = isFavorite(article.id);
    const popular = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
    const related = posts.filter((a) => a.category === article.category && a.id !== article.id).slice(0, 3);

    return (
        <>
            <section className={`relative border-b border-fwm-line px-4 py-16 ${article.coverImageUrl ? 'bg-cover bg-center' : `bg-gradient-to-br ${article.gradient}`}`}
                style={article.coverImageUrl ? { backgroundImage: `url(${article.coverImageUrl})` } : undefined}>
                {article.coverImageUrl && <div className="absolute inset-0 bg-fwm-ink/50" />}
                <div className="relative mx-auto max-w-4xl">
                    <Link to={`/chuyen-muc/${article.category}`} className="font-head text-xs font-bold uppercase tracking-wide text-white/80 hover:text-white" >
                        ← {currentCategory?.label[lang]}
                    </Link>
                    <h1 className="mt-3 font-head text-3xl font-black text-white sm:text-4xl">
                        {article.title[lang]}
                    </h1>
                    <div className="mt-4 flex items-center gap-3">
                        {article.tags.map((tag) => (
                            <span key={tag} className="rounded-fwm-pill bg-fwm-ink/60 px-3 py-1 text-xs font-bold text-white">
                                {tag}
                            </span>
                        ))}
                        <span className="text-xs font-bold text-white/70">
                            {views ?? 0} lượt xem
                        </span>
                        <button
                            type="button"
                            onClick={() => toggleFavorites(article.id)}
                            className={`ml-auto text-2xl transition active:scale-90 ${liked ? 'text-fwm-pink' : 'text-white/70 hover:text-fwm-pink'}`}
                            aria-label="favorite"
                        >
                            {liked ? '♥' : '♡'}
                        </button>
                    </div>
                </div>
            </section>

            <section className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 lg:grid-cols-[1fr_280px]">
                <article className="min-w-0">
                    {hasSteps && (
                        <div className="mb-8 overflow-hidden rounded-fwm-lg border border-fwm-line bg-fwm-card-2">
                            {article.videoUrl ? (
                                <video src={article.videoUrl} controls className="aspect-video w-full" />
                            ) : (
                                <div className={`relative flex aspect-video items-center justify-center bg-gradient-to-br ${article.gradient}`}>
                                    <span className="animate-fwm-ring flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-2xl text-fwm-ink">▶</span>
                                </div>
                            )}
                            <p className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-fwm-muted">
                                {t.article.videoCaption}
                            </p>
                        </div>
                    )}

                    <div className="prose-content text-lg leading-relaxed text-fwm-text"
                        // sanitized server-side (sanitize-html) before storage, admin-only write access
                        dangerouslySetInnerHTML={{ __html: article.intro[lang] }} />

                    {hasSteps && article.steps && (
                        <div className="mt-8">
                            <h2 className="mb-4 font-head text-xl font-extrabold text-fwm-text">
                                {t.article.stepsHeading}
                            </h2>
                            <div className="space-y-3">
                                {article.steps.map((step, i) => (
                                    <SkillStep key={i} step={step} index={i}></SkillStep>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="prose-content mt-8 leading-relaxed text-fwm-muted"
                        // sanitized server-side (sanitize-html) before storage, admin-only write access
                        dangerouslySetInnerHTML={{ __html: article.body[lang] }} />
                    <blockquote className="prose-content mt-8 rounded-fwm-lg border-l-4 border-fwm-accent bg-fwm-card px-5 py-4 font-head text-lg font-bold italic text-fwm-text"
                        dangerouslySetInnerHTML={{ __html: article.quote[lang] }} />

                    <div className="mt-8 rounded-fwm-lg border border-fwm-pink/30 bg-fwm-pink/10 px-5 py-4">
                        <p className="font-head text-xs font-bold uppercase tracking-wide text-fwm-pink">
                            {t.article.mistakeLabel}
                        </p>
                        <div className="prose-content mt-1.5 text-sm text-fwm-text"
                            dangerouslySetInnerHTML={{ __html: article.mistake[lang] }} />
                    </div>
                </article>
                <aside>
                    <h3 className="mb-3 font-head text-sm font-bold uppercase tracking-wide text-fwm-text">
                        {t.category.popularHeading}
                    </h3>
                    <div className="rounded-fwm-lg border border-fwm-line bg-fwm-card p-2">
                        {popular.map((a, i) => (
                            <PopularItem key={a.id} article={a} rank={i + 1}></PopularItem>
                        ))}
                    </div>
                </aside>
            </section>

            <ErrorBoundary fallback={null}>
                <section className="mx-auto max-w-3xl px-4 pt-10">
                    <ReactionBar postId={article.id}></ReactionBar>
                </section>
            </ErrorBoundary>

            {related.length > 0 && (
                <section className="mx-auto max-w-6xl border-t border-fwm-line px-4 py-12">
                    <h2 className="mb-6 font-head text-xl font-extrabold text-fwm-text">
                        {t.article.relatedHeading}
                    </h2>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {related.map((a) => <ArticleCard key={a.id} article={a}></ArticleCard>)}
                    </div>
                </section>
            )}
            <ErrorBoundary fallback={
                <p className="mx-auto max-w-3xl px-4 py-8 text-sm text-fwm-muted">
                    Không thể tải bình luận lúc này.
                </p>
            }>
                <CommentSection postId={article.id}></CommentSection>
            </ErrorBoundary>
        </>
    )
}

export default ArticleDetail;