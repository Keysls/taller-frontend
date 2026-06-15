import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, PanelLeft, Bell, BellOff, Menu, Check, CheckCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';

const TITULOS = {
  '/dashboard':  'Dashboard',
  '/clientes':   'Clientes',
  '/vehiculos':  'Vehículos',
  '/mecanicos':  'Mecánicos',
  '/ordenes':    'Órdenes de trabajo',
  '/inventario': 'Inventario',
  '/pagos':      'Pagos',
  '/cotizaciones': 'Cotizaciones',
  '/configuracion/usuarios': 'Usuarios',
  '/configuracion/auditoria': 'Auditoría',
};

function tituloDeRuta(pathname) {
  if (TITULOS[pathname]) return TITULOS[pathname];
  const match = Object.keys(TITULOS).find(r => pathname.startsWith(r) && r !== '/');
  return match ? TITULOS[match] : 'TallerERP';
}

const ROL_CFG = {
  ADMINISTRADOR: { label: 'Administrador', color: '#DC2626' },
  SUPERVISOR:    { label: 'Supervisor',    color: '#1E3A8A' },
  MECANICO:      { label: 'Mecánico',      color: '#059669' },
  RECEPCION:     { label: 'Recepción',     color: '#D97706' },
};

const NOTIS_MOCK = [];

