import Avatar from '../ui/Avatar'
import { useCommentContext } from '../../context/CommentContext';
import { useLang } from '../../context/LangContext';
import { useState } from 'react';
import ConfirmModal from './ConfirmModal';
import CommentInput from './CommentInput';
function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'vừa xong';
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    return `${Math.floor(h / 24)} ngày trước`;
}

function CommentItem({ comment, replies = [], isReply = false }) {
    const { t } = useLang();
    const initial = comment.author.name.trim().split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
    const { removeComment, addComment, user } = useCommentContext();
    const canDelete = !comment.isDeleted && user && (user._id === comment.author._id || user.role === 'admin');
    const [showModal, setShowModal] = useState(false);
    const [showReplyInput, setShowReplyInput] = useState(false);

    async function handleReplySubmit(text) {
        await addComment(text, comment._id);
        setShowReplyInput(false);
    }

    return (
        <div>
            <div className="flex gap-3 rounded-fwm-lg border border-fwm-line bg-fwm-card p-4 transition hover:border-fwm-accent/40">
                <Avatar initials={initial} size="sm" preview={comment.author.avatarUrl} />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <p className="font-head text-sm font-bold text-fwm-text">{comment.author.name}</p>
                        {canDelete && <button onClick={()=> setShowModal(true)} className="shrink-0 text-xs font-bold text-fwm-muted transition hover:text-fwm-pink">
                            {t.comment.deleteAction}
                        </button>}
                    </div>
                    <p className={`mt-1 text-sm leading-relaxed ${comment.isDeleted ? 'italic text-fwm-muted' : 'text-fwm-text'}`}>
                        {comment.isDeleted ? t.comment.deletedText : comment.text}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                        <span className="text-xs text-fwm-muted">{timeAgo(comment.createdAt)}</span>
                        {!isReply && user && (
                            <button
                                onClick={() => setShowReplyInput((v) => !v)}
                                className="text-xs font-bold text-fwm-muted transition hover:text-fwm-accent"
                            >
                                {t.comment.replyAction}
                            </button>
                        )}
                    </div>
                </div>
                {showModal && <ConfirmModal
                    message={t.comment.deleteConfirm}
                    onConfirm={() => { removeComment(comment._id); setShowModal(false) }}
                    onCancel={() => setShowModal(false)}
                ></ConfirmModal>}
            </div>

            {showReplyInput && (
                <div className="ml-10">
                    <CommentInput
                        onSubmit={handleReplySubmit}
                        placeholder={t.comment.replyPlaceholder}
                        autoFocus
                        onCancel={() => setShowReplyInput(false)}
                    />
                </div>
            )}

            {replies.length > 0 && (
                <div className="ml-10 mt-3 space-y-3">
                    {replies.map((reply) => (
                        <CommentItem key={reply._id} comment={reply} isReply />
                    ))}
                </div>
            )}
        </div>
    );
}

export default CommentItem;
