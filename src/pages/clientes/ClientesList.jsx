import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, X, Loader2, CheckCircle2, UserPlus, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import * as svc from '../../services/cliente.service.js';
import { formatDate } from '../../utils/formatters.js';
import api from '../../services/api.js';

// ─── API RENIEC/SUNAT ─────────────────────────────────────────────

// Y las funciones quedan así (ya las tienes bien, solo falta el import):
async function consultarDni(dni) {
  console.log('🔍 Consultando DNI:', dni);
  try {
    const result = await api.get(`/reniec/dni/${dni}`);
    console.log('✅ Respuesta:', result.data);
    return result.data;
  } catch (err) {
    console.error('❌ Error:', err.response?.status, err.response?.data, err.message);
    throw err;
  }
}
async function consultarRuc(ruc) {
  return api.get(`/reniec/ruc/${ruc}`).then(r => r.data);
}
// ─── CSS ──────────────────────────────────────────────────────────
const CSS = `
  .cl-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(15,23,42,0.55);
    backdrop-filter: blur(3px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    animation: cl-fade-in .15s ease;
  }
  .cl-modal {
    background: #fff; border-radius: 20px; width: 100%; max-width: 560px;
    box-shadow: 0 24px 64px rgba(15,23,42,0.18), 0 0 0 1px rgba(15,23,42,0.06);
    display: flex; flex-direction: column; max-height: 92vh; overflow: hidden;
    animation: cl-slide-up .18s ease;
  }
  .cl-modal-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid #F1F5F9;
    display: flex; align-items: flex-start; justify-content: space-between;
    flex-shrink: 0;
  }
  .cl-modal-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
  .cl-modal-footer {
    padding: 14px 24px; border-top: 1px solid #F1F5F9;
    display: flex; gap: 8px; justify-content: flex-end; flex-shrink: 0;
    background: #FAFBFF;
  }
  .cl-close-btn {
    width: 30px; height: 30px; border-radius: 8px;
    border: 1px solid #E2ECF4; background: #F8FAFC;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    color: #94A3B8; transition: all .15s; flex-shrink: 0;
  }
  .cl-close-btn:hover { background: #FEF2F2; color: #DC2626; border-color: #FECACA; }

  .cl-input {
    width: 100%; padding: 9px 12px; border-radius: 10px;
    border: 1.5px solid #E2ECF4; background: #F8FAFC;
    font-size: 13px; color: #0D1B2A; outline: none;
    box-sizing: border-box; transition: border-color .15s, background .15s;
    font-family: inherit;
  }
  .cl-input:focus { border-color: #2563EB; background: #fff; }
  .cl-input::placeholder { color: #C4CFD9; }
  .cl-input:disabled { opacity: .6; cursor: not-allowed; }

  .cl-label {
    display: flex; align-items: center; gap: 6px;
    font-size: 10.5px; font-weight: 700; color: #64748B;
    margin-bottom: 5px; text-transform: uppercase; letter-spacing: .06em;
  }
  .cl-required { color: #2563EB; }
  .cl-fg { margin-bottom: 14px; }
  .cl-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  .cl-dni-wrap { position: relative; }
  .cl-dni-icon {
    position: absolute; right: 11px; top: 50%;
    transform: translateY(-50%);
    pointer-events: none; display: flex;
  }
  .cl-spin { animation: cl-spin .7s linear infinite; color: #2563EB; }
  .cl-ok-icon { color: #15803D; }
  .cl-hint {
    margin-top: 5px; font-size: 11.5px; color: #15803D; font-weight: 600;
    display: flex; align-items: center; gap: 4px;
    padding: 5px 9px; background: #F0FDF4; border-radius: 7px;
    border: 1px solid #BBF7D0;
  }
  .cl-err-hint {
    margin-top: 5px; font-size: 11.5px; color: #DC2626;
    display: flex; align-items: center; gap: 4px;
    padding: 5px 9px; background: #FEF2F2; border-radius: 7px;
    border: 1px solid #FECACA;
  }

  .cl-btn-cancel {
    padding: 9px 20px; border-radius: 10px; border: 1.5px solid #E2ECF4;
    background: #fff; color: #64748B; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all .15s; font-family: inherit;
  }
  .cl-btn-cancel:hover { background: #F1F5F9; border-color: #CBD5E1; }
  .cl-btn-save {
    padding: 9px 22px; border-radius: 10px; border: none;
    background: #2563EB; color: #fff; font-size: 13px; font-weight: 700;
    cursor: pointer; transition: background .15s;
    display: inline-flex; align-items: center; gap: 6px; font-family: inherit;
  }
  .cl-btn-save:hover:not(:disabled) { background: #1D4ED8; }
  .cl-btn-save:disabled { background: #93AECB; cursor: not-allowed; }

  .cl-section-title {
    font-size: 10px; font-weight: 800; color: #94A3B8;
    text-transform: uppercase; letter-spacing: .1em;
    margin: 18px 0 10px; padding-bottom: 7px;
    border-bottom: 1px solid #F1F5F9;
  }
  .cl-section-title:first-child { margin-top: 0; }

  @keyframes cl-fade-in  { from { opacity: 0 } to { opacity: 1 } }
  @keyframes cl-slide-up { from { opacity: 0; transform: translateY(14px) scale(.98) } to { opacity: 1; transform: none } }
  @keyframes cl-spin      { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }

  @media (max-width: 540px) {
    .cl-grid-2 { grid-template-columns: 1fr; }
    .cl-modal  { border-radius: 16px; }
    .cl-modal-header { padding: 16px 18px 12px; }
    .cl-modal-body   { padding: 14px 18px; }
    .cl-modal-footer { padding: 12px 18px; }
  }
`;

