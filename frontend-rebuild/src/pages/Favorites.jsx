
import SectionHeading from '../components/common/SectionHeading'
import { useLang } from '../context/LangContext';
import {usePosts} from '../context/PostsContext'
import {useFavorites} from '../context/FavoritesContext'
import Button from '../components/ui/Button'
import ArticleCard from '../components/article/ArticleCard'
function Favorites() {
    const { t } = useLang();
    const {posts} = usePosts();
    const {liked} = useFavorites();
    const favoritesArticles = posts.filter((a)=> liked[a.id]);
    return (
        <section className="mx-auto max-w-6xl px-4 py-12">
            <SectionHeading title={t.favorites.heading }></SectionHeading>
            {favoritesArticles.length === 0 ?(
                <div className="py-16 text-center">
                    <p className="font-head text-lg font-bold text-fwm-text">
                        {t.favorites.empty}
                    </p>
                    <p className="mt-1 text-sm text-fwm-muted">
                        {t.favorites.emptyDesc}
                    </p>
                    <Button to="/" variant="primary" className="mt-6 inline-flex">
                        {t.favorites.browseCta}
                    </Button>
                </div>
            ): (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {favoritesArticles.map((a)=> (
                        <ArticleCard key={a.id} article={a}></ArticleCard>
                    ))}
                </div>
            )}
        </section>
    )
}


export default Favorites;