# Module: Reaction bài viết (Like/Dislike/Haha/Giận dữ)

Module fullstack tiếp theo sau Lượt xem/Phổ biến (`VIEWS_MODULE.md`, ✅ xong). Khác `views` ở chỗ: `views` là bộ đếm vô danh (ai xem cũng +1, không biết ai xem), còn reaction phải biết **user nào đã thả gì** để cho phép đổi ý / huỷ, và mỗi user chỉ được 1 reaction/bài viết tại một thời điểm.

## Quyết định đã chốt

Đã hỏi qua `AskUserQuestion` trước khi viết spec:

1. **4 loại reaction cố định** (`like`, `dislike`, `haha`, `angry`) — dùng `enum` cứng trong schema Mongoose, giống cách `Post.category` đang làm (`enum: ['skill', 'tactic', 'exp', 'player']`). Không thiết kế để mở rộng thêm loại sau này — không có nhu cầu, thêm phức tạp không cần thiết.
2. **4 ảnh icon (AI-generated, ảnh cầu thủ cartoon) lưu bundle tĩnh trong frontend**, không qua Cloudinary — vì icon dùng chung cho mọi bài viết, không đổi theo thời gian, không phải nội dung user upload. Cloudinary chỉ dùng cho nội dung do user/admin upload (avatar, cover, video) — reaction icon không thuộc loại đó.
3. **Bấm lại đúng icon đang chọn → huỷ reaction** (giống toggle favorite hiện có), không phải "không có tác dụng gì".

**Lưu ý về ảnh icon:** 4 ảnh AI-generated thật (cầu thủ cartoon) chưa có sẵn — việc tạo ảnh nằm ngoài phạm vi code. Spec này dùng **emoji làm placeholder** (👍 👎 😂 😡) để tính năng chạy được đầu-cuối ngay, tách riêng khỏi việc có ảnh AI hay chưa. Khi có ảnh thật, chỉ cần sửa đúng 1 file (`src/config/reactions.js`, xem Bước 5) — không đụng logic gì khác.

**Không cần migration DB:** khác `isVerified` (thêm field mặc định khoá tính năng lên collection `User` đã có dữ liệu), `Reaction` là **collection hoàn toàn mới**, không thêm field nào vào `Post`/`User` — không có dữ liệu cũ nào bị khoá.

## Kiến trúc

Theo đúng pattern `Comment` đang dùng (collection riêng, mount route riêng ở `/api/reactions`, `postId` truyền qua query string) — không nhét route con dưới `/api/posts/:id/reactions` để tránh việc phải nhớ thêm 1 kiểu route lồng nhau khác với comment.

```
ArticleDetail.jsx
  └─ ReactionBar (postId)
       └─ ReactionProvider → useReactions(postId) → useAuth() (user, token)
            ├─ GET  /api/reactions?postId=..      (public)   → { like, dislike, haha, angry }
            ├─ GET  /api/reactions/me?postId=..   (protect)  → { type: 'like' | null }
            └─ POST /api/reactions {postId,type}  (protect)  → { counts, mine }
                                        │
                                        ▼
                          reactionController.setReaction
                                        │
                                        ▼
                     Reaction collection (Mongo), unique index (postId, user)
                     ── chưa có reaction của user   → tạo mới, type = loại vừa bấm
                     ── có, type trùng loại vừa bấm  → xoá document (huỷ reaction)
                     ── có, type khác loại vừa bấm   → update type
```

---

## Bước 1 — Backend: Model `Reaction`

Tạo file mới `backend/src/models/Reaction.js`:

```js
const mongoose = require('mongoose');

const REACTION_TYPES = ['like', 'dislike', 'haha', 'angry'];

const reactionSchema = new mongoose.Schema(
  {
    postId: { type: String, required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: REACTION_TYPES, required: true },
  },
  { timestamps: true }
);

reactionSchema.index({ postId: 1, user: 1 }, { unique: true });

const Reaction = mongoose.model('Reaction', reactionSchema);
Reaction.TYPES = REACTION_TYPES;

module.exports = Reaction;
```

