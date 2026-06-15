import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Plus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';

// ─── Estilos ──────────────────────────────────────────────────────
const iS = { width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid #E2ECF4', background:'#F8FAFC', fontSize:13, color:'#0D1B2A', outline:'none', boxSizing:'border-box', transition:'border-color .15s' };
const lS = { display:'block', fontSize:11, fontWeight:600, color:'#64748B', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' };
const fo = e => e.target.style.borderColor = '#2563EB';
const bl = e => e.target.style.borderColor = '#E2ECF4';

// ─── Modal Crear Servicio ─────────────────────────────────────────
function ModalCrearServicio({ tipo, nombre, onClose, onCreated }) {
  const [form, setForm] = useState({
    nombre: nombre || '',
    descripcion: '',
    precio: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      let res;
      if (tipo === 'servicio') {
        res = await api.post('/servicios', { nombre: form.nombre, descripcion: form.descripcion, precioBase: parseFloat(form.precio) });
      } else {
        res = await api.post('/servicios-terceros', { nombre: form.nombre, descripcion: form.descripcion, precio: parseFloat(form.precio) });
      }
      toast.success(`${tipo === 'servicio' ? 'Servicio' : 'Servicio externo'} creado`);
      onCreated(res.data.data);
    } catch(err) { toast.error(err.response?.data?.message || 'Error al crear'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(15,23,42,0.5)', backdropFilter:'blur(2px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:400, boxShadow:'0 20px 60px rgba(30,58,138,0.18)', border:'1px solid #E2ECF4', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#0D1B2A', margin:0 }}>
            Crear {tipo === 'servicio' ? 'servicio propio' : tipo === 'tercero' ? 'servicio externo' : 'repuesto'}
          </h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#94A3B8' }}><X size={16}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <label style={lS}>Nombre *</label>
              <input style={iS} value={form.nombre} onChange={e=>set('nombre',e.target.value)} required onFocus={fo} onBlur={bl}/>
            </div>
            <div>
              <label style={lS}>Descripción</label>
              <input style={iS} value={form.descripcion} onChange={e=>set('descripcion',e.target.value)} onFocus={fo} onBlur={bl}/>
            </div>
            <div>
              <label style={lS}>Precio (S/) *</label>
              <input style={iS} type="number" step="0.01" min="0" value={form.precio} onChange={e=>set('precio',e.target.value)} required onFocus={fo} onBlur={bl}/>
            </div>
          </div>
          <div style={{ padding:'12px 20px', borderTop:'1px solid #F1F5F9', display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding:'8px 16px', borderRadius:9, border:'1px solid #E2ECF4', background:'#fff', cursor:'pointer', fontSize:13, color:'#64748B' }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ padding:'8px 16px', borderRadius:9, border:'none', background:'#2563EB', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, display:'inline-flex', alignItems:'center', gap:6 }}>
              {saving && <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }}/>}
              {saving ? 'Creando…' : 'Crear y agregar'}
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Modal Crear Repuesto ─────────────────────────────────────────
function ModalCrearRepuesto({ nombre, onClose, onCreated }) {
  const [form, setForm] = useState({ nombre: nombre||'', codigo:'', categoria:'', costo:'', precioVenta:'', stock:1, stockMinimo:5 });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await api.post('/inventario', { ...form, costo:parseFloat(form.costo), precioVenta:parseFloat(form.precioVenta), stock:+form.stock, stockMinimo:+form.stockMinimo });
      toast.success('Repuesto creado');
      onCreated(res.data.data);
    } catch(err) { toast.error(err.response?.data?.message || 'Error al crear'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(15,23,42,0.5)', backdropFilter:'blur(2px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(30,58,138,0.18)', border:'1px solid #E2ECF4', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#0D1B2A', margin:0 }}>Crear repuesto</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#94A3B8' }}><X size={16}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding:'16px 20px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 12px' }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={lS}>Nombre *</label>
              <input style={iS} value={form.nombre} onChange={e=>set('nombre',e.target.value)} required onFocus={fo} onBlur={bl}/>
            </div>
            <div>
              <label style={lS}>Código *</label>
              <input style={iS} value={form.codigo} onChange={e=>set('codigo',e.target.value)} required onFocus={fo} onBlur={bl}/>
            </div>
            <div>
              <label style={lS}>Categoría</label>
              <input style={iS} value={form.categoria} onChange={e=>set('categoria',e.target.value)} onFocus={fo} onBlur={bl}/>
            </div>
            <div>
              <label style={lS}>Costo S/ *</label>
              <input style={iS} type="number" step="0.01" value={form.costo} onChange={e=>set('costo',e.target.value)} required onFocus={fo} onBlur={bl}/>
            </div>
            <div>
              <label style={lS}>Precio venta S/ *</label>
              <input style={iS} type="number" step="0.01" value={form.precioVenta} onChange={e=>set('precioVenta',e.target.value)} required onFocus={fo} onBlur={bl}/>
            </div>
            <div>
              <label style={lS}>Stock inicial</label>
              <input style={iS} type="number" value={form.stock} onChange={e=>set('stock',e.target.value)} onFocus={fo} onBlur={bl}/>
            </div>
            <div>
              <label style={lS}>Stock mínimo</label>
              <input style={iS} type="number" value={form.stockMinimo} onChange={e=>set('stockMinimo',e.target.value)} onFocus={fo} onBlur={bl}/>
            </div>
          </div>
          <div style={{ padding:'12px 20px', borderTop:'1px solid #F1F5F9', display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding:'8px 16px', borderRadius:9, border:'1px solid #E2ECF4', background:'#fff', cursor:'pointer', fontSize:13, color:'#64748B' }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ padding:'8px 16px', borderRadius:9, border:'none', background:'#2563EB', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, display:'inline-flex', alignItems:'center', gap:6 }}>
              {saving && <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }}/>}
              {saving ? 'Creando…' : 'Crear y agregar'}
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── SearchSelect de servicios (propios + terceros) ───────────────
export function ServicioSearchSelect({ servicios, terceros, onAdd, onNewServicio, onNewTercero }) {
  const [query, setQuery] = useState('');
  const [open,  setOpen]  = useState(false);
  const [crear, setCrear] = useState(null); // 'servicio' | 'tercero'
  const ref = useRef(null);

  useEffect(() => {
    const fn = e => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const todos = useMemo(() => [
    ...servicios.filter(s=>s.activo).map(s=>({...s, _tipo:'servicio', _precio:s.precioBase})),
    ...terceros.filter(s=>s.activo).map(s=>({...s, _tipo:'tercero', _precio:s.precio})),
  ], [servicios, terceros]);

  const filtrados = useMemo(() => {
    if(!query) return todos.slice(0,10);
    const q = query.toLowerCase();
    return todos.filter(s => s.nombre?.toLowerCase().includes(q) || s.descripcion?.toLowerCase().includes(q));
  }, [query, todos]);

  const fmt = n => new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n??0);

  const handleSelect = item => {
    onAdd(item, item._tipo);
    setQuery(''); setOpen(false);
  };

  const handleCreated = (tipo, item) => {
    setCrear(null);
    const precio = tipo === 'servicio' ? item.precioBase : item.precio;
    onAdd({...item, _tipo:tipo, _precio:precio}, tipo);
    if(tipo === 'servicio') onNewServicio?.(item);
    else onNewTercero?.(item);
    setQuery(''); setOpen(false);
  };

  return (
    <>
    <div ref={ref} style={{ position:'relative', marginBottom:12 }}>
      <div style={{ position:'relative' }}>
        <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94A3B8', pointerEvents:'none' }}/>
        <input value={query} onChange={e=>{ setQuery(e.target.value); setOpen(true); }}
          onFocus={()=>{ fo({target:{style:{}}}); setOpen(true); }}
          placeholder="Buscar servicio propio o externo..."
          style={{ ...iS, paddingLeft:32 }}/>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'#fff', borderRadius:12, border:'1px solid #E2ECF4', boxShadow:'0 8px 24px rgba(15,23,42,0.12)', zIndex:100, overflow:'hidden', maxHeight:280, overflowY:'auto' }}>
          {filtrados.map(s => (
            <button key={s.id} onMouseDown={()=>handleSelect(s)}
              style={{ width:'100%', padding:'9px 14px', textAlign:'left', background:'transparent', border:'none', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13 }}
              onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:4,
                  background: s._tipo==='servicio' ? '#EFF6FF' : '#F5F3FF',
                  color:      s._tipo==='servicio' ? '#1D4ED8' : '#7C3AED' }}>
                  {s._tipo==='servicio'?'PROPIO':'EXTERNO'}
                </span>
                <span style={{ color:'#0D1B2A', fontWeight:500 }}>{s.nombre}</span>
              </div>
              <span style={{ fontWeight:700, color:'#0D1B2A', fontSize:13 }}>{fmt(s._precio)}</span>
            </button>
          ))}
          <div style={{ borderTop:'1px solid #F1F5F9', padding:6, display:'flex', gap:6 }}>
            <button onMouseDown={()=>{ setOpen(false); setCrear('servicio'); }}
              style={{ flex:1, padding:'7px 10px', borderRadius:8, border:'1px dashed #BFDBFE', background:'#EFF6FF', color:'#1D4ED8', cursor:'pointer', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
              <Plus size={13}/> Nuevo servicio propio
            </button>
            <button onMouseDown={()=>{ setOpen(false); setCrear('tercero'); }}
              style={{ flex:1, padding:'7px 10px', borderRadius:8, border:'1px dashed #DDD6FE', background:'#F5F3FF', color:'#7C3AED', cursor:'pointer', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
              <Plus size={13}/> Nuevo servicio externo
            </button>
          </div>
        </div>
      )}
    </div>
    {crear && (crear === 'repuesto'
      ? null
      : <ModalCrearServicio tipo={crear} nombre={query} onClose={()=>setCrear(null)} onCreated={item=>handleCreated(crear,item)}/>
    )}
    </>
  );
}

// ─── SearchSelect de repuestos ────────────────────────────────────
export function RepuestoSearchSelect({ repuestos, onAdd, onNewRepuesto }) {
  const [query, setQuery] = useState('');
  const [open,  setOpen]  = useState(false);
  const [crear, setCrear] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = e => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const filtrados = useMemo(() => {
    const activos = repuestos.filter(r=>r.activo);
    if(!query) return activos.slice(0,10);
    const q = query.toLowerCase();
    return activos.filter(r => r.nombre?.toLowerCase().includes(q) || r.codigo?.toLowerCase().includes(q));
  }, [query, repuestos]);

  const fmt = n => new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n??0);

  const handleSelect = item => { onAdd(item); setQuery(''); setOpen(false); };

  const handleCreated = item => {
    setCrear(false);
    onAdd(item);
    onNewRepuesto?.(item);
    setQuery(''); setOpen(false);
  };

  return (
    <>
    <div ref={ref} style={{ position:'relative', marginBottom:12 }}>
      <div style={{ position:'relative' }}>
        <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94A3B8', pointerEvents:'none' }}/>
        <input value={query} onChange={e=>{ setQuery(e.target.value); setOpen(true); }}
          onFocus={()=>setOpen(true)}
          placeholder="Buscar repuesto por nombre o código..."
          style={{ ...iS, paddingLeft:32 }}/>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'#fff', borderRadius:12, border:'1px solid #E2ECF4', boxShadow:'0 8px 24px rgba(15,23,42,0.12)', zIndex:100, overflow:'hidden', maxHeight:280, overflowY:'auto' }}>
          {filtrados.map(r => (
            <button key={r.id} onMouseDown={()=>handleSelect(r)}
              style={{ width:'100%', padding:'9px 14px', textAlign:'left', background:'transparent', border:'none', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13 }}
              onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div>
                <span style={{ fontWeight:600, color:'#0D1B2A' }}>{r.nombre}</span>
                <span style={{ fontSize:11, color:'#94A3B8', marginLeft:8 }}>Stock: {r.stock}</span>
                {r.codigo && <span style={{ fontSize:10, color:'#2563EB', background:'#EFF6FF', padding:'1px 6px', borderRadius:4, marginLeft:6 }}>{r.codigo}</span>}
              </div>
              <span style={{ fontWeight:700, color:'#0D1B2A', fontSize:13, flexShrink:0 }}>{fmt(r.precioVenta)}</span>
            </button>
          ))}
          {filtrados.length === 0 && (
            <div style={{ padding:'12px 14px', fontSize:12, color:'#94A3B8', textAlign:'center' }}>
              Sin resultados para "{query}"
            </div>
          )}
          <div style={{ borderTop:'1px solid #F1F5F9', padding:6 }}>
            <button onMouseDown={()=>{ setOpen(false); setCrear(true); }}
              style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px dashed #FED7AA', background:'#FFF7ED', color:'#C2410C', cursor:'pointer', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
              <Plus size={13}/> Repuesto no encontrado — Crear nuevo
            </button>
          </div>
        </div>
      )}
    </div>
    {crear && <ModalCrearRepuesto nombre={query} onClose={()=>setCrear(false)} onCreated={handleCreated}/>}
    </>
  );
}