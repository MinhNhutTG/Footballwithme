

function SortableHeader({ label, sortKey, sort, onSort, className = '' }) {
    const active = sort.key === sortKey;
    const arrow = active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕';
    return (
        <th className={`pb-2 font-head text-xs font-bold uppercase tracking-wide ${className}`}>
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className={`inline-flex items-center gap-1 transition ${active ? 'text-fwm-accent' : 'text-fwm-muted hover:text-fwm-text'}`}
            >
                {label} <span className="text-[10px]"> {arrow}</span>
            </button>
        </th>
    )
}

export default SortableHeader;