Giống `Comment.postId` (dòng liên kết lỏng, lưu `String` chứ không `ref: 'Post'`) — nhất quán với pattern hiện có, không đổi.

`reactionSchema.index({ postId: 1, user: 1 }, { unique: true })` là dòng quan trọng nhất: đảm bảo 1 user không thể có 2 document reaction trên cùng 1 bài viết, kể cả nếu code phía trên có bug.

**Kiểm tra:** mở Mongo shell/Compass sau khi chạy backend lần đầu, xem collection `reactions` đã tạo index unique `(postId, user)` chưa (`db.reactions.getIndexes()`).

---

## Bước 2 — Backend: Controller

Tạo file mới `backend/src/controllers/reactionController.js`:

```js
const Reaction = require('../models/Reaction');

async function countByType(postId) {
  const rows = await Reaction.aggregate([
    { $match: { postId } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);
  const counts = { like: 0, dislike: 0, haha: 0, angry: 0 };
  rows.forEach((r) => { counts[r._id] = r.count; });
  return counts;
}

async function getCounts(req, res, next) {
  try {
    const { postId } = req.query;
    if (!postId) return res.status(400).json({ message: 'postId is required' });

    const counts = await countByType(postId);
    res.json(counts);
  } catch (err) {
    next(err);
  }
}

async function getMine(req, res, next) {
  try {
    const { postId } = req.query;
    if (!postId) return res.status(400).json({ message: 'postId is required' });

    const reaction = await Reaction.findOne({ postId, user: req.user.id });
    res.json({ type: reaction ? reaction.type : null });
  } catch (err) {
    next(err);
  }
}

async function setReaction(req, res, next) {
  try {
    const { postId, type } = req.body;
    if (!postId || !type) {
      return res.status(400).json({ message: 'postId and type are required' });
    }
    if (!Reaction.TYPES.includes(type)) {
      return res.status(400).json({ message: 'Invalid reaction type' });
    }

    const existing = await Reaction.findOne({ postId, user: req.user.id });

    let mine = type;
    if (!existing) {
      await Reaction.create({ postId, user: req.user.id, type });
    } else if (existing.type === type) {
      await existing.deleteOne();
      mine = null;
    } else {
      existing.type = type;
      await existing.save();
    }

    const counts = await countByType(postId);
    res.json({ counts, mine });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCounts, getMine, setReaction };
```

`countByType` tách riêng vì dùng lại y hệt ở cả `getCounts` lẫn `setReaction` (trả counts mới nhất sau khi ghi, để frontend không cần gọi thêm 1 request GET riêng sau khi bấm).

**Kiểm tra:** chưa test được qua HTTP vì chưa có route (Bước 3) — bỏ qua, test gộp ở cuối Bước 3.

---

## Bước 3 — Backend: Routes + mount vào `server.js`

Tạo file mới `backend/src/routes/reactionRoutes.js`:

```js
const express = require('express');
const { getCounts, getMine, setReaction } = require('../controllers/reactionController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', getCounts);
router.get('/me', protect, getMine);
router.post('/', protect, setReaction);

module.exports = router;
```

`'/'` và `'/me'` là 2 path literal khác nhau (không phải `/:id` kiểu param) nên không dính lỗi thứ tự route như vụ `DELETE /users/me` bị `/:id` bắt nhầm ở `DELETE_ACCOUNT_MODULE.md` — nhưng vẫn khai báo `/me` tách biệt cho rõ ràng.

Sửa `backend/src/server.js` — thêm require ở đầu, cùng chỗ với các route khác:

```js
const commentRoutes = require('./routes/commentRoutes');
const reactionRoutes = require('./routes/reactionRoutes');
```

Và mount route, ngay dưới dòng `app.use('/api/comments', commentRoutes);`:

```js
app.use('/api/comments', commentRoutes);
app.use('/api/reactions', reactionRoutes);
```

