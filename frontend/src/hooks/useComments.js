import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {getComments,addComment,deleteComment} from '../api/comment';


function useComments(postId) {
    const {user,token} = useAuth();
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        getComments(postId, token)
            .then((data) =>{
                console.log('comments',data);
                setComments(data);
            })
            .catch((err)=>{
                setError(err.message);
            })
            .finally(()=>{
                setLoading(false);
            })
    },[postId]);

    const addComment_hook = useCallback( async(text)=>{
        const tempComment = {
            _id: Date.now().toString(),
            text,
            author:  {_id: user._id, name: user.name},
            createdAt: new Date().toISOString()
        }
        setComments((prev)=> [...prev, tempComment]);
        try{
            const real =  await addComment(postId, text, token);
            setComments(prev => prev.map(c => c._id === tempComment._id ? real : c));
        }
        catch(err){
            setComments(prev => prev.filter((c)=> c._id !== tempComment._id));
            setError(err.message);
        }
        
       
    },[postId, token]);

    const deleteComment_hook = useCallback( async (commentId)=>{
        await deleteComment(commentId, token);
        setComments(prev => prev.filter(c=> c._id !== commentId));
    },[token]);

    return {comments, loading, error, user, addComment: addComment_hook, deleteComment: deleteComment_hook};
}

export default useComments;