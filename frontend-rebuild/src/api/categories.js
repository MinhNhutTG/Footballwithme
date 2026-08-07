import { apiRequest } from '../api/client';

export function fetchCategories() {
    return apiRequest('/categories');
}

export function createCategory(payload, token) {
    return apiRequest('/categories', { method: 'POST', body: payload, token });
}

export function updateCategory(id, payload, token) {
    return apiRequest(`/categories/${id}`, { method: 'PUT', body: payload, token });
}

export function deleteCategory(id, token) {
    return apiRequest(`/categories/${id}`, { method: 'DELETE', token });
}
