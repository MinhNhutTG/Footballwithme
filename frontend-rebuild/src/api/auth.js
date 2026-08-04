import {apiRequest} from './client'

export function login({email, password}){
    return apiRequest("/auth/login", {method:'POST', body:{email,password}});
}

export function register({name, email, password}){
    return apiRequest("/auth/register", {method:'POST', body: {name, email, password}});
}

export function toggleFavorite({postId, token}){
    return apiRequest(`/auth/favorites/${postId}`,{method:'POST',token});
}

export function googleAuth(credential){
    return apiRequest('/auth/google', {method: 'POST', body: {credential}});
}

export function forgotPassword(email){
    return apiRequest('/auth/forgot-password',{method: 'POST',body: {email}});
}

export function resetPassword(token, password){
    return apiRequest('/auth/reset-password', {method: 'POST', body: {token, password}});
}

export function verifyEmail(token){
    return apiRequest('/auth/verify-email', {method: 'POST', body: {token}});
}

export function resendVerification(email){
    return apiRequest('/auth/resend-verification', {method: 'POST', body: {email}});
}