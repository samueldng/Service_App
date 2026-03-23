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
  trialEndsAt?: string;
  maxEquipments?: number;
  asaasCustomerId?: string;
  asaasSubscriptionId?: string;
  // Address
  address?: string;
  city?: string;
  state?: string;
  cep?: string;
  ownerName?: string;
  // Bank / PIX
  pixKey?: string;
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  bankAccountType?: string;
  bankHolder?: string;
  orderCounter?: number;
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

export interface CatalogItem {
  id: string;
  orgId: string;
  name: string;
  type: 'peca' | 'servico';
  defaultPrice: number;
  createdAt: string;
}

export interface Order {
  id: string;
  orgId: string;
  clientId: string;
  equipmentId?: string;
  defect?: string;
  observations?: string;
  status: 'pendente' | 'aprovado' | 'em_andamento' | 'concluido' | 'cancelado';
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod?: string;
  warranty?: string;
  orderNumber?: number;
  items?: OrderItem[];
  clientName?: string;
  equipmentName?: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  catalogItemId?: string;
  name: string;
  type: 'peca' | 'servico';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
