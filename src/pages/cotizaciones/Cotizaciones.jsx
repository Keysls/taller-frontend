import { useState, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, X, Loader2, ChevronLeft, ChevronRight,
  FileText, Printer, ClipboardList, Eye, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import NuevaCotizacionModal from '../../components/ui/NuevaCotizacionModal.jsx';

// ─── API ──────────────────────────────────────────────────────────
const cotApi = {
  getAll:    ()      => api.get('/cotizaciones').then(r => r.data.data),
  getById:   (id)    => api.get(`/cotizaciones/${id}`).then(r => r.data.data),
  create:    (data)  => api.post('/cotizaciones', data).then(r => r.data.data),
  ejecutarOT:(id, d) => api.post(`/cotizaciones/${id}/convertir`, d).then(r => r.data.data),
};
const extApi = {
  clientes:  () => api.get('/clientes?limit=200').then(r => r.data.data),
  vehiculos: () => api.get('/vehiculos?limit=200').then(r => r.data.data),
  mecanicos: () => api.get('/mecanicos').then(r => r.data.data),
  servicios: () => api.get('/servicios').then(r => r.data.data),
  terceros:  () => api.get('/servicios-terceros').then(r => r.data.data),
  repuestos: () => api.get('/inventario').then(r => r.data.data),
};

const fmt  = n => new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n??0);
const fmtD = d => d ? new Date(d).toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'2-digit'}) : '—';

const PER_PAGE = 20;

