import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, Bell, UserCircle, LogOut } from 'lucide-react';
import { useAuth } from '../src/context/AuthContext';
import { useNotifications } from '../src/context/NotificationsContext';
import ConfirmModal from './ConfirmModal';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();

  const handleLogout = () => {
    setShowLogoutConfirm(true);
    setShowUserMenu(false);
  };

  const confirmLogout = () => {
    logout();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        {/* Top Header */}
        <header className="relative flex items-center justify-between h-16 px-6 bg-white shadow-sm z-10">
          <div className="flex items-center">
            <button
              className="p-1 mr-4 text-gray-500 rounded-md md:hidden hover:text-mrb-blue focus:outline-none"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2 md:hidden">
              <img src="https://www.mrbstorage.com/imgs/logo.svg" alt="Mr. B Storage" className="h-6 w-auto" />
              <h1 className="text-lg font-semibold text-gray-800">CMMS</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
                aria-label="Notificaciones"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[11px] flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotificationsMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowNotificationsMenu(false)}
                  ></div>
                  <div className="absolute right-0 top-12 mt-2 w-96 max-w-[90vw] bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <div className="text-sm font-semibold text-gray-800">Notificaciones</div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={markAllRead}
                          className="text-xs text-mrb-blue hover:underline"
                        >
                          Marcar leídas
                        </button>
                        <button
                          onClick={clearAll}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-gray-500">No hay notificaciones.</div>
                      ) : (
                        notifications.slice(0, 15).map(n => (
                          <div key={n.id} className={`px-4 py-3 border-b border-gray-50 ${n.read ? '' : 'bg-blue-50'}`}>
                            <div className="text-xs text-gray-500">
                              Ticket #{n.ticketId}
                            </div>
                            <div className="text-sm text-gray-800 line-clamp-2">
                              Nuevo comentario{n.authorEmail ? ` de ${n.authorEmail}` : ''}: {n.comentario}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-1">
                              {new Date(n.createdAt).toLocaleString()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center pl-4 border-l border-gray-200 relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
              >
                <div className="flex flex-col items-end mr-3 hidden sm:flex">
                  <span className="text-sm font-medium text-gray-700">
                    {user?.nombre} {user?.apellido}
                  </span>
                  <span className="text-xs text-gray-500">{user?.rol?.nombre}</span>
                </div>
                <UserCircle className="w-8 h-8 text-mrb-blue" />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  ></div>
                  <div className="absolute right-0 top-12 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.nombre} {user?.apellido}
                      </p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={16} />
                      Cerrar Sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto focus:outline-none p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

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
    </div>
  );
};

export default Layout;
