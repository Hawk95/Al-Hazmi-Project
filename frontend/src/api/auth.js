import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8003/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('erp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('erp_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export async function login(credentials) {
  const response = await api.post('/auth/login', credentials);
  localStorage.setItem('erp_token', response.data.access_token);
  try {
    const perms = await api.get('/auth/me').then(r => r.data);
    localStorage.setItem('erp_perms', JSON.stringify(perms));
  } catch {}
  return response.data;
}

export function logout() {
  localStorage.removeItem('erp_token');
  localStorage.removeItem('erp_perms');
}

export async function getMe() {
  const r = await api.get('/auth/me');
  localStorage.setItem('erp_perms', JSON.stringify(r.data));
  return r.data;
}

export function hasHRAccess() {
  try {
    const raw = localStorage.getItem('erp_perms');
    if (!raw) {
      // Perms not cached yet — refresh in background, show link optimistically
      getMe().catch(() => {});
      return true;
    }
    const p = JSON.parse(raw);
    return !!(p.is_admin || p.hr_access);
  } catch { return true; }
}

export function isAuthenticated() {
  const token = localStorage.getItem('erp_token');
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function getToken() {
  return localStorage.getItem('erp_token');
}

export function getCurrentUser() {
  const token = localStorage.getItem('erp_token');
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}
