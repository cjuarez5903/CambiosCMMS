import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '../src/context/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);

      // Obtener el usuario después del login
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      // Mapeo de rutas según permisos
      const rutasDisponibles: Record<string, string> = {
        dashboard: '/',
        ordenes_trabajo: '/work-orders',
        sucursales: '/branches',
        activos: '/assets',
        proveedores: '/vendors',
        usuarios: '/users',
        paises: '/countries',
      };

      // Obtener la primera ruta permitida
      const rutasPermitidas = currentUser?.permisos?.rutas || [];
      const primeraRutaPermitida = rutasPermitidas.length > 0
        ? rutasDisponibles[rutasPermitidas[0]] || '/'
        : '/';

      // Si venía de un deep link (email), redirigir ahí
      const redirectPendiente = sessionStorage.getItem('redirectAfterLogin');
      if (redirectPendiente) {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(redirectPendiente);
      } else {
        navigate(primeraRutaPermitida);
      }
    } catch (err: any) {
      console.error('Error de login:', err);
      const mensajeError = err.response?.data?.mensaje || 'Error al iniciar sesión. Verifica tus credenciales.';
      setError(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img
              src="https://www.mrbstorage.com/imgs/logo.svg"
              alt="Mr. B Storage Logo"
              className="h-24 w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-mrb-blue mb-2">Sistema CMMS</h1>
          <p className="text-gray-600">Gestión de Mantenimiento</p>
        </div>

        {/* Formulario de Login */}
        <div className="bg-gradient-to-br from-mrb-blue via-mrb-blue to-blue-700 rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">Iniciar Sesión</h2>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-white/20 bg-white/10 text-white placeholder-white/60 rounded-lg focus:ring-2 focus:ring-mrb-orange focus:border-transparent transition-all"
                  placeholder="usuario@mrbstorage.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-white/20 bg-white/10 text-white placeholder-white/60 rounded-lg focus:ring-2 focus:ring-mrb-orange focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Recordar contraseña */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center">
                <input type="checkbox" className="rounded text-mrb-orange focus:ring-mrb-orange bg-white/20 border-white/40" />
                <span className="ml-2 text-white">Recordarme</span>
              </label>
              <a href="#" className="text-white hover:text-mrb-orange font-medium transition-colors">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Botón de Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-mrb-orange hover:bg-opacity-90 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            © 2024 Mr. B Storage - Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
