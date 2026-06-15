import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 15000,
});

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    const msg    = err.response?.data?.message || 'Error de conexión';
    const status = err.response?.status;
    const url    = err.config?.url || '';

    // Si el 401 viene del login, no redirigir — dejar que el componente maneje el error
    const esLoginEndpoint = url.includes('/auth/login');

    if (status === 401 && !esLoginEndpoint) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    } else if (status !== 401 && status !== 404) {
      toast.error(msg);
    }

    return Promise.reject(err);
  }
);

export default api;