// ─── Hook consulta RENIEC/SUNAT ───────────────────────────────────
function useDniLookup(setForm) {
  const [estado, setEstado] = useState('idle');
  const [hint,   setHint]   = useState('');
  const timerRef = useRef(null);

  const consultar = (valor) => {
    clearTimeout(timerRef.current);
    setHint('');
    if (!valor) { setEstado('idle'); return; }

    const esDni = /^\d{8}$/.test(valor);
    const esRuc = /^\d{11}$/.test(valor);
    if (!esDni && !esRuc) { setEstado('idle'); return; }

    setEstado('loading');
    timerRef.current = setTimeout(async () => {
      try {
        if (esDni) {
          const data = await consultarDni(valor);
          // Decolecta usa first_name, first_last_name, second_last_name
          const nombres   = data.first_name || '';
          const apellidos = `${data.first_last_name || ''} ${data.second_last_name || ''}`.trim();
          setForm(p => ({ ...p, nombres, apellidos }));
          setHint(`${nombres} ${apellidos}`);
        }else {
          const data = await consultarRuc(valor);
          setForm(p => ({ ...p, nombres: data.razonSocial || '', apellidos: '', direccion: data.direccion || p.direccion }));
          setHint(data.razonSocial || '');
        }
        setEstado('ok');
      } catch {
        setEstado('error');
      }
    }, 500);
  };

  return { estado, hint, consultar };
}

