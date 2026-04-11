import axios from 'axios';

// In production, frontend is served by the same Express server → use relative paths.
// In dev, the Vite dev server runs on a different port → use absolute localhost URL.
const IS_DEV = import.meta.env.DEV;

export const BASE_URL = IS_DEV ? 'http://localhost:3001' : '';
export const UPLOADS_URL = `${BASE_URL}/uploads`;

const api = axios.create({ baseURL: `${BASE_URL}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
