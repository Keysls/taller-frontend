import api from './api.js';
export const getByOrden = (ordenId) => api.get(`/pagos/orden/${ordenId}`).then(r => r.data.data);
export const create     = (data)    => api.post('/pagos', data).then(r => r.data.data);
