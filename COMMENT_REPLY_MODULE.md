# Module: Trả lời bình luận (Reply)

Mở rộng hệ thống bình luận (`COMMENTS_MODULE.md`, đã có sẵn) để cho phép trả lời trực tiếp 1 bình luận cụ thể, thay vì chỉ có 1 danh sách phẳng như hiện tại.

## Khảo sát hiện trạng (trước khi viết spec)

- `backend/src/models/Comment.js`: schema hiện chỉ có `postId, text, author`, không có khái niệm cha/con nào.
- `backend/src/controllers/commentController.js`: `remove` đang **hard-delete** (`comment.deleteOne()`), không có cờ soft-delete.
- `backend/src/controllers/userController.js` (dòng ~113): xoá tài khoản sẽ `Comment.deleteMany({author: user._id})` — cascade theo tác giả, không theo bài viết. Không đổi ở module này, nhưng cần nhớ: nếu 1 user bị xoá tài khoản, các comment/reply của họ biến mất y hệt cách hiện tại đang làm, không ảnh hưởng gì thêm.
- Frontend: `useComments.js` đang optimistic-update khi thêm (dùng `temp-${Date.now()}`), nhưng xoá thì đợi API xong mới xoá khỏi state (không optimistic).
- `CommentItem.jsx` chỉ có nút Xoá (khi `canDelete`), không có nút Trả lời.

## Quyết định đã chốt

Đã hỏi qua `AskUserQuestion` trước khi viết spec:

1. **Xoá 1 comment gốc đang có reply → soft-delete, giữ thread.** Thêm field `isDeleted` vào `Comment`. Xoá 1 comment gốc **đang có ít nhất 1 reply** → không xoá document, chỉ đổi `isDeleted: true` + xoá nội dung `text`, hiển thị "Bình luận đã bị xoá" thay vì nội dung thật, các reply bên dưới giữ nguyên. **Tinh chỉnh thêm** (không hỏi riêng, là hệ quả tự nhiên của quyết định trên): nếu comment gốc **chưa có reply nào** thì vẫn hard-delete như hành vi cũ — không có gì để "giữ thread" nên không cần để lại xác "[đã xoá]" vĩnh viễn. Xoá 1 **reply** thì luôn hard-delete (reply không thể có "con" — xem quyết định 2).
2. **Chỉ 1 cấp lồng — reply luôn gắn về đúng comment gốc.** Dù bấm "Trả lời" từ chính 1 reply khác, comment mới tạo ra vẫn lưu `parentId` = id của comment **gốc** (không phải id của reply vừa bấm). Việc "flatten" này làm ở **backend** (trong `create`), không phải ở frontend — để đảm bảo đúng ngay cả khi có client khác gọi thẳng API. Hệ quả UI: bản thân 1 reply **không có nút "Trả lời" riêng** (tránh nhầm lẫn "trả lời cái gì" khi đã phẳng 1 cấp) — chỉ comment gốc mới có nút "Trả lời".

**Không cần migration DB:** `parentId` mặc định `null`, `isDeleted` mặc định `false` — comment cũ tự động là comment gốc bình thường, không đổi hành vi.

## Kiến trúc

```
CommentSection.jsx
  └─ CommentProvider(postId) → useComments(postId) → useAuth()
       ├─ GET    /api/comments?postId=..              (public)   → [...comment phẳng cả gốc lẫn reply]
       ├─ POST   /api/comments {postId,text,parentId?} (protect)  → comment mới (parentId đã resolve về gốc)
       └─ DELETE /api/comments/:id                     (protect)  → { mode: 'hard', id } | { mode: 'soft', comment }
                                        │
                                        ▼
                          commentController.create / remove
                                        │
                                        ▼
                     Comment collection — parentId: null (gốc) | ObjectId (reply, luôn trỏ về 1 comment gốc)
```

Hook `useComments` tự nhóm mảng phẳng từ API thành `topLevelComments` + `repliesByParent` (nhóm theo `parentId`) bằng `useMemo` — không cần thêm request riêng cho reply, không cần đổi route (`GET /comments?postId=` vẫn trả về tất cả, gốc lẫn reply, trong 1 lần gọi).

---

## Bước 1 — Backend: thêm field vào `Comment` model

Sửa `backend/src/models/Comment.js` — từ:

```js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    postId: { type: String, required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);
```

thành:

```js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    postId: { type: String, required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);
```