**Kiểm tra (dùng curl hoặc Postman, cần backend đang chạy + 1 token JWT hợp lệ):**
1. `GET /api/reactions?postId=abc` (không cần token) → trả `{"like":0,"dislike":0,"haha":0,"angry":0}`.
2. `GET /api/reactions/me?postId=abc` không có token → 401.
3. `POST /api/reactions` body `{"postId":"abc","type":"like"}` kèm token → trả `{"counts":{"like":1,...},"mine":"like"}`.
4. Gọi lại y hệt bước 3 lần nữa (cùng type `like`) → `mine` phải về `null`, `counts.like` về `0` (huỷ reaction).
5. `POST` với `type` không hợp lệ (vd `"love"`) → 400.

---

## Bước 4 — Frontend: `api/reactions.js`

Tạo file mới `frontend-rebuild/src/api/reactions.js`:

```js
import { apiRequest } from '../api/client';

export function getReactionCounts(postId) {
    return apiRequest(`/reactions?postId=${postId}`);
}

export function getMyReaction(postId, token) {
    return apiRequest(`/reactions/me?postId=${postId}`, { token });
}

export function setReaction(postId, type, token) {
    return apiRequest(`/reactions`, { method: 'POST', body: { postId, type }, token });
}
```

Y hệt cấu trúc `api/comments.js` — dùng chung `apiRequest` từ `api/client.js`, không cần sửa gì ở `client.js`.

---

## Bước 5 — Frontend: config 4 loại icon

Tạo file mới `frontend-rebuild/src/config/reactions.js`:

```js
export const REACTIONS = [
    { type: 'like', label: 'Thích', emoji: '👍' },
    { type: 'dislike', label: 'Không thích', emoji: '👎' },
    { type: 'haha', label: 'Haha', emoji: '😂' },
    { type: 'angry', label: 'Giận dữ', emoji: '😡' },
];
```

**Khi có ảnh AI-generated thật (cầu thủ cartoon) sau này:** đặt 4 file ảnh vào `frontend-rebuild/src/assets/reactions/` (vd `like.png`, `dislike.png`, `haha.png`, `angry.png`), import và đổi field `emoji` thành `icon`:

```js
import likeImg from '../assets/reactions/like.png';
// ...
export const REACTIONS = [
    { type: 'like', label: 'Thích', icon: likeImg },
    // ...
];
```

rồi trong `ReactionBar.jsx` (Bước 8) đổi `<span>{r.emoji}</span>` thành `<img src={r.icon} className="h-5 w-5" alt={r.label} />`. Chỉ 2 chỗ này cần sửa, không đụng backend hay logic toggle.

---

## Bước 6 — Frontend: thêm khoá dịch (i18n)

Sửa `frontend-rebuild/src/i18n/dict.js` — thêm key `reaction` cùng cấp với `comment`, ở cả khối `vi` và khối `en`.

Trong khối `vi` (ngay sau đoạn `comment: { ... },` kết thúc ở dòng 144 hiện tại):

```js
        reaction: {
            loginToReact: 'Đăng nhập để thả cảm xúc',
        },
```

Trong khối `en` (ngay sau đoạn `comment: { ... },` kết thúc ở dòng 288 hiện tại):

```js
        reaction: {
            loginToReact: 'Log in to react',
        },
```

---

## Bước 7 — Frontend: hook `useReactions`

Tạo file mới `frontend-rebuild/src/hooks/useReactions.js`:

