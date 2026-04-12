import React, { useState, useEffect } from 'react';
import {
  Droplets, AlertTriangle, BarChart2, Settings, PlusCircle, List,
  CheckCircle, RefreshCw, TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import StatCard from '../components/StatCard';
import { useAuth } from '../src/context/AuthContext';
import plantaTratamientoService, {
  LecturaPlanta, ConfiguracionPlanta, DashboardPlanta,
} from '../src/services/planta-tratamiento.service';

type Tab = 'dashboard' | 'registrar' | 'historial' | 'configuracion';

const INDICADOR_BADGE: Record<string, string> = {
  verde: 'bg-green-100 text-green-700',
  amarillo: 'bg-yellow-100 text-yellow-700',
  rojo: 'bg-red-100 text-red-700',
  sin_datos: 'bg-gray-100 text-gray-500',
};
const INDICADOR_LABEL: Record<string, string> = {
  verde: 'Normal',
  amarillo: 'Alerta',
  rojo: 'Excedido',
  sin_datos: 'Sin datos',
};

const formatFecha = (f: string) => {
  if (!f) return '—';
  const [y, m, d] = f.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

const PlantaTratamiento: React.FC = () => {
  const { user } = useAuth();
  const esAdmin = user?.rol?.nombre === 'Administrador';

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    ...(esAdmin ? [{ key: 'dashboard' as Tab, label: 'Dashboard', icon: <BarChart2 size={16} /> }] : []),
    { key: 'registrar', label: 'Registrar Lectura', icon: <PlusCircle size={16} /> },
    { key: 'historial', label: 'Historial', icon: <List size={16} /> },
    ...(esAdmin ? [{ key: 'configuracion' as Tab, label: 'Configuración', icon: <Settings size={16} /> }] : []),
  ];

  const [tab, setTab] = useState<Tab>(esAdmin ? 'dashboard' : 'registrar');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dashboard
  const [dashboard, setDashboard] = useState<DashboardPlanta | null>(null);

  // Registrar
  const [lecturaActual, setLecturaActual] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Historial
  const [lecturas, setLecturas] = useState<LecturaPlanta[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [ultimaPagina, setUltimaPagina] = useState(1);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Configuración
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionPlanta[]>([]);
  const [cfgForm, setCfgForm] = useState<{ sucursalId: string; caudalDisenoM3dia: string; notas: string }>({
    sucursalId: '', caudalDisenoM3dia: '', notas: '',
  });
  const [cfgSubmitting, setCfgSubmitting] = useState(false);

  useEffect(() => {
    if (tab === 'dashboard') cargarDashboard();
    if (tab === 'historial') cargarHistorial();
    if (tab === 'configuracion') cargarConfiguraciones();
  }, [tab, pagina]);

  const cargarDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await plantaTratamientoService.getDashboard();
      setDashboard(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await plantaTratamientoService.listarLecturas({
        pagina,
        porPagina: 20,
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
      });
      setLecturas(data.datos);
      setTotal(data.total);
      setUltimaPagina(data.ultimaPagina);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  const cargarConfiguraciones = async () => {
    try {
      setLoading(true);
      const data = await plantaTratamientoService.listarConfiguraciones();
      setConfiguraciones(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al cargar configuraciones');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lecturaActual) return;
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      await plantaTratamientoService.registrarLectura(parseFloat(lecturaActual));
      setSuccess('Lectura registrada correctamente.');
      setLecturaActual('');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al registrar la lectura');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuardarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfgForm.sucursalId || !cfgForm.caudalDisenoM3dia) return;
    try {
      setCfgSubmitting(true);
      setError('');
      setSuccess('');
      await plantaTratamientoService.guardarConfiguracion({
        sucursalId: parseInt(cfgForm.sucursalId),
        caudalDisenoM3dia: parseFloat(cfgForm.caudalDisenoM3dia),
        notas: cfgForm.notas || undefined,
      });
      setSuccess('Configuración guardada.');
      setCfgForm({ sucursalId: '', caudalDisenoM3dia: '', notas: '' });
      cargarConfiguraciones();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al guardar configuración');
    } finally {
      setCfgSubmitting(false);
    }
  };

  const editarConfig = (cfg: ConfiguracionPlanta) => {
    setCfgForm({
      sucursalId: String(cfg.sucursalId),
      caudalDisenoM3dia: String(cfg.caudalDisenoM3dia),
      notas: cfg.notas || '',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Droplets className="text-mrb-blue" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Planta de Tratamiento</h1>
          <p className="text-sm text-gray-500">Control de consumo de agua — Guatemala</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setError(''); setSuccess(''); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-mrb-blue text-mrb-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <RefreshCw size={24} className="animate-spin mr-2" /> Cargando...
        </div>
      )}

      {/* ── DASHBOARD ── */}
      {tab === 'dashboard' && !loading && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="Total Lecturas"
              value={dashboard.resumen.totalLecturas}
              icon={Droplets}
              color="blue"
            />
            <StatCard
              title="Alertas de Sobreconsumo"
              value={dashboard.resumen.totalAlertas}
              icon={AlertTriangle}
              color="orange"
            />
            <StatCard
              title="Lecturas en Gráfica"
              value={dashboard.grafica.length}
              icon={TrendingUp}
              color="teal"
            />
          </div>

          {/* Gráfica */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Consumo vs Caudal de Diseño (últimas 30 lecturas)</h2>
            {dashboard.grafica.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Sin datos para graficar</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboard.grafica}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" tickFormatter={f => formatFecha(f)} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit=" m³" />
                  <Tooltip
                    formatter={(value: any, name: string) => [`${value} m³`, name === 'consumo' ? 'Consumo' : 'Caudal Diseño']}
                    labelFormatter={f => `Fecha: ${formatFecha(f)}`}
                  />
                  <Legend formatter={v => v === 'consumo' ? 'Consumo diario' : 'Caudal de diseño'} />
                  <Line type="monotone" dataKey="consumo" stroke="#0055A4" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="caudal" stroke="#F97316" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Últimas lecturas */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Últimas Lecturas</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 pr-4">Fecha</th>
                    <th className="pb-2 pr-4">Sucursal</th>
                    <th className="pb-2 pr-4">Lectura (m³)</th>
                    <th className="pb-2 pr-4">Consumo (m³)</th>
                    <th className="pb-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.lecturas.slice(0, 10).map(l => (
                    <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 pr-4">{formatFecha(l.fechaRegistro)}</td>
                      <td className="py-2 pr-4">{l.sucursal?.nombre || '—'}</td>
                      <td className="py-2 pr-4">{Number(l.lecturaActualM3).toFixed(3)}</td>
                      <td className="py-2 pr-4">{l.consumoDiarioM3 !== null ? Number(l.consumoDiarioM3).toFixed(3) : '—'}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${INDICADOR_BADGE[l.indicador || 'sin_datos']}`}>
                          {INDICADOR_LABEL[l.indicador || 'sin_datos']}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── REGISTRAR LECTURA ── */}
      {tab === 'registrar' && !loading && (
        <div className="max-w-md">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Nueva Lectura del Contador</h2>
            <form onSubmit={handleRegistrar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lectura actual del contador (m³)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={lecturaActual}
                  onChange={e => setLecturaActual(e.target.value)}
                  placeholder="Ej. 153.500"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mrb-blue"
                />
                <p className="text-xs text-gray-400 mt-1">
                  La sucursal, fecha y hora se asignan automáticamente.
                </p>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-mrb-blue text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Registrando...' : 'Registrar Lectura'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── HISTORIAL ── */}
      {tab === 'historial' && !loading && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mrb-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha fin</label>
              <input
                type="date"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mrb-blue"
              />
            </div>
            <button
              onClick={() => { setPagina(1); cargarHistorial(); }}
              className="bg-mrb-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Filtrar
            </button>
            <button
              onClick={() => { setFechaInicio(''); setFechaFin(''); setPagina(1); setTimeout(cargarHistorial, 0); }}
              className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Limpiar
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold text-gray-700">Historial de Lecturas</h2>
              <span className="text-xs text-gray-400">{total} registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 pr-4">Fecha</th>
                    <th className="pb-2 pr-4">Sucursal</th>
                    <th className="pb-2 pr-4">Lectura Ant. (m³)</th>
                    <th className="pb-2 pr-4">Lectura Act. (m³)</th>
                    <th className="pb-2 pr-4">Consumo (m³)</th>
                    <th className="pb-2 pr-4">Caudal Diseño</th>
                    <th className="pb-2 pr-4">Estado</th>
                    <th className="pb-2">Alerta</th>
                  </tr>
                </thead>
                <tbody>
                  {lecturas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400">No hay lecturas registradas</td>
                    </tr>
                  ) : lecturas.map(l => (
                    <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 pr-4">{formatFecha(l.fechaRegistro)}</td>
                      <td className="py-2 pr-4">{l.sucursal?.nombre || '—'}</td>
                      <td className="py-2 pr-4">{l.lecturaAnteriorM3 !== null ? Number(l.lecturaAnteriorM3).toFixed(3) : '—'}</td>
                      <td className="py-2 pr-4">{Number(l.lecturaActualM3).toFixed(3)}</td>
                      <td className="py-2 pr-4">{l.consumoDiarioM3 !== null ? Number(l.consumoDiarioM3).toFixed(3) : '—'}</td>
                      <td className="py-2 pr-4">{l.caudalDisenoM3dia ? `${Number(l.caudalDisenoM3dia).toFixed(3)} m³` : '—'}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${INDICADOR_BADGE[l.indicador || 'sin_datos']}`}>
                          {INDICADOR_LABEL[l.indicador || 'sin_datos']}
                        </span>
                      </td>
                      <td className="py-2">
                        {l.alertaGenerada
                          ? <span className="text-red-500"><AlertTriangle size={14} /></span>
                          : <span className="text-green-500"><CheckCircle size={14} /></span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {ultimaPagina > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-600">{pagina} / {ultimaPagina}</span>
                <button
                  onClick={() => setPagina(p => Math.min(ultimaPagina, p + 1))}
                  disabled={pagina === ultimaPagina}
                  className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CONFIGURACIÓN ── */}
      {tab === 'configuracion' && !loading && esAdmin && (
        <div className="space-y-6">
          {/* Formulario */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 max-w-lg">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Configurar Caudal de Diseño</h2>
            <form onSubmit={handleGuardarConfig} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID de Sucursal</label>
                <input
                  type="number"
                  value={cfgForm.sucursalId}
                  onChange={e => setCfgForm(f => ({ ...f, sucursalId: e.target.value }))}
                  placeholder="ID de la sucursal"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mrb-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caudal de Diseño (m³/día)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={cfgForm.caudalDisenoM3dia}
                  onChange={e => setCfgForm(f => ({ ...f, caudalDisenoM3dia: e.target.value }))}
                  placeholder="Ej. 5.000"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mrb-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                <textarea
                  value={cfgForm.notas}
                  onChange={e => setCfgForm(f => ({ ...f, notas: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mrb-blue"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={cfgSubmitting}
                  className="bg-mrb-blue text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {cfgSubmitting ? 'Guardando...' : 'Guardar Configuración'}
                </button>
                {cfgForm.sucursalId && (
                  <button
                    type="button"
                    onClick={() => setCfgForm({ sucursalId: '', caudalDisenoM3dia: '', notas: '' })}
                    className="bg-gray-100 text-gray-600 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Lista de configuraciones */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Configuraciones Actuales</h2>
            {configuraciones.length === 0 ? (
              <p className="text-gray-400 text-sm">No hay configuraciones registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2 pr-4">Sucursal</th>
                      <th className="pb-2 pr-4">Caudal de Diseño (m³/día)</th>
                      <th className="pb-2 pr-4">Notas</th>
                      <th className="pb-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configuraciones.map(cfg => (
                      <tr key={cfg.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 pr-4">{cfg.sucursal?.nombre || `ID ${cfg.sucursalId}`}</td>
                        <td className="py-2 pr-4">{Number(cfg.caudalDisenoM3dia).toFixed(3)}</td>
                        <td className="py-2 pr-4 text-gray-500">{cfg.notas || '—'}</td>
                        <td className="py-2">
                          <button
                            onClick={() => editarConfig(cfg)}
                            className="text-mrb-blue text-xs underline hover:text-blue-700"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlantaTratamiento;
