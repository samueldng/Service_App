import type { Client, Sector, Equipment, ServiceOrder } from '../types';
import { mockClients, mockSectors, mockEquipments, mockServiceOrders } from '../data/mockData';

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

const STORAGE_KEYS = {
    CLIENTS: 'maintqr_clients',
    SECTORS: 'maintqr_sectors',
    EQUIPMENTS: 'maintqr_equipments',
    SERVICE_ORDERS: 'maintqr_service_orders',
    AUTH: 'maintqr_auth',
};

function getStore<T>(key: string, fallback: T[]): T[] {
    const data = localStorage.getItem(key);
    if (data) return JSON.parse(data);
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
}

function setStore<T>(key: string, data: T[]) {
    localStorage.setItem(key, JSON.stringify(data));
}

// ---- Auth ----
export const authApi = {
    login: async (email: string, _password: string) => {
        await delay(500);
        if (email) {
            const user = { id: 'user-001', orgId: 'org-001', name: 'Carlos Mendes', email, role: 'admin' as const };
            localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(user));
            return user;
        }
        throw new Error('Credenciais inválidas');
    },
    logout: () => {
        localStorage.removeItem(STORAGE_KEYS.AUTH);
    },
    getUser: () => {
        const data = localStorage.getItem(STORAGE_KEYS.AUTH);
        return data ? JSON.parse(data) : null;
    },
};

// ---- Clients ----
export const clientsApi = {
    getAll: async (): Promise<Client[]> => {
        await delay();
        return getStore(STORAGE_KEYS.CLIENTS, mockClients);
    },
    getById: async (id: string): Promise<Client | undefined> => {
        await delay();
        const clients = getStore(STORAGE_KEYS.CLIENTS, mockClients);
        return clients.find(c => c.id === id);
    },
    create: async (client: Client): Promise<Client> => {
        await delay();
        const clients = getStore(STORAGE_KEYS.CLIENTS, mockClients);
        clients.push(client);
        setStore(STORAGE_KEYS.CLIENTS, clients);
        return client;
    },
    update: async (id: string, updates: Partial<Client>): Promise<Client> => {
        await delay();
        const clients = getStore(STORAGE_KEYS.CLIENTS, mockClients);
        const index = clients.findIndex(c => c.id === id);
        if (index === -1) throw new Error('Client not found');
        clients[index] = { ...clients[index], ...updates };
        setStore(STORAGE_KEYS.CLIENTS, clients);
        return clients[index];
    },
    delete: async (id: string): Promise<void> => {
        await delay();
        let clients = getStore(STORAGE_KEYS.CLIENTS, mockClients);
        clients = clients.filter(c => c.id !== id);
        setStore(STORAGE_KEYS.CLIENTS, clients);
    },
};

// ---- Sectors ----
export const sectorsApi = {
    getAll: async (): Promise<Sector[]> => {
        await delay();
        return getStore(STORAGE_KEYS.SECTORS, mockSectors);
    },
    getByClientId: async (clientId: string): Promise<Sector[]> => {
        await delay();
        const sectors = getStore(STORAGE_KEYS.SECTORS, mockSectors);
        return sectors.filter(s => s.clientId === clientId);
    },
    create: async (sector: Sector): Promise<Sector> => {
        await delay();
        const sectors = getStore(STORAGE_KEYS.SECTORS, mockSectors);
        sectors.push(sector);
        setStore(STORAGE_KEYS.SECTORS, sectors);
        return sector;
    },
    update: async (id: string, updates: Partial<Sector>): Promise<Sector> => {
        await delay();
        const sectors = getStore(STORAGE_KEYS.SECTORS, mockSectors);
        const index = sectors.findIndex(s => s.id === id);
        if (index === -1) throw new Error('Sector not found');
        sectors[index] = { ...sectors[index], ...updates };
        setStore(STORAGE_KEYS.SECTORS, sectors);
        return sectors[index];
    },
    delete: async (id: string): Promise<void> => {
        await delay();
        let sectors = getStore(STORAGE_KEYS.SECTORS, mockSectors);
        sectors = sectors.filter(s => s.id !== id);
        setStore(STORAGE_KEYS.SECTORS, sectors);
    },
};

