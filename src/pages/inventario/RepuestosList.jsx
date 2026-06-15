import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, X, Loader2, ChevronLeft, ChevronRight, PackageX } from 'lucide-react';
import toast from 'react-hot-toast';
import * as svc from '../../services/inventario.service.js';
import { formatMoney } from '../../utils/formatters.js';

// ─── Estilos ──────────────────────────────────────────────────────
const overlayStyle = {
  position: 'fixed', inset: 0, zIndex: 200,
  background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(2px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
};
const cardStyle = {
  background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520,
  boxShadow: '0 20px 60px rgba(30,58,138,0.15)',
  border: '1px solid #E2ECF4', overflow: 'hidden',
  display: 'flex', flexDirection: 'column', maxHeight: '90vh',
};
const mHeader = { padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 };
const mBody   = { padding: '20px 24px', overflowY: 'auto', flex: 1 };
const mFooter = { padding: '16px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 };
const iStyle  = { width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #C8DAEA', background: '#F4F8FC', fontSize: 13, color: '#0D1B2A', outline: 'none', boxSizing: 'border-box' };
const lStyle  = { display: 'block', fontSize: 11, fontWeight: 600, color: '#4A6A8A', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' };
const fg      = { marginBottom: 14 };
const row2    = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 };
const btnP    = { flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 };
const btnC    = { flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer', background: '#F1F5F9', color: '#64748B', fontSize: 13, fontWeight: 500, border: 'none' };

const focus  = e => e.target.style.borderColor = '#2563EB';
const blur   = e => e.target.style.borderColor = '#C8DAEA';

const PER_PAGE = 20;

// ─── Modal Crear / Editar ─────────────────────────────────────────
function ModalRepuesto({ repuesto, onClose, onSaved }) {
  const editando = !!repuesto;
  const [form, setForm] = useState({
    codigo:      repuesto?.codigo      || '',
    nombre:      repuesto?.nombre      || '',
    categoria:   repuesto?.categoria   || '',
    stock:       repuesto?.stock       ?? 0,
    stockMinimo: repuesto?.stockMinimo ?? 5,
    costo:       repuesto?.costo       || '',
    precioVenta: repuesto?.precioVenta || '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const payload = {
        ...form,
        stock: +form.stock, stockMinimo: +form.stockMinimo,
        costo: parseFloat(form.costo), precioVenta: parseFloat(form.precioVenta),
      };
      if (editando) await svc.update(repuesto.id, payload);
      else          await svc.create(payload);
      toast.success(editando ? 'Repuesto actualizado' : 'Repuesto creado');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally { setLoading(false); }
  };

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={cardStyle}>
        <div style={mHeader}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0D1B2A', margin: 0 }}>
              {editando ? 'Editar repuesto' : 'Nuevo repuesto'}
            </h2>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>
              {editando ? repuesto.nombre : 'Completa los datos del repuesto'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={mBody}>
            {error && <div style={{ fontSize: 12, color: '#DC2626', padding: '9px 12px', background: 'rgba(220,38,38,0.07)', borderRadius: 8, borderLeft: '3px solid #DC2626', marginBottom: 14 }}>{error}</div>}
            <div style={row2}>
              <div>
                <label style={lStyle}>Código *</label>
                <input style={iStyle} value={form.codigo} onChange={e => set('codigo', e.target.value)} required placeholder="ej: REP-001" onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label style={lStyle}>Categoría</label>
                <input style={iStyle} value={form.categoria} onChange={e => set('categoria', e.target.value)} placeholder="ej: Frenos" onFocus={focus} onBlur={blur} />
              </div>
            </div>
            <div style={fg}>
              <label style={lStyle}>Nombre *</label>
              <input style={iStyle} value={form.nombre} onChange={e => set('nombre', e.target.value)} required placeholder="ej: Pastillas de freno delanteras" onFocus={focus} onBlur={blur} />
            </div>
            <div style={row2}>
              <div>
                <label style={lStyle}>Stock {!editando && 'inicial'}</label>
                <input style={iStyle} type="number" min="0" value={form.stock} onChange={e => set('stock', e.target.value)} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label style={lStyle}>Stock mínimo</label>
                <input style={iStyle} type="number" min="0" value={form.stockMinimo} onChange={e => set('stockMinimo', e.target.value)} onFocus={focus} onBlur={blur} />
              </div>
            </div>
            <div style={row2}>
              <div>
                <label style={lStyle}>Costo (S/) *</label>
                <input style={iStyle} type="number" step="0.01" min="0" value={form.costo} onChange={e => set('costo', e.target.value)} required placeholder="0.00" onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label style={lStyle}>Precio venta (S/) *</label>
                <input style={iStyle} type="number" step="0.01" min="0" value={form.precioVenta} onChange={e => set('precioVenta', e.target.value)} required placeholder="0.00" onFocus={focus} onBlur={blur} />
              </div>
            </div>
          </div>
          <div style={mFooter}>
            <button type="button" style={btnC} onClick={onClose}>Cancelar</button>
            <button type="submit" style={btnP} disabled={loading}>
              {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              {loading ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear repuesto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────
export default function RepuestosList() {
  const qc = useQueryClient();
  const [modal,    setModal]    = useState(null);
  const [search,   setSearch]   = useState('');
  const [catFilter,setCatFilter]= useState('');
  const [page,     setPage]     = useState(1);

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ['inventario'],
    queryFn:  () => svc.getAll({}).then(r => r.data || []),
  });

  // Categorías únicas para el combobox
  const categorias = useMemo(() =>
    [...new Set(todos.map(r => r.categoria).filter(Boolean))].sort(),
    [todos]
  );

  // Filtrado client-side
  const filtrados = useMemo(() => {
    const q = search.toLowerCase();
    return todos.filter(r => {
      const matchSearch = !q || r.nombre?.toLowerCase().includes(q) || r.codigo?.toLowerCase().includes(q);
      const matchCat    = !catFilter || r.categoria === catFilter;
      return matchSearch && matchCat;
    });
  }, [todos, search, catFilter]);

  // Paginación
  const totalPages = Math.ceil(filtrados.length / PER_PAGE);
  const paginated  = filtrados.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSearch = (v) => { setSearch(v); setPage(1); };
  const handleCat    = (v) => { setCatFilter(v); setPage(1); };

  const onSaved = () => { qc.invalidateQueries(['inventario']); setModal(null); };

  const handleToggle = async (r) => {
    if (!confirm(`¿${r.activo ? 'Desactivar' : 'Activar'} el repuesto "${r.nombre}"?`)) return;
    try {
      await svc.update(r.id, { activo: !r.activo });
      toast.success(r.activo ? 'Repuesto desactivado' : 'Repuesto activado');
      qc.invalidateQueries(['inventario']);
    } catch { toast.error('Error al cambiar estado'); }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0D1B2A', margin: 0 }}>Repuestos</h2>
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
            {filtrados.length} de {todos.length} repuestos
          </p>
        </div>
        <button onClick={() => setModal({})}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600 }}
          onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'}
          onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}>
          <Plus size={15} /> Nuevo repuesto
        </button>
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

        {/* Buscador + filtro */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input
              value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Buscar por nombre o código..."
              style={{ ...iStyle, paddingLeft: 32, background: '#F8FAFC' }}
              onFocus={focus} onBlur={blur} />
          </div>
          <select
            value={catFilter} onChange={e => handleCat(e.target.value)}
            style={{ ...iStyle, width: 'auto', minWidth: 160, background: '#F8FAFC', cursor: 'pointer' }}
            onFocus={focus} onBlur={blur}>
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(search || catFilter) && (
            <button onClick={() => { handleSearch(''); handleCat(''); }}
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
                    {['Código', 'Repuesto', 'Categoría', 'Stock', 'Mín.', 'Costo', 'P. Venta', 'Estado', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(r => {
                    const stockBajo = r.stock <= r.stockMinimo;
                    return (
                      <tr key={r.id}
                        style={{ borderBottom: '1px solid #F8FAFC', opacity: r.activo ? 1 : 0.45 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FAFBFF'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', padding: '2px 8px', borderRadius: 6 }}>{r.codigo}</span>
                        </td>

                        <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: '#0D1B2A', maxWidth: 220 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nombre}</div>
                        </td>

                        <td style={{ padding: '11px 14px' }}>
                          {r.categoria
                            ? <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: '#F1F5F9', color: '#475569' }}>{r.categoria}</span>
                            : <span style={{ color: '#CBD5E1', fontSize: 12 }}>—</span>}
                        </td>

                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: stockBajo ? '#FEF2F2' : '#F0FDF4', color: stockBajo ? '#DC2626' : '#15803D' }}>
                            {stockBajo && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#DC2626', display: 'inline-block' }} />}
                            {r.stock}
                          </span>
                        </td>

                        <td style={{ padding: '11px 14px', fontSize: 12, color: '#94A3B8' }}>{r.stockMinimo}</td>

                        <td style={{ padding: '11px 14px', fontSize: 13, color: '#64748B' }}>{formatMoney(r.costo)}</td>

                        <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#0D1B2A' }}>{formatMoney(r.precioVenta)}</td>

                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: r.activo ? '#F0FDF4' : '#FEF2F2', color: r.activo ? '#15803D' : '#DC2626' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                            {r.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>

                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button title="Editar" onClick={() => setModal(r)}
                              style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2ECF4', background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = '#E2ECF4'; }}>
                              <Edit size={13} />
                            </button>
                            <button title={r.activo ? 'Desactivar' : 'Activar'} onClick={() => handleToggle(r)}
                              style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2ECF4', background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}
                              onMouseEnter={e => { e.currentTarget.style.background = r.activo ? '#FEF2F2' : '#F0FDF4'; e.currentTarget.style.color = r.activo ? '#DC2626' : '#15803D'; e.currentTarget.style.borderColor = r.activo ? '#FECACA' : '#BBF7D0'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = '#E2ECF4'; }}>
                              <PackageX size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!paginated.length && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: 48, color: '#94A3B8', fontSize: 13 }}>
                        {search || catFilter ? 'Sin resultados para la búsqueda' : 'No hay repuestos registrados'}
                      </td>
                    </tr>
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
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E2ECF4', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: page === 1 ? '#CBD5E1' : '#64748B', opacity: page === 1 ? 0.5 : 1 }}>
                    <ChevronLeft size={15} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) => p === '...'
                      ? <span key={`e${i}`} style={{ fontSize: 12, color: '#CBD5E1', padding: '0 4px' }}>…</span>
                      : (
                        <button key={p} onClick={() => setPage(p)}
                          style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${p === page ? '#2563EB' : '#E2ECF4'}`, background: p === page ? '#2563EB' : '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: p === page ? 700 : 400, color: p === page ? '#fff' : '#64748B' }}>
                          {p}
                        </button>
                      )
                    )}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E2ECF4', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: page === totalPages ? '#CBD5E1' : '#64748B', opacity: page === totalPages ? 0.5 : 1 }}>
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {modal !== null && (
        <ModalRepuesto repuesto={modal.id ? modal : null} onClose={() => setModal(null)} onSaved={onSaved} />
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}