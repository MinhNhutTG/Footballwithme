import { apiRequest } from './client';

export function login(email, password) {
  return apiRequest('/auth/login', { method: 'POST', body: { email, password } });
}

export function register(name, email, password) {
  return apiRequest('/auth/register', { method: 'POST', body: { name, email, password } });
}

export function toggleFavorite(postId, token) {
  return apiRequest(`/auth/favorites/${postId}`, { method: 'POST', token });
}
