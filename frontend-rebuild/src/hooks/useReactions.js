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