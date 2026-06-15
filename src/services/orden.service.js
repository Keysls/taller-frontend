import api from './api.js';
export const getAll          = (params)     => api.get('/ordenes', { params }).then(r => r.data);
export const getById         = (id)         => api.get(`/ordenes/${id}`).then(r => r.data.data);
export const create          = (data)       => api.post('/ordenes', data).then(r => r.data.data);
export const cambiarEstado   = (id, estado) => api.patch(`/ordenes/${id}/estado`, { estado }).then(r => r.data.data);
export const agregarServicio = (id, data)   => api.post(`/ordenes/${id}/servicios`, data).then(r => r.data.data);
export const agregarRepuesto = (id, data)   => api.post(`/ordenes/${id}/repuestos`, data).then(r => r.data.data);