**Kiểm tra:** chưa test được (chưa có controller dùng field mới) — bỏ qua, test gộp ở cuối Bước 2.

---

## Bước 2 — Backend: Controller

Sửa `backend/src/controllers/commentController.js` — từ:

```js
const Comment = require('../models/Comment');

async function list(req, res, next) {
  try {
    const { postId } = req.query;
    if (!postId) return res.status(400).json({ message: 'postId is required' });

    const comments = await Comment.find({ postId })
      .populate('author', 'name avatarUrl')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { postId, text } = req.body;
    if (!postId || !text?.trim()) {
      return res.status(400).json({ message: 'postId and text are required' });
    }

    const comment = await Comment.create({ postId, text: text.trim(), author: req.user.id });
    await comment.populate('author', 'name avatarUrl');
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const isOwner = comment.author.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Not allowed' });

    await comment.deleteOne();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, remove };
```

thành:

```js
const Comment = require('../models/Comment');

async function list(req, res, next) {
  try {
    const { postId } = req.query;
    if (!postId) return res.status(400).json({ message: 'postId is required' });

    const comments = await Comment.find({ postId })
      .populate('author', 'name avatarUrl')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { postId, text, parentId } = req.body;
    if (!postId || !text?.trim()) {
      return res.status(400).json({ message: 'postId and text are required' });
    }

    let resolvedParentId = null;
    if (parentId) {
      const parent = await Comment.findById(parentId);
      if (!parent) return res.status(404).json({ message: 'Parent comment not found' });
      // Luôn gắn reply về comment gốc, kể cả khi bấm "Trả lời" từ 1 reply khác (flatten 1 cấp)
      resolvedParentId = parent.parentId ? parent.parentId : parent._id;
    }

    const comment = await Comment.create({
      postId,
      text: text.trim(),
      author: req.user.id,
      parentId: resolvedParentId,
    });
    await comment.populate('author', 'name avatarUrl');
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const isOwner = comment.author.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Not allowed' });

    // Reply luôn xoá cứng — thiết kế chỉ 1 cấp nên reply không thể có "con"
    if (comment.parentId) {
      await comment.deleteOne();
      return res.json({ mode: 'hard', id: comment._id });
    }

    // Comment gốc: còn reply thì xoá mềm để giữ thread, hết reply thì xoá cứng như cũ
    const replyCount = await Comment.countDocuments({ parentId: comment._id });
    if (replyCount > 0) {
      comment.isDeleted = true;
      comment.text = '';
      await comment.save();
      await comment.populate('author', 'name avatarUrl');
      return res.json({ mode: 'soft', comment });
    }

    await comment.deleteOne();
    res.json({ mode: 'hard', id: comment._id });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, remove };
```

`routes/commentRoutes.js` và cách mount ở `server.js` **giữ nguyên** — không có route mới, `parentId` chỉ là 1 field thêm vào body của `POST /api/comments` đã có sẵn.

**Kiểm tra bằng Postman (trước khi đụng frontend):**
1. `POST /api/comments` với `{postId, text}` (không `parentId`) → comment tạo ra có `parentId: null`.
2. `POST /api/comments` với `{postId, text, parentId: <id comment ở bước 1>}` → comment mới có `parentId` = đúng id đó.
3. `POST /api/comments` với `parentId` = id của **reply vừa tạo ở bước 2** (không phải comment gốc) → comment mới nhất phải có `parentId` = id comment gốc ban đầu, **không phải** id của reply — xác nhận flatten hoạt động đúng.
4. `DELETE /api/comments/:id` với id comment gốc **chưa có reply** → response `{mode: 'hard', id}`, gọi lại `GET` không còn thấy comment đó.
5. `DELETE /api/comments/:id` với id comment gốc **đang có reply** (bước 2/3) → response `{mode: 'soft', comment}` với `comment.isDeleted === true`, `comment.text === ''`; gọi lại `GET` vẫn thấy document đó (không mất), các reply vẫn còn nguyên.
6. `DELETE /api/comments/:id` với id 1 **reply** → luôn `{mode: 'hard', id}`.

---

## Bước 3 — Frontend: `api/comments.js`

Sửa `frontend-rebuild/src/api/comments.js` — từ:

```js
import {apiRequest} from '../api/client';

export function getComments(postId){
    return apiRequest(`/comments?postId=${postId}`);
}

export function addComment(postId, text, token){
    return apiRequest(`/comments`, {method: 'POST', body: {postId, text}, token})
}

export function deleteComment(id, token){
    return apiRequest(`/comments/${id}`, {method: 'DELETE', token: token});
}
```

