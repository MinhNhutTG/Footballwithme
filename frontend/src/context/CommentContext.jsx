import { createContext, useContext } from "react";
import useComments from "../hooks/useComments";

const CommentContext = createContext();

export function CommentProvider({ postId, children }) {
    const hook = useComments(postId);

    return (
    <CommentContext.Provider value={hook}>
        {children}
    </CommentContext.Provider>
    )

}

export function useCommentContext() {
    return useContext(CommentContext)
}

