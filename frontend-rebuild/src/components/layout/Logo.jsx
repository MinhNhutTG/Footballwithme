import { useSettings } from '../../context/SettingsContext';

function Logo({ compact = false }) {
    const { settings } = useSettings();
    const badgeSize = compact ? 'h-8 w-8 text-sm' : 'h-9 w-9 text-base';
    const nameSize = compact ? 'text-base' : 'text-lg';
    const siteName = settings?.siteName || 'FootballWithMe';

    return (
        <>
            {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt={siteName} className={`${badgeSize} rounded-fwm object-cover`} />
            ) : (
                <span className={`flex ${badgeSize} items-center justify-center rounded-fwm bg-fwm-accent font-head font-black text-fwm-ink`}>eF</span>
            )}
            <span className={`font-head ${nameSize} font-extrabold text-fwm-text`}>{siteName}</span>
        </>
    );
}

export default Logo;
