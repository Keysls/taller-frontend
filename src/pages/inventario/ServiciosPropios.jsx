import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, X, Loader2, Search, PowerOff, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';

const svcApi = {
  getAll:  ()         => api.get('/servicios').then(r => r.data.data),
  create:  (data)     => api.post('/servicios', data).then(r => r.data.data),
  update:  (id, data) => api.put(`/servicios/${id}`, data).then(r => r.data.data),
};

const formatMoney = (n) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n ?? 0);

const PER_PAGE = 20;

// ─── Estilos ──────────────────────────────────────────────────────
const overlayStyle = { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 };
const cardStyle    = { background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(30,58,138,0.15)', border: '1px solid #E2ECF4', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' };
const mHeader      = { padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 };
const mBody        = { padding: '20px 24px', overflowY: 'auto', flex: 1 };
const mFooter      = { padding: '16px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 };
const iStyle       = { width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #C8DAEA', background: '#F4F8FC', fontSize: 13, color: '#0D1B2A', outline: 'none', boxSizing: 'border-box' };
const lStyle       = { display: 'block', fontSize: 11, fontWeight: 600, color: '#4A6A8A', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' };
const fg           = { marginBottom: 14 };
const btnP         = { flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 };
const btnC         = { flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer', background: '#F1F5F9', color: '#64748B', fontSize: 13, fontWeight: 500, border: 'none' };
const focus        = e => e.target.style.borderColor = '#2563EB';
const blur         = e => e.target.style.borderColor = '#C8DAEA';

// ─── Modal ────────────────────────────────────────────────────────
function ModalServicio({ servicio, onClose, onSaved }) {
  const editando = !!servicio;
  const [form, setForm] = useState({ nombre: servicio?.nombre || '', descripcion: servicio?.descripcion || '', precioBase: servicio?.precioBase || '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const payload = { ...form, precioBase: parseFloat(form.precioBase) };
      if (editando) await svcApi.update(servicio.id, payload);
      else          await svcApi.create(payload);
      toast.success(editando ? 'Servicio actualizado' : 'Servicio creado');
      onSaved();
    } catch (err) { setError(err.response?.data?.message || 'Error al guardar'); }
    finally { setLoading(false); }
  };

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={cardStyle}>
        <div style={mHeader}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0D1B2A', margin: 0 }}>{editando ? 'Editar servicio' : 'Nuevo servicio'}</h2>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>Servicios realizados por el taller</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={mBody}>
            {error && <div style={{ fontSize: 12, color: '#DC2626', padding: '9px 12px', background: 'rgba(220,38,38,0.07)', borderRadius: 8, borderLeft: '3px solid #DC2626', marginBottom: 14 }}>{error}</div>}
            <div style={fg}>
              <label style={lStyle}>Nombre *</label>
              <input style={iStyle} value={form.nombre} onChange={e => set('nombre', e.target.value)} required placeholder="ej: Cambio de aceite" onFocus={focus} onBlur={blur} />
            </div>
            <div style={fg}>
              <label style={lStyle}>Descripción</label>
              <textarea style={{ ...iStyle, resize: 'vertical', minHeight: 80 }} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Descripción del servicio..." onFocus={focus} onBlur={blur} />
            </div>
            <div style={{ ...fg, marginBottom: 0 }}>
              <label style={lStyle}>Precio base (S/) *</label>
              <input style={iStyle} type="number" step="0.01" min="0" value={form.precioBase} onChange={e => set('precioBase', e.target.value)} required placeholder="0.00" onFocus={focus} onBlur={blur} />
            </div>
          </div>
          <div style={mFooter}>
            <button type="button" style={btnC} onClick={onClose}>Cancelar</button>
            <button type="submit" style={btnP} disabled={loading}>
              {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              {loading ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear servicio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────
export default function ServiciosPropios() {
  const qc = useQueryClient();
  const [modal,  setModal]  = useState(null);
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(1);

  const { data: servicios = [], isLoading } = useQuery({ queryKey: ['servicios'], queryFn: svcApi.getAll });

  const filtrados = useMemo(() => {
    const q = search.toLowerCase();
    return servicios.filter(s => !q || s.nombre?.toLowerCase().includes(q) || s.descripcion?.toLowerCase().includes(q));
  }, [servicios, search]);

  const totalPages = Math.ceil(filtrados.length / PER_PAGE);
  const paginated  = filtrados.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const onSaved = () => { qc.invalidateQueries(['servicios']); setModal(null); };

  const handleToggle = async (s) => {
    if (!confirm(`¿${s.activo ? 'Desactivar' : 'Activar'} el servicio "${s.nombre}"?`)) return;
    try {
      await svcApi.update(s.id, { activo: !s.activo });
      toast.success(s.activo ? 'Servicio desactivado' : 'Servicio activado');
      qc.invalidateQueries(['servicios']);
    } catch { toast.error('Error al cambiar estado'); }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0D1B2A', margin: 0 }}>Servicios propios</h2>
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{filtrados.length} de {servicios.length} servicios</p>
        </div>
        <button onClick={() => setModal({})}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600 }}
          onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'}
          onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}>
          <Plus size={15} /> Nuevo servicio
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

        {/* Buscador */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por nombre o descripción..."
              style={{ ...iStyle, paddingLeft: 32, background: '#F8FAFC' }} onFocus={focus} onBlur={blur} />
          </div>
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 10, border: '1px solid #E2ECF4', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#64748B' }}>
              <X size={13} /> Limpiar
            </button>
          )}
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64, color: '#94A3B8', gap: 8 }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Cargando…
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                    {['Servicio', 'Descripción', 'Precio base', 'Estado', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #F8FAFC', opacity: s.activo ? 1 : 0.45 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FAFBFF'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#2563EB', flexShrink: 0 }}>
                            {s.nombre?.[0]?.toUpperCase()}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#0D1B2A' }}>{s.nombre}</span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748B', maxWidth: 280 }}>
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {s.descripcion || '—'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0D1B2A' }}>{formatMoney(s.precioBase)}</span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.activo ? '#F0FDF4' : '#FEF2F2', color: s.activo ? '#15803D' : '#DC2626' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                          {s.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button title="Editar" onClick={() => setModal(s)}
                            style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2ECF4', background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = '#E2ECF4'; }}>
                            <Edit size={13} />
                          </button>
                          <button title={s.activo ? 'Desactivar' : 'Activar'} onClick={() => handleToggle(s)}
                            style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2ECF4', background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}
                            onMouseEnter={e => { e.currentTarget.style.background = s.activo ? '#FEF2F2' : '#F0FDF4'; e.currentTarget.style.color = s.activo ? '#DC2626' : '#15803D'; e.currentTarget.style.borderColor = s.activo ? '#FECACA' : '#BBF7D0'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = '#E2ECF4'; }}>
                            <PowerOff size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!paginated.length && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 48, color: '#94A3B8', fontSize: 13 }}>
                      {search ? 'Sin resultados para la búsqueda' : 'No hay servicios registrados'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>
                  Mostrando {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtrados.length)} de {filtrados.length}
                </span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E2ECF4', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', opacity: page === 1 ? 0.4 : 1 }}>
                    <ChevronLeft size={15} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...'); acc.push(p); return acc; }, [])
                    .map((p, i) => p === '...'
                      ? <span key={`e${i}`} style={{ fontSize: 12, color: '#CBD5E1', padding: '0 4px' }}>…</span>
                      : <button key={p} onClick={() => setPage(p)}
                          style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${p === page ? '#2563EB' : '#E2ECF4'}`, background: p === page ? '#2563EB' : '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: p === page ? 700 : 400, color: p === page ? '#fff' : '#64748B' }}>{p}</button>
                    )}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E2ECF4', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', opacity: page === totalPages ? 0.4 : 1 }}>
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {modal !== null && (
        <ModalServicio servicio={modal.id ? modal : null} onClose={() => setModal(null)} onSaved={onSaved} />
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}