import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import * as svc from '../../services/mecanico.service.js';
import { MECANICO_ESTADOS } from '../../utils/constants.js';

// ─── CSS (Lista) ──────────────────────────────────────────────────
// Mismo patrón de OrdenesTrabajo / Cotizaciones / Clientes: breakpoint
// único a 768px, tabla → cards en móvil.
const MEC_CSS = `
  .mec-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }

  .mec-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }

  .mec-cards { display: none; flex-direction: column; gap: 10px; padding: 4px 0 0; }
  .mec-card {
    background: #fff; border: 1px solid #F1F5F9; border-radius: 14px;
    padding: 14px 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  }
  .mec-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
  .mec-card-name { font-size: 14px; font-weight: 700; color: #0D1B2A; margin-bottom: 2px; }
  .mec-card-mid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; margin-bottom: 10px; }
  .mec-card-label { font-size: 10px; color: #94A3B8; margin-bottom: 1px; }
  .mec-card-value { font-size: 12px; font-weight: 600; color: #0D1B2A; word-break: break-word; }
  .mec-card-bot { border-top: 1px solid #F8FAFC; padding-top: 10px; }
  .mec-card-bot select { width: 100%; }

  .mec-modal-actions { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }

  @media (max-width: 768px) {
    .mec-table-wrap { display: none; }
    .mec-cards { display: flex; }
  }
`;

// ─── Card individual de mecánico (móvil) ──────────────────────────
function MecanicoCard({ m, onEstado }) {
  const est = MECANICO_ESTADOS[m.estado];
  return (
    <div className="mec-card">
      <div className="mec-card-top">
        <div className="mec-card-name">{m.nombre}</div>
        <span className={`badge ${est?.badge}`}>{est?.label}</span>
      </div>

      <div className="mec-card-mid">
        <div>
          <div className="mec-card-label">Teléfono</div>
          <div className="mec-card-value">{m.telefono || '—'}</div>
        </div>
        <div>
          <div className="mec-card-label">Especialidad</div>
          <div className="mec-card-value">{m.especialidad || '—'}</div>
        </div>
      </div>

      <div className="mec-card-bot">
        <select className="input" value={m.estado} onChange={e => onEstado(m.id, e.target.value)}>
          {Object.entries(MECANICO_ESTADOS).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
        </select>
      </div>
    </div>
  );
}

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
      <style>{MEC_CSS}</style>

      <div className="page-header mec-header">
        <h2 className="page-title">Mecánicos</h2>
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} />Nuevo mecánico</button>
      </div>
      <div className="card">
        {isLoading ? <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Cargando...</div> : (
          <>
            <div className="table-wrap mec-table-wrap">
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

            <div className="mec-cards">
              {data?.map(m => (
                <MecanicoCard key={m.id} m={m} onEstado={handleEstado} />
              ))}
              {!data?.length && <div className="empty-state"><p>No hay mecánicos registrados</p></div>}
            </div>
          </>
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
              <div className="mec-modal-actions">
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