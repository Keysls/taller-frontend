import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import { ServicioSearchSelect, RepuestoSearchSelect } from './SearchSelect.jsx';

// ─── API ──────────────────────────────────────────────────────────
const extApi = {
  clientes:  () => api.get('/clientes?limit=500').then(r => r.data.data || []),
  vehiculos: () => api.get('/vehiculos?limit=500').then(r => r.data.data || []),
  mecanicos: () => api.get('/mecanicos').then(r => r.data.data || []),
  servicios: () => api.get('/servicios').then(r => r.data.data || []),
  terceros:  () => api.get('/servicios-terceros').then(r => r.data.data || []),
  repuestos: () => api.get('/inventario').then(r => r.data.data || []),
  crearCot:  (d) => api.post('/cotizaciones', d).then(r => r.data.data),
  crearOT:   (d) => api.post('/ordenes', d).then(r => r.data.data),
};

const fmt = n => `S/${Number(n ?? 0).toFixed(2)}`;
const METODOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'YAPE', 'PLIN'];

// ─── Estilos globales ─────────────────────────────────────────────
const CSS = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .cot-input {
    width: 100%; padding: 8px 10px; border-radius: 6px;
    border: 1px solid #d1d5db; background: #fff;
    font-size: 13px; color: #1e293b; outline: none; box-sizing: border-box;
    font-family: inherit;
  }
  .cot-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
  .cot-input[readonly], .cot-input:disabled { background: #e9ecef; color: #64748b; cursor: default; }
  .cot-label { display: block; font-size: 11px; color: #374151; margin-bottom: 4px; }
  .cot-field { margin-bottom: 10px; }
  .cot-card {
    background: #fff; border-radius: 12px; padding: 20px 22px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08); border: 1px solid #e5e7eb;
  }
  .cot-card h3 { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 16px; }
  .cot-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
  .cot-tab {
    padding: 12px 28px; font-size: 13px; font-weight: 500;
    color: #94a3b8; background: transparent; border: none;
    border-bottom: 3px solid transparent; cursor: pointer;
    transition: all .15s; margin-bottom: -1px;
  }
  .cot-tab.active { color: #2563eb; border-bottom-color: #2563eb; font-weight: 700; }
  .cot-tab.done   { color: #64748b; }
  .svc-btn {
    flex: 1; padding: 10px 0; border-radius: 8px; font-size: 13px; font-weight: 600;
    border: 1.5px solid #d1d5db; background: #f8fafc; color: #64748b; cursor: pointer;
  }
  .svc-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; }

  /* ── Layout grids ── */
  .cot-tab1-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: stretch; }
  .cot-tab2-grid   { display: grid; grid-template-columns: 1fr 1fr; margin: 0 16px 16px; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; background: #fff; }
  .cot-tab2-svc    { padding: 16px 18px; border-right: 1px solid #e5e7eb; }
  .cot-tab2-rep    { padding: 16px 18px; display: flex; flex-direction: column; }
  .cot-resumen-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 32px; }
  .cot-resumen-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }

  @media (max-width: 768px) {
    .cot-card { padding: 14px 14px; }
    .cot-card h3 { font-size: 15px; margin-bottom: 10px; }
    .cot-grid2 { grid-template-columns: 1fr; gap: 0; }
    .cot-tab { padding: 10px 12px; font-size: 11px; }
    .cot-tab1-grid { grid-template-columns: 1fr; }
    .cot-tab2-grid { grid-template-columns: 1fr; margin: 0 10px 12px; }
    .cot-tab2-svc  { border-right: none; border-bottom: 1px solid #e5e7eb; }
    .cot-resumen-grid  { grid-template-columns: 1fr; gap: 8px; }
    .cot-resumen-inner { grid-template-columns: 1fr 1fr; gap: 6px 12px; }
  }
`;

// ─── Modal crear cliente rápido ───────────────────────────────────
function ModalCrearCliente({ nombreInicial, onClose, onCreado }) {
  const parts = (nombreInicial || '').trim().split(' ');
  const [form, setForm] = useState({
    nombres:   parts[0] || '',
    apellidos: parts.slice(1).join(' ') || '',
    dniRuc: '', telefono: '', email: '', direccion: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await api.post('/clientes', form);
      toast.success('Cliente creado');
      onCreado(res.data.data);
    } catch(err) { toast.error(err.response?.data?.message || 'Error al crear cliente'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(15,23,42,0.5)', backdropFilter:'blur(2px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(30,58,138,0.18)', border:'1px solid #e5e7eb', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#1e293b', margin:0 }}>Crear nuevo cliente</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}><X size={16}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding:'16px 20px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 14px' }}>
            <div>
              <label className="cot-label">Nombres *</label>
              <input className="cot-input" value={form.nombres} onChange={e=>set('nombres',e.target.value)} required/>
            </div>
            <div>
              <label className="cot-label">Apellidos *</label>
              <input className="cot-input" value={form.apellidos} onChange={e=>set('apellidos',e.target.value)} required/>
            </div>
            <div>
              <label className="cot-label">DNI/RUC</label>
              <input className="cot-input" value={form.dniRuc} onChange={e=>set('dniRuc',e.target.value)}/>
            </div>
            <div>
              <label className="cot-label">Teléfono</label>
              <input className="cot-input" value={form.telefono} onChange={e=>set('telefono',e.target.value)}/>
            </div>
            <div>
              <label className="cot-label">Correo</label>
              <input className="cot-input" value={form.email} onChange={e=>set('email',e.target.value)}/>
            </div>
            <div>
              <label className="cot-label">Dirección</label>
              <input className="cot-input" value={form.direccion} onChange={e=>set('direccion',e.target.value)}/>
            </div>
          </div>
          <div style={{ padding:'12px 20px', borderTop:'1px solid #f1f5f9', display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer', fontSize:13, color:'#64748b' }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ padding:'8px 18px', borderRadius:8, border:'none', background:'#2563eb', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, display:'inline-flex', alignItems:'center', gap:6 }}>
              {saving && <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }}/>}
              {saving ? 'Creando…' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Autocomplete clientes ────────────────────────────────────────
function ClienteSearch({ clientes, value, onSelect, onClear, onNuevo }) {
  const [q, setQ]       = useState('');
  const [open, setOpen] = useState(false);
  const ref             = useRef(null);
  const sel             = clientes.find(c => c.id === value);

  useEffect(() => {
    if (sel) setQ(`${sel.nombres} ${sel.apellidos}`);
    else setQ('');
  }, [value]);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const filtrados = useMemo(() => {
    if (!q || sel) return [];
    const lq = q.toLowerCase();
    return clientes.filter(c =>
      c.nombres?.toLowerCase().includes(lq) ||
      c.apellidos?.toLowerCase().includes(lq) ||
      c.dniRuc?.includes(lq)
    ).slice(0, 8);
  }, [q, clientes, sel]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input className="cot-input" value={q}
          onChange={e => { setQ(e.target.value); if (sel) onClear(); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar cliente..." />
        {value && (
          <button onClick={() => { onClear(); setQ(''); }}
            style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
            <X size={13}/>
          </button>
        )}
      </div>
      {open && (filtrados.length > 0 || q.length > 1) && !sel && (
        <div style={{ position:'absolute', top:'calc(100% + 3px)', left:0, right:0, background:'#fff', borderRadius:8, border:'1px solid #e2e8f0', boxShadow:'0 4px 16px rgba(0,0,0,0.1)', zIndex:200, overflow:'hidden' }}>
          {filtrados.map(c => (
            <button key={c.id} onMouseDown={() => { onSelect(c); setOpen(false); }}
              style={{ width:'100%', padding:'9px 12px', textAlign:'left', background:'transparent', border:'none', cursor:'pointer', display:'flex', justifyContent:'space-between', fontSize:13 }}
              onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <span style={{ fontWeight:600 }}>{c.nombres} {c.apellidos}</span>
              <span style={{ fontSize:11, color:'#2563eb', background:'#eff6ff', padding:'1px 7px', borderRadius:4 }}>{c.dniRuc}</span>
            </button>
          ))}
          {filtrados.length === 0 && q.length > 1 && (
            <div style={{ padding:'8px 12px', fontSize:12, color:'#94a3b8' }}>Sin resultados para "{q}"</div>
          )}
          <button onMouseDown={() => { onNuevo(q); setOpen(false); }}
            style={{ width:'100%', padding:'9px 12px', textAlign:'left', background:'#f0fdf4', border:'none', borderTop:'1px solid #e2e8f0', cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#15803d', fontWeight:600 }}>
            <span style={{ fontSize:16 }}>+</span> Crear cliente "{q || 'nuevo'}"
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Resumen header (tabs 2 y 3) ─────────────────────────────────
function ResumenHeader({ form, clienteObj, vehiculoObj, serviciosTipo }) {
  const Row = ({ label, value }) => (
    <div>
      <div style={{ fontSize:11, color:'#94a3b8', marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:600, color:'#1e293b' }}>{value || '—'}</div>
    </div>
  );
  return (
    <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', margin:'0 16px 14px', padding:'16px 20px' }}>
      <div className="cot-resumen-grid">
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:'#1e293b', marginBottom:10 }}>Datos del Cliente</div>
          <div className="cot-resumen-inner">
            <Row label="Señor:" value={form.facturarA || `${clienteObj?.nombres||''} ${clienteObj?.apellidos||''}`} />
            <Row label="Dirección:" value={form.direccion} />
            <Row label="Servicios:" value={serviciosTipo.join('  ')} />
            <Row label="Metodo de Pago" value={form.metodoPago} />
          </div>
        </div>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:'#1e293b', marginBottom:10 }}>Datos del auto</div>
          <div className="cot-resumen-inner">
            <Row label="Placa:" value={form.placa} />
            <Row label="Motor:" value={form.motor} />
            <Row label="Modelo:" value={form.modelo || vehiculoObj?.modelo} />
            <Row label="Kilometraje:" value={form.km2 ? Number(form.km2).toLocaleString() : vehiculoObj?.kilometraje?.toLocaleString()} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal principal ──────────────────────────────────────────────
export default function NuevaCotizacionModal({ onClose, onSaved, initialData = null, otId = null }) {
  const qc = useQueryClient();
  const [step, setStep]              = useState(1);
  const [stepsUnlocked, setUnlocked] = useState(initialData ? 3 : 1);
  const [saving, setSaving]          = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState(null);
  const bodyRef                      = useRef(null);

  const [form, setForm] = useState(() => {
    if (!initialData) return {
      clienteId:'', facturarA:'', direccion:'', dniRuc:'',
      correo:'', celular:'', contacto:'', celular2:'',
      asesor:'', metodoPago:'EFECTIVO',
      fechaApertura: new Date().toLocaleString('es-PE'),
      tieneMantenimiento:false, tieneCorrectivo:false, km1:'',
      vehiculoId:'', placa:'', marca:'', modelo:'', anio:'',
      color:'', motor:'', chasis:'', km2:'',
      mecanicoId:'', nota:'', nota2:'',
      prioridad:'NORMAL',
    };
    const t = initialData.tipoOrden || '';
    return {
      clienteId:          initialData.clienteId    || '',
      facturarA:          initialData.facturarA    || '',
      direccion:          initialData.direccion    || '',
      dniRuc:             initialData.dniRuc       || '',
      correo:             initialData.correo       || '',
      celular:            initialData.telefono     || '',
      contacto:           initialData.contacto     || '',
      celular2:           initialData.telefono2    || '',
      asesor:             initialData.asesor       || '',
      metodoPago:         initialData.metodoPago   || 'EFECTIVO',
      fechaApertura:      new Date().toLocaleString('es-PE'),
      tieneMantenimiento: t.includes('Mantenimiento'),
      tieneCorrectivo:    t.includes('Correctivo'),
      km1:                initialData.km1          || '',
      vehiculoId:         initialData.vehiculoId   || '',
      placa:              initialData.placa        || '',
      marca:              initialData.marca        || '',
      modelo:             initialData.modelo       || '',
      anio:               initialData.anio         || '',
      color:              initialData.color        || '',
      motor:              initialData.motor        || '',
      chasis:             initialData.chasis       || '',
      km2:                initialData.km2          || '',
      mecanicoId:         initialData.mecanicoId   || '',
      nota:               initialData.nota1        || '',
      nota2:              initialData.nota2        || '',
      prioridad: initialData.prioridad             || 'NORMAL',
    };
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [step]);

  const [svcItems, setSvcItems] = useState(() => {
    if (!initialData?.items) return [];
    return initialData.items
      .filter(i => i.tipo === 'servicio' || i.tipo === 'tercero')
      .map(i => ({ id: i.servicioId || i.refId || i.id, nombre: i.descripcion, precio: Number(i.precioUnit), tipo: i.tipo }));
  });
  const [repItems, setRepItems] = useState(() => {
    if (!initialData?.items) return [];
    return initialData.items
      .filter(i => i.tipo === 'repuesto')
      .map(i => ({ id: i.repuestoId || i.refId || i.id, nombre: i.descripcion, cantidad: i.cantidad || 1, precio: Number(i.precioUnit) }));
  });
  const [descSvc,  setDescSvc]  = useState(initialData?.descuentoSvc ? String(initialData.descuentoSvc) : '');
  const [descRep,  setDescRep]  = useState(initialData?.descuentoRep ? String(initialData.descuentoRep) : '');

  const { data: clientes  = [] } = useQuery({ queryKey:['cli-all'],   queryFn: extApi.clientes  });
  const { data: vehiculos = [] } = useQuery({ queryKey:['veh-all'],   queryFn: extApi.vehiculos });
  const { data: mecanicos = [] } = useQuery({ queryKey:['mecanicos'], queryFn: extApi.mecanicos });
  const { data: servicios = [] } = useQuery({ queryKey:['servicios'], queryFn: extApi.servicios });
  const { data: terceros  = [] } = useQuery({ queryKey:['terceros'],  queryFn: extApi.terceros  });
  const { data: repuestos = [] } = useQuery({ queryKey:['inventario'],queryFn: extApi.repuestos });

  const clienteObj  = clientes.find(c => c.id === form.clienteId);
  const vehiculoObj = vehiculos.find(v => v.id === form.vehiculoId);

  const serviciosTipo = [
    form.tieneMantenimiento && 'Mantenimiento',
    form.tieneCorrectivo    && 'Correctivo',
  ].filter(Boolean);

  const subSvc   = svcItems.reduce((s, i) => s + i.precio, 0);
  const subRep   = repItems.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const totalSvc = Math.max(0, subSvc * (1 - Number(descSvc || 0) / 100));
  const totalRep = Math.max(0, subRep * (1 - Number(descRep || 0) / 100));
  const total    = totalSvc + totalRep;

  const addSvc = (item, tipo) => {
    const precio = tipo === 'tercero' ? Number(item.precio) : Number(item.precioBase);
    setSvcItems(p => [...p, { id: item.id, nombre: item.nombre, precio, tipo }]);
  };
  const removeSvc = idx => setSvcItems(p => p.filter((_, i) => i !== idx));

  const addRep = rep => {
    setRepItems(p => {
      const ex = p.findIndex(r => r.id === rep.id);
      if (ex >= 0) { const n = [...p]; n[ex] = { ...n[ex], cantidad: n[ex].cantidad + 1 }; return n; }
      return [...p, { id: rep.id, nombre: rep.nombre, cantidad: 1, precio: Number(rep.precioVenta) }];
    });
  };
  const removeRep = idx => setRepItems(p => p.filter((_, i) => i !== idx));
  const setCant   = (idx, v) => setRepItems(p => p.map((r, i) => i === idx ? { ...r, cantidad: Math.max(1, +v||1) } : r));

  const goTo2 = () => {
    if (!form.clienteId && !form.facturarA) { toast.error('Ingresa el propietario'); return; }
    if (!form.placa) { toast.error('Ingresa la placa'); return; }
    setUnlocked(2); setStep(2);
  };

  const guardar = async (irAOT = false) => {
    setSaving(true);
    try {
      const items = [
        ...svcItems.map(i => ({ tipo: i.tipo === 'tercero' ? 'tercero' : 'servicio', descripcion: i.nombre, cantidad:1, precioUnit: i.precio, subtotal: i.precio, refId: i.id })),
        ...repItems.map(i => ({ tipo:'repuesto', descripcion: i.nombre, cantidad: i.cantidad, precioUnit: i.precio, subtotal: i.precio * i.cantidad, refId: i.id })),
      ];
      await extApi.crearCot({
        clienteId:    form.clienteId    || null,
        facturarA:    form.facturarA    || null,
        direccion:    form.direccion    || null,
        dniRuc:       form.dniRuc       || null,
        correo:       form.correo       || null,
        telefono:     form.celular      || null,
        contacto:     form.contacto     || null,
        telefono2:    form.celular2     || null,
        asesor:       form.asesor       || null,
        metodoPago:   form.metodoPago,
        fechaApertura:form.fechaApertura,
        km1:          form.km1          || null,
        vehiculoId:   form.vehiculoId   || null,
        placa:        form.placa        || null,
        marca:        form.marca        || null,
        modelo:       form.modelo       || null,
        anio:         form.anio         || null,
        color:        form.color        || null,
        motor:        form.motor        || null,
        chasis:       form.chasis       || null,
        km2:          form.km2          || null,
        tipoOrden:    serviciosTipo.join(', '),
        mecanicoId:   form.mecanicoId   || null,
        nota1:        form.nota         || null,
        nota2:        form.nota2        || null,
        items, descuentoSvc: descSvc || 0, descuentoRep: descRep || 0, total,
      });
      toast.success(irAOT ? 'Cotización creada' : 'Cotización guardada');
      qc.invalidateQueries(['cotizaciones']);
      if (irAOT) { setUnlocked(3); setStep(3); setSaving(false); return; }
      onSaved?.(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const crearOT = async () => {
    setSaving(true);
    try {
      const payload = {
        clienteId:    form.clienteId    || null,
        facturarA:    form.facturarA    || null,
        direccion:    form.direccion    || null,
        dniRuc:       form.dniRuc       || null,
        correo:       form.correo       || null,
        telefono:     form.celular      || null,
        contacto:     form.contacto     || null,
        telefono2:    form.celular2     || null,
        asesor:       form.asesor       || null,
        vehiculoId:   form.vehiculoId   || null,
        placa:        form.placa        || null,
        marca:        form.marca        || null,
        modelo:       form.modelo       || null,
        anio:         form.anio         || null,
        color:        form.color        || null,
        motor:        form.motor        || null,
        chasis:       form.chasis       || null,
        km2:          form.km2          || null,
        km1:          form.km1          || null,
        tipoOrden:    serviciosTipo.join(', '),
        mecanicoId:   form.mecanicoId   || null,
        metodoPago:   form.metodoPago,
        diagnostico:  form.nota         || null,
        observaciones:form.nota2        || null,
        nota1:        form.nota         || null,
        nota2:        form.nota2        || null,
        prioridad:    form.prioridad,
        descuentoSvc: descSvc || 0,
        descuentoRep: descRep || 0,
        servicios: svcItems.map(i => ({
          servicioId:  i.tipo !== 'tercero' ? (i.id || null) : null,
          precio:      i.precio,
          descripcion: i.nombre,
          tipo:        i.tipo,
        })),
        repuestos: repItems.map(i => ({
          repuestoId: i.id || null,
          cantidad:   i.cantidad,
          precioUnit: i.precio,
          subtotal:   i.precio * i.cantidad,
        })),
      };
      if (otId) {
        await api.patch(`/ordenes/${otId}/completo`, payload).then(r => r.data.data);
        toast.success('Orden de trabajo actualizada');
      } else {
        await extApi.crearOT(payload);
        toast.success('Orden de trabajo creada');
      }
      qc.invalidateQueries(['ordenes']);
      onSaved?.(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const todosItems = [
    ...svcItems.map(i => ({ nombre: i.nombre, cantidad: 1, descripcion: i.tipo === 'tercero' ? 'Servicio externo' : 'Servicio propio', precio: i.precio })),
    ...repItems.map(i => ({ nombre: i.nombre, cantidad: i.cantidad, descripcion: 'Repuesto', precio: i.precio * i.cantidad })),
  ];

  return (
    <>
    <style>{CSS}</style>
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(15,23,42,0.45)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#eef2f7', borderRadius:16, width:'100%', maxWidth:1100, boxShadow:'0 24px 80px rgba(15,23,42,0.2)', display:'flex', flexDirection:'column', maxHeight:'96vh', overflow:'hidden' }}>

        {/* ── Tabs ── */}
        <div style={{ background:'#eef2f7', flexShrink:0, position:'relative', borderBottom:'1px solid #e5e7eb' }}>
          <div style={{ display:'flex', justifyContent:'center', paddingTop:12, paddingBottom:0 }}>
            {[
              { label:'Datos de Cliente', n:1 },
              { label:'Cotización',       n:2 },
              { label:'Orden de Trabajo', n:3 },
            ].map(t => (
              <button key={t.n}
                className={`cot-tab ${step===t.n?'active':stepsUnlocked>=t.n?'done':''}`}
                onClick={() => stepsUnlocked >= t.n && setStep(t.n)}>
                {t.label}
              </button>
            ))}
            <button onClick={onClose} style={{ position:'absolute', right:12, top:12, background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
              <X size={18}/>
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div ref={bodyRef} style={{ flex:1, overflowY:'auto' }}>

          {/* ══ TAB 1 ══ */}
          {step === 1 && (
            <div style={{ padding:'16px' }} className="cot-tab1-grid">
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

                <div className="cot-card">
                  <h3>Datos del Cliente</h3>
                  <div className="cot-grid2">
                    <div className="cot-field">
                      <label className="cot-label">Propietario</label>
                      <ClienteSearch clientes={clientes} value={form.clienteId}
                        onSelect={c => { set('clienteId',c.id); set('facturarA',`${c.nombres} ${c.apellidos}`); set('direccion',c.direccion||''); set('dniRuc',c.dniRuc||''); set('correo',c.email||''); set('celular',c.telefono||''); }}
                        onClear={() => set('clienteId','')}
                        onNuevo={nombre => setNuevoCliente(nombre)} />
                    </div>
                    <div className="cot-field">
                      <label className="cot-label">Facturar á:</label>
                      <input className="cot-input" value={form.facturarA} onChange={e=>set('facturarA',e.target.value)}/>
                    </div>
                    <div className="cot-field">
                      <label className="cot-label">Direccion</label>
                      <input className="cot-input" value={form.direccion} onChange={e=>set('direccion',e.target.value)}/>
                    </div>
                    <div className="cot-field">
                      <label className="cot-label">RUC/DNI</label>
                      <input className="cot-input" value={form.dniRuc} onChange={e=>set('dniRuc',e.target.value)}/>
                    </div>
                    <div className="cot-field">
                      <label className="cot-label">Correo</label>
                      <input className="cot-input" value={form.correo} onChange={e=>set('correo',e.target.value)}/>
                    </div>
                    <div className="cot-field">
                      <label className="cot-label">Telefono</label>
                      <input className="cot-input" value={form.celular} onChange={e=>set('celular',e.target.value)}/>
                    </div>
                    <div className="cot-field">
                      <label className="cot-label">Contacto</label>
                      <input className="cot-input" value={form.contacto} onChange={e=>set('contacto',e.target.value)}/>
                    </div>
                    <div className="cot-field">
                      <label className="cot-label">Telefono 2</label>
                      <input className="cot-input" value={form.celular2} onChange={e=>set('celular2',e.target.value)}/>
                    </div>
                    <div className="cot-field">
                      <label className="cot-label">Asesor</label>
                      <input className="cot-input" value={form.asesor} onChange={e=>set('asesor',e.target.value)}/>
                    </div>
                    <div className="cot-field">
                      <label className="cot-label">Fecha/Hora de apertura:</label>
                      <input className="cot-input" value={form.fechaApertura} readOnly/>
                    </div>
                    <div className="cot-field" style={{ gridColumn:'1/-1' }}>
                      <label className="cot-label">Método de Pago</label>
                      <select className="cot-input" value={form.metodoPago} onChange={e=>set('metodoPago',e.target.value)}>
                        {METODOS_PAGO.map(m=><option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="cot-card">
                  <h3>Servicios</h3>
                  <div style={{ display:'flex', gap:12, marginBottom:16 }}>
                    {['Mantenimiento','Correctivo'].map(tipo => {
                      const key = tipo==='Mantenimiento'?'tieneMantenimiento':'tieneCorrectivo';
                      return (
                        <button key={tipo} className={`svc-btn ${form[key]?'active':''}`}
                          onClick={()=>set(key,!form[key])}>
                          {tipo}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <input className="cot-input" style={{ width:140 }} type="number" placeholder="0" value={form.km1} onChange={e=>set('km1',e.target.value)}/>
                    <span style={{ fontSize:20, fontWeight:800, color:'#1e293b' }}>km.</span>
                  </div>
                </div>
              </div>

              <div className="cot-card" style={{ height:'100%', boxSizing:'border-box' }}>
                <h3>Datos del auto</h3>
                <div className="cot-grid2">
                  <div className="cot-field">
                    <label className="cot-label">Placa</label>
                    <input className="cot-input" value={form.placa} onChange={e=>set('placa',e.target.value.toUpperCase())} maxLength={8}/>
                  </div>
                  <div className="cot-field">
                    <label className="cot-label">Marca</label>
                    <input className="cot-input" value={form.marca} onChange={e=>set('marca',e.target.value)}/>
                  </div>
                  <div className="cot-field">
                    <label className="cot-label">Modelo</label>
                    <input className="cot-input" value={form.modelo} onChange={e=>set('modelo',e.target.value)}/>
                  </div>
                  <div className="cot-field">
                    <label className="cot-label">Año</label>
                    <input className="cot-input" type="number" value={form.anio} onChange={e=>set('anio',e.target.value)}/>
                  </div>
                  <div className="cot-field">
                    <label className="cot-label">Color</label>
                    <input className="cot-input" value={form.color} onChange={e=>set('color',e.target.value)}/>
                  </div>
                  <div className="cot-field">
                    <label className="cot-label">Motor</label>
                    <input className="cot-input" value={form.motor} onChange={e=>set('motor',e.target.value)}/>
                  </div>
                  <div className="cot-field">
                    <label className="cot-label">Chasis</label>
                    <input className="cot-input" value={form.chasis} onChange={e=>set('chasis',e.target.value.toUpperCase())}/>
                  </div>
                  <div className="cot-field">
                    <label className="cot-label">Km.</label>
                    <input className="cot-input" type="number" value={form.km2} onChange={e=>set('km2',e.target.value)}/>
                  </div>
                  <div className="cot-field">
                    <label className="cot-label">Fecha</label>
                    <input className="cot-input" value={new Date().toLocaleDateString('es-PE')} readOnly/>
                  </div>
                  <div className="cot-field">
                    <label className="cot-label">Tipo de Orden</label>
                    <input className="cot-input" value={serviciosTipo.join(', ')} readOnly/>
                  </div>
                  <div className="cot-field" style={{ gridColumn:'1/-1' }}>
                    <label className="cot-label">Técnico</label>
                    <select className="cot-input" value={form.mecanicoId} onChange={e=>set('mecanicoId',e.target.value)}>
                      <option value="">— Sin asignar —</option>
                      {mecanicos.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </select>
                  </div>
                  <div className="cot-field" style={{ gridColumn:'1/-1', display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                    <div>
                      <label className="cot-label">Nota 1</label>
                      <textarea className="cot-input" style={{ resize:'none', minHeight:140 }} value={form.nota} onChange={e=>set('nota',e.target.value)}/>
                    </div>
                    <div>
                      <label className="cot-label">Nota 2</label>
                      <textarea className="cot-input" style={{ resize:'none', minHeight:140 }} value={form.nota2} onChange={e=>set('nota2',e.target.value)}/>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB 2 ══ */}
          {step === 2 && (
            <div style={{ paddingTop:16 }}>
              <ResumenHeader form={form} clienteObj={clienteObj} vehiculoObj={vehiculoObj} serviciosTipo={serviciosTipo} />

              <div className="cot-tab2-grid">
                {/* Servicios */}
                <div className="cot-tab2-svc">
                  <ServicioSearchSelect
                    servicios={servicios} terceros={terceros}
                    onAdd={(item,tipo) => addSvc(item,tipo)}
                    onNewServicio={() => qc.invalidateQueries(['servicios'])}
                    onNewTercero={() => qc.invalidateQueries(['terceros'])}
                  />
                  <div style={{ fontSize:14, fontWeight:700, color:'#1e293b', marginBottom:8 }}>Servicio</div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 60px 80px 24px', background:'#f8fafc', borderBottom:'1px solid #e5e7eb', padding:'6px 8px', borderRadius:'6px 6px 0 0' }}>
                    <span style={{ fontSize:11, fontWeight:600, color:'#64748b' }}>Nombre</span>
                    <span style={{ fontSize:11, fontWeight:600, color:'#64748b', textAlign:'center' }}>Cantidad</span>
                    <span style={{ fontSize:11, fontWeight:600, color:'#64748b', textAlign:'right' }}>Precio</span>
                    <span></span>
                  </div>

                  <div style={{ minHeight:180 }}>
                    {svcItems.map((item,i) => (
                      <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 60px 80px 24px', alignItems:'center', padding:'6px 8px', borderBottom:'1px solid #f8fafc', fontSize:13 }}>
                        <span style={{ color: item.tipo==='tercero'?'#7c3aed':'#1d4ed8' }}>
                          {item.tipo!=='tercero' && <span style={{ color:'#94a3b8' }}>— </span>}
                          {item.nombre}
                        </span>
                        <span style={{ textAlign:'center', color:'#64748b' }}>1</span>
                        <span style={{ textAlign:'right', fontWeight:600 }}>{fmt(item.precio)}</span>
                        <button onClick={()=>removeSvc(i)} style={{ background:'none', border:'none', cursor:'pointer', color:'#dc2626', fontSize:16, lineHeight:1, padding:0, textAlign:'center' }}>×</button>
                      </div>
                    ))}
                    {!svcItems.length && <div style={{ color:'#cbd5e1', fontSize:12, paddingTop:32, textAlign:'center' }}>Sin servicios</div>}
                  </div>

                  <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:8, paddingTop:10, borderTop:'1px solid #f1f5f9', flexWrap:'wrap' }}>
                    <span style={{ fontSize:12, color:'#64748b' }}>Descuento %</span>
                    <input className="cot-input" style={{ width:60, textAlign:'center' }} type="number" min="0" max="100" value={descSvc} onChange={e=>setDescSvc(e.target.value)} placeholder="0"/>
                    <span style={{ fontSize:12, color:'#64748b' }}>Subtotal:</span>
                    <span style={{ fontSize:14, fontWeight:700 }}>{fmt(totalSvc)}</span>
                  </div>
                </div>

                {/* Repuestos */}
                <div className="cot-tab2-rep">
                  <RepuestoSearchSelect
                    repuestos={repuestos}
                    onAdd={rep => addRep(rep)}
                    onNewRepuesto={() => qc.invalidateQueries(['inventario'])}
                  />
                  <div style={{ fontSize:14, fontWeight:700, color:'#1e293b', marginBottom:8 }}>Repuestos</div>
                  <div style={{ flex:1 }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead>
                        <tr style={{ background:'#f8fafc' }}>
                          <th style={{ padding:'6px 8px', textAlign:'left', fontWeight:600, color:'#64748b', borderBottom:'1px solid #e5e7eb' }}>Producto</th>
                          <th style={{ padding:'6px 8px', textAlign:'center', fontWeight:600, color:'#64748b', borderBottom:'1px solid #e5e7eb' }}>Cantidad</th>
                          <th style={{ padding:'6px 8px', textAlign:'right', fontWeight:600, color:'#64748b', borderBottom:'1px solid #e5e7eb' }}>Precio</th>
                          <th style={{ width:24, borderBottom:'1px solid #e5e7eb' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {repItems.map((item,i) => (
                          <tr key={i} style={{ borderBottom:'1px solid #f8fafc' }}>
                            <td style={{ padding:'7px 8px', fontSize:13 }}>{item.nombre}</td>
                            <td style={{ padding:'7px 8px', textAlign:'center' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:4, justifyContent:'center' }}>
                                <input className="cot-input" style={{ width:48, textAlign:'center', padding:'3px 4px' }} type="number" min="1" value={item.cantidad} onChange={e=>setCant(i,e.target.value)}/>
                                <span style={{ fontSize:11, color:'#94a3b8' }}>ud.</span>
                              </div>
                            </td>
                            <td style={{ padding:'7px 8px', textAlign:'right', fontWeight:600 }}>{fmt(item.precio*item.cantidad)}</td>
                            <td style={{ padding:'7px 4px', textAlign:'center' }}>
                              <button onClick={()=>removeRep(i)} style={{ background:'none', border:'none', cursor:'pointer', color:'#dc2626', fontSize:16 }}>×</button>
                            </td>
                          </tr>
                        ))}
                        {!repItems.length && <tr><td colSpan={4} style={{ padding:'28px 0', textAlign:'center', color:'#cbd5e1', fontSize:12 }}>Sin repuestos</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:8, paddingTop:10, borderTop:'1px solid #f1f5f9', flexWrap:'wrap', marginTop:8 }}>
                    <span style={{ fontSize:12, color:'#64748b' }}>Descuento %</span>
                    <input className="cot-input" style={{ width:60, textAlign:'center' }} type="number" min="0" max="100" value={descRep} onChange={e=>setDescRep(e.target.value)} placeholder="0"/>
                    <span style={{ fontSize:12, color:'#64748b' }}>Subtotal:</span>
                    <span style={{ fontSize:14, fontWeight:700 }}>{fmt(totalRep)}</span>
                  </div>
                </div>
              </div>

              <div style={{ margin:'0 16px 16px', background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:20, fontWeight:800, color:'#1e293b' }}>TOTAL:</span>
                <span style={{ fontSize:24, fontWeight:900, color:'#1e293b' }}>{fmt(total)}</span>
              </div>
            </div>
          )}

          {/* ══ TAB 3 ══ */}
          {step === 3 && (
            <div style={{ paddingTop:16 }}>
              <ResumenHeader form={form} clienteObj={clienteObj} vehiculoObj={vehiculoObj} serviciosTipo={serviciosTipo} />

              <div style={{ margin:'0 16px 14px', background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:400 }}>
                  <thead>
                    <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e5e7eb' }}>
                      {['Nº Orden','Nombre','cantidad','Descripción','Precio'].map(h=>(
                        <th key={h} style={{ padding:'10px 14px', textAlign: h==='Precio'?'right':'left', fontSize:12, fontWeight:600, color:'#64748b' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {todosItems.map((item,i) => (
                      <tr key={i} style={{ borderBottom:'1px solid #f8fafc' }}
                        onMouseEnter={e=>e.currentTarget.style.background='#fafbff'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{ padding:'10px 14px', color:'#94a3b8', fontSize:12, fontFamily:'monospace' }}>00000000</td>
                        <td style={{ padding:'10px 14px', fontWeight:600 }}>{item.nombre}</td>
                        <td style={{ padding:'10px 14px', color:'#64748b' }}>{item.cantidad}</td>
                        <td style={{ padding:'10px 14px', color:'#64748b' }}>{item.descripcion}</td>
                        <td style={{ padding:'10px 14px', fontWeight:700, textAlign:'right' }}>{fmt(item.precio)}</td>
                      </tr>
                    ))}
                    {!todosItems.length && <tr><td colSpan={5} style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>Sin ítems — regresa a Cotización para agregar</td></tr>}
                  </tbody>
                </table>
              </div>

              <div style={{ margin:'0 16px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:12, color:'#64748b' }}>Prioridad</span>
                  <button onClick={() => setForm(p => ({ ...p, prioridad: p.prioridad === 'URGENTE' ? 'NORMAL' : 'URGENTE' }))}
                    style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 14px', borderRadius:20, border:'1px solid', borderColor: form.prioridad==='URGENTE'?'#fecaca':'#e5e7eb', cursor:'pointer', fontSize:12, fontWeight:700, background: form.prioridad==='URGENTE'?'#fef2f2':'#f1f5f9', color: form.prioridad==='URGENTE'?'#dc2626':'#64748b' }}>
                    ⓘ {form.prioridad==='URGENTE'?'Urgente':'Normal'}
                  </button>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:16, fontWeight:700, color:'#64748b' }}>TOTAL:</span>
                  <span style={{ fontSize:22, fontWeight:900, color:'#1e293b' }}>{fmt(total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ background:'#fff', borderTop:'1px solid #e5e7eb', padding:'12px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <button onClick={()=>step>1?setStep(step-1):onClose()}
            style={{ width:36, height:36, borderRadius:'50%', border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'#64748b' }}>
            ←
          </button>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            {(step === 2 || step === 3) && (
              <button onClick={() => step===2 ? guardar(false) : crearOT()} disabled={saving}
                style={{ padding:'9px 22px', borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, color:'#1e293b', display:'inline-flex', alignItems:'center', gap:6 }}>
                {saving && <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }}/>}
                Guardar
              </button>
            )}
            <button onClick={() => step===1?goTo2():step===2?(setUnlocked(3),setStep(3)):crearOT()} disabled={saving}
              style={{ padding:'9px 24px', borderRadius:8, border:'none', background:'#2563eb', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, display:'inline-flex', alignItems:'center', gap:6 }}>
              {saving && <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }}/>}
              {step===3 ? 'Crear OT' : 'Continuar'}
            </button>
          </div>
        </div>

      </div>
    </div>

    {nuevoCliente !== null && (
      <ModalCrearCliente
        nombreInicial={nuevoCliente}
        onClose={() => setNuevoCliente(null)}
        onCreado={c => {
          qc.invalidateQueries(['cli-all']);
          set('clienteId', c.id);
          set('facturarA',  `${c.nombres} ${c.apellidos}`);
          set('direccion',  c.direccion || '');
          set('dniRuc',     c.dniRuc    || '');
          set('correo',     c.email     || '');
          set('celular',    c.telefono  || '');
          setNuevoCliente(null);
        }}
      />
    )}
    </>
  );
}