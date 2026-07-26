import Avatar from '../ui/Avatar'
import { useCommentContext } from '../../context/CommentContext';
import { useLang } from '../../context/LangContext';
import { useState } from 'react';
import ConfirmModal from './ConfirmModal';
function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'vừa xong';
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    return `${Math.floor(h / 24)} ngày trước`;
}

function CommentItem({ comment }) {
    const { t } = useLang();
    const initial = comment.author.name.trim().split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
    const { removeComment, user } = useCommentContext();
    const canDelete = user && (user._id === comment.author._id || user.role === 'admin');
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="flex gap-3 rounded-fwm-lg border border-fwm-line bg-fwm-card p-4 transition hover:border-fwm-accent/40">
            <Avatar initials={initial} size="sm" />
            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                    <p className="font-head text-sm font-bold text-fwm-text">{comment.author.name}</p>
                    {canDelete && <button onClick={()=> setShowModal(true)} className="shrink-0 text-xs font-bold text-fwm-muted transition hover:text-fwm-pink">
                        {t.comment.deleteAction}
                    </button>}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-fwm-text">{comment.text}</p>
                <span className="mt-2 block text-xs text-fwm-muted">{timeAgo(comment.createdAt)}</span>
            </div>
            {showModal && <ConfirmModal
                message={t.comment.deleteConfirm}
                onConfirm={() => { removeComment(comment._id); setShowModal(false) }}
                onCancel={() => setShowModal(false)}
            ></ConfirmModal>}
        </div>
    );
}

export default CommentItem;
