import { apiRequest } from '../api/client';

export function getReactionCounts(postId) {
    return apiRequest(`/reactions?postId=${postId}`);
}

export function getMyReaction(postId, token) {
    return apiRequest(`/reactions/me?postId=${postId}`, {token});
}

export function setReaction(postId,type, token) {
    return apiRequest('/reactions', {method: 'POST', body: {postId, type}, token});
}