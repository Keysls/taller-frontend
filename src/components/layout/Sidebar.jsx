import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Users, Car, Wrench,
  Package, CreditCard, FileText, Activity, Building2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { useState, useEffect } from 'react';

const CSS = `
  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 10px;
    border-radius: 12px;
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    color: #64748B;
    background: transparent;
    transition: background .15s, color .15s;
    width: 100%;
    border: none;
    cursor: pointer;
    text-align: left;
  }
  .nav-item:not(.nav-item--active):hover {
    background: #EFF6FF;
    color: #1D4ED8;
  }
  .nav-item--active {
    background: #2563EB;
    color: #FFFFFF;
    box-shadow: 0 4px 10px rgba(37,99,235,0.30);
  }
  .nav-item--collapsed {
    justify-content: center;
    gap: 0;
  }
`;

const S = {
  aside: {
    position: 'fixed', top: 0, left: 0, bottom: 0,
    background: '#FFFFFF',
    borderRight: '1px solid #F1F5F9',
    boxShadow: '1px 0 8px rgba(0,0,0,0.04)',
    display: 'flex', flexDirection: 'column',
    zIndex: 100, overflow: 'hidden',
    transition: 'transform .25s ease, width .2s ease',
  },
  header: {
    padding: '0 16px', borderBottom: '1px solid #F1F5F9',
    display: 'flex', alignItems: 'center', gap: 10, height: 56, flexShrink: 0,
  },
  logoWrap: {
    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
    background: '#EFF6FF', border: '1px solid #DBEAFE',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  brandName: { fontSize: 14, fontWeight: 700, color: '#1E293B', lineHeight: 1.2 },
  brandSub:  { fontSize: 10, color: '#94A3B8', marginTop: 1 },
  nav: {
    flex: 1, padding: '10px 10px', overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  sectionLabel: {
    fontSize: 9, fontWeight: 700, color: '#94A3B8',
    letterSpacing: '0.08em', textTransform: 'uppercase',
    padding: '12px 6px 4px',
  },
  sectionDivider: { height: 1, background: '#F1F5F9', margin: '10px 4px' },
};

const NAV_OPERACIONES = [
  { to: '/dashboard',    label: 'Dashboard',          icon: LayoutDashboard },
  { to: '/ordenes',      label: 'Órdenes de trabajo', icon: ClipboardList   },
  { to: '/cotizaciones', label: 'Cotizaciones',        icon: FileText        },
];
const NAV_CLIENTES = [
  { to: '/clientes',  label: 'Clientes',  icon: Users },
];
const NAV_PERSONAL   = [{ to: '/mecanicos', label: 'Mecánicos', icon: Wrench }];

const NAV_INVENTARIO = [
  { to: '/inventario',           label: 'Repuestos',          icon: Package,   exact: true },
  { to: '/inventario/servicios', label: 'Servicios propios',  icon: Wrench,    exact: true },
  { to: '/inventario/terceros',  label: 'Servicios terceros', icon: Building2, exact: true },
];

const NAV_FINANZAS = [{ to: '/pagos', label: 'Pagos', icon: CreditCard }];
const NAV_ADMIN = [
  { to: '/configuracion/usuarios',  label: 'Usuarios',  icon: Users    },
  { to: '/configuracion/auditoria', label: 'Auditoría', icon: Activity },
];

function NavItem({ to, label, Icon, exact, colapsado, esMovil, onCerrar }) {
  return (
    <NavLink
      to={to}
      end={exact}
      title={colapsado ? label : undefined}
      onClick={() => { if (esMovil && onCerrar) onCerrar(); }}
      className={({ isActive }) =>
        ['nav-item', isActive ? 'nav-item--active' : '', colapsado ? 'nav-item--collapsed' : '']
          .filter(Boolean).join(' ')
      }
    >
      <Icon size={17} style={{ flexShrink: 0 }} />
      {!colapsado && <span>{label}</span>}
    </NavLink>
  );
}

export default function Sidebar({ colapsado, esMovil, abierto, onCerrar }) {
  const { user } = useAuthStore();
  const esAdmin  = user?.rol?.nombre === 'ADMINISTRADOR';

  const section = (label, items) => (
    <>
      {!colapsado
        ? <div style={S.sectionLabel}>{label}</div>
        : <div style={S.sectionDivider} />
      }
      {items.map(({ to, label, icon: Icon, exact }) => (
        <NavItem
          key={to} to={to} label={label} Icon={Icon}
          exact={exact ?? to === '/dashboard'}
          colapsado={colapsado} esMovil={esMovil} onCerrar={onCerrar}
        />
      ))}
    </>
  );

  const [logoSrc, setLogoSrc] = useState('');

  useEffect(() => {
    fetch('/logo_pdf.png')
      .then(r => r.blob())
      .then(blob => new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      }))
      .then(setLogoSrc)
      .catch(() => {});
  }, []);

  return (
    <>
      <style>{CSS}</style>

      {esMovil && abierto && (
        <div onClick={onCerrar}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 99 }} />
      )}

      <aside style={{
        ...S.aside,
        width: colapsado ? 64 : 224,
        transform: esMovil ? (abierto ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
      }}>

        <div style={{ ...S.header, justifyContent: colapsado ? 'center' : 'flex-start' }}>
        <div style={{ ...S.logoWrap, background: logoSrc ? '#fff' : '#EFF6FF', overflow: 'hidden' }}>
          {logoSrc
            ? <img src={logoSrc} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }} />
            : <Wrench size={17} color="#2563EB" />
          }
        </div>
        {!colapsado && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.brandName}>Automotriz CyC</div>
            <div style={S.brandSub}>Gestión de taller</div>
          </div>
        )}
      </div>

        <nav style={S.nav}>
          {section('Operaciones', NAV_OPERACIONES)}
          {section('Clientes',    NAV_CLIENTES)}
          {section('Personal',    NAV_PERSONAL)}
          {section('Inventario',  NAV_INVENTARIO)}
          {section('Finanzas',    NAV_FINANZAS)}
          {esAdmin && section('Administración', NAV_ADMIN)}
        </nav>

        {!colapsado && (
          <div style={{ padding: '10px 16px 14px', borderTop: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: 9, color: '#CBD5E1', textAlign: 'center' }}>
              Automotriz CyC v1.0.0
            </div>
          </div>
        )}

      </aside>
    </>
  );
}