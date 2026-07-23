import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from '../context/AuthContext'
import { toggleFavorite } from '../api/auth';

const FavortitesContext = createContext(null);

function toMap(ids) {
    return Object.fromEntries((ids || []).map((id) => [id, true]));
}

export function FavoritesProvider({ children }) {

    const { user, token, setFavorites } = useAuth();
    const [guestLiked, setGuestLiked] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('fwm-favorites') || '{}');
        }
        catch {
            return {};
        }
    });

    useEffect(() => {
        if (!user) localStorage.setItem('fwm-favorites', JSON.stringify(guestLiked));
    }, [guestLiked, user])

    const liked = user ? toMap(user.favorites) : guestLiked;

    const toggleFavorites = async (id) => {
        if (user) {
            try {
                const { favorites } = await toggleFavorite({postId: id, token});
                setFavorites(favorites);
            }
            catch {

            }
        }
        else {
            setGuestLiked((prev) => ({ ...prev, [id]: !prev[id] }));
        }
    }

    const isFavorite = (id) => Boolean(liked[id]);

    return (
        <FavortitesContext.Provider value={{ liked, toggleFavorites, isFavorite }}>
            {children}
        </FavortitesContext.Provider>
    )
}

export function useFavorites() {
    return useContext(FavortitesContext);
}