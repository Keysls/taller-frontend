import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Edit, X, Loader2, CheckCircle2,
  Eye, EyeOff, ShieldCheck, KeyRound, ShieldOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import { useAuthStore } from '../../store/authStore.js';


// ─── API ─────────────────────────────────────────────────────────
const usuariosApi = {
  getAll:          ()         => api.get('/usuarios').then(r => r.data.data),
  create:          (data)     => api.post('/usuarios', data).then(r => r.data.data),
  update:          (id, data) => api.put(`/usuarios/${id}`, data).then(r => r.data.data),
  toggleActivo:    (id, v)    => api.patch(`/usuarios/${id}/activo`, { activo: v }).then(r => r.data.data),
  cambiarPassword: (id, pass) => api.patch(`/usuarios/${id}/password`, { password: pass }).then(r => r.data),
};
const rolesApi = { getAll: () => api.get('/roles').then(r => r.data.data) };

// ─── Helpers ──────────────────────────────────────────────────────
const ROL_CFG = {
  ADMINISTRADOR: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  SUPERVISOR:    { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  MECANICO:      { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  RECEPCION:     { bg: '#FDF4FF', color: '#7E22CE', border: '#E9D5FF' },
};

const formatFecha = (f) =>
  f ? new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Estilos reutilizables ────────────────────────────────────────
const overlayStyle = {
  position: 'fixed', inset: 0, zIndex: 200,
  background: 'rgba(15,23,42,0.35)',
  backdropFilter: 'blur(2px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
};
const cardStyle = {
  background: '#fff', borderRadius: 20, width: '100%',
  boxShadow: '0 20px 60px rgba(30,58,138,0.15)',
  border: '1px solid #E2ECF4', overflow: 'hidden',
  display: 'flex', flexDirection: 'column', maxHeight: '92vh',
};
const mHeaderStyle = {
  padding: '18px 20px', borderBottom: '1px solid #F1F5F9',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0,
};
const mBodyStyle   = { padding: '18px 20px', overflowY: 'auto', flex: 1 };
const mFooterStyle = {
  padding: '14px 20px', borderTop: '1px solid #F1F5F9',
  display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0,
};
const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 10,
  border: '1px solid #C8DAEA', background: '#F4F8FC',
  fontSize: 13, color: '#0D1B2A', outline: 'none', boxSizing: 'border-box',
};
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#4A6A8A',
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em',
};
const fg = { marginBottom: 14 };
const btnPrimary = {
  flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
  background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
};
const btnCancel = {
  flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
  background: '#F1F5F9', color: '#64748B', fontSize: 13, fontWeight: 500,
  border: 'none',
};
const btnAmber = { ...btnPrimary, background: '#F59E0B' };

