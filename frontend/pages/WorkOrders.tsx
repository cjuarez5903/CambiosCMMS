import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Plus, Search, Clock, Building, User, Calendar, DollarSign, Tag, FileText, Star, AlertTriangle } from 'lucide-react';
import ordenesTrabajoService, { OrdenTrabajo } from '../src/services/ordenes-trabajo.service';
import sucursalesService, { Sucursal } from '../src/services/sucursales.service';
import proveedoresService, { Proveedor } from '../src/services/proveedores.service';
import uploadsService from '../src/services/uploads.service';
import { useAuth } from '../src/context/AuthContext';
import Modal from '../components/Modal';
import ImageUpload from '../src/components/ImageUpload';
import MultipleImageUpload from '../src/components/MultipleImageUpload';
import HistorialOrden from '../components/HistorialOrden';
import { obtenerCodigoPais } from '../src/utils/paises';
import Pagination from '../src/components/Pagination';

const WorkOrders: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const deepLinkProcessed = useRef(false);
  const [orders, setOrders] = useState<OrdenTrabajo[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [permissionError, setPermissionError] = useState<string>('');

  // Check if user is admin
  const esAdmin = user?.rol?.nombre === 'Administrador';
  const esAdminSucursal = user?.rol?.nombre === 'Administrador de Sucursal';
  const esGerenteDePais = user?.rol?.nombre === 'Gerente de País';
  const [filter, setFilter] = useState('');

  // Pestaña activa
  const [tabActiva, setTabActiva] = useState<'activas' | 'completadas'>('activas');

  // Filters
  const [filtroSucursal, setFiltroSucursal] = useState<number | ''>('');
  const [filtroPais, setFiltroPais] = useState<number | ''>('');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');

  // Estados de paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [porPagina, setPorPagina] = useState(1000);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAsignarModalOpen, setIsAsignarModalOpen] = useState(false);
  const [isIniciarModalOpen, setIsIniciarModalOpen] = useState(false);
  const [isCompletarModalOpen, setIsCompletarModalOpen] = useState(false);
  const [isCancelarModalOpen, setIsCancelarModalOpen] = useState(false);
  const [isDetallesModalOpen, setIsDetallesModalOpen] = useState(false);
  const [isHistorialModalOpen, setIsHistorialModalOpen] = useState(false);

  // Estados de comentarios
  const [showComments, setShowComments] = useState<Record<number, boolean>>({});
  const [comments, setComments] = useState<Record<number, any[]>>({});
  const [commentInput, setCommentInput] = useState<Record<number, string>>({});

  const [editingOrder, setEditingOrder] = useState<OrdenTrabajo | null>(null);
  const [ordenAAsignar, setOrdenAAsignar] = useState<OrdenTrabajo | null>(null);
  const [ordenAIniciar, setOrdenAIniciar] = useState<OrdenTrabajo | null>(null);
  const [ordenACompletar, setOrdenACompletar] = useState<OrdenTrabajo | null>(null);
  const [ordenACancelar, setOrdenACancelar] = useState<OrdenTrabajo | null>(null);
  const [ordenDetalles, setOrdenDetalles] = useState<OrdenTrabajo | null>(null);

  // Form Data States
  const [formData, setFormData] = useState<Partial<OrdenTrabajo>>({
    titulo: '',
    descripcion: '',
    prioridad: 'media',
    tipo: 'correctivo',
    categoria: 'Mantenimiento General',
    sucursalId: 1,
    fotoAntes: '',
    evidenciasAntes: [],
  });

  const [asignarData, setAsignarData] = useState({
    proveedorId: 0,
    fechaProgramada: '',
    costoEstimado: 0,
    costoEstimadoLocal: 0,
    categoriaSap: '',
  });

  const [iniciarData, setIniciarData] = useState({
    observacionAdicional: '',
  });

  const [completarData, setCompletarData] = useState({
    notasResolucion: '',
    costoReal: 0,
    costoRealLocal: 0,
    fotoDespues: '',
    calificacion: 0,
  });

  const [cancelarData, setCancelarData] = useState({
    observacion: '',
  });

  // Loading states for operations
  const [creandoOrden, setCreandoOrden] = useState(false);
  const [asignandoOrden, setAsignandoOrden] = useState(false);
  const [iniciandoOrden, setIniciandoOrden] = useState(false);
  const [completandoOrden, setCompletandoOrden] = useState(false);
  const [cancelandoOrden, setCancelandoOrden] = useState(false);

  useEffect(() => {
    cargarDatos();

    // Verificar si hay un error de permisos en el state de la navegación
    if (location.state?.error) {
      setPermissionError(location.state.error);
      // Limpiar el error después de 5 segundos
      setTimeout(() => setPermissionError(''), 5000);
    }
  }, [location]);

  // Leer parámetros URL al montar: ?tab=, ?estado=, ?prioridad=
  useEffect(() => {
    const estadoParam    = searchParams.get('estado');
    const prioridadParam = searchParams.get('prioridad');
    const tabParam       = searchParams.get('tab');
    if (estadoParam)            setFiltroEstado(estadoParam.toUpperCase());
    if (prioridadParam)         setFiltroPrioridad(prioridadParam.toLowerCase());
    if (tabParam === 'completadas') setTabActiva('completadas');
  }, []); // solo en mount

  // Deep link: abrir automáticamente la OT especificada en ?ot=OT-XXXX
  useEffect(() => {
    if (loading) return;
    if (deepLinkProcessed.current) return;
    deepLinkProcessed.current = true;

    const otParam = searchParams.get('ot');
    if (!otParam) return;

    const found = orders.find(o => o.numeroOT === otParam);
    if (found) {
      setOrdenDetalles(found);
      setIsDetallesModalOpen(true);
    } else {
      setError(`La orden ${otParam} no fue encontrada o no tienes permisos para verla.`);
    }
  }, [loading, orders]);

  // Predefinir sucursal para Administradores de Sucursal
  useEffect(() => {
    if (user?.sucursal?.id) {
      setFormData(prev => ({
        ...prev,
        sucursalId: user.sucursal!.id,
      }));
    }
  }, [user]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError('');
      const [ordenesData, sucursalesData, proveedoresData] = await Promise.all([
        ordenesTrabajoService.listar(),
        sucursalesService.listar(),
        proveedoresService.listar({ estado: 'activo' }),
      ]);
      const ordenes = ordenesData.datos || ordenesData;
      setOrders(ordenes);
      setSucursales(sucursalesData);
      setProveedores(proveedoresData);
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al cargar datos');
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format dates correctly (avoiding timezone issues)
  const formatearFecha = (fecha: string | Date | null | undefined, formatoLargo: boolean = false): string => {
    if (!fecha) return 'N/A';

    // Si es string en formato YYYY-MM-DD, parsearlo como fecha local
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fecha)) {
      const [year, month, day] = fecha.split('T')[0].split('-');
      const fechaLocal = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      if (formatoLargo) {
        return fechaLocal.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
      return fechaLocal.toLocaleDateString('es-ES');
    }

    // Para otros formatos, usar Date normal
    const dateObj = new Date(fecha);
    if (formatoLargo) {
      return dateObj.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return dateObj.toLocaleDateString('es-ES');
  };

  // Helper para convertir fecha del input a formato ISO sin cambiar el día
  const convertirFechaParaBackend = (fechaString: string): string => {
    if (!fechaString) return '';
    // El input date ya viene en formato YYYY-MM-DD
    // Necesitamos enviarlo con hora local medianoche para evitar conversión de zona horaria
    return `${fechaString}T00:00:00`;
  };

  // Filtrar sucursales disponibles según el rol del usuario
  const getSucursalesDisponibles = (): Sucursal[] => {
    // Administrador: ve todas las sucursales
    if (esAdmin) {
      return sucursales;
    }

    // Administrador de Sucursal: solo ve su sucursal
    if (esAdminSucursal && user?.sucursal?.id) {
      return sucursales.filter(s => s.id === user.sucursal!.id);
    }

    // Gerente de País: ve sucursales de sus países asignados
    if (esGerenteDePais && (user as any)?.sucursalesAsignadas) {
      const paisIds = [...new Set(
        (user as any).sucursalesAsignadas
          .filter((s: any) => s.pais?.id)
          .map((s: any) => s.pais.id)
      )];
      return sucursales.filter(s => s.pais && paisIds.includes(s.pais.id));
    }

    // Por defecto, retornar todas
    return sucursales;
  };

  // Helper functions for currency conversion
  const getSelectedSucursalInfo = (sucursalId: number) => {
    const sucursal = sucursales.find(s => s.id === sucursalId);
    if (!sucursal || !sucursal.pais) return null;
    return {
      moneda: sucursal.pais.moneda,
      tasaCambio: Number(sucursal.pais.tasaCambioUsd),
      esUSD: sucursal.pais.moneda === 'USD'
    };
  };

  const convertirUSDaLocal = (usd: number, sucursalId: number) => {
    const info = getSelectedSucursalInfo(sucursalId);
    if (!info || info.esUSD) return usd;
    return usd * info.tasaCambio;
  };

  const convertirLocalAUSD = (local: number, sucursalId: number) => {
    const info = getSelectedSucursalInfo(sucursalId);
    if (!info || info.esUSD) return local;
    return local / info.tasaCambio;
  };

  // Status and priority helpers
  const getStatusColor = (status: string) => {
    // Normalizar a uppercase para asegurar match
    const normalizedStatus = status?.toUpperCase();
    switch (normalizedStatus) {
      case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800';
      case 'ASIGNADA': return 'bg-blue-100 text-blue-800';
      case 'EN_PROGRESO': return 'bg-orange-100 text-orange-800';
      case 'COMPLETADA': return 'bg-green-100 text-green-800';
      case 'CANCELADA': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'baja': return 'bg-gray-100 text-gray-800';
      case 'media': return 'bg-blue-100 text-blue-800';
      case 'alta': return 'bg-orange-100 text-orange-800';
      case 'urgente': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEstado = (estado: string) => {
    // Normalizar a uppercase para asegurar match
    const normalizedEstado = estado?.toUpperCase();
    const estados: any = {
      'PENDIENTE': 'Pendiente',
      'ASIGNADA': 'Asignada',
      'EN_PROGRESO': 'En Progreso',
      'COMPLETADA': 'Completada',
      'CANCELADA': 'Cancelada',
    };
    return estados[normalizedEstado] || estado;
  };

  const formatPrioridad = (prioridad: string) => {
    const prioridades: any = {
      'baja': 'Baja',
      'media': 'Media',
      'alta': 'Alta',
      'urgente': 'Urgente',
    };
    return prioridades[prioridad] || prioridad;
  };

  // CRUD Handlers
  const handleOpenModal = () => {
    setEditingOrder(null);
    
    // Determinar la sucursal correcta según el rol del usuario
    let sucursalPorDefecto: number;
    
    if (esAdminSucursal && user?.sucursal?.id) {
      // Administrador de Sucursal: usar su sucursal asignada
      sucursalPorDefecto = user.sucursal.id;
    } else {
      // Otros roles: usar la primera sucursal disponible
      const sucursalesDisponibles = getSucursalesDisponibles();
      sucursalPorDefecto = sucursalesDisponibles[0]?.id || 1;
    }
    
    setFormData({
      titulo: '',
      descripcion: '',
      prioridad: 'media',
      tipo: 'correctivo',
      categoria: 'Mantenimiento General',
      categoriaSap: 'Reparaciones Generales y Pintura',
      sucursalId: sucursalPorDefecto,
      fotoAntes: '',
      evidenciasAntes: [],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      setError('');
      setCreandoOrden(true);
      await ordenesTrabajoService.crear(formData);
      await cargarDatos();
      setIsModalOpen(false);
      setEditingOrder(null);
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al crear orden');
    } finally {
      setCreandoOrden(false);
    }
  };

  // Asignar Proveedor Handler
  const handleOpenAsignar = (order: OrdenTrabajo) => {
    setOrdenAAsignar(order);
    setAsignarData({
      proveedorId: order.asignadoAProveedorId || 0,
      fechaProgramada: order.fechaProgramada || '',
      costoEstimado: order.costoEstimado || 0,
      costoEstimadoLocal: order.costoEstimadoLocal || 0,
      categoriaSap: order.categoriaSap || '',
    });
    setIsAsignarModalOpen(true);
  };

  const handleCostoEstimadoChange = (valor: number) => {
    if (!ordenAAsignar) return;
    const local = convertirUSDaLocal(valor, ordenAAsignar.sucursalId);
    setAsignarData({ ...asignarData, costoEstimado: valor, costoEstimadoLocal: local });
  };

  const handleCostoEstimadoLocalChange = (valor: number) => {
    if (!ordenAAsignar) return;
    const usd = convertirLocalAUSD(valor, ordenAAsignar.sucursalId);
    setAsignarData({ ...asignarData, costoEstimado: usd, costoEstimadoLocal: valor });
  };

  const handleConfirmarAsignar = async () => {
    if (!ordenAAsignar) return;

    if (!asignarData.proveedorId) {
      setError('El proveedor es requerido');
      return;
    }

    if (!asignarData.fechaProgramada) {
      setError('La fecha programada es requerida');
      return;
    }

    try {
      setError('');
      setAsignandoOrden(true);
      // Usar el nuevo método asignarOrden que guarda historial
      const datosAsignacion: any = {
        asignadoAProveedorId: asignarData.proveedorId,
        fechaProgramada: convertirFechaParaBackend(asignarData.fechaProgramada),
        costoEstimado: asignarData.costoEstimado,
        costoEstimadoLocal: asignarData.costoEstimadoLocal,
      };

      // Solo agregar categoría SAP si el usuario es admin y se seleccionó una
      if (esAdmin && asignarData.categoriaSap) {
        datosAsignacion.categoriaSap = asignarData.categoriaSap;
      }

      await ordenesTrabajoService.asignarOrden(ordenAAsignar.id, datosAsignacion);
      await cargarDatos();
      setIsAsignarModalOpen(false);
      setOrdenAAsignar(null);
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al asignar orden');
    } finally {
      setAsignandoOrden(false);
    }
  };

  // Iniciar Handler
  const handleOpenIniciar = (order: OrdenTrabajo) => {
    setOrdenAIniciar(order);
    setIniciarData({ observacionAdicional: '' });
    setIsIniciarModalOpen(true);
  };

  const handleConfirmarIniciar = async () => {
    if (!ordenAIniciar) return;

    try {
      setError('');
      setIniciandoOrden(true);
      // Usar el nuevo método iniciarOrden que guarda historial
      await ordenesTrabajoService.iniciarOrden(ordenAIniciar.id, {
        observacion: iniciarData.observacionAdicional,
      });
      await cargarDatos();
      setIsIniciarModalOpen(false);
      setOrdenAIniciar(null);
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al iniciar orden');
    } finally {
      setIniciandoOrden(false);
    }
  };

  // Completar Handler
  const handleOpenCompletar = (order: OrdenTrabajo) => {
    setOrdenACompletar(order);
    setCompletarData({
      notasResolucion: '',
      costoReal: order.costoReal || 0,
      costoRealLocal: order.costoRealLocal || 0,
      fotoDespues: '',
    });
    setIsCompletarModalOpen(true);
  };

  // Detalles Handler
  const handleOpenDetalles = (order: OrdenTrabajo) => {
    setOrdenDetalles(order);
    setIsDetallesModalOpen(true);
  };

  // Historial Handler
  const handleOpenHistorial = (order: OrdenTrabajo) => {
    setOrdenDetalles(order);
    setIsHistorialModalOpen(true);
  };

  // Comentarios Handlers
  const handleToggleComentarios = async (ordenId: number) => {
    const visible = !showComments[ordenId];
    setShowComments(prev => ({ ...prev, [ordenId]: visible }));
    if (visible && !comments[ordenId]) {
      try {
        const data = await ordenesTrabajoService.obtenerComentarios(ordenId);
        setComments(prev => ({ ...prev, [ordenId]: data }));
      } catch {
        setComments(prev => ({ ...prev, [ordenId]: [] }));
      }
    }
  };

  const handleEnviarComentario = async (ordenId: number) => {
    const texto = (commentInput[ordenId] || '').trim();
    if (!texto) return;
    try {
      const nuevo = await ordenesTrabajoService.agregarComentario(ordenId, texto);
      setComments(prev => ({ ...prev, [ordenId]: [...(prev[ordenId] || []), nuevo] }));
      setCommentInput(prev => ({ ...prev, [ordenId]: '' }));
    } catch {
      setError('Error al enviar comentario');
    }
  };

  const handleCostoRealChange = (valor: number) => {
    if (!ordenACompletar) return;
    const local = convertirUSDaLocal(valor, ordenACompletar.sucursalId);
    setCompletarData({ ...completarData, costoReal: valor, costoRealLocal: local });
  };

  const handleCostoRealLocalChange = (valor: number) => {
    if (!ordenACompletar) return;
    const usd = convertirLocalAUSD(valor, ordenACompletar.sucursalId);
    setCompletarData({ ...completarData, costoReal: usd, costoRealLocal: valor });
  };

  const handleCerrarCompletarModal = () => {
    setIsCompletarModalOpen(false);
    setOrdenACompletar(null);
    // Reset completar data
    setCompletarData({
      notasResolucion: '',
      costoReal: 0,
      costoRealLocal: 0,
      fotoDespues: '',
      calificacion: 0,
    });
  };

  const handleConfirmarCompletar = async () => {
    if (!ordenACompletar) return;

    try {
      setError('');
      setCompletandoOrden(true);
      // Usar el nuevo método completarOrden que guarda historial
      await ordenesTrabajoService.completarOrden(ordenACompletar.id, {
        notasResolucion: completarData.notasResolucion,
        costoReal: completarData.costoReal,
        costoRealLocal: completarData.costoRealLocal,
        fotoDespues: completarData.fotoDespues,
        calificacion: completarData.calificacion > 0 ? completarData.calificacion : undefined,
      });
      await cargarDatos();
      handleCerrarCompletarModal();
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al completar orden');
    } finally {
      setCompletandoOrden(false);
    }
  };

  // Cancelar Handler
  const handleOpenCancelar = (order: OrdenTrabajo) => {
    setOrdenACancelar(order);
    setCancelarData({ observacion: '' });
    setIsCancelarModalOpen(true);
  };

  const handleConfirmarCancelar = async () => {
    if (!ordenACancelar) return;

    if (!cancelarData.observacion || cancelarData.observacion.trim() === '') {
      setError('La observación es obligatoria para cancelar una orden');
      return;
    }

    try {
      setError('');
      setCancelandoOrden(true);
      await ordenesTrabajoService.cancelarOrden(ordenACancelar.id, cancelarData.observacion);
      await cargarDatos();
      setIsCancelarModalOpen(false);
      setOrdenACancelar(null);
      setCancelarData({ observacion: '' });
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al cancelar orden');
    } finally {
      setCancelandoOrden(false);
    }
  };

  // Estados que se consideran "completados/cerrados"
  const ESTADOS_COMPLETADOS = ['completada', 'cancelada'];

  // Contadores por pestaña (sobre todos los órdenes, sin aplicar filtros de usuario)
  const totalActivas     = orders.filter(o => !ESTADOS_COMPLETADOS.includes(o.estado?.toLowerCase())).length;
  const totalCompletadas = orders.filter(o =>  ESTADOS_COMPLETADOS.includes(o.estado?.toLowerCase())).length;

  // Filtrar por pestaña activa primero
  const ordenesPorTab = orders.filter(o =>
    tabActiva === 'activas'
      ? !ESTADOS_COMPLETADOS.includes(o.estado?.toLowerCase())
      :  ESTADOS_COMPLETADOS.includes(o.estado?.toLowerCase())
  );

  // Luego aplicar filtros de usuario
  const filteredOrders = ordenesPorTab.filter(order => {
    const matchesSearch =
      order.titulo.toLowerCase().includes(filter.toLowerCase()) ||
      order.numeroOT.toLowerCase().includes(filter.toLowerCase()) ||
      order.sucursal?.nombre.toLowerCase().includes(filter.toLowerCase());
    const matchesSucursal  = filtroSucursal === '' || order.sucursalId === filtroSucursal;
    const matchesPais      = filtroPais === ''     || (order.sucursal as any)?.paisId === filtroPais;
    const matchesPrioridad = filtroPrioridad === '' || order.prioridad === filtroPrioridad;
    const matchesEstado    = filtroEstado === ''   || order.estado?.toUpperCase() === filtroEstado.toUpperCase();
    return matchesSearch && matchesSucursal && matchesPais && matchesPrioridad && matchesEstado;
  });

  // Paginación
  const totalOrdenes = filteredOrders.length;
  const totalPaginas = Math.ceil(totalOrdenes / porPagina);
  const indiceInicio = (paginaActual - 1) * porPagina;
  const indiceFin = indiceInicio + porPagina;
  const ordenesPaginadas = filteredOrders.slice(indiceInicio, indiceFin);

  // Resetear a página 1 cuando cambian los filtros o la pestaña
  useEffect(() => {
    setPaginaActual(1);
  }, [filter, filtroSucursal, filtroPais, filtroPrioridad, filtroEstado, tabActiva]);

  // Países disponibles derivados de sucursales (para el selector con cascada)
  const paisesDisponibles: { id: number; nombre: string }[] = Array.from(
    new Map<number, { id: number; nombre: string }>(
      sucursales
        .filter(s => s.pais)
        .map(s => [s.paisId, { id: s.paisId, nombre: s.pais!.nombre }])
    ).values()
  );

  // Sucursales visibles según el país seleccionado (cascada)
  const sucursalesVisibles: Sucursal[] = filtroPais === ''
    ? sucursales
    : sucursales.filter(s => s.paisId === filtroPais);

  // Chips de filtros activos
  const activeChips: { label: string; onRemove: () => void }[] = [];
  if (filtroPais !== '') {
    const p = paisesDisponibles.find(p => p.id === filtroPais);
    if (p) activeChips.push({ label: p.nombre, onRemove: () => { setFiltroPais(''); setFiltroSucursal(''); } });
  }
  if (filtroSucursal !== '') {
    const s = sucursales.find(s => s.id === filtroSucursal);
    if (s) activeChips.push({ label: s.nombre, onRemove: () => setFiltroSucursal('') });
  }
  if (filtroPrioridad !== '') {
    activeChips.push({ label: formatPrioridad(filtroPrioridad), onRemove: () => setFiltroPrioridad('') });
  }
  if (filtroEstado !== '') {
    activeChips.push({ label: formatEstado(filtroEstado), onRemove: () => setFiltroEstado('') });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Cargando órdenes de trabajo...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Órdenes de Trabajo</h2>
          <p className="text-gray-500">Gestión y seguimiento de mantenimiento.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-mrb-blue hover:bg-blue-800 text-white px-4 py-2 rounded-lg flex items-center transition-colors shadow-sm"
        >
          <Plus size={18} className="mr-2" />
          Nueva Orden
        </button>
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

      {/* Pestañas: Activas / Completadas */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['activas', 'completadas'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setTabActiva(tab);
                // Limpiar filtros incompatibles al cambiar pestaña
                if (tab === 'completadas') {
                  setFiltroPrioridad(''); // prioridad no aplica en completadas
                  // Si el estado activo no es completada/cancelada, limpiarlo
                  if (filtroEstado !== '' && filtroEstado !== 'COMPLETADA' && filtroEstado !== 'CANCELADA') {
                    setFiltroEstado('');
                  }
                } else {
                  // Al regresar a activas, limpiar si el estado era de completadas
                  if (filtroEstado === 'COMPLETADA' || filtroEstado === 'CANCELADA') {
                    setFiltroEstado('');
                  }
                }
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                tabActiva === tab
                  ? 'border-mrb-blue text-mrb-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'activas' ? 'Órdenes Activas' : 'Completadas / Canceladas'}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                tabActiva === tab ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {tab === 'activas' ? totalActivas : totalCompletadas}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por número, título o sucursal..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mrb-blue"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {/* Filter Dropdowns — columnas varían según pestaña */}
        <div className={`grid grid-cols-1 gap-4 ${tabActiva === 'completadas' ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
          {/* País */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">País</label>
            <select
              className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-mrb-blue"
              value={filtroPais}
              onChange={(e) => {
                const val = e.target.value === '' ? '' : Number(e.target.value);
                setFiltroPais(val);
                setFiltroSucursal('');
              }}
            >
              <option value="">Todos los países</option>
              {paisesDisponibles.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          {/* Sucursal */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Sucursal</label>
            <select
              className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-mrb-blue"
              value={filtroSucursal}
              onChange={(e) => setFiltroSucursal(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Todas las sucursales</option>
              {sucursalesVisibles.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          {/* Prioridad — solo en pestaña Activas */}
          {tabActiva === 'activas' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Prioridad</label>
              <select
                className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-mrb-blue"
                value={filtroPrioridad}
                onChange={(e) => setFiltroPrioridad(e.target.value)}
              >
                <option value="">Todas las prioridades</option>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          )}

          {/* Estado — opciones limitadas según pestaña */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
            <select
              className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-mrb-blue"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              {tabActiva === 'completadas' ? (
                <>
                  <option value="">Completada y Cancelada</option>
                  <option value="COMPLETADA">Completada</option>
                  <option value="CANCELADA">Cancelada</option>
                </>
              ) : (
                <>
                  <option value="">Todos los estados</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="ASIGNADA">Asignada</option>
                  <option value="EN_PROGRESO">En Progreso</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Chips de filtros activos */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {activeChips.map((chip, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium"
              >
                {chip.label}
                <button
                  onClick={chip.onRemove}
                  className="ml-1 text-blue-600 hover:text-blue-900 font-bold leading-none"
                  aria-label={`Quitar filtro ${chip.label}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orden</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalles</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sucursal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">País</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ordenesPaginadas.map((order) => (
                <React.Fragment key={order.id}>
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-mrb-blue block">{order.numeroOT}</span>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <Clock size={12} />
                      {formatearFecha(order.fechaReporte)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{order.titulo}</div>
                    <div className="text-xs text-gray-500">{order.categoria}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Building size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-900">{order.sucursal?.nombre}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-mrb-blue">
                      {order.sucursal?.pais?.nombre ? obtenerCodigoPais(order.sucursal.pais.nombre) : 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(order.prioridad)}`}>
                      {formatPrioridad(order.prioridad)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.estado)}`}>
                      {formatEstado(order.estado)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {/* Solo Administrador puede asignar, iniciar y completar */}
                      {esAdmin && order.estado?.toUpperCase() === 'PENDIENTE' && (
                        <button
                          onClick={() => handleOpenAsignar(order)}
                          className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 border border-blue-600 rounded hover:bg-blue-50"
                        >
                          Asignar
                        </button>
                      )}
                      {esAdmin && order.estado?.toUpperCase() === 'ASIGNADA' && (
                        <button
                          onClick={() => handleOpenIniciar(order)}
                          className="text-green-600 hover:text-green-800 text-xs px-2 py-1 border border-green-600 rounded hover:bg-green-50"
                        >
                          Iniciar
                        </button>
                      )}
                      {esAdmin && order.estado?.toUpperCase() === 'EN_PROGRESO' && (
                        <button
                          onClick={() => handleOpenCompletar(order)}
                          className="text-purple-600 hover:text-purple-800 text-xs px-2 py-1 border border-purple-600 rounded hover:bg-purple-50"
                        >
                          Completar
                        </button>
                      )}
                      {/* Botón Cancelar para administradores y admin de sucursal - solo estado PENDIENTE */}
                      {(esAdmin || esAdminSucursal) && order.estado?.toUpperCase() === 'PENDIENTE' && (
                        <button
                          onClick={() => handleOpenCancelar(order)}
                          className="text-red-600 hover:text-red-800 text-xs px-2 py-1 border border-red-600 rounded hover:bg-red-50"
                        >
                          Cancelar
                        </button>
                      )}
                      {/* Botón Ver Historial para administradores, administradores de sucursal y gerentes de país */}
                      {(esAdmin || esAdminSucursal || esGerenteDePais) && (
                        <button
                          onClick={() => handleOpenHistorial(order)}
                          className="text-indigo-600 hover:text-indigo-800 text-xs px-2 py-1 border border-indigo-600 rounded hover:bg-indigo-50"
                        >
                          Ver Historial
                        </button>
                      )}
                      {/* Botón Ver Detalles para todos */}
                      <button
                        onClick={() => handleOpenDetalles(order)}
                        className="text-gray-600 hover:text-gray-800 text-xs px-2 py-1 border border-gray-600 rounded hover:bg-gray-50"
                      >
                        Ver Detalles
                      </button>
                      {/* Botón Comentarios */}
                      <button
                        onClick={() => handleToggleComentarios(order.id)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs px-2 py-1 border border-indigo-600 rounded hover:bg-indigo-50"
                      >
                        Comentarios
                      </button>
                    </div>
                  </td>
                </tr>
                {showComments[order.id] && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                      <div className="space-y-3">
                        <div className="font-medium text-sm text-gray-700 mb-2">Comentarios</div>
                        {(comments[order.id] || []).length === 0 ? (
                          <p className="text-xs text-gray-400">Sin comentarios aún.</p>
                        ) : (
                          <div className="space-y-2">
                            {(comments[order.id] || []).map((c: any) => (
                              <div key={c.id} className="bg-white rounded p-3 border border-gray-200 text-sm">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-gray-800">{c.usuario_nombre}</span>
                                  <span className="text-xs text-gray-400">
                                    {new Date(c.fecha_creacion).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                                  </span>
                                </div>
                                <p className="text-gray-700 whitespace-pre-line">{c.comentario}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 pt-2">
                          <textarea
                            value={commentInput[order.id] || ''}
                            onChange={e => setCommentInput(prev => ({ ...prev, [order.id]: e.target.value }))}
                            placeholder="Escribe un comentario..."
                            rows={2}
                            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                          />
                          <button
                            onClick={() => handleEnviarComentario(order.id)}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 self-end"
                          >
                            Enviar
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Componente de Paginación */}
        <Pagination
          currentPage={paginaActual}
          totalPages={totalPaginas}
          onPageChange={setPaginaActual}
          itemsPerPage={porPagina}
          onItemsPerPageChange={setPorPagina}
          totalItems={totalOrdenes}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-sm text-gray-500 mb-1">Total Órdenes</div>
          <div className="text-3xl font-bold text-mrb-blue">{filteredOrders.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-sm text-gray-500 mb-1">En Progreso</div>
          <div className="text-3xl font-bold text-orange-600">{filteredOrders.filter(o => o.estado?.toLowerCase() === 'en_progreso').length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-sm text-gray-500 mb-1">Completadas</div>
          <div className="text-3xl font-bold text-green-600">{filteredOrders.filter(o => o.estado?.toLowerCase() === 'completada').length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-sm text-gray-500 mb-1">Urgentes</div>
          <div className="text-3xl font-bold text-red-600">{filteredOrders.filter(o => o.prioridad === 'urgente').length}</div>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nueva Orden de Trabajo"
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={creandoOrden}
              className="px-4 py-2 text-sm font-medium text-white bg-mrb-blue rounded-md hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {creandoOrden && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {creandoOrden ? 'Creando...' : 'Crear Orden'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Título *</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-mrb-blue focus:border-mrb-blue sm:text-sm"
              value={formData.titulo}
              onChange={(e) => setFormData({...formData, titulo: e.target.value})}
              placeholder="Ej: Fuga de agua en pasillo A"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Sucursal *</label>
            <select
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-mrb-blue focus:border-mrb-blue sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              value={formData.sucursalId}
              onChange={(e) => setFormData({...formData, sucursalId: Number(e.target.value)})}
              disabled={esAdminSucursal}
            >
              {getSucursalesDisponibles().map(s => (
                <option key={s.id} value={s.id}>{s.nombre} - {s.pais?.nombre}</option>
              ))}
            </select>
            {esGerenteDePais && (
              <p className="mt-1 text-xs text-gray-500">
                Solo se muestran sucursales de tus países asignados
              </p>
            )}
            {esAdminSucursal && (
              <p className="mt-1 text-xs text-gray-500">
                Solo puedes crear órdenes para tu sucursal
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Prioridad *</label>
              <select
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-mrb-blue focus:border-mrb-blue sm:text-sm"
                value={formData.prioridad}
                onChange={(e) => setFormData({...formData, prioridad: e.target.value as any})}
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo *</label>
              <select
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-mrb-blue focus:border-mrb-blue sm:text-sm"
                value={formData.tipo}
                onChange={(e) => setFormData({...formData, tipo: e.target.value as any})}
              >
                <option value="preventivo">Preventivo</option>
                <option value="correctivo">Correctivo</option>
                <option value="emergencia">Emergencia</option>
                <option value="mejora">Mejora</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-mrb-blue focus:border-mrb-blue sm:text-sm"
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              placeholder="Describe el problema o trabajo a realizar..."
            />
          </div>

          <MultipleImageUpload
            label="Fotos Antes *"
            currentImages={formData.evidenciasAntes || []}
            onImagesUploaded={(urls) => setFormData({...formData, evidenciasAntes: urls})}
            maxImages={3}
          />
        </div>
      </Modal>

      {/* Asignar Proveedor Modal */}
      <Modal
        isOpen={isAsignarModalOpen}
        onClose={() => setIsAsignarModalOpen(false)}
        title="Asignar Proveedor a Orden"
        footer={
          <>
            <button
              onClick={() => setIsAsignarModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmarAsignar}
              disabled={asignandoOrden}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {asignandoOrden && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {asignandoOrden ? 'Asignando...' : 'Asignar Proveedor'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {ordenAAsignar && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-blue-900 mb-2">Orden: {ordenAAsignar.numeroOT}</h4>
              <p className="text-sm text-blue-800">{ordenAAsignar.titulo}</p>
              <p className="text-xs text-blue-600 mt-1">Sucursal: {ordenAAsignar.sucursal?.nombre}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Proveedor <span className="text-red-500">*</span>
            </label>
            <select
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={asignarData.proveedorId}
              onChange={(e) => setAsignarData({ ...asignarData, proveedorId: Number(e.target.value) })}
              required
            >
              <option value={0}>Seleccionar proveedor...</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombreEmpresa} - {p.nombre} ({p.pais?.nombre})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fecha Programada <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={asignarData.fechaProgramada}
              onChange={(e) => setAsignarData({ ...asignarData, fechaProgramada: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Costo Estimado (USD)</label>
              <input
                type="number"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={asignarData.costoEstimado}
                onChange={(e) => handleCostoEstimadoChange(Number(e.target.value))}
                min="0"
                step="0.01"
              />
            </div>
            {ordenAAsignar && !getSelectedSucursalInfo(ordenAAsignar.sucursalId)?.esUSD && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Costo Estimado ({getSelectedSucursalInfo(ordenAAsignar.sucursalId)?.moneda || 'Local'})
                </label>
                <input
                  type="number"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={asignarData.costoEstimadoLocal}
                  onChange={(e) => handleCostoEstimadoLocalChange(Number(e.target.value))}
                  min="0"
                  step="0.01"
                />
              </div>
            )}
          </div>

          {/* Categoría SAP - Solo para Administradores */}
          {esAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Categoría SAP
              </label>
              <select
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={asignarData.categoriaSap}
                onChange={(e) => setAsignarData({ ...asignarData, categoriaSap: e.target.value })}
              >
                <option value="">Seleccionar categoría SAP...</option>
                <option value="Reparaciones Generales y Pintura">Reparaciones Generales y Pintura</option>
                <option value="Trabajos y Reparaciones a Infraestructura">Trabajos y Reparaciones a Infraestructura</option>
                <option value="Impermeabilizaciones y sellos">Impermeabilizaciones y sellos</option>
                <option value="Reparaciones e Instalación de Sistema de Corredores y Divisiones">Reparaciones e Instalación de Sistema de Corredores y Divisiones</option>
                <option value="Reparaciones Correctivas de Elevadores y Montacargas">Reparaciones Correctivas de Elevadores y Montacargas</option>
                <option value="Reparación de Rotulación Externa y Fachadas">Reparación de Rotulación Externa y Fachadas</option>
                <option value="Reparación y Mantenimiento de Equipos Especiales (CCTV, Sonido, Acceso, Datos)">Reparación y Mantenimiento de Equipos Especiales (CCTV, Sonido, Acceso, Datos)</option>
              </select>
            </div>
          )}
        </div>
      </Modal>

      {/* Iniciar Orden Modal */}
      <Modal
        isOpen={isIniciarModalOpen}
        onClose={() => setIsIniciarModalOpen(false)}
        title="Iniciar Orden de Trabajo"
        footer={
          <>
            <button
              onClick={() => setIsIniciarModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmarIniciar}
              disabled={iniciandoOrden}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {iniciandoOrden && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {iniciandoOrden ? 'Iniciando...' : 'Iniciar Orden'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {ordenAIniciar && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-green-900 mb-2">Orden: {ordenAIniciar.numeroOT}</h4>
              <p className="text-sm text-green-800">{ordenAIniciar.titulo}</p>
              <p className="text-xs text-green-600 mt-1">Proveedor: {ordenAIniciar.asignadoAProveedor?.nombreEmpresa || 'N/A'}</p>
              <p className="text-xs text-green-600">Fecha programada: {formatearFecha(ordenAIniciar.fechaProgramada)}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Observación Adicional (Opcional)</label>
            <textarea
              rows={4}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              value={iniciarData.observacionAdicional}
              onChange={(e) => setIniciarData({ ...iniciarData, observacionAdicional: e.target.value })}
              placeholder="Agrega cualquier observación o detalle adicional al iniciar el trabajo..."
            />
            <p className="mt-1 text-xs text-gray-500">Esta observación se agregará a la descripción de la orden</p>
          </div>
        </div>
      </Modal>

      {/* Completar Orden Modal */}
      <Modal
        isOpen={isCompletarModalOpen}
        onClose={handleCerrarCompletarModal}
        title="Completar Orden de Trabajo"
        footer={
          <>
            <button
              onClick={handleCerrarCompletarModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmarCompletar}
              disabled={completandoOrden}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {completandoOrden && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {completandoOrden ? 'Completando...' : 'Completar Orden'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {ordenACompletar && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-purple-900 mb-2">Orden: {ordenACompletar.numeroOT}</h4>
              <p className="text-sm text-purple-800">{ordenACompletar.titulo}</p>
              <p className="text-xs text-purple-600 mt-1">Costo estimado: ${ordenACompletar.costoEstimado || 0} USD</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Notas de Resolución</label>
            <textarea
              rows={4}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              value={completarData.notasResolucion}
              onChange={(e) => setCompletarData({ ...completarData, notasResolucion: e.target.value })}
              placeholder="Describe cómo se resolvió el problema, qué se hizo, etc..."
            />
          </div>

          {ordenACompletar?.asignadoAProveedorId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calificación del Servicio
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setCompletarData({ ...completarData, calificacion: rating })}
                    className="focus:outline-none transition-colors"
                  >
                    <Star
                      size={32}
                      className={`${
                        rating <= completarData.calificacion
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      } hover:text-yellow-400 cursor-pointer`}
                    />
                  </button>
                ))}
                {completarData.calificacion > 0 && (
                  <span className="ml-2 text-sm text-gray-600">
                    {completarData.calificacion} de 5 estrellas
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Califica el servicio del proveedor (opcional)
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Costo Real (USD)</label>
              <input
                type="number"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                value={completarData.costoReal}
                onChange={(e) => handleCostoRealChange(Number(e.target.value))}
                min="0"
                step="0.01"
              />
            </div>
            {ordenACompletar && !getSelectedSucursalInfo(ordenACompletar.sucursalId)?.esUSD && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Costo Real ({getSelectedSucursalInfo(ordenACompletar.sucursalId)?.moneda || 'Local'})
                </label>
                <input
                  type="number"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  value={completarData.costoRealLocal}
                  onChange={(e) => handleCostoRealLocalChange(Number(e.target.value))}
                  min="0"
                  step="0.01"
                />
              </div>
            )}
          </div>

          <ImageUpload
            label="Foto Después (Opcional)"
            currentImage={completarData.fotoDespues}
            onImageUploaded={(url) => setCompletarData({ ...completarData, fotoDespues: url })}
          />
        </div>
      </Modal>

      {/* Cancelar Orden Modal */}
      <Modal
        isOpen={isCancelarModalOpen}
        onClose={() => setIsCancelarModalOpen(false)}
        title="Cancelar Orden de Trabajo"
        footer={
          <>
            <button
              onClick={() => setIsCancelarModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cerrar
            </button>
            <button
              onClick={handleConfirmarCancelar}
              disabled={cancelandoOrden}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {cancelandoOrden && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {cancelandoOrden ? 'Cancelando...' : 'Confirmar Cancelación'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {ordenACancelar && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-red-900 mb-2">Orden: {ordenACancelar.numeroOT}</h4>
              <p className="text-sm text-red-800">{ordenACancelar.titulo}</p>
              <p className="text-xs text-red-600 mt-2">⚠️ Esta acción cancelará la orden de trabajo de forma permanente.</p>
            </div>
          )}


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observación <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              value={cancelarData.observacion}
              onChange={(e) => setCancelarData({ ...cancelarData, observacion: e.target.value })}
              placeholder="Explica el motivo de la cancelación (obligatorio para auditoría)..."
              required
            />
          </div>
        </div>
      </Modal>

      {/* Modal de Detalles */}
      <Modal
        isOpen={isDetallesModalOpen}
        onClose={() => setIsDetallesModalOpen(false)}
        title="Detalles de la Orden de Trabajo"
      >
        {ordenDetalles && (
          <div className="space-y-6">
            {/* Header con número y estado */}
            <div className="bg-gradient-to-r from-mrb-blue to-blue-600 text-white rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{ordenDetalles.numeroOT}</h3>
                  <p className="text-blue-100 text-sm mt-1">{ordenDetalles.titulo}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(ordenDetalles.estado)}`}>
                  {formatEstado(ordenDetalles.estado)}
                </span>
              </div>
            </div>

            {/* Información general */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Building size={18} />
                  <span className="text-sm font-medium">Sucursal</span>
                </div>
                <p className="text-gray-900 font-semibold">{ordenDetalles.sucursal?.nombre}</p>
                <p className="text-xs text-gray-500">{ordenDetalles.sucursal?.pais?.nombre}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Tag size={18} />
                  <span className="text-sm font-medium">Categoría</span>
                </div>
                <p className="text-gray-900 font-semibold">{ordenDetalles.categoria || 'N/A'}</p>
                <p className="text-xs text-gray-500">Tipo: {formatPrioridad(ordenDetalles.tipo)}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Clock size={18} />
                  <span className="text-sm font-medium">Fecha Reporte</span>
                </div>
                <p className="text-gray-900 font-semibold">
                  {formatearFecha(ordenDetalles.fechaReporte, true)}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Tag size={18} />
                  <span className="text-sm font-medium">Prioridad</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(ordenDetalles.prioridad)}`}>
                  {formatPrioridad(ordenDetalles.prioridad)}
                </span>
              </div>
            </div>

            {/* Descripción */}
            {ordenDetalles.descripcion && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <FileText size={18} />
                  <span className="text-sm font-medium">Descripción</span>
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{ordenDetalles.descripcion}</p>
              </div>
            )}

            {/* Asignación */}
            {(ordenDetalles.asignadoAUsuario || ordenDetalles.asignadoAProveedor) && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <User size={18} />
                  <span className="text-sm font-medium">Asignación</span>
                </div>
                {ordenDetalles.asignadoAProveedor && (
                  <p className="text-gray-900">
                    <span className="font-semibold">Proveedor:</span> {ordenDetalles.asignadoAProveedor.nombreEmpresa}
                  </p>
                )}
                {ordenDetalles.asignadoAUsuario && (
                  <p className="text-gray-900 mt-1">
                    <span className="font-semibold">Usuario:</span> {ordenDetalles.asignadoAUsuario.nombre} {ordenDetalles.asignadoAUsuario.apellido}
                  </p>
                )}
                {ordenDetalles.fechaProgramada && (
                  <p className="text-gray-700 text-sm mt-2">
                    <span className="font-medium">Fecha programada:</span>{' '}
                    {formatearFecha(ordenDetalles.fechaProgramada)}
                  </p>
                )}
              </div>
            )}

            {/* Costos */}
            {(ordenDetalles.costoEstimado || ordenDetalles.costoReal) && (
              <div className="grid grid-cols-2 gap-4">
                {ordenDetalles.costoEstimado && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-700 mb-2">
                      <DollarSign size={18} />
                      <span className="text-sm font-medium">Costo Estimado</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">${ordenDetalles.costoEstimado} USD</p>
                    {ordenDetalles.costoEstimadoLocal && (
                      <p className="text-sm text-blue-700 mt-1">
                        {ordenDetalles.sucursal?.pais?.moneda} {ordenDetalles.costoEstimadoLocal.toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {ordenDetalles.costoReal && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-green-700 mb-2">
                      <DollarSign size={18} />
                      <span className="text-sm font-medium">Costo Real</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900">${ordenDetalles.costoReal} USD</p>
                    {ordenDetalles.costoRealLocal && (
                      <p className="text-sm text-green-700 mt-1">
                        {ordenDetalles.sucursal?.pais?.moneda} {ordenDetalles.costoRealLocal.toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Fechas de transición */}
            {(ordenDetalles.fechaAsignada || ordenDetalles.fechaIniciada || ordenDetalles.fechaCompletada) && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-3">
                  <Calendar size={18} />
                  <span className="text-sm font-medium">Historial de Fechas</span>
                </div>
                <div className="space-y-2 text-sm">
                  {ordenDetalles.fechaAsignada && (
                    <p className="text-gray-700">
                      <span className="font-medium">Asignada:</span>{' '}
                      {new Date(ordenDetalles.fechaAsignada).toLocaleString('es-ES')}
                    </p>
                  )}
                  {ordenDetalles.fechaIniciada && (
                    <p className="text-gray-700">
                      <span className="font-medium">Iniciada:</span>{' '}
                      {new Date(ordenDetalles.fechaIniciada).toLocaleString('es-ES')}
                    </p>
                  )}
                  {ordenDetalles.fechaCompletada && (
                    <p className="text-gray-700">
                      <span className="font-medium">Completada:</span>{' '}
                      {new Date(ordenDetalles.fechaCompletada).toLocaleString('es-ES')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Notas de resolución */}
            {ordenDetalles.notasResolucion && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <FileText size={18} />
                  <span className="text-sm font-medium">Notas de Resolución</span>
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{ordenDetalles.notasResolucion}</p>
              </div>
            )}

            {/* Fotos Antes */}
            {(ordenDetalles.evidenciasAntes && ordenDetalles.evidenciasAntes.length > 0) && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Fotos Antes ({ordenDetalles.evidenciasAntes.length})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {ordenDetalles.evidenciasAntes.map((foto, index) => (
                    <img
                      key={index}
                      src={uploadsService.getFullImageUrl(foto)}
                      alt={`Antes ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg bg-white border border-gray-300 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(uploadsService.getFullImageUrl(foto), '_blank')}
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW4gbm8gZGlzcG9uaWJsZTwvdGV4dD48L3N2Zz4=';
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Click en una imagen para ampliarla</p>
              </div>
            )}

            {/* Foto Después */}
            {ordenDetalles.fotoDespues && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3">Foto Después</p>
                <img
                  src={uploadsService.getFullImageUrl(ordenDetalles.fotoDespues)}
                  alt="Después"
                  className="w-full md:w-1/2 h-64 object-contain rounded-lg bg-white border border-gray-300 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(uploadsService.getFullImageUrl(ordenDetalles.fotoDespues!), '_blank')}
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW4gbm8gZGlzcG9uaWJsZTwvdGV4dD48L3N2Zz4=';
                  }}
                />
                <p className="text-xs text-gray-500 mt-2">Click en la imagen para ampliarla</p>
              </div>
            )}

            {/* Calificación */}
            {ordenDetalles.calificacion && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 text-yellow-700 mb-2">
                  <Tag size={18} />
                  <span className="text-sm font-medium">Calificación</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="text-2xl">
                      {star <= ordenDetalles.calificacion! ? '⭐' : '☆'}
                    </span>
                  ))}
                  <span className="ml-2 text-gray-700 font-semibold">{ordenDetalles.calificacion}/5</span>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal de Historial */}
      <Modal
        isOpen={isHistorialModalOpen}
        onClose={() => setIsHistorialModalOpen(false)}
        title={ordenDetalles ? `Historial - ${ordenDetalles.numeroOT}` : 'Historial de la Orden'}
      >
        {ordenDetalles && <HistorialOrden ordenId={ordenDetalles.id} />}
      </Modal>
    </div>
  );
};

export default WorkOrders;
