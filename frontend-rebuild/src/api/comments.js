import {apiRequest} from '../api/client';

export function getComments(postId){
    return apiRequest(`/comments?postId=${postId}`);
}

export function addComment(postId, text, token, parentId = null){
    return apiRequest(`/comments`, {method: 'POST', body: {postId, text, parentId}, token})
}

export function deleteComment(id, token){
    return apiRequest(`/comments/${id}`, {method: 'DELETE', token: token});
}

export function fetchAllComments(page, limit, token) {
    return apiRequest(`/comments/admin?page=${page}&limit=${limit}`, { token });
}