import {apiRequest} from './client'

export function fetchUsers(token){
    return apiRequest('/users', {token});
}

export function fetchUserCount(){
    return apiRequest('/users/count');
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

export function changePassword(data, token){
    return apiRequest('/users/change-password', {method: 'PUT', body: data, token});
}

export function deleteAccount(data, token){
    return apiRequest('/users/me' , {method: 'DELETE', body: data, token});
}