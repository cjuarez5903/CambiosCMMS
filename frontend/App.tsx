import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NotificationsProvider } from './src/context/NotificationsContext';
import ProtectedRoute from './src/components/ProtectedRoute';
import PermissionRoute from './src/components/PermissionRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import WorkOrders from './pages/WorkOrders';
import Assets from './pages/Assets';
import Inspections from './pages/Inspections';
import Branches from './pages/Branches';
import Vendors from './pages/Vendors';
import Users from './pages/Users';
import Countries from './pages/Countries';
import Settings from './pages/Settings';
import CapexDashboard from './pages/CapexDashboard';
import ITSoluciones from './pages/ITSoluciones';
import ITDashboard from './pages/ITDashboard';
import ITAssignedTickets from './pages/ITAssignedTickets';
import Login from './pages/Login';

// Component to conditionally render default dashboard
const DefaultDashboard: React.FC = () => {
  const { user } = useAuth();
  const isIT = user?.rol?.permisos?.rutas?.includes('it_dashboard') && user?.rol?.nombre === 'Técnico IT';
  
  if (isIT) {
    return <ITDashboard />;
  }
  
  return <Dashboard />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <HashRouter>
          <Routes>
          {/* Ruta pública de login */}
          <Route path="/login" element={<Login />} />

          {/* Rutas protegidas */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard - accesible para todos los usuarios autenticados */}
            <Route index element={<DefaultDashboard />} />

            {/* IT Dashboard - solo para usuarios con rol IT */}
            <Route
              path="it-dashboard"
              element={
                <PermissionRoute requiredPermission="it_soluciones">
                  <ITDashboard />
                </PermissionRoute>
              }
            />

            {/* Órdenes de Trabajo - requiere permiso */}
            <Route
              path="work-orders"
              element={
                <PermissionRoute requiredPermission="ordenes_trabajo">
                  <WorkOrders />
                </PermissionRoute>
              }
            />

            {/* Sucursales - requiere permiso */}
            <Route
              path="branches"
              element={
                <PermissionRoute requiredPermission="sucursales">
                  <Branches />
                </PermissionRoute>
              }
            />

            {/* Activos - requiere permiso */}
            <Route
              path="assets"
              element={
                <PermissionRoute requiredPermission="activos">
                  <Assets />
                </PermissionRoute>
              }
            />

            {/* Inspecciones - requiere permiso */}
            <Route
              path="inspections"
              element={
                <PermissionRoute requiredPermission="inspecciones">
                  <Inspections />
                </PermissionRoute>
              }
            />

            {/* Proveedores - requiere permiso */}
            <Route
              path="vendors"
              element={
                <PermissionRoute requiredPermission="proveedores">
                  <Vendors />
                </PermissionRoute>
              }
            />

            {/* Usuarios - requiere permiso */}
            <Route
              path="users"
              element={
                <PermissionRoute requiredPermission="usuarios">
                  <Users />
                </PermissionRoute>
              }
            />

            {/* Países - requiere permiso */}
            <Route
              path="countries"
              element={
                <PermissionRoute requiredPermission="paises">
                  <Countries />
                </PermissionRoute>
              }
            />

            {/* CAPEX - requiere permiso */}
            <Route
              path="capex"
              element={
                <PermissionRoute requiredPermission="capex">
                  <CapexDashboard />
                </PermissionRoute>
              }
            />

            {/* IT Soluciones - requiere permiso */}
            <Route
              path="it-soluciones"
              element={
                <PermissionRoute requiredPermission="it_soluciones">
                  <ITSoluciones />
                </PermissionRoute>
              }
            />

            {/* Mis Tickets Asignados - solo para usuarios IT */}
            <Route
              path="it-assigned-tickets"
              element={
                <PermissionRoute requiredPermission="it_soluciones">
                  <ITAssignedTickets />
                </PermissionRoute>
              }
            />

            {/* Configuración - accesible para todos */}
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Redirigir cualquier ruta no encontrada */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </NotificationsProvider>
    </AuthProvider>
  );
};

export default App;
