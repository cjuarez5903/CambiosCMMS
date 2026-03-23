import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Edit2, Trash2, Shield, Mail, Phone, MapPin, X, Save } from 'lucide-react';
import usuariosService, { Usuario } from '../src/services/usuarios.service';
import rolesService, { Role } from '../src/services/roles.service';
import sucursalesService, { Sucursal } from '../src/services/sucursales.service';
import paisesService, { Pais } from '../src/services/paises.service';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../src/components/Pagination';

const Users: React.FC = () => {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [paises, setPaises] = useState<Pais[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null,
  });
  const [selectedPaises, setSelectedPaises] = useState<number[]>([]);
  
  // Estados de paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    rolId: 0,
    sucursalId: undefined as number | undefined,
    telefono: '',
    estado: 'activo' as 'activo' | 'inactivo',
    sucursalesAsignadasIds: [] as number[],
  });

  useEffect(() => {
    cargarDatos();
  }, [paginaActual, porPagina, searchTerm]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError('');
      const [usuariosData, rolesData, sucursalesData, paisesData] = await Promise.all([
        usuariosService.listar({
          pagina: paginaActual,
          porPagina: porPagina,
          buscar: searchTerm || undefined,
        }),
        rolesService.listar(),
        sucursalesService.listar({ estado: 'activa' }),
        paisesService.listar({ estado: 'activo' }),
      ]);
      
      setUsers(usuariosData.datos || []);
      setTotalUsuarios(usuariosData.total || 0);
      setTotalPaginas(usuariosData.ultimaPagina || 1);
      setRoles(rolesData);
      setSucursales(sucursalesData);
      setPaises(paisesData);
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user?: Usuario) => {
    if (user) {
      setEditingUser(user);
      const sucursalesAsignadasIds = (user as any).sucursalesAsignadas?.map((s: any) => s.id) || [];
      setFormData({
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        password: '',
        rolId: user.rolId,
        sucursalId: user.sucursalId,
        telefono: user.telefono || '',
        estado: user.estado,
        sucursalesAsignadasIds,
      });
      // Si es Gerente de País, establecer los países seleccionados
      if (user.rol?.nombre === 'Gerente de País' && (user as any).sucursalesAsignadas) {
        const paisIds = [...new Set((user as any).sucursalesAsignadas
          .filter((s: any) => s.pais?.id)
          .map((s: any) => s.pais.id))];
        setSelectedPaises(paisIds);
      } else {
        setSelectedPaises([]);
      }
    } else {
      setEditingUser(null);
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        rolId: roles[0]?.id || 0,
        sucursalId: undefined,
        telefono: '',
        estado: 'activo',
        sucursalesAsignadasIds: [],
      });
      setSelectedPaises([]);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setSelectedPaises([]);
    setError('');
  };

  const handlePaisToggle = (paisId: number) => {
    const nuevoPaises = selectedPaises.includes(paisId)
      ? selectedPaises.filter(id => id !== paisId)
      : [...selectedPaises, paisId];

    setSelectedPaises(nuevoPaises);

    // Obtener todas las sucursales de los países seleccionados
    const sucursalesDelPais = sucursales.filter(s =>
      s.pais && nuevoPaises.includes(s.pais.id)
    );

    setFormData({
      ...formData,
      sucursalesAsignadasIds: sucursalesDelPais.map(s => s.id)
    });
  };

  const handleRolChange = (rolId: number) => {
    const rolSeleccionado = roles.find(r => r.id === rolId);
    setFormData({
      ...formData,
      rolId,
      sucursalId: undefined,
      sucursalesAsignadasIds: []
    });
    setSelectedPaises([]);
  };

  const esGerenteDePais = () => {
    const rolSeleccionado = roles.find(r => r.id === formData.rolId);
    return rolSeleccionado?.nombre === 'Gerente de País';
  };

  const handleSaveUser = async () => {
    try {
      setError('');
      if (editingUser) {
        // Editar usuario existente
        const dataToUpdate: any = {
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email,
          rolId: formData.rolId,
          sucursalId: formData.sucursalId || undefined,
          telefono: formData.telefono,
          estado: formData.estado,
        };
        // Solo incluir password si se proporcionó uno nuevo
        if (formData.password) {
          dataToUpdate.password = formData.password;
        }
        await usuariosService.actualizar(editingUser.id, dataToUpdate);
      } else {
        // Crear nuevo usuario
        if (!formData.password) {
          setError('La contraseña es requerida para nuevos usuarios');
          return;
        }
        await usuariosService.crear(formData);
      }
      await cargarDatos();
      handleCloseModal();
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al guardar usuario');
    }
  };

  const handleDeleteUser = (id: number) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (deleteConfirm.id) {
      try {
        setError('');
        await usuariosService.eliminar(deleteConfirm.id);
        await cargarDatos();
      } catch (err: any) {
        setError(err.response?.data?.mensaje || 'Error al eliminar usuario');
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    setPaginaActual(newPage);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setPorPagina(newItemsPerPage);
    setPaginaActual(1); // Volver a la primera página
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Cargando usuarios...</div>
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">Administra los usuarios del sistema CMMS</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-mrb-orange text-white font-medium rounded-lg hover:bg-opacity-90 shadow-md hover:shadow-lg transition-all"
        >
          <UserPlus size={20} />
          Nuevo Usuario
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-3">
          <Search className="text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, email o país..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPaginaActual(1); // Volver a la primera página al buscar
            }}
            className="flex-1 outline-none text-sm"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sucursal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Creación</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-mrb-blue rounded-full flex items-center justify-center text-white font-semibold">
                        {user.nombre[0]}{user.apellido[0]}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.nombre} {user.apellido}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-mrb-blue" />
                      <span className="text-sm text-gray-900">{user.rol?.nombre || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-900">{user.sucursal?.nombre || 'Todas'}</div>
                        {user.sucursal?.pais && (
                          <div className="text-xs text-gray-500">{user.sucursal.pais.nombre}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-900">{user.telefono || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.estado === 'activo'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.creadoEn ? new Date(user.creadoEn).toLocaleDateString('es-ES') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(user)}
                        className="text-mrb-blue hover:text-mrb-orange transition-colors p-2 hover:bg-gray-100 rounded-lg"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-800 transition-colors p-2 hover:bg-red-50 rounded-lg"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Paginación */}
        <Pagination
          currentPage={paginaActual}
          totalPages={totalPaginas}
          totalItems={totalUsuarios}
          itemsPerPage={porPagina}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-sm text-gray-500 mb-1">Total Usuarios</div>
          <div className="text-3xl font-bold text-mrb-blue">{totalUsuarios}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-sm text-gray-500 mb-1">Usuarios Activos</div>
          <div className="text-3xl font-bold text-green-600">{users.filter(u => u.estado === 'activo').length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-sm text-gray-500 mb-1">Administradores</div>
          <div className="text-3xl font-bold text-mrb-orange">{users.filter(u => u.rol?.nombre === 'Administrador').length}</div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Error in modal */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              {/* Nombre y Apellido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mrb-orange focus:border-transparent"
                    placeholder="Juan"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mrb-orange focus:border-transparent"
                    placeholder="Pérez"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo Electrónico *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mrb-orange focus:border-transparent"
                    placeholder="usuario@mrbstorage.com"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña {editingUser ? '(dejar vacío para mantener)' : '*'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mrb-orange focus:border-transparent"
                  placeholder={editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                  required={!editingUser}
                />
              </div>

              {/* Rol y Sucursal/País */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rol *
                  </label>
                  <select
                    value={formData.rolId}
                    onChange={(e) => handleRolChange(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mrb-orange focus:border-transparent"
                    required
                  >
                    <option value={0}>Seleccione un rol</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  {esGerenteDePais() ? (
                    // Selector Múltiple de Países para Gerente de País
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Países * (seleccione uno o más)
                      </label>
                      <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto bg-white">
                        {paises.map(pais => (
                          <label key={pais.id} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-gray-50 px-2 rounded">
                            <input
                              type="checkbox"
                              checked={selectedPaises.includes(pais.id)}
                              onChange={() => handlePaisToggle(pais.id)}
                              className="w-4 h-4 text-mrb-orange focus:ring-mrb-orange border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">{pais.nombre}</span>
                            <span className="text-xs text-gray-500 ml-auto">
                              ({sucursales.filter(s => s.pais?.id === pais.id).length} sucursales)
                            </span>
                          </label>
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        El Gerente de País podrá ver órdenes de trabajo de las sucursales de los países seleccionados ({selectedPaises.length} {selectedPaises.length === 1 ? 'país' : 'países'} - {formData.sucursalesAsignadasIds.length} sucursales)
                      </p>
                    </>
                  ) : (
                    // Selector de Sucursal para otros roles
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sucursal {formData.rolId === roles.find(r => r.nombre === 'Administrador')?.id ? '(opcional)' : '*'}
                      </label>
                      <select
                        value={formData.sucursalId || ''}
                        onChange={(e) => setFormData({ ...formData, sucursalId: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mrb-orange focus:border-transparent"
                        required={formData.rolId !== roles.find(r => r.nombre === 'Administrador')?.id}
                      >
                        <option value="">Sin sucursal (Administrador)</option>
                        {sucursales.map(sucursal => (
                          <option key={sucursal.id} value={sucursal.id}>
                            {sucursal.nombre} - {sucursal.pais?.nombre}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        {formData.rolId === roles.find(r => r.nombre === 'Administrador')?.id
                          ? 'Los administradores pueden ver todas las sucursales'
                          : 'El usuario solo verá órdenes de esta sucursal'}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mrb-orange focus:border-transparent"
                    placeholder="+506 8888-8888"
                  />
                </div>
              </div>

              {/* Estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      value="activo"
                      checked={formData.estado === 'activo'}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value as 'activo' | 'inactivo' })}
                      className="mr-2 text-mrb-orange focus:ring-mrb-orange"
                    />
                    <span className="text-sm text-gray-700">Activo</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      value="inactivo"
                      checked={formData.estado === 'inactivo'}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value as 'activo' | 'inactivo' })}
                      className="mr-2 text-mrb-orange focus:ring-mrb-orange"
                    />
                    <span className="text-sm text-gray-700">Inactivo</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUser}
                className="flex items-center gap-2 px-6 py-2 bg-mrb-orange text-white font-medium rounded-lg hover:bg-opacity-90 shadow-md hover:shadow-lg transition-all"
              >
                <Save size={18} />
                {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        title="Eliminar Usuario"
        message="¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
};

export default Users;
