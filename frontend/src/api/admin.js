import axios from 'axios';
import { getToken } from './auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8003/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getUsers      = ()           => api.get('/admin/users').then(r => r.data);
export const createUser    = (data)       => api.post('/admin/users', data).then(r => r.data);
export const updateUser    = (id, data)   => api.put(`/admin/users/${id}`, data).then(r => r.data);
export const resetPassword = (id, pwd)    => api.put(`/admin/users/${id}/password`, { new_password: pwd }).then(r => r.data);
export const toggleStatus  = (id)         => api.put(`/admin/users/${id}/status`).then(r => r.data);
export const deleteUser    = (id)         => api.delete(`/admin/users/${id}`);
