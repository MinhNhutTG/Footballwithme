import { memo } from 'react'

const SIZES = {
    sm: 'h-9 w-9 text-sm',
    md: 'h-14 w-14 text-lg',
    lg: 'h-24 w-24 text-2xl',
};

const Avatar = memo(function Avatar({ initials, preview, onClick, hint, size = 'lg' }) {
    return (
        <div className="flex flex-col items-center gap-3">
            <div
                className={`flex shrink-0 overflow-hidden items-center justify-center rounded-full bg-fwm-accent font-head font-black text-fwm-ink ${SIZES[size]} ${onClick ? 'cursor-pointer' : ''}`}
                onClick={onClick}
            >
                {preview
                    ? <img src={preview} alt="avatar" className="h-full w-full object-cover" />
                    : initials
                }
            </div>
            {hint && <p className="text-xs text-fwm-muted">{hint}</p>}
        </div>
    );
})

export default Avatar;