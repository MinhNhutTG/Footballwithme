import { useMemo, useState } from "react";
import CategoryTile from "../components/article/CategoryTile";
import SectionHeading from "../components/common/SectionHeading"
import { useLang } from "../context/LangContext"
import { CATEGORIES } from "../data/categories";
import { usePosts } from "../context/PostsContext";
import Chip from '../components/ui/Chip'
import ArticleCard from "../components/article/ArticleCard";
import PopularItem from '../components/article/PopularItem'
import { useParams } from "react-router-dom";
function CategoryOverview() {
    const { t } = useLang();
    return (
        <section className="mx-auto max-w-6xl px-4 py-14">
            <SectionHeading title={t.section.categories}></SectionHeading>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {CATEGORIES.map((cat, i) => (
                    <CategoryTile key={cat.id} category={cat} index={i}></CategoryTile>
                ))}
            </div>
        </section>
    )
}

function CategoryDetail({ categoryId }) {
    const { t } = useLang();
    const { posts } = usePosts();
    const [activeTag, setActiveTag] = useState('all');
    const categoryArticles = useMemo(() => posts.filter((post) => post.category === categoryId), [categoryId, posts]);
    const tags = useMemo(() => Array.from(new Set(categoryArticles.flatMap((a) => a.tags))), [categoryArticles]);
    const filtered = activeTag === 'all' ? categoryArticles : categoryArticles.filter((cat) => cat.tags.includes(activeTag))
    console.log(t);
    console.log(t.categories[categoryId])

    const meta = t.categories[categoryId];
    const category = CATEGORIES.find((c) => c.id == categoryId);
    const popular = posts.slice(0, 5);

    if (!category) return null;
    return (
        <>
            <section className={`border-b border-fwm-line bg-gradient-to-br ${category.gradient} px-4 py-14`} >
                <div className="mx-auto max-w-6xl">
                    <h1 className="font-head text-3xl font-black text-white sm:text-4xl">
                        {meta.label}
                    </h1>
                    <p className="mt-2 max-w-md text-white/85"> {meta.desc}</p>
                    <p className="mt-4 font-head text-xs font-bold uppercase tracking-wide text-white/70">
                        {categoryArticles.length} {t.category.countSuffix}
                    </p>
                </div>
            </section >
            <section className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 lg:grid-cols-[1fr_280px]">
                <div className="mb-6 flex flex-wrap gap-2">
                    <Chip active={activeTag === 'all'} onClick={() => setActiveTag('all')}>
                        {t.category.allTags}
                    </Chip>
                    {tags.map((tag) => (
                        <Chip key={tag} active={activeTag === tag} onClick={() => setActiveTag(tag)}>{tag}</Chip>
                    ))}



                </div>
                {filtered.length === 0 ? (
                    <p className="text-fwm-muted">{t.category.empty}</p>
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {filtered.map((article) => <ArticleCard key={article.id} article={article}></ArticleCard>)}
                    </div>

                )}

                <aside>
                    <h3 className="mb-3 font-head text-sm font-bold uppercase tracking-wide text-fwm-text">
                        {t.category.popularHeading}
                    </h3>
                    <div className="rounded-fwm-lg border border-fwm-line bg-fwm-card p-2">
                        {popular.map((article, i) => <PopularItem key={article.id} article={article} rank={i + 1}  ></PopularItem>)}
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