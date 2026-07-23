import { useCommentContext } from '../../context/CommentContext';
import Avatar from '../ui/Avatar';
import { useState } from 'react';
import ConfirmModal from './ConfirmModal';

const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();

    const m = Math.floor(diff / 60000);

    if (m < 60) return `${m} phút trước`;

    const h = Math.floor(m / 60);

    if (h < 24) return `${h} giờ trước`;
    return `${Math.floor(h / 24)} ngày trước`;
};

const avatarInitials = (name) => {
    return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}
function CommentItem({ id, content, author, createAt,authorId}) {

    const {user,deleteComment} = useCommentContext();
    const [showModal, setShowModal] = useState(false);
    const canDelete = user && (user._id === authorId|| user.role === 'admin')// For now, allow all comments to be deletable. You can implement your own logic here.

    return (
        <div className="flex items-start gap-3">
            <Avatar initials={avatarInitials(author)} preview={null} size="sm" />
            <div className="flex-1">
                <div className="flex items-baseline justify-between">
                    <span className="font-head text-sm font-bold text-fwm-text">{author}</span>
                    <span className="text-xs text-fwm-muted">{timeAgo(createAt)}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-fwm-text">{content}</p>
                {canDelete && <button className="mt-2 text-xs text-fwm-muted transition hover:text-red-500"
                  onClick={()=>{setShowModal(true)}}
                >Xóa</button>}
                {showModal && <ConfirmModal message="Ban co chac muon xoa binh luan khong?"
                onCancel={()=>{setShowModal(false)}}
                onConfirm={()=>{
                    deleteComment(id);
                    setShowModal(false);
                }}
                >
                </ConfirmModal>}
            </div>
        </div>
    )
}

export default CommentItem;