export default function Topbar({ colapsado, anchoSidebar, onColapsarToggle, esMovil, onMenuToggle }) {
  const { user, logout } = useAuthStore();
  const loc      = useLocation();
  const navigate = useNavigate();

  const [showMenu,  setShowMenu]  = useState(false);
  const [showNotis, setShowNotis] = useState(false);
  const [notis,     setNotis]     = useState(NOTIS_MOCK);

  const titulo    = tituloDeRuta(loc.pathname);
  const iniciales = `${user?.nombre?.[0] || ''}`.toUpperCase();
  const rolCfg    = ROL_CFG[user?.rol?.nombre] || { label: user?.rol?.nombre || '', color: '#5A7A9A' };
  const sinLeer   = notis.length;

  const cerrarTodo  = () => { setShowMenu(false); setShowNotis(false); };
  const marcarTodas = () => setNotis([]);
  const marcarUna   = (id) => setNotis(prev => prev.filter(n => n.id !== id));

  return (
    <header style={{
      position: 'fixed', top: 0, right: 0,
      left: esMovil ? 0 : anchoSidebar,
      height: 56,
      background: '#FFFFFF',
      borderBottom: '1px solid #E2ECF4',
      display: 'flex', alignItems: 'center',
      padding: '0 12px', gap: 8,
      zIndex: 90,
      transition: 'left .2s ease',
      boxSizing: 'border-box',
    }}>

      {/* Hamburguesa móvil */}
      {esMovil && (
        <button onClick={onMenuToggle} style={btnIcon}>
          <Menu size={20} />
        </button>
      )}

      {/* Colapsar sidebar — desktop */}
      {!esMovil && (
        <button onClick={onColapsarToggle} title={colapsado ? 'Expandir' : 'Colapsar'} style={btnIcon}>
          <PanelLeft size={19} />
        </button>
      )}

      {/* Título */}
      <h1 style={{
        fontSize: esMovil ? 14 : 15,
        fontWeight: 800, color: '#0D1B2A',
        margin: 0, flex: 1, minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {titulo}
      </h1>

      {/* Lado derecho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>

        {/* Campana */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { cerrarTodo(); setShowNotis(v => !v); }}
            style={{ ...btnIcon, background: showNotis ? '#F4F8FC' : 'transparent' }}>
            <Bell size={18} />
            {sinLeer > 0 && (
              <span style={{
                position: 'absolute', top: 7, right: 8,
                width: 8, height: 8, borderRadius: '50%',
                background: '#DC2626', border: '1.5px solid #fff',
              }} />
            )}
          </button>

          {showNotis && (
            <>
              <div onClick={() => setShowNotis(false)} style={overlay} />
              <div style={{
                ...dropdownBase,
                width: esMovil ? 'calc(100vw - 24px)' : 300,
                right: esMovil ? -4 : 0,
              }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #EAF1F8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0D1B2A' }}>Notificaciones</span>
                  {sinLeer > 0 && (
                    <button onClick={marcarTodas} style={linkBtn}>
                      <CheckCheck size={12} /> Marcar todas
                    </button>
                  )}
                </div>
                {notis.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: '#8AAABB' }}>
                    <BellOff size={26} style={{ opacity: .5, margin: '0 auto 8px', display: 'block' }} />
                    <div style={{ fontSize: 12 }}>Sin notificaciones</div>
                  </div>
                ) : (
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {notis.map(n => (
                      <div key={n.id} style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '1px solid #EAF1F8', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F4F8FC'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#0D1B2A' }}>{n.titulo}</div>
                          <div style={{ fontSize: 11, color: '#5A7A9A' }}>{n.detalle}</div>
                        </div>
                        <button onClick={() => marcarUna(n.id)} style={btnIcon} title="Marcar leída">
                          <Check size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Avatar + menú usuario */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { cerrarTodo(); setShowMenu(v => !v); }}
            style={{
              display: 'flex', alignItems: 'center',
              gap: esMovil ? 0 : 8,
              padding: esMovil ? '4px' : '5px 6px',
              borderRadius: 10,
              background: showMenu ? '#F4F8FC' : 'transparent',
              border: `1px solid ${showMenu ? '#E2ECF4' : 'transparent'}`,
              cursor: 'pointer', transition: 'all .15s',
            }}>
            {/* Avatar siempre visible */}
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: rolCfg.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: '#fff',
            }}>
              {iniciales || '?'}
            </div>
            {/* Nombre + rol solo en desktop */}
            {!esMovil && (
              <>
                <div style={{ textAlign: 'left', lineHeight: 1.3 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0D1B2A', whiteSpace: 'nowrap' }}>
                    {user?.nombre}
                  </div>
                  <div style={{ fontSize: 10, color: rolCfg.color, fontWeight: 600 }}>
                    {rolCfg.label}
                  </div>
                </div>
                <ChevronDown size={14} color="#8AAABB"
                  style={{ transition: 'transform .15s', transform: showMenu ? 'rotate(180deg)' : 'none' }} />
              </>
            )}
          </button>

          {showMenu && (
            <>
              <div onClick={() => setShowMenu(false)} style={overlay} />
              <div style={{
                ...dropdownBase,
                width: esMovil ? 200 : 220,
                right: 0,
              }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #EAF1F8' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0D1B2A' }}>{user?.nombre}</div>
                  <div style={{ fontSize: 11, color: '#8AAABB', marginTop: 2 }}>{user?.email}</div>
                  <span style={{
                    display: 'inline-block', marginTop: 6,
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: rolCfg.color + '1a', color: rolCfg.color,
                  }}>
                    {rolCfg.label}
                  </span>
                </div>
                <div style={{ padding: 6 }}>
                  <button
                    onClick={() => { setShowMenu(false); logout(); navigate('/login'); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                      padding: '8px 10px', borderRadius: 8,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: '#DC2626',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <LogOut size={15} /> Cerrar sesión
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  );
}

// ── Estilos reutilizables ─────────────────────────────────────────
const btnIcon = {
  position: 'relative',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 36, height: 36, borderRadius: 8,
  background: 'transparent', border: 'none', cursor: 'pointer', color: '#5A7A9A',
  flexShrink: 0,
};

const overlay = {
  position: 'fixed', inset: 0, zIndex: 40,
};

const dropdownBase = {
  position: 'absolute', top: 'calc(100% + 8px)',
  background: '#FFFFFF',
  border: '1px solid #E2ECF4', borderRadius: 12,
  boxShadow: '0 8px 24px rgba(30,58,138,0.12)',
  overflow: 'hidden', zIndex: 50,
};

const linkBtn = {
  display: 'flex', alignItems: 'center', gap: 4,
  padding: '4px 8px', borderRadius: 6,
  background: 'transparent', border: 'none', cursor: 'pointer',
  fontSize: 11, color: '#1E3A8A', fontWeight: 600,
};