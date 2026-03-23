import api from './api';

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  rolId: number;
  rol?: {
    id: number;
    nombre: string;
  };
  sucursalId?: number;
  sucursal?: {
    id: number;
    nombre: string;
    pais?: {
      id: number;
      nombre: string;
      codigo: string;
    };
  };
  estado: 'activo' | 'inactivo' | 'suspendido';
  creadoEn: string;
}

export interface CrearUsuarioDto {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  rolId: number;
  sucursalId?: number;
  estado?: 'activo' | 'inactivo' | 'suspendido';
}

export interface ActualizarUsuarioDto {
  email?: string;
  nombre?: string;
  apellido?: string;
  telefono?: string;
  rolId?: number;
  sucursalId?: number;
  estado?: 'activo' | 'inactivo' | 'suspendido';
}

export interface ListarUsuariosResponse {
  datos: Usuario[];
  total: number;
  pagina: number;
  ultimaPagina: number;
  porPagina: number;
}

class UsuariosService {
  async listar(params?: {
    estado?: string;
    buscar?: string;
    pagina?: number;
    porPagina?: number;
  }): Promise<ListarUsuariosResponse> {
    const response = await api.get('/usuarios', { params });
    return response.data;
  }

  async obtener(id: number): Promise<Usuario> {
    const response = await api.get(`/usuarios/${id}`);
    return response.data;
  }

  async obtenerPorRol(rolNombre: string) {
    try {
      const response = await api.get('/usuarios/por-rol', { params: { rolNombre } });
      return response.data;
    } catch (error) {
      console.error('Error al obtener usuarios por rol:', error);
      throw error;
    }
  }

  async crear(usuario: CrearUsuarioDto): Promise<Usuario> {
    const response = await api.post('/usuarios', usuario);
    return response.data;
  }

  async actualizar(id: number, usuario: ActualizarUsuarioDto): Promise<Usuario> {
    const response = await api.patch(`/usuarios/${id}`, usuario);
    return response.data;
  }

  async eliminar(id: number): Promise<void> {
    await api.delete(`/usuarios/${id}`);
  }
}

export default new UsuariosService();
