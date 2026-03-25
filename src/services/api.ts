import type { Organization, Client, Sector, Equipment, ServiceOrder, User, CatalogItem, Order, OrderItem } from '../types';

// ---- API Base Configuration ----

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';

function getToken(): string | null {
    return localStorage.getItem('maintqr_token');
}

function setToken(token: string): void {
    localStorage.setItem('maintqr_token', token);
}

function removeToken(): void {
    localStorage.removeItem('maintqr_token');
}

async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Erro de conexão com o servidor' }));
        throw new Error(body.error || `Erro ${res.status}`);
    }

    return res.json();
}

// ---- Helper Mappers: snake_case (DB) ↔ camelCase (TypeScript) ----

function mapClientFromDb(d: any): Client {
    return {
        id: d.id, orgId: d.org_id, name: d.name,
        document: d.document, documentType: d.document_type,
        email: d.email, phone: d.phone, address: d.address,
        createdAt: d.created_at,
    };
}

function mapOrgFromDb(d: any): Organization {
    return {
        id: d.id, name: d.name, document: d.document,
        email: d.email, phone: d.phone, createdAt: d.created_at,
        logoUrl: d.logo_url, brandColor: d.brand_color,
        subscriptionPlan: d.subscription_plan, paymentStatus: d.payment_status,
        trialEndsAt: d.trial_ends_at, maxEquipments: d.max_equipments,
        asaasCustomerId: d.asaas_customer_id, asaasSubscriptionId: d.asaas_subscription_id,
        address: d.address, city: d.city, state: d.state, cep: d.cep,
        ownerName: d.owner_name,
        pixKey: d.pix_key, bankName: d.bank_name, bankAgency: d.bank_agency,
        bankAccount: d.bank_account, bankAccountType: d.bank_account_type,
        bankHolder: d.bank_holder, orderCounter: d.order_counter,
    };
}

function mapOrgToDb(updates: Partial<Organization>): any {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.document !== undefined) payload.document = updates.document;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.logoUrl !== undefined) payload.logo_url = updates.logoUrl;
    if (updates.brandColor !== undefined) payload.brand_color = updates.brandColor;
    if (updates.subscriptionPlan !== undefined) payload.subscription_plan = updates.subscriptionPlan;
    if (updates.paymentStatus !== undefined) payload.payment_status = updates.paymentStatus;
    if (updates.address !== undefined) payload.address = updates.address;
    if (updates.city !== undefined) payload.city = updates.city;
    if (updates.state !== undefined) payload.state = updates.state;
    if (updates.cep !== undefined) payload.cep = updates.cep;
    if (updates.ownerName !== undefined) payload.owner_name = updates.ownerName;
    if (updates.pixKey !== undefined) payload.pix_key = updates.pixKey;
    if (updates.bankName !== undefined) payload.bank_name = updates.bankName;
    if (updates.bankAgency !== undefined) payload.bank_agency = updates.bankAgency;
    if (updates.bankAccount !== undefined) payload.bank_account = updates.bankAccount;
    if (updates.bankAccountType !== undefined) payload.bank_account_type = updates.bankAccountType;
    if (updates.bankHolder !== undefined) payload.bank_holder = updates.bankHolder;
    return payload;
}

function mapEquipmentFromDb(d: any): Equipment {
    return {
        ...d,
        clientId: d.client_id,
        sectorId: d.sector_id,
        qrCodeUid: d.qr_code_uid,
        serialNumber: d.serial_number,
        installDate: d.install_date,
        createdAt: d.created_at,
    };
}

function mapServiceOrderFromDb(d: any): ServiceOrder {
    return {
        ...d,
        equipmentId: d.equipment_id,
        technicianId: d.technician_id,
        technicianName: d.technician_name || '',
        warrantyUntil: d.warranty_until,
        nextMaintenanceDate: d.next_maintenance_date,
        photosBefore: d.photos_before || [],
        photosAfter: d.photos_after || [],
        createdAt: d.created_at,
    };
}

function mapCatalogItemFromDb(d: any): CatalogItem {
    return {
        id: d.id, orgId: d.org_id, name: d.name,
        type: d.type, defaultPrice: parseFloat(d.default_price) || 0,
        createdAt: d.created_at,
    };
}

