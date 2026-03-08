import { supabase } from '../lib/supabase';
import type { Organization, Client, Sector, Equipment, ServiceOrder, User } from '../types';

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

// ---- Auth API ----

export const authApi = {
    login: async (email: string, password?: string) => {
        const pass = password || 'password123'; // Fallback
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        return data;
    },
    register: async (email: string, password: string, name: string, company: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name, company: company }
            }
        });
        if (error) throw error;

        // Only call RPC if user session is immediately available (no email confirmation required)
        if (data.session) {
            const { error: rpcError } = await supabase.rpc('create_tenant_from_auth', { org_name: company });
            if (rpcError) {
                console.error('Tenant creation error:', rpcError);
                // Don't throw — user is still created, org can be set up later
            }
        }

        return data;
    },
    logout: async () => {
        await supabase.auth.signOut();
    },
    getCurrentUser: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // Fetch extended user profile — use maybeSingle to avoid 406 when no row exists
        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (!profile) return null;

        return {
            id: profile.id,
            orgId: profile.org_id,
            name: profile.name,
            email: user.email || '',
            role: profile.role,
            avatar: profile.avatar_url,
        } as User;
    }
};

// ---- Organizations API ----

export const organizationsApi = {
    get: async () => {
        const { data, error } = await supabase.from('organizations').select('*').maybeSingle();
        if (error && error.code !== 'PGRST116') throw error;
        if (!data) return null as unknown as Organization;
        return mapOrgFromDb(data);
    },
    update: async (id: string, updates: Partial<Organization>) => {
        const payload = mapOrgToDb(updates);
        const { data, error } = await supabase.from('organizations').update(payload).eq('id', id).select().single();
        if (error) throw error;
        return mapOrgFromDb(data);
    }
};

// ---- Clients API ----

export const clientsApi = {
    getAll: async () => {
        const { data, error } = await supabase.from('clients').select('*').order('name');
        if (error) throw error;
        return (data || []).map(mapClientFromDb);
    },
    getById: async (id: string) => {
        const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
        if (error) throw error;
        return mapClientFromDb(data);
    },
    create: async (client: Omit<Client, 'id' | 'orgId' | 'createdAt'>) => {
        // Fetch the user's org_id to associate the client with the correct organization
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado.');

        const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).maybeSingle();
        if (!profile?.org_id) throw new Error('Usuário não está vinculado a uma organização. Faça login novamente ou contate o administrador.');

        const payload = {
            name: client.name,
            document: client.document,
            document_type: client.documentType,
            email: client.email,
            phone: client.phone,
            address: client.address,
            org_id: profile.org_id,
        };

        const { data, error } = await supabase.from('clients').insert([payload]).select().single();
        if (error) throw error;
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

        const { data, error } = await supabase.from('clients').update(payload).eq('id', id).select().single();
        if (error) throw error;
        return mapClientFromDb(data);
    },
    delete: async (id: string) => {
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) throw error;
    }
};

// ---- Sectors API ----

export const sectorsApi = {
    getAll: async () => {
        const { data, error } = await supabase.from('sectors').select('*').order('name');
        if (error) throw error;
        return (data || []).map((d: any) => ({ ...d, clientId: d.client_id, createdAt: d.created_at })) as Sector[];
    },
    create: async (sector: Omit<Sector, 'id' | 'createdAt'>) => {
        const payload = { name: sector.name, description: sector.description, client_id: sector.clientId };

        const { data, error } = await supabase.from('sectors').insert([payload]).select().single();
        if (error) throw error;
        return { ...data, clientId: data.client_id, createdAt: data.created_at } as Sector;
    },
    update: async (id: string, updates: Partial<Sector>) => {
        const payload: any = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.clientId !== undefined) payload.client_id = updates.clientId;

        const { data, error } = await supabase.from('sectors').update(payload).eq('id', id).select().single();
        if (error) throw error;
        return { ...data, clientId: data.client_id, createdAt: data.created_at } as Sector;
    },
    delete: async (id: string) => {
        const { error } = await supabase.from('sectors').delete().eq('id', id);
        if (error) throw error;
    }
};

// ---- Equipments API ----

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

