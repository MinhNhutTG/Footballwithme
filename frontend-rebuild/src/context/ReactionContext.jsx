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
