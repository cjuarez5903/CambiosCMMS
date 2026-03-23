import React, { useState, useEffect } from 'react';
import { Monitor, Clock, CheckCircle, AlertTriangle, Plus, TrendingUp, Activity, Users, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { useAuth } from '../src/context/AuthContext';
import StatCard from '../components/StatCard';
import ChartCard from '../src/components/ChartCard';
import SimplePieChart from '../src/components/charts/SimplePieChart';
import SimpleBarChart from '../src/components/charts/SimpleBarChart';
import SimpleTrendChart from '../src/components/charts/SimpleTrendChart';
import { COLORS } from '../constants';
import ticketsService, { ITTicket } from '../src/services/it-tickets.service';

const ITDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<ITTicket[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [resolucionPorAsignado, setResolucionPorAsignado] = useState<any[]>([]);

  useEffect(() => {
    cargarDatosIT();
  }, []);

  const calcularResolucionPorAsignado = (tickets: ITTicket[]) => {
    // Agrupar tickets por asignado
    const asignados = tickets.filter(ticket => ticket.asignado_a);
    
    const resolucionMap = new Map<string, { 
      asignado: string; 
      total: number; 
      resueltos: number; 
      enProgreso: number; 
      abiertos: number;
      tasaResolucion: number;
    }>();
    
    asignados.forEach(ticket => {
      const asignado = ticket.asignado_a || 'Sin asignar';
      
      if (!resolucionMap.has(asignado)) {
        resolucionMap.set(asignado, {
          asignado,
          total: 0,
          resueltos: 0,
          enProgreso: 0,
          abiertos: 0,
          tasaResolucion: 0
        });
      }
      
      const stats = resolucionMap.get(asignado);
      stats.total++;
      
      switch (ticket.estado) {
        case 'resuelto':
        case 'cerrado':
          stats.resueltos++;
          break;
        case 'en_progreso':
          stats.enProgreso++;
          break;
        case 'abierto':
          stats.abiertos++;
          break;
      }
      
      // Calcular tasa de resolución
      stats.tasaResolucion = stats.total > 0 ? (stats.resueltos / stats.total) * 100 : 0;
    });
    
    const result = Array.from(resolucionMap.values())
      .sort((a, b) => b.tasaResolucion - a.tasaResolucion)
      .slice(0, 10); // Top 10
    
    console.log('🔢 Resolución por asignado calculada:', result);
    return result;
  };

  const calcularEstadisticasLocales = (tickets: ITTicket[]) => {
    // Calcular estadísticas locales si el backend no las proporciona
    const categorias = new Map<string, number>();
    const prioridades = new Map<string, number>();
    
    let abiertos = 0;
    let enProgreso = 0;
    let resueltos = 0;
    let criticos = 0;
    let resueltosHoy = 0;
    
    const hoy = new Date().toDateString();
    
    tickets.forEach(ticket => {
      // Contar por estado
      switch (ticket.estado) {
        case 'abierto':
          abiertos++;
          break;
        case 'en_progreso':
          enProgreso++;
          break;
        case 'resuelto':
        case 'cerrado':
          resueltos++;
          if (new Date(ticket.fecha_actualizacion || ticket.fecha_creacion).toDateString() === hoy) {
            resueltosHoy++;
          }
          break;
      }
      
      // Contar por categoría
      const categoriaCount = categorias.get(ticket.categoria) || 0;
      categorias.set(ticket.categoria, categoriaCount + 1);
      
      // Contar por prioridad
      const prioridadCount = prioridades.get(ticket.prioridad) || 0;
      prioridades.set(ticket.prioridad, prioridadCount + 1);
      
      // Contar críticos
      if (ticket.prioridad === 'critica') {
        criticos++;
      }
    });
    
    return {
      abiertos,
      enProgreso,
      resueltos,
      criticos,
      resueltosHoy,
      categorias,
      prioridades
    };
  };

  const cargarDatosIT = async () => {
    try {
      setLoading(true);
      
      // Check if user is IT
      const isITUser = user?.permisos?.rutas?.includes('it_soluciones') || user?.permisos?.todo === true;
      
      // Llamada real a la API con filtrado según rol
      const isAdminOrAdminIT = user?.permisos?.todo === true || user?.rol?.nombre === 'Administrador IT';
      const params = isAdminOrAdminIT ? { porPagina: 100 } : { porPagina: 100, asignado_a: user?.email };
      const statsParams = isAdminOrAdminIT ? {} : { asignado_a: user?.email };
      
      const [ticketsResponse, statsResponse] = await Promise.all([
        ticketsService.listar(params),
        ticketsService.obtenerEstadisticas(statsParams)
      ]);

      setTickets(ticketsResponse.datos || []);

      // Filtrar tickets por usuario si es IT (no admin)
      let ticketsFiltrados = ticketsResponse.datos || [];
      if (isITUser && !isAdminOrAdminIT) {
        // Si es usuario IT (no admin y no Administrador IT), solo mostrar sus tickets asignados
        ticketsFiltrados = ticketsFiltrados.filter(ticket => ticket.asignado_a === user?.email);
        console.log('🔒 Usuario IT filtrando solo sus tickets:', ticketsFiltrados.length, 'de', ticketsResponse.datos?.length);
      } else if (user?.rol?.nombre === 'Administrador IT') {
        console.log('👑 Administrador IT viendo TODOS los tickets:', ticketsFiltrados.length);
      }

      // Calcular resolución por asignado
      const resolucionAsignado = calcularResolucionPorAsignado(ticketsFiltrados);
      setResolucionPorAsignado(resolucionAsignado);

      // Calcular estadísticas locales como fallback
      const estadisticasLocales = calcularEstadisticasLocales(ticketsFiltrados);
      
      // Debug: verificar datos del backend
      console.log('🔍 ITDashboard Debug - statsResponse:', statsResponse);
      console.log('🔍 ITDashboard Debug - porCategoria:', statsResponse.porCategoria);
      console.log('🔍 ITDashboard Debug - porPrioridad:', statsResponse.porPrioridad);
      console.log('🔍 ITDashboard Debug - estadisticasLocales:', estadisticasLocales);
      console.log('🔍 ITDashboard Debug - ticketsFiltrados:', ticketsFiltrados.length);

      // Usar estadísticas calculadas localmente de los tickets filtrados
      setStats({
        abiertos: estadisticasLocales.abiertos,
        enProgreso: estadisticasLocales.enProgreso,
        criticos: estadisticasLocales.criticos,
        resueltosHoy: estadisticasLocales.resueltosHoy,
        ticketsAsignados: resolucionAsignado.reduce((sum, item) => sum + item.total, 0),
        totalTickets: ticketsFiltrados.length,
        categoriasData: [
          { name: 'Hardware', value: estadisticasLocales.categorias.get('hardware') || 0, color: '#3b82f6' },
          { name: 'Software', value: estadisticasLocales.categorias.get('software') || 0, color: '#ef4444' },
          { name: 'Red', value: estadisticasLocales.categorias.get('red') || 0, color: '#10b981' },
          { name: 'Acceso', value: estadisticasLocales.categorias.get('acceso') || 0, color: '#f59e0b' },
          { name: 'Soporte Técnico', value: estadisticasLocales.categorias.get('soporte_tecnico') || 0, color: '#8b5cf6' },
        ].filter(item => item.value > 0),
        prioridadData: [
          { name: 'Crítica', value: estadisticasLocales.prioridades.get('critica') || 0, color: '#ef4444' },
          { name: 'Alta', value: estadisticasLocales.prioridades.get('alta') || 0, color: '#f97316' },
          { name: 'Media', value: estadisticasLocales.prioridades.get('media') || 0, color: '#eab308' },
          { name: 'Baja', value: estadisticasLocales.prioridades.get('baja') || 0, color: '#22c55e' },
        ].filter(item => item.value > 0),
      });

      // Debug adicional
      console.log('🎯 STATS FINALES:', {
        categoriasData: [
          { name: 'Hardware', value: estadisticasLocales.categorias.get('hardware') || 0, color: '#3b82f6' },
          { name: 'Software', value: estadisticasLocales.categorias.get('software') || 0, color: '#ef4444' },
          { name: 'Red', value: estadisticasLocales.categorias.get('red') || 0, color: '#10b981' },
          { name: 'Acceso', value: estadisticasLocales.categorias.get('acceso') || 0, color: '#f59e0b' },
          { name: 'Soporte Técnico', value: estadisticasLocales.categorias.get('soporte_tecnico') || 0, color: '#8b5cf6' },
        ].filter(item => item.value > 0),
        prioridadData: [
          { name: 'Crítica', value: estadisticasLocales.prioridades.get('critica') || 0, color: '#ef4444' },
          { name: 'Alta', value: estadisticasLocales.prioridades.get('alta') || 0, color: '#f97316' },
          { name: 'Media', value: estadisticasLocales.prioridades.get('media') || 0, color: '#eab308' },
          { name: 'Baja', value: estadisticasLocales.prioridades.get('baja') || 0, color: '#22c55e' },
        ].filter(item => item.value > 0),
      });

    } catch (error) {
      console.error('Error al cargar datos IT:', error);
      setStats({
        abiertos: 0,
        enProgreso: 0,
        criticos: 0,
        resueltosHoy: 0,
        ticketsAsignados: 0,
        totalTickets: 0,
        categoriasData: [],
        prioridadData: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'abierto':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'en_progreso':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'resuelto':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cerrado':
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'critica':
        return 'bg-red-100 text-red-800';
      case 'alta':
        return 'bg-orange-100 text-orange-800';
      case 'media':
        return 'bg-yellow-100 text-yellow-800';
      case 'baja':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

    // Check permissions
  const isAdmin = user?.permisos?.todo === true;
  const isITUser = user?.rol?.permisos?.rutas?.includes('it_soluciones') || user?.permisos?.todo === true;
  const isRegularITUser = isITUser && !isAdmin;

  const ticketsRecientes = tickets
    .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Cargando dashboard IT...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div className="flex items-center gap-3">
          <Monitor className="w-8 h-8 text-mrb-blue" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Dashboard IT</h2>
            <p className="text-gray-500">Panel de control de soluciones de tecnología.</p>
          </div>
        </div>
        <button
          onClick={() => window.location.hash = '/it-soluciones'}
          className="flex items-center gap-2 px-4 py-2 bg-mrb-blue text-white rounded-lg hover:bg-mrb-blue/90 transition-colors"
        >
          <Plus size={20} />
          Nuevo Ticket
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Tickets Abiertos"
          value={stats?.abiertos?.toString() || '0'}
          icon={AlertTriangle}
          color="red"
          trend="Pendientes de atención"
        />
        <StatCard
          title="En Progreso"
          value={stats?.enProgreso?.toString() || '0'}
          icon={Clock}
          color="yellow"
          trend="Trabajando en ellos"
        />
        <StatCard
          title="Críticos"
          value={stats?.criticos?.toString() || '0'}
          icon={AlertTriangle}
          color="orange"
          trend={stats?.criticos > 0 ? 'Atención inmediata' : 'Sin críticos'}
        />
        <StatCard
          title="Resueltos Hoy"
          value={stats?.resueltosHoy?.toString() || '0'}
          icon={CheckCircle}
          color="teal"
          trend="Productividad del día"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Mis Tickets Asignados</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats?.ticketsAsignados || 0}</p>
            </div>
            <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="text-mrb-blue" size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Tickets</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats?.totalTickets || 0}</p>
            </div>
            <div className="h-12 w-12 bg-teal-50 rounded-lg flex items-center justify-center">
              <Activity className="text-mrb-teal" size={24} />
            </div>
          </div>
        </div>
      </div>

            {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard 
          title="Distribución por Categoría" 
          subtitle="Análisis de tickets por tipo de problema"
          icon={<PieChartIcon className="w-5 h-5 text-blue-600" />}
        >
          {console.log('📊 Datos categorías:', stats?.categoriasData)}
          <SimplePieChart 
            data={stats?.categoriasData || []}
            height={200}
          />
        </ChartCard>

        {/* Tickets por Prioridad - Pie Chart */}
        <ChartCard 
          title="Distribución por Prioridad" 
          subtitle="Clasificación por nivel de urgencia"
          icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
        >
          {console.log('📊 Datos prioridades:', stats?.prioridadData)}
          <SimplePieChart 
            data={stats?.prioridadData || []}
            height={200}
          />
        </ChartCard>
      </div>

      {/* Resolution by Assigned */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasa de Resolución por Técnico */}
        <ChartCard 
          title={isRegularITUser ? "Mi Tasa de Resolución" : "Tasa de Resolución por Técnico"} 
          subtitle={isRegularITUser ? "Mi rendimiento personal" : "Eficiencia de resolución por técnico"}
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
        >
          <SimpleBarChart 
            data={isRegularITUser 
              ? resolucionPorAsignado
                .filter(item => item.asignado === user?.email)
                .map(item => ({
                  name: 'Mi rendimiento',
                  value: Math.round(item.tasaResolucion),
                  color: item.tasaResolucion >= 80 ? '#22c55e' : item.tasaResolucion >= 60 ? '#eab308' : '#ef4444'
                }))
              : resolucionPorAsignado.map(item => ({
                name: item.asignado.split('@')[0],
                value: Math.round(item.tasaResolucion),
                color: item.tasaResolucion >= 80 ? '#22c55e' : item.tasaResolucion >= 60 ? '#eab308' : '#ef4444'
              }))
            }
            horizontal={true}
            height={300}
          />
        </ChartCard>

        {/* Gráfico específico para usuarios IT */}
        {isRegularITUser ? (
          <ChartCard 
            title="Mis Tickets por Estado" 
            subtitle="Estado actual de mis tickets asignados"
            icon={<Activity className="w-5 h-5 text-blue-600" />}
          >
            <SimplePieChart 
              data={[
                { name: 'Abiertos', value: stats.abiertos, color: '#ef4444' },
                { name: 'En Progreso', value: stats.enProgreso, color: '#eab308' },
                { name: 'Resueltos', value: stats.totalTickets - stats.abiertos - stats.enProgreso, color: '#22c55e' },
              ]}
              height={200}
            />
          </ChartCard>
        ) : (
          /* Volumen de Tickets - Solo para admin */
          <ChartCard 
            title="Volumen de Tickets por Técnico" 
            subtitle="Carga de trabajo actual por técnico"
            icon={<BarChart3 className="w-5 h-5 text-purple-600" />}
          >
            <SimpleBarChart 
              data={resolucionPorAsignado.map(item => ({
                name: item.asignado.split('@')[0],
                value: item.total,
                color: COLORS.blue
              }))}
              horizontal={true}
              height={300}
            />
          </ChartCard>
        )}
      </div>

      {/* Tendencias de Resolución - Solo para admin */}
      {!isRegularITUser && (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <ChartCard 
            title="Tendencias de Resolución por Técnico" 
            subtitle="Análisis de rendimiento y tendencias"
            icon={<Activity className="w-5 h-5 text-indigo-600" />}
          >
            {console.log('📊 Datos tendencias:', resolucionPorAsignado.map(item => ({
              name: item.asignado.split('@')[0],
              value: item.tasaResolucion,
              total: item.total,
              resueltos: item.resueltos,
              color: item.tasaResolucion >= 80 ? '#22c55e' : item.tasaResolucion >= 60 ? '#eab308' : '#ef4444'
            })))}
            <SimpleTrendChart 
              data={resolucionPorAsignado.map(item => ({
                name: item.asignado.split('@')[0],
                value: item.tasaResolucion,
                total: item.total,
                resueltos: item.resueltos,
                color: item.tasaResolucion >= 80 ? '#22c55e' : item.tasaResolucion >= 60 ? '#eab308' : '#ef4444'
              }))}
              height={400}
            />
          </ChartCard>
        </div>
      )}

      {/* Estadísticas detalladas - Solo para admin */}
      {!isRegularITUser && resolucionPorAsignado.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Estadísticas Detalladas por Técnico</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Técnico</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resueltos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">En Progreso</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Abiertos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasa Resolución</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {resolucionPorAsignado.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.asignado.split('@')[0]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.total}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{item.resueltos}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">{item.enProgreso}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{item.abiertos}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${item.tasaResolucion}%`,
                              backgroundColor: item.tasaResolucion >= 80 ? '#22c55e' : item.tasaResolucion >= 60 ? '#eab308' : '#ef4444'
                            }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${
                          item.tasaResolucion >= 80 ? 'text-green-600' : 
                          item.tasaResolucion >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {item.tasaResolucion.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Tickets Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Tickets Recientes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitante</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ticketsRecientes.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.hash = '/it-soluciones'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-mrb-blue">#{ticket.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{ticket.titulo}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getEstadoIcon(ticket.estado)}
                      <span className="text-sm text-gray-900 capitalize">
                        {ticket.estado.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPrioridadColor(ticket.prioridad)}`}>
                      {ticket.prioridad.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.solicitante}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(ticket.fecha_creacion).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ITDashboard;
