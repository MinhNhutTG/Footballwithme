import { apiRequest } from './client';

function normalize(post) {
  return { ...post, id: post._id };
}

export async function fetchPosts(category) {
  const query = category ? `?category=${category}` : '';
  const posts = await apiRequest(`/posts${query}`);
  return posts.map(normalize);
}

export async function fetchPost(id) {
  const post = await apiRequest(`/posts/${id}`);
  return normalize(post);
}

export async function createPost(data, token) {
  const post = await apiRequest('/posts', { method: 'POST', body: data, token });
  return normalize(post);
}

export async function updatePost(id, data, token) {
  const post = await apiRequest(`/posts/${id}`, { method: 'PUT', body: data, token });
  return normalize(post);
}

export async function deletePost(id, token) {
  return apiRequest(`/posts/${id}`, { method: 'DELETE', token });
}