thành:

```js
import {apiRequest} from '../api/client';

export function getComments(postId){
    return apiRequest(`/comments?postId=${postId}`);
}

export function addComment(postId, text, token, parentId = null){
    return apiRequest(`/comments`, {method: 'POST', body: {postId, text, parentId}, token})
}

export function deleteComment(id, token){
    return apiRequest(`/comments/${id}`, {method: 'DELETE', token: token});
}
```

---

## Bước 4 — Frontend: thêm khoá dịch

Sửa `frontend-rebuild/src/i18n/dict.js`. Khối `comment` đã có (không đổi field cũ, chỉ thêm field mới) — cách dòng 131 (`vi`) và dòng 278 (`en`) hiện tại.

Khối `vi` (dòng 131-144 hiện tại), thêm sau `error`:

```js
        comment: {
            heading: 'Bình luận',
            empty: 'Chưa có bình luận nào.',
            placeholder: 'Viết bình luận của bạn...',
            send: 'Gửi',
            sending: 'Đang gửi...',
            loading: 'Đang tải...',
            loginToComment: 'Đăng nhập để bình luận',
            deleteConfirm: 'Bạn có chắc muốn xóa bình luận này?',
            deleteAction: 'Xóa',
            cancel: 'Hủy',
            filterPlaceholder: 'Lọc bình luận...',
            error: 'Có lỗi xảy ra, vui lòng thử lại.',
            replyAction: 'Trả lời',
            replyPlaceholder: 'Viết trả lời...',
            deletedText: 'Bình luận đã bị xoá',
        },
```

Khối `en` (dòng 278-291 hiện tại), thêm sau `error`:

```js
        comment: {
            heading: 'Comments',
            empty: 'No comments yet.',
            placeholder: 'Write your comment...',
            send: 'Send',
            sending: 'Sending...',
            loading: 'Loading...',
            loginToComment: 'Log in to comment',
            deleteConfirm: 'Are you sure you want to delete this comment?',
            deleteAction: 'Delete',
            cancel: 'Cancel',
            filterPlaceholder: 'Filter comments...',
            error: 'Something went wrong, please try again.',
            replyAction: 'Reply',
            replyPlaceholder: 'Write a reply...',
            deletedText: 'This comment has been deleted',
        },
```

Nút "Huỷ" khi đang gõ reply tái dùng thẳng `t.comment.cancel` đã có sẵn — không thêm khoá `cancelReply` riêng để tránh trùng nghĩa.

---

## Bước 5 — Frontend: `useComments.js` — nhóm comment theo cha/con + xử lý soft/hard delete

Sửa `frontend-rebuild/src/hooks/useComments.js` — từ:

```js
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext'
import { getComments, addComment as addCommentAPI, deleteComment as deleleCommentAPI } from '../api/comments';
export function useComments(postId) {
    const { user, token } = useAuth();
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        getComments(postId)
            .then(setComments)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }, [postId])

    async function addComment(text) {
        const tempId = `temp-${Date.now()}`;
        const temp = {
            _id:tempId,
            text,
            author: {_id: user._id, name: user.name},
            createdAt: new Date().toISOString(),
            isTemp: true,
        };

        setComments((prev)=> [...prev, temp]);

        try{
            const real = await addCommentAPI(postId,text,token);
            setComments((prev)=> prev.map((cmt)=> cmt._id === tempId ? real : cmt))
        }
        catch(err){
            setComments((prev)=> prev.filter((cmt)=> cmt._id !== tempId));
            setError(err.message)
        }
    }

    async function removeComment(id) {
        await deleleCommentAPI(id,token);
        setComments((prev) => prev.filter((c) => c._id !== id));
    }

    return { comments, loading, error, addComment, removeComment, user };

}
```

thành:

