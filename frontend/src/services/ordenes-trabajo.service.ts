import api from './api';

export interface OrdenTrabajo {
  id: number;
  numeroOT: string;
  sucursalId: number;
  sucursal?: {
    id: number;
    nombre: string;
    pais?: {
      id: number;
      nombre: string;
      moneda: string;
      tasaCambioUsd: number;
    };
  };
  titulo: string;
  descripcion?: string;
  categoria?: string;
  categoriaSap?: string;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  estado: 'PENDIENTE' | 'ASIGNADA' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA';
  tipo: 'preventivo' | 'correctivo' | 'emergencia' | 'mejora';
  fechaReporte: string;
  fechaProgramada?: string;
  fechaInicio?: string;
  fechaCompletado?: string;
  costoEstimado?: number;
  costoEstimadoLocal?: number;
  costoReal?: number;
  costoRealLocal?: number;
  fotoAntes?: string;
  evidenciasAntes?: string[];
  fotoDespues?: string;
  notasResolucion?: string;
  asignadoAUsuarioId?: number;
  asignadoAProveedorId?: number;
  activoId?: number;
}

class OrdenesTrabajoService {
  async listar(params?: {
    sucursalId?: number;
    estado?: string;
    prioridad?: string;
    tipo?: string;
    pagina?: number;
    porPagina?: number;
  }) {
    const response = await api.get('/ordenes-trabajo', { params });
    return response.data;
  }

  async obtener(id: number): Promise<OrdenTrabajo> {
    const response = await api.get(`/ordenes-trabajo/${id}`);
    return response.data;
  }

  async crear(orden: Partial<OrdenTrabajo>): Promise<OrdenTrabajo> {
    // Solo enviar campos permitidos al crear
    const crearOrdenDto = {
      sucursalId: orden.sucursalId,
      titulo: orden.titulo,
      descripcion: orden.descripcion,
      categoria: orden.categoria,
      categoriaSap: orden.categoriaSap,
      prioridad: orden.prioridad,
      tipo: orden.tipo,
      fotoAntes: orden.fotoAntes,
      evidenciasAntes: orden.evidenciasAntes || [],
      activoId: orden.activoId,
    };
    const response = await api.post('/ordenes-trabajo', crearOrdenDto);
    return response.data;
  }

  async actualizar(id: number, orden: Partial<OrdenTrabajo>): Promise<OrdenTrabajo> {
    const response = await api.patch(`/ordenes-trabajo/${id}`, orden);
    return response.data;
  }

  async asignarUsuario(id: number, usuarioId: number): Promise<OrdenTrabajo> {
    const response = await api.patch(`/ordenes-trabajo/${id}/asignar-usuario`, { usuarioId });
    return response.data;
  }

  async asignarProveedor(id: number, datos: {
    proveedorId: number;
    fechaProgramada: string;
    costoEstimado?: number;
    costoEstimadoLocal?: number;
  }): Promise<OrdenTrabajo> {
    const response = await api.patch(`/ordenes-trabajo/${id}/asignar-proveedor`, datos);
    return response.data;
  }

  async iniciar(id: number, datos?: { observacionAdicional?: string }): Promise<OrdenTrabajo> {
    const response = await api.patch(`/ordenes-trabajo/${id}/iniciar`, datos || {});
    return response.data;
  }

  async completar(id: number, datos: {
    notasResolucion?: string;
    costoReal?: number;
    costoRealLocal?: number;
    fotoDespues?: string;
  }): Promise<OrdenTrabajo> {
    const response = await api.patch(`/ordenes-trabajo/${id}/completar`, datos);
    return response.data;
  }

  async cancelar(id: number, motivo?: string): Promise<OrdenTrabajo> {
    const response = await api.patch(`/ordenes-trabajo/${id}/cancelar`, { motivo });
    return response.data;
  }

  async getEstadisticas(params?: { sucursalId?: number; fechaInicio?: string; fechaFin?: string }) {
    const response = await api.get('/ordenes-trabajo/estadisticas', { params });
    return response.data;
  }

  // Nuevos métodos con validación de roles

  async asignarOrden(id: number, datos: {
    asignadoAUsuarioId?: number;
    asignadoAProveedorId?: number;
    fechaProgramada: string;
    costoEstimado: number;
    costoEstimadoLocal: number;
    comentario?: string;
  }): Promise<OrdenTrabajo> {
    const response = await api.post(`/ordenes-trabajo/${id}/asignar`, datos);
    return response.data;
  }

  async iniciarOrden(id: number, datos?: {
    observacion?: string;
    comentario?: string;
  }): Promise<OrdenTrabajo> {
    const response = await api.post(`/ordenes-trabajo/${id}/iniciar-trabajo`, datos || {});
    return response.data;
  }

  async completarOrden(id: number, datos: {
    notasResolucion: string;
    costoReal: number;
    costoRealLocal: number;
    fotoDespues?: string;
    calificacion?: number;
    comentario?: string;
  }): Promise<OrdenTrabajo> {
    const response = await api.post(`/ordenes-trabajo/${id}/completar-trabajo`, datos);
    return response.data;
  }

  async cancelarOrden(id: number, observacion: string): Promise<OrdenTrabajo> {
    const response = await api.post(`/ordenes-trabajo/${id}/cancelar`, { observacion });
    return response.data;
  }

  async getHistorial(id: number) {
    const response = await api.get(`/ordenes-trabajo/${id}/historial`);
    return response.data;
  }

  async obtenerComentarios(id: number): Promise<any[]> {
    const response = await api.get(`/ordenes-trabajo/${id}/comentarios`);
    return response.data;
  }

  async agregarComentario(id: number, comentario: string): Promise<any> {
    const response = await api.post(`/ordenes-trabajo/${id}/comentarios`, { comentario });
    return response.data;
  }
}

export default new OrdenesTrabajoService();
