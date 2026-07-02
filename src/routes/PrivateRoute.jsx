import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

export default function PrivateRoute() {
  const { token, user } = useAuthStore();
  const location = useLocation();

  if (!token) return <Navigate to="/login" replace />;

  const esMecanico = user?.rol?.nombre === 'MECANICO';
  const rutaPermitida = location.pathname.startsWith('/ordenes');

  if (esMecanico && !rutaPermitida) {
    return <Navigate to="/ordenes" replace />;
  }

  return <Outlet />;
}