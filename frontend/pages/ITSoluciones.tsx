import React, { useState, useEffect } from 'react';
import { Monitor, Plus, Search, Edit2, Trash2, Clock, CheckCircle, AlertCircle, X, Save, MessageSquare, UserPlus, RotateCcw, History } from 'lucide-react';
import Swal from 'sweetalert2';
import Pagination from '../src/components/Pagination';
import usuariosService from '../src/services/usuarios.service';
import ticketsService from '../src/services/it-tickets.service';
import { useAuth } from '../src/context/AuthContext';
import '../src/styles/it-mobile.css';

interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
}

interface ITTicketRow {
  id: number;
  titulo: string;
  descripcion: string;
  estado: 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado';
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  categoria: string;
  solicitante: string;
  asignado_a?: string;
  fecha_creacion: string;
  fecha_actualizacion?: string;
  comentarios?: number;
  historial?: number;
}

const ITSoluciones: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<ITTicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<ITTicketRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null,
  });
  const [assignModal, setAssignModal] = useState<{ isOpen: boolean; ticketId: number | null; selectedEmail: string }>({
    isOpen: false,
    ticketId: null,
    selectedEmail: '',
  });
  const [statusModal, setStatusModal] = useState<{ isOpen: boolean; ticketId: number | null; currentStatus: string; newStatus: string }>({
    isOpen: false,
    ticketId: null,
    currentStatus: '',
    newStatus: '',
  });
  const [itUsers, setItUsers] = useState<Usuario[]>([]);
  
  // Estados para comentarios
  const [commentModal, setCommentModal] = useState<{ isOpen: boolean; ticketId: number | null; comentario: string }>({
    isOpen: false,
    ticketId: null,
    comentario: '',
  });
  const [comments, setComments] = useState<any[]>([]);
  const [showComments, setShowComments] = useState<{ [key: number]: boolean }>({});
  
  // Estados para historial
  const [showHistory, setShowHistory] = useState<{ [key: number]: boolean }>({});
  const [history, setHistory] = useState<any[]>([]);
  
  // Estados para filtros avanzados
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [mostrarResueltos, setMostrarResueltos] = useState(false);
  const [filtroAsignacion, setFiltroAsignacion] = useState(''); // Nuevo filtro para asignación
  
  // Check if user has IT permissions
  const isITUser = (user?.rol?.nombre === 'Técnico IT' || user?.rol?.nombre === 'Administrador IT') && user?.rol?.permisos?.rutas?.includes('it_soluciones');
  const isAdmin = user?.permisos?.todo === true && user?.rol?.nombre === 'Administrador';
  const isAdminIT = user?.rol?.nombre === 'Administrador IT';
  const hasITSoluciones = user?.rol?.permisos?.rutas?.includes('it_soluciones');

  // Permisos granulares — los roles IT usan it_tickets.*, Admin usa todo:true como fallback
  const _itPermisos = user?.rol?.permisos?.it_tickets;
  const canAssignTickets  = _itPermisos?.asignar       === true || isAdmin || isAdminIT;
  const canEditTickets    = _itPermisos?.editar         === true || isAdmin || isAdminIT;
  const canChangeStatus   = _itPermisos?.cambiar_estado === true || isAdmin || isAdminIT;
  const canDeleteTickets  = _itPermisos?.eliminar       === true || isAdmin;
  const canComment        = _itPermisos?.comentarios    === true || isAdmin || isAdminIT;
  const canViewComments   = _itPermisos?.comentarios    === true || isAdmin || isAdminIT;
  const canViewHistory    = _itPermisos?.historial      === true || isAdmin || isAdminIT;
  const canManageTickets  = _itPermisos?.crear          === true || isAdmin || isAdminIT;
  const canManageIT       = _itPermisos?.asignar        === true || isAdmin || isAdminIT;
  
  // Estados de paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [totalTickets, setTotalTickets] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'media' as 'baja' | 'media' | 'alta' | 'critica',
    categoria: 'soporte_tecnico',
    solicitante: user?.email || '',
    asignado_a: '',
  });

  useEffect(() => {
    cargarTickets();
    cargarUsuariosIT();
  }, [paginaActual, porPagina, searchTerm, filtroEstado, filtroPrioridad, filtroCategoria, mostrarResueltos, filtroAsignacion]);

  const cargarUsuariosIT = async () => {
    try {
      const usuarios = await usuariosService.obtenerPorRol('Técnico IT');
      setItUsers(usuarios);
    } catch (error) {
      console.error('Error al cargar usuarios IT:', error);
      setItUsers([]);
    }
  };

  const cargarTickets = async () => {
    try {
      setLoading(true);
      // Llamada real a la API - filtrar según rol de usuario
      const params: any = {
        pagina: paginaActual,
        porPagina: porPagina,
        busqueda: searchTerm
      };
      
      // Agregar filtros avanzados
      if (filtroEstado) params.estado = filtroEstado;
      if (filtroPrioridad) params.prioridad = filtroPrioridad;
      if (filtroCategoria) params.categoria = filtroCategoria;
      
      // Filtro de asignación para personal IT
      if (filtroAsignacion === 'no_asignados') {
        params.sin_asignar = true;
      } else if (filtroAsignacion === 'asignados') {
        params.con_asignar = true;
      }
      
      // Si se deben mostrar resueltos, filtrar solo resueltos/cerrados
      if (mostrarResueltos) {
        params.estado_incluir = 'resuelto,cerrado';
      } else {
        // Si no, excluir resueltos y cerrados, pero no si el filtroEstado los requiere
        if (!filtroEstado || (filtroEstado !== 'resuelto' && filtroEstado !== 'cerrado')) {
          params.estado_excluir = 'resuelto,cerrado';
        }
      }
      
      // Para usuarios no-admin, filtrar solo tickets que solicitaron
      // Excepto para Administrador IT que debe ver todos los tickets
      if (!isAdmin && user?.rol?.nombre !== 'Administrador IT' && user?.email) {
        // El backend filtra automáticamente por user.email para solicitante
      }
      
      const response = await ticketsService.listar(params);

      const ticketList: ITTicketRow[] = (response.datos || []) as any;
      // Obtener conteos de comentarios para mostrar sin abrir el panel
      try {
        const ids = ticketList.map(t => t.id).filter(Boolean);
        if (ids.length > 0) {
          const conteos = await ticketsService.obtenerConteoComentarios(ids);
          for (const t of ticketList) {
            t.comentarios = conteos?.[String(t.id)] ?? 0;
          }
        }
      } catch (e) {
        // Si falla el conteo, no romper la pantalla
      }

      // Obtener conteos de historial para mostrar sin abrir el panel
      try {
        const ids = ticketList.map(t => t.id).filter(Boolean);
        if (ids.length > 0) {
          const conteosHistorial = await ticketsService.obtenerConteoHistorial(ids);
          for (const t of ticketList) {
            t.historial = conteosHistorial?.[String(t.id)] ?? 0;
          }
        }
      } catch (e) {
        // Si falla el conteo, no romper la pantalla
      }

      setTickets(ticketList);
      setTotalTickets(response.total || 0);
      setTotalPaginas(response.totalPaginas || 1);
    } catch (error) {
      console.error('Error al cargar tickets:', error);
      setTickets([]);
      setTotalTickets(0);
      setTotalPaginas(1);
    } finally {
      setLoading(false);
    }
  };

  const toast = (icon: 'success' | 'error' | 'warning' | 'info', title: string) =>
    Swal.fire({ toast: true, position: 'top-end', icon, title, showConfirmButton: false, timer: 2800, timerProgressBar: true });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ticketData = {
        ...formData,
        solicitante: !isITUser && user?.email ? user.email : formData.solicitante,
        asignado_a: !isITUser ? '' : formData.asignado_a
      };
      if (editingTicket) {
        await ticketsService.actualizar(editingTicket.id, ticketData);
        toast('success', 'Ticket actualizado correctamente');
      } else {
        await ticketsService.crear(ticketData);
        toast('success', 'Ticket creado correctamente');
      }
      setShowModal(false);
      setEditingTicket(null);
      setFormData({ titulo: '', descripcion: '', prioridad: 'media', categoria: 'soporte_tecnico', solicitante: user?.email || '', asignado_a: '' });
      cargarTickets();
    } catch (error) {
      console.error('Error al guardar ticket:', error);
      toast('error', 'Error al guardar el ticket');
    }
  };

  const handleEdit = (ticket: ITTicketRow) => {
    setEditingTicket(ticket);
    setFormData({
      titulo: ticket.titulo,
      descripcion: ticket.descripcion,
      prioridad: ticket.prioridad,
      categoria: ticket.categoria,
      solicitante: ticket.solicitante,
      asignado_a: ticket.asignado_a || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: '¿Eliminar ticket?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    try {
      await ticketsService.eliminar(id);
      toast('success', 'Ticket eliminado');
      cargarTickets();
    } catch (error) {
      console.error('Error al eliminar ticket:', error);
      toast('error', 'Error al eliminar el ticket');
    }
  };

  const handleAssign = async (ticketId: number, email: string) => {
    try {
      await ticketsService.asignarTicket(ticketId, email);
      toast('success', `Ticket asignado a ${email.split('@')[0]}`);
      cargarTickets();
      setAssignModal({ isOpen: false, ticketId: null, selectedEmail: '' });
    } catch (error) {
      console.error('Error al asignar ticket:', error);
      toast('error', 'Error al asignar ticket. Verifica tus permisos.');
    }
  };

  const estadoLabel: Record<string, string> = {
    abierto: 'Abierto', en_progreso: 'En Progreso', resuelto: 'Resuelto', cerrado: 'Cerrado'
  };

  const handleChangeStatus = async (ticketId: number, estado: 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado') => {
    try {
      await ticketsService.cambiarEstado(ticketId, estado);
      toast('success', `Estado cambiado a: ${estadoLabel[estado] ?? estado}`);
      cargarTickets();
      setStatusModal({ isOpen: false, ticketId: null, currentStatus: '', newStatus: '' });
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast('error', 'Error al cambiar el estado');
    }
  };

  // Funciones para comentarios
  const handleAddComment = async (ticketId: number) => {
    try {
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket || !canAddComment(ticket)) {
        toast('warning', 'No tienes permiso para comentar en este ticket.');
        return;
      }
      await ticketsService.agregarComentario(ticketId, commentModal.comentario);
      setCommentModal({ isOpen: false, ticketId: null, comentario: '' });
      setTickets(prev => prev.map(t => (t.id === ticketId ? { ...t, comentarios: (t.comentarios || 0) + 1 } : t)));
      toast('success', 'Comentario agregado');
      cargarComentarios(ticketId);
      if (showHistory[ticketId]) cargarHistorial(ticketId);
    } catch (error) {
      console.error('Error al agregar comentario:', error);
      toast('error', 'Error al agregar el comentario');
    }
  };

  const cargarComentarios = async (ticketId: number) => {
    try {
      const data = await ticketsService.obtenerComentarios(ticketId);
      // El backend devuelve { exito: true, datos: [...] }, necesitamos manejar ambos casos
      const comentarios = Array.isArray(data) ? data : (data as any)?.datos || [];
      console.log('📝 Comentarios cargados para ticket', ticketId, ':', comentarios);
      setComments(comentarios);
      setTickets(prev => prev.map(t => (t.id === ticketId ? { ...t, comentarios: comentarios.length } : t)));
    } catch (error) {
      console.error('Error al cargar comentarios:', error);
    }
  };

  const toggleComments = async (ticketId: number) => {
    // Verificar si el usuario puede ver comentarios de este ticket
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    // Allow if user is IT, admin, or is solicitante/asignado of the ticket
    // Use lowercase comparison for emails to avoid casing issues
    const userEmail = user?.email?.toLowerCase();
    const ticketSolicitante = ticket.solicitante?.toLowerCase();
    const ticketAsignado = ticket.asignado_a?.toLowerCase();
    const puedeVerComentarios = canViewComments && (hasITSoluciones || user?.permisos?.todo === true || ticketSolicitante === userEmail || ticketAsignado === userEmail);
    
    console.log('🔍 Permission check for comments:', {
      userEmail,
      ticketSolicitante,
      ticketAsignado,
      hasITSoluciones,
      isAdmin: user?.permisos?.todo,
      puedeVerComentarios
    });
    
    if (!puedeVerComentarios) {
      toast('warning', 'No tienes permiso para ver los comentarios de este ticket.');
      return;
    }
    
    const newState = !showComments[ticketId];
    // Solo un ticket abierto a la vez (y cerrar historial)
    setShowHistory({});
    setShowComments(newState ? { [ticketId]: true } : {});
    
    if (newState) {
      await cargarComentarios(ticketId);
    }
  };

  // Funciones para historial
  const toggleHistory = async (ticketId: number) => {
    const newState = !showHistory[ticketId];
    // Solo un ticket abierto a la vez (y cerrar comentarios)
    setShowComments({});
    setShowHistory(newState ? { [ticketId]: true } : {});
    
    if (newState) {
      await cargarHistorial(ticketId);
    }
  };

  const cargarHistorial = async (ticketId: number) => {
    try {
      const historialData = await ticketsService.obtenerHistorial(ticketId);
      setHistory(historialData);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  };

  const getHistorialEstadoColor = (estado: string) => {
    switch (estado) {
      case 'abierto': return 'text-red-600 bg-red-100';
      case 'en_progreso': return 'text-yellow-600 bg-yellow-100';
      case 'resuelto': return 'text-green-600 bg-green-100';
      case 'cerrado': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHistorialEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'abierto': return <AlertCircle className="w-3 h-3" />;
      case 'en_progreso': return <Clock className="w-3 h-3" />;
      case 'resuelto': return <CheckCircle className="w-3 h-3" />;
      case 'cerrado': return <CheckCircle className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  const canViewCommentsDetailed = (ticket: ITTicketRow) => {
    const isAdmin = user?.permisos?.todo === true;
    const isIT = user?.rol?.permisos?.rutas?.includes('it_soluciones') || false;
    const isSolicitante = ticket.solicitante === user?.email;
    const isAsignado = ticket.asignado_a === user?.email;
    return isAdmin || isIT || isSolicitante || isAsignado;
  };

  const canAddComment = (ticket: any): boolean => {
    // Admin e IT pueden agregar comentarios a todos
    if (isAdmin || isITUser) return true;
    
    // Solicitante y asignado pueden agregar comentarios
    const userEmail = user?.email?.toLowerCase();
    const solicitante = ticket.solicitante?.toLowerCase();
    const asignado = ticket.asignado_a?.toLowerCase();
    
    return userEmail === solicitante || userEmail === asignado;
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'abierto':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'en_progreso':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'resuelto':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cerrado':
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'abierto': return 'bg-red-100 text-red-800';
      case 'en_progreso': return 'bg-yellow-100 text-yellow-800';
      case 'resuelto': return 'bg-green-100 text-green-800';
      case 'cerrado': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
      case 'soporte_tecnico': return 'bg-gray-100 text-gray-800';
      case 'planta_telefonica': return 'bg-cyan-100 text-cyan-800';
      case 'office_correo': return 'bg-blue-100 text-blue-800';
      case 'bitrix': return 'bg-violet-100 text-violet-800';
      case 'callguru': return 'bg-pink-100 text-pink-800';
      case 'sap': return 'bg-amber-100 text-amber-800';
      case 'sitelink': return 'bg-teal-100 text-teal-800';
      case 'red_internet': return 'bg-orange-100 text-orange-800';
      case 'acceso_credenciales': return 'bg-indigo-100 text-indigo-800';
      case 'otro': return 'bg-slate-100 text-slate-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPrioridadBorder = (prioridad: string) => {
    switch (prioridad?.toLowerCase()) {
      case 'critica': return 'border-l-4 border-red-500';
      case 'alta':    return 'border-l-4 border-orange-400';
      case 'media':   return 'border-l-4 border-yellow-300';
      case 'baja':    return 'border-l-4 border-green-400';
      default:        return 'border-l-4 border-transparent';
    }
  };

  const ticketsFiltrados = tickets; // Ya no se necesita filtrado local

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Monitor className="w-8 h-8 text-mrb-blue" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isAdmin ? 'Tickets' : 'IT Soluciones'}
            </h1>
            <p className="text-gray-600">
              {isAdmin ? 'Gestión de todos los tickets del sistema' : 'Gestión de tickets de soporte técnico'}
            </p>
          </div>
        </div>
        {canManageTickets && (
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-mrb-blue text-white rounded-lg hover:bg-mrb-blue/90 transition-colors"
        >
          <Plus size={20} />
          Nuevo Ticket
        </button>
      )}
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mrb-blue focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Filtros avanzados */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mrb-blue focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              <option value="abierto">Abierto</option>
              <option value="en_progreso">En Progreso</option>
              <option value="resuelto">Resuelto</option>
              <option value="cerrado">Cerrado</option>
            </select>
            
            <select
              value={filtroPrioridad}
              onChange={(e) => setFiltroPrioridad(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mrb-blue focus:border-transparent"
            >
              <option value="">Todas las prioridades</option>
              <option value="critica">Crítica</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
            
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mrb-blue focus:border-transparent"
            >
              <option value="">Todas las categorías</option>
              <option value="soporte_tecnico">Soporte Técnico</option>
              <option value="planta_telefonica">Planta Telefónica</option>
              <option value="office_correo">Office/Correo</option>
              <option value="bitrix">Bitrix</option>
              <option value="callguru">Callguru</option>
              <option value="sap">SAP</option>
              <option value="sitelink">SiteLink</option>
              <option value="red_internet">Red/Internet</option>
              <option value="acceso_credenciales">Acceso/Credenciales</option>
              <option value="otro">Otro</option>
            </select>
            
            {/* Filtro de asignación - solo para personal IT */}
            {(isAdmin || isITUser) && (
              <select
                value={filtroAsignacion}
                onChange={(e) => setFiltroAsignacion(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mrb-blue focus:border-transparent"
              >
                <option value="">Todos los tickets</option>
                <option value="no_asignados">No Asignados</option>
                <option value="asignados">Asignados</option>
              </select>
            )}
            
            <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarResueltos}
                onChange={(e) => setMostrarResueltos(e.target.checked)}
                className="rounded text-mrb-blue focus:ring-mrb-blue"
              />
              <span className="text-sm">Solo resueltos</span>
            </label>
          </div>
        </div>
      </div>

      {/* Lista de Tickets */}
      <div className="bg-white rounded-lg shadow-sm">
        <div>
          {loading ? (
            <div className="p-6 text-center text-gray-500">
              Cargando tickets...
            </div>
          ) : ticketsFiltrados.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No se encontraron tickets
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {ticketsFiltrados.map((ticket) => (
                <div key={ticket.id} className={`p-4 md:py-3 hover:bg-gray-50 transition-colors ${getPrioridadBorder(ticket.prioridad)}`}>
                  <div className="flex flex-col md:flex-row md:items-start md:gap-6">
                    {/* Columna izquierda: ID + Título + Descripción */}
                    <div className="flex-1 min-w-0 mb-2 md:mb-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-gray-400">#{ticket.id}</span>
                        <span className="text-xs text-gray-400 md:hidden">{new Date(ticket.fecha_creacion).toLocaleDateString()}</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-900 truncate">{ticket.titulo}</div>
                      <div className="text-xs text-gray-500 line-clamp-2 mt-0.5">{ticket.descripcion}</div>
                    </div>
                    {/* Columna derecha: fecha (md+) + badges + solicitante + botones */}
                    <div className="flex flex-col gap-1.5 md:items-end md:shrink-0 md:min-w-[260px]">
                      <span className="hidden md:block text-xs text-gray-400 self-end">
                        {new Date(ticket.fecha_creacion).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1">
                          {getEstadoIcon(ticket.estado)}
                          <span className="text-xs text-gray-700 capitalize">{ticket.estado.replace('_', ' ')}</span>
                        </div>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getPrioridadColor(ticket.prioridad)}`}>
                          {ticket.prioridad.toUpperCase()}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getCategoriaColor(ticket.categoria)}`}>
                          {ticket.categoria?.replace('_', ' ').toUpperCase() || 'N/A'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {ticket.solicitante}
                        {ticket.asignado_a && <span className="ml-2 text-gray-400">→ {ticket.asignado_a}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {canEditTickets && (
                          <button onClick={() => handleEdit(ticket)} title="Editar"
                            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                            <Edit2 size={15} />
                          </button>
                        )}
                        {canAssignTickets && (
                          <button onClick={() => setAssignModal({ isOpen: true, ticketId: ticket.id, selectedEmail: '' })} title="Asignar"
                            className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                            <UserPlus size={15} />
                          </button>
                        )}
                        {canChangeStatus && (
                          <button onClick={() => setStatusModal({ isOpen: true, ticketId: ticket.id, currentStatus: ticket.estado, newStatus: '' })} title="Cambiar estado"
                            className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                            <RotateCcw size={15} />
                          </button>
                        )}
                        <button onClick={() => toggleHistory(ticket.id)} title="Historial"
                          className="p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors flex items-center gap-1">
                          <History size={15} />
                          <span className="text-xs font-medium">{showHistory[ticket.id] ? history.filter(h => h.ticket_id === ticket.id).length : (ticket.historial ?? 0)}</span>
                        </button>
                        {canComment && (
                          <button onClick={() => toggleComments(ticket.id)} title="Comentarios"
                            className="p-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors flex items-center gap-1">
                            <MessageSquare size={15} />
                            <span className="text-xs font-medium">{showComments[ticket.id] ? comments.filter(c => c.ticket_id === ticket.id).length : (ticket.comentarios ?? 0)}</span>
                          </button>
                        )}
                        {canDeleteTickets && (
                          <button onClick={() => handleDelete(ticket.id)} title="Eliminar"
                            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Historial integrado en vista de tarjetas */}
                  {showHistory[ticket.id] && (
                    <div className="mt-2 p-3 bg-white rounded-lg shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 text-sm">Historial de Cambios</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPrioridadColor(ticket.estado)}`}>
                          {ticket.estado}
                        </span>
                      </div>
                      {history.filter(h => h.ticket_id === ticket.id).length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {history.filter(h => h.ticket_id === ticket.id).map((item: any, index: number) => (
                            <div key={item.id || index} className="flex items-start gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${getHistorialEstadoColor(item.estado_nuevo)}`}>
                                {getHistorialEstadoIcon(item.estado_nuevo)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-1 flex-wrap">
                                  {item.estado_anterior && (
                                    <>
                                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getHistorialEstadoColor(item.estado_anterior)}`}>
                                        {item.estado_anterior}
                                      </span>
                                      <span className="text-gray-400 text-xs">→</span>
                                    </>
                                  )}
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getHistorialEstadoColor(item.estado_nuevo)}`}>
                                    {item.estado_nuevo}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {item.fecha_cambio ? new Date(item.fecha_cambio).toLocaleString() : ''}
                                </div>
                                {item.comentario && (
                                  <p className="text-xs text-gray-600 mt-0.5">{item.comentario}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">Sin registros.</p>
                      )}
                    </div>
                  )}
                  {/* Comentarios integrados en vista de tarjetas */}
                  {showComments[ticket.id] && (
                    <div className="mt-2 p-3 bg-purple-50 rounded-lg">
                      <div className="font-medium text-sm mb-2">Comentarios</div>
                      {comments.filter(c => c.ticket_id === ticket.id).length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {comments.filter(c => c.ticket_id === ticket.id).map((c: any) => (
                            <div key={c.id} className="bg-white p-2 rounded text-sm">
                              <div className="font-medium text-xs">{c.nombre_usuario || c.usuario_email || 'Usuario'}</div>
                              <p className="text-gray-700">{c.comentario}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">Sin comentarios.</p>
                      )}
                      {canAddComment(ticket) && (
                        <div className="mt-2 flex gap-1">
                          <input
                            type="text"
                            id={`comment-input-card-${ticket.id}`}
                            placeholder="Comentar..."
                            className="flex-1 px-2 py-1 border rounded text-sm"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                const input = document.getElementById(`comment-input-card-${ticket.id}`) as HTMLInputElement;
                                if (input.value.trim()) {
                                  setCommentModal({ isOpen: true, ticketId: ticket.id, comentario: input.value });
                                  input.value = '';
                                }
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              const input = document.getElementById(`comment-input-card-${ticket.id}`) as HTMLInputElement;
                              if (input.value.trim()) {
                                setCommentModal({ isOpen: true, ticketId: ticket.id, comentario: input.value });
                                input.value = '';
                              }
                            }}
                            className="px-3 py-1 bg-purple-600 text-white rounded text-sm"
                          >
                            →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {tickets.length} de {totalTickets} tickets
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaginaActual(paginaActual - 1)}
                disabled={paginaActual === 1}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Anterior
              </button>
              <span className="px-3 py-1 text-sm">
                Página {paginaActual} de {totalPaginas}
              </span>
              <button
                onClick={() => setPaginaActual(paginaActual + 1)}
                disabled={paginaActual === totalPaginas}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Crear/Editar Ticket */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {editingTicket ? 'Editar Ticket' : 'Nuevo Ticket'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                      <input
                        type="text"
                        required
                        value={formData.titulo}
                        onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mrb-blue focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                      <textarea
                        required
                        rows={3}
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mrb-blue focus:border-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                        <select
                          value={formData.prioridad}
                          onChange={(e) => setFormData({ ...formData, prioridad: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mrb-blue focus:border-transparent"
                        >
                          <option value="baja">Baja</option>
                          <option value="media">Media</option>
                          <option value="alta">Alta</option>
                          <option value="critica">Crítica</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                        <select
                          value={formData.categoria}
                          onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mrb-blue focus:border-transparent"
                        >
                          <option value="soporte_tecnico">Soporte Técnico</option>
                          <option value="planta_telefonica">Planta Telefónica</option>
                          <option value="office_correo">Office/Correo</option>
                          <option value="bitrix">Bitrix</option>
                          <option value="callguru">Callguru</option>
                          <option value="sap">SAP</option>
                          <option value="sitelink">SiteLink</option>
                          <option value="red_internet">Red/Internet</option>
                          <option value="acceso_credenciales">Acceso/Credenciales</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Solicitante</label>
                      <input
                        type="text"
                        required
                        readOnly
                        value={formData.solicitante}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                    {canManageIT && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Asignado a</label>
                      <select
                        value={formData.asignado_a}
                        onChange={(e) => setFormData({ ...formData, asignado_a: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mrb-blue focus:border-transparent"
                      >
                        <option value="">Seleccionar usuario IT</option>
                        {itUsers.map((usuario) => (
                          <option key={usuario.id} value={usuario.email}>
                            {usuario.nombre} {usuario.apellido} ({usuario.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-mrb-blue text-base font-medium text-white hover:bg-mrb-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mrb-blue sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    <Save size={16} className="mr-2" />
                    {editingTicket ? 'Actualizar' : 'Crear'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mrb-blue sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Eliminación con Swal — no se necesita modal separado */}

      {/* Modal para Asignar Ticket */}
      {assignModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setAssignModal({ isOpen: false, ticketId: null })}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Asignar Ticket</h3>
                  <button
                    type="button"
                    onClick={() => setAssignModal({ isOpen: false, ticketId: null, selectedEmail: '' })}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mrb-blue focus:border-transparent"
                      value={assignModal.selectedEmail}
                      onChange={(e) => setAssignModal({ ...assignModal, selectedEmail: e.target.value })}
                    >
                      <option value="">Seleccionar usuario IT</option>
                      {itUsers.map((usuario) => (
                        <option key={usuario.id} value={usuario.email}>
                          {usuario.nombre} {usuario.apellido} ({usuario.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => {
                    if (assignModal.ticketId && assignModal.selectedEmail) {
                      handleAssign(assignModal.ticketId, assignModal.selectedEmail);
                    }
                  }}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-mrb-blue text-base font-medium text-white hover:bg-mrb-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mrb-blue sm:ml-3 sm:w-auto sm:text-sm"
                >
                  <UserPlus size={16} className="mr-2" />
                  Asignar
                </button>
                <button
                  type="button"
                  onClick={() => setAssignModal({ isOpen: false, ticketId: null, selectedEmail: '' })}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mrb-blue sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Cambiar Estado */}
      {statusModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setStatusModal({ isOpen: false, ticketId: null, currentStatus: '' })}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Cambiar Estado</h3>
                  <button
                    type="button"
                    onClick={() => setStatusModal({ isOpen: false, ticketId: null, currentStatus: '' })}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo Estado</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mrb-blue focus:border-transparent"
                      value={statusModal.newStatus}
                      onChange={(e) => setStatusModal({ ...statusModal, newStatus: e.target.value })}
                    >
                      <option value="">Seleccionar estado</option>
                      <option value="abierto">Abierto</option>
                      <option value="en_progreso">En Progreso</option>
                      <option value="resuelto">Resuelto</option>
                      <option value="cerrado">Cerrado</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => {
                    if (statusModal.ticketId && statusModal.newStatus) {
                      handleChangeStatus(statusModal.ticketId, statusModal.newStatus as 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado');
                    }
                  }}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-mrb-blue text-base font-medium text-white hover:bg-mrb-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mrb-blue sm:ml-3 sm:w-auto sm:text-sm"
                >
                  <RotateCcw size={16} className="mr-2" />
                  Cambiar Estado
                </button>
                <button
                  type="button"
                  onClick={() => setStatusModal({ isOpen: false, ticketId: null, currentStatus: '', newStatus: '' })}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mrb-blue sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botones flotantes para acciones rápidas */}
      {(Object.keys(showComments).some(ticketId => showComments[parseInt(ticketId)]) || 
        Object.keys(showHistory).some(ticketId => showHistory[parseInt(ticketId)])) && (
        <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
          {/* Botón de historial */}
          {Object.keys(showHistory).some(ticketId => showHistory[parseInt(ticketId)]) && (
            <button
              onClick={() => {
                const firstOpenTicket = tickets.find(ticket => showHistory[ticket.id]);
                if (firstOpenTicket) {
                  toggleHistory(firstOpenTicket.id);
                }
              }}
              className="bg-orange-600 text-white rounded-full p-3 shadow-lg hover:bg-orange-700 transition-colors"
              title="Ver historial"
            >
              <History size={20} />
            </button>
          )}
          
          {/* Botón de comentarios */}
          {Object.keys(showComments).some(ticketId => showComments[parseInt(ticketId)]) && (
            <button
              onClick={() => {
                const firstOpenTicket = tickets.find(ticket => showComments[ticket.id]);
                if (firstOpenTicket && canAddComment(firstOpenTicket)) {
                  setCommentModal({ isOpen: true, ticketId: firstOpenTicket.id, comentario: '' });
                }
              }}
              className="bg-purple-600 text-white rounded-full p-3 shadow-lg hover:bg-purple-700 transition-colors"
              title="Agregar comentario rápido"
            >
              <MessageSquare size={20} />
            </button>
          )}
        </div>
      )}

      {/* Modal para Agregar Comentario */}
      {commentModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setCommentModal({ isOpen: false, ticketId: null, comentario: '' })}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Agregar Comentario</h3>
                  <button
                    onClick={() => setCommentModal({ isOpen: false, ticketId: null, comentario: '' })}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comentario
                    </label>
                    <textarea
                      rows={4}
                      value={commentModal.comentario}
                      onChange={(e) => setCommentModal(prev => ({ ...prev, comentario: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-mrb-blue focus:border-transparent"
                      placeholder="Escribe tu comentario aquí..."
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => handleAddComment(commentModal.ticketId!)}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-600 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Agregar Comentario
                </button>
                <button
                  type="button"
                  onClick={() => setCommentModal({ isOpen: false, ticketId: null, comentario: '' })}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mrb-blue sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ITSoluciones;