```js
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext'
import { getComments, addComment as addCommentAPI, deleteComment as deleleCommentAPI } from '../api/comments';
export function useComments(postId) {
    const { user, token } = useAuth();
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        getComments(postId)
            .then(setComments)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }, [postId])

    async function addComment(text, parentId = null) {
        const tempId = `temp-${Date.now()}`;
        const temp = {
            _id: tempId,
            text,
            author: { _id: user._id, name: user.name },
            createdAt: new Date().toISOString(),
            parentId,
            isTemp: true,
        };

        setComments((prev) => [...prev, temp]);

        try {
            const real = await addCommentAPI(postId, text, token, parentId);
            setComments((prev) => prev.map((cmt) => cmt._id === tempId ? real : cmt))
        }
        catch (err) {
            setComments((prev) => prev.filter((cmt) => cmt._id !== tempId));
            setError(err.message)
        }
    }

    async function removeComment(id) {
        const res = await deleleCommentAPI(id, token);
        if (res.mode === 'soft') {
            setComments((prev) => prev.map((c) => c._id === id ? res.comment : c));
        } else {
            setComments((prev) => prev.filter((c) => c._id !== id));
        }
    }

    const topLevelComments = useMemo(
        () => comments.filter((c) => !c.parentId),
        [comments]
    );

    const repliesByParent = useMemo(() => {
        const map = {};
        comments.forEach((c) => {
            if (c.parentId) {
                (map[c.parentId] ??= []).push(c);
            }
        });
        return map;
    }, [comments]);

    return { topLevelComments, repliesByParent, loading, error, addComment, removeComment, user };

}
```

Điểm khác bản cũ:

- `addComment` nhận thêm tham số `parentId` (mặc định `null` — comment gốc như cũ), truyền tiếp xuống cả comment tạm (optimistic) lẫn API thật, để reply hiện đúng nhóm ngay khi vừa gõ xong (không phải đợi server trả về mới nhảy đúng chỗ).
- `removeComment` đọc `res.mode` từ response mới của backend: `'soft'` → thay thế item trong state bằng `res.comment` (đã có `isDeleted: true`, giữ nguyên vị trí, không mất reply bên dưới); `'hard'` → lọc bỏ như cũ.
- `topLevelComments`/`repliesByParent` tính bằng `useMemo` từ `comments` — không đổi cách fetch (vẫn 1 request `GET` như cũ), chỉ nhóm lại phía client. **`comments` (mảng phẳng) không còn được trả ra ngoài** — component dùng `topLevelComments` + `repliesByParent` thay vì tự filter/group lại.

---

## Bước 6 — Frontend: `CommentInput.jsx` — hỗ trợ chế độ reply (có nút Huỷ)

Sửa `frontend-rebuild/src/components/comment/CommentInput.jsx` — từ:

```jsx
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
```

thành:

```jsx
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
```

Điểm khác bản cũ: thêm 3 prop tuỳ chọn — `placeholder` (nếu không truyền thì vẫn dùng `t.comment.placeholder` như cũ, ô nhập bình luận gốc ở `CommentSection` không cần đổi gì), `autoFocus` (để tự focus khi vừa bấm "Trả lời"), `onCancel` (chỉ hiện nút "Huỷ" khi có truyền hàm này — ô nhập bình luận gốc không truyền nên không có nút Huỷ, giữ nguyên giao diện cũ).

---

## Bước 7 — Frontend: `CommentItem.jsx` — nút Trả lời + hiện reply lồng bên dưới + hiển thị "đã xoá"

Sửa `frontend-rebuild/src/components/comment/CommentItem.jsx` — từ:

```jsx
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
            <Avatar initials={initial} size="sm" preview={comment.author.avatarUrl} />
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
```

thành:

```jsx
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
```

Điểm khác bản cũ:

- Prop mới `replies` (mảng, mặc định `[]`) và `isReply` (mặc định `false`) — `CommentSection` chỉ truyền `replies` cho comment gốc, còn khi tự render reply (đệ quy 1 lần duy nhất, không lồng thêm) thì truyền `isReply` để ẩn nút "Trả lời" (đúng quyết định "chỉ 1 cấp").
- `canDelete` thêm điều kiện `!comment.isDeleted` — bình luận đã xoá mềm rồi thì không hiện nút Xoá nữa (tránh xoá lần 2 vô nghĩa).
- Nội dung hiển thị: `comment.isDeleted ? t.comment.deletedText : comment.text` — chữ nghiêng, màu `fwm-muted` để phân biệt trực quan với bình luận thật.
- Nút "Trả lời" chỉ hiện khi `!isReply && user` (đăng nhập mới trả lời được, và chỉ ở comment gốc). Bấm vào toggle `showReplyInput`, hiện `CommentInput` tái dùng (Bước 6) ngay dưới, với `placeholder` riêng + `autoFocus` + `onCancel` đóng lại.
- `handleReplySubmit` gọi `addComment(text, comment._id)` — `comment._id` ở đây luôn là id của comment đang render, và vì nút Trả lời chỉ có ở comment gốc (`!isReply`) nên `comment._id` chắc chắn là id gốc, không cần lo phần flatten (đã xử lý ở backend Bước 2 phòng trường hợp gọi API trực tiếp).
- Render danh sách `replies` ngay dưới, thụt lề `ml-10`, mỗi reply là 1 `<CommentItem isReply>` — dùng lại đúng component, không tạo `ReplyItem` riêng.