// ─── Estilos ──────────────────────────────────────────────────────
const ov  = { position:'fixed',inset:0,zIndex:200,background:'rgba(15,23,42,0.4)',backdropFilter:'blur(2px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20 };
const iS  = { width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid #C8DAEA',background:'#F4F8FC',fontSize:13,color:'#0D1B2A',outline:'none',boxSizing:'border-box' };
const lS  = { display:'block',fontSize:11,fontWeight:600,color:'#4A6A8A',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.05em' };
const fg  = { marginBottom:14 };
const r2  = { display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14 };
const BP  = { padding:'10px 18px',borderRadius:10,border:'none',cursor:'pointer',background:'#2563EB',color:'#fff',fontSize:13,fontWeight:600,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6 };
const BC  = { padding:'10px 18px',borderRadius:10,cursor:'pointer',background:'#F1F5F9',color:'#64748B',fontSize:13,fontWeight:500,border:'none' };
const focus = e => e.target.style.borderColor='#2563EB';
const blur  = e => e.target.style.borderColor='#C8DAEA';

const ESTADO_CFG = {
  PENDIENTE: { bg:'#FFF7ED',color:'#C2410C' },
  APROBADA:  { bg:'#F0FDF4',color:'#15803D' },
  RECHAZADA: { bg:'#FEF2F2',color:'#DC2626' },
};
const METODOS_PAGO = ['EFECTIVO','TRANSFERENCIA','TARJETA','YAPE','PLIN'];

// ─── PDF Print ────────────────────────────────────────────────────
function imprimirCotizacion(cot) {
  const fmtS = n => `S/ ${Number(n||0).toFixed(2)}`;
  const fmtFecha = d => d ? new Date(d).toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'2-digit'}) : '—';

  const tablaSeccion = (titulo, items, subtotal, descPct = 0) => {
    const total = Math.max(0, subtotal * (1 - descPct / 100));
    if(!items || items.length === 0) return '';
    const filas = items.map((item, idx) => {
      const cant = item.cantidad || 1;
      const pu   = Number(item.precioUnit || 0);
      const sub  = Number(item.subtotal || item.precioUnit || 0);
      return `<tr>
        <td class="center" style="color:#64748b">${idx+1}</td>
        <td>${item.descripcion||''}</td>
        <td class="right">S/${pu.toFixed(2)}</td>
        <td class="center">${cant}</td>
        <td class="right">S/${sub.toFixed(2)}</td>
      </tr>`;
    }).join('');
    return `
    <div class="section-block">
      <table class="cotiz-table">
        <thead><tr>
          <th class="center" style="width:5%">Nº</th>
          <th style="width:47%">${titulo}</th>
          <th class="right" style="width:18%">Precio unit</th>
          <th class="center" style="width:10%">Cantidad</th>
          <th class="right" style="width:20%">Precio</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>
      <div class="section-footer">
        <div class="section-footer-inner">
          <div class="section-footer-igv">Precio en soles incluido I.G.V.</div>
          <div class="section-footer-discount">${descPct > 0 ? `Descuento: ${descPct}%` : ''}</div>
          <div class="section-footer-total-label">Total</div>
          <div class="section-footer-total-value">S/${Number(total||0).toFixed(2)}</div>
        </div>
      </div>
    </div>`;
  };

  const totalSvc = (cot.serviciosItems||[]).reduce((s,i)=>s+Number(i.precioUnit||0),0);
  const totalTer = (cot.tercerosItems||[]).reduce((s,i)=>s+Number(i.precioUnit||0),0);
  const totalRep = (cot.repuestosItems||[]).reduce((s,i)=>s+Number(i.subtotal||i.precioUnit||0),0);
  const descPctSvc = Number(cot.descuentoSvc||0);
  const descPctRep = Number(cot.descuentoRep||0);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title> </title>
<style>
@page { size: A4; margin: 10mm; }
body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; margin:0; padding:0; font-size:11px; }
.header-table { width:100%; border-collapse:collapse; margin-bottom:14px; }
.header-logo-cell { width:30%; vertical-align:top; }
.header-info-cell { width:40%; vertical-align:top; padding-left:10px; font-size:10px; color:#1e293b; line-height:1.6; }
.header-title-cell { width:30%; vertical-align:top; text-align:right; }
.header-title { font-size:30px; font-weight:bold; color:#1e293b; line-height:1; }
.header-code { font-size:12px; color:#64748b; margin-top:2px; }
.datos-table { width:100%; border-collapse:collapse; margin-bottom:10px; font-size:11px; }
.datos-section-label { font-size:10px; font-weight:bold; color:#64748b; text-transform:uppercase; letter-spacing:.05em; margin-bottom:5px; }
.datos-row { display:table; width:100%; margin-bottom:2px; }
.datos-label { display:table-cell; color:#64748b; width:85px; }
.datos-value { display:table-cell; font-weight:500; color:#1e293b; }
.servicio-aplicado { font-size:11px; margin-bottom:10px; }
.servicio-aplicado span { font-weight:bold; }
.section-block { margin-bottom:14px; }
.cotiz-table { width:100%; border-collapse:collapse; font-size:11px; }
.cotiz-table thead tr { background:#f1f5f9; }
.cotiz-table thead th { padding:6px 8px; text-align:left; font-weight:normal; color:#64748b; font-size:10px; border-bottom:1px solid #e2e8f0; }
.cotiz-table thead th.right { text-align:right; }
.cotiz-table thead th.center { text-align:center; }
.cotiz-table tbody td { padding:4px 8px; border-bottom:1px solid #f1f5f9; }
.cotiz-table tbody td.right { text-align:right; }
.cotiz-table tbody td.center { text-align:center; }
.section-footer { background:#f8fafc; border:1px solid #e2e8f0; border-top:none; padding:0; }
.section-footer-inner { display:table; width:100%; }
.section-footer-igv { display:table-cell; padding:7px 10px; font-size:10px; font-weight:bold; text-transform:uppercase; letter-spacing:.03em; width:40%; vertical-align:middle; }
.section-footer-discount { display:table-cell; padding:7px 8px; font-size:10px; color:#64748b; text-align:right; width:40%; vertical-align:middle; }
.section-footer-total-label { display:table-cell; padding:7px 6px; font-weight:bold; text-align:right; font-size:12px; width:10%; vertical-align:middle; }
.section-footer-total-value { display:table-cell; padding:7px 10px; font-weight:bold; text-align:right; font-size:12px; width:10%; vertical-align:middle; }
.bottom-table { width:100%; border-collapse:collapse; margin-top:18px; }
.bottom-notes-cell { vertical-align:top; width:60%; padding-right:16px; }
.bottom-total-cell { vertical-align:top; width:40%; text-align:right; }
.nota-label { font-size:10px; font-weight:bold; color:#1e293b; margin-bottom:3px; text-transform:uppercase; }
.nota-box { border:1px solid #cbd5e1; min-height:36px; padding:6px 8px; font-size:10px; color:#475569; margin-bottom:10px; }
.total-final-box { display:inline-block; border:1px solid #cbd5e1; padding:14px 20px; text-align:right; min-width:170px; }
.total-final-label { font-size:11px; font-weight:bold; color:#94a3b8; text-transform:uppercase; letter-spacing:.1em; margin-bottom:4px; }
.total-final-amount { font-size:32px; font-weight:bold; color:#1e293b; line-height:1.1; }
.total-final-igv { font-size:10px; color:#64748b; font-style:italic; margin-top:4px; }
.doc-footer { margin-top:16px; font-size:10px; color:#94a3b8; line-height:1.6; }
.doc-footer strong { color:#64748b; }
</style>
</head>
<body>

<table class="header-table"><tr>
  <td class="header-logo-cell">
    <img src="/logo_pdf.png" style="width:120px;height:auto;object-fit:contain;" /> 
  </td>
  <td class="header-info-cell">
    <div style="font-weight:bold;font-size:11px;">R.U.C.: 10462333221</div>
    <div>BBVA: 0011-0814-0210100186</div>
    <div>BCP: 570-02689923-0-47</div>
    <div style='font-size:10px;'>Av. Metropolitana II Mz.H - Lte.05 - Las Orquideas - San Isidro</div>
  
  </td>
  <td class="header-title-cell">
    <div class="header-title">Cotización</div>
    <div class="header-code">${cot.numeroCot||''}</div>
  </td>
</tr></table>

<table class="datos-table"><tr>
  <td width="50%" style="vertical-align:top;padding-right:20px">
    <div class="datos-section-label">Datos de Cliente</div>
    <div class="datos-row"><div class="datos-label">Propietario:</div><div class="datos-value">${cot.facturarA || ((cot.cliente?.nombres||'') + ' ' + (cot.cliente?.apellidos||''))}</div></div>
    <div class="datos-row"><div class="datos-label">DNI/RUC</div><div class="datos-value">${cot.dniRuc || cot.cliente?.dniRuc||'—'}</div></div>
    <div class="datos-row"><div class="datos-label">Teléfono</div><div class="datos-value">${cot.telefono || cot.cliente?.telefono||'—'}</div></div>
    <div class="datos-row"><div class="datos-label">Método pago</div><div class="datos-value">${cot.metodoPago||'—'}</div></div>
    <div class="datos-row"><div class="datos-label">Asesor</div><div class="datos-value">${cot.asesor||'—'}</div></div>
    <div class="datos-row"><div class="datos-label">F. Apertura</div><div class="datos-value">${fmtFecha(cot.fechaApertura || cot.creadoEn)}</div></div>
  </td>
  <td width="50%" style="vertical-align:top;padding-left:20px">
    <div class="datos-section-label">Datos de Vehículo</div>
    <div class="datos-row"><div class="datos-label">Placa</div><div class="datos-value">${cot.placa || cot.vehiculo?.placa||'—'}</div></div>
    <div class="datos-row"><div class="datos-label">Marca</div><div class="datos-value">${cot.marca || cot.vehiculo?.marca||'—'}</div></div>
    <div class="datos-row"><div class="datos-label">Modelo</div><div class="datos-value">${cot.modelo || cot.vehiculo?.modelo||'—'}</div></div>
    <div class="datos-row"><div class="datos-label">Motor</div><div class="datos-value">${cot.motor||'—'}</div></div>
    <div class="datos-row"><div class="datos-label">Km</div><div class="datos-value">${cot.km2 ? Number(cot.km2).toLocaleString() : (cot.vehiculo?.kilometraje?.toLocaleString()||'—')}</div></div>
  </td>
</tr></table>

${(cot.tipoOrden || cot.serviciosTipo?.length) ? `<div class="servicio-aplicado">Servicio Aplicado: <span>${cot.tipoOrden || cot.serviciosTipo?.join(', ')}</span></div>` : ''}

${tablaSeccion('Servicios', cot.serviciosItems, totalSvc, Number(cot.descuentoSvc||0))}
${tablaSeccion('Servicios Terceros', cot.tercerosItems, totalTer, 0)}
${tablaSeccion('Repuestos / Insumos', cot.repuestosItems, totalRep, Number(cot.descuentoRep||0))}

<table class="bottom-table"><tr>
  <td class="bottom-notes-cell">
    <div class="nota-label">Nota 1</div>
    <div class="nota-box">${cot.nota1||cot.observaciones||''}</div>
    <div class="nota-label" style="margin-top:8px">Nota 2</div>
    <div class="nota-box">${cot.nota2||''}</div>
  </td>
  <td class="bottom-total-cell">
    <div class="total-final-box">
      <div class="total-final-label">Total</div>
      <div class="total-final-amount">S/ ${Number(cot.total||0).toFixed(2)}</div>
      <div class="total-final-igv">INCLUYE IGV*</div>
    </div>
  </td>
</tr></table>

<div class="doc-footer">
  <strong>Términos aplicables*</strong><br/><br/>
  - Cotización y precios válidos por 7 días para repuestos en stock y 5 días por importación.<br/>
  - Venta sujeta a disponibilidad de repuestos.<br/>
  - Precio total incluye I.G.V.
</div>

</body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// ─── Descargar PDF directo desde backend ─────────────────────────
async function descargarCotizacion(cot) {
  try {
    // Leer token del storage de Zustand persist (clave: 'taller-auth')
    const stored = JSON.parse(localStorage.getItem('taller-auth') || '{}');
    const token  = stored?.state?.token;

    const res = await fetch(`/api/cotizaciones/${cot.id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al generar PDF');

    const blob   = await res.blob();
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    const placa  = (cot.placa || cot.vehiculo?.placa || 'SIN-PLACA').replace(/[^a-zA-Z0-9]/g, '-');
    const numero = (cot.numeroCot || 'COT').replace(/[^a-zA-Z0-9]/g, '-');
    a.href       = url;
    a.download   = `${numero}_${placa}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    toast.error('Error al descargar PDF');
  }
}

// ─── Modal Ejecutar OT (3 tabs editables, datos precargados) ──────
function ModalEjecutarOT({ cotizacion, onClose, onDone }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { data: mecanicos=[] } = useQuery({ queryKey:['mecanicos'], queryFn: extApi.mecanicos });

  const [form, setForm] = useState({
    clienteNombre: `${cotizacion.cliente?.nombres||''} ${cotizacion.cliente?.apellidos||''}`,
    clienteTel:    cotizacion.cliente?.telefono || '',
    placa:         cotizacion.vehiculo?.placa || '',
    marca:         cotizacion.vehiculo?.marca || '',
    modelo:        cotizacion.vehiculo?.modelo || '',
    motor:         cotizacion.motor || '',
    km:            cotizacion.vehiculo?.kilometraje || '',
    metodoPago:    cotizacion.metodoPago || 'EFECTIVO',
    mecanicoId:    cotizacion.mecanicoId || '',
    diagnostico:   cotizacion.observaciones || '',
    observaciones: '',
    prioridad:     'NORMAL',
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const tabs = ['Información', 'Cotización', 'Orden de Trabajo'];

  const handleCrear = async () => {
    setLoading(true);
    try {
      await cotApi.ejecutarOT(cotizacion.id, {
        mecanicoId:   form.mecanicoId || null,
        diagnostico:  form.diagnostico,
        observaciones:form.observaciones,
      });
      toast.success('Orden de trabajo creada');
      onDone();
    } catch(err) { toast.error(err.response?.data?.message||'Error al crear OT'); }
    finally { setLoading(false); }
  };

  const repuestosItems = cotizacion.items?.filter(i=>i.tipo==='repuesto') || [];
  const serviciosItems = cotizacion.items?.filter(i=>i.tipo==='servicio') || [];
  const tercerosItems  = cotizacion.items?.filter(i=>i.tipo==='tercero')  || [];

  return (
    <div style={{...ov,zIndex:300}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#fff',borderRadius:20,width:'100%',maxWidth:700,boxShadow:'0 24px 80px rgba(15,23,42,0.2)',border:'1px solid #E2ECF4',display:'flex',flexDirection:'column',maxHeight:'92vh',overflow:'hidden'}}>
        <div style={{padding:'12px 20px 0',display:'flex',justifyContent:'flex-end',flexShrink:0}}>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#94A3B8'}}><X size={18}/></button>
        </div>
        <div style={{display:'flex',justifyContent:'center',borderBottom:'1px solid #E2ECF4',flexShrink:0}}>
          {tabs.map((t,i)=>{
            const active = step===i+1;
            return (
              <button key={t} onClick={()=>setStep(i+1)}
                style={{padding:'12px 22px',fontSize:13,fontWeight:active?700:500,color:active?'#2563EB':'#64748B',background:'transparent',border:'none',borderBottom:active?'2.5px solid #2563EB':'2.5px solid transparent',cursor:'pointer',transition:'all .15s',marginBottom:-1}}>
                {t}
              </button>
            );
          })}
        </div>
        <div style={{flex:1,overflowY:'auto'}}>
          {step===1 && (
            <div style={{padding:'20px 24px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'#0D1B2A',marginBottom:12,paddingBottom:8,borderBottom:'1px solid #F1F5F9'}}>Datos del Cliente</div>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {[['Señor(a)',form.clienteNombre,true],['Teléfono',form.clienteTel],['Método de pago',form.metodoPago]].map(([l,v,b])=>(
                    <div key={l}><label style={{...lS}}>{l}</label><input style={{...iS,background:'#F1F5F9',color:'#64748B'}} value={v} readOnly/></div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'#0D1B2A',marginBottom:12,paddingBottom:8,borderBottom:'1px solid #F1F5F9'}}>Datos del Vehículo</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 12px'}}>
                  {[['Placa','placa'],['Marca','marca'],['Modelo','modelo'],['Motor','motor'],['Kilometraje','km']].map(([l,k])=>(
                    <div key={k}><label style={{...lS}}>{l}</label><input style={iS} value={form[k]||''} onChange={e=>set(k,e.target.value)} onFocus={focus} onBlur={blur}/></div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {step===2 && (
            <div style={{padding:'16px 20px'}}>
              <div style={{padding:'10px 14px',borderRadius:10,background:'#F8FAFC',border:'1px solid #F1F5F9',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13}}>
                <span style={{color:'#64748B'}}>Cotización: <strong>{cotizacion.numeroCot}</strong></span>
                <span style={{fontWeight:700,color:'#2563EB',fontSize:15}}>{fmt(cotizacion.total)}</span>
              </div>
              {serviciosItems.length>0&&(<div style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:700,color:'#1D4ED8',marginBottom:8}}>Servicios propios</div>{serviciosItems.map((item,i)=>(<div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #F8FAFC',fontSize:13}}><span>{item.descripcion}</span><span style={{fontWeight:600}}>{fmt(item.precioUnit)}</span></div>))}</div>)}
              {tercerosItems.length>0&&(<div style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:700,color:'#7C3AED',marginBottom:8}}>Servicios de terceros</div>{tercerosItems.map((item,i)=>(<div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #F8FAFC',fontSize:13}}><span>{item.descripcion}</span><span style={{fontWeight:600}}>{fmt(item.precioUnit)}</span></div>))}</div>)}
              {repuestosItems.length>0&&(<div style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:700,color:'#B45309',marginBottom:8}}>Repuestos</div>{repuestosItems.map((item,i)=>(<div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #F8FAFC',fontSize:13}}><span>{item.descripcion} {item.cantidad>1?`(${item.cantidad}x)`:''}</span><span style={{fontWeight:600}}>{fmt(item.subtotal)}</span></div>))}</div>)}
            </div>
          )}
          {step===3 && (
            <div style={{padding:'20px 24px'}}>
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div><label style={{...lS}}>Mecánico asignado</label><select style={iS} value={form.mecanicoId} onChange={e=>set('mecanicoId',e.target.value)} onFocus={focus} onBlur={blur}><option value="">Sin asignar</option>{mecanicos.map(m=><option key={m.id} value={m.id}>{m.nombre} — {m.estado}</option>)}</select></div>
                <div><label style={{...lS}}>Diagnóstico</label><textarea style={{...iS,resize:'vertical',minHeight:80}} value={form.diagnostico} onChange={e=>set('diagnostico',e.target.value)} placeholder="Diagnóstico inicial..." onFocus={focus} onBlur={blur}/></div>
                <div><label style={{...lS}}>Observaciones</label><textarea style={{...iS,resize:'vertical',minHeight:72}} value={form.observaciones} onChange={e=>set('observaciones',e.target.value)} placeholder="Observaciones adicionales..." onFocus={focus} onBlur={blur}/></div>
                <div><label style={{...lS}}>Prioridad</label><div style={{display:'flex',gap:8}}>{['NORMAL','URGENTE'].map(p=>(<button key={p} type="button" onClick={()=>set('prioridad',p)} style={{padding:'7px 20px',borderRadius:9,border:`1.5px solid ${form.prioridad===p?(p==='URGENTE'?'#DC2626':'#2563EB'):'#E2ECF4'}`,background:form.prioridad===p?(p==='URGENTE'?'#FEF2F2':'#EFF6FF'):'#F8FAFC',color:form.prioridad===p?(p==='URGENTE'?'#DC2626':'#1D4ED8'):'#64748B',fontSize:13,fontWeight:600,cursor:'pointer'}}>{p==='URGENTE'?'🔴 Urgente':'Normal'}</button>))}</div></div>
              </div>
            </div>
          )}
        </div>
        <div style={{padding:'14px 20px',borderTop:'1px solid #E2ECF4',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <button onClick={()=>step>1?setStep(step-1):onClose()} style={{width:36,height:36,borderRadius:10,border:'1px solid #E2ECF4',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748B',fontSize:18}}>←</button>
          <button onClick={()=>step<3?setStep(step+1):handleCrear()} disabled={loading} style={{padding:'9px 24px',borderRadius:10,border:'none',background:step===3?'#059669':'#2563EB',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700,display:'inline-flex',alignItems:'center',gap:6}}>
            {loading&&<Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/>}
            {step===3?(loading?'Creando OT…':'Crear Orden de Trabajo'):'Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Ver Cotización ─────────────────────────────────────────
function ModalVerCotizacion({ id, onClose, onEjecutar }) {
  const [showOT,        setShowOT]        = useState(false);
  const [showModificar, setShowModificar] = useState(false);
  const [cotizacionOpen,setCotizacionOpen]= useState(true);
  const [descargando,   setDescargando]   = useState(false);
  const { data: cot, isLoading } = useQuery({ queryKey:['cotizacion',id], queryFn:()=>cotApi.getById(id) });

  if (isLoading) return (
    <div style={ov}><div style={{background:'#fff',borderRadius:20,padding:48,display:'flex',alignItems:'center',gap:12,color:'#94A3B8'}}><Loader2 size={20} style={{animation:'spin 1s linear infinite'}}/>Cargando…</div></div>
  );

  const repuestosItems = cot?.items?.filter(i=>i.tipo==='repuesto') || [];
  const serviciosItems = cot?.items?.filter(i=>i.tipo==='servicio') || [];
  const tercerosItems  = cot?.items?.filter(i=>i.tipo==='tercero')  || [];
  const serviciosTipo  = [serviciosItems.length?'Servicios':null, tercerosItems.length?'Externos':null].filter(Boolean);
  const cotConItems    = {...cot, repuestosItems, serviciosItems, tercerosItems, serviciosTipo};
  const estCfg         = ESTADO_CFG[cot?.estado] || ESTADO_CFG.PENDIENTE;

  const totalItems = [...serviciosItems,...tercerosItems,...repuestosItems].reduce((s,i)=>s+Number(i.subtotal||i.precioUnit||0),0);
  const descuento  = Math.max(0, totalItems - Number(cot?.total||0));

  const InfoRow = ({label, value, bold}) => (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'7px 0',borderBottom:'1px solid #F1F5F9',fontSize:13}}>
      <span style={{color:'#94A3B8',fontSize:12}}>{label}</span>
      <span style={{fontWeight: bold?700:500, color:'#0D1B2A', textAlign:'right', maxWidth:200}}>{value||'—'}</span>
    </div>
  );

  const handleDescargar = async () => {
    setDescargando(true);
    await descargarCotizacion(cotConItems);
    setDescargando(false);
  };

  return (
    <>
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(15,23,42,0.3)',backdropFilter:'blur(2px)'}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{position:'absolute',top:0,right:0,bottom:0,width:500,background:'#F4F8FC',boxShadow:'-8px 0 40px rgba(15,23,42,0.15)',display:'flex',flexDirection:'column',animation:'slideIn .25s ease'}}>

        <div style={{padding:'16px 20px',background:'#fff',borderBottom:'1px solid #E2ECF4',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div style={{flex:1,textAlign:'center'}}>
            <h2 style={{fontSize:16,fontWeight:700,color:'#0D1B2A',margin:0}}>Información</h2>
            <div style={{fontSize:11,color:'#94A3B8',marginTop:2}}>{cot?.numeroCot} · <span style={{...estCfg,padding:'1px 8px',borderRadius:20,fontWeight:700,fontSize:10}}>{cot?.estado}</span></div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#94A3B8',padding:4,marginLeft:8}}><X size={18}/></button>
        </div>

        <div style={{flex:1,overflowY:'auto'}}>
          <div style={{background:'#fff',margin:'12px 14px',borderRadius:14,border:'1px solid #E2ECF4',padding:'16px 18px'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 24px'}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'#0D1B2A',marginBottom:10}}>Cliente</div>
                <InfoRow label="Señor:" value={`${cot?.cliente?.nombres||''} ${cot?.cliente?.apellidos||''}`} bold />
                <InfoRow label="Teléfono" value={cot?.cliente?.telefono} />
                <InfoRow label="Método de Pago" value={cot?.metodoPago} />
                <InfoRow label="Servicios" value={cot?.tipoOrden} />
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'#0D1B2A',marginBottom:10}}>Vehículo</div>
                <InfoRow label="Placa:" value={cot?.placa || cot?.vehiculo?.placa} bold />
                <InfoRow label="Modelo:" value={cot?.modelo || `${cot?.vehiculo?.marca||''} ${cot?.vehiculo?.modelo||''}`.trim()} />
                <InfoRow label="Motor:" value={cot?.motor} />
                <InfoRow label="Kilometraje" value={cot?.km2 ? Number(cot.km2).toLocaleString() : cot?.vehiculo?.kilometraje?.toLocaleString()} />
              </div>
            </div>
          </div>

          <div style={{background:'#fff',margin:'0 14px 12px',borderRadius:14,border:'1px solid #E2ECF4',overflow:'hidden'}}>
            <button onClick={()=>setCotizacionOpen(o=>!o)} style={{width:'100%',padding:'13px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',background:'transparent',border:'none',cursor:'pointer'}}>
              <span style={{fontSize:14,fontWeight:700,color:'#0D1B2A'}}>Cotización</span>
              <span style={{fontSize:16,color:'#94A3B8',transform: cotizacionOpen?'rotate(180deg)':'none',transition:'transform .2s'}}>▾</span>
            </button>
            {cotizacionOpen && (
              <div style={{borderTop:'1px solid #F1F5F9',padding:'0 18px 16px'}}>
                {serviciosItems.length > 0 && (<div style={{marginTop:14}}><div style={{fontSize:12,fontWeight:700,color:'#1D4ED8',marginBottom:8}}>Servicio propio</div>{serviciosItems.map((item,i)=>(<div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',fontSize:13,borderBottom:'1px solid #F8FAFC'}}><span style={{color:'#1E293B'}}>{item.descripcion}</span><span style={{fontWeight:600}}>{fmt(item.precioUnit)}</span></div>))}</div>)}
                {tercerosItems.length > 0 && (<div style={{marginTop:14}}><div style={{fontSize:12,fontWeight:700,color:'#7C3AED',marginBottom:8}}>Servicios de terceros</div>{tercerosItems.map((item,i)=>(<div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',fontSize:13,borderBottom:'1px solid #F8FAFC'}}><span style={{color:'#1E293B'}}>{item.descripcion}</span><span style={{fontWeight:600}}>{fmt(item.precioUnit)}</span></div>))}</div>)}
                {repuestosItems.length > 0 && (<div style={{marginTop:14}}><div style={{fontSize:12,fontWeight:700,color:'#B45309',marginBottom:8}}>Repuestos</div>{repuestosItems.map((item,i)=>(<div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',fontSize:13,borderBottom:'1px solid #F8FAFC'}}><span style={{color:'#1E293B'}}>{item.descripcion}</span><div style={{display:'flex',alignItems:'center',gap:8}}>{item.cantidad > 1 && <span style={{fontSize:11,color:'#94A3B8'}}>{item.cantidad}x</span>}<span style={{fontWeight:600}}>{fmt(item.subtotal||item.precioUnit)}</span></div></div>))}</div>)}
                {descuento > 0 && (<div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',marginTop:8,borderTop:'1px solid #F1F5F9',fontSize:13,color:'#DC2626'}}><span>Descuento</span><span style={{fontWeight:600}}>- {fmt(descuento)}</span></div>)}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{background:'#fff',borderTop:'1px solid #E2ECF4',flexShrink:0}}>
          <div style={{padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #F1F5F9'}}>
            <span style={{fontSize:18,fontWeight:800,color:'#0D1B2A'}}>TOTAL</span>
            <span style={{fontSize:20,fontWeight:900,color:'#0D1B2A'}}>{fmt(cot?.total)}</span>
          </div>
          <div style={{padding:'12px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            {/* Iconos izquierda */}
            <div style={{display:'flex',gap:8}}>
              {/* Imprimir */}
              <button onClick={()=>imprimirCotizacion(cotConItems)}
                style={{width:36,height:36,borderRadius:10,border:'1px solid #E2ECF4',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748B'}}
                onMouseEnter={e=>{e.currentTarget.style.background='#F1F5F9'}}
                onMouseLeave={e=>{e.currentTarget.style.background='#fff'}}
                title="Imprimir PDF">
                <Printer size={16}/>
              </button>
              {/* Descargar PDF directo */}
              <button onClick={handleDescargar} disabled={descargando}
                style={{width:36,height:36,borderRadius:10,border:'1px solid #E2ECF4',background:'#fff',cursor:descargando?'wait':'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#2563EB',opacity:descargando?.6:1}}
                onMouseEnter={e=>{if(!descargando)e.currentTarget.style.background='#EFF6FF'}}
                onMouseLeave={e=>{e.currentTarget.style.background='#fff'}}
                title="Descargar PDF">
                {descargando
                  ? <Loader2 size={15} style={{animation:'spin 1s linear infinite'}}/>
                  : <Download size={16}/>
                }
              </button>
            </div>
            {/* Modificar */}
            <button onClick={()=>setShowModificar(true)}
              style={{display:'inline-flex',alignItems:'center',gap:8,padding:'10px 22px',borderRadius:10,border:'none',background:'#2563EB',cursor:'pointer',fontSize:13,fontWeight:700,color:'#fff'}}
              onMouseEnter={e=>{e.currentTarget.style.background='#1D4ED8'}}
              onMouseLeave={e=>{e.currentTarget.style.background='#2563EB'}}>
              <ClipboardList size={15}/> Modificar
            </button>
          </div>
        </div>
      </div>
    </div>
    {showOT && (<ModalEjecutarOT cotizacion={cot} onClose={()=>setShowOT(false)} onDone={()=>{setShowOT(false);onEjecutar();}}/>)}
    {showModificar && (<NuevaCotizacionModal initialData={cot} onClose={()=>setShowModificar(false)} onSaved={()=>{setShowModificar(false);onEjecutar();}}/>)}
    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </>
  );
}

// ─── Modal Nueva Cotización ───────────────────────────────────────
function ModalNuevaCotizacion({ onClose, onSaved }) {
  const [step,    setStep]    = useState(1);
  const [form,    setForm]    = useState({ clienteId:'', vehiculoId:'', metodoPago:'EFECTIVO', motor:'', observaciones:'' });
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const { data: clientes=[]  } = useQuery({ queryKey:['clientes-all'],  queryFn: extApi.clientes  });
  const { data: vehiculos=[] } = useQuery({ queryKey:['vehiculos-all'], queryFn: extApi.vehiculos });
  const { data: servicios=[] } = useQuery({ queryKey:['servicios'],     queryFn: extApi.servicios });
  const { data: terceros=[]  } = useQuery({ queryKey:['servicios-terceros'], queryFn: extApi.terceros });
  const { data: repuestos=[] } = useQuery({ queryKey:['inventario'],    queryFn: ()=>extApi.repuestos().then(r=>r.data||r) });

  const vehCliente = vehiculos.filter(v => v.clienteId === form.clienteId);
  const total = items.reduce((s,i) => s + Number(i.subtotal||i.precioUnit||0), 0);

  const addItem = (tipo, item, cantidad=1) => {
    const precio = tipo==='repuesto' ? item.precioVenta : tipo==='servicio' ? item.precioBase : item.precio;
    setItems(prev => [...prev, { tipo, descripcion: item.nombre, cantidad, precioUnit: Number(precio), subtotal: Number(precio)*cantidad, refId: item.id }]);
  };
  const removeItem = idx => setItems(prev => prev.filter((_,i)=>i!==idx));

  const handleSubmit = async () => {
    if (!form.clienteId || !form.vehiculoId) { toast.error('Selecciona cliente y vehículo'); return; }
    setLoading(true);
    try { await cotApi.create({ ...form, items, total }); toast.success('Cotización creada'); onSaved(); }
    catch(err) { toast.error(err.response?.data?.message||'Error al crear'); }
    finally { setLoading(false); }
  };

  return (
    <div style={ov} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#fff',borderRadius:20,width:'100%',maxWidth:600,boxShadow:'0 20px 60px rgba(30,58,138,0.15)',border:'1px solid #E2ECF4',display:'flex',flexDirection:'column',maxHeight:'92vh',overflow:'hidden'}}>
        <div style={{padding:'20px 24px',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:'#0D1B2A',margin:0}}>Nueva cotización</h2>
            <div style={{display:'flex',gap:6,marginTop:6}}>
              {['Información','Ítems'].map((s,i)=>(<span key={s} style={{fontSize:11,fontWeight:600,padding:'2px 10px',borderRadius:20,background:step===i+1?'#2563EB':'#F1F5F9',color:step===i+1?'#fff':'#94A3B8'}}>{i+1}. {s}</span>))}
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#94A3B8'}}><X size={18}/></button>
        </div>
        <div style={{overflowY:'auto',flex:1,padding:'20px 24px'}}>
          {step===1 && (
            <>
              <div style={r2}>
                <div><label style={lS}>Cliente *</label><select style={iS} value={form.clienteId} onChange={e=>{set('clienteId',e.target.value);set('vehiculoId','');}} onFocus={focus} onBlur={blur}><option value="">Seleccionar...</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nombres} {c.apellidos} — {c.dniRuc}</option>)}</select></div>
                <div><label style={lS}>Vehículo *</label><select style={iS} value={form.vehiculoId} onChange={e=>set('vehiculoId',e.target.value)} onFocus={focus} onBlur={blur} disabled={!form.clienteId}><option value="">Seleccionar...</option>{vehCliente.map(v=><option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo}</option>)}</select></div>
              </div>
              <div style={r2}>
                <div><label style={lS}>Método de pago</label><select style={iS} value={form.metodoPago} onChange={e=>set('metodoPago',e.target.value)} onFocus={focus} onBlur={blur}>{METODOS_PAGO.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
                <div><label style={lS}>Motor</label><input style={iS} value={form.motor} onChange={e=>set('motor',e.target.value)} placeholder="ej: 2.0L" onFocus={focus} onBlur={blur}/></div>
              </div>
              <div style={fg}><label style={lS}>Observaciones</label><textarea style={{...iS,resize:'vertical',minHeight:72}} value={form.observaciones} onChange={e=>set('observaciones',e.target.value)} onFocus={focus} onBlur={blur}/></div>
            </>
          )}
          {step===2 && (
            <>
              <div style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:700,color:'#B45309',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:8}}>Repuestos</div><select style={{...iS,marginBottom:8}} defaultValue="" onChange={e=>{const r=repuestos.find(x=>x.id===e.target.value);if(r){addItem('repuesto',r,1);e.target.value='';}}} onFocus={focus} onBlur={blur}><option value="">+ Agregar repuesto...</option>{(Array.isArray(repuestos)?repuestos:repuestos?.data||[]).filter(r=>r.activo&&r.stock>0).map(r=><option key={r.id} value={r.id}>{r.nombre} — Stock: {r.stock}</option>)}</select></div>
              <div style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:700,color:'#1D4ED8',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:8}}>Servicios propios</div><select style={{...iS,marginBottom:8}} defaultValue="" onChange={e=>{const s=servicios.find(x=>x.id===e.target.value);if(s){addItem('servicio',s);e.target.value='';}}} onFocus={focus} onBlur={blur}><option value="">+ Agregar servicio...</option>{servicios.filter(s=>s.activo).map(s=><option key={s.id} value={s.id}>{s.nombre} — {fmt(s.precioBase)}</option>)}</select></div>
              <div style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:700,color:'#6D28D9',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:8}}>Servicios de terceros</div><select style={{...iS,marginBottom:8}} defaultValue="" onChange={e=>{const s=terceros.find(x=>x.id===e.target.value);if(s){addItem('tercero',s);e.target.value='';}}} onFocus={focus} onBlur={blur}><option value="">+ Agregar servicio externo...</option>{terceros.filter(s=>s.activo).map(s=><option key={s.id} value={s.id}>{s.nombre} — {fmt(s.precio)}</option>)}</select></div>
              {items.length>0 && (
                <div style={{borderRadius:12,border:'1px solid #F1F5F9',overflow:'hidden',marginBottom:12}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr style={{background:'#F8FAFC'}}>{['Tipo','Descripción','Cant.','Precio',''].map(h=>(<th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:10,fontWeight:700,color:'#94A3B8',textTransform:'uppercase'}}>{h}</th>))}</tr></thead>
                  <tbody>{items.map((item,i)=>(<tr key={i} style={{borderBottom:'1px solid #F8FAFC'}}><td style={{padding:'8px 12px'}}><span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:item.tipo==='repuesto'?'#FFF7ED':item.tipo==='servicio'?'#EFF6FF':'#F5F3FF',color:item.tipo==='repuesto'?'#C2410C':item.tipo==='servicio'?'#1D4ED8':'#6D28D9'}}>{item.tipo}</span></td><td style={{padding:'8px 12px',fontSize:13,color:'#0D1B2A'}}>{item.descripcion}</td><td style={{padding:'8px 12px',fontSize:12,color:'#64748B'}}>{item.cantidad}</td><td style={{padding:'8px 12px',fontSize:13,fontWeight:600}}>{fmt(item.subtotal||item.precioUnit)}</td><td style={{padding:'8px 12px'}}><button onClick={()=>removeItem(i)} style={{background:'none',border:'none',cursor:'pointer',color:'#DC2626',padding:2}}><X size={14}/></button></td></tr>))}</tbody></table>
                  <div style={{padding:'10px 14px',background:'#F8FAFC',display:'flex',justifyContent:'flex-end',gap:8,alignItems:'center'}}><span style={{fontSize:12,color:'#64748B'}}>Total:</span><span style={{fontSize:16,fontWeight:800,color:'#0D1B2A'}}>{fmt(total)}</span></div>
                </div>
              )}
              {!items.length && <div style={{textAlign:'center',padding:'24px 0',color:'#94A3B8',fontSize:13}}>Agrega repuestos o servicios arriba</div>}
            </>
          )}
        </div>
        <div style={{padding:'16px 24px',borderTop:'1px solid #F1F5F9',display:'flex',gap:8,justifyContent:'space-between',flexShrink:0}}>
          <button style={BC} onClick={()=>step===1?onClose():setStep(1)}>{step===1?'Cancelar':'← Atrás'}</button>
          {step===1?<button style={BP} onClick={()=>{if(!form.clienteId||!form.vehiculoId){toast.error('Selecciona cliente y vehículo');return;}setStep(2);}}>Siguiente →</button>:<button style={BP} onClick={handleSubmit} disabled={loading}>{loading&&<Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/>}{loading?'Guardando…':'Crear cotización'}</button>}
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────
export default function Cotizaciones() {
  const qc = useQueryClient();
  const [modal,  setModal]  = useState(null);
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(1);

  const { data: cotizaciones=[], isLoading } = useQuery({ queryKey:['cotizaciones'], queryFn: cotApi.getAll });

  const filtradas = useMemo(()=>{
    const q = search.toLowerCase();
    return cotizaciones.filter(c =>
      !q ||
      c.numeroCot?.toLowerCase().includes(q) ||
      c.cliente?.nombres?.toLowerCase().includes(q) ||
      c.cliente?.apellidos?.toLowerCase().includes(q) ||
      c.cliente?.dniRuc?.includes(q) ||
      c.vehiculo?.placa?.toLowerCase().includes(q)
    );
  }, [cotizaciones, search]);

  const totalPages = Math.ceil(filtradas.length / PER_PAGE);
  const paginated  = filtradas.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const onSaved = () => { qc.invalidateQueries(['cotizaciones']); setModal(null); };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div><p style={{fontSize:12,color:'#94A3B8',marginTop:2}}>{filtradas.length} de {cotizaciones.length} cotizaciones</p></div>
        <button onClick={()=>setModal({tipo:'nueva'})} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:10,border:'none',cursor:'pointer',background:'#2563EB',color:'#fff',fontSize:13,fontWeight:600}} onMouseEnter={e=>e.currentTarget.style.background='#1D4ED8'} onMouseLeave={e=>e.currentTarget.style.background='#2563EB'}>
          <Plus size={15}/> Nueva cotización
        </button>
      </div>

      <div style={{background:'#fff',borderRadius:16,border:'1px solid #F1F5F9',boxShadow:'0 1px 4px rgba(0,0,0,0.05)',overflow:'hidden'}}>
        <div style={{padding:'14px 16px',borderBottom:'1px solid #F1F5F9',display:'flex',gap:10}}>
          <div style={{position:'relative',flex:1}}>
            <Search size={14} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'#94A3B8',pointerEvents:'none'}}/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Buscar por código, cliente, DNI o placa..." style={{...iS,paddingLeft:32,background:'#F8FAFC'}} onFocus={focus} onBlur={blur}/>
          </div>
          {search&&<button onClick={()=>{setSearch('');setPage(1);}} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'8px 12px',borderRadius:10,border:'1px solid #E2ECF4',background:'#fff',cursor:'pointer',fontSize:12,color:'#64748B'}}><X size={13}/> Limpiar</button>}
        </div>

        {isLoading ? (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:64,color:'#94A3B8',gap:8}}><Loader2 size={18} style={{animation:'spin 1s linear infinite'}}/> Cargando…</div>
        ) : (
          <>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:'#F8FAFC',borderBottom:'1px solid #F1F5F9'}}>{['Código','DNI/RUC','Cliente','Técnico','Placa','Estado','Total','Fecha',''].map(h=>(<th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#94A3B8',textTransform:'uppercase',letterSpacing:'.05em',whiteSpace:'nowrap'}}>{h}</th>))}</tr></thead>
                <tbody>
                  {paginated.map(c=>{
                    const estCfg = ESTADO_CFG[c.estado]||ESTADO_CFG.PENDIENTE;
                    return (
                      <tr key={c.id} style={{borderBottom:'1px solid #F8FAFC',cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background='#FAFBFF'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} onClick={()=>setModal({tipo:'ver',id:c.id})}>
                        <td style={{padding:'11px 14px'}}><span style={{fontFamily:'monospace',fontSize:12,fontWeight:700,color:'#2563EB',background:'#EFF6FF',padding:'2px 8px',borderRadius:6}}>{c.numeroCot}</span></td>
                        <td style={{padding:'11px 14px',fontSize:12,color:'#64748B'}}>{c.cliente?.dniRuc||'—'}</td>
                        <td style={{padding:'11px 14px',fontSize:13,fontWeight:600,color:'#0D1B2A',whiteSpace:'nowrap'}}>{c.cliente?.nombres} {c.cliente?.apellidos}</td>
                        <td style={{padding:'11px 14px',fontSize:12,color:'#64748B'}}>{c.mecanico?.nombre||'—'}</td>
                        <td style={{padding:'11px 14px'}}>{(c.placa||c.vehiculo?.placa)?<span style={{fontSize:12,fontWeight:700,background:'#F1F5F9',color:'#334155',padding:'2px 8px',borderRadius:6}}>{c.placa||c.vehiculo?.placa}</span>:<span style={{color:'#CBD5E1',fontSize:12}}>—</span>}</td>
                        <td style={{padding:'11px 14px'}}><span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,...estCfg}}>{c.estado}</span></td>
                        <td style={{padding:'11px 14px',fontSize:13,fontWeight:700,color:'#0D1B2A'}}>{fmt(c.total)}</td>
                        <td style={{padding:'11px 14px',fontSize:11,color:'#94A3B8'}}>{fmtD(c.creadoEn)}</td>
                        <td style={{padding:'11px 14px'}}><button onClick={e=>{e.stopPropagation();setModal({tipo:'ver',id:c.id});}} style={{width:30,height:30,borderRadius:8,border:'1px solid #E2ECF4',background:'#fff',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',color:'#64748B'}} onMouseEnter={e=>{e.currentTarget.style.background='#EFF6FF';e.currentTarget.style.color='#2563EB';e.currentTarget.style.borderColor='#BFDBFE';}} onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.color='#64748B';e.currentTarget.style.borderColor='#E2ECF4';}}><Eye size={13}/></button></td>
                      </tr>
                    );
                  })}
                  {!paginated.length&&(<tr><td colSpan={9} style={{textAlign:'center',padding:48,color:'#94A3B8',fontSize:13}}>{search?'Sin resultados':'No hay cotizaciones registradas'}</td></tr>)}
                </tbody>
              </table>
            </div>
            {totalPages>1&&(
              <div style={{padding:'12px 16px',borderTop:'1px solid #F1F5F9',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontSize:12,color:'#94A3B8'}}>Mostrando {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,filtradas.length)} de {filtradas.length}</span>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{width:32,height:32,borderRadius:8,border:'1px solid #E2ECF4',background:'#fff',cursor:page===1?'not-allowed':'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',color:'#64748B',opacity:page===1?.4:1}}><ChevronLeft size={15}/></button>
                  {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-page)<=1).reduce((acc,p,idx,arr)=>{if(idx>0&&p-arr[idx-1]>1)acc.push('...');acc.push(p);return acc;},[]).map((p,i)=>p==='...'?<span key={`e${i}`} style={{fontSize:12,color:'#CBD5E1',padding:'0 4px'}}>…</span>:<button key={p} onClick={()=>setPage(p)} style={{width:32,height:32,borderRadius:8,border:`1px solid ${p===page?'#2563EB':'#E2ECF4'}`,background:p===page?'#2563EB':'#fff',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:p===page?700:400,color:p===page?'#fff':'#64748B'}}>{p}</button>)}
                  <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{width:32,height:32,borderRadius:8,border:'1px solid #E2ECF4',background:'#fff',cursor:page===totalPages?'not-allowed':'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',color:'#64748B',opacity:page===totalPages?.4:1}}><ChevronRight size={15}/></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {modal?.tipo==='nueva' && (<NuevaCotizacionModal onClose={()=>setModal(null)} onSaved={onSaved}/>)}
      {modal?.tipo==='ver'   && (<ModalVerCotizacion id={modal.id} onClose={()=>setModal(null)} onEjecutar={()=>{qc.invalidateQueries(['cotizaciones']);setModal(null);}}/>)}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </div>
  );
}