import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, X, Loader2, ChevronLeft, ChevronRight, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';

// ─── API ──────────────────────────────────────────────────────────
const pagoApi = {
  pendientes: (page = 1) => api.get('/pagos/pendientes', { params: { page, limit: 20 } }).then(r => r.data),
  byOrden:    (id)       => api.get(`/pagos/orden/${id}`).then(r => r.data.data || []),
  crear:      (id, data) => api.post(`/pagos/orden/${id}`, data).then(r => r.data.data),
  eliminar:   (id)       => api.delete(`/pagos/${id}`).then(r => r.data.data),
};

const fmt  = n => new Intl.NumberFormat('es-PE', { style:'currency', currency:'PEN' }).format(n??0);
const fmtD = d => d ? new Date(d).toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '—';

const METODOS = ['EFECTIVO','TRANSFERENCIA','TARJETA','YAPE','PLIN'];
const METODO_CFG = {
  EFECTIVO:      { bg:'#F0FDF4', color:'#15803D' },
  TRANSFERENCIA: { bg:'#EFF6FF', color:'#1D4ED8' },
  TARJETA:       { bg:'#F5F3FF', color:'#7C3AED' },
  YAPE:          { bg:'#FDF4FF', color:'#A21CAF' },
  PLIN:          { bg:'#ECFDF5', color:'#047857' },
};