```js
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getReactionCounts, getMyReaction, setReaction as setReactionAPI } from '../api/reactions';

const EMPTY_COUNTS = { like: 0, dislike: 0, haha: 0, angry: 0 };

export function useReactions(postId) {
    const { user, token } = useAuth();
    const [counts, setCounts] = useState(EMPTY_COUNTS);
    const [mine, setMine] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            getReactionCounts(postId),
            user ? getMyReaction(postId, token) : Promise.resolve({ type: null }),
        ])
            .then(([countsRes, mineRes]) => {
                setCounts(countsRes);
                setMine(mineRes.type);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [postId, user, token]);

    const toggleReaction = useCallback(async (type) => {
        if (!user) return;

        const prevCounts = counts;
        const prevMine = mine;

        const nextCounts = { ...counts };
        let nextMine;
        if (mine === type) {
            nextCounts[type] = Math.max(0, nextCounts[type] - 1);
            nextMine = null;
        } else {
            if (mine) nextCounts[mine] = Math.max(0, nextCounts[mine] - 1);
            nextCounts[type] = (nextCounts[type] ?? 0) + 1;
            nextMine = type;
        }
        setCounts(nextCounts);
        setMine(nextMine);

        try {
            const res = await setReactionAPI(postId, type, token);
            setCounts(res.counts);
            setMine(res.mine);
        } catch (err) {
            setCounts(prevCounts);
            setMine(prevMine);
        }
    }, [postId, token, user, counts, mine]);

    return { counts, mine, loading, toggleReaction, user };
}
```

Giống hệt cấu trúc `useComments.js` (cùng lấy `user, token` từ `useAuth()`, cùng cách trả `user` ra ngoài để component quyết định hiện nút hay hiện link đăng nhập).

**Cập nhật ở Bước 11 (sau khi test thấy đổi trạng thái bị chậm):** ban đầu `toggleReaction` chỉ gọi API rồi mới `setCounts`/`setMine` khi có response — khiến UI phải chờ round-trip mạng mới đổi. Đổi sang **optimistic update**: tính trước `nextCounts`/`nextMine` dựa theo đúng logic 3 nhánh của backend (bấm lại đúng loại đang chọn → huỷ; chưa có → thêm mới; có nhưng khác loại → chuyển loại), `setCounts`/`setMine` ngay lập tức, gọi API nền và đồng bộ lại theo response thật (phòng trường hợp lệch, ví dụ 2 tab cùng bấm); nếu API lỗi thì rollback về `prevCounts`/`prevMine`. `counts`, `mine` phải thêm vào dependency array của `useCallback` vì đọc giá trị hiện tại trực tiếp (không dùng functional updater).

---

## Bước 8 — Frontend: context `ReactionContext`

Tạo file mới `frontend-rebuild/src/context/ReactionContext.jsx`:

```jsx
import { createContext, useContext } from "react"
import { useReactions } from "../hooks/useReactions";

const ReactionContext = createContext(null);

export function ReactionProvider({ postId, children }) {
    const value = useReactions(postId);
    return (
        <ReactionContext.Provider value={value}>{children}</ReactionContext.Provider>
    )
}

export function useReactionContext() {
    return useContext(ReactionContext);
}
```

Y hệt `CommentContext.jsx`.

---

## Bước 9 — Frontend: component `ReactionBar`

Tạo file mới `frontend-rebuild/src/components/reaction/ReactionBar.jsx`:

```jsx
import { Link } from "react-router-dom";
import { useLang } from "../../context/LangContext";
import { ReactionProvider, useReactionContext } from "../../context/ReactionContext";
import { REACTIONS } from "../../config/reactions";

function ReactionBarContent() {
    const { t } = useLang();
    const { counts, mine, loading, toggleReaction, user } = useReactionContext();

    if (loading) return null;

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-fwm-lg border border-fwm-line bg-fwm-card px-4 py-3">
            {REACTIONS.map((r) => {
                const active = mine === r.type;
                return (
                    <button
                        key={r.type}
                        type="button"
                        disabled={!user}
                        onClick={() => toggleReaction(r.type)}
                        title={r.label}
                        className={`flex items-center gap-1.5 rounded-fwm-pill border px-3 py-1.5 text-sm font-bold transition active:scale-95 ${active
                            ? 'border-fwm-accent bg-fwm-accent/10 text-fwm-accent'
                            : 'border-fwm-line text-fwm-muted hover:border-fwm-accent hover:text-fwm-accent'
                            } ${!user ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                        <span className="text-base">{r.emoji}</span>
                        <span>{counts[r.type] ?? 0}</span>
                    </button>
                );
            })}
            {!user && (
                <Link to="/dang-nhap" className="ml-auto text-xs font-bold text-fwm-accent hover:underline">
                    {t.reaction.loginToReact}
                </Link>
            )}
        </div>
    );
}

