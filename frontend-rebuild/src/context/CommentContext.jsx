import { createContext, useContext } from "react"
import { useComments } from "../hooks/useComments";
const CommentContext = createContext(null);
export function CommentProvider({postId, children}){
    const value = useComments(postId);
    return (
        <CommentContext.Provider value={value}>{children}</CommentContext.Provider>
    )
}

export function useCommentContext(){
    return useContext(CommentContext);
}