import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Package, Users, Settings, LogOut, Building, X, UserCog, Globe, DollarSign, Monitor, UserCheck, Droplets } from 'lucide-react';
import { useAuth } from '../src/context/AuthContext';
import ConfirmModal from './ConfirmModal';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Definir todas las rutas disponibles con sus iconos y nombres
  const rutasDisponibles: Record<string, { name: string; icon: any; path: string }> = {
    dashboard: { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    it_dashboard: { name: 'IT Dashboard', icon: Monitor, path: '/it-dashboard' },
    it_soluciones: { name: 'IT Soluciones', icon: Monitor, path: '/it-soluciones' },
    it_assigned_tickets: { name: 'Mis Tickets Asignados', icon: UserCheck, path: '/it-assigned-tickets' },
    tickets: { name: 'Tickets', icon: Monitor, path: '/tickets' },
    ordenes_trabajo: { name: 'Órdenes de Trabajo', icon: ClipboardList, path: '/work-orders' },
    sucursales: { name: 'Sucursales', icon: Building, path: '/branches' },
    activos: { name: 'Activos', icon: Package, path: '/assets' },
    proveedores: { name: 'Proveedores', icon: Users, path: '/vendors' },
    usuarios: { name: 'Usuarios', icon: UserCog, path: '/users' },
    paises: { name: 'Países', icon: Globe, path: '/countries' },
    capex: { name: 'CAPEX', icon: DollarSign, path: '/capex' },
    planta_tratamiento: { name: 'Planta de Tratamiento', icon: Droplets, path: '/planta-tratamiento' },
  };

  // Obtener rutas permitidas desde los permisos del usuario
  const rutasPermitidas = user?.rol?.permisos?.rutas || user?.permisos?.rutas || [];

  // Mostrar "IT Soluciones" solo si user.permisos.rutas.includes('it_soluciones') || user.permisos.todo
  const hasITSoluciones = user?.rol?.permisos?.rutas?.includes('it_soluciones') || user?.permisos?.todo || user?.rol?.permisos?.todo;
  
  // Para Admin, mostrar "Tickets" en lugar de "IT Soluciones"
  const isAdmin = user?.permisos?.todo === true || user?.rol?.permisos?.todo === true || user?.rol?.nombre === 'Administrador IT';
  
  // Debug visible en consola
  console.log('🔍 Sidebar Debug:', {
    userEmail: user?.email,
    rolNombre: user?.rol?.nombre,
    rolId: user?.rol?.id,
    hasPermisos: !!user?.permisos,
    rolPermisos: user?.rol?.permisos,
    permisosTodo: user?.permisos?.todo,
    rolPermisosTodo: user?.rol?.permisos?.todo,
    rutasPermitidas: rutasPermitidas,
    isAdmin: isAdmin,
    hasITSoluciones: hasITSoluciones
  });
  
  // Crear rutas finales según el rol
  let rutasFinales = [...rutasPermitidas];
  
  if (isAdmin) {
    // Solo el admin ve IT Dashboard
    if (!rutasFinales.includes('it_dashboard')) {
      rutasFinales.push('it_dashboard');
    }
    // Admin ve "Tickets" en lugar de "IT Soluciones" pero usa la misma ruta
    // No modificamos las rutas, solo el nombre más adelante
    console.log('🔧 Admin rutas finales:', rutasFinales); // Debug
  } else if (hasITSoluciones && !isAdmin) {
    // Para no-admin, nunca mostrar IT Dashboard aunque exista en permisos
    rutasFinales = rutasFinales.filter(r => r !== 'it_dashboard');
    // Solo IT (no Admin) ve "IT Soluciones"
    if (!rutasFinales.includes('it_soluciones')) {
      rutasFinales.push('it_soluciones');
    }
    // Solo Técnico IT ve "Mis Tickets Asignados"
    if (user?.rol?.permisos?.rutas?.includes('it_dashboard') && !rutasFinales.includes('it_assigned_tickets')) {
      rutasFinales.push('it_assigned_tickets');
    }
    console.log('🔧 IT rutas finales:', rutasFinales); // Debug
  }

  // Para usuarios IT (no admin), reemplazar dashboard por it_dashboard
  if (user?.rol?.permisos?.rutas?.includes('it_dashboard') && rutasFinales.includes('it_dashboard') && !isAdmin) {
    rutasFinales = rutasFinales.filter(r => r !== 'dashboard');
  }

  // Para Administrador IT, excluir "Mis Tickets Asignados"
  if (user?.rol?.nombre === 'Administrador IT') {
    rutasFinales = rutasFinales.filter(r => r !== 'it_assigned_tickets');
    console.log('🚫 Administrador IT - Excluyendo Mis Tickets Asignados');
  }

  console.log('🔧 Rutas finales antes de mapear:', rutasFinales);

  // Filtrar items según permisos del usuario desde la base de datos
  const navItems = rutasFinales
    .map((ruta: string) => {
      const item = rutasDisponibles[ruta];
      if (item && ruta === 'dashboard') {
        if (isAdmin) {
          return { ...item, name: 'Dashboard (desarrollo)' };
        } else if (user?.rol?.permisos?.rutas?.includes('it_dashboard') && !isAdmin) {
          return { ...item, name: 'Dashboard (IT)' };
        }
      }
      if (item && ruta === 'it_dashboard' && user?.rol?.permisos?.rutas?.includes('it_dashboard') && !isAdmin) {
        return { ...item, name: 'Dashboard (IT)' };
      }
      return item;
    })
    .filter((item: any) => item !== undefined);
    
  console.log('🔧 NavItems:', navItems.map(item => item.name)); // Debug

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-6 bg-white border-b-2 border-mrb-blue">
          <div className="flex items-center gap-2">
            <img src="https://www.mrbstorage.com/imgs/logo.svg" alt="Mr. B Storage" className="h-8 w-auto" />
            <span className="text-lg font-bold text-mrb-blue">CMMS</span>
          </div>
          <button className="md:hidden text-gray-600 hover:text-mrb-blue" onClick={() => setIsOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-4rem)] bg-mrb-blue">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-mrb-orange text-white shadow-md'
                      : 'text-white hover:bg-white hover:bg-opacity-10 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-white border-opacity-20">
            <NavLink
              to="/settings"
              className="flex items-center px-4 py-3 text-sm font-medium text-white rounded-lg hover:bg-white hover:bg-opacity-10"
            >
              <Settings className="w-5 h-5 mr-3" />
              Configuración
            </NavLink>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-white rounded-lg hover:bg-red-500 hover:bg-opacity-80"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Logout Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Cerrar Sesión"
        message="¿Estás seguro que deseas cerrar sesión?"
        confirmText="Cerrar Sesión"
        cancelText="Cancelar"
        type="warning"
      />
    </>
  );
};

export default Sidebar;