import { apiRequest } from "./client";

export function getComments(postId) {
    return apiRequest(`/comments?postId=${postId}`);
}

export function addComment(postId, text, token) {
    return apiRequest('/comments', { method: 'POST', body: { postId, text }, token })
}

export function deleteComment(id, token) {
    return apiRequest(`/comments/${id}`, { method: 'DELETE', token })
}

