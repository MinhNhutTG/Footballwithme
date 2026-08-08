import { apiRequest } from './client';

export function fetchSettings() {
    return apiRequest('/settings');
}

export function updateSettings(payload, token) {
    return apiRequest('/settings', { method: 'PUT', body: payload, token });
}