function ReactionBar({ postId }) {
    return (
        <ReactionProvider postId={postId}>
            <ReactionBarContent></ReactionBarContent>
        </ReactionProvider>
    )
}

export default ReactionBar;
```

Cùng kiểu tách "component ngoài mở Provider, component trong đọc context" như `CommentSection.jsx`.

---

## Bước 10 — Frontend: gắn vào `ArticleDetail.jsx`

Sửa `frontend-rebuild/src/pages/ArticleDetail.jsx`.

Thêm import, cùng nhóm với import `CommentSection` (dòng 8 hiện tại):

```jsx
import CommentSection from '../components/comment/CommentSection'
import ReactionBar from '../components/reaction/ReactionBar'
```

Thêm `<ReactionBar>` ngay trước khối `<ErrorBoundary>` bọc `CommentSection` (dòng 147-153 hiện tại). Đoạn cuối file đổi từ:

```jsx
            {related.length > 0 && (
                <section className="mx-auto max-w-6xl border-t border-fwm-line px-4 py-12">
                    <h2 className="mb-6 font-head text-xl font-extrabold text-fwm-text">
                        {t.article.relatedHeading}
                    </h2>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {related.map((a) => <ArticleCard key={a.id} article={a}></ArticleCard>)}
                    </div>
                </section>
            )}
            <ErrorBoundary fallback={
                <p className="mx-auto max-w-3xl px-4 py-8 text-sm text-fwm-muted">
                    Không thể tải bình luận lúc này.
                </p>
            }>
                <CommentSection postId={article.id}></CommentSection>
            </ErrorBoundary>
```

thành:

```jsx
            {related.length > 0 && (
                <section className="mx-auto max-w-6xl border-t border-fwm-line px-4 py-12">
                    <h2 className="mb-6 font-head text-xl font-extrabold text-fwm-text">
                        {t.article.relatedHeading}
                    </h2>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {related.map((a) => <ArticleCard key={a.id} article={a}></ArticleCard>)}
                    </div>
                </section>
            )}
            <ErrorBoundary fallback={null}>
                <section className="mx-auto max-w-3xl px-4 pt-10">
                    <ReactionBar postId={article.id}></ReactionBar>
                </section>
            </ErrorBoundary>
            <ErrorBoundary fallback={
                <p className="mx-auto max-w-3xl px-4 py-8 text-sm text-fwm-muted">
                    Không thể tải bình luận lúc này.
                </p>
            }>
                <CommentSection postId={article.id}></CommentSection>
            </ErrorBoundary>
