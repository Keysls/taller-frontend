import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

const SIDEBAR_EXPANDIDO = 224;
const SIDEBAR_COLAPSADO  = 64;
const BREAKPOINT_MOVIL   = 768;

export default function Layout() {
  const [colapsado,   setColapsado]   = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [esMovil,     setEsMovil]     = useState(() => window.innerWidth <= BREAKPOINT_MOVIL);

  useEffect(() => {
    const fn = () => {
      const movil = window.innerWidth <= BREAKPOINT_MOVIL;
      setEsMovil(movil);
      if (!movil) setMenuAbierto(false);
    };
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const anchoSidebar = esMovil ? 0 : colapsado ? SIDEBAR_COLAPSADO : SIDEBAR_EXPANDIDO;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F4F8FC' }}>

      <Sidebar
        colapsado={!esMovil && colapsado}
        esMovil={esMovil}
        abierto={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        ancho={esMovil ? SIDEBAR_EXPANDIDO : anchoSidebar}
      />

      {esMovil && menuAbierto && (
        <div
          onClick={() => setMenuAbierto(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 89 }}
        />
      )}

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        marginLeft: anchoSidebar,
        transition: 'margin-left .2s ease',
        minWidth: 0,
      }}>
        <Topbar
          colapsado={colapsado}
          anchoSidebar={anchoSidebar}
          esMovil={esMovil}
          onColapsarToggle={() => setColapsado(v => !v)}
          onMenuToggle={() => setMenuAbierto(v => !v)}
        />
        <main style={{ flex: 1, overflowY: 'auto', padding: 24, marginTop: 56 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}