import { apiRequest } from '../api/client';

export function sendContactMessage({ name, email, message }) {
    return apiRequest('/contact', { method: 'POST', body: { name, email, message } });
}
