import axios from 'axios';

export const BASE_URL = 'http://localhost:3001';
export const UPLOADS_URL = `${BASE_URL}/uploads`;

const api = axios.create({ baseURL: `${BASE_URL}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
