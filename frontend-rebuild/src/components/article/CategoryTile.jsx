import { Link } from "react-router-dom"
import { useLang } from "../../context/LangContext";

function CategoryTile({ category }) {
    const { lang } = useLang();
    return (
        <Link
            to={`/chuyen-muc/${category.slug}`}
            className="group relative block aspect-[4/5] overflow-hidden rounded-fwm-lg transition duration-300 hover:-translate-y-1.5 hover:shadow-fwm"
        >
            <div
                className={`absolute inset-0 transition duration-500 ease-out group-hover:scale-105 ${category.imageUrl ? 'bg-cover bg-center' : `bg-gradient-to-br ${category.gradient}`}`}
                style={category.imageUrl ? { backgroundImage: `url(${category.imageUrl})` } : undefined}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-fwm-ink/90 via-fwm-ink/10 to-transparent" />
            <div className="relative flex h-full flex-col justify-end p-5">
                <h3 className="font-head text-2xl font-black text-white drop-shadow-lg">{category.label[lang]}</h3>
                <p className="mt-1 text-sm text-white/90 drop-shadow-lg">{category.desc[lang]}</p>
            </div>
        </Link>
    )
}

export default CategoryTile;