```

`ErrorBoundary` bọc riêng `ReactionBar` (fallback `null` — không hiện gì nếu lỗi, vì reaction không quan trọng bằng nội dung bài viết) để nếu API reaction lỗi thì không kéo sập luôn phần comment bên dưới.

---

## Bước 11 — Điều chỉnh: vị trí + icon đẹp hơn

Quyết định đã chốt qua `AskUserQuestion` (bổ sung sau khi Bước 1-10 đã chạy được):

1. **Vị trí:** chuyển `ReactionBar` lên đặt ngay sau khi đọc xong nội dung bài viết (ngay sau khối `<section>` hai cột `<article>` + `<aside>` "Phổ biến"), đặt **trước** phần "Bài viết liên quan" — thay vì sau như bản gốc (Bước 10) — để người đọc thả cảm xúc ngay lúc vừa đọc xong, không phải cuộn qua khối bài liên quan không ăn nhập mới thấy.
2. **Giao diện:** ban đầu thử kiểu Facebook (1 nút chính + popup hover) nhưng icon trong popup bị nhỏ/xấu — **quyết định quay lại giữ nguyên bố cục gốc Bước 9** (4 nút luôn hiện cạnh nhau, mỗi nút icon+số đếm riêng), chỉ chỉnh cho icon to & đẹp hơn (tăng size, thêm hiệu ứng hover phóng to nhẹ, đậm viền/shadow khi active) — không dùng popup/hover-reveal nữa.

---

### 11a — Di chuyển vị trí trong `ArticleDetail.jsx`

Đoạn hiện tại (Bước 10 — `ReactionBar` nằm **sau** khối `related`):

```jsx
            {related.length > 0 && (
                <section className="mx-auto max-w-6xl border-t border-fwm-line px-4 py-12">
                    <h2 className="mb-6 font-head text-xl font-extrabold text-fwm-text">
                        {t.article.relatedHeading}
                    </h2>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {related.map((a) => <ArticleCard key={a.id} article={a}></ArticleCard>)}
                    </div>
                </section>
            )}
            <ErrorBoundary fallback={null}>
                <section className="mx-auto max-w-3xl px-4 pt-10">
                    <ReactionBar postId={article.id}></ReactionBar>
                </section>
            </ErrorBoundary>
            <ErrorBoundary fallback={
                <p className="mx-auto max-w-3xl px-4 py-8 text-sm text-fwm-muted">
                    Không thể tải bình luận lúc này.
                </p>
            }>
                <CommentSection postId={article.id}></CommentSection>
            </ErrorBoundary>
```

Đổi thành (chỉ **đảo thứ tự** 2 khối `ReactionBar` và `related` cho nhau — các khối khác giữ nguyên y hệt):

```jsx
            <ErrorBoundary fallback={null}>
                <section className="mx-auto max-w-3xl px-4 pt-10">
                    <ReactionBar postId={article.id}></ReactionBar>
                </section>
            </ErrorBoundary>

            {related.length > 0 && (
                <section className="mx-auto max-w-6xl border-t border-fwm-line px-4 py-12">
                    <h2 className="mb-6 font-head text-xl font-extrabold text-fwm-text">
                        {t.article.relatedHeading}
                    </h2>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {related.map((a) => <ArticleCard key={a.id} article={a}></ArticleCard>)}
                    </div>
                </section>
            )}
            <ErrorBoundary fallback={
                <p className="mx-auto max-w-3xl px-4 py-8 text-sm text-fwm-muted">
                    Không thể tải bình luận lúc này.
                </p>
            }>
                <CommentSection postId={article.id}></CommentSection>
            </ErrorBoundary>
```

---

### 11b — Viết lại `ReactionBar.jsx` với icon to & đẹp hơn

Thay **toàn bộ** nội dung `frontend-rebuild/src/components/reaction/ReactionBar.jsx` bằng:

```jsx
import { Link } from "react-router-dom";
import { useLang } from "../../context/LangContext";
import { ReactionProvider, useReactionContext } from "../../context/ReactionContext";
import { REACTIONS } from "../../config/reactions";

function ReactionContent() {
    const { t } = useLang();
    const { counts, mine, loading, toggleReaction, user } = useReactionContext();

    if (loading) return null;
    return (
        <div className="flex flex-wrap items-center gap-2 rounded-fwm-lg border border-fwm-line bg-fwm-card px-4 py-3">
            {REACTIONS.map((reaction) => {
                const active = mine === reaction.type;
                return (
                    <button
                        type="button"
                        key={reaction.type}
                        disabled={!user}
                        onClick={() => toggleReaction(reaction.type)}
                        title={reaction.label}
                        className={`flex items-center gap-2 rounded-fwm-pill border px-3.5 py-2 text-sm font-bold transition hover:scale-105 active:scale-95 ${active
                            ? 'border-fwm-accent bg-fwm-accent/10 text-fwm-accent shadow-sm'
                            : 'border-fwm-line text-fwm-muted hover:border-fwm-accent hover:text-fwm-accent'
                            } ${!user ? 'cursor-not-allowed opacity-60 hover:scale-100' : ''}`}
                    >
                        <img src={reaction.icon} className="h-8 w-8" alt={reaction.label} />
                        <span>{reaction.label}</span>
                        <span className="opacity-70">{counts[reaction.type] ?? 0}</span>
                    </button>
                )
            })}
            {!user && (
                <Link to="/dang-nhap" className="ml-auto text-xs font-bold text-fwm-accent hover:underline">
                    {t.reaction.loginToReact}
                </Link>
            )}
        </div>
    )
}

