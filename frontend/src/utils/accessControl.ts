// Role-based access control system based on the updated access matrix

export interface RolePermissions {
  dashboard: boolean;
  it_dashboard: boolean;
  it_soluciones: boolean;
  activos: 'ver' | 'crud' | 'crear_editar' | null;
  usuarios: 'ver' | 'crud' | 'crear_editar' | null;
  proveedores: 'ver' | 'crud' | 'crear_editar' | null;
  ordenes_trabajo: 'ver' | 'crud' | 'crear_editar' | null;
  capex: 'ver' | 'crud' | 'crear_editar' | null;
  reportes_metricas: boolean;
}

export interface AccessMatrix {
  [key: string]: RolePermissions;
}

// Updated Access Matrix
export const ACCESS_MATRIX: AccessMatrix = {
  'Administrador': {
    dashboard: true,
    it_dashboard: true,
    it_soluciones: true,
    activos: 'crud',
    usuarios: 'crud',
    proveedores: 'crud',
    ordenes_trabajo: 'crud',
    capex: 'crud',
    reportes_metricas: true,
  },
  'Gerente Regional': {
    dashboard: true,
    it_dashboard: false,
    it_soluciones: false,
    activos: 'ver',
    usuarios: null,
    proveedores: 'ver',
    ordenes_trabajo: 'crear_editar',
    capex: null,
    reportes_metricas: true,
  },
  'Gerente País': {
    dashboard: true,
    it_dashboard: false,
    it_soluciones: false,
    activos: 'ver',
    usuarios: null,
    proveedores: 'ver',
    ordenes_trabajo: 'crear_editar',
    capex: null,
    reportes_metricas: true,
  },
  'Admin Sucursal': {
    dashboard: true,
    it_dashboard: false,
    it_soluciones: true,
    activos: 'crud',
    usuarios: null,
    proveedores: 'crear_editar',
    ordenes_trabajo: 'crud',
    capex: null,
    reportes_metricas: false,
  },
  'Técnico IT': {
    dashboard: true,
    it_dashboard: true,
    it_soluciones: true,
    activos: 'ver',
    usuarios: null,
    proveedores: 'ver',
    ordenes_trabajo: 'crud',
    capex: null,
    reportes_metricas: false,
  },
  'Técnico Interno': {
    dashboard: true,
    it_dashboard: false,
    it_soluciones: false,
    activos: 'ver',
    usuarios: null,
    proveedores: 'ver',
    ordenes_trabajo: 'crud',
    capex: null,
    reportes_metricas: false,
  },
  'Proveedor Externo': {
    dashboard: true,
    it_dashboard: false,
    it_soluciones: false,
    activos: null,
    usuarios: null,
    proveedores: 'crear_editar',
    ordenes_trabajo: 'crud',
    capex: null,
    reportes_metricas: false,
  },
};

// Route mapping for navigation
export const ROUTE_MAPPING = {
  dashboard: '/',
  it_dashboard: '/it-dashboard',
  it_soluciones: '/it-soluciones',
  it_assigned_tickets: '/it-assigned-tickets',
  activos: '/assets',
  usuarios: '/users',
  proveedores: '/vendors',
  ordenes_trabajo: '/work-orders',
  capex: '/capex',
  reportes_metricas: '/reports',
};

// Get user permissions based on role
export const getUserPermissions = (userRole: string): RolePermissions => {
  return ACCESS_MATRIX[userRole] || {
    dashboard: false,
    it_dashboard: false,
    it_soluciones: false,
    activos: null,
    usuarios: null,
    proveedores: null,
    ordenes_trabajo: null,
    capex: null,
    reportes_metricas: false,
  };
};

// Check if user has access to a specific route
export const hasRouteAccess = (userRole: string, route: string): boolean => {
  const permissions = getUserPermissions(userRole);
  
  // Special handling for IT assigned tickets (only for IT users)
  if (route === 'it_assigned_tickets') {
    return userRole === 'Técnico IT' || userRole === 'Administrador';
  }
  
  return permissions[route as keyof RolePermissions] === true;
};

// Check if user has specific permission level for a module
export const hasModulePermission = (
  userRole: string, 
  module: keyof RolePermissions, 
  requiredLevel?: string
): boolean => {
  const permissions = getUserPermissions(userRole);
  const permission = permissions[module];
  
  if (permission === true || permission === false) {
    return permission;
  }
  
  if (requiredLevel) {
    switch (requiredLevel) {
      case 'ver':
        return permission === 'ver' || permission === 'crud' || permission === 'crear_editar';
      case 'crear_editar':
        return permission === 'crear_editar' || permission === 'crud';
      case 'crud':
        return permission === 'crud';
      default:
        return false;
    }
  }
  
  return permission !== null;
};

// Get available routes for a user
export const getAvailableRoutes = (userRole: string): string[] => {
  const permissions = getUserPermissions(userRole);
  const routes: string[] = [];
  
  // Add standard routes
  Object.keys(permissions).forEach(route => {
    if (permissions[route as keyof RolePermissions] === true) {
      routes.push(route);
    }
  });
  
  // Add IT assigned tickets for IT users
  if (userRole === 'Técnico IT' || userRole === 'Administrador') {
    routes.push('it_assigned_tickets');
  }
  
  // Add module routes with any level of access
  ['activos', 'usuarios', 'proveedores', 'ordenes_trabajo', 'capex'].forEach(module => {
    if (permissions[module as keyof RolePermissions] !== null) {
      routes.push(module);
    }
  });
  
  return routes;
};

// Check if user can perform CRUD operations
export const canPerformCRUD = (userRole: string, module: keyof RolePermissions): boolean => {
  return hasModulePermission(userRole, module, 'crud');
};

// Check if user can perform create/edit operations
export const canPerformCreateEdit = (userRole: string, module: keyof RolePermissions): boolean => {
  return hasModulePermission(userRole, module, 'crear_editar');
};

// Check if user can view module
export const canView = (userRole: string, module: keyof RolePermissions): boolean => {
  return hasModulePermission(userRole, module, 'ver');
};
