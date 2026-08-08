import { useEffect, useState } from 'react'
import { useLang } from '../context/LangContext'
import Button from '../components/ui/Button'
import SectionHeading from '../components/common/SectionHeading';
import { fetchPosts } from '../api/posts'
import ArticleCard from '../components/article/ArticleCard'
import CategoryTitle from '../components/article/CategoryTile'
import { useCategories } from '../context/CategoryContext'
const COMBO_KEYS = [
    { label: '△', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' },
    { label: '□', className: 'bg-pink-500/20 text-pink-300 border-pink-400/40' },
    { label: '✕', className: 'bg-blue-500/20 text-blue-300 border-blue-400/40' },
    { label: '○', className: 'bg-red-500/20 text-red-300 border-red-400/40' },
];

function Home() {
    const { t } = useLang();
    const { categories } = useCategories();
    const [latest, setLatest] = useState([]);

    useEffect(() => {
        fetchPosts({ limit: 6 })
            .then((res) => setLatest(res.data))
            .catch(() => {});
    }, []);
    return (
        <div className="animate-fwm-in">
            <section className="relative overflow-hidden border-b border-fwm-line bg-fwm-bg-deep">
                <div
                    className="absolute inset-0 animate-fwm-grid opacity-10"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(150,170,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(150,170,255,.4) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                    }}
                />

                <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
                    <div>
                        <span className="inline-flex items-center rounded-fwm-pill border border-fwm-line bg-fwm-pill px-3 py-1 font-head text-xs font-bold uppercase tracking-wider text-fwm-accent">
                            {t.hero.kicker}
                        </span>
                        <h1 className="mt-5 font-head text-4xl font-black leading-[1.1] text-fwm-text sm:text-5xl">
                            {t.hero.headline1} <br />
                            <span className="text-fwm-accent">{t.hero.headline2}</span>
                        </h1>
                        <p className="mt-5 max-w-md text-base text-fwm-muted">{t.hero.desc}</p>
                        <div className="mt-6 flex items-center gap-2">
                            {COMBO_KEYS.map((key, i) => (
                                <span
                                    key={i}
                                    className={`flex h-9 w-9 animate-fwm-combo items-center justify-center rounded-full border font-head text-sm font-bold ${key.className}`}
                                    style={{ animationDelay: `${i * 0.15}s` }}
                                >
                                    {key.label}
                                </span>
                            ))}
                        </div>
                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <Button to="/chuyen-muc" variant="primary">{t.hero.ctaPrimary}</Button>
                            <Button to="/chuyen-muc" variant="ghost">{t.hero.ctaSecondary}</Button>
                        </div>
                        <div className="mt-10 grid grid-cols-3 gap-4 border-t border-fwm-line pt-6">
                            <div>
                                <div className="font-head text-2xl font-extrabold text-fwm-text">120+</div>
                                <div className="text-xs text-fwm-muted">{t.hero.statArticles}</div>
                            </div>
                            <div>
                                <div className="font-head text-2xl font-extrabold text-fwm-text">40+</div>
                                <div className="text-xs text-fwm-muted">{t.hero.statSkills}</div>
                            </div>
                            <div>
                                <div className="font-head text-2xl font-extrabold text-fwm-text">8K+</div>
                                <div className="text-xs text-fwm-muted">{t.hero.statPlayers}</div>
                            </div>
                        </div>
                    </div>

                    <div className="relative mx-auto w-full max-w-sm animate-fwm-float">
                        <div className="animate-fwm-glow relative overflow-hidden rounded-fwm-lg border border-fwm-line bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 p-6">
                            <span className="inline-flex rounded-fwm-pill bg-fwm-ink/70 px-3 py-1 font-head text-xs font-bold uppercase tracking-wide text-white">
                                {t.hero.cardTag}
                            </span>
                            <h3 className="mt-20 font-head text-xl font-extrabold text-white">
                                {t.hero.cardTitle}
                            </h3>
                            <div className="mt-4 flex items-center justify-between">
                                <span className="font-head text-xs font-bold text-white/85">
                                    {t.hero.cardRating}
                                </span>
                                <span className="animate-fwm-ring flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-fwm-ink">
                                    <i className="fa-solid fa-play" aria-hidden="true"></i>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-14">
                <SectionHeading title={t.section.latest} viewAllTo="/chuyen-muc"></SectionHeading>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {latest.map((article) => <ArticleCard key={article.id} article={article} ></ArticleCard>)}
                </div>
            </section>
            

            <section className="mx-auto max-w-6xl px-4 py-14">
                <SectionHeading title={t.section.categories} ></SectionHeading>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {categories.map((cat) => <CategoryTitle key={cat._id} category={cat}></CategoryTitle>)}
                </div>
            </section>
        </div>
    )
}

export default Home;