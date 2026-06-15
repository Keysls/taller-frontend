import api from './api.js';
export const getAll        = ()            => api.get('/mecanicos').then(r => r.data.data);
export const create        = (data)        => api.post('/mecanicos', data).then(r => r.data.data);
export const update        = (id, d)       => api.put(`/mecanicos/${id}`, d).then(r => r.data.data);
export const cambiarEstado = (id, estado)  => api.patch(`/mecanicos/${id}/estado`, { estado }).then(r => r.data.data);
