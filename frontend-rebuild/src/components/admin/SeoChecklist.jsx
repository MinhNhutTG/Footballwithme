const STATUS_STYLE = {
    pass: { icon: 'fa-solid fa-circle-check', className: 'text-emerald-400' },
    warn: { icon: 'fa-solid fa-triangle-exclamation', className: 'text-fwm-accent' },
    fail: { icon: 'fa-solid fa-circle-xmark', className: 'text-fwm-pink' },
};

function SeoChecklist({ items }) {
    return (
        <div className="rounded-fwm-lg border border-fwm-line bg-fwm-card-2 p-4">
            <h3 className="mb-3 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Gợi ý SEO</h3>
            <ul className="space-y-2">
                {items.map((item, i) => {
                    const style = STATUS_STYLE[item.status];
                    return (
                        <li key={i} className="flex items-start gap-2 text-sm">
                            <i className={`${style.icon} ${style.className} mt-0.5`} aria-hidden="true"></i>
                            <span className="text-fwm-text">
                                <span className="font-bold">{item.label}:</span> <span className="text-fwm-muted">{item.message}</span>
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default SeoChecklist;
