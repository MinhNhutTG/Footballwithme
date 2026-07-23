
function Chip({ active = false, onClick, children }) {
    return (<>

        <button
            type="button"
            onClick={onClick}
            className={`rounded-fwm-pill border px-3.5 py-1.5 font-head text-xs font-bold uppercase tracking-wide transition 
                ${active ? 'border-fwm-accent bg-fwm-accent text-fwm-ink' :
                    'border-fwm-line bg-fwm-pill text-fwm-muted hover:text-fwm-text'
                }`}>
            {children}
        </button>

    </>)
}

export default Chip;