import { usePosts } from '../context/PostsContext';
import { useCategories } from '../context/CategoryContext'
import {useLang} from '../context/LangContext'
function About() {
    const { posts } = usePosts();
    const { categories } = useCategories();
    const {t} = useLang();
    return (
        <section className="mx-auto max-w-3xl px-4 py-16">
            <h1 className="font-head text-3xl font-black text-fwm-text sm:text-4xl">{t.about.heading}</h1>
            <p className="mt-5 text-lg leading-relaxed text-fwm-muted">{t.about.desc}</p>
            <p className="mt-4 leading-relaxed text-fwm-muted">{t.about.mission}</p>

            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-fwm-line pt-8">
                <div>
                    <div className="font-head text-3xl font-extrabold text-fwm-accent"> {posts.length}+</div>
                    <div className="mt-1 text-sm text-fwm-muted">{t.about.statArticles}</div>
                </div>
                <div>
                    <div className="font-head text-3xl font-extrabold text-fwm-accent">{categories.length}</div>
                    <div className="mt-1 text-sm text-fwm-muted">{t.about.statCategories}</div>
                </div>
                <div>
                    <div className="font-head text-3xl font-extrabold text-fwm-accent">8K+</div>
                    <div className="mt-1 text-sm text-fwm-muted">{t.about.statMembers}</div>
                </div>
            </div>
        </section>
    )
}


export default About;