// ─── Modal ────────────────────────────────────────────────────────
function ClienteForm({ cliente, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(
    cliente || { dniRuc: '', nombres: '', apellidos: '', telefono: '', email: '', direccion: '' }
  );
  const [loading, setLoading] = useState(false);
  const { estado, hint, consultar } = useDniLookup(setForm);

  const handleDniChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
    setForm(p => ({ ...p, dniRuc: val }));
    if (!cliente) consultar(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (cliente) await svc.update(cliente.id, form);
      else await svc.create(form);
      toast.success(cliente ? 'Cliente actualizado' : 'Cliente creado');
      qc.invalidateQueries(['clientes']);
      onClose();
    } catch { } finally { setLoading(false); }
  };

  const esDni = form.dniRuc.length === 8;

  const modal = (
    <>
      <style>{CSS}</style>
      <div className="cl-overlay">
        <div className="cl-modal">

          {/* Header */}
          <div className="cl-modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EFF6FF', border: '1px solid #DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <UserPlus size={17} color="#2563EB" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0D1B2A' }}>
                  {cliente ? 'Editar cliente' : 'Nuevo cliente'}
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                  {cliente ? `Editando: ${cliente.nombres} ${cliente.apellidos}` : 'Completa los datos del cliente'}
                </div>
              </div>
            </div>
            <button className="cl-close-btn" onClick={onClose}><X size={15} /></button>
          </div>

          {/* Body */}
          <div className="cl-modal-body">
            <form id="cliente-form" onSubmit={handleSubmit}>

              <div className="cl-section-title">Identificación</div>

              <div className="cl-grid-2 cl-fg">
                {/* DNI / RUC */}
                <div>
                  <label className="cl-label">
                    DNI / RUC <span className="cl-required">*</span>
                    {!cliente && estado === 'idle' && form.dniRuc.length < 8 && (
                      <span style={{ fontWeight: 400, color: '#C4CFD9', textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>
                        autocompleta
                      </span>
                    )}
                  </label>
                  <div className="cl-dni-wrap">
                    <input className="cl-input" style={{ paddingRight: 34 }}
                      value={form.dniRuc} onChange={handleDniChange}
                      placeholder={cliente ? '—' : '8 o 11 dígitos'}
                      required inputMode="numeric"
                    />
                    <span className="cl-dni-icon">
                      {estado === 'loading' && <Loader2 size={14} className="cl-spin" />}
                      {estado === 'ok'      && <CheckCircle2 size={14} className="cl-ok-icon" />}
                      {estado === 'error'   && <AlertCircle  size={14} style={{ color: '#DC2626' }} />}
                    </span>
                  </div>
                  {estado === 'ok'    && hint && <div className="cl-hint"><CheckCircle2 size={11} />{hint}</div>}
                  {estado === 'error' && <div className="cl-err-hint"><AlertCircle size={11} />No encontrado en {esDni ? 'RENIEC' : 'SUNAT'}</div>}
                </div>

                {/* Teléfono */}
                <div>
                  <label className="cl-label">Teléfono</label>
                  <input className="cl-input" value={form.telefono}
                    onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                    placeholder="999 999 999" inputMode="tel" />
                </div>
              </div>

              <div className="cl-section-title">Datos personales</div>

              <div className="cl-grid-2 cl-fg">
                <div>
                  <label className="cl-label">Nombres <span className="cl-required">*</span></label>
                  <input className="cl-input" value={form.nombres}
                    onChange={e => setForm(p => ({ ...p, nombres: e.target.value }))}
                    placeholder="Nombres" required />
                </div>
                <div>
                  <label className="cl-label">Apellidos <span className="cl-required">*</span></label>
                  <input className="cl-input" value={form.apellidos}
                    onChange={e => setForm(p => ({ ...p, apellidos: e.target.value }))}
                    placeholder="Apellidos" required />
                </div>
              </div>

              <div className="cl-section-title">Contacto</div>

              <div className="cl-fg">
                <label className="cl-label">Email</label>
                <input className="cl-input" type="email" value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="cliente@correo.com" />
              </div>

              <div className="cl-fg" style={{ marginBottom: 0 }}>
                <label className="cl-label">Dirección</label>
                <input className="cl-input" value={form.direccion}
                  onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))}
                  placeholder="Dirección completa" />
              </div>

            </form>
          </div>

          {/* Footer */}
          <div className="cl-modal-footer">
            <button type="button" className="cl-btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" form="cliente-form" className="cl-btn-save" disabled={loading}>
              {loading
                ? <><Loader2 size={14} className="cl-spin" />Guardando…</>
                : cliente ? 'Guardar cambios' : 'Crear cliente'
              }
            </button>
          </div>

        </div>
      </div>
    </>
  );

  // Portal: renderiza sobre TODO, incluyendo sidebar y topbar
  return createPortal(modal, document.body);
}

// ─── Lista ────────────────────────────────────────────────────────
export default function ClientesList() {
  const [search, setSearch] = useState('');
  const [modal,  setModal]  = useState(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['clientes', search],
    queryFn:  () => svc.getAll({ search }),
  });

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    await svc.remove(id);
    toast.success('Cliente eliminado');
    qc.invalidateQueries(['clientes']);
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Clientes</h2>
        <button className="btn btn-primary" onClick={() => setModal({})}>
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      <div className="card">
        <div className="search-bar">
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
            <input className="input" style={{ paddingLeft: 34 }}
              placeholder="Buscar por nombre o DNI..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {isLoading
          ? <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Cargando...</div>
          : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>DNI/RUC</th><th>Nombre</th><th>Teléfono</th>
                    <th>Email</th><th>Registro</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.map(c => (
                    <tr key={c.id}>
                      <td><strong>{c.dniRuc}</strong></td>
                      <td>{c.nombres} {c.apellidos}</td>
                      <td>{c.telefono || '—'}</td>
                      <td>{c.email    || '—'}</td>
                      <td>{formatDate(c.fechaRegistro)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setModal(c)}>
                            <Pencil size={14} />
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data?.data?.length && (
                <div className="empty-state"><p>No se encontraron clientes</p></div>
              )}
            </div>
          )
        }
      </div>

      {modal !== null && (
        <ClienteForm
          cliente={modal.id ? modal : null}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}