import CommentItem from "./CommentItem";
import { Link } from "react-router-dom";
import { useLang } from '../../context/LangContext'
import { useEffect, useState, useTransition, useMemo } from "react";
import { useLayoutEffect, useRef } from "react";
import { CommentProvider, useCommentContext } from "../../context/CommentContext";
import CommentInput from "./CommentInput";
function CommentSectionContent() {
    const { t } = useLang();
    const { topLevelComments, repliesByParent, loading, error, addComment, removeComment, user } = useCommentContext();
    const listRef = useRef(null);
    const inputRef = useRef(null);
    const [filter, setFilter] = useState('');
    const [isPending, startTransition] = useTransition();


    useLayoutEffect(() => {
        const element = listRef.current;
        if (element) element.scrollTop = element.scrollHeight;
    }, [topLevelComments.length]);

    useEffect(() => {
        inputRef.current?.focus();
    }, [])
    function handleFilter(value) {
        startTransition(() => setFilter(value));
    }

    const filtered = useMemo(
        () => topLevelComments.filter((c) => c.text.toLowerCase().includes(filter.toLowerCase())),
        [topLevelComments, filter]
    );
    return (
        <section className="mx-auto max-w-3xl px-4 py-12">
            <h2 className="font-head text-xl font-extrabold text-fwm-text">{t.comment.heading}</h2>
            <input
                type="text"
                placeholder={t.comment.filterPlaceholder}
                onChange={(e) => handleFilter(e.target.value)}
                className="mt-4 w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-2 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none"
            />
            <div
                className={`mt-6 space-y-3 ${isPending ? 'opacity-60' : ''}`}
                ref={listRef}
            >
                {loading && <p className="text-sm text-fwm-muted">{t.comment.loading}</p>}
                {error && <p className="text-sm text-fwm-pink">{t.comment.error}</p>}
                {/* danh sách comment sẽ render ở đây */}
                {filtered.map((cmt) => (
                    <CommentItem key={cmt._id} comment={cmt} replies={repliesByParent[cmt._id] || []}></CommentItem>
                ))}

            </div>
            {user ? (
                <CommentInput ref={inputRef} onSubmit={addComment} ></CommentInput>
            ) : (
                <Link to="/dang-nhap" className="mt-6 block text-center font-head text-sm font-bold text-fwm-accent hover:underline">
                    {t.comment.loginToComment}
                </Link>
            )}

        </section>
    );
}

function CommentSection({ postId }) {
    return (
        <CommentProvider postId={postId}>
            <CommentSectionContent></CommentSectionContent>
        </CommentProvider>
    )
}

export default CommentSection;
