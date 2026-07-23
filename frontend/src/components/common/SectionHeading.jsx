import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext';

function SectionHeading({ title, viewAllTo }) {
  const { t } = useLang();
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 className="font-head text-2xl font-extrabold text-fwm-text sm:text-3xl">
        {title}
      </h2>
      {viewAllTo && (
        <Link
          to={viewAllTo}
          className="shrink-0 text-sm font-semibold text-fwm-accent hover:underline"
        >
          {t.section.viewAll} →
        </Link>
      )}
    </div>
  );
}

export default SectionHeading;
