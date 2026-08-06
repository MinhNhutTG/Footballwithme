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