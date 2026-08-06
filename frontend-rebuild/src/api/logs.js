import { apiRequest } from '../api/client';

export function logVisit(path, token) {
    return apiRequest('/logs', { method: 'POST', body: { path }, token });
}

export function fetchLogs(page, limit, token) {
    return apiRequest(`/logs?page=${page}&limit=${limit}`, { token });
}
