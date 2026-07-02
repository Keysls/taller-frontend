import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore.js';
import {
  Plus, Search, X, Loader2, ChevronLeft, ChevronRight,
  Eye, Printer, DollarSign, AlertTriangle, Wrench, Pencil, MessageCircle, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import NuevaCotizacionModal from '../../components/ui/NuevaCotizacionModal.jsx';
import { ModalPago } from '../pagos/Pagos.jsx';


const ordApi = {
  getAll:        ()           => api.get('/ordenes').then(r => r.data.data || []),
  getById:       (id)         => api.get(`/ordenes/${id}`).then(r => r.data.data),
  cambiarEstado: (id, estado) => api.patch(`/ordenes/${id}/estado`, { estado }).then(r => r.data.data),
  update:        (id, data)   => api.patch(`/ordenes/${id}`, data).then(r => r.data.data),
};

// Maneja tanto números como el string 'Oculto' que devuelve el backend para mecánicos
const fmt = n =>
  n === 'Oculto'
    ? 'S/ *****'
    : new Intl.NumberFormat('es-PE', { style:'currency', currency:'PEN' }).format(n ?? 0);
const fmtD = d => d ? new Date(d).toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '—';

const PER_PAGE = 20;

const ESTADO_CFG = {
  PENDIENTE:           { bg:'#FFF7ED', color:'#C2410C', label:'Pendiente'      },
  DIAGNOSTICANDO:      { bg:'#EFF6FF', color:'#1D4ED8', label:'Diagnosticando' },
  EN_REPARACION:       { bg:'#FFFBEB', color:'#B45309', label:'En reparación'  },
  ESPERANDO_REPUESTOS: { bg:'#FDF4FF', color:'#7C3AED', label:'Esp. repuestos' },
  TERMINADO:           { bg:'#F0FDF4', color:'#15803D', label:'Terminado'      },
  ENTREGADO:           { bg:'#ECFDF5', color:'#047857', label:'Entregado'      },
  CANCELADO:           { bg:'#FEF2F2', color:'#DC2626', label:'Cancelado'      },
};

const iS = { width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid #E2ECF4', background:'#F8FAFC', fontSize:13, color:'#0D1B2A', outline:'none', boxSizing:'border-box' };
const fo = e => e.target.style.borderColor = '#2563EB';
const bl = e => e.target.style.borderColor = '#E2ECF4';

const CSS_RESPONSIVE = `
  .ot-kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:16px; }
  .ot-filtros { display:flex; gap:10px; flex-wrap:wrap; }
  .ot-filtro-search { position:relative; flex:1; min-width:200px; }
  .ot-tabla-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .ot-col-hide-sm { display:table-cell; }
  .ot-panel { width:500px !important; }
  .ot-panel-grid { display:grid; grid-template-columns:1fr 1fr; gap:0 20px; }

  .ot-cards { display:none; padding:12px; gap:10px; flex-direction:column; }
  .ot-card {
    background:#fff; border-radius:14px; border:1px solid #F1F5F9;
    box-shadow:0 1px 4px rgba(0,0,0,0.06); padding:14px 16px; cursor:pointer;
  }
  .ot-card-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
  .ot-card-mid { display:grid; grid-template-columns:1fr 1fr; gap:6px 12px; margin-bottom:10px; }
  .ot-card-bot { display:flex; justify-content:space-between; align-items:center; }
  .ot-card-label { font-size:10px; color:#94A3B8; margin-bottom:1px; }
  .ot-card-value { font-size:12px; font-weight:600; color:#0D1B2A; }

  @media (max-width:768px) {
    .ot-kpis { grid-template-columns:repeat(2,1fr); gap:8px; }
    .ot-col-hide-sm { display:none !important; }
    .ot-panel { width:100vw !important; }
    .ot-panel-grid { grid-template-columns:1fr; gap:0; }
    .ot-tabla-wrap { display:none; }
    .ot-cards { display:flex; }
    .ot-pagination { padding:10px 12px !important; }
  }
`;

// ─── imprimirOrden ────────────────────────────────────────────────
// Solo accesible para roles que no son MECANICO (el backend también bloquea el PDF)
function imprimirOrden(ot) {
  const fmtS     = n => `S/ ${Number(n||0).toFixed(2)}`;
  const fmtFecha = d => d ? new Date(d).toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'2-digit'}) : '—';
  const est      = ESTADO_CFG[ot?.estado] || ESTADO_CFG.PENDIENTE;
  const serviciosItems = ot?.servicios || [];
  const repuestosItems = ot?.repuestos || [];
  const descPctSvc = Number(ot?.descuentoSvc || 0);
  const descPctRep = Number(ot?.descuentoRep || 0);
  const subSvc = serviciosItems.reduce((s,i) => s + Number(i.precio||0), 0);
  const subRep = repuestosItems.reduce((s,i) => s + Number(i.subtotal||0), 0);
  const totalSvc = Math.max(0, subSvc * (1 - descPctSvc/100));
  const totalRep = Math.max(0, subRep * (1 - descPctRep/100));

  const tablaSeccion = (titulo, items, subtotalCalc, descPct, cols) => {
    if (!items || items.length === 0) return '';
    const filas = items.map((item, idx) => {
      if (cols === 'svc') return `<tr><td class="center" style="color:#64748b">${idx+1}</td><td>${item.servicio?.nombre || item.descripcion || ''}</td><td class="right">${fmtS(item.precio)}</td><td class="center">1</td><td class="right">${fmtS(item.precio)}</td></tr>`;
      const pu = Number(item.precioUnit || 0);
      const sub = Number(item.subtotal || 0);
      return `<tr><td class="center" style="color:#64748b">${idx+1}</td><td>${item.repuesto?.nombre || item.descripcion || ''}</td><td class="right">${fmtS(pu)}</td><td class="center">${item.cantidad||1}</td><td class="right">${fmtS(sub)}</td></tr>`;
    }).join('');
    return `<div class="section-block"><table class="cotiz-table"><thead><tr><th class="center" style="width:5%">Nº</th><th style="width:47%">${titulo}</th><th class="right" style="width:18%">Precio unit</th><th class="center" style="width:10%">Cantidad</th><th class="right" style="width:20%">Precio</th></tr></thead><tbody>${filas}</tbody></table><div class="section-footer"><div class="section-footer-inner"><div class="section-footer-igv">Precio en soles incluido I.G.V.</div><div class="section-footer-discount">${descPct > 0 ? `Descuento: ${descPct}%` : ''}</div><div class="section-footer-total-label">Total</div><div class="section-footer-total-value">${fmtS(subtotalCalc)}</div></div></div></div>`;
  };

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>OT ${ot?.numeroOrden||''}</title><style>@page{size:A4;margin:10mm}body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;margin:0;padding:0;font-size:11px}.header-table{width:100%;border-collapse:collapse;margin-bottom:14px}.header-info-cell{width:40%;vertical-align:top;padding-left:10px;font-size:10px;color:#1e293b;line-height:1.6}.header-title-cell{width:30%;vertical-align:top;text-align:right}.header-title{font-size:30px;font-weight:bold;color:#1e293b;line-height:1}.header-code{font-size:12px;color:#64748b;margin-top:2px}.datos-table{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:11px}.datos-section-label{font-size:10px;font-weight:bold;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}.datos-row{display:table;width:100%;margin-bottom:2px}.datos-label{display:table-cell;color:#64748b;width:90px}.datos-value{display:table-cell;font-weight:500;color:#1e293b}.section-block{margin-bottom:14px}.cotiz-table{width:100%;border-collapse:collapse;font-size:11px}.cotiz-table thead tr{background:#f1f5f9}.cotiz-table thead th{padding:6px 8px;text-align:left;font-weight:normal;color:#64748b;font-size:10px;border-bottom:1px solid #e2e8f0}.cotiz-table thead th.right{text-align:right}.cotiz-table thead th.center{text-align:center}.cotiz-table tbody td{padding:4px 8px;border-bottom:1px solid #f1f5f9}.cotiz-table tbody td.right{text-align:right}.cotiz-table tbody td.center{text-align:center}.section-footer{background:#f8fafc;border:1px solid #e2e8f0;border-top:none;padding:0}.section-footer-inner{display:table;width:100%}.section-footer-igv{display:table-cell;padding:7px 10px;font-size:10px;font-weight:bold;text-transform:uppercase;width:40%;vertical-align:middle}.section-footer-discount{display:table-cell;padding:7px 8px;font-size:10px;color:#64748b;text-align:right;width:40%;vertical-align:middle}.section-footer-total-label{display:table-cell;padding:7px 6px;font-weight:bold;text-align:right;font-size:12px;width:10%;vertical-align:middle}.section-footer-total-value{display:table-cell;padding:7px 10px;font-weight:bold;text-align:right;font-size:12px;width:10%;vertical-align:middle}.bottom-table{width:100%;border-collapse:collapse;margin-top:18px}.nota-label{font-size:10px;font-weight:bold;color:#1e293b;margin-bottom:3px;text-transform:uppercase}.nota-box{border:1px solid #cbd5e1;min-height:36px;padding:6px 8px;font-size:10px;color:#475569;margin-bottom:10px}.total-final-box{display:inline-block;border:1px solid #cbd5e1;padding:14px 20px;text-align:right;min-width:170px}.total-final-label{font-size:11px;font-weight:bold;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px}.total-final-amount{font-size:32px;font-weight:bold;color:#1e293b;line-height:1.1}.total-final-igv{font-size:10px;color:#64748b;font-style:italic;margin-top:4px}.doc-footer{margin-top:16px;font-size:10px;color:#94a3b8;line-height:1.6}</style></head><body><table class="header-table"><tr><td style="width:30%;vertical-align:top"><img src="/logo_pdf.png" style="width:120px;height:auto;object-fit:contain"/></td><td class="header-info-cell"><div style="font-weight:bold;font-size:11px;">R.U.C.: 10462333221</div><div>BBVA: 0011-0814-0210100186</div><div>BCP: 570-02689923-0-47</div><div style="font-size:10px;">Av. Metropolitana II Mz.H - Lte.05 - Las Orquideas - San Isidro</div></td><td class="header-title-cell"><div class="header-title">Orden de Trabajo</div><div class="header-code">${ot?.numeroOrden||''}</div><div style="font-size:10px;color:#94a3b8;margin-top:4px">${fmtFecha(ot?.fecha||ot?.creadoEn)}</div><div style="margin-top:6px;display:inline-block;padding:3px 12px;border-radius:20px;background:${est.bg};color:${est.color};font-size:10px;font-weight:bold">${est.label}</div></td></tr></table><table class="datos-table"><tr><td width="50%" style="vertical-align:top;padding-right:20px"><div class="datos-section-label">Datos del Cliente</div><div class="datos-row"><div class="datos-label">Propietario:</div><div class="datos-value">${ot?.facturarA || ((ot?.vehiculo?.cliente?.nombres||'') + ' ' + (ot?.vehiculo?.cliente?.apellidos||''))}</div></div><div class="datos-row"><div class="datos-label">DNI/RUC</div><div class="datos-value">${ot?.dniRuc || ot?.vehiculo?.cliente?.dniRuc||'—'}</div></div><div class="datos-row"><div class="datos-label">Teléfono</div><div class="datos-value">${ot?.telefono || ot?.vehiculo?.cliente?.telefono||'—'}</div></div><div class="datos-row"><div class="datos-label">Técnico</div><div class="datos-value">${ot?.mecanico?.nombre||'—'}</div></div><div class="datos-row"><div class="datos-label">Método pago</div><div class="datos-value">${ot?.metodoPago||'—'}</div></div></td><td width="50%" style="vertical-align:top;padding-left:20px"><div class="datos-section-label">Datos del Vehículo</div><div class="datos-row"><div class="datos-label">Placa</div><div class="datos-value">${ot?.placa || ot?.vehiculo?.placa||'—'}</div></div><div class="datos-row"><div class="datos-label">Marca</div><div class="datos-value">${ot?.marca || ot?.vehiculo?.marca||'—'}</div></div><div class="datos-row"><div class="datos-label">Modelo</div><div class="datos-value">${ot?.modelo || ot?.vehiculo?.modelo||'—'}</div></div><div class="datos-row"><div class="datos-label">Motor</div><div class="datos-value">${ot?.motor||'—'}</div></div><div class="datos-row"><div class="datos-label">Km</div><div class="datos-value">${ot?.km2 ? Number(ot.km2).toLocaleString() : (ot?.vehiculo?.kilometraje?.toLocaleString()||'—')}</div></div></td></tr></table>${ot?.tipoOrden ? `<div style="font-size:11px;margin-bottom:10px">Servicio Aplicado: <strong>${ot.tipoOrden}</strong></div>` : ''}${tablaSeccion('Servicios',serviciosItems,totalSvc,descPctSvc,'svc')}${tablaSeccion('Repuestos / Insumos',repuestosItems,totalRep,descPctRep,'rep')}<table class="bottom-table"><tr><td style="vertical-align:top;width:60%;padding-right:16px"><div class="nota-label">Diagnóstico</div><div class="nota-box">${ot?.diagnostico||''}</div><div class="nota-label" style="margin-top:8px">Observaciones</div><div class="nota-box">${ot?.observaciones||ot?.nota2||''}</div></td><td style="vertical-align:top;width:40%;text-align:right"><div class="total-final-box"><div class="total-final-label">Total</div><div class="total-final-amount">S/ ${Number(ot?.totalGeneral||0).toFixed(2)}</div><div class="total-final-igv">INCLUYE IGV*</div></div></td></tr></table><div class="doc-footer"><strong>Términos aplicables*</strong><br/><br/>- Garantía de 30 días en mano de obra.<br/>- Garantía de repuestos según fabricante.<br/>- Revisión incluida en el precio.</div></body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// ─── Descargar PDF directo desde backend ─────────────────────────
async function descargarOrden(ot) {
  try {
    const stored = JSON.parse(localStorage.getItem('taller-auth') || '{}');
    const token  = stored?.state?.token;

    const res = await fetch(`/api/ordenes/${ot.id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al generar PDF');

    const blob   = await res.blob();
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    const placa  = (ot.placa || ot.vehiculo?.placa || 'SIN-PLACA').replace(/[^a-zA-Z0-9]/g, '-');
    const numero = (ot.numeroOrden || 'OT').replace(/[^a-zA-Z0-9]/g, '-');
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

// ─── Abrir WhatsApp ───────────────────────────────────────────────
function abrirWhatsapp(ot) {
  const tel = ot?.telefono || ot?.vehiculo?.cliente?.telefono || '';
  const num = tel.replace(/\D/g, '');
  if (!num) { alert('No hay número de teléfono registrado para este cliente.'); return; }
  const numeroConCodigo = num.startsWith('51') ? num : `51${num}`;
  const nombre = ot?.facturarA || `${ot?.vehiculo?.cliente?.nombres||''} ${ot?.vehiculo?.cliente?.apellidos||''}`.trim() || 'cliente';
  const msg = encodeURIComponent(`Hola ${nombre}, le informamos sobre su Orden de Trabajo ${ot?.numeroOrden}. Placa: ${ot?.placa || ot?.vehiculo?.placa || '—'}. Cualquier consulta estamos a su disposición.`);
  window.open(`https://wa.me/${numeroConCodigo}?text=${msg}`, '_blank');
}

// ─── Notas colapsable ─────────────────────────────────────────────
function NotasBlock({ ot }) {
  const [open, setOpen] = useState(false);
  const nota1 = ot?.diagnostico || ot?.nota1 || '';
  const nota2 = ot?.observaciones || ot?.nota2 || '';
  if (!nota1 && !nota2) return null;
  return (
    <div style={{ marginTop:10, borderRadius:8, border:'1px solid #F1F5F9', overflow:'hidden' }}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{ width:'100%', padding:'8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#F8FAFC', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, color:'#0D1B2A' }}>
        <span>Notas</span>
        <span style={{ fontSize:14, color:'#94A3B8', transform:open?'rotate(180deg)':'none', transition:'transform .2s' }}>▾</span>
      </button>
      {open && (
        <div style={{ padding:'10px 12px', background:'#fff', display:'flex', flexDirection:'column', gap:8 }}>
          {nota1 && <div><div style={{ fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:3 }}>Nota 1</div><div style={{ fontSize:12, color:'#64748B', lineHeight:1.5 }}>{nota1}</div></div>}
          {nota2 && <div><div style={{ fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:3 }}>Nota 2</div><div style={{ fontSize:12, color:'#64748B', lineHeight:1.5 }}>{nota2}</div></div>}
        </div>
      )}
    </div>
  );
}

// ─── Panel lateral ────────────────────────────────────────────────
function PanelOT({ id, onClose, onModificar }) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const esMecanico = user?.rol?.nombre === 'MECANICO';

  const [estadoEdit, setEstadoEdit] = useState(false);
  const [cotizacionOpen, setCotizacionOpen] = useState(true);
  const [showPago, setShowPago] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const { data: ot, isLoading } = useQuery({ queryKey:['orden',id], queryFn:()=>ordApi.getById(id) });

  const handleEstado = async (estado) => {
    try {
      await ordApi.cambiarEstado(id, estado);
      qc.invalidateQueries(['orden',id]);
      qc.invalidateQueries(['ordenes']);
      toast.success('Estado actualizado');
      setEstadoEdit(false);
    } catch { toast.error('Error al cambiar estado'); }
  };

  const handleDescargar = async () => {
    setDescargando(true);
    await descargarOrden(ot);
    setDescargando(false);
  };

  if(isLoading) return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(15,23,42,0.3)', backdropFilter:'blur(2px)' }} onClick={onClose}>
      <div style={{ position:'absolute', top:0, right:0, bottom:0, width:500, background:'#F4F8FC', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Loader2 size={24} color="#2563EB" style={{ animation:'spin 1s linear infinite' }}/>
      </div>
    </div>
  );

  const estCfg = ESTADO_CFG[ot?.estado] || ESTADO_CFG.PENDIENTE;
  const serviciosItems = ot?.servicios || [];
  const repuestosItems = ot?.repuestos || [];

  // Si el backend devolvió 'Oculto', no calculamos montos para evitar NaN
  const esOculto    = ot?.totalGeneral === 'Oculto';
  const totalPagado = esOculto ? null : (ot?.pagos?.reduce((s,p) => s + Number(p.monto), 0) || 0);
  const saldo       = esOculto ? null : Number(ot?.totalGeneral || 0) - totalPagado;

  const InfoRow = ({label, value, bold}) => (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #F1F5F9', fontSize:13 }}>
      <span style={{ color:'#94A3B8', fontSize:12 }}>{label}</span>
      <span style={{ fontWeight:bold?700:500, color:'#0D1B2A', textAlign:'right', maxWidth:200 }}>{value||'—'}</span>
    </div>
  );

  return (
    <>
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(15,23,42,0.3)', backdropFilter:'blur(2px)' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="ot-panel" style={{ position:'absolute', top:0, right:0, bottom:0, background:'#F4F8FC', boxShadow:'-8px 0 40px rgba(15,23,42,0.15)', display:'flex', flexDirection:'column', animation:'slideIn .25s ease' }}>

        {/* Header */}
        <div style={{ padding:'16px 20px', background:'#fff', borderBottom:'1px solid #E2ECF4', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ flex:1, textAlign:'center' }}>
            <h2 style={{ fontSize:15, fontWeight:700, color:'#0D1B2A', margin:0 }}>{ot?.numeroOrden}</h2>
            <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>
              <span style={{ ...estCfg, padding:'1px 8px', borderRadius:20, fontWeight:700, fontSize:10 }}>{estCfg.label}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#94A3B8', padding:4, marginLeft:8 }}><X size={18}/></button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto' }}>

          {/* Estado */}
          <div style={{ background:'#fff', margin:'12px 14px', borderRadius:14, border:'1px solid #E2ECF4', padding:'12px 16px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Estado de la orden</div>
            {/* El mecánico NO puede cambiar el estado, solo verlo */}
            {!esMecanico && estadoEdit ? (
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {Object.entries(ESTADO_CFG).map(([k,v]) => (
                  <button key={k} onClick={()=>handleEstado(k)}
                    style={{ padding:'5px 12px', borderRadius:20, border:'none', cursor:'pointer', fontSize:11, fontWeight:700, background:v.bg, color:v.color }}>
                    {v.label}
                  </button>
                ))}
                <button onClick={()=>setEstadoEdit(false)} style={{ padding:'5px 12px', borderRadius:20, border:'1px solid #E2ECF4', cursor:'pointer', fontSize:11, background:'#fff', color:'#64748B' }}>Cancelar</button>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ ...estCfg, padding:'4px 14px', borderRadius:20, fontWeight:700, fontSize:12 }}>{estCfg.label}</span>
                {!esMecanico && (
                  <button onClick={()=>setEstadoEdit(true)} style={{ fontSize:12, color:'#2563EB', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Cambiar →</button>
                )}
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ background:'#fff', margin:'0 14px 12px', borderRadius:14, border:'1px solid #E2ECF4', padding:'14px 16px' }}>
            <div className="ot-panel-grid">
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#0D1B2A', marginBottom:8 }}>Cliente</div>
                <InfoRow label="Señor:" value={ot?.facturarA || `${ot?.vehiculo?.cliente?.nombres||''} ${ot?.vehiculo?.cliente?.apellidos||''}`.trim()} bold />
                <InfoRow label="DNI/RUC" value={ot?.dniRuc || ot?.vehiculo?.cliente?.dniRuc} />
                <InfoRow label="Teléfono" value={ot?.telefono || ot?.vehiculo?.cliente?.telefono} />
                <InfoRow label="Apertura" value={fmtD(ot?.fecha||ot?.creadoEn)} />
                <InfoRow label="Tipo Orden" value={ot?.tipoOrden || ot?.cotizacion?.tipoOrden} />
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#0D1B2A', marginBottom:8 }}>Vehículo</div>
                <InfoRow label="Placa:" value={ot?.placa || ot?.vehiculo?.placa} bold />
                <InfoRow label="Modelo:" value={ot?.modelo || `${ot?.vehiculo?.marca||''} ${ot?.vehiculo?.modelo||''}`.trim()} />
                <InfoRow label="Técnico:" value={ot?.mecanico?.nombre} />
                <InfoRow label="Kilometraje" value={ot?.km2 ? Number(ot.km2).toLocaleString() : ot?.vehiculo?.kilometraje?.toLocaleString()} />
              </div>
            </div>
            {(ot?.diagnostico || ot?.nota1 || ot?.observaciones || ot?.nota2) && <NotasBlock ot={ot} />}
          </div>

          {/* Detalle */}
          <div style={{ background:'#fff', margin:'0 14px 12px', borderRadius:14, border:'1px solid #E2ECF4', overflow:'hidden' }}>
            <button onClick={()=>setCotizacionOpen(o=>!o)}
              style={{ width:'100%', padding:'13px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'transparent', border:'none', cursor:'pointer' }}>
              <span style={{ fontSize:14, fontWeight:700, color:'#0D1B2A' }}>Detalle</span>
              <span style={{ fontSize:16, color:'#94A3B8', transform:cotizacionOpen?'rotate(180deg)':'none', transition:'transform .2s' }}>▾</span>
            </button>
            {cotizacionOpen && (
              <div style={{ borderTop:'1px solid #F1F5F9', padding:'0 18px 16px' }}>
                {serviciosItems.length > 0 && (
                  <div style={{ marginTop:14 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#1D4ED8', marginBottom:8 }}>Servicios</div>
                    {serviciosItems.map((s,i) => {
                      const esTercero = s.tipo === 'tercero' || !s.servicioId;
                      return (
                        <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', fontSize:13, borderBottom:'1px solid #F8FAFC' }}>
                          <span style={{ color: esTercero ? '#7C3AED' : '#1E293B' }}>
                            {s.descripcion || s.servicio?.nombre}
                            {esTercero && <span style={{ fontSize:10, color:'#7C3AED', background:'#F5F3FF', padding:'1px 6px', borderRadius:4, marginLeft:6 }}>externo</span>}
                          </span>
                          {/* fmt() devuelve 'Oculto' si el backend lo censuró */}
                          <span style={{ fontWeight:600, color: s.precio === 'Oculto' ? '#94A3B8' : 'inherit' }}>{fmt(s.precio)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {repuestosItems.length > 0 && (
                  <div style={{ marginTop:14 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#B45309', marginBottom:8 }}>Repuestos</div>
                    {repuestosItems.map((r,i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', fontSize:13, borderBottom:'1px solid #F8FAFC' }}>
                        <span>{r.descripcion || r.repuesto?.nombre}</span>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {r.cantidad > 1 && <span style={{ fontSize:11, color:'#94A3B8' }}>{r.cantidad}x</span>}
                          <span style={{ fontWeight:600, color: r.subtotal === 'Oculto' ? '#94A3B8' : 'inherit' }}>{fmt(r.subtotal)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Pagos y saldo solo visibles para roles con acceso a precios */}
                {!esMecanico && ot?.pagos?.length > 0 && (
                  <div style={{ marginTop:14 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#15803D', marginBottom:8 }}>Pagos</div>
                    {ot.pagos.map((p,i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', fontSize:13, borderBottom:'1px solid #F8FAFC' }}>
                        <span style={{ color:'#64748B' }}>{p.metodo} · {fmtD(p.fecha)}</span>
                        <span style={{ fontWeight:700, color:'#15803D' }}>{fmt(p.monto)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!esMecanico && saldo > 0 && (
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', marginTop:8, borderTop:'1px solid #F1F5F9', fontSize:13, color:'#DC2626' }}>
                    <span>Saldo pendiente</span>
                    <span style={{ fontWeight:600 }}>- {fmt(saldo)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ background:'#fff', borderTop:'1px solid #E2ECF4', flexShrink:0 }}>
          <div style={{ padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #F1F5F9' }}>
            <span style={{ fontSize:18, fontWeight:800, color:'#0D1B2A' }}>TOTAL</span>
            <div style={{ textAlign:'right' }}>
              {/* Muestra 'Oculto' en gris si el backend censuró el valor */}
              <div style={{ fontSize:20, fontWeight:900, color: esOculto ? '#94A3B8' : '#0D1B2A' }}>
                {esOculto ? 'S/ *****' : fmt(ot?.totalGeneral)}
              </div>
              {!esMecanico && saldo > 0 && <div style={{ fontSize:11, color:'#DC2626', fontWeight:600 }}>Saldo: {fmt(saldo)}</div>}
              {!esMecanico && saldo <= 0 && totalPagado > 0 && <div style={{ fontSize:11, color:'#15803D', fontWeight:600 }}>✓ Pagado</div>}
            </div>
          </div>
          {/* Botones de acción: solo para roles que no son MECANICO */}
          {!esMecanico && (
            <div style={{ padding:'12px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>imprimirOrden(ot)}
                  style={{ width:36, height:36, borderRadius:10, border:'1px solid #E2ECF4', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748B' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#F1F5F9'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}
                  title="Imprimir OT">
                  <Printer size={16}/>
                </button>
                <button onClick={handleDescargar} disabled={descargando}
                  style={{ width:36, height:36, borderRadius:10, border:'1px solid #E2ECF4', background:'#fff', cursor:descargando?'wait':'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#2563EB', opacity:descargando?.6:1 }}
                  onMouseEnter={e=>{ if(!descargando) e.currentTarget.style.background='#EFF6FF'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background='#fff'; }}
                  title="Descargar PDF">
                  {descargando
                    ? <Loader2 size={15} style={{ animation:'spin 1s linear infinite' }}/>
                    : <Download size={16}/>
                  }
                </button>
                <button onClick={()=>abrirWhatsapp(ot)}
                  style={{ width:36, height:36, borderRadius:10, border:'1px solid #E2ECF4', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#25D366' }}
                  onMouseEnter={e=>{ e.currentTarget.style.background='#F0FDF4'; e.currentTarget.style.borderColor='#86EFAC'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background='#fff'; e.currentTarget.style.borderColor='#E2ECF4'; }}
                  title="WhatsApp">
                  <MessageCircle size={16}/>
                </button>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                {saldo > 0 && (
                  <button onClick={()=>setShowPago(true)}
                    style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'10px 16px', borderRadius:10, border:'none', background:'#15803D', cursor:'pointer', fontSize:13, fontWeight:700, color:'#fff' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#166534'}
                    onMouseLeave={e=>e.currentTarget.style.background='#15803D'}>
                    <Plus size={14}/> Pago
                  </button>
                )}
                <button onClick={()=>onModificar(ot)}
                  style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 22px', borderRadius:10, border:'none', background:'#2563EB', cursor:'pointer', fontSize:13, fontWeight:700, color:'#fff' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#1D4ED8'}
                  onMouseLeave={e=>e.currentTarget.style.background='#2563EB'}>
                  <Pencil size={15}/> Modificar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {showPago && ot && (
      <ModalPago
        orden={ot}
        onClose={()=>setShowPago(false)}
        onSaved={()=>{
          setShowPago(false);
          qc.invalidateQueries(['orden', id]);
          qc.invalidateQueries(['ordenes']);
          qc.invalidateQueries(['pagos-pendientes']);
        }}
      />
    )}

    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </>
  );
}

// ─── Modal Editar OT ──────────────────────────────────────────────
function ModalEditarOT({ ot, onClose, onSaved }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    mecanicoId:    ot?.mecanicoId    || '',
    diagnostico:   ot?.diagnostico   || '',
    observaciones: ot?.observaciones || '',
    prioridad:     ot?.prioridad     || 'NORMAL',
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const { data: mecanicos=[] } = useQuery({ queryKey:['mecanicos'], queryFn: ()=>api.get('/mecanicos').then(r=>r.data.data||[]) });
  const iS2 = { width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid #E2ECF4', background:'#F4F8FC', fontSize:13, color:'#0D1B2A', outline:'none', boxSizing:'border-box', fontFamily:'inherit' };
  const lS2 = { display:'block', fontSize:11, fontWeight:600, color:'#4A6A8A', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' };

  const handleSave = async () => {
    setSaving(true);
    try {
      await ordApi.update(ot.id, form);
      toast.success('Orden actualizada');
      qc.invalidateQueries(['orden', ot.id]);
      qc.invalidateQueries(['ordenes']);
      onSaved();
    } catch(err) { toast.error(err.response?.data?.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(15,23,42,0.5)', backdropFilter:'blur(2px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:320, boxShadow:'0 24px 80px rgba(15,23,42,0.2)', border:'1px solid #E2ECF4', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h3 style={{ fontSize:15, fontWeight:700, color:'#0D1B2A', margin:0 }}>Modificar Orden</h3>
            <div style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>{ot?.numeroOrden}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#94A3B8' }}><X size={18}/></button>
        </div>
        <div style={{ padding:'20px' }}>
          <div style={{ marginBottom:14 }}>
            <label style={lS2}>Técnico asignado</label>
            <select style={iS2} value={form.mecanicoId} onChange={e=>set('mecanicoId',e.target.value)}>
              <option value="">Sin asignar</option>
              {mecanicos.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lS2}>Diagnóstico</label>
            <textarea style={{ ...iS2, resize:'vertical', minHeight:80 }} value={form.diagnostico} onChange={e=>set('diagnostico',e.target.value)} placeholder="Diagnóstico inicial..."/>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lS2}>Observaciones</label>
            <textarea style={{ ...iS2, resize:'vertical', minHeight:72 }} value={form.observaciones} onChange={e=>set('observaciones',e.target.value)} placeholder="Observaciones adicionales..."/>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lS2}>Prioridad</label>
            <div style={{ display:'flex', gap:8 }}>
              {['NORMAL','URGENTE'].map(p=>(
                <button key={p} type="button" onClick={()=>set('prioridad',p)}
                  style={{ padding:'7px 20px', borderRadius:9, border:`1.5px solid ${form.prioridad===p?(p==='URGENTE'?'#DC2626':'#2563EB'):'#E2ECF4'}`, background:form.prioridad===p?(p==='URGENTE'?'#FEF2F2':'#EFF6FF'):'#F8FAFC', color:form.prioridad===p?(p==='URGENTE'?'#DC2626':'#1D4ED8'):'#64748B', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  {p==='URGENTE'?'🔴 Urgente':'Normal'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding:'14px 20px', borderTop:'1px solid #F1F5F9', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:10, border:'1px solid #E2ECF4', background:'#fff', cursor:'pointer', fontSize:13, color:'#64748B' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding:'9px 24px', borderRadius:10, border:'none', background:'#2563EB', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, display:'inline-flex', alignItems:'center', gap:6 }}>
            {saving && <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }}/>}
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card individual de OT (móvil) ───────────────────────────────
function OTCard({ o, onClick }) {
  const { user } = useAuthStore();
  const esMecanico = user?.rol?.nombre === 'MECANICO';

  const est = ESTADO_CFG[o.estado] || ESTADO_CFG.PENDIENTE;
  const esOculto    = o.totalGeneral === 'Oculto';
  const total       = esOculto ? null : Number(o.totalGeneral || 0);
  const totalPagado = esOculto ? null : (o.pagos?.reduce((s, p) => s + Number(p.monto), 0) || 0);
  const saldoCalc   = esOculto ? null : total - totalPagado;
  const cliente     = o.facturarA || `${o.vehiculo?.cliente?.nombres||''} ${o.vehiculo?.cliente?.apellidos||''}`.trim() || '—';

  return (
    <div className="ot-card" onClick={onClick}>
      <div className="ot-card-top">
        <div>
          <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:700, color:'#2563EB', background:'#EFF6FF', padding:'3px 10px', borderRadius:6 }}>{o.numeroOrden}</span>
          {o.prioridad === 'URGENTE' && (
            <span style={{ marginLeft:8, fontSize:10, fontWeight:700, color:'#DC2626', background:'#FEF2F2', padding:'2px 7px', borderRadius:20 }}>🔴 URGENTE</span>
          )}
        </div>
        <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:est.bg, color:est.color }}>{est.label}</span>
      </div>

      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:14, fontWeight:700, color:'#0D1B2A', marginBottom:2 }}>{cliente}</div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ fontSize:12, fontWeight:700, background:'#F1F5F9', color:'#334155', padding:'1px 8px', borderRadius:5 }}>{o.placa || o.vehiculo?.placa || '—'}</span>
          {o.mecanico?.nombre && <span style={{ fontSize:11, color:'#94A3B8' }}>· {o.mecanico.nombre}</span>}
          <span style={{ fontSize:11, color:'#94A3B8' }}>· {fmtD(o.fecha||o.creadoEn)}</span>
        </div>
      </div>

      <div className="ot-card-mid">
        <div>
          <div className="ot-card-label">Tipo</div>
          <div className="ot-card-value">{o.tipoOrden || o.cotizacion?.tipoOrden || '—'}</div>
        </div>
        <div>
          <div className="ot-card-label">DNI/RUC</div>
          <div className="ot-card-value">{o.dniRuc || o.vehiculo?.cliente?.dniRuc || '—'}</div>
        </div>
      </div>

      <div className="ot-card-bot">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* Icono de dólar: verde si pagado, gris si oculto o con saldo */}
          <DollarSign size={14} color={esOculto ? '#CBD5E1' : (saldoCalc <= 0 ? '#22c55e' : '#CBD5E1')}/>
          <AlertTriangle size={14} color={o.prioridad === 'URGENTE' ? '#ef4444' : '#CBD5E1'}/>
          <Wrench size={14} color="#CBD5E1"/>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:'#94A3B8' }}>Total</div>
            <div style={{ fontSize:15, fontWeight:800, color: esOculto ? '#94A3B8' : '#0D1B2A' }}>
              {esOculto ? 'S/ *****' : fmt(total)}
            </div>
          </div>
          <button onClick={e=>{ e.stopPropagation(); onClick(); }}
            style={{ width:34, height:34, borderRadius:8, border:'1px solid #E2ECF4', background:'#EFF6FF', cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#2563EB' }}>
            <Eye size={14}/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página OrdenesTrabajo ────────────────────────────────────────
export default function OrdenesTrabajo() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const esMecanico = user?.rol?.nombre === 'MECANICO';

  const [panelId,     setPanelId]    = useState(null);
  const [editOT,      setEditOT]     = useState(null);
  const [otModificar, setOtModificar] = useState(null);
  const [showNueva,   setShowNueva]  = useState(false);
  const [search,      setSearch]     = useState('');
  const [estadoFlt,   setEstadoFlt]  = useState('');
  const [page,        setPage]       = useState(1);

  const { data: ordenes=[], isLoading } = useQuery({ queryKey:['ordenes'], queryFn: ordApi.getAll, refetchInterval:30000 });

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
        o.dniRuc?.includes(q) ||
        o.vehiculo?.cliente?.dniRuc?.includes(q) ||
        o.mecanico?.nombre?.toLowerCase().includes(q);
      const matchEstado = !estadoFlt || o.estado === estadoFlt;
      return matchSearch && matchEstado;
    });
  }, [ordenes, search, estadoFlt]);

  const totalPages = Math.ceil(filtradas.length / PER_PAGE);
  const paginated  = filtradas.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const kpis = useMemo(() => ({
    total:     ordenes.length,
    pendiente: ordenes.filter(o=>o.estado==='PENDIENTE').length,
    enProceso: ordenes.filter(o=>['DIAGNOSTICANDO','EN_REPARACION','ESPERANDO_REPUESTOS'].includes(o.estado)).length,
    terminado: ordenes.filter(o=>o.estado==='TERMINADO').length,
  }), [ordenes]);

  return (
    <div>
      <style>{CSS_RESPONSIVE}</style>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <p style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>{filtradas.length} de {ordenes.length} órdenes</p>
        </div>
        {/* El mecánico no puede crear órdenes */}
        {!esMecanico && (
          <button onClick={()=>setShowNueva(true)}
            style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:10, border:'none', cursor:'pointer', background:'#2563EB', color:'#fff', fontSize:13, fontWeight:600 }}
            onMouseEnter={e=>e.currentTarget.style.background='#1D4ED8'}
            onMouseLeave={e=>e.currentTarget.style.background='#2563EB'}>
            <Plus size={15}/> Nueva OT
          </button>
        )}
      </div>

      <div className="ot-kpis">
        {[
          { label:'Total',      value:kpis.total,     color:'#2563EB', bg:'#EFF6FF' },
          { label:'Pendientes', value:kpis.pendiente, color:'#C2410C', bg:'#FFF7ED' },
          { label:'En proceso', value:kpis.enProceso, color:'#B45309', bg:'#FFFBEB' },
          { label:'Terminadas', value:kpis.terminado, color:'#15803D', bg:'#F0FDF4' },
        ].map(k => (
          <div key={k.label} style={{ background:'#fff', borderRadius:12, border:'1px solid #F1F5F9', padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize:11, color:'#94A3B8', marginBottom:4 }}>{k.label}</div>
            <div style={{ fontSize:24, fontWeight:800, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #F1F5F9', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', overflow:'hidden' }}>

        <div style={{ padding:'14px 16px', borderBottom:'1px solid #F1F5F9' }} className="ot-filtros">
          <div className="ot-filtro-search">
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94A3B8', pointerEvents:'none' }}/>
            <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por N° orden, placa, cliente..."
              style={{ ...iS, paddingLeft:32, background:'#F8FAFC' }} onFocus={fo} onBlur={bl}/>
          </div>
          <select value={estadoFlt} onChange={e=>{ setEstadoFlt(e.target.value); setPage(1); }}
            style={{ ...iS, width:'auto', minWidth:160, background:'#F8FAFC', cursor:'pointer' }} onFocus={fo} onBlur={bl}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {(search||estadoFlt) && (
            <button onClick={()=>{ setSearch(''); setEstadoFlt(''); setPage(1); }}
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
            <div className="ot-tabla-wrap">
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#F8FAFC', borderBottom:'1px solid #F1F5F9' }}>
                    {[
                      { label:'N° Orden',  hide:false },
                      { label:'DNI',       hide:true  },
                      { label:'Cliente',   hide:false },
                      { label:'Placa',     hide:false },
                      { label:'Técnico',   hide:true  },
                      { label:'Apertura',  hide:true  },
                      { label:'Tipo Orden',hide:true  },
                      { label:'Estado',    hide:false },
                      { label:'iconos',    hide:true  },
                      { label:'acciones',  hide:false },
                    ].map(h => (
                      <th key={h.label} className={h.hide ? 'ot-col-hide-sm' : ''} style={{ padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.05em', whiteSpace:'nowrap' }}>{h.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(o => {
                    const est         = ESTADO_CFG[o.estado] || ESTADO_CFG.PENDIENTE;
                    const esOculto    = o.totalGeneral === 'Oculto';
                    const total       = esOculto ? null : Number(o.totalGeneral || 0);
                    const puntoColor  = esOculto ? '#CBD5E1' : (total < 2500 ? '#22c55e' : total < 5000 ? '#f59e0b' : '#ef4444');
                    const totalPagado = esOculto ? null : (o.pagos?.reduce((s, p) => s + Number(p.monto), 0) || 0);
                    const saldoCalc   = esOculto ? null : total - totalPagado;
                    return (
                      <tr key={o.id} style={{ borderBottom:'1px solid #F8FAFC', cursor:'pointer' }}
                        onMouseEnter={e=>e.currentTarget.style.background='#FAFBFF'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                        onClick={()=>setPanelId(o.id)}>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color:'#2563EB', background:'#EFF6FF', padding:'2px 8px', borderRadius:6 }}>{o.numeroOrden}</span>
                        </td>
                        <td className="ot-col-hide-sm" style={{ padding:'10px 12px', fontSize:12, color:'#64748B' }}>{o.dniRuc || o.vehiculo?.cliente?.dniRuc||'—'}</td>
                        <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600, color:'#0D1B2A', whiteSpace:'nowrap' }}>
                          {o.facturarA || `${o.vehiculo?.cliente?.nombres||''} ${o.vehiculo?.cliente?.apellidos||''}`.trim() || '—'}
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{ fontSize:12, fontWeight:700, background:'#F1F5F9', color:'#334155', padding:'2px 8px', borderRadius:6 }}>{o.placa || o.vehiculo?.placa||'—'}</span>
                        </td>
                        <td className="ot-col-hide-sm" style={{ padding:'10px 12px', fontSize:12, color:'#64748B' }}>{o.mecanico?.nombre||'—'}</td>
                        <td className="ot-col-hide-sm" style={{ padding:'10px 12px', fontSize:11, color:'#94A3B8', whiteSpace:'nowrap' }}>{fmtD(o.fecha||o.creadoEn)}</td>
                        <td className="ot-col-hide-sm" style={{ padding:'10px 12px', fontSize:12, color:'#64748B' }}>{o.tipoOrden || o.cotizacion?.tipoOrden||'—'}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:est.bg, color:est.color }}>{est.label}</span>
                        </td>
                        <td className="ot-col-hide-sm" style={{ padding:'10px 8px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            {/* Icono dólar: verde si pagado, gris si oculto o con saldo pendiente */}
                            <DollarSign size={14} color={esOculto ? '#CBD5E1' : (saldoCalc <= 0 ? '#22c55e' : '#CBD5E1')}/>
                            <AlertTriangle size={14} color={o.prioridad === 'URGENTE' ? '#ef4444' : '#CBD5E1'}/>
                            <Wrench size={14} color="#CBD5E1"/>
                          </div>
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:10, height:10, borderRadius:'50%', background:puntoColor, flexShrink:0 }} title={esOculto ? 'Oculto' : fmt(total)}/>
                            <button onClick={e=>{ e.stopPropagation(); setPanelId(o.id); }}
                              style={{ width:30, height:30, borderRadius:8, border:'1px solid #E2ECF4', background:'#fff', cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#64748B' }}
                              onMouseEnter={e=>{ e.currentTarget.style.background='#EFF6FF'; e.currentTarget.style.color='#2563EB'; e.currentTarget.style.borderColor='#BFDBFE'; }}
                              onMouseLeave={e=>{ e.currentTarget.style.background='#fff'; e.currentTarget.style.color='#64748B'; e.currentTarget.style.borderColor='#E2ECF4'; }}>
                              <Eye size={13}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!paginated.length && (
                    <tr><td colSpan={10} style={{ textAlign:'center', padding:48, color:'#94A3B8', fontSize:13 }}>
                      {search||estadoFlt ? 'Sin resultados' : 'No hay órdenes de trabajo'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="ot-cards">
              {paginated.map(o => (
                <OTCard key={o.id} o={o} onClick={() => setPanelId(o.id)} />
              ))}
              {!paginated.length && (
                <div style={{ textAlign:'center', padding:48, color:'#94A3B8', fontSize:13 }}>
                  {search||estadoFlt ? 'Sin resultados' : 'No hay órdenes de trabajo'}
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="ot-pagination" style={{ padding:'12px 16px', borderTop:'1px solid #F1F5F9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'#94A3B8' }}>Mostrando {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,filtradas.length)} de {filtradas.length}</span>
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

      {panelId && (
        <PanelOT id={panelId} onClose={()=>setPanelId(null)} onModificar={(ot)=>{ setPanelId(null); setOtModificar(ot); }}/>
      )}
      {editOT && <ModalEditarOT ot={editOT} onClose={()=>setEditOT(null)} onSaved={()=>setEditOT(null)}/>}
      {/* Modales de crear/modificar: bloqueados para mecánicos */}
      {!esMecanico && showNueva && (
        <NuevaCotizacionModal onClose={()=>setShowNueva(false)} onSaved={()=>{ qc.invalidateQueries(['ordenes']); setShowNueva(false); }}/>
      )}
      {!esMecanico && otModificar && (
        <NuevaCotizacionModal
          initialData={{
            clienteId:    otModificar.clienteId    || null,
            facturarA:    otModificar.facturarA    || null,
            direccion:    otModificar.direccion    || null,
            dniRuc:       otModificar.dniRuc       || null,
            correo:       otModificar.correo       || null,
            telefono:     otModificar.telefono     || null,
            contacto:     otModificar.contacto     || null,
            telefono2:    otModificar.telefono2    || null,
            asesor:       otModificar.asesor       || null,
            metodoPago:   otModificar.metodoPago   || 'EFECTIVO',
            km1:          otModificar.km1          || null,
            vehiculoId:   otModificar.vehiculoId   || null,
            placa:        otModificar.placa        || otModificar.vehiculo?.placa || null,
            marca:        otModificar.marca        || otModificar.vehiculo?.marca || null,
            modelo:       otModificar.modelo       || otModificar.vehiculo?.modelo || null,
            anio:         otModificar.anio         || otModificar.vehiculo?.anio  || null,
            color:        otModificar.color        || otModificar.vehiculo?.color || null,
            motor:        otModificar.motor        || null,
            chasis:       otModificar.chasis       || null,
            km2:          otModificar.km2          || otModificar.vehiculo?.kilometraje || null,
            tipoOrden:    otModificar.tipoOrden    || otModificar.cotizacion?.tipoOrden || null,
            mecanicoId:   otModificar.mecanicoId   || null,
            nota1:        otModificar.diagnostico  || null,
            nota2:        otModificar.observaciones|| null,
            items: [
              ...(otModificar.servicios||[]).map(s => ({
                tipo: s.tipo || (s.servicioId ? 'servicio' : 'tercero'),
                descripcion: s.servicio?.nombre || s.descripcion || '',
                cantidad: 1,
                precioUnit: Number(s.precio),
                subtotal: Number(s.precio),
                refId: s.servicioId,
              })),
              ...(otModificar.repuestos||[]).map(r => ({
                tipo: 'repuesto',
                descripcion: r.repuesto?.nombre || r.descripcion || '',
                cantidad: r.cantidad || 1,
                precioUnit: Number(r.precioUnit),
                subtotal: Number(r.subtotal),
                refId: r.repuestoId,
              })),
            ],
            descuentoSvc: otModificar.descuentoSvc || 0,
            descuentoRep: otModificar.descuentoRep || 0,
            prioridad: otModificar.prioridad || 'NORMAL',
          }}
          otId={otModificar.id}
          onClose={()=>setOtModificar(null)}
          onSaved={()=>{ qc.invalidateQueries(['ordenes']); setOtModificar(null); }}
        />
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </div>
  );
}
