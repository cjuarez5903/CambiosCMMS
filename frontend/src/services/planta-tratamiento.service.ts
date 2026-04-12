import api from './api';

export interface LecturaPlanta {
  id: number;
  sucursalId: number;
  sucursal?: { id: number; nombre: string };
  fechaRegistro: string;
  horaRegistro: string;
  lecturaActualM3: number;
  lecturaAnteriorM3: number | null;
  consumoDiarioM3: number | null;
  caudalDisenoM3dia?: number;
  alertaGenerada: boolean;
  indicador?: 'verde' | 'amarillo' | 'rojo' | 'sin_datos';
  creadoPor?: { id: number; nombre: string; apellido: string };
}

export interface ConfiguracionPlanta {
  id: number;
  sucursalId: number;
  sucursal?: { id: number; nombre: string };
  caudalDisenoM3dia: number;
  notas?: string;
}

export interface DashboardPlanta {
  resumen: { totalLecturas: number; totalAlertas: number };
  lecturas: LecturaPlanta[];
  grafica: { fecha: string; consumo: number | null; caudal: number; indicador: string }[];
}

const plantaTratamientoService = {
  // Lecturas
  async registrarLectura(lecturaActualM3: number): Promise<LecturaPlanta> {
    const res = await api.post('/planta-tratamiento/lecturas', { lecturaActualM3 });
    return res.data;
  },

  async listarLecturas(params?: {
    sucursalId?: number;
    fechaInicio?: string;
    fechaFin?: string;
    pagina?: number;
    porPagina?: number;
  }): Promise<{ datos: LecturaPlanta[]; total: number; pagina: number; ultimaPagina: number }> {
    const res = await api.get('/planta-tratamiento/lecturas', { params });
    return res.data;
  },

  // Dashboard
  async getDashboard(sucursalId?: number): Promise<DashboardPlanta> {
    const res = await api.get('/planta-tratamiento/dashboard', {
      params: sucursalId ? { sucursalId } : {},
    });
    return res.data;
  },

  // Configuración
  async listarConfiguraciones(): Promise<ConfiguracionPlanta[]> {
    const res = await api.get('/planta-tratamiento/configuracion');
    return res.data;
  },

  async getConfiguracion(sucursalId: number): Promise<ConfiguracionPlanta> {
    const res = await api.get(`/planta-tratamiento/configuracion/${sucursalId}`);
    return res.data;
  },

  async guardarConfiguracion(data: {
    sucursalId: number;
    caudalDisenoM3dia: number;
    notas?: string;
  }): Promise<ConfiguracionPlanta> {
    const res = await api.post('/planta-tratamiento/configuracion', data);
    return res.data;
  },
};

export default plantaTratamientoService;
