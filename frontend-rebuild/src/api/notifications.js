import { apiRequest } from '../api/client';

export function getNotifications(token) {
    return apiRequest('/notifications', { token });
}

export function getUnreadCount(token) {
    return apiRequest('/notifications/unread-count', { token });
}

export function markAllRead(token) {
    return apiRequest('/notifications/mark-read', { method: 'POST', token });
}
