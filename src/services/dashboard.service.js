import api from './api.js';
export const getKPIs = () => api.get('/dashboard/kpis').then(r => r.data.data);
