import api from './api.js';
export const login = (data) => api.post('/auth/login', data).then(r => r.data.data);
export const getMe  = ()     => api.get('/auth/me').then(r => r.data.data);
