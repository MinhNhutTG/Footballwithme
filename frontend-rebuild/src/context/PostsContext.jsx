import { createContext, useCallback, useContext, useState, useEffect } from "react";
import { fetchPosts } from '../api/posts'
const postsContext = createContext(null);

export function PostsProvider({ children }) {

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const refetch = useCallback(() => {
        setLoading(true);
        return fetchPosts()
            .then((data) => setPosts(data))
            .catch((err) => setError(err.message))
            .finally(() => { setLoading(false) })

    }, [])

    useEffect(() => {
        refetch();
    }, [refetch]);



    return (
        <postsContext.Provider value={{posts,loading,error, refetch}}>
            {children}
        </postsContext.Provider>
    )

}

export  function usePosts() {
    return useContext(postsContext);
}