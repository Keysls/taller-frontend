import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, X, Loader2, ChevronLeft, ChevronRight, Eye,
  Plus, Pencil, Trash2, RefreshCw, Activity,
} from 'lucide-react';
import api from '../../services/api.js';

// ─── API ──────────────────────────────────────────────────────────
const auditApi = {
  getAll: (params) => api.get('/auditoria', { params }).then(r => r.data),
  getById: (id)     => api.get(`/auditoria/${id}`).then(r => r.data.data),
};
const usuariosApi = {
  getAll: () => api.get('/usuarios').then(r => r.data.data || []),
};

const fmtDH = d => d ? new Date(d).toLocaleString('es-PE', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' }) : '—';

const PER_PAGE = 30;

// ─── Config visual por tipo de acción ─────────────────────────────
const ACCION_CFG = {
  CREAR:         { bg:'#F0FDF4', color:'#15803D', label:'Creó',          Icon: Plus      },
  EDITAR:        { bg:'#EFF6FF', color:'#1D4ED8', label:'Editó',         Icon: Pencil    },
  ELIMINAR:      { bg:'#FEF2F2', color:'#DC2626', label:'Eliminó',       Icon: Trash2    },
  CAMBIO_ESTADO: { bg:'#FFF7ED', color:'#C2410C', label:'Cambió estado', Icon: RefreshCw },
};
const accionCfg = (a) => ACCION_CFG[a] || { bg:'#F1F5F9', color:'#64748B', label:a||'—', Icon: Activity };

// ─── Estilos compartidos ──────────────────────────────────────────
const iS = { width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid #E2ECF4', background:'#F8FAFC', fontSize:13, color:'#0D1B2A', outline:'none', boxSizing:'border-box' };
const fo = e => e.target.style.borderColor = '#2563EB';
const bl = e => e.target.style.borderColor = '#E2ECF4';

const CSS_RESPONSIVE = `
  .aud-filtros { display:flex; gap:10px; flex-wrap:wrap; }
  .aud-filtro-search { position:relative; flex:1; min-width:200px; }
  .aud-tabla-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .aud-col-hide-sm { display:table-cell; }
  .aud-panel { width:460px !important; }

  @media (max-width:768px) {
    .aud-col-hide-sm { display:none !important; }
    .aud-panel { width:100vw !important; }
    .aud-pagination { padding:10px 12px !important; }
  }
`;

// ─── Render legible de un diff { campo: { antes, despues } } ──────
function DiffView({ cambios }) {
  if (!cambios || typeof cambios !== 'object' || !Object.keys(cambios).length) return null;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {Object.entries(cambios).map(([campo, val]) => (
        <div key={campo} style={{ borderRadius:10, border:'1px solid #F1F5F9', padding:'8px 12px', background:'#F8FAFC' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>{campo}</div>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, flexWrap:'wrap' }}>
            <span style={{ color:'#DC2626', textDecoration:'line-through', opacity:.8 }}>{String(val?.antes ?? '—')}</span>
            <span style={{ color:'#94A3B8' }}>→</span>
            <span style={{ color:'#15803D', fontWeight:600 }}>{String(val?.despues ?? '—')}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Render genérico del metadata cuando no es un diff de campos ──
function MetadataView({ metadata }) {
  if (!metadata || typeof metadata !== 'object') return null;
  const { cambios, ...resto } = metadata;
  const entries = Object.entries(resto).filter(([, v]) => v !== null && v !== undefined && v !== '');
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {cambios && Object.keys(cambios).length > 0 && (
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:'#0D1B2A', marginBottom:8 }}>Cambios realizados</div>
          <DiffView cambios={cambios} />
        </div>
      )}
      {entries.length > 0 && (
        <div>
          {cambios && Object.keys(cambios).length > 0 && (
            <div style={{ fontSize:12, fontWeight:700, color:'#0D1B2A', marginBottom:8, marginTop:4 }}>Datos adicionales</div>
          )}
          <div style={{ borderRadius:10, border:'1px solid #F1F5F9', overflow:'hidden' }}>
            {entries.map(([k, v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', borderBottom:'1px solid #F8FAFC', fontSize:12 }}>
                <span style={{ color:'#94A3B8' }}>{k}</span>
                <span style={{ fontWeight:600, color:'#0D1B2A', textAlign:'right', maxWidth:240, wordBreak:'break-word' }}>
                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panel lateral de detalle ──────────────────────────────────────
function PanelDetalle({ id, onClose }) {
  const { data: registro, isLoading } = useQuery({ queryKey:['auditoria', id], queryFn:()=>auditApi.getById(id) });
  const cfg = accionCfg(registro?.accion);
  const Icon = cfg.Icon;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(15,23,42,0.3)', backdropFilter:'blur(2px)' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="aud-panel" style={{ position:'absolute', top:0, right:0, bottom:0, background:'#F4F8FC', boxShadow:'-8px 0 40px rgba(15,23,42,0.15)', display:'flex', flexDirection:'column', animation:'slideIn .25s ease' }}>

        <div style={{ padding:'16px 20px', background:'#fff', borderBottom:'1px solid #E2ECF4', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ flex:1, textAlign:'center' }}>
            <h2 style={{ fontSize:15, fontWeight:700, color:'#0D1B2A', margin:0 }}>Detalle de auditoría</h2>
            {registro && <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>{fmtDH(registro.fecha)}</div>}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#94A3B8', padding:4, marginLeft:8 }}><X size={18}/></button>
        </div>

        {isLoading ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#94A3B8' }}>
            <Loader2 size={20} style={{ animation:'spin 1s linear infinite' }}/>
          </div>
        ) : (
          <div style={{ flex:1, overflowY:'auto' }}>

            <div style={{ background:'#fff', margin:'12px 14px', borderRadius:14, border:'1px solid #E2ECF4', padding:'16px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={18} color={cfg.color}/>
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#0D1B2A' }}>{cfg.label}</div>
                  <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20, background:cfg.bg, color:cfg.color }}>{registro?.modulo}</span>
                </div>
              </div>

              {registro?.descripcion && (
                <div style={{ fontSize:13, color:'#334155', lineHeight:1.5, padding:'10px 12px', background:'#F8FAFC', borderRadius:10, marginBottom:14 }}>
                  {registro.descripcion}
                </div>
              )}

              <div style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #F1F5F9', fontSize:13 }}>
                <span style={{ color:'#94A3B8', fontSize:12 }}>Usuario</span>
                <span style={{ fontWeight:700, color:'#0D1B2A' }}>{registro?.usuario?.nombre || '—'}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #F1F5F9', fontSize:13 }}>
                <span style={{ color:'#94A3B8', fontSize:12 }}>Correo</span>
                <span style={{ fontWeight:500, color:'#0D1B2A' }}>{registro?.usuario?.email || '—'}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #F1F5F9', fontSize:13 }}>
                <span style={{ color:'#94A3B8', fontSize:12 }}>Rol</span>
                <span style={{ fontWeight:500, color:'#0D1B2A' }}>{registro?.usuario?.rol?.nombre || '—'}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', fontSize:13 }}>
                <span style={{ color:'#94A3B8', fontSize:12 }}>IP</span>
                <span style={{ fontWeight:500, color:'#0D1B2A', fontFamily:'monospace' }}>{registro?.ip || '—'}</span>
              </div>
            </div>

            {registro?.metadata && (
              <div style={{ background:'#fff', margin:'0 14px 12px', borderRadius:14, border:'1px solid #E2ECF4', padding:'16px 18px' }}>
                <MetadataView metadata={registro.metadata} />
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────
export default function Auditoria() {
  const [panelId,   setPanelId]   = useState(null);
  const [search,    setSearch]    = useState('');
  const [moduloFlt, setModuloFlt] = useState('');
  const [accionFlt, setAccionFlt] = useState('');
  const [usuarioFlt,setUsuarioFlt]= useState('');
  const [desde,     setDesde]     = useState('');
  const [hasta,     setHasta]     = useState('');
  const [page,       setPage]     = useState(1);

  const params = {
    page, limit: PER_PAGE,
    ...(moduloFlt  && { modulo: moduloFlt }),
    ...(accionFlt  && { accion: accionFlt }),
    ...(usuarioFlt && { usuarioId: usuarioFlt }),
    ...(desde      && { desde }),
    ...(hasta      && { hasta }),
  };

  const { data: resp, isLoading } = useQuery({ queryKey:['auditoria', params], queryFn:()=>auditApi.getAll(params) });
  const { data: usuarios=[] } = useQuery({ queryKey:['usuarios-all'], queryFn: usuariosApi.getAll });

  const registros  = resp?.data || [];
  const totalCount = resp?.pagination?.total ?? resp?.total ?? registros.length;
  const totalPages = Math.ceil(totalCount / PER_PAGE) || 1;

  const filtradas = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return registros;
    return registros.filter(r =>
      r.descripcion?.toLowerCase().includes(q) ||
      r.usuario?.nombre?.toLowerCase().includes(q) ||
      r.modulo?.toLowerCase().includes(q)
    );
  }, [registros, search]);

  const limpiarFiltros = () => {
    setSearch(''); setModuloFlt(''); setAccionFlt(''); setUsuarioFlt('');
    setDesde(''); setHasta(''); setPage(1);
  };
  const hayFiltros = search || moduloFlt || accionFlt || usuarioFlt || desde || hasta;

  return (
    <div>
      <style>{CSS_RESPONSIVE}</style>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:18, fontWeight:700, color:'#0D1B2A', margin:0 }}>Auditoría</h1>
          <p style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>{totalCount} registros</p>
        </div>
      </div>

      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #F1F5F9', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', overflow:'hidden' }}>

        {/* Filtros */}
        <div style={{ padding:'14px 16px', borderBottom:'1px solid #F1F5F9' }} className="aud-filtros">
          <div className="aud-filtro-search">
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94A3B8', pointerEvents:'none' }}/>
            <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por descripción, usuario o módulo..."
              style={{ ...iS, paddingLeft:32, background:'#F8FAFC' }} onFocus={fo} onBlur={bl}/>
          </div>

          <select value={usuarioFlt} onChange={e=>{ setUsuarioFlt(e.target.value); setPage(1); }}
            style={{ ...iS, width:'auto', minWidth:150, background:'#F8FAFC', cursor:'pointer' }} onFocus={fo} onBlur={bl}>
            <option value="">Todos los usuarios</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>

          <select value={accionFlt} onChange={e=>{ setAccionFlt(e.target.value); setPage(1); }}
            style={{ ...iS, width:'auto', minWidth:150, background:'#F8FAFC', cursor:'pointer' }} onFocus={fo} onBlur={bl}>
            <option value="">Todas las acciones</option>
            {Object.entries(ACCION_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          <input type="date" value={desde} onChange={e=>{ setDesde(e.target.value); setPage(1); }}
            style={{ ...iS, width:'auto', minWidth:130, background:'#F8FAFC' }} onFocus={fo} onBlur={bl}/>
          <input type="date" value={hasta} onChange={e=>{ setHasta(e.target.value); setPage(1); }}
            style={{ ...iS, width:'auto', minWidth:130, background:'#F8FAFC' }} onFocus={fo} onBlur={bl}/>

          {hayFiltros && (
            <button onClick={limpiarFiltros}
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
            <div className="aud-tabla-wrap">
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#F8FAFC', borderBottom:'1px solid #F1F5F9' }}>
                    {[
                      { label:'Fecha',     hide:false },
                      { label:'Usuario',   hide:false },
                      { label:'Acción',    hide:false },
                      { label:'Módulo',    hide:false },
                      { label:'Descripción', hide:true },
                      { label:'IP',        hide:true  },
                      { label:'',          hide:false },
                    ].map(h => (
                      <th key={h.label} className={h.hide ? 'aud-col-hide-sm' : ''} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.05em', whiteSpace:'nowrap' }}>{h.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map(r => {
                    const cfg = accionCfg(r.accion);
                    const Icon = cfg.Icon;
                    return (
                      <tr key={r.id} style={{ borderBottom:'1px solid #F8FAFC', cursor:'pointer' }}
                        onMouseEnter={e=>e.currentTarget.style.background='#FAFBFF'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                        onClick={()=>setPanelId(r.id)}>
                        <td style={{ padding:'11px 14px', fontSize:12, color:'#64748B', whiteSpace:'nowrap' }}>{fmtDH(r.fecha)}</td>
                        <td style={{ padding:'11px 14px', fontSize:13, fontWeight:600, color:'#0D1B2A', whiteSpace:'nowrap' }}>{r.usuario?.nombre || '—'}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:cfg.bg, color:cfg.color }}>
                            <Icon size={11}/> {cfg.label}
                          </span>
                        </td>
                        <td style={{ padding:'11px 14px' }}>
                          <span style={{ fontSize:12, fontWeight:600, background:'#F1F5F9', color:'#334155', padding:'2px 8px', borderRadius:6 }}>{r.modulo}</span>
                        </td>
                        <td className="aud-col-hide-sm" style={{ padding:'11px 14px', fontSize:12, color:'#64748B', maxWidth:320, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.descripcion || '—'}</td>
                        <td className="aud-col-hide-sm" style={{ padding:'11px 14px', fontSize:11, color:'#94A3B8', fontFamily:'monospace' }}>{r.ip || '—'}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <button onClick={e=>{ e.stopPropagation(); setPanelId(r.id); }}
                            style={{ width:30, height:30, borderRadius:8, border:'1px solid #E2ECF4', background:'#fff', cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#64748B' }}
                            onMouseEnter={e=>{ e.currentTarget.style.background='#EFF6FF'; e.currentTarget.style.color='#2563EB'; e.currentTarget.style.borderColor='#BFDBFE'; }}
                            onMouseLeave={e=>{ e.currentTarget.style.background='#fff'; e.currentTarget.style.color='#64748B'; e.currentTarget.style.borderColor='#E2ECF4'; }}>
                            <Eye size={13}/>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!filtradas.length && (
                    <tr><td colSpan={7} style={{ textAlign:'center', padding:48, color:'#94A3B8', fontSize:13 }}>
                      {hayFiltros ? 'Sin resultados' : 'No hay registros de auditoría'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="aud-pagination" style={{ padding:'12px 16px', borderTop:'1px solid #F1F5F9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'#94A3B8' }}>Página {page} de {totalPages} · {totalCount} registros</span>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                    style={{ width:32, height:32, borderRadius:8, border:'1px solid #E2ECF4', background:'#fff', cursor:page===1?'not-allowed':'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#64748B', opacity:page===1?.4:1 }}>
                    <ChevronLeft size={15}/>
                  </button>
                  {Array.from({length:totalPages},(_,i)=>i+1)
                    .filter(p=>p===1||p===totalPages||Math.abs(p-page)<=1)
                    .reduce((acc,p,idx,arr)=>{ if(idx>0&&p-arr[idx-1]>1)acc.push('...'); acc.push(p); return acc; },[])
                    .map((p,i)=>p==='...'
                      ?<span key={`e${i}`} style={{ fontSize:12, color:'#CBD5E1', padding:'0 4px' }}>…</span>
                      :<button key={p} onClick={()=>setPage(p)}
                          style={{ width:32, height:32, borderRadius:8, border:`1px solid ${p===page?'#2563EB':'#E2ECF4'}`, background:p===page?'#2563EB':'#fff', cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:p===page?700:400, color:p===page?'#fff':'#64748B' }}>{p}</button>
                    )}
                  <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                    style={{ width:32, height:32, borderRadius:8, border:'1px solid #E2ECF4', background:'#fff', cursor:page===totalPages?'not-allowed':'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#64748B', opacity:page===totalPages?.4:1 }}>
                    <ChevronRight size={15}/>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {panelId && <PanelDetalle id={panelId} onClose={()=>setPanelId(null)} />}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}