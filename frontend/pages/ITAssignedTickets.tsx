import React, { useState, useEffect } from 'react';
import { Monitor, Clock, CheckCircle, AlertCircle, X, Save, User, Calendar, MessageSquare, UserPlus, RotateCcw, History, Filter, Search } from 'lucide-react';
import { useAuth } from '../src/context/AuthContext';
import ticketsService from '../src/services/it-tickets.service';

interface ITTicket {
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
  historial?: number;
}

const ITAssignedTickets: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<ITTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<ITTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [showComments, setShowComments] = useState<{ [key: number]: boolean }>({});
  const [showHistory, setShowHistory] = useState<{ [key: number]: boolean }>({});
  const [comments, setComments] = useState<{ [key: number]: any[] }>({});
  const [history, setHistory] = useState<{ [key: number]: any[] }>({});
  const [loadingHistory, setLoadingHistory] = useState<{ [key: number]: boolean }>({});
  const [loadingComments, setLoadingComments] = useState<{ [key: number]: boolean }>({});
  const [newComment, setNewComment] = useState<{ [key: number]: string }>({});

  // Verificar si el usuario es IT
  const isITUser = user?.rol?.permisos?.rutas?.includes('it_soluciones') || user?.permisos?.todo === true;

  useEffect(() => {
    if (isITUser) {
      cargarTicketsAsignados();
    }
  }, []);

  useEffect(() => {
    filtrarTickets();
  }, [tickets, searchTerm, filtroEstado, filtroPrioridad]);

  const cargarTicketsAsignados = async () => {
    try {
      setLoading(true);
      const response = await ticketsService.listar({
        porPagina: 100,
        asignado_a: user?.email
      });
      const ticketList = response.datos || [];

      // Obtener conteos de historial para mostrar
      try {
        const ids = ticketList.map(t => t.id).filter(Boolean);
        if (ids.length > 0) {
          const conteosHistorial = await ticketsService.obtenerConteoHistorial(ids);
          for (const t of ticketList) {
            (t as any).historial = conteosHistorial?.[String(t.id)] ?? 0;
          }
        }
      } catch (e) {
        // Si falla el conteo, no romper la pantalla
      }

      setTickets(ticketList);
    } catch (error) {
      console.error('Error al cargar tickets asignados:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const filtrarTickets = () => {
    let filtrados = tickets;

    // Filtrar por búsqueda
    if (searchTerm) {
      filtrados = filtrados.filter(ticket =>
        ticket.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.solicitante.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por estado
    if (filtroEstado) {
      filtrados = filtrados.filter(ticket => ticket.estado === filtroEstado);
    }

    // Filtrar por prioridad
    if (filtroPrioridad) {
      filtrados = filtrados.filter(ticket => ticket.prioridad === filtroPrioridad);
    }

    setFilteredTickets(filtrados);
  };

  const toggleComments = async (ticketId: number) => {
    const isOpen = showComments[ticketId];
    setShowComments(prev => ({ ...prev, [ticketId]: !isOpen }));

    if (!isOpen && !comments[ticketId]) {
      setLoadingComments(prev => ({ ...prev, [ticketId]: true }));
      try {
        const data = await ticketsService.obtenerComentarios(ticketId);
        setComments(prev => ({ ...prev, [ticketId]: Array.isArray(data) ? data : (data as any)?.datos || [] }));
      } catch (e) {
        setComments(prev => ({ ...prev, [ticketId]: [] }));
      } finally {
        setLoadingComments(prev => ({ ...prev, [ticketId]: false }));
      }
    }
  };

  const toggleHistorial = async (ticketId: number) => {
    const isOpen = showHistory[ticketId];
    setShowHistory(prev => ({ ...prev, [ticketId]: !isOpen }));

    // Si se está abriendo y no hay datos cargados, cargarlos
    if (!isOpen && !history[ticketId]) {
      setLoadingHistory(prev => ({ ...prev, [ticketId]: true }));
      try {
        const data = await ticketsService.obtenerHistorial(ticketId);
        setHistory(prev => ({ ...prev, [ticketId]: Array.isArray(data) ? data : (data as any)?.datos || [] }));
      } catch (e) {
        setHistory(prev => ({ ...prev, [ticketId]: [] }));
      } finally {
        setLoadingHistory(prev => ({ ...prev, [ticketId]: false }));
      }
    }
  };

  const enviarComentario = async (ticketId: number) => {
    const comentario = newComment[ticketId]?.trim();
    if (!comentario) return;
    
    try {
      await ticketsService.agregarComentario(ticketId, comentario);
      setNewComment(prev => ({ ...prev, [ticketId]: '' }));
      // Recargar comentarios
      const data = await ticketsService.obtenerComentarios(ticketId);
      setComments(prev => ({ ...prev, [ticketId]: Array.isArray(data) ? data : (data as any)?.datos || [] }));
    } catch (error) {
      console.error('Error al agregar comentario:', error);
    }
  };

  const cambiarEstado = async (ticketId: number, estado: 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado') => {
    try {
      await ticketsService.cambiarEstado(ticketId, estado);
      cargarTicketsAsignados();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'abierto': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'en_progreso': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'resuelto': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cerrado': return <CheckCircle className="w-4 h-4 text-gray-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'critica': return 'bg-red-100 text-red-800';
      case 'alta': return 'bg-orange-100 text-orange-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'baja': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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

  // Funciones para historial (mismo estilo que ITSoluciones)
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

  // Estadísticas
  const stats = {
    total: filteredTickets.length,
    abiertos: filteredTickets.filter(t => t.estado === 'abierto').length,
    enProgreso: filteredTickets.filter(t => t.estado === 'en_progreso').length,
    resueltos: filteredTickets.filter(t => t.estado === 'resuelto').length,
    criticos: filteredTickets.filter(t => t.prioridad === 'critica').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Cargando tickets asignados...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div className="flex items-center gap-3">
          <Monitor className="w-8 h-8 text-mrb-blue" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Mis Tickets Asignados</h2>
            <p className="text-gray-500">Tickets asignados a ti para gestión.</p>
          </div>
        </div>
        <button
          onClick={() => window.location.hash = '/it-soluciones'}
          className="flex items-center gap-2 px-4 py-2 bg-mrb-blue text-white rounded-lg hover:bg-mrb-blue/90 transition-colors"
        >
          <UserPlus size={20} />
          Ver Todos
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
            <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Monitor className="text-mrb-blue" size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Abiertos</p>
              <p className="text-2xl font-bold text-red-600">{stats.abiertos}</p>
            </div>
            <div className="h-10 w-10 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertCircle className="text-red-500" size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">En Progreso</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.enProgreso}</p>
            </div>
            <div className="h-10 w-10 bg-yellow-50 rounded-lg flex items-center justify-center">
              <Clock className="text-yellow-500" size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Resueltos</p>
              <p className="text-2xl font-bold text-green-600">{stats.resueltos}</p>
            </div>
            <div className="h-10 w-10 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-500" size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Críticos</p>
              <p className="text-2xl font-bold text-orange-600">{stats.criticos}</p>
            </div>
            <div className="h-10 w-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <AlertCircle className="text-orange-500" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4">
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
          </div>
        </div>
      </div>

    {/* Tickets Table */}
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Vista de tabla para desktop */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
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
              {filteredTickets.map((ticket) => (
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
                        {ticket.categoria.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.solicitante}</td>
                    <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(ticket.fecha_creacion).toLocaleDateString()}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => cambiarEstado(ticket.id, 'en_progreso')}
                          disabled={ticket.estado === 'en_progreso' || ticket.estado === 'resuelto' || ticket.estado === 'cerrado'}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Marcar en progreso"
                        >
                          <Clock size={16} />
                        </button>
                        <button
                          onClick={() => cambiarEstado(ticket.id, 'resuelto')}
                          disabled={ticket.estado === 'resuelto' || ticket.estado === 'cerrado'}
                          className="text-green-600 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Marcar como resuelto"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          onClick={() => toggleComments(ticket.id)}
                          className="text-purple-600 hover:text-purple-800 flex items-center gap-1"
                          title="Ver comentarios"
                        >
                          <MessageSquare size={16} />
                          <span className="text-xs">{(comments[ticket.id]?.length ?? ticket.comentarios) ?? 0}</span>
                        </button>
                        <button
                          onClick={() => toggleHistorial(ticket.id)}
                          className="text-orange-600 hover:text-orange-800 flex items-center gap-1"
                          title="Ver historial"
                        >
                          <History size={16} />
                          <span className="text-xs">{ticket.historial ?? 0}</span>
                        </button>
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
                          {loadingHistory[ticket.id] ? (
                            <p className="text-gray-500 text-sm text-center py-4">Cargando historial...</p>
                          ) : history[ticket.id]?.length > 0 ? (
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                              {history[ticket.id].map((item: any, index: number) => (
                                <div key={item.id || index} className="flex items-start gap-3">
                                  <div className="flex flex-col items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getHistorialEstadoColor(item.estado_nuevo)}`}>
                                      {getHistorialEstadoIcon(item.estado_nuevo)}
                                    </div>
                                    {index < history[ticket.id].length - 1 && (
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
                  {showComments[ticket.id] && (
                    <tr>
                      <td colSpan={8} className="p-4 bg-purple-50 border-b">
                        <div className="bg-white rounded-lg shadow-sm p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">Comentarios del Ticket #{ticket.id}</h4>
                          </div>
                          {loadingComments[ticket.id] ? (
                            <p className="text-gray-500 text-sm">Cargando comentarios...</p>
                          ) : comments[ticket.id]?.length > 0 ? (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {comments[ticket.id].map((c: any, i: number) => (
                                <div key={c.id || i} className="bg-gray-50 p-3 rounded border">
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
                          {/* Formulario para agregar comentario */}
                          <div className="mt-3 flex gap-2">
                            <input
                              type="text"
                              value={newComment[ticket.id] || ''}
                              onChange={(e) => setNewComment(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                              onKeyPress={(e) => e.key === 'Enter' && enviarComentario(ticket.id)}
                              placeholder="Agregar un comentario..."
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <button
                              onClick={() => enviarComentario(ticket.id)}
                              disabled={!newComment[ticket.id]?.trim()}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
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
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>No tienes tickets asignados</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vista de tarjetas para móvil */}
      <div className="md:hidden">
        {filteredTickets.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No tienes tickets asignados</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTickets.map((ticket) => (
              <div key={ticket.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">#{ticket.id}</span>
                    <div className="flex items-center gap-1">
                      {getEstadoIcon(ticket.estado)}
                      <span className="text-xs text-gray-900 capitalize">
                        {ticket.estado.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPrioridadColor(ticket.prioridad)}`}>
                      {ticket.prioridad.toUpperCase()}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoriaColor(ticket.categoria)}`}>
                      {ticket.categoria.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="text-sm font-medium text-gray-900">{ticket.titulo}</div>
                  <div className="text-sm text-gray-500 line-clamp-2">{ticket.descripcion}</div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>Solicitante: {ticket.solicitante}</span>
                  <span>{new Date(ticket.fecha_creacion).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => cambiarEstado(ticket.id, 'en_progreso')}
                      disabled={ticket.estado === 'en_progreso' || ticket.estado === 'resuelto' || ticket.estado === 'cerrado'}
                      className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed p-1"
                      title="Marcar en progreso"
                    >
                      <Clock size={16} />
                    </button>
                    <button
                      onClick={() => cambiarEstado(ticket.id, 'resuelto')}
                      disabled={ticket.estado === 'resuelto' || ticket.estado === 'cerrado'}
                      className="text-green-600 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed p-1"
                      title="Marcar como resuelto"
                    >
                      <CheckCircle size={16} />
                    </button>
                    <button
                      onClick={() => toggleComments(ticket.id)}
                      className="text-purple-600 hover:text-purple-800 flex items-center gap-1 p-1"
                      title="Ver comentarios"
                    >
                      <MessageSquare size={16} />
                      <span className="text-xs">{(comments[ticket.id]?.length ?? ticket.comentarios) ?? 0}</span>
                    </button>
                    <button
                      onClick={() => toggleHistorial(ticket.id)}
                      className="text-orange-600 hover:text-orange-800 flex items-center gap-1 p-1"
                      title="Ver historial"
                    >
                      <History size={16} />
                      <span className="text-xs">{ticket.historial ?? 0}</span>
                    </button>
                  </div>
                </div>
                {showComments[ticket.id] && (
                  <div className="mt-2 p-3 bg-purple-50 rounded-lg">
                    <div className="font-medium text-sm mb-2">Comentarios</div>
                    {loadingComments[ticket.id] ? (
                      <p className="text-gray-500 text-sm">Cargando...</p>
                    ) : comments[ticket.id]?.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {comments[ticket.id].map((c: any, i: number) => (
                          <div key={c.id || i} className="bg-white p-2 rounded text-sm">
                            <div className="font-medium text-xs">{c.usuario?.nombre || c.usuario?.email || 'Usuario'}</div>
                            <p className="text-gray-700">{c.comentario}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">Sin comentarios.</p>
                    )}
                    <div className="mt-2 flex gap-1">
                      <input
                        type="text"
                        value={newComment[ticket.id] || ''}
                        onChange={(e) => setNewComment(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                        onKeyPress={(e) => e.key === 'Enter' && enviarComentario(ticket.id)}
                        placeholder="Comentar..."
                        className="flex-1 px-2 py-1 border rounded text-sm"
                      />
                      <button
                        onClick={() => enviarComentario(ticket.id)}
                        disabled={!newComment[ticket.id]?.trim()}
                        className="px-3 py-1 bg-purple-600 text-white rounded text-sm disabled:opacity-50"
                      >
                        →
                      </button>
                    </div>
                  </div>
                )}
                {showHistory[ticket.id] && (
                  <div className="mt-2 p-3 bg-white rounded-lg shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 text-sm">Historial de Cambios</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPrioridadColor(ticket.estado)}`}>
                        {ticket.estado}
                      </span>
                    </div>
                    {loadingHistory[ticket.id] ? (
                      <p className="text-gray-500 text-sm">Cargando...</p>
                    ) : history[ticket.id]?.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {history[ticket.id].map((item: any, index: number) => (
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default ITAssignedTickets;