// CSS global: responsive + hover botones de acción
const CSS = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  .usr-table-wrap { overflow-x: auto; }
  .usr-table { width: 100%; border-collapse: collapse; min-width: 600px; }

  .act-btn {
    width: 30px; height: 30px; border-radius: 8px;
    border: 1px solid #E2ECF4; background: #fff;
    cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
    color: #64748B; transition: background .15s, color .15s, border-color .15s;
    flex-shrink: 0;
  }
  .act-btn:hover:not(:disabled) { background: #EFF6FF; color: #2563EB; border-color: #BFDBFE; }
  .act-btn.amber:hover:not(:disabled) { background: #FFF7ED; color: #C2410C; border-color: #FED7AA; }
  .act-btn.danger:hover:not(:disabled) { background: #FEF2F2; color: #DC2626; border-color: #FECACA; }
  .act-btn.success:hover:not(:disabled) { background: #F0FDF4; color: #15803D; border-color: #BBF7D0; }
  .act-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .row-hover:hover { background: #FAFBFF !important; }

  /* Modal: ancho máximo responsivo */
  .modal-sm { max-width: 400px; }
  .modal-md { max-width: 460px; }

  /* Tarjetas móvil — visibles solo en pantallas pequeñas */
  .mobile-cards { display: none; }
  .desktop-table { display: block; }

  @media (max-width: 640px) {
    .page-header { flex-direction: column; align-items: flex-start !important; gap: 12px; }
    .page-header h2 { font-size: 16px !important; }
    .btn-nuevo { width: 100%; justify-content: center; }

    .desktop-table { display: none; }
    .mobile-cards  { display: flex; flex-direction: column; gap: 10px; padding: 12px; }

    .mobile-card {
      background: #fff; border: 1px solid #F1F5F9;
      border-radius: 14px; padding: 14px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .mobile-card-top {
      display: flex; align-items: center; gap: 10px;
    }
    .mobile-card-meta {
      display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
    }
    .mobile-card-actions {
      display: flex; gap: 6px; margin-top: 2px;
    }

    .modal-sm, .modal-md { max-width: 100%; border-radius: 16px; }
    .roles-grid { grid-template-columns: 1fr 1fr !important; }
  }
`;

// ─── Modal Crear / Editar ─────────────────────────────────────────
// Recibe `yo` y `updateUser` para sincronizar el store si el usuario se edita a sí mismo
function ModalUsuario({ usuario, roles, onClose, onSaved, yo, updateUser }) {
  const editando = !!usuario;
  const [form, setForm] = useState({
    nombre:   usuario?.nombre  || '',
    email:    usuario?.email   || '',
    rolId:    usuario?.rolId   || '',
    activo:   usuario?.activo  ?? true,
    password: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (editando) {
        const { password, ...rest } = form;
        const updated = await usuariosApi.update(usuario.id, rest);
        toast.success('Usuario actualizado');
        // Si el usuario editado es el mismo que está logueado, sincroniza el store
        // para que el Topbar refleje el cambio de nombre/email/rol de inmediato
        if (yo?.id === usuario.id) {
          updateUser(updated);
        }
      } else {
        if (!form.password || form.password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres');
          setLoading(false); return;
        }
        await usuariosApi.create(form);
        toast.success('Usuario creado');
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally { setLoading(false); }
  };

  return (
    <div style={overlayStyle}>
      <div style={cardStyle} className="modal-md">
        <div style={mHeaderStyle}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0D1B2A', margin: 0 }}>
              {editando ? 'Editar usuario' : 'Nuevo usuario'}
            </h2>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>
              {editando ? `Editando: ${usuario.nombre}` : 'Completa los datos de la nueva cuenta'}
            </p>
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={mBodyStyle}>
            {error && (
              <div style={{ fontSize: 12, color: '#DC2626', padding: '9px 12px', background: 'rgba(220,38,38,0.07)', borderRadius: 8, borderLeft: '3px solid #DC2626', marginBottom: 14 }}>
                {error}
              </div>
            )}

            <div style={fg}>
              <label style={labelStyle}>Nombre completo</label>
              <input style={inputStyle} value={form.nombre}
                onChange={e => set('nombre', e.target.value)} required placeholder="ej: Juan Pérez"
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e  => e.target.style.borderColor = '#C8DAEA'} />
            </div>

            <div style={fg}>
              <label style={labelStyle}>Correo electrónico</label>
              <input style={inputStyle} type="email" value={form.email}
                onChange={e => set('email', e.target.value)} required placeholder="ej: juan@taller.com"
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e  => e.target.style.borderColor = '#C8DAEA'} />
            </div>

            <div style={fg}>
              <label style={labelStyle}>Rol</label>
              <div className="roles-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {roles?.map(r => {
                  const cfg = ROL_CFG[r.nombre] || { bg: '#F1F5F9', color: '#64748B', border: '#E2ECF4' };
                  const sel = form.rolId === r.id;
                  return (
                    <button key={r.id} type="button" onClick={() => set('rolId', r.id)}
                      style={{
                        padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', transition: 'all .15s', textAlign: 'left',
                        background: sel ? cfg.bg   : '#F8FAFC',
                        color:      sel ? cfg.color : '#94A3B8',
                        border:     `1.5px solid ${sel ? cfg.border : '#E2ECF4'}`,
                      }}>
                      {r.nombre}
                    </button>
                  );
                })}
              </div>
            </div>

            {!editando && (
              <div style={fg}>
                <label style={labelStyle}>Contraseña inicial</label>
                <div style={{ position: 'relative' }}>
                  <input style={{ ...inputStyle, paddingRight: 40 }}
                    type={showPass ? 'text' : 'password'}
                    value={form.password} onChange={e => set('password', e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    onFocus={e => e.target.style.borderColor = '#2563EB'}
                    onBlur={e  => e.target.style.borderColor = '#C8DAEA'} />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8AAABB' }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}

            {editando && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #F1F5F9' }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', margin: 0 }}>Cuenta activa</p>
                  <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>El usuario puede iniciar sesión</p>
                </div>
                <button type="button" onClick={() => set('activo', !form.activo)}
                  style={{ position: 'relative', width: 36, height: 20, borderRadius: 99, border: 'none', cursor: 'pointer', background: form.activo ? '#2563EB' : '#CBD5E1', transition: 'background .2s', flexShrink: 0 }}>
                  <span style={{
                    position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%',
                    background: '#fff', transition: 'left .2s',
                    left: form.activo ? 18 : 2,
                  }} />
                </button>
              </div>
            )}
          </div>

          <div style={mFooterStyle}>
            <button type="button" style={btnCancel} onClick={onClose}>Cancelar</button>
            <button type="submit" style={btnPrimary} disabled={loading}>
              {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              {loading ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Cambiar Contraseña ─────────────────────────────────────
function ModalPassword({ usuario, onClose, onSaved }) {
  const [pass,     setPass]     = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [ok,       setOk]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pass.length < 6) { setError('Mínimo 6 caracteres'); return; }
    setLoading(true); setError('');
    try {
      await usuariosApi.cambiarPassword(usuario.id, pass);
      setOk(true);
    } catch { setError('Error al cambiar la contraseña'); }
    finally { setLoading(false); }
  };

  return (
    <div style={overlayStyle}>
      <div style={cardStyle} className="modal-sm">
        <div style={mHeaderStyle}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0D1B2A', margin: 0 }}>
              Restablecer contraseña
            </h2>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 3, fontFamily: 'monospace' }}>
              {usuario.nombre}
            </p>
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={mBodyStyle}>
          {ok ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={26} color="#15803D" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0D1B2A', margin: 0 }}>Contraseña restablecida</p>
              <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', margin: 0 }}>
                El usuario deberá usar la nueva contraseña en su próximo inicio de sesión.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ fontSize: 12, color: '#DC2626', padding: '9px 12px', background: 'rgba(220,38,38,0.07)', borderRadius: 8, borderLeft: '3px solid #DC2626', marginBottom: 14 }}>
                  {error}
                </div>
              )}
              <div style={fg}>
                <label style={labelStyle}>Nueva contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input style={{ ...inputStyle, paddingRight: 40 }}
                    type={showPass ? 'text' : 'password'}
                    value={pass} onChange={e => setPass(e.target.value)} required
                    placeholder="Mínimo 6 caracteres"
                    onFocus={e => e.target.style.borderColor = '#2563EB'}
                    onBlur={e  => e.target.style.borderColor = '#C8DAEA'} />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8AAABB' }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div style={mFooterStyle}>
                <button type="button" style={btnCancel} onClick={onClose}>Cancelar</button>
                <button type="submit" style={btnAmber} disabled={loading}>
                  {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                  {loading ? 'Aplicando…' : 'Restablecer'}
                </button>
              </div>
            </form>
          )}
        </div>

        {ok && (
          <div style={mFooterStyle}>
            <button style={{ ...btnCancel, flex: 'none', padding: '10px 24px' }} onClick={onClose}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────
export default function Usuarios() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const { user: yo, updateUser } = useAuthStore(); // ← updateUser del store

  const { data: usuarios = [], isLoading } = useQuery({ queryKey: ['usuarios'], queryFn: usuariosApi.getAll });
  const { data: roles    = [] }            = useQuery({ queryKey: ['roles'],    queryFn: rolesApi.getAll });

  const onSaved = () => { qc.invalidateQueries(['usuarios']); setModal(null); };

  const handleToggle = async (u) => {
    try {
      await usuariosApi.toggleActivo(u.id, !u.activo);
      qc.invalidateQueries(['usuarios']);
      toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado');
    } catch { toast.error('Error al cambiar estado'); }
  };

  return (
    <div>
      <style>{CSS}</style>

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0D1B2A', margin: 0 }}>Usuarios</h2>
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{usuarios.length} usuarios registrados</p>
        </div>
        <button
          className="btn-nuevo"
          onClick={() => setModal({ tipo: 'usuario' })}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600 }}
          onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'}
          onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}>
          <Plus size={15} /> Nuevo usuario
        </button>
      </div>

      {/* Contenedor tabla/tarjetas */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64, color: '#94A3B8', gap: 8 }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Cargando usuarios…
          </div>
        ) : (
          <>
            {/* ── Tabla desktop ── */}
            <div className="desktop-table usr-table-wrap">
              <table className="usr-table">
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                    {['Usuario', 'Email', 'Rol', 'Estado', 'Registrado', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(u => {
                    const cfg = ROL_CFG[u.rol?.nombre] || { bg: '#F1F5F9', color: '#64748B', border: '#E2ECF4' };
                    return (
                      <tr key={u.id} className="row-hover"
                        style={{ borderBottom: '1px solid #F8FAFC', opacity: u.activo ? 1 : 0.5 }}>

                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                              {u.nombre?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0D1B2A' }}>{u.nombre}</div>
                          </div>
                        </td>

                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748B' }}>{u.email}</td>

                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap' }}>
                            <ShieldCheck size={10} />{u.rol?.nombre}
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: u.activo ? '#F0FDF4' : '#FEF2F2', color: u.activo ? '#15803D' : '#DC2626', whiteSpace: 'nowrap' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px', fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{formatFecha(u.creadoEn)}</td>

                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button title="Editar" className="act-btn"
                              onClick={() => setModal({ tipo: 'usuario', data: u })}>
                              <Edit size={13} />
                            </button>
                            <button title="Cambiar contraseña" className="act-btn amber"
                              onClick={() => setModal({ tipo: 'password', data: u })}>
                              <KeyRound size={13} />
                            </button>
                            <button
                              title={u.activo ? 'Desactivar' : 'Activar'}
                              className={`act-btn ${u.activo ? 'danger' : 'success'}`}
                              onClick={() => handleToggle(u)}
                              disabled={u.id === yo?.id}>
                              {u.activo ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!usuarios.length && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#94A3B8', fontSize: 13 }}>No hay usuarios registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Tarjetas móvil ── */}
            <div className="mobile-cards">
              {!usuarios.length && (
                <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, padding: '32px 0' }}>No hay usuarios registrados</p>
              )}
              {usuarios.map(u => {
                const cfg = ROL_CFG[u.rol?.nombre] || { bg: '#F1F5F9', color: '#64748B', border: '#E2ECF4' };
                return (
                  <div key={u.id} className="mobile-card" style={{ opacity: u.activo ? 1 : 0.55 }}>
                    <div className="mobile-card-top">
                      <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                        {u.nombre?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0D1B2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nombre}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                      </div>
                    </div>

                    <div className="mobile-card-meta">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                        <ShieldCheck size={10} />{u.rol?.nombre}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: u.activo ? '#F0FDF4' : '#FEF2F2', color: u.activo ? '#15803D' : '#DC2626' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>{formatFecha(u.creadoEn)}</span>
                    </div>

                    <div className="mobile-card-actions">
                      <button title="Editar" className="act-btn"
                        onClick={() => setModal({ tipo: 'usuario', data: u })}>
                        <Edit size={13} />
                      </button>
                      <button title="Cambiar contraseña" className="act-btn amber"
                        onClick={() => setModal({ tipo: 'password', data: u })}>
                        <KeyRound size={13} />
                      </button>
                      <button
                        title={u.activo ? 'Desactivar' : 'Activar'}
                        className={`act-btn ${u.activo ? 'danger' : 'success'}`}
                        onClick={() => handleToggle(u)}
                        disabled={u.id === yo?.id}>
                        {u.activo ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modales */}
      {modal?.tipo === 'usuario' && (
        <ModalUsuario
          usuario={modal.data || null}
          roles={roles}
          onClose={() => setModal(null)}
          onSaved={onSaved}
          yo={yo}                // ← usuario logueado
          updateUser={updateUser} // ← acción del store
        />
      )}
      {modal?.tipo === 'password' && (
        <ModalPassword usuario={modal.data} onClose={() => setModal(null)} onSaved={onSaved} />
      )}
    </div>
  );
}