function mapOrderFromDb(d: any): Order {
    return {
        id: d.id, orgId: d.org_id, clientId: d.client_id,
        equipmentId: d.equipment_id, defect: d.defect, observations: d.observations,
        status: d.status, subtotal: parseFloat(d.subtotal) || 0,
        discount: parseFloat(d.discount) || 0, deliveryFee: parseFloat(d.delivery_fee) || 0,
        total: parseFloat(d.total) || 0, paymentMethod: d.payment_method,
        warranty: d.warranty, createdAt: d.created_at,
        orderNumber: d.order_number,
        clientName: d.client_name, equipmentName: d.equipment_name,
        items: d.items ? d.items.map(mapOrderItemFromDb) : undefined,
        // Extra fields from detail JOIN (passed through for PDF)
        ...(d.client_document && { clientDocument: d.client_document }),
        ...(d.client_phone && { clientPhone: d.client_phone }),
        ...(d.client_email && { clientEmail: d.client_email }),
        ...(d.client_address && { clientAddress: d.client_address }),
        ...(d.equipment_brand && { equipmentBrand: d.equipment_brand }),
        ...(d.equipment_model && { equipmentModel: d.equipment_model }),
        ...(d.equipment_serial_number && { equipmentSerialNumber: d.equipment_serial_number }),
    } as Order;
}

function mapOrderItemFromDb(d: any): OrderItem {
    return {
        id: d.id, orderId: d.order_id, catalogItemId: d.catalog_item_id,
        name: d.name, type: d.type, quantity: d.quantity,
        unitPrice: parseFloat(d.unit_price) || 0,
        totalPrice: parseFloat(d.total_price) || 0,
    };
}

// ---- Auth API ----

export const authApi = {
    login: async (email: string, password?: string) => {
        const pass = password || 'password123';
        const data = await apiFetch<{ token: string; user: any }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password: pass }),
        });
        setToken(data.token);
        return data;
    },

    register: async (email: string, password: string, name: string, company: string, plan?: string, cpfCnpj?: string) => {
        const selectedPlan = plan || 'starter';
        const data = await apiFetch<{ token: string; user: any }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, name, company, plan: selectedPlan, cpfCnpj }),
        });
        setToken(data.token);

        // Create Asaas subscription in background
        try {
            await apiFetch('/asaas/create-subscription', {
                method: 'POST',
                body: JSON.stringify({ name, email, plan: selectedPlan, cpfCnpj }),
            });
        } catch (asaasErr) {
            console.error('Asaas subscription error:', asaasErr);
        }

        return data;
    },

    logout: async () => {
        removeToken();
    },

    getCurrentUser: async (): Promise<User | null> => {
        const token = getToken();
        if (!token) return null;

        try {
            const user = await apiFetch<any>('/auth/me');
            if (!user) return null;
            return {
                id: user.id,
                orgId: user.orgId,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
            } as User;
        } catch {
            removeToken();
            return null;
        }
    },
};

// ---- Organizations API ----

export const organizationsApi = {
    get: async () => {
        const data = await apiFetch<any>('/organizations');
        if (!data) return null as unknown as Organization;
        return mapOrgFromDb(data);
    },

    update: async (id: string, updates: Partial<Organization>) => {
        const payload = mapOrgToDb(updates);
        const data = await apiFetch<any>(`/organizations/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        return mapOrgFromDb(data);
    },
};

// ---- Clients API ----

export const clientsApi = {
    getAll: async () => {
        const data = await apiFetch<any[]>('/clients');
        return (data || []).map(mapClientFromDb);
    },

    getById: async (id: string) => {
        const data = await apiFetch<any>(`/clients/${id}`);
        return mapClientFromDb(data);
    },

    create: async (client: Omit<Client, 'id' | 'orgId' | 'createdAt'>) => {
        const payload = {
            name: client.name,
            document: client.document,
            document_type: client.documentType,
            email: client.email,
            phone: client.phone,
            address: client.address,
        };

        const data = await apiFetch<any>('/clients', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return mapClientFromDb(data);
    },

    update: async (id: string, updates: Partial<Client>) => {
        const payload: any = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.document !== undefined) payload.document = updates.document;
        if (updates.documentType !== undefined) payload.document_type = updates.documentType;
        if (updates.email !== undefined) payload.email = updates.email;
        if (updates.phone !== undefined) payload.phone = updates.phone;
        if (updates.address !== undefined) payload.address = updates.address;

        const data = await apiFetch<any>(`/clients/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        return mapClientFromDb(data);
    },

    delete: async (id: string) => {
        await apiFetch(`/clients/${id}`, { method: 'DELETE' });
    },
};

// ---- Sectors API ----

export const sectorsApi = {
    getAll: async () => {
        const data = await apiFetch<any[]>('/sectors');
        return (data || []).map((d: any) => ({ ...d, clientId: d.client_id, createdAt: d.created_at })) as Sector[];
    },

    create: async (sector: Omit<Sector, 'id' | 'createdAt'>) => {
        const payload = { name: sector.name, description: sector.description, client_id: sector.clientId };
        const data = await apiFetch<any>('/sectors', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return { ...data, clientId: data.client_id, createdAt: data.created_at } as Sector;
    },

    update: async (id: string, updates: Partial<Sector>) => {
        const payload: any = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.clientId !== undefined) payload.client_id = updates.clientId;

        const data = await apiFetch<any>(`/sectors/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        return { ...data, clientId: data.client_id, createdAt: data.created_at } as Sector;
    },

    delete: async (id: string) => {
        await apiFetch(`/sectors/${id}`, { method: 'DELETE' });
    },
};

// ---- Equipments API ----

export const equipmentsApi = {
    getAll: async () => {
        const data = await apiFetch<any[]>('/equipments');
        return (data || []).map(mapEquipmentFromDb) as Equipment[];
    },

    getByQrCode: async (qrCodeUid: string) => {
        const data = await apiFetch<any>(`/equipments/public/${qrCodeUid}`);
        return mapEquipmentFromDb(data.equipment) as Equipment;
    },

    getPublicTrackingData: async (qrCodeUid: string) => {
        const data = await apiFetch<any>(`/equipments/public/${qrCodeUid}`);

        return {
            equipment: mapEquipmentFromDb(data.equipment),
            client: data.client ? mapClientFromDb(data.client) : null,
            sector: data.sector ? {
                id: data.sector.id, clientId: data.sector.client_id, name: data.sector.name,
                description: data.sector.description, createdAt: data.sector.created_at,
            } as Sector : null,
            orders: (data.orders || []).map((d: any) => mapServiceOrderFromDb(d)) as ServiceOrder[],
            organization: data.organization || null,
        };
    },

    create: async (equipment: Omit<Equipment, 'id' | 'qrCodeUid' | 'createdAt'>) => {
        const payload = {
            client_id: equipment.clientId, sector_id: equipment.sectorId,
            name: equipment.name, brand: equipment.brand, model: equipment.model,
            serial_number: equipment.serialNumber, btus: equipment.btus, details: equipment.details,
            install_date: equipment.installDate, status: equipment.status,
        };

        const data = await apiFetch<any>('/equipments', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return mapEquipmentFromDb(data) as Equipment;
    },

    update: async (id: string, updates: Partial<Equipment>) => {
        const payload: any = { ...updates };
        if (payload.clientId) { payload.client_id = payload.clientId; delete payload.clientId; }
        if (payload.sectorId) { payload.sector_id = payload.sectorId; delete payload.sectorId; }
        if (payload.serialNumber) { payload.serial_number = payload.serialNumber; delete payload.serialNumber; }
        if (payload.installDate) { payload.install_date = payload.installDate; delete payload.installDate; }
        if (payload.qrCodeUid) { delete payload.qrCodeUid; }
        delete payload.createdAt;

        const data = await apiFetch<any>(`/equipments/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        return mapEquipmentFromDb(data) as Equipment;
    },

    delete: async (id: string) => {
        await apiFetch(`/equipments/${id}`, { method: 'DELETE' });
    },
};

// ---- Service Orders API ----

export const serviceOrdersApi = {
    getAll: async () => {
        const data = await apiFetch<any[]>('/service-orders');
        return (data || []).map(mapServiceOrderFromDb) as ServiceOrder[];
    },

    getByEquipment: async (equipmentId: string) => {
        const data = await apiFetch<any[]>(`/service-orders/equipment/${equipmentId}`);
        return (data || []).map(mapServiceOrderFromDb) as ServiceOrder[];
    },

    create: async (order: Omit<ServiceOrder, 'id' | 'createdAt'>) => {
        const payload: any = {
            equipment_id: order.equipmentId,
            date: order.date,
            type: order.type,
            status: order.status,
            description: order.description,
            technician_id: order.technicianId || null,
            warranty_until: order.warrantyUntil,
            notes: order.notes,
            next_maintenance_date: order.nextMaintenanceDate,
        };
        if (order.photosBefore && order.photosBefore.length > 0) payload.photos_before = order.photosBefore;
        if (order.photosAfter && order.photosAfter.length > 0) payload.photos_after = order.photosAfter;

        const data = await apiFetch<any>('/service-orders', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return mapServiceOrderFromDb(data) as ServiceOrder;
    },

    update: async (id: string, updates: Partial<ServiceOrder>) => {
        const payload: any = { ...updates };
        if (payload.equipmentId) { payload.equipment_id = payload.equipmentId; delete payload.equipmentId; }
        if (payload.technicianId !== undefined) { payload.technician_id = payload.technicianId; delete payload.technicianId; }
        if (payload.warrantyUntil) { payload.warranty_until = payload.warrantyUntil; delete payload.warrantyUntil; }
        if (payload.nextMaintenanceDate) { payload.next_maintenance_date = payload.nextMaintenanceDate; delete payload.nextMaintenanceDate; }
        delete payload.technicianName;
        if (payload.photosBefore !== undefined) { payload.photos_before = payload.photosBefore; delete payload.photosBefore; }
        if (payload.photosAfter !== undefined) { payload.photos_after = payload.photosAfter; delete payload.photosAfter; }
        delete payload.createdAt;

        const data = await apiFetch<any>(`/service-orders/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        return mapServiceOrderFromDb(data) as ServiceOrder;
    },

    delete: async (id: string) => {
        await apiFetch(`/service-orders/${id}`, { method: 'DELETE' });
    },
};

// ---- Catalog API ----

export const catalogApi = {
    getAll: async () => {
        const data = await apiFetch<any[]>('/catalog');
        return (data || []).map(mapCatalogItemFromDb);
    },

    create: async (item: { name: string; type: 'peca' | 'servico'; defaultPrice: number }) => {
        const data = await apiFetch<any>('/catalog', {
            method: 'POST',
            body: JSON.stringify({ name: item.name, type: item.type, default_price: item.defaultPrice }),
        });
        return mapCatalogItemFromDb(data);
    },

    update: async (id: string, updates: Partial<{ name: string; type: string; defaultPrice: number }>) => {
        const payload: any = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.type !== undefined) payload.type = updates.type;
        if (updates.defaultPrice !== undefined) payload.default_price = updates.defaultPrice;

        const data = await apiFetch<any>(`/catalog/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        return mapCatalogItemFromDb(data);
    },

    delete: async (id: string) => {
        await apiFetch(`/catalog/${id}`, { method: 'DELETE' });
    },
};

// ---- Orders API ----

export const ordersApi = {
    getAll: async () => {
        const data = await apiFetch<any[]>('/orders');
        return (data || []).map(mapOrderFromDb);
    },

    getByClient: async (clientId: string) => {
        const data = await apiFetch<any[]>(`/orders/client/${clientId}`);
        return (data || []).map(mapOrderFromDb);
    },

    getById: async (id: string) => {
        const data = await apiFetch<any>(`/orders/${id}`);
        return mapOrderFromDb(data);
    },

    create: async (order: {
        clientId: string;
        equipmentId?: string;
        defect?: string;
        observations?: string;
        subtotal: number;
        discount: number;
        deliveryFee: number;
        total: number;
        paymentMethod?: string;
        warranty?: string;
        items: { catalogItemId?: string; name: string; type: string; quantity: number; unitPrice: number; totalPrice: number }[];
    }) => {
        const payload = {
            client_id: order.clientId,
            equipment_id: order.equipmentId || null,
            defect: order.defect || null,
            observations: order.observations || null,
            subtotal: order.subtotal,
            discount: order.discount,
            delivery_fee: order.deliveryFee,
            total: order.total,
            payment_method: order.paymentMethod || null,
            warranty: order.warranty || null,
            items: order.items.map(i => ({
                catalog_item_id: i.catalogItemId || null,
                name: i.name,
                type: i.type,
                quantity: i.quantity,
                unit_price: i.unitPrice,
                total_price: i.totalPrice,
            })),
        };

        const data = await apiFetch<any>('/orders', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return mapOrderFromDb(data);
    },

    update: async (id: string, updates: Partial<{ equipmentId: string; defect: string; observations: string; status: string; subtotal: number; discount: number; deliveryFee: number; total: number; paymentMethod: string; warranty: string; items: { catalogItemId?: string; name: string; type: string; quantity: number; unitPrice: number; totalPrice: number }[] }>) => {
        const payload: any = {};
        if (updates.equipmentId !== undefined) payload.equipment_id = updates.equipmentId || null;
        if (updates.defect !== undefined) payload.defect = updates.defect || null;
        if (updates.observations !== undefined) payload.observations = updates.observations || null;
        if (updates.status !== undefined) payload.status = updates.status;
        if (updates.subtotal !== undefined) payload.subtotal = updates.subtotal;
        if (updates.discount !== undefined) payload.discount = updates.discount;
        if (updates.deliveryFee !== undefined) payload.delivery_fee = updates.deliveryFee;
        if (updates.total !== undefined) payload.total = updates.total;
        if (updates.paymentMethod !== undefined) payload.payment_method = updates.paymentMethod || null;
        if (updates.warranty !== undefined) payload.warranty = updates.warranty || null;
        if (updates.items !== undefined) {
            payload.items = updates.items.map((i: any) => ({
                catalog_item_id: i.catalogItemId || null,
                name: i.name,
                type: i.type,
                quantity: i.quantity,
                unit_price: i.unitPrice,
                total_price: i.totalPrice,
            }));
        }

        const data = await apiFetch<any>(`/orders/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        return mapOrderFromDb(data);
    },

    delete: async (id: string) => {
        await apiFetch(`/orders/${id}`, { method: 'DELETE' });
    },
};
