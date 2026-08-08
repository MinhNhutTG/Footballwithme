import {apiRequest} from './client'

function normalize(post) {
  return { ...post, id: post._id };
}

export async function fetchPosts({ category, tag, page, limit, sort } = {}){
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (tag) params.set('tag', tag);
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    if (sort) params.set('sort', sort);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiRequest(`/posts${query}`, {method:'GET'});
    return { ...res, data: res.data.map((post) => normalize(post)) };
}

export async function fetchPost(id){
    const post = await apiRequest(`/posts/${id}`);
    return normalize(post);
}

export  async function createPost(data, token){
    const post = await apiRequest('/posts', {method: 'POST', body: data, token});
    return normalize(post);
}

export  async function updatePost(id, data, token){
    const post = await apiRequest(`/posts/${id}`, {method: 'PUT', body: data, token});
    return normalize(post);
}

export async function deletePost(id,token){
    return apiRequest(`/posts/${id}`, {method: 'DELETE', token});
}

export async function viewPost(id){
    return apiRequest(`/posts/${id}/view`, {method: 'POST'});
}