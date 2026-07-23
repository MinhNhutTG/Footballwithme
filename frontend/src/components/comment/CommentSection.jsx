import CommentItem from './CommentItem';
import { useState, useRef, useLayoutEffect, useEffect, useTransition , useMemo} from 'react';
import { CommentProvider } from '../../context/CommentContext';
import { useCommentContext } from '../../context/CommentContext';
import CommentInput from './CommentInput';


function CommentList() {

    const { comments, addComment } = useCommentContext();
    const [textSearch, setTextSearch] = useState('');
    const [filter, setFilter] = useState();
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const [isPending, startTransition] = useTransition();

    useLayoutEffect(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [comments.length]);
    useEffect(() => {
        inputRef.current?.focus();
    }, [])

    function handleSearch(value) {
        setTextSearch(value);
        startTransition(() => {
            setFilter(value);
        })
    }

    const filtered = useMemo(() => {
        return comments.filter((c)=> c.text.toLowerCase().includes(filter?.toLowerCase() || '' ));
    }, [comments, filter]);

    return (

        <section className="mx-auto max-w-3xl border-t border-fwm-line px-4 py-10">
            <h2 className="font-head text-xl font-extrabold text-fwm-text">
                Bình luận ({filtered.length})
            </h2>

            <input
                type="search"
                placeholder="Tìm bình luận..."
                className="mt-4 w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-2.5 text-sm text-fwm-text placeholder:text-fwm-muted focus:border-fwm-accent focus:outline-none"
                value={textSearch}
                onChange={(e) => handleSearch(e.target.value)}
            />

            <div className={`mt-6 space-y-6 ${isPending ? 'opacity-50' : ''}`} ref={listRef}>
                {filtered.map((comment) => (
                    <CommentItem
                        id={comment._id}
                        key={comment._id}
                        content={comment.text}
                        author={comment.author.name}
                        createAt={comment.createdAt}
                        authorId={comment.author._id}
                    />
                ))}
            </div>

            <CommentInput ref={inputRef} onSubmit={addComment} />


        </section>
    )

}


function CommentSection({ postId }) {

    return (
        <CommentProvider postId={postId}>
            <CommentList />
        </CommentProvider>
    );

}

export default CommentSection;