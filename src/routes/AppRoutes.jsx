import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './PrivateRoute.jsx';
import Layout from '../components/layout/Layout.jsx';
import Login from '../pages/Login.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import ClientesList from '../pages/clientes/ClientesList.jsx';
import VehiculosList from '../pages/vehiculos/VehiculosList.jsx';
import MecanicosList from '../pages/mecanicos/MecanicosList.jsx';
import OrdenesTrabajo from '../pages/ordenes/OrdenesTrabajo.jsx';
import RepuestosList from '../pages/inventario/RepuestosList.jsx';
import Usuarios from '../pages/configuracion/Usuarios.jsx';
import ServiciosPropios  from '../pages/inventario/ServiciosPropios.jsx';
import ServiciosTerceros from '../pages/inventario/ServiciosTerceros.jsx';
import Cotizaciones from '../pages/cotizaciones/Cotizaciones.jsx';
import Pagos from '../pages/pagos/Pagos.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<PrivateRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"                element={<Dashboard />} />
          <Route path="/clientes"                 element={<ClientesList />} />
          <Route path="/vehiculos"                element={<VehiculosList />} />
          <Route path="/mecanicos"                element={<MecanicosList />} />
          <Route path="/ordenes"                  element={<OrdenesTrabajo />} />
          <Route path="/inventario"               element={<RepuestosList />} />
          <Route path="/configuracion/usuarios"   element={<Usuarios />} />
          <Route path="/inventario/servicios"     element={<ServiciosPropios />} />
          <Route path="/inventario/terceros"      element={<ServiciosTerceros />} />
          <Route path="/cotizaciones"             element={<Cotizaciones />} />
          <Route path="/pagos"                    element={<Pagos />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}