function ReactionBar({ postId }) {
    return (
        <ReactionProvider postId={postId}>
            <ReactionContent />
        </ReactionProvider>
    )
}

export default ReactionBar;
```

Điểm khác bản cũ (Bước 9): icon từ `h-5 w-5` tăng lên `h-8 w-8` cho rõ hình, thêm `hover:scale-105` (phóng to nhẹ khi rê chuột, tắt bằng `hover:scale-100` lúc disabled) và `shadow-sm` khi active để nút đang chọn nổi bật hơn. Không còn popup/hover-reveal — không cần khoá dịch `reaction.like` (đã bỏ khỏi `dict.js`). Thêm `<span>{reaction.label}</span>` hiện chữ nhãn (Thích/Không thích/Haha/Giận dữ) cạnh icon thay vì chỉ có `title` (tooltip) như trước — dễ hiểu ngay không cần rê chuột chờ tooltip; số đếm giảm `opacity-70` để phân biệt với chữ nhãn.

### Kiểm tra riêng cho Bước 11

1. Cuộn hết nội dung bài viết (kể cả video/quote/mistake box) → thấy `ReactionBar` xuất hiện ngay, **trước** phần "Bài viết liên quan".
2. Chưa đăng nhập: cả 4 nút mờ, không phóng to khi hover, có link "Đăng nhập để thả cảm xúc".
3. Đã đăng nhập: icon 4 nút to rõ ràng hơn bản Bước 9, rê chuột vào từng nút thấy phóng to nhẹ.
4. Bấm 1 icon (vd haha) → nút đó tô viền/nền accent + `shadow-sm`, số đếm +1.
5. Bấm nút khác (vd angry) khi đang active haha → haha -1 (mất active), angry +1 (thành active) — không cộng dồn 2 loại cùng lúc.
6. Bấm lại đúng nút đang active → huỷ reaction, không nút nào còn active.
7. F5 lại trang → trạng thái active + số đếm giữ nguyên như trước khi F5.

---

## Kiểm tra cuối (test tay luồng thật)

1. Mở 1 bài viết khi **chưa đăng nhập** → thấy 4 nút reaction với số đếm (ban đầu toàn 0), tất cả nút mờ/disable, có link "Đăng nhập để thả cảm xúc".
2. Đăng nhập, mở lại bài viết đó → 4 nút hết mờ, bấm được.
3. Bấm 👍 → số đếm `like` +1, nút 👍 chuyển màu active (viền/nền `fwm-accent`).
4. Bấm 😂 (khi đang active ở 👍) → `like` -1, `haha` +1, nút active chuyển sang 😂 (không cộng dồn 2 loại cùng lúc).
5. Bấm lại đúng 😂 đang active → `haha` -1, không nút nào còn active (huỷ reaction).
6. Mở bài viết đó bằng **tài khoản khác** (hoặc trình duyệt ẩn danh + đăng nhập tài khoản khác) → thấy đúng tổng số đếm chung, nhưng trạng thái active là của tài khoản này (độc lập với tài khoản kia).
7. F5 lại trang → trạng thái active + số đếm vẫn giữ đúng như trước khi F5 (không mất khi reload).
8. Kiểm tra Mongo: collection `reactions` chỉ có tối đa 1 document cho mỗi cặp `(postId, user)` — thử gọi `POST /api/reactions` 2 lần liên tiếp bằng Postman với cùng `postId`/token nhưng `type` khác nhau, xác nhận không tạo ra 2 document.
