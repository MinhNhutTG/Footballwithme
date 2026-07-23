import { forwardRef, useState } from 'react';

const CommentInput = forwardRef(function CommnentInput({onSubmit}, ref) {

    const [commentText, setCommentText] = useState('');
    function handleSubmit(e) {
        e.preventDefault();
        if (!commentText.trim()) return;
        onSubmit(commentText);
        setCommentText('');
    }
   
    return (<>
        <form className="mt-8 flex gap-3" onSubmit={handleSubmit}>
            <textarea
                value={commentText}
                onChange={(e) => { setCommentText(e.target.value) }}
                ref={ref}
                placeholder="Viết bình luận của bạn..."
                rows={2}
                className="flex-1 resize-none rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-sm text-fwm-text placeholder:text-fwm-muted focus:border-fwm-accent focus:outline-none"
            />
            <button
                type="submit"
                className="self-end rounded-fwm-pill bg-fwm-accent px-5 py-3 font-head text-sm font-bold text-fwm-ink shadow-fwm transition hover:brightness-95"
            >
                Gửi
            </button>
        </form>
    </>)
})

export default CommentInput