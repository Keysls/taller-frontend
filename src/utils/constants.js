export const ORDEN_ESTADOS = {
  PENDIENTE:           { label: 'Pendiente',           badge: 'badge-gray'   },
  DIAGNOSTICANDO:      { label: 'Diagnosticando',      badge: 'badge-blue'   },
  EN_REPARACION:       { label: 'En reparación',       badge: 'badge-amber'  },
  ESPERANDO_REPUESTOS: { label: 'Esp. repuestos',      badge: 'badge-orange' },
  TERMINADO:           { label: 'Terminado',           badge: 'badge-green'  },
  ENTREGADO:           { label: 'Entregado',           badge: 'badge-teal'   },
  CANCELADO:           { label: 'Cancelado',           badge: 'badge-red'    },
};
export const MECANICO_ESTADOS = {
  DISPONIBLE: { label: 'Disponible', badge: 'badge-green' },
  OCUPADO:    { label: 'Ocupado',    badge: 'badge-amber' },
  AUSENTE:    { label: 'Ausente',    badge: 'badge-red'   },
};
export const METODOS_PAGO = [
  { value: 'EFECTIVO',      label: 'Efectivo' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'TARJETA',       label: 'Tarjeta' },
  { value: 'YAPE',          label: 'Yape' },
  { value: 'PLIN',          label: 'Plin' },
];
