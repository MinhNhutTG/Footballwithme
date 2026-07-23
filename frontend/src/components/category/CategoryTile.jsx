import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext';

function CategoryTile({ category, index }) {
  const { t } = useLang();
  const meta = t.categories[category.id];

  return (
    <Link
      to={`/chuyen-muc/${category.id}`}
      className={`group relative block overflow-hidden rounded-fwm-lg bg-gradient-to-br ${category.gradient} p-5 transition duration-300 hover:-translate-y-1.5 hover:shadow-fwm`}
    >
      <span className="font-head text-4xl font-black text-white/30">
        {String(index + 1).padStart(2, '0')}
      </span>
      <h3 className="mt-6 font-head text-xl font-extrabold text-white">
        {meta.label}
      </h3>
      <p className="mt-1 text-sm text-white/85">{meta.desc}</p>
    </Link>
  );
}

export default CategoryTile;