---

## Bước 8 — Frontend: `CommentSection.jsx` — dùng `topLevelComments` + `repliesByParent`

Sửa `frontend-rebuild/src/components/comment/CommentSection.jsx` — từ:

```jsx
import CommentItem from "./CommentItem";
import { Link } from "react-router-dom";
import { useLang } from '../../context/LangContext'
import { useEffect, useState, useTransition, useMemo } from "react";
import { useLayoutEffect, useRef } from "react";
import { CommentProvider, useCommentContext } from "../../context/CommentContext";
import CommentInput from "./CommentInput";
function CommentSectionContent() {
    const { t } = useLang();
    const { comments, loading, error, addComment, removeComment, user } = useCommentContext();
    const listRef = useRef(null);
    const inputRef = useRef(null);
    const [filter, setFilter] = useState('');
    const [isPending, startTransition] = useTransition();


    useLayoutEffect(() => {
        const element = listRef.current;
        if (element) element.scrollTop = element.scrollHeight;
    }, [comments.length]);

    useEffect(() => {
        inputRef.current?.focus();
    }, [])
    function handleFilter(value) {
        startTransition(() => setFilter(value));
    }

    const filtered = useMemo(
        () => comments.filter((c) => c.text.toLowerCase().includes(filter.toLowerCase())),
        [comments, filter]
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
                    <CommentItem key={cmt._id} comment={cmt}></CommentItem>
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
```

thành:

```jsx
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
```

Điểm khác bản cũ: đổi tên biến lấy từ context (`comments` → `topLevelComments`, thêm `repliesByParent`), filter/scroll-effect dùng `topLevelComments` thay vì `comments` (lọc theo text vẫn chỉ áp dụng cho comment gốc — reply luôn hiện đủ theo đúng comment gốc còn hiển thị, không lọc riêng reply, tránh rối). Mỗi `<CommentItem>` gốc được truyền thêm `replies={repliesByParent[cmt._id] || []}`.

`ArticleDetail.jsx` **không cần đổi gì** — vẫn `<CommentSection postId={article.id}>` như cũ.

---

## Kiểm tra cuối (test tay luồng thật)

1. Mở 1 bài viết, đăng nhập, viết 1 comment gốc → thấy nút "Trả lời" xuất hiện cạnh thời gian.
2. Bấm "Trả lời" → hiện ô nhập riêng bên dưới (thụt lề), tự động focus, có nút "Gửi" + "Huỷ".
3. Gõ và gửi reply → reply hiện thụt lề dưới comment gốc, **không có** nút "Trả lời" trên chính reply đó.
4. Bấm "Huỷ" khi đang gõ reply (chưa gửi) → ô nhập đóng lại, không tạo comment nào.
5. Đăng nhập bằng tài khoản khác, mở lại bài viết → thấy đúng cấu trúc gốc + reply như tài khoản đầu (dữ liệu dùng chung, không phải state cục bộ).
6. Xoá 1 comment gốc **chưa có reply** → biến mất hoàn toàn khỏi danh sách (hard-delete, giống hành vi cũ).
7. Xoá 1 comment gốc **đang có reply** → comment đó **không biến mất**, chỉ đổi text thành "Bình luận đã bị xoá" (chữ nghiêng, mờ), không còn nút Xoá/Trả lời trên nó nữa, nhưng **các reply bên dưới vẫn còn nguyên** và vẫn đọc được.
8. Xoá 1 reply → reply đó biến mất hoàn toàn khỏi danh sách (hard-delete), comment gốc và các reply khác không đổi.
9. F5 lại trang → toàn bộ cấu trúc gốc/reply, kể cả bình luận đã xoá mềm, hiển thị lại đúng như trước khi F5.
10. Gõ vào ô lọc ("Lọc bình luận...") theo đúng text của 1 comment gốc → chỉ comment gốc đó hiện ra, reply của nó vẫn hiện đầy đủ bên dưới (lọc không ẩn mất reply).
