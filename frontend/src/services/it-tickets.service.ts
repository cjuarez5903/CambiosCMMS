import api from './api';

// URL base de la API - ajustar según configuración del backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ITTicket {
  id?: number;
  titulo: string;
  descripcion: string;
  estado: 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado';
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  categoria: 'soporte_tecnico' | 'planta_telefonica' | 'office_correo' | 'bitrix' | 'callguru' | 'sap' | 'sitelink' | 'red_internet' | 'acceso_credenciales' | 'otro' | string;
  solicitante: string;
  asignado_a?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  comentarios?: number;
}

export interface CrearTicketRequest {
  titulo: string;
  descripcion: string;
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  categoria: 'soporte_tecnico' | 'planta_telefonica' | 'office_correo' | 'bitrix' | 'callguru' | 'sap' | 'sitelink' | 'red_internet' | 'acceso_credenciales' | 'otro' | string;
  solicitante: string;
  asignado_a?: string;
}

export interface ActualizarTicketRequest {
  titulo?: string;
  descripcion?: string;
  estado?: 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado';
  prioridad?: 'baja' | 'media' | 'alta' | 'critica';
  categoria?: 'soporte_tecnico' | 'hardware' | 'software' | 'red' | 'acceso' | 'sap' | 'sitelink';
  asignado_a?: string;
}

export interface ListarTicketsResponse {
  datos: ITTicket[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

export interface EstadisticasTicketsResponse {
  abiertos: number;
  enProgreso: number;
  resueltos: number;
  cerrados: number;
  criticos: number;
  resueltosHoy: number;
  ticketsAsignados: number;
  porCategoria: {
    soporte_tecnico: number;
    planta_telefonica: number;
    office_correo: number;
    bitrix: number;
    callguru: number;
    sap: number;
    sitelink: number;
    red_internet: number;
    acceso_credenciales: number;
    otro: number;
  };
  porPrioridad: {
    critica: number;
    alta: number;
    media: number;
    baja: number;
  };
}

class ITTicketsService {
  private baseUrl = `${API_URL}/api/it-tickets`;

  async listar(params?: {
    pagina?: number;
    porPagina?: number;
    busqueda?: string;
    estado?: string;
    prioridad?: string;
    categoria?: string;
    asignado_a?: string;
  }): Promise<ListarTicketsResponse> {
    try {
      const response = await api.get(this.baseUrl, { params });
      return response.data;
    } catch (error) {
      console.error('Error al listar tickets IT:', error);
      throw error;
    }
  }

  async listarDashboard(params?: {
    pagina?: number;
    porPagina?: number;
    busqueda?: string;
    estado?: string;
    prioridad?: string;
    categoria?: string;
  }): Promise<ListarTicketsResponse> {
    try {
      const response = await api.get(`${this.baseUrl}/dashboard`, { params });
      return response.data;
    } catch (error) {
      console.error('Error al listar tickets del dashboard:', error);
      throw error;
    }
  }

  async obtenerPorId(id: number): Promise<ITTicket> {
    try {
      const response = await api.get(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener ticket IT:', error);
      throw error;
    }
  }

  async crear(ticket: CrearTicketRequest): Promise<ITTicket> {
    try {
      const response = await api.post(this.baseUrl, ticket);
      return response.data;
    } catch (error) {
      console.error('Error al crear ticket IT:', error);
      throw error;
    }
  }

  async actualizar(id: number, ticket: ActualizarTicketRequest): Promise<ITTicket> {
    try {
      const response = await api.patch(`${this.baseUrl}/${id}`, ticket);
      return response.data;
    } catch (error) {
      console.error('Error al actualizar ticket IT:', error);
      throw error;
    }
  }

  async eliminar(id: number): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${id}`);
    } catch (error) {
      console.error('Error al eliminar ticket IT:', error);
      throw error;
    }
  }

  async obtenerEstadisticas(params?: {
    asignado_a?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  }): Promise<EstadisticasTicketsResponse> {
    try {
      const response = await api.get(`${this.baseUrl}/estadisticas`, { params });
      return response.data;
    } catch (error) {
      console.error('Error al obtener estadísticas de tickets IT:', error);
      throw error;
    }
  }

  async asignarTicket(id: number, asignado_a: string): Promise<ITTicket> {
    try {
      const response = await api.patch(`${this.baseUrl}/${id}/asignar`, { asignado_a });
      return response.data;
    } catch (error) {
      console.error('Error al asignar ticket IT:', error);
      throw error;
    }
  }

  async cambiarEstado(id: number, estado: 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado'): Promise<ITTicket> {
    try {
      const response = await api.patch(`${this.baseUrl}/${id}/estado`, { estado });
      return response.data;
    } catch (error) {
      console.error('Error al cambiar estado de ticket IT:', error);
      throw error;
    }
  }

  async agregarComentario(id: number, comentario: string): Promise<any> {
    try {
      const response = await api.post(`${this.baseUrl}/${id}/comentarios`, { comentario });
      return response.data;
    } catch (error) {
      console.error('Error al agregar comentario a ticket IT:', error);
      throw error;
    }
  }

  async obtenerComentarios(id: number): Promise<any[]> {
    try {
      const response = await api.get(`${this.baseUrl}/${id}/comentarios`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener comentarios de ticket IT:', error);
      throw error;
    }
  }

  async obtenerConteoComentarios(ids: number[]): Promise<Record<string, number>> {
    try {
      const response = await api.get(`${this.baseUrl}/comentarios/conteo`, {
        params: { ids: ids.join(',') },
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener conteo de comentarios IT:', error);
      throw error;
    }
  }

  async obtenerConteoHistorial(ids: number[]): Promise<Record<string, number>> {
    try {
      const response = await api.get(`${this.baseUrl}/historial/conteo`, {
        params: { ids: ids.join(',') },
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener conteo de historial IT:', error);
      throw error;
    }
  }

  async obtenerHistorial(id: number): Promise<any[]> {
    try {
      const response = await api.get(`${this.baseUrl}/${id}/historial`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener historial de ticket IT:', error);
      throw error;
    }
  }

  async obtenerNotificacionesComentarios(since: string): Promise<any[]> {
    try {
      const response = await api.get(`${this.baseUrl}/notificaciones/comentarios`, {
        params: { since },
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener notificaciones de comentarios IT:', error);
      throw error;
    }
  }

  async obtenerEstadisticasPorTecnico(): Promise<any> {
    try {
      const response = await api.get(`${this.baseUrl}/estadisticas-por-tecnico`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener estadísticas por técnico:', error);
      throw error;
    }
  }
}

export default new ITTicketsService();
