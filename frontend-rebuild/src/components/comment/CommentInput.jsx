import { forwardRef, useState } from "react";
import { useLang } from "../../context/LangContext";

const CommentInput = forwardRef(({ onSubmit, placeholder, autoFocus, onCancel }, ref) => {
    const {t} = useLang();
    const [text, setText] = useState('');

    async function handleSubmit(e){
        e.preventDefault();
        if (!text.trim()) return;
        await onSubmit(text.trim());
        setText('');
    }
    return (
        <form className="mt-6 flex gap-3" onSubmit={handleSubmit} >
            <textarea className="flex-1 resize-none rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none"
                rows={2}
                ref={ref}
                autoFocus={autoFocus}
                value={text}
                onChange={(e)=> setText(e.target.value)}
                placeholder={placeholder ?? t.comment.placeholder}
            />
            <div className="flex shrink-0 flex-col gap-2 self-end">
                <button
                    type="submit"
                    className="rounded-fwm-pill bg-fwm-accent px-5 py-3 font-head text-sm font-bold text-fwm-ink"
                >{t.comment.send}</button>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-fwm-pill border border-fwm-line px-5 py-2 text-xs font-bold text-fwm-muted"
                    >{t.comment.cancel}</button>
                )}
            </div>
        </form>
    )
})

export default CommentInput;