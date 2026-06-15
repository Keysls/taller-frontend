import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import * as svc from '../../services/vehiculo.service.js';
import * as cliSvc from '../../services/cliente.service.js';

function VehiculoForm({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ placa: '', marca: '', modelo: '', anio: '', color: '', kilometraje: 0, clienteId: '' });
  const [loading, setLoading] = useState(false);
  const { data: clientes } = useQuery({ queryKey: ['clientes-all'], queryFn: () => cliSvc.getAll({ limit: 200 }) });

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await svc.create({ ...form, anio: +form.anio, kilometraje: +form.kilometraje });
      toast.success('Vehículo registrado'); qc.invalidateQueries(['vehiculos']); onClose();
    } catch { } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Nuevo vehículo</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Cliente *</label>
            <select className="input" value={form.clienteId} onChange={e => setForm(p => ({ ...p, clienteId: e.target.value }))} required>
              <option value="">Seleccionar cliente...</option>
              {clientes?.data?.map(c => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos} — {c.dniRuc}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="label">Placa *</label><input className="input" value={form.placa} onChange={e => setForm(p => ({ ...p, placa: e.target.value.toUpperCase() }))} required /></div>
            <div className="form-group"><label className="label">Color</label><input className="input" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="label">Marca *</label><input className="input" value={form.marca} onChange={e => setForm(p => ({ ...p, marca: e.target.value }))} required /></div>
            <div className="form-group"><label className="label">Modelo *</label><input className="input" value={form.modelo} onChange={e => setForm(p => ({ ...p, modelo: e.target.value }))} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="label">Año *</label><input className="input" type="number" min="1990" max="2030" value={form.anio} onChange={e => setForm(p => ({ ...p, anio: e.target.value }))} required /></div>
            <div className="form-group"><label className="label">Kilometraje</label><input className="input" type="number" value={form.kilometraje} onChange={e => setForm(p => ({ ...p, kilometraje: e.target.value }))} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VehiculosList() {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['vehiculos', search], queryFn: () => svc.getAll({ search }) });

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Vehículos</h2>
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} />Nuevo vehículo</button>
      </div>
      <div className="card">
        <div className="search-bar">
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
            <input className="input" style={{ paddingLeft: 34 }} placeholder="Buscar por placa o marca..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        {isLoading ? <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Cargando...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Placa</th><th>Marca / Modelo</th><th>Año</th><th>Color</th><th>Km</th><th>Cliente</th></tr></thead>
              <tbody>
                {data?.data?.map(v => (
                  <tr key={v.id}>
                    <td><strong>{v.placa}</strong></td>
                    <td>{v.marca} {v.modelo}</td>
                    <td>{v.anio}</td>
                    <td>{v.color || '—'}</td>
                    <td>{v.kilometraje?.toLocaleString()}</td>
                    <td>{v.cliente?.nombres} {v.cliente?.apellidos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.data?.length && <div className="empty-state"><p>No se encontraron vehículos</p></div>}
          </div>
        )}
      </div>
      {modal && <VehiculoForm onClose={() => setModal(false)} />}
    </div>
  );
}
