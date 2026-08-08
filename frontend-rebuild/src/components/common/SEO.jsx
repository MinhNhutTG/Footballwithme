import { Helmet } from 'react-helmet-async';
import { useSettings } from '../../context/SettingsContext';
import { useLang } from '../../context/LangContext';

function SEO({ title, description }) {
    const { settings } = useSettings();
    const { lang } = useLang();
    const siteName = settings?.siteName || 'FootballWithMe';
    const fallbackDescription = settings?.seo?.metaDescription?.[lang] || settings?.description?.[lang] || '';
    const fullTitle = title ? `${title} | ${siteName}` : siteName;
    const metaDescription = description || fallbackDescription;

    return (
        <Helmet>
            <title>{fullTitle}</title>
            {metaDescription && <meta name="description" content={metaDescription} />}
        </Helmet>
    );
}

export default SEO;
