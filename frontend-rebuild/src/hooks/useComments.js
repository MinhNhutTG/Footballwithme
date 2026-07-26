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