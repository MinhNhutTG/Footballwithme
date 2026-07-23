import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { toggleFavorite as toggleFavoriteRequest } from '../api/auth';

const FavoritesContext = createContext(null);

function toMap(ids) {
  return Object.fromEntries((ids || []).map((id) => [id, true]));
}

export function FavoritesProvider({ children }) {
  const { user, token, setFavorites } = useAuth();
  const [guestLiked, setGuestLiked] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fwm-favorites') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!user) localStorage.setItem('fwm-favorites', JSON.stringify(guestLiked));
  }, [guestLiked, user]);

  const liked = user ? toMap(user.favorites) : guestLiked;

  const toggleFavorite = async (id) => {
    if (user) {
      try {
        const { favorites } = await toggleFavoriteRequest(id, token);
        setFavorites(favorites);
      } catch {
        // ignore network errors, UI simply won't update
      }
    } else {
      setGuestLiked((prev) => ({ ...prev, [id]: !prev[id] }));
    }
  };

  const isFavorite = (id) => Boolean(liked[id]);

  return (
    <FavoritesContext.Provider value={{ liked, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFavorites() {
  return useContext(FavoritesContext);
}
