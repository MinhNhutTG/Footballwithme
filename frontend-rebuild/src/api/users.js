import {apiRequest} from './client'

export function fetchUsers(token){
    return apiRequest('/users', {token});
}

export function updateUserRole(id, role, token){
    return apiRequest(`/users/${id}/role`, {method: 'PUT', body: {role}, token});
}

export function deleteUser(id, token){
    return apiRequest(`/users/${id}`, {method: 'DELETE', token});
}

export function getMe(token){
    return apiRequest('/users/me', {token});
}

export function updateMe(data, token){
    return apiRequest('/users/me', {method: 'PUT', body: data, token});
}