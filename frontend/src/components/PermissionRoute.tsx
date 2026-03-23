import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface PermissionRouteProps {
  children: React.ReactNode;
  requiredPermission: string; // Nombre de la ruta requerida en permisos
}

const PermissionRoute = ({ children, requiredPermission }: PermissionRouteProps) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mrb-orange mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Verificar si el usuario tiene el permiso requerido
  const rutasPermitidas = user?.permisos?.rutas || [];
  const isAdmin = user?.permisos?.todo === true;
  const tienePermiso = isAdmin || rutasPermitidas.includes(requiredPermission) || (requiredPermission === 'admin' && isAdmin);

  if (!tienePermiso) {
    // Redirigir a la primera ruta disponible con mensaje de error
    // Priorizar IT Soluciones para todos los usuarios, luego dashboard
    let rutaRedireccion = '/';
    
    // Si intenta acceder a it_soluciones pero no tiene permiso, redirigir al dashboard
    if (requiredPermission === 'it_soluciones') {
      rutaRedireccion = '/';
    } 
    // Si tiene acceso a it_soluciones, redirigir allí
    else if (rutasPermitidas.includes('it_soluciones')) {
      rutaRedireccion = '/it-soluciones';
    }
    // Si tiene acceso a órdenes de trabajo, redirigir allí
    else if (rutasPermitidas.includes('ordenes_trabajo')) {
      rutaRedireccion = '/work-orders';
    }

    return (
      <Navigate
        to={rutaRedireccion}
        replace
        state={{
          error: 'No tienes permisos para acceder a esta página'
        }}
      />
    );
  }

  return <>{children}</>;
};

export default PermissionRoute;
