export type UserRole = 'ADMIN_REGIONAL' | 'GERENTE_PAIS' | 'TECNICO' | 'PROVEEDOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  country: string;
}

export type WorkOrderStatus = 'ABIERTA' | 'EN_PROCESO' | 'EN_ESPERA' | 'CERRADA' | 'RECHAZADA';
export type WorkOrderPriority = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  location: string; // Branch Name
  country: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  assignedTo?: string; // Technician or Vendor
  createdAt: string;
  category: string;
  images?: string[]; // URLs or Base64 strings
}

export interface Asset {
  id: string;
  name: string;
  category: string;
  location: string;
  installDate: string;
  status: 'OPERATIVO' | 'EN_REPARACION' | 'BAJA';
  nextMaintenance: string;
  cost: number;
}

export interface Inspection {
  id: string;
  templateName: string;
  location: string;
  inspector: string;
  date: string;
  status: 'COMPLETA' | 'PENDIENTE' | 'ISSUES_FOUND';
}

export interface Branch {
  id: string;
  name: string;
  country: string;
  address: string;
  manager: string;
}

export interface Vendor {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  category: string;
  country: string;
  rating: number; // 1-5
  status: 'ACTIVO' | 'INACTIVO';
}

export interface KPIMetrics {
  openOrders: number;
  closedOrders: number;
  urgentOrders: number;
  avgResolutionTime: string; // e.g., "2.5 días"
}