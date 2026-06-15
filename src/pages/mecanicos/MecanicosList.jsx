import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import * as svc from '../../services/mecanico.service.js';
import { MECANICO_ESTADOS } from '../../utils/constants.js';

export default function MecanicosList() {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nombre: '', telefono: '', especialidad: '' });
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['mecanicos'], queryFn: svc.getAll });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await svc.create(form); toast.success('Mecánico agregado'); qc.invalidateQueries(['mecanicos']); setModal(false); setForm({ nombre: '', telefono: '', especialidad: '' }); } catch {}
  };

  const handleEstado = async (id, estado) => {
    try { await svc.cambiarEstado(id, estado); qc.invalidateQueries(['mecanicos']); } catch {}
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Mecánicos</h2>
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} />Nuevo mecánico</button>
      </div>
      <div className="card">
        {isLoading ? <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Cargando...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nombre</th><th>Teléfono</th><th>Especialidad</th><th>Estado</th><th>Cambiar estado</th></tr></thead>
              <tbody>
                {data?.map(m => {
                  const est = MECANICO_ESTADOS[m.estado];
                  return (
                    <tr key={m.id}>
                      <td><strong>{m.nombre}</strong></td>
                      <td>{m.telefono || '—'}</td>
                      <td>{m.especialidad || '—'}</td>
                      <td><span className={`badge ${est?.badge}`}>{est?.label}</span></td>
                      <td>
                        <select className="input" style={{ width: 'auto' }} value={m.estado} onChange={e => handleEstado(m.id, e.target.value)}>
                          {Object.entries(MECANICO_ESTADOS).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!data?.length && <div className="empty-state"><p>No hay mecánicos registrados</p></div>}
          </div>
        )}
      </div>
      {modal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Nuevo mecánico</h3>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label className="label">Nombre *</label><input className="input" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} required /></div>
              <div className="form-group"><label className="label">Teléfono</label><input className="input" value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} /></div>
              <div className="form-group"><label className="label">Especialidad</label><input className="input" value={form.especialidad} onChange={e => setForm(p => ({ ...p, especialidad: e.target.value }))} placeholder="Ej: Motor, Frenos, Electricidad..." /></div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
