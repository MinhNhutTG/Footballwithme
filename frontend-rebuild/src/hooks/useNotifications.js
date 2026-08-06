import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNotifications, getUnreadCount, markAllRead as markAllReadAPI } from '../api/notifications';

export function useNotifications() {
    const { token } = useAuth();
    const location = useLocation();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const refreshCount = useCallback(() => {
        if (!token) return;
        getUnreadCount(token).then((res) => setUnreadCount(res.count)).catch(() => {});
    }, [token]);

    useEffect(() => {
        refreshCount();
    }, [location.pathname, refreshCount]);

    useEffect(() => {
        if (!token) return;
        const interval = setInterval(refreshCount, 60000);
        return () => clearInterval(interval);
    }, [token, refreshCount]);

    const openNotifications = useCallback(async () => {
        if (!token) return;
        const list = await getNotifications(token);
        setNotifications(list);
        if (unreadCount > 0) {
            await markAllReadAPI(token);
            setUnreadCount(0);
        }
    }, [token, unreadCount]);

    return { notifications, unreadCount, openNotifications };
}
