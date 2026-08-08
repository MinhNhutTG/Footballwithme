import { useEffect, useState } from "react";
import CategoryTile from "../components/article/CategoryTile";
import SectionHeading from "../components/common/SectionHeading"
import { useLang } from "../context/LangContext"
import { useCategories } from "../context/CategoryContext";
import { fetchPosts } from "../api/posts";
import Chip from '../components/ui/Chip'
import ArticleCard from "../components/article/ArticleCard";
import PopularItem from '../components/article/PopularItem'
import Button from '../components/ui/Button'
import { useParams } from "react-router-dom";
import SEO from '../components/common/SEO'

const POSTS_PER_PAGE = 6;

function CategoryOverview() {
    const { t } = useLang();
    const { categories } = useCategories();
    return (
        <section className="mx-auto max-w-6xl px-4 py-14">
            <SEO title={t.section.categories} />
            <SectionHeading title={t.section.categories}></SectionHeading>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {categories.map((cat) => (
                    <CategoryTile key={cat._id} category={cat}></CategoryTile>
                ))}
            </div>
        </section>
    )
}

function CategoryDetail({ categoryId }) {
    const { lang, t } = useLang();
    const { categories } = useCategories();
    const [activeTag, setActiveTag] = useState('all');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState({ data: [], total: 0, pages: 1, tags: [] });
    const [loading, setLoading] = useState(true);
    const [popular, setPopular] = useState([]);

    const category = categories.find((c) => c.slug === categoryId);

    useEffect(() => {
        setPage(1);
    }, [categoryId, activeTag]);

    useEffect(() => {
        setLoading(true);
        fetchPosts({
            category: categoryId,
            tag: activeTag === 'all' ? undefined : activeTag,
            page,
            limit: POSTS_PER_PAGE,
        })
            .then(setResult)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [categoryId, activeTag, page]);

    useEffect(() => {
        fetchPosts({ sort: 'views', limit: 5 })
            .then((res) => setPopular(res.data))
            .catch(() => {});
    }, []);

    if (!category) return null;
    return (
        <>
            <SEO title={category.label[lang]} description={category.desc?.[lang]} />
            <section
                className={`relative border-b border-fwm-line px-4 py-14 ${category.imageUrl ? 'bg-cover bg-center' : `bg-gradient-to-br ${category.gradient}`}`}
                style={category.imageUrl ? { backgroundImage: `url(${category.imageUrl})` } : undefined}
            >
                {category.imageUrl && <div className="absolute inset-0 bg-fwm-ink/50" />}
                <div className="relative mx-auto max-w-6xl">
                    <h1 className="font-head text-3xl font-black text-white sm:text-4xl">
                        {category.label[lang]}
                    </h1>
                    <p className="mt-2 max-w-md text-white/85"> {category.desc[lang]}</p>
                    <p className="mt-4 font-head text-xs font-bold uppercase tracking-wide text-white/70">
                        {result.total} {t.category.countSuffix}
                    </p>
                </div>
            </section >
            <section className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 lg:grid-cols-[1fr_280px]">
                <div className="min-w-0">
                    <div className="mb-6 flex flex-wrap gap-2">
                        <Chip active={activeTag === 'all'} onClick={() => setActiveTag('all')}>
                            {t.category.allTags}
                        </Chip>
                        {result.tags.map((tag) => (
                            <Chip key={tag} active={activeTag === tag} onClick={() => setActiveTag(tag)}>{tag}</Chip>
                        ))}
                    </div>
                    {!loading && result.data.length === 0 ? (
                        <p className="text-fwm-muted">{t.category.empty}</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            {result.data.map((article) => <ArticleCard key={article.id} article={article}></ArticleCard>)}
                        </div>
                    )}
                    {result.pages > 1 && (
                        <div className="mt-6 flex items-center justify-between">
                            <p className="text-sm text-fwm-muted">
                                Trang {page}/{result.pages}
                            </p>
                            <div className="flex gap-2">
                                <Button type="button" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                                    Trước
                                </Button>
                                <Button type="button" variant="ghost" disabled={page >= result.pages} onClick={() => setPage((p) => p + 1)}>
                                    Sau
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <aside>
                    <h3 className="mb-3 font-head text-sm font-bold uppercase tracking-wide text-fwm-text">
                        {t.category.popularHeading}
                    </h3>
                    <div className="rounded-fwm-lg border border-fwm-line bg-fwm-card p-2">
                        {popular.map((article, i) => <PopularItem key={article.id} article={article} rank={i + 1}></PopularItem>)}
                    </div>
                </aside>
            </section>
        </>
    )
}

function Category() {
    const { id } = useParams();
    return id ? <CategoryDetail categoryId={id}></CategoryDetail> : <CategoryOverview></CategoryOverview>;
}

export default Category;
