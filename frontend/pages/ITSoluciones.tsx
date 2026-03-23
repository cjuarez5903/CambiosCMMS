import React, { useState, useEffect } from 'react';
import { Monitor, Plus, Search, Edit2, Trash2, Clock, CheckCircle, AlertCircle, X, Save, User, Calendar, MessageSquare, UserPlus, RotateCcw, History, Filter } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
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
  const isITUser = user?.rol?.permisos?.rutas?.includes('it_dashboard') && (user?.rol?.nombre === 'Técnico IT' || user?.rol?.nombre === 'Administrador IT') || user?.permisos?.todo === true;
  const isAdmin = user?.permisos?.todo === true;
  const hasITSoluciones = user?.rol?.permisos?.rutas?.includes('it_soluciones') || user?.permisos?.todo;
  
  // Permissions for actions
  const canAssignTickets = isAdmin || isITUser;
  const canEditTickets = isAdmin || isITUser;
  const canChangeStatus = isAdmin || isITUser;
  const canDeleteTickets = isAdmin || isITUser;
  // Comments: IT users can comment on all tickets, but solicitante/asignado can also comment on their own tickets
  // The actual permission check is done per-ticket in canAddComment
  const canComment = true; // Allow trying to comment, actual check is per ticket
  const canViewComments = true; // Allow trying to view, actual check is per ticket
  const canViewHistory = hasITSoluciones;
  const canManageTickets = isAdmin || isITUser || user?.rol?.permisos?.it_tickets?.crear === true;
  const canManageIT = isAdmin || isITUser; // Solo Admin y personal IT pueden asignar tickets
  
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
    solicitante: '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ticketData = {
        ...formData,
        // Para usuarios no IT, usar su email como solicitante
        solicitante: !isITUser && user?.email ? user.email : formData.solicitante,
        // Para usuarios no IT, no asignar a nadie (IT lo hará después)
        asignado_a: !isITUser ? '' : formData.asignado_a
      };
      
      if (editingTicket) {
        await ticketsService.actualizar(editingTicket.id, ticketData);
      } else {
        await ticketsService.crear(ticketData);
      }
      setShowModal(false);
      setEditingTicket(null);
      setFormData({
        titulo: '',
        descripcion: '',
        prioridad: 'media',
        categoria: 'soporte_tecnico',
        solicitante: '',
        asignado_a: '',
      });
      cargarTickets();
    } catch (error) {
      console.error('Error al guardar ticket:', error);
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
    try {
      await ticketsService.eliminar(id);
      cargarTickets();
    } catch (error) {
      console.error('Error al eliminar ticket:', error);
    }
  };

  const handleAssign = async (ticketId: number, email: string) => {
    try {
      await ticketsService.asignarTicket(ticketId, email);
      cargarTickets();
      setAssignModal({ isOpen: false, ticketId: null, selectedEmail: '' });
    } catch (error) {
      console.error('Error al asignar ticket:', error);
      alert('Error al asignar ticket. Verifica tus permisos e inténtalo nuevamente.');
    }
  };

  const handleChangeStatus = async (ticketId: number, estado: 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado') => {
    try {
      await ticketsService.cambiarEstado(ticketId, estado);
      cargarTickets();
      setStatusModal({ isOpen: false, ticketId: null, currentStatus: '', newStatus: '' });
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  };

  // Funciones para comentarios
  const handleAddComment = async (ticketId: number) => {
    try {
      // Validar permisos antes de agregar comentario
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket || !canAddComment(ticket)) {
        alert('No tienes permiso para agregar comentarios a este ticket.');
        return;
      }
      
      await ticketsService.agregarComentario(ticketId, commentModal.comentario);
      setCommentModal({ isOpen: false, ticketId: null, comentario: '' });
      setTickets(prev =>
        prev.map(t => (t.id === ticketId ? { ...t, comentarios: (t.comentarios || 0) + 1 } : t)),
      );
      cargarComentarios(ticketId); // Recargar comentarios
    } catch (error) {
      console.error('Error al agregar comentario:', error);
      alert('Error al agregar comentario. Inténtalo nuevamente.');
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
      alert('No tienes permiso para ver los comentarios de este ticket.');
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
      case 'hardware': return 'bg-blue-100 text-blue-800';
      case 'software': return 'bg-purple-100 text-purple-800';
      case 'red': return 'bg-orange-100 text-orange-800';
      case 'acceso': return 'bg-indigo-100 text-indigo-800';
      case 'sap': return 'bg-blue-100 text-blue-800';
      case 'sitelink': return 'bg-teal-100 text-teal-800';
      case 'soporte_tecnico': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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
              <option value="hardware">Hardware</option>
              <option value="software">Software</option>
              <option value="red">Red</option>
              <option value="acceso">Acceso</option>
              <option value="sap">SAP</option>
              <option value="sitelink">SiteLink</option>
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
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Vista de tabla para desktop grande */}
        <div className="hidden 2xl:block it-mobile-table overflow-x-auto">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                  <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitante</th>
                  <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      Cargando tickets...
                    </td>
                  </tr>
                ) : ticketsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      No se encontraron tickets
                    </td>
                  </tr>
                ) : (
                  ticketsFiltrados.map((ticket) => (
                    <React.Fragment key={ticket.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{ticket.id}</td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{ticket.titulo}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{ticket.descripcion}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getEstadoIcon(ticket.estado)}
                          <span className="text-sm text-gray-900 capitalize">
                            {ticket.estado.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPrioridadColor(ticket.prioridad)}`}>
                          {ticket.prioridad.toUpperCase()}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoriaColor(ticket.categoria)}`}>
                          {ticket.categoria?.replace('_', ' ').toUpperCase() || 'N/A'}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.solicitante}</td>
                      <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(ticket.fecha_creacion).toLocaleDateString()}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {canEditTickets && (
                            <button
                              onClick={() => handleEdit(ticket)}
                              className="text-mrb-blue hover:text-mrb-blue/80"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          {canAssignTickets && (
                            <button
                              onClick={() => setAssignModal({ isOpen: true, ticketId: ticket.id, selectedEmail: '' })}
                              className="text-green-600 hover:text-green-800"
                            >
                              <UserPlus size={16} />
                            </button>
                          )}
                          {canChangeStatus && (
                            <button
                              onClick={() => setStatusModal({ isOpen: true, ticketId: ticket.id, currentStatus: ticket.estado, newStatus: '' })}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <RotateCcw size={16} />
                            </button>
                          )}
                          {!canComment && (
                            <div className="text-gray-400 flex items-center gap-1" title="No tienes permiso para ver comentarios">
                              <MessageSquare size={16} />
                              <span className="text-xs">🔒</span>
                            </div>
                          )}
                          {canComment && (
                            <button
                              onClick={() => toggleComments(ticket.id)}
                              className="text-purple-600 hover:text-purple-800 flex items-center gap-1"
                            >
                              <MessageSquare size={16} />
                              <span className="text-xs">
                                {showComments[ticket.id]
                                  ? comments.filter(comment => comment.ticket_id === ticket.id).length
                                  : (ticket.comentarios ?? 0)}
                              </span>
                            </button>
                          )}
                          <button
                            onClick={() => toggleHistory(ticket.id)}
                            className="text-orange-600 hover:text-orange-800 flex items-center gap-1"
                            title="Ver historial de cambios"
                          >
                            <History size={16} />
                            <span className="text-xs">
                              {showHistory[ticket.id]
                                ? history.filter(item => item.ticket_id === ticket.id).length
                                : (ticket.historial ?? 0)}
                            </span>
                          </button>
                          {canDeleteTickets && (
                            <button
                              onClick={() => setDeleteConfirm({ isOpen: true, id: ticket.id })}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {showHistory[ticket.id] && (
                      <tr>
                        <td colSpan={8} className="p-4 bg-white border-b">
                          <div className="bg-white rounded-lg shadow-sm p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900">
                                Ticket #{ticket.id} - {ticket.titulo}
                              </h4>
                              <span className="text-sm text-gray-500">
                                Estado actual: <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPrioridadColor(ticket.estado)}`}>
                                  {ticket.estado}
                                </span>
                              </span>
                            </div>
                            {history.filter(h => h.ticket_id === ticket.id).length > 0 ? (
                              <div className="space-y-3 max-h-60 overflow-y-auto">
                                {history.filter(h => h.ticket_id === ticket.id).map((item: any, index: number) => (
                                  <div key={item.id || index} className="flex items-start gap-3">
                                    <div className="flex flex-col items-center">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getHistorialEstadoColor(item.estado_nuevo)}`}>
                                        {getHistorialEstadoIcon(item.estado_nuevo)}
                                      </div>
                                      {index < history.filter(h => h.ticket_id === ticket.id).length - 1 && (
                                        <div className="w-0.5 h-16 bg-gray-300"></div>
                                      )}
                                    </div>
                                    <div className="flex-1 bg-gray-50 rounded-lg p-3">
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                          {item.estado_anterior && (
                                            <>
                                              <span className={`px-2 py-1 rounded text-xs font-medium ${getHistorialEstadoColor(item.estado_anterior)}`}>
                                                {item.estado_anterior}
                                              </span>
                                              <span className="text-gray-400">→</span>
                                            </>
                                          )}
                                          <span className={`px-2 py-1 rounded text-xs font-medium ${getHistorialEstadoColor(item.estado_nuevo)}`}>
                                            {item.estado_nuevo}
                                          </span>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {item.usuario?.nombre || item.usuario?.email || 'Usuario'} - {item.fecha_cambio ? new Date(item.fecha_cambio).toLocaleString() : ''}
                                        </div>
                                      </div>
                                      {item.comentario && (
                                        <p className="text-sm text-gray-600 mt-1">{item.comentario}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm text-center py-4">No hay cambios registrados en el historial</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    {/* Comentarios integrados en tabla */}
                    {showComments[ticket.id] && (
                      <tr>
                        <td colSpan={8} className="p-4 bg-purple-50 border-b">
                          <div className="bg-white rounded-lg shadow-sm p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900">Comentarios del Ticket #{ticket.id}</h4>
                            </div>
                            {comments.filter(c => c.ticket_id === ticket.id).length > 0 ? (
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {comments.filter(c => c.ticket_id === ticket.id).map((c: any) => (
                                  <div key={c.id} className="bg-gray-50 p-3 rounded border">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium text-sm">
                                        {c.usuario?.nombre || c.usuario?.email || 'Usuario'}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {c.fecha_creacion ? new Date(c.fecha_creacion).toLocaleString() : ''}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700">{c.comentario}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No hay comentarios aún.</p>
                            )}
                            {canAddComment(ticket) && (
                              <div className="mt-3 flex gap-2">
                                <input
                                  type="text"
                                  id={`comment-input-${ticket.id}`}
                                  placeholder="Agregar un comentario..."
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      const input = document.getElementById(`comment-input-${ticket.id}`) as HTMLInputElement;
                                      if (input.value.trim()) {
                                        setCommentModal({ isOpen: true, ticketId: ticket.id, comentario: input.value });
                                        input.value = '';
                                      }
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    const input = document.getElementById(`comment-input-${ticket.id}`) as HTMLInputElement;
                                    if (input.value.trim()) {
                                      setCommentModal({ isOpen: true, ticketId: ticket.id, comentario: input.value });
                                      input.value = '';
                                    }
                                  }}
                                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                                >
                                  Enviar
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vista de tarjetas para móvil, tablets y laptops */}
        <div className="2xl:hidden" style={{ display: 'block' }}>
          {loading ? (
            <div className="p-6 text-center text-gray-500">
              Cargando tickets...
            </div>
          ) : ticketsFiltrados.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No se encontraron tickets
            </div>
          ) : (
            <div className="space-y-3">
              {ticketsFiltrados.map((ticket) => (
                <div key={ticket.id} className="it-ticket-card">
                  <div className="it-ticket-header">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">#{ticket.id}</span>
                      <span className={`it-ticket-badge ${getPrioridadColor(ticket.prioridad)}`}>
                        {ticket.prioridad.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="it-ticket-title">{ticket.titulo}</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="it-ticket-meta">
                      <div className="flex items-center gap-1">
                        {getEstadoIcon(ticket.estado)}
                        <span className="text-sm text-gray-900 capitalize">
                          {ticket.estado.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(ticket.fecha_creacion).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-700">
                      <p><strong>Solicitante:</strong> {ticket.solicitante}</p>
                      {ticket.asignado_a && (
                        <p><strong>Asignado a:</strong> {ticket.asignado_a}</p>
                      )}
                    </div>
                    
                    <div className="it-ticket-actions">
                      {canEditTickets && (
                        <button
                          onClick={() => handleEdit(ticket)}
                          className="it-ticket-action-btn text-mrb-blue hover:text-mrb-blue/80"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {canAssignTickets && (
                        <button
                          onClick={() => setAssignModal({ isOpen: true, ticketId: ticket.id, selectedEmail: '' })}
                          className="it-ticket-action-btn text-green-600 hover:text-green-800"
                          title="Asignar"
                        >
                          <UserPlus size={16} />
                        </button>
                      )}
                      {canChangeStatus && (
                        <button
                          onClick={() => setStatusModal({ isOpen: true, ticketId: ticket.id, currentStatus: ticket.estado, newStatus: '' })}
                          className="it-ticket-action-btn text-orange-600 hover:text-orange-800"
                          title="Cambiar estado"
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}
                      {canViewHistory && (
                        <button
                          onClick={() => toggleHistory(ticket.id)}
                          className="text-orange-600 hover:text-orange-800 p-1"
                          title="Historial"
                        >
                          <History size={16} />
                          <span className="ml-1 text-xs">
                            {showHistory[ticket.id]
                              ? history.filter(item => item.ticket_id === ticket.id).length
                              : (ticket.historial ?? 0)}
                          </span>
                        </button>
                      )}
                      {canComment && (
                        <button
                          onClick={() => toggleComments(ticket.id)}
                          className="text-purple-600 hover:text-purple-800 p-1"
                          title="Ver comentarios"
                        >
                          <MessageSquare size={16} />
                          <span className="ml-1 text-xs">
                            {showComments[ticket.id]
                              ? comments.filter(c => c.ticket_id === ticket.id).length
                              : (ticket.comentarios ?? 0)}
                          </span>
                        </button>
                      )}
                      {canDeleteTickets && (
                        <button
                          onClick={() => setDeleteConfirm({ isOpen: true, id: ticket.id })}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
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
                              <div className="font-medium text-xs">{c.usuario?.nombre || c.usuario?.email || 'Usuario'}</div>
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
                          <option value="hardware">Hardware</option>
                          <option value="software">Software</option>
                          <option value="red">Red</option>
                          <option value="acceso">Acceso</option>
                          <option value="sap">SAP</option>
                          <option value="sitelink">SiteLink</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Solicitante</label>
                      <input
                        type="text"
                        required
                        value={formData.solicitante}
                        onChange={(e) => setFormData({ ...formData, solicitante: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mrb-blue focus:border-transparent"
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

      {/* Modal de Confirmación para Eliminar */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={() => {
          if (deleteConfirm.id) {
            handleDelete(deleteConfirm.id);
          }
          setDeleteConfirm({ isOpen: false, id: null });
        }}
        title="Eliminar Ticket"
        message="¿Estás seguro que deseas eliminar este ticket? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />

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
