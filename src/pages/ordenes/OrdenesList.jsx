import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import * as svc from '../../services/orden.service.js';
import * as vehSvc from '../../services/vehiculo.service.js';
import * as mecSvc from '../../services/mecanico.service.js';
import { ORDEN_ESTADOS } from '../../utils/constants.js';
import { formatDate, formatMoney } from '../../utils/formatters.js';

function OrdenForm({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ vehiculoId: '', mecanicoId: '', diagnostico: '', observaciones: '' });
  const [loading, setLoading] = useState(false);
  const { data: veh } = useQuery({ queryKey: ['veh-all'], queryFn: () => vehSvc.getAll({ limit: 200 }) });
  const { data: mec } = useQuery({ queryKey: ['mecanicos'], queryFn: mecSvc.getAll });

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await svc.create(form); toast.success('Orden creada'); qc.invalidateQueries(['ordenes']); onClose(); }
    catch { } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Nueva orden de trabajo</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Vehículo *</label>
            <select className="input" value={form.vehiculoId} onChange={e => setForm(p => ({ ...p, vehiculoId: e.target.value }))} required>
              <option value="">Seleccionar vehículo...</option>
              {veh?.data?.map(v => <option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo} ({v.cliente?.nombres} {v.cliente?.apellidos})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Mecánico</label>
            <select className="input" value={form.mecanicoId} onChange={e => setForm(p => ({ ...p, mecanicoId: e.target.value }))}>
              <option value="">Sin asignar</option>
              {mec?.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="label">Diagnóstico</label><textarea className="input" rows={2} value={form.diagnostico} onChange={e => setForm(p => ({ ...p, diagnostico: e.target.value }))} /></div>
          <div className="form-group"><label className="label">Observaciones</label><textarea className="input" rows={2} value={form.observaciones} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creando...' : 'Crear orden'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OrdenesList() {
  const [modal, setModal] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState('');
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['ordenes', estadoFilter], queryFn: () => svc.getAll({ estado: estadoFilter || undefined }) });

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Órdenes de trabajo</h2>
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} />Nueva orden</button>
      </div>
      <div className="card">
        <div className="search-bar">
          <select className="input" style={{ maxWidth: 220 }} value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ORDEN_ESTADOS).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
          </select>
        </div>
        {isLoading ? <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Cargando...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>N° Orden</th><th>Vehículo</th><th>Cliente</th><th>Mecánico</th><th>Estado</th><th>Total</th><th>Fecha</th><th></th></tr></thead>
              <tbody>
                {data?.data?.map(o => {
                  const est = ORDEN_ESTADOS[o.estado];
                  return (
                    <tr key={o.id}>
                      <td><strong>{o.numeroOrden}</strong></td>
                      <td>{o.vehiculo?.placa} {o.vehiculo?.marca}</td>
                      <td>{o.vehiculo?.cliente?.nombres} {o.vehiculo?.cliente?.apellidos}</td>
                      <td>{o.mecanico?.nombre || '—'}</td>
                      <td><span className={`badge ${est?.badge}`}>{est?.label}</span></td>
                      <td>{formatMoney(o.totalGeneral)}</td>
                      <td>{formatDate(o.fecha)}</td>
                      <td><button className="btn btn-secondary btn-sm" onClick={() => navigate(`/ordenes/${o.id}`)}><Eye size={14} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!data?.data?.length && <div className="empty-state"><p>No hay órdenes</p></div>}
          </div>
        )}
      </div>
      {modal && <OrdenForm onClose={() => setModal(false)} />}
    </div>
  );
}
