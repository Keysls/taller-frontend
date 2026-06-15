import api from './api.js';
export const getAll  = (params) => api.get('/clientes', { params }).then(r => r.data);
export const getById = (id)     => api.get(`/clientes/${id}`).then(r => r.data.data);
export const create  = (data)   => api.post('/clientes', data).then(r => r.data.data);
export const update  = (id, d)  => api.put(`/clientes/${id}`, d).then(r => r.data.data);
export const remove  = (id)     => api.delete(`/clientes/${id}`).then(r => r.data);
