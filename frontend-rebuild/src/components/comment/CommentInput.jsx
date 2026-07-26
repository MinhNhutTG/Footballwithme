import { forwardRef, useState } from "react";
import { useLang } from "../../context/LangContext";

const CommentInput = forwardRef(({ onSubmit }, ref) => {
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
                value={text}
                onChange={(e)=> setText(e.target.value)}
                placeholder={t.comment.placeholder}
            />
            <button
                type="submit"
                className="self-end rounded-fwm-pill bg-fwm-accent px-5 py-3 font-head text-sm font-bold text-fwm-ink"
            >{t.comment.send}</button>
        </form>
    )
})

export default CommentInput;