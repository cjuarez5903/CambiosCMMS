import api from './api';

export interface Role {
  id: number;
  nombre: string;
  descripcion: string;
  permisos: any;
}

class RolesService {
  async listar(): Promise<Role[]> {
    const response = await api.get('/roles');
    return response.data;
  }

  async crear(nombre: string, descripcion: string, permisos: any): Promise<Role> {
    const response = await api.post('/roles', { nombre, descripcion, permisos });
    return response.data;
  }

  async actualizar(id: number, permisos: any): Promise<Role> {
    const response = await api.put(`/roles/${id}`, { permisos });
    return response.data;
  }
}

export default new RolesService();
