import { format } from 'date-fns';
import { es } from 'date-fns/locale';
export const formatMoney    = (n) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n ?? 0);
export const formatDate     = (d) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: es }) : '—';
export const formatDateTime = (d) => d ? format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: es }) : '—';
