import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Wrench } from 'lucide-react';
import { login } from '../services/auth.service.js';
import { useAuthStore } from '../store/authStore.js';

export default function Login() {
  const navigate   = useNavigate();
  const loginStore = useAuthStore(s => s.login);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // Ref para que el error sobreviva el doble-montaje de StrictMode
  const errorRef = useRef('');

  const showError = useCallback((msg) => {
    errorRef.current = msg;
    setError(msg);
  }, []);

  const clearError = useCallback(() => {
    errorRef.current = '';
    setError('');
  }, []);

  const handleEmailChange    = (e) => { setEmail(e.target.value);    if (errorRef.current) clearError(); };
  const handlePasswordChange = (e) => { setPassword(e.target.value); if (errorRef.current) clearError(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login({ email: email.trim().toLowerCase(), password });
      loginStore(data);
      navigate('/dashboard');
    } catch {
      showError('Correo o contraseña incorrectos');
      setLoading(false);
    }
  };

  const inputBase = {
    width: '100%', borderRadius: 10,
    fontSize: 13, color: '#0D1B2A', outline: 'none',
    transition: 'border-color .15s, background .15s', boxSizing: 'border-box',
  };
  const inp  = { ...inputBase, padding: '10px 14px',          border: `1px solid ${error ? '#FECACA' : '#C8DAEA'}`, background: error ? '#FFF5F5' : '#F4F8FC' };
  const inpP = { ...inputBase, padding: '10px 40px 10px 14px', border: `1px solid ${error ? '#FECACA' : '#C8DAEA'}`, background: error ? '#FFF5F5' : '#F4F8FC' };

  return (
    <div style={{
      minHeight: '100vh', background: '#F4F8FC',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, marginBottom: 14,
            background: '#fff', border: '1px solid #C8DAEA',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(30,58,138,0.1)',
          }}>
            <Wrench size={28} color="#1E3A8A" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0D1B2A', margin: 0 }}>Automotriz C&C</h1>
          <p style={{ fontSize: 12, color: '#5A7A9A', marginTop: 4 }}>Sistema de gestión de taller</p>
        </div>

        {/* Card */}
        <div style={{
          background: '#FFFFFF', borderRadius: 20,
          border: '1px solid #E2ECF4', padding: 28,
          boxShadow: '0 8px 32px rgba(30,58,138,0.08)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0D1B2A', margin: '0 0 4px' }}>Iniciar sesión</h2>
          <p style={{ fontSize: 12, color: '#8AAABB', margin: '0 0 24px' }}>Acceso para personal autorizado</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4A6A8A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Correo electrónico
              </label>
              <input
                type="email" value={email} onChange={handleEmailChange}
                placeholder="admin@taller.com" autoComplete="email" required
                style={inp}
                onFocus={e => e.target.style.borderColor = error ? '#F87171' : '#1E3A8A'}
                onBlur={e  => e.target.style.borderColor = error ? '#FECACA' : '#C8DAEA'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4A6A8A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} value={password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••" autoComplete="current-password" required
                  style={inpP}
                  onFocus={e => e.target.style.borderColor = error ? '#F87171' : '#1E3A8A'}
                  onBlur={e  => e.target.style.borderColor = error ? '#FECACA' : '#C8DAEA'}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8AAABB', padding: 0 }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                fontSize: 12, color: '#DC2626', padding: '10px 14px',
                background: 'rgba(220,38,38,0.07)', borderRadius: 8,
                border: '1px solid rgba(220,38,38,0.2)',
                borderLeft: '3px solid #DC2626',
              }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: 10,
                background: loading ? '#93AECB' : '#1E3A8A',
                color: '#fff', fontSize: 14, fontWeight: 700,
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background .15s',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#162d6e'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#1E3A8A'; }}>
              {loading
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Verificando…</>
                : 'Ingresar'
              }
            </button>

          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#8AAABB', marginTop: 20 }}>
          Automotriz CyC · Sistema de gestión
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}