const iS = { width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid #E2ECF4', background:'#F8FAFC', fontSize:13, color:'#0D1B2A', outline:'none', boxSizing:'border-box' };
const fo = e => e.target.style.borderColor = '#2563EB';
const bl = e => e.target.style.borderColor = '#E2ECF4';

// ─── Barra de progreso de pago ────────────────────────────────────
function BarraPago({ total, pagado }) {
  const pct = total > 0 ? Math.min(100, (pagado / total) * 100) : 0;
  const color = pct >= 100 ? '#15803D' : pct >= 50 ? '#D97706' : '#DC2626';
  return (
    <div style={{ width:'100%' }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#94A3B8', marginBottom:3 }}>
        <span>Pagado: {fmt(pagado)}</span>
        <span style={{ color }}>{pct.toFixed(0)}%</span>
      </div>
      <div style={{ height:5, background:'#F1F5F9', borderRadius:99, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:99, transition:'width .3s' }}/>
      </div>
    </div>
  );
}

// ─── Modal registrar pago ─────────────────────────────────────────
export function ModalPago({ orden, onClose, onSaved }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    metodo:     'EFECTIVO',
    monto:      '',
    referencia: '',
    notas:      '',
    fecha:      new Date().toISOString().slice(0,16),
  });
  const set = (k,v) => setForm(p => ({ ...p, [k]: v }));

  const totalPagado = orden.pagos?.reduce((s,p) => s + Number(p.monto), 0) || 0;
  const saldo       = Number(orden.totalGeneral || 0) - totalPagado;

  const iS2 = { width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid #E2ECF4', background:'#F4F8FC', fontSize:16, color:'#0D1B2A', outline:'none', boxSizing:'border-box', fontFamily:'inherit' };
  const lS2 = { display:'block', fontSize:11, fontWeight:600, color:'#4A6A8A', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' };

  const handleSubmit = async () => {
    if (!form.monto || Number(form.monto) <= 0) { toast.error('Ingresa un monto válido'); return; }
    if (Number(form.monto) > saldo + 0.01) { toast.error(`El monto supera el saldo de ${fmt(saldo)}`); return; }
    setSaving(true);
    try {
      await pagoApi.crear(orden.id, { ...form, monto: Number(form.monto) });
      toast.success('Pago registrado');
      qc.invalidateQueries(['pagos-pendientes']);
      qc.invalidateQueries(['ordenes']);
      qc.invalidateQueries(['orden', orden.id]);
      onSaved?.();
      onClose();
    } catch(err) { toast.error(err.response?.data?.message || 'Error al registrar pago'); }
    finally { setSaving(false); }
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(2px)',
        overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Wrapper: minHeight:100% + flex center = centrado cuando cabe, scroll cuando no */}
      <div
        onClick={e => e.target === e.currentTarget && onClose()}
        style={{
          minHeight: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: '20px 16px', boxSizing: 'border-box',
        }}
      >
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440,
        boxShadow: '0 24px 80px rgba(15,23,42,0.2)', border: '1px solid #E2ECF4',
      }}>

          {/* Header */}
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <h3 style={{ fontSize:15, fontWeight:700, color:'#0D1B2A', margin:0 }}>Registrar Pago</h3>
              <div style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>
                {orden.numeroOrden} · {orden.placa || orden.vehiculo?.placa || '—'}
              </div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#94A3B8', padding:4 }}><X size={18}/></button>
          </div>

          {/* Resumen saldo */}
          <div style={{ margin:'14px 20px 0', padding:'12px 16px', background:'#F8FAFC', borderRadius:12, border:'1px solid #F1F5F9' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:12, color:'#64748B' }}>Total OT</span>
              <span style={{ fontSize:13, fontWeight:700 }}>{fmt(orden.totalGeneral)}</span>
            </div>
            <BarraPago total={Number(orden.totalGeneral)} pagado={totalPagado} />
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
              <span style={{ fontSize:12, color:'#64748B' }}>Saldo pendiente</span>
              <span style={{ fontSize:14, fontWeight:800, color: saldo > 0 ? '#DC2626' : '#15803D' }}>{fmt(saldo)}</span>
            </div>
          </div>

          {/* Form */}
          <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <label style={lS2}>Método de pago</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {METODOS.map(m => (
                  <button key={m} onClick={() => set('metodo', m)}
                    style={{ padding:'6px 14px', borderRadius:20, border:`1.5px solid ${form.metodo===m?'#2563EB':'#E2ECF4'}`, background:form.metodo===m?'#EFF6FF':'#F8FAFC', color:form.metodo===m?'#1D4ED8':'#64748B', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={lS2}>Monto (S/)</label>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input style={iS2} type="number" min="0.01" step="0.01" value={form.monto}
                  onChange={e => set('monto', e.target.value)} placeholder="0.00" autoFocus/>
                <button onClick={() => set('monto', saldo.toFixed(2))}
                  style={{ whiteSpace:'nowrap', padding:'9px 12px', borderRadius:10, border:'1px solid #E2ECF4', background:'#F8FAFC', cursor:'pointer', fontSize:12, color:'#2563EB', fontWeight:600 }}>
                  Pagar todo
                </button>
              </div>
            </div>

            <div>
              <label style={lS2}>Fecha y hora</label>
              <input style={iS2} type="datetime-local" value={form.fecha} onChange={e => set('fecha', e.target.value)}/>
            </div>

            <div>
              <label style={lS2}>Referencia / N° operación</label>
              <input style={iS2} value={form.referencia} onChange={e => set('referencia', e.target.value)} placeholder="Ej: 123456789"/>
            </div>

            <div>
              <label style={lS2}>Notas</label>
              <textarea style={{ ...iS2, resize:'vertical', minHeight:60 }} value={form.notas}
                onChange={e => set('notas', e.target.value)} placeholder="Observaciones del pago..."/>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding:'14px 20px', borderTop:'1px solid #F1F5F9', display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:10, border:'1px solid #E2ECF4', background:'#fff', cursor:'pointer', fontSize:13, color:'#64748B' }}>Cancelar</button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ padding:'9px 24px', borderRadius:10, border:'none', background:'#2563EB', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, display:'inline-flex', alignItems:'center', gap:6 }}>
              {saving && <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }}/>}
              {saving ? 'Guardando…' : 'Registrar pago'}
            </button>
          </div>
      </div>
      </div>{/* /wrapper */}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Card móvil por orden ─────────────────────────────────────────
