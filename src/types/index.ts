export interface Organization {
  id: string;
  name: string;
  document: string; // CNPJ
  email: string;
  phone: string;
  createdAt: string;
  logoUrl?: string;
  brandColor?: string; // Hex color
  subscriptionPlan: 'free' | 'starter' | 'pro' | 'professional' | 'enterprise';
  paymentStatus: 'active' | 'past_due' | 'canceled';
}

export interface Client {
  id: string;
  orgId: string;
  name: string;
  document: string;
  documentType: 'CPF' | 'CNPJ';
  email: string;
  phone: string;
  address: string;
  createdAt: string;
}

export interface Sector {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Equipment {
  id: string;
  sectorId: string;
  clientId: string;
  qrCodeUid: string;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  btus?: number;
  details?: string;
  installDate: string;
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: string;
}

export interface ServiceOrder {
  id: string;
  equipmentId: string;
  date: string;
  type: 'preventiva' | 'corretiva' | 'instalacao';
  status: 'aberta' | 'em_progresso' | 'aguardando_aprovacao' | 'concluida';
  description: string;
  technicianName: string;
  technicianId?: string;
  warrantyUntil?: string;
  notes?: string;
  photos?: string[];
  photosBefore?: string[];
  photosAfter?: string[];
  nextMaintenanceDate?: string;
  createdAt: string;
}

export interface User {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: 'admin' | 'technician';
  avatar?: string;
}
