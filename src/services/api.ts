import { supabase } from '../lib/supabase';
import type { Organization, Client, Sector, Equipment, ServiceOrder, User } from '../types';

export const authApi = {
    login: async (email: string, password?: string) => {
        const pass = password || 'password123'; // Fallback
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        return data;
    },
    register: async (email: string, password: string, name: string, company: string) => {
        // Warning: This requires the org to be created via trigger or public insert policy in Supabase
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name, company: company }
            }
        });
        if (error) throw error;

        // Auto-create Organization for this new user by calling the backend RPC
        const { error: rpcError } = await supabase.rpc('create_tenant_from_auth', { org_name: company });
        if (rpcError) throw rpcError;

        return data;
    },
    logout: async () => {
        await supabase.auth.signOut();
    },
    getCurrentUser: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // Fetch extended user profile
        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        return profile as User;
    }
};

export const organizationsApi = {
    get: async () => {
        const { data, error } = await supabase.from('organizations').select('*').single();
        if (error && error.code !== 'PGRST116') throw error; // Allow empty
        return data as Organization;
    },
    update: async (id: string, updates: Partial<Organization>) => {
        const { data, error } = await supabase.from('organizations').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data as Organization;
    }
};

export const clientsApi = {
    getAll: async () => {
        const { data, error } = await supabase.from('clients').select('*').order('name');
        if (error) throw error;
        return data as Client[];
    },
    create: async (client: Omit<Client, 'id' | 'orgId' | 'createdAt'>) => {
        // orgId is injected via backend RLS ideally, or we fetch auth session here
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('users').select('org_id').eq('id', user?.id).single();

        const { data, error } = await supabase.from('clients').insert([{ ...client, org_id: profile?.org_id }]).select().single();
        if (error) throw error;
        return data as Client;
    },
    update: async (id: string, updates: Partial<Client>) => {
        const { data, error } = await supabase.from('clients').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data as Client;
    },
    delete: async (id: string) => {
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) throw error;
    }
};

export const sectorsApi = {
    getAll: async () => {
        const { data, error } = await supabase.from('sectors').select('*').order('name');
        if (error) throw error;
        return data as Sector[];
    },
    create: async (sector: Omit<Sector, 'id' | 'createdAt'>) => {
        // Map camelCase to snake_case for DB
        const payload = { ...sector, client_id: sector.clientId };
        // @ts-ignore - temporary to bypass TS due to type mismatch before full snake_case mapping
        delete payload.clientId;

        const { data, error } = await supabase.from('sectors').insert([payload]).select().single();
        if (error) throw error;
        return { ...data, clientId: data.client_id } as Sector;
    },
    delete: async (id: string) => {
        const { error } = await supabase.from('sectors').delete().eq('id', id);
        if (error) throw error;
    }
};

export const equipmentsApi = {
    getAll: async () => {
        const { data, error } = await supabase.from('equipments').select('*').order('name');
        if (error) throw error;
        return (data || []).map(d => ({ ...d, clientId: d.client_id, sectorId: d.sector_id, qrCodeUid: d.qr_code_uid, serialNumber: d.serial_number, installDate: d.install_date })) as Equipment[];
    },
    getByQrCode: async (qrCodeUid: string) => {
        const { data, error } = await supabase.from('equipments').select(`*, clients(name)`).eq('qr_code_uid', qrCodeUid).single();
        if (error) throw error;
        return { ...data, clientId: data.client_id, sectorId: data.sector_id, qrCodeUid: data.qr_code_uid, serialNumber: data.serial_number, installDate: data.install_date } as Equipment;
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
        return { ...data, clientId: data.client_id, sectorId: data.sector_id, qrCodeUid: data.qr_code_uid, serialNumber: data.serial_number, installDate: data.install_date } as Equipment;
    },
    update: async (id: string, updates: Partial<Equipment>) => {
        // Quick snake_case map for updates
        const payload: any = { ...updates };
        if (payload.clientId) { payload.client_id = payload.clientId; delete payload.clientId; }
        if (payload.sectorId) { payload.sector_id = payload.sectorId; delete payload.sectorId; }
        if (payload.serialNumber) { payload.serial_number = payload.serialNumber; delete payload.serialNumber; }
        if (payload.installDate) { payload.install_date = payload.installDate; delete payload.installDate; }
        if (payload.qrCodeUid) { delete payload.qrCodeUid; } // Should not update UID

        const { data, error } = await supabase.from('equipments').update(payload).eq('id', id).select().single();
        if (error) throw error;
        return { ...data, clientId: data.client_id, sectorId: data.sector_id, qrCodeUid: data.qr_code_uid, serialNumber: data.serial_number, installDate: data.install_date } as Equipment;
    },
    delete: async (id: string) => {
        const { error } = await supabase.from('equipments').delete().eq('id', id);
        if (error) throw error;
    }
};

export const serviceOrdersApi = {
    getAll: async () => {
        const { data, error } = await supabase.from('service_orders').select('*').order('date', { ascending: false });
        if (error) throw error;
        return (data || []).map(d => ({
            ...d, equipmentId: d.equipment_id, technicianName: "Técnico", // need join for name
            warrantyUntil: d.warranty_until, nextMaintenanceDate: d.next_maintenance_date
        })) as ServiceOrder[];
    },
    getByEquipment: async (equipmentId: string) => {
        const { data, error } = await supabase.from('service_orders').select('*').eq('equipment_id', equipmentId).order('date', { ascending: false });
        if (error) throw error;
        return (data || []).map(d => ({
            ...d, equipmentId: d.equipment_id, technicianName: "Técnico",
            warrantyUntil: d.warranty_until, nextMaintenanceDate: d.next_maintenance_date
        })) as ServiceOrder[];
    },
    create: async (order: Omit<ServiceOrder, 'id' | 'createdAt'>) => {
        const payload = {
            equipment_id: order.equipmentId,
            date: order.date,
            type: order.type,
            status: order.status,
            description: order.description,
            warranty_until: order.warrantyUntil,
            notes: order.notes,
            next_maintenance_date: order.nextMaintenanceDate
        };

        const { data, error } = await supabase.from('service_orders').insert([payload]).select().single();
        if (error) throw error;
        return {
            ...data, equipmentId: data.equipment_id, technicianName: "Técnico",
            warrantyUntil: data.warranty_until, nextMaintenanceDate: data.next_maintenance_date
        } as ServiceOrder;
    },
    update: async (id: string, updates: Partial<ServiceOrder>) => {
        const payload: any = { ...updates };
        if (payload.equipmentId) { payload.equipment_id = payload.equipmentId; delete payload.equipmentId; }
        if (payload.warrantyUntil) { payload.warranty_until = payload.warrantyUntil; delete payload.warrantyUntil; }
        if (payload.nextMaintenanceDate) { payload.next_maintenance_date = payload.nextMaintenanceDate; delete payload.nextMaintenanceDate; }

        const { data, error } = await supabase.from('service_orders').update(payload).eq('id', id).select().single();
        if (error) throw error;
        return {
            ...data, equipmentId: data.equipment_id, technicianName: "Técnico",
            warrantyUntil: data.warranty_until, nextMaintenanceDate: data.next_maintenance_date
        } as ServiceOrder;
    }
};