function OrdenCard({ o, expanded, onToggle, onPago, onEliminar }) {
  const pct = Number(o.totalGeneral) > 0 ? Math.min(100, (Number(o.totalPagado) / Number(o.totalGeneral)) * 100) : 0;
  const barColor = pct >= 100 ? '#15803D' : pct >= 50 ? '#D97706' : '#DC2626';
  const pagada = o.saldo <= 0;

  return (
    <div style={{
      background: pagada ? '#F0FDF4' : '#fff',
      borderRadius: 12,
      border: `1px solid ${pagada ? '#BBF7D0' : '#F1F5F9'}`,
      overflow: 'hidden',
      opacity: pagada ? 0.85 : 1,
    }}>
      {/* Card header — clickeable para expandir */}
      <div
        onClick={onToggle}
        style={{ padding:'12px 14px', cursor:'pointer', userSelect:'none' }}
      >
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color:'#2563EB', background:'#EFF6FF', padding:'2px 8px', borderRadius:6 }}>
              {o.numeroOrden}
            </span>
            <span style={{ fontSize:12, fontWeight:700, background:'#F1F5F9', color:'#334155', padding:'2px 8px', borderRadius:6 }}>
              {o.placa || o.vehiculo?.placa || '—'}
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {o.saldo > 0 && (
              <button
                onClick={e => { e.stopPropagation(); onPago(); }}
                style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'5px 12px', borderRadius:8, border:'none', background:'#2563EB', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                <Plus size={12}/> Pago
              </button>
            )}
            {expanded ? <ChevronUp size={15} color="#94A3B8"/> : <ChevronDown size={15} color="#94A3B8"/>}
          </div>
        </div>

        <div style={{ fontSize:13, fontWeight:600, color:'#0D1B2A', marginBottom:8 }}>
          {o.facturarA || `${o.vehiculo?.cliente?.nombres||''} ${o.vehiculo?.cliente?.apellidos||''}`.trim() || '—'}
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:8 }}>
          <span style={{ color:'#64748B' }}>Total: <strong style={{ color:'#0D1B2A' }}>{fmt(o.totalGeneral)}</strong></span>
          <span style={{ fontWeight:800, color: pagada ? '#15803D' : '#DC2626' }}>
            {pagada ? '✓ Pagado' : `Saldo: ${fmt(o.saldo)}`}
          </span>
        </div>

        {/* Barra progreso */}
        <div style={{ height:5, background:'#F1F5F9', borderRadius:99, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, background:barColor, borderRadius:99 }}/>
        </div>
        <div style={{ fontSize:10, color:'#94A3B8', marginTop:2 }}>{pct.toFixed(0)}% pagado</div>
      </div>

      {/* Historial expandido */}
      {expanded && (
        <div style={{ borderTop:'1px solid #F1F5F9', background:'#FAFBFF', padding:'10px 14px' }}>
          {o.pagos?.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {o.pagos.map(p => {
                const cfg = METODO_CFG[p.metodo] || { bg:'#F8FAFC', color:'#64748B' };
                return (
                  <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', borderRadius:8, border:'1px solid #F1F5F9', padding:'8px 10px', fontSize:12 }}>
                    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <span style={{ ...cfg, padding:'1px 7px', borderRadius:20, fontSize:11, fontWeight:700 }}>{p.metodo}</span>
                        <span style={{ color:'#94A3B8' }}>{fmtD(p.fecha)}</span>
                      </div>
                      {p.referencia && <span style={{ color:'#94A3B8' }}>Ref: {p.referencia}</span>}
                      {p.notas && <span style={{ color:'#94A3B8' }}>{p.notas}</span>}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontWeight:700, color:'#15803D' }}>{fmt(p.monto)}</span>
                      <button onClick={() => onEliminar(p.id, o.id)}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#DC2626', padding:4 }}>
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign:'center', color:'#94A3B8', fontSize:12, padding:'8px 0' }}>Sin pagos registrados aún</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Página Pagos ─────────────────────────────────────────────────
export default function Pagos() {
  const qc = useQueryClient();
  const [search,     setSearch]     = useState('');
  const [page,       setPage]       = useState(1);
  const [verPagadas, setVerPagadas] = useState(false);
  const [modalOrden, setModalOrden] = useState(null);
  const [expanded,   setExpanded]   = useState(null);

  const { data: response = {}, isLoading } = useQuery({
    queryKey: ['pagos-pendientes', page],
    queryFn:  () => pagoApi.pendientes(page),
    refetchInterval: 30000,
    keepPreviousData: true,
  });

  const ordenes     = response.data  || [];
  const totalServer = response.total || 0;
  const totalPages  = Math.ceil(totalServer / 20);

  const filtradas = useMemo(() => {
    const q = search.toLowerCase();
    return ordenes.filter(o => {
      const matchSearch = !q ||
        o.numeroOrden?.toLowerCase().includes(q) ||
        o.placa?.toLowerCase().includes(q) ||
        o.vehiculo?.placa?.toLowerCase().includes(q) ||
        o.facturarA?.toLowerCase().includes(q) ||
        o.vehiculo?.cliente?.nombres?.toLowerCase().includes(q) ||
        o.vehiculo?.cliente?.apellidos?.toLowerCase().includes(q) ||
        o.dniRuc?.includes(q);
      const matchPagadas = verPagadas ? true : o.saldo > 0;
      return matchSearch && matchPagadas;
    });
  }, [ordenes, search, verPagadas]);

  const totalSaldo   = ordenes.filter(o => o.saldo > 0).reduce((s, o) => s + Number(o.saldo), 0);
  const totalCobrado = ordenes.reduce((s, o) => s + Number(o.totalPagado), 0);
  const countPagadas = ordenes.filter(o => o.saldo <= 0).length;

  const handleEliminar = async (pagoId, ordenId) => {
    if (!confirm('¿Eliminar este pago?')) return;
    try {
      await pagoApi.eliminar(pagoId);
      toast.success('Pago eliminado');
      qc.invalidateQueries(['pagos-pendientes']);
      qc.invalidateQueries(['ordenes']);
      qc.invalidateQueries(['orden', ordenId]);
    } catch { toast.error('Error al eliminar pago'); }
  };

  return (
    <div>
      <style>{`
        @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }

        /* Ocultar tabla en móvil, mostrar cards */
        .pagos-table-wrap { display: block; }
        .pagos-cards-wrap { display: none; }

        @media (max-width: 700px) {
          .pagos-table-wrap { display: none !important; }
          .pagos-cards-wrap { display: flex !important; }
          .pagos-kpis       { grid-template-columns: 1fr 1fr !important; }
          .pagos-toolbar    { flex-wrap: wrap !important; }
          .pagos-toolbar-search { min-width: 0 !important; flex: 1 1 100% !important; order: -1; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700, color:'#0D1B2A', margin:0 }}>Pagos</h2>
          <p style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>
            {ordenes.filter(o => o.saldo > 0).length} órdenes con saldo pendiente
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="pagos-kpis" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
        {[
          { label:'OTs con saldo pendiente', value: ordenes.filter(o => o.saldo > 0).length, color:'#C2410C', bg:'#FFF7ED' },
          { label:'Total por cobrar',        value: fmt(totalSaldo),                          color:'#DC2626', bg:'#FEF2F2' },
          { label:'Total cobrado',           value: fmt(totalCobrado),                        color:'#15803D', bg:'#F0FDF4' },
        ].map(k => (
          <div key={k.label} style={{ background:'#fff', borderRadius:12, border:'1px solid #F1F5F9', padding:'14px 18px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize:11, color:'#94A3B8', marginBottom:4 }}>{k.label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Contenedor principal */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #F1F5F9', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', overflow:'hidden' }}>

        {/* Buscador + toggle */}
        <div className="pagos-toolbar" style={{ padding:'14px 16px', borderBottom:'1px solid #F1F5F9', display:'flex', gap:10, flexWrap:'wrap' }}>
          <div className="pagos-toolbar-search" style={{ position:'relative', flex:1, minWidth:180 }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94A3B8', pointerEvents:'none' }}/>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por N° orden, placa, cliente o DNI..."
              style={{ ...iS, paddingLeft:32, background:'#F8FAFC' }} onFocus={fo} onBlur={bl}/>
          </div>

          {countPagadas > 0 && (
            <button onClick={() => setVerPagadas(v => !v)}
              style={{
                display:'inline-flex', alignItems:'center', gap:6,
                padding:'8px 14px', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer',
                border:`1px solid ${verPagadas ? '#15803D' : '#E2ECF4'}`,
                background: verPagadas ? '#F0FDF4' : '#fff',
                color: verPagadas ? '#15803D' : '#64748B',
                whiteSpace:'nowrap',
              }}>
              {verPagadas ? '✓ Ocultando pagadas' : `Ver pagadas (${countPagadas})`}
            </button>
          )}

          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }}
              style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'8px 12px', borderRadius:10, border:'1px solid #E2ECF4', background:'#fff', cursor:'pointer', fontSize:12, color:'#64748B' }}>
              <X size={13}/> Limpiar
            </button>
          )}
        </div>

        {isLoading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:64, color:'#94A3B8', gap:8 }}>
            <Loader2 size={18} style={{ animation:'spin 1s linear infinite' }}/> Cargando…
          </div>
        ) : (
          <>
            {/* ── TABLA (desktop ≥ 701px) ── */}
            <div className="pagos-table-wrap">
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#F8FAFC', borderBottom:'1px solid #F1F5F9' }}>
                    {['N° Orden','Cliente','Placa','Total OT','Pagado','Saldo','Progreso',''].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.05em', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map(o => {
                    const pct = Number(o.totalGeneral) > 0 ? Math.min(100, (Number(o.totalPagado) / Number(o.totalGeneral)) * 100) : 0;
                    const barColor = pct >= 100 ? '#15803D' : pct >= 50 ? '#D97706' : '#DC2626';
                    const isExp = expanded === o.id;
                    const pagada = o.saldo <= 0;
                    return (
                      <React.Fragment key={o.id}>
                        <tr style={{
                            borderBottom: isExp ? 'none' : '1px solid #F8FAFC',
                            cursor:'pointer',
                            background: pagada ? '#F0FDF4' : isExp ? '#FAFBFF' : 'transparent',
                            opacity: pagada ? 0.75 : 1,
                          }}
                          onMouseEnter={e => { if(!isExp) e.currentTarget.style.background = pagada ? '#DCFCE7' : '#FAFBFF'; }}
                          onMouseLeave={e => { if(!isExp) e.currentTarget.style.background = pagada ? '#F0FDF4' : 'transparent'; }}
                          onClick={() => setExpanded(isExp ? null : o.id)}>
                          <td style={{ padding:'11px 14px' }}>
                            <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color:'#2563EB', background:'#EFF6FF', padding:'2px 8px', borderRadius:6 }}>{o.numeroOrden}</span>
                          </td>
                          <td style={{ padding:'11px 14px', fontSize:13, fontWeight:600, color:'#0D1B2A', whiteSpace:'nowrap' }}>
                            {o.facturarA || `${o.vehiculo?.cliente?.nombres||''} ${o.vehiculo?.cliente?.apellidos||''}`.trim() || '—'}
                          </td>
                          <td style={{ padding:'11px 14px' }}>
                            <span style={{ fontSize:12, fontWeight:700, background:'#F1F5F9', color:'#334155', padding:'2px 8px', borderRadius:6 }}>{o.placa || o.vehiculo?.placa || '—'}</span>
                          </td>
                          <td style={{ padding:'11px 14px', fontSize:13, fontWeight:700, color:'#0D1B2A' }}>{fmt(o.totalGeneral)}</td>
                          <td style={{ padding:'11px 14px', fontSize:13, color:'#15803D', fontWeight:600 }}>{fmt(o.totalPagado)}</td>
                          <td style={{ padding:'11px 14px', fontSize:13, fontWeight:800, color: o.saldo > 0 ? '#DC2626' : '#15803D' }}>
                            {o.saldo <= 0 ? '✓ Pagado' : fmt(o.saldo)}
                          </td>
                          <td style={{ padding:'11px 14px', minWidth:120 }}>
                            <div style={{ height:6, background:'#F1F5F9', borderRadius:99, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${pct}%`, background:barColor, borderRadius:99 }}/>
                            </div>
                            <div style={{ fontSize:10, color:'#94A3B8', marginTop:2 }}>{pct.toFixed(0)}%</div>
                          </td>
                          <td style={{ padding:'11px 14px' }}>
                            {o.saldo > 0 && (
                              <button onClick={e => { e.stopPropagation(); setModalOrden(o); }}
                                style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:8, border:'none', background:'#2563EB', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:600 }}
                                onMouseEnter={e => e.currentTarget.style.background='#1D4ED8'}
                                onMouseLeave={e => e.currentTarget.style.background='#2563EB'}>
                                <Plus size={13}/> Pago
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Fila expandida: historial de pagos */}
                        {isExp && (
                          <tr style={{ borderBottom:'1px solid #F8FAFC', background:'#FAFBFF' }}>
                            <td colSpan={8} style={{ padding:'0 14px 14px 14px' }}>
                              <div style={{ background:'#fff', borderRadius:10, border:'1px solid #F1F5F9', overflow:'hidden' }}>
                                {o.pagos?.length > 0 ? (
                                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                                    <thead>
                                      <tr style={{ background:'#F8FAFC' }}>
                                        {['Fecha','Método','Monto','Referencia','Notas',''].map(h => (
                                          <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase' }}>{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {o.pagos.map((p) => {
                                        const cfg = METODO_CFG[p.metodo] || { bg:'#F8FAFC', color:'#64748B' };
                                        return (
                                          <tr key={p.id} style={{ borderTop:'1px solid #F8FAFC' }}>
                                            <td style={{ padding:'8px 12px', color:'#64748B' }}>{fmtD(p.fecha)}</td>
                                            <td style={{ padding:'8px 12px' }}>
                                              <span style={{ ...cfg, padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700 }}>{p.metodo}</span>
                                            </td>
                                            <td style={{ padding:'8px 12px', fontWeight:700, color:'#15803D' }}>{fmt(p.monto)}</td>
                                            <td style={{ padding:'8px 12px', color:'#94A3B8' }}>{p.referencia || '—'}</td>
                                            <td style={{ padding:'8px 12px', color:'#94A3B8' }}>{p.notas || '—'}</td>
                                            <td style={{ padding:'8px 12px' }}>
                                              <button onClick={() => handleEliminar(p.id, o.id)}
                                                style={{ background:'none', border:'none', cursor:'pointer', color:'#DC2626', padding:4 }}
                                                title="Eliminar pago">
                                                <Trash2 size={13}/>
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                ) : (
                                  <div style={{ padding:'16px', textAlign:'center', color:'#94A3B8', fontSize:12 }}>Sin pagos registrados aún</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {!filtradas.length && (
                    <tr><td colSpan={8} style={{ textAlign:'center', padding:48, color:'#94A3B8', fontSize:13 }}>
                      {search ? 'Sin resultados' : 'No hay órdenes con saldo pendiente 🎉'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ── CARDS (móvil ≤ 700px) ── */}
            <div className="pagos-cards-wrap" style={{ flexDirection:'column', gap:10, padding:12 }}>
              {filtradas.length === 0 ? (
                <div style={{ textAlign:'center', padding:48, color:'#94A3B8', fontSize:13 }}>
                  {search ? 'Sin resultados' : 'No hay órdenes con saldo pendiente 🎉'}
                </div>
              ) : filtradas.map(o => (
                <OrdenCard
                  key={o.id}
                  o={o}
                  expanded={expanded === o.id}
                  onToggle={() => setExpanded(expanded === o.id ? null : o.id)}
                  onPago={() => setModalOrden(o)}
                  onEliminar={handleEliminar}
                />
              ))}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div style={{ padding:'12px 16px', borderTop:'1px solid #F1F5F9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'#94A3B8' }}>
                  Página {page} de {totalPages} · {totalServer} órdenes
                </span>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                    style={{ width:32, height:32, borderRadius:8, border:'1px solid #E2ECF4', background:'#fff', cursor:page===1?'not-allowed':'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#64748B', opacity:page===1?.4:1 }}>
                    <ChevronLeft size={15}/>
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
                    style={{ width:32, height:32, borderRadius:8, border:'1px solid #E2ECF4', background:'#fff', cursor:page===totalPages?'not-allowed':'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#64748B', opacity:page===totalPages?.4:1 }}>
                    <ChevronRight size={15}/>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {modalOrden && (
        <ModalPago
          orden={modalOrden}
          onClose={() => setModalOrden(null)}
          onSaved={() => setModalOrden(null)}
        />
      )}
    </div>
  );
}