import api from './api.js';
export const getAll             = (params) => api.get('/inventario', { params }).then(r => r.data);
export const getStockBajo       = ()       => api.get('/inventario/stock-bajo').then(r => r.data.data);
export const create             = (data)   => api.post('/inventario', data).then(r => r.data.data);
export const update             = (id, d)  => api.put(`/inventario/${id}`, d).then(r => r.data.data);
export const registrarMovimiento= (id, d)  => api.post(`/inventario/${id}/movimiento`, d).then(r => r.data.data);
