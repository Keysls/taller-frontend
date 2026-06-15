import api from './api.js';
export const getAll       = (params) => api.get('/vehiculos', { params }).then(r => r.data);
export const getById      = (id)     => api.get(`/vehiculos/${id}`).then(r => r.data.data);
export const getHistorial = (id)     => api.get(`/vehiculos/${id}/historial`).then(r => r.data.data);
export const create       = (data)   => api.post('/vehiculos', data).then(r => r.data.data);
export const update       = (id, d)  => api.put(`/vehiculos/${id}`, d).then(r => r.data.data);