// ---- Equipments ----
export const equipmentsApi = {
    getAll: async (): Promise<Equipment[]> => {
        await delay();
        return getStore(STORAGE_KEYS.EQUIPMENTS, mockEquipments);
    },
    getBySectorId: async (sectorId: string): Promise<Equipment[]> => {
        await delay();
        const equips = getStore(STORAGE_KEYS.EQUIPMENTS, mockEquipments);
        return equips.filter(e => e.sectorId === sectorId);
    },
    getByClientId: async (clientId: string): Promise<Equipment[]> => {
        await delay();
        const equips = getStore(STORAGE_KEYS.EQUIPMENTS, mockEquipments);
        return equips.filter(e => e.clientId === clientId);
    },
    getByQrCode: async (qrCodeUid: string): Promise<Equipment | undefined> => {
        await delay();
        const equips = getStore(STORAGE_KEYS.EQUIPMENTS, mockEquipments);
        return equips.find(e => e.qrCodeUid === qrCodeUid);
    },
    create: async (equipment: Equipment): Promise<Equipment> => {
        await delay();
        const equips = getStore(STORAGE_KEYS.EQUIPMENTS, mockEquipments);
        equips.push(equipment);
        setStore(STORAGE_KEYS.EQUIPMENTS, equips);
        return equipment;
    },
    update: async (id: string, updates: Partial<Equipment>): Promise<Equipment> => {
        await delay();
        const equips = getStore(STORAGE_KEYS.EQUIPMENTS, mockEquipments);
        const index = equips.findIndex(e => e.id === id);
        if (index === -1) throw new Error('Equipment not found');
        equips[index] = { ...equips[index], ...updates };
        setStore(STORAGE_KEYS.EQUIPMENTS, equips);
        return equips[index];
    },
    delete: async (id: string): Promise<void> => {
        await delay();
        let equips = getStore(STORAGE_KEYS.EQUIPMENTS, mockEquipments);
        equips = equips.filter(e => e.id !== id);
        setStore(STORAGE_KEYS.EQUIPMENTS, equips);
    },
};

// ---- Service Orders ----
export const serviceOrdersApi = {
    getAll: async (): Promise<ServiceOrder[]> => {
        await delay();
        return getStore(STORAGE_KEYS.SERVICE_ORDERS, mockServiceOrders);
    },
    getByEquipmentId: async (equipmentId: string): Promise<ServiceOrder[]> => {
        await delay();
        const orders = getStore(STORAGE_KEYS.SERVICE_ORDERS, mockServiceOrders);
        return orders.filter(o => o.equipmentId === equipmentId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    create: async (order: ServiceOrder): Promise<ServiceOrder> => {
        await delay();
        const orders = getStore(STORAGE_KEYS.SERVICE_ORDERS, mockServiceOrders);
        orders.push(order);
        setStore(STORAGE_KEYS.SERVICE_ORDERS, orders);
        return order;
    },
    update: async (id: string, updates: Partial<ServiceOrder>): Promise<ServiceOrder> => {
        await delay();
        const orders = getStore(STORAGE_KEYS.SERVICE_ORDERS, mockServiceOrders);
        const index = orders.findIndex(o => o.id === id);
        if (index === -1) throw new Error('Service order not found');
        orders[index] = { ...orders[index], ...updates };
        setStore(STORAGE_KEYS.SERVICE_ORDERS, orders);
        return orders[index];
    },
    delete: async (id: string): Promise<void> => {
        await delay();
        let orders = getStore(STORAGE_KEYS.SERVICE_ORDERS, mockServiceOrders);
        orders = orders.filter(o => o.id !== id);
        setStore(STORAGE_KEYS.SERVICE_ORDERS, orders);
    },
};