export const equipmentsApi = {
    getAll: async () => {
        const { data, error } = await supabase.from('equipments').select('*').order('name');
        if (error) throw error;
        return (data || []).map(mapEquipmentFromDb) as Equipment[];
    },
    getByQrCode: async (qrCodeUid: string) => {
        const { data, error } = await supabase.from('equipments').select(`*, clients(name)`).eq('qr_code_uid', qrCodeUid).single();
        if (error) throw error;
        return mapEquipmentFromDb(data) as Equipment;
    },
    getPublicTrackingData: async (qrCodeUid: string) => {
        // First try the secure RPC call which bypasses RLS for anonymous users securely
        const { data, error } = await supabase.rpc('get_public_equipment_data', { qr_uid: qrCodeUid });

        if (error || !data) {
            console.warn('RPC failed or returned null, falling back to standard API', error);
            // Fallback to standard fetches (only works fully if user is authenticated due to RLS)
            const eq = await equipmentsApi.getByQrCode(qrCodeUid);
            return {
                equipment: eq,
                client: null,
                sector: null,
                orders: []
            };
        }

        const parsed = data as any;
        return {
            equipment: mapEquipmentFromDb(parsed.equipment),
            client: parsed.client ? {
                id: parsed.client.id, orgId: parsed.client.org_id, name: parsed.client.name,
                document: parsed.client.document, documentType: parsed.client.document_type,
                email: parsed.client.email, phone: parsed.client.phone, address: parsed.client.address,
                createdAt: parsed.client.created_at,
            } as Client : null,
            sector: parsed.sector ? {
                id: parsed.sector.id, clientId: parsed.sector.client_id, name: parsed.sector.name,
                description: parsed.sector.description, createdAt: parsed.sector.created_at
            } as Sector : null,
            orders: (parsed.orders || []).map((d: any) => ({
                id: d.id, equipmentId: d.equipment_id, technicianName: d.technician_name || 'Técnico',
                date: d.date, type: d.type, status: d.status, description: d.description,
                warrantyUntil: d.warranty_until, nextMaintenanceDate: d.next_maintenance_date,
                notes: d.notes, photosBefore: d.photos_before || [], photosAfter: d.photos_after || [],
                createdAt: d.created_at
            })) as ServiceOrder[]
        };
    },
    create: async (equipment: Omit<Equipment, 'id' | 'qrCodeUid' | 'createdAt'>) => {
        const payload = {
            client_id: equipment.clientId, sector_id: equipment.sectorId,
            name: equipment.name, brand: equipment.brand, model: equipment.model,
            serial_number: equipment.serialNumber, btus: equipment.btus, details: equipment.details,
            install_date: equipment.installDate, status: equipment.status
        };

        const { data, error } = await supabase.from('equipments').insert([payload]).select().single();
        if (error) throw error;
        return mapEquipmentFromDb(data) as Equipment;
    },
    update: async (id: string, updates: Partial<Equipment>) => {
        const payload: any = { ...updates };
        if (payload.clientId) { payload.client_id = payload.clientId; delete payload.clientId; }
        if (payload.sectorId) { payload.sector_id = payload.sectorId; delete payload.sectorId; }
        if (payload.serialNumber) { payload.serial_number = payload.serialNumber; delete payload.serialNumber; }
        if (payload.installDate) { payload.install_date = payload.installDate; delete payload.installDate; }
        if (payload.qrCodeUid) { delete payload.qrCodeUid; } // Should not update UID
        delete payload.createdAt; // never update this

        const { data, error } = await supabase.from('equipments').update(payload).eq('id', id).select().single();
        if (error) throw error;
        return mapEquipmentFromDb(data) as Equipment;
    },
    delete: async (id: string) => {
        const { error } = await supabase.from('equipments').delete().eq('id', id);
        if (error) throw error;
    }
};

// ---- Service Orders API ----

function mapServiceOrderFromDb(d: any): ServiceOrder {
    return {
        ...d,
        equipmentId: d.equipment_id,
        technicianName: d.technician_name || 'Técnico',
        warrantyUntil: d.warranty_until,
        nextMaintenanceDate: d.next_maintenance_date,
        photosBefore: d.photos_before || [],
        photosAfter: d.photos_after || [],
        createdAt: d.created_at,
    };
}

export const serviceOrdersApi = {
    getAll: async () => {
        const { data, error } = await supabase.from('service_orders').select('*').order('date', { ascending: false });
        if (error) throw error;
        return (data || []).map(mapServiceOrderFromDb) as ServiceOrder[];
    },
    getByEquipment: async (equipmentId: string) => {
        const { data, error } = await supabase.from('service_orders').select('*').eq('equipment_id', equipmentId).order('date', { ascending: false });
        if (error) throw error;
        return (data || []).map(mapServiceOrderFromDb) as ServiceOrder[];
    },
    create: async (order: Omit<ServiceOrder, 'id' | 'createdAt'>) => {
        const payload: any = {
            equipment_id: order.equipmentId,
            date: order.date,
            type: order.type,
            status: order.status,
            description: order.description,
            technician_name: order.technicianName,
            warranty_until: order.warrantyUntil,
            notes: order.notes,
            next_maintenance_date: order.nextMaintenanceDate,
        };
        if (order.photosBefore && order.photosBefore.length > 0) payload.photos_before = order.photosBefore;
        if (order.photosAfter && order.photosAfter.length > 0) payload.photos_after = order.photosAfter;

        const { data, error } = await supabase.from('service_orders').insert([payload]).select().single();
        if (error) throw error;
        return mapServiceOrderFromDb(data) as ServiceOrder;
    },
    update: async (id: string, updates: Partial<ServiceOrder>) => {
        const payload: any = { ...updates };
        if (payload.equipmentId) { payload.equipment_id = payload.equipmentId; delete payload.equipmentId; }
        if (payload.warrantyUntil) { payload.warranty_until = payload.warrantyUntil; delete payload.warrantyUntil; }
        if (payload.nextMaintenanceDate) { payload.next_maintenance_date = payload.nextMaintenanceDate; delete payload.nextMaintenanceDate; }
        if (payload.technicianName !== undefined) { payload.technician_name = payload.technicianName; delete payload.technicianName; }
        if (payload.photosBefore !== undefined) { payload.photos_before = payload.photosBefore; delete payload.photosBefore; }
        if (payload.photosAfter !== undefined) { payload.photos_after = payload.photosAfter; delete payload.photosAfter; }
        delete payload.createdAt;

        const { data, error } = await supabase.from('service_orders').update(payload).eq('id', id).select().single();
        if (error) throw error;
        return mapServiceOrderFromDb(data) as ServiceOrder;
    }
};
