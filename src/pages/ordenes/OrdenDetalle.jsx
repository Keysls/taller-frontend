import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import * as svc from '../../services/orden.service.js';
import * as serSvc from '../../services/inventario.service.js';
import { ORDEN_ESTADOS, METODOS_PAGO } from '../../utils/constants.js';
import { formatMoney, formatDateTime } from '../../utils/formatters.js';
import * as pagoSvc from '../../services/pago.service.js';
import api from '../../services/api.js';

export default function OrdenDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pagoForm, setPagoForm] = useState({ metodo: 'EFECTIVO', monto: '' });

  const { data: orden, isLoading } = useQuery({ queryKey: ['orden', id], queryFn: () => svc.getById(id) });
  const { data: servicios } = useQuery({ queryKey: ['servicios-list'], queryFn: () => api.get('/servicios').then(r => r.data.data) });

  const handleEstado = async (estado) => {
    try { await svc.cambiarEstado(id, estado); qc.invalidateQueries(['orden', id]); toast.success('Estado actualizado'); } catch {}
  };

  const handlePago = async (e) => {
    e.preventDefault();
    try { await pagoSvc.create({ ordenId: id, ...pagoForm, monto: +pagoForm.monto }); toast.success('Pago registrado'); qc.invalidateQueries(['orden', id]); setPagoForm({ metodo: 'EFECTIVO', monto: '' }); } catch {}
  };

  if (isLoading) return <div style={{ textAlign: 'center', padding: 40 }}>Cargando...</div>;
  if (!orden) return null;

  const est = ORDEN_ESTADOS[orden.estado];
  const totalPagado = orden.pagos?.reduce((s, p) => s + Number(p.monto), 0) || 0;
  const saldo = Number(orden.totalGeneral) - totalPagado;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/ordenes')}><ArrowLeft size={16} /></button>
          <h2 className="page-title">{orden.numeroOrden}</h2>
          <span className={`badge ${est?.badge}`}>{est?.label}</span>
        </div>
        <select className="input" style={{ width: 'auto' }} value={orden.estado} onChange={e => handleEstado(e.target.value)}>
          {Object.entries(ORDEN_ESTADOS).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Información</div>
          <table style={{ width: '100%', fontSize: 14 }}>
            <tbody>
              <tr><td style={{ color: '#64748b', padding: '4px 0' }}>Vehículo</td><td><strong>{orden.vehiculo?.placa}</strong> {orden.vehiculo?.marca} {orden.vehiculo?.modelo}</td></tr>
              <tr><td style={{ color: '#64748b', padding: '4px 0' }}>Cliente</td><td>{orden.vehiculo?.cliente?.nombres} {orden.vehiculo?.cliente?.apellidos}</td></tr>
              <tr><td style={{ color: '#64748b', padding: '4px 0' }}>Mecánico</td><td>{orden.mecanico?.nombre || '—'}</td></tr>
              <tr><td style={{ color: '#64748b', padding: '4px 0' }}>Fecha</td><td>{formatDateTime(orden.fecha)}</td></tr>
              {orden.diagnostico && <tr><td style={{ color: '#64748b', padding: '4px 0' }}>Diagnóstico</td><td>{orden.diagnostico}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Totales</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Servicios</span><span>{formatMoney(orden.totalServicios)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Repuestos</span><span>{formatMoney(orden.totalRepuestos)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 8, fontWeight: 700 }}><span>Total</span><span>{formatMoney(orden.totalGeneral)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}><span>Pagado</span><span>{formatMoney(totalPagado)}</span></div>
            {saldo > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 600 }}><span>Saldo pendiente</span><span>{formatMoney(saldo)}</span></div>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Servicios ({orden.servicios?.length || 0})</div>
          {orden.servicios?.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span>{s.servicio?.nombre}</span><span style={{ fontWeight: 600 }}>{formatMoney(s.precio)}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Pagos</div>
          {orden.pagos?.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span>{p.metodo}</span><span style={{ fontWeight: 600, color: '#16a34a' }}>{formatMoney(p.monto)}</span>
            </div>
          ))}
          {saldo > 0 && (
            <form onSubmit={handlePago} style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <select className="input" value={pagoForm.metodo} onChange={e => setPagoForm(p => ({ ...p, metodo: e.target.value }))}>
                {METODOS_PAGO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <input className="input" type="number" step="0.01" placeholder="Monto" value={pagoForm.monto} onChange={e => setPagoForm(p => ({ ...p, monto: e.target.value }))} required />
              <button type="submit" className="btn btn-primary"><Plus size={16} /></button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
