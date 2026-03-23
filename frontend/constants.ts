import { Asset, Inspection, WorkOrder, User, Branch, Vendor } from './types';

// App Colors
export const COLORS = {
  blue: '#2e3c98',
  orange: '#f68d2d',
  teal: '#3bbfad',
  lightblue: '#13b4e5',
  gray: '#64748b'
};

// Mock Data
export const COUNTRIES = ['Guatemala', 'El Salvador', 'Costa Rica', 'República Dominicana', 'México'];

export const BRANCHES: Record<string, string[]> = {
  'Guatemala': ['Hincapié', 'Las Charcas', 'Muxbal', 'Majadas', 'Aguilar Batres', 'Zona 4', 'Zona 13', 'Zona Norte/Z18'],
  'El Salvador': ['Santa Elena', 'Merliot'],
  'Costa Rica': ['Escazú', 'San Pedro'],
  'República Dominicana': ['Santo Domingo Centro'],
  'México': ['Polanco', 'Santa Fe']
};

export const MOCK_BRANCHES: Branch[] = [
  { id: 'BR-001', name: 'Hincapié', country: 'Guatemala', address: 'Ave. Hincapié 14-00 Zona 13', manager: 'Carlos Ruiz' },
  { id: 'BR-002', name: 'Santa Elena', country: 'El Salvador', address: 'Blvd. Santa Elena, Antiguo Cuscatlán', manager: 'Maria Mendez' },
  { id: 'BR-003', name: 'Escazú', country: 'Costa Rica', address: 'Escazú Centro, Calle 2', manager: 'Pedro Sanchez' },
  { id: 'BR-004', name: 'Santo Domingo Centro', country: 'República Dominicana', address: 'Ave. 27 de Febrero', manager: 'Luisa Perez' },
  { id: 'BR-005', name: 'Polanco', country: 'México', address: 'Av. Horacio 1500, Polanco', manager: 'Juan Lopez' },
];

export const MOCK_WORK_ORDERS: WorkOrder[] = [
  { id: 'OT-1001', title: 'Fuga de agua en techo bodega 402', description: 'El cliente reporta goteras sobre sus cajas.', location: 'Hincapié', country: 'Guatemala', status: 'ABIERTA', priority: 'ALTA', category: 'Infraestructura', createdAt: '2023-10-25', images: [] },
  { id: 'OT-1002', title: 'Mantenimiento preventivo Elevador 1', description: 'Revisión mensual de sistema hidráulico.', location: 'Zona 4', country: 'Guatemala', status: 'EN_PROCESO', priority: 'MEDIA', assignedTo: 'Elevadores SA', category: 'Equipos', createdAt: '2023-10-24', images: [] },
  { id: 'OT-1003', title: 'Cambio de luminarias pasillo B', description: 'Lámparas LED parpadeando.', location: 'Escazú', country: 'Costa Rica', status: 'CERRADA', priority: 'BAJA', assignedTo: 'Juan Pérez', category: 'Eléctrico', createdAt: '2023-10-20', images: [] },
  { id: 'OT-1004', title: 'Falla en portón principal', description: 'El motor no responde al control remoto.', location: 'Santa Fe', country: 'México', status: 'ABIERTA', priority: 'CRITICA', category: 'Acceso', createdAt: '2023-10-26', images: [] },
  { id: 'OT-1005', title: 'Pintura fachada norte', description: 'Retoque de pintura por desgaste.', location: 'Las Charcas', country: 'Guatemala', status: 'EN_ESPERA', priority: 'BAJA', category: 'Mantenimiento General', createdAt: '2023-10-15', images: [] },
];

export const MOCK_ASSETS: Asset[] = [
  { id: 'ACT-001', name: 'Generador Eléctrico Cat', category: 'Energía', location: 'Hincapié', installDate: '2020-05-15', status: 'OPERATIVO', nextMaintenance: '2023-11-15', cost: 15000 },
  { id: 'ACT-002', name: 'Sistema CCTV Hikvision', category: 'Seguridad', location: 'Majadas', installDate: '2021-03-10', status: 'OPERATIVO', nextMaintenance: '2023-12-01', cost: 5000 },
  { id: 'ACT-003', name: 'Montacargas Toyota', category: 'Maquinaria', location: 'Zona 4', installDate: '2019-08-20', status: 'EN_REPARACION', nextMaintenance: '2023-10-27', cost: 25000 },
];

export const MOCK_INSPECTIONS: Inspection[] = [
  { id: 'INS-501', templateName: 'Inspección Diaria de Pasillos', location: 'Hincapié', inspector: 'Carlos Ruiz', date: '2023-10-26', status: 'COMPLETA' },
  { id: 'INS-502', templateName: 'Revisión de Seguridad Mensual', location: 'Zona 13', inspector: 'Ana Gomez', date: '2023-10-26', status: 'ISSUES_FOUND' },
];

export const MOCK_VENDORS: Vendor[] = [
  { id: 'V-001', name: 'Elevadores SA', contactName: 'Ing. Martinez', email: 'soporte@elevadores.com', phone: '+502 5555-1234', category: 'Equipos', country: 'Guatemala', rating: 4.5, status: 'ACTIVO' },
  { id: 'V-002', name: 'Seguridad Pro', contactName: 'Carlos Lopez', email: 'contacto@seguridadpro.com', phone: '+503 2222-9999', category: 'Seguridad', country: 'El Salvador', rating: 3.8, status: 'ACTIVO' },
  { id: 'V-003', name: 'Limpieza Total', contactName: 'Ana Campos', email: 'ana@limpiezatotal.com', phone: '+506 8888-7777', category: 'Limpieza', country: 'Costa Rica', rating: 4.8, status: 'ACTIVO' },
  { id: 'V-004', name: 'Electricidad Express', contactName: 'Roberto Diaz', email: 'roberto@elexpress.com', phone: '+52 55 1234 5678', category: 'Eléctrico', country: 'México', rating: 4.0, status: 'INACTIVO' },
];

export const CURRENT_USER: User = {
  id: 'U-001',
  name: 'Admin Regional',
  email: 'admin@mrbstorage.com',
  role: 'ADMIN_REGIONAL',
  country: 'Global'
};