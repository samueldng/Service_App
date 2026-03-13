import type { Organization, Client, Sector, Equipment, ServiceOrder, User } from '../types';

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
};
