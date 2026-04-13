import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { AlertTriangle, CheckCircle, Clock, DollarSign, Package, Building, Users as UsersIcon } from 'lucide-react';
import StatCard from '../components/StatCard';
import { COLORS } from '../constants';
import ordenesTrabajoService from '../src/services/ordenes-trabajo.service';
import sucursalesService from '../src/services/sucursales.service';
import activosService from '../src/services/activos.service';
import proveedoresService from '../src/services/proveedores.service';
import { obtenerCodigoPais } from '../src/utils/paises';
import { useAuth } from '../src/context/AuthContext';

const Dashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [permissionError, setPermissionError] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  // Helper para formatear fechas correctamente
  const formatearFecha = (fecha: string | Date | null | undefined): string => {
    if (!fecha) return 'N/A';
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fecha)) {
      const [year, month, day] = fecha.split('T')[0].split('-');
      const fechaLocal = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return fechaLocal.toLocaleDateString('es-ES');
    }
    return new Date(fecha).toLocaleDateString('es-ES');
  };

  useEffect(() => {
    cargarDatos();

    // Verificar si hay un error de permisos en el state de la navegación
    if (location.state?.error) {
      setPermissionError(location.state.error);
      // Limpiar el error después de 5 segundos
      setTimeout(() => setPermissionError(''), 5000);
    }
  }, [location]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError('');

      const [ordenesData, sucursalesData, activosData, proveedoresData] = await Promise.all([
        ordenesTrabajoService.listar(),
        sucursalesService.listar(),
        activosService.listar(),
        proveedoresService.listar(),
      ]);

      const ordenes = ordenesData.datos || ordenesData;

      // Calcular estadísticas por estado
      const pendientes = ordenes.filter((o: any) => o.estado?.toLowerCase() === 'pendiente').length;
      const asignadas  = ordenes.filter((o: any) => o.estado?.toLowerCase() === 'asignada').length;
      const urgentes   = ordenes.filter((o: any) => o.prioridad === 'urgente').length;

      const completadasMes = ordenes.filter((o: any) => {
        if (o.estado?.toLowerCase() !== 'completada') return false;
        if (!o.fechaCompletado) return false;
        const fecha = new Date(o.fechaCompletado);
        const hoy = new Date();
        return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
      }).length;

      // Gasto total: excluye órdenes PENDIENTE (sin monto confirmado)
      const ordenesConGasto = ordenes.filter((o: any) => o.estado?.toLowerCase() !== 'pendiente');
      const gastoTotal = ordenesConGasto.reduce(
        (sum: number, o: any) => sum + (Number(o.costoReal) || 0),
        0
      );

      // Desglose de gasto por país
      const gastoPorPaisMap: Record<string, number> = {};
      ordenesConGasto.forEach((o: any) => {
        const pais = o.sucursal?.pais?.nombre;
        if (pais) {
          gastoPorPaisMap[pais] = (gastoPorPaisMap[pais] || 0) + (Number(o.costoReal) || 0);
        }
      });
      const gastoPorPaisArray = Object.entries(gastoPorPaisMap)
        .map(([nombre, total]) => ({ nombre, total }))
        .filter(p => p.total > 0)
        .sort((a, b) => b.total - a.total);

      // Datos para gráfico de estado
      const statusData = [
        { name: 'Pendiente',   value: ordenes.filter((o: any) => o.estado?.toLowerCase() === 'pendiente').length,   color: COLORS.blue },
        { name: 'Asignada',    value: ordenes.filter((o: any) => o.estado?.toLowerCase() === 'asignada').length,    color: '#3b82f6' },
        { name: 'En Progreso', value: ordenes.filter((o: any) => o.estado?.toLowerCase() === 'en_progreso').length, color: COLORS.orange },
        { name: 'Completadas', value: ordenes.filter((o: any) => o.estado?.toLowerCase() === 'completada').length,  color: COLORS.teal },
        { name: 'Canceladas',  value: ordenes.filter((o: any) => o.estado?.toLowerCase() === 'cancelada').length,   color: '#ef4444' },
      ].filter(item => item.value > 0);

      // Datos por país para gráfico de barras
      const costoPorPais: any = {};
      ordenes.forEach((o: any) => {
        if (o.sucursal?.pais?.nombre) {
          const pais = o.sucursal.pais.nombre;
          if (!costoPorPais[pais]) costoPorPais[pais] = 0;
          const costo = Number(o.costoReal) || Number(o.costoEstimado) || 0;
          costoPorPais[pais] += costo;
        }
      });
      const countryCostData = Object.keys(costoPorPais)
        .map(pais => ({
          name: obtenerCodigoPais(pais),
          nombreCompleto: pais,
          costos: costoPorPais[pais],
        }))
        .filter(item => item.costos > 0);

      setStats({
        pendientes,
        asignadas,
        urgentes,
        completadasMes,
        gastoTotal,
        gastoPorPaisArray,
        statusData,
        countryCostData,
        totalSucursales: Array.isArray(sucursalesData) ? sucursalesData.length : (sucursalesData as any)?.datos?.length || 0,
        totalActivos: Array.isArray(activosData) ? activosData.length : (activosData as any)?.datos?.length || 0,
        totalProveedores: Array.isArray(proveedoresData) ? proveedoresData.length : (proveedoresData as any)?.datos?.length || 0,
      });

      // Órdenes recientes (últimas 5)
      const recientes = [...ordenes]
        .sort((a: any, b: any) => new Date(b.fechaReporte).getTime() - new Date(a.fechaReporte).getTime())
        .slice(0, 5);
      setRecentOrders(recientes);

    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al cargar estadísticas');
      console.error('Error cargando dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'baja':    return 'bg-gray-100 text-gray-800';
      case 'media':   return 'bg-blue-100 text-blue-800';
      case 'alta':    return 'bg-orange-100 text-orange-800';
      case 'urgente': return 'bg-red-100 text-red-800';
      default:        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPrioridad = (prioridad: string) => {
    const prioridades: any = { baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente' };
    return prioridades[prioridad] || prioridad;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Cargando dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Panel de Control</h2>
          <p className="text-gray-500">Resumen operativo de mantenimiento e infraestructura.</p>
        </div>
      </div>

      {/* Permission Error Alert */}
      {permissionError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm animate-pulse">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Acceso Denegado</h3>
              <p className="mt-1 text-sm text-red-700">{permissionError}</p>
              <p className="mt-1 text-xs text-red-600">Solo puedes acceder a las secciones asignadas a tu rol.</p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards — fila 1: 4 tarjetas de estado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="OTs Abiertas"
          value={stats?.pendientes?.toString() || '0'}
          icon={Clock}
          color="blue"
          trend="Sin asignar"
          actionLabel="Ver Pendientes →"
          onAction={() => navigate('/work-orders?estado=PENDIENTE')}
        />
        <StatCard
          title="OTs Asignadas"
          value={stats?.asignadas?.toString() || '0'}
          icon={Clock}
          color="lightblue"
          trend="Asignadas, sin iniciar"
          actionLabel="Ver Asignadas →"
          onAction={() => navigate('/work-orders?estado=ASIGNADA')}
        />
        <StatCard
          title="OTs Urgentes"
          value={stats?.urgentes?.toString() || '0'}
          icon={AlertTriangle}
          color="orange"
          trend={stats?.urgentes > 0 ? 'Atención requerida' : 'Sin urgencias'}
          actionLabel="Ver Urgentes →"
          onAction={() => navigate('/work-orders?prioridad=urgente')}
        />
        <StatCard
          title="Completadas (Mes)"
          value={stats?.completadasMes?.toString() || '0'}
          icon={CheckCircle}
          color="teal"
          trend="Este mes"
          actionLabel="Ver Completadas →"
          onAction={() => navigate('/work-orders?tab=completadas')}
        />
      </div>

      {/* KPI Card — Gasto Total con desglose por país */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Gasto Total Acumulado</p>
            <h3 className="text-2xl font-bold text-gray-800">
              ${stats?.gastoTotal?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} USD
            </h3>
            <p className="text-xs text-gray-400 mt-1">Excluye órdenes pendientes sin monto confirmado</p>
          </div>
          <div className="p-3 rounded-lg bg-sky-50 text-mrb-lightblue">
            <DollarSign size={24} />
          </div>
        </div>
        {stats?.gastoPorPaisArray?.length > 0 && (
          <div className="border-t border-gray-100 pt-3 space-y-1">
            {stats.gastoPorPaisArray.map((p: any) => (
              <div key={p.nombre} className="flex justify-between text-sm">
                <span className="text-gray-600">{p.nombre}</span>
                <span className="font-medium text-gray-800">${p.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sucursales</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats?.totalSucursales || 0}</p>
            </div>
            <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Building className="text-mrb-blue" size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Activos</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats?.totalActivos || 0}</p>
            </div>
            <div className="h-12 w-12 bg-teal-50 rounded-lg flex items-center justify-center">
              <Package className="text-mrb-teal" size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Proveedores</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats?.totalProveedores || 0}</p>
            </div>
            <div className="h-12 w-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <UsersIcon className="text-mrb-orange" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Estado de Órdenes de Trabajo</h3>
          <div className="h-64" style={{ minHeight: '256px' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={stats?.statusData || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(stats?.statusData || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Costs by Country */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Costos por País (USD)</h3>
          {stats?.countryCostData && stats.countryCostData.length > 0 ? (
            <div className="h-64" style={{ minHeight: '256px' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={stats.countryCostData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: any, name: any, props: any) => [
                      `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
                      props.payload.nombreCompleto
                    ]}
                  />
                  <Bar dataKey="costos" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500" style={{ minHeight: '256px' }}>
              No hay datos de costos por país
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Órdenes Recientes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número OT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sucursal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-mrb-blue">{order.numeroOT}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{order.titulo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.sucursal?.nombre}, {order.sucursal?.pais?.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPrioridadColor(order.prioridad)}`}>
                      {formatPrioridad(order.prioridad)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatearFecha(order.fechaReporte)}
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

export default Dashboard;
