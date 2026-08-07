import { apiRequest } from '../api/client';

export function fetchAnalytics(token) {
    return apiRequest('/analytics/overview', { token });
}
