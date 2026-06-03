import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('drivoai_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401 (refresh logic can be added later)
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401) {
      const path = window.location.pathname;
      if (!path.startsWith('/login') && !path.startsWith('/register') && path !== '/') {
        // Soft redirect
        localStorage.removeItem('drivoai_token');
        localStorage.removeItem('drivoai_refresh');
        localStorage.removeItem('drivoai_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function fileUrl(fileId) {
  if (!fileId) return null;
  return `${API}/files/${fileId}`;
}

export function avatarSeedUrl(seed) {
  // Dicebear avatars as deterministic illustration for template personas
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed || 'drivoai')}&backgroundColor=12121a,1c1c28`;
}


