-- ====================================================================================
-- MaintQR SaaS - Supabase Initial Database Schema & Row Level Security (RLS)
-- Execution: Copy and paste this script into the Supabase SQL Editor and run it.
-- ====================================================================================

-- Enable the UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Tables
-- ====================================================================================

-- organizations: Represents the tenants (service providers)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    document TEXT, -- CNPJ
    email TEXT,
    phone TEXT,
    logo_url TEXT,
    brand_color TEXT,
    subscription_plan TEXT DEFAULT 'free',
    payment_status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- users: Extends Supabase auth.users with app-specific roles and links to a tenant
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'technician')) DEFAULT 'technician',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- clients: The customers of the tenant (organizations)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    document TEXT NOT NULL, -- CPF/CNPJ
    document_type TEXT CHECK (document_type IN ('CPF', 'CNPJ')),
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- sectors: Locations/Departments within a client
CREATE TABLE sectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- equipments: The physical assets being maintained
CREATE TABLE equipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    sector_id UUID REFERENCES sectors(id) ON DELETE SET NULL,
    qr_code_uid UUID DEFAULT uuid_generate_v4() UNIQUE, -- Public ID for the QR code
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    serial_number TEXT,
    btus INTEGER,
    details TEXT,
    install_date DATE,
    status TEXT CHECK (status IN ('active', 'inactive', 'maintenance')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- service_orders: Maintenance records for equipment
CREATE TABLE service_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID REFERENCES equipments(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    type TEXT CHECK (type IN ('preventiva', 'corretiva', 'instalacao')) NOT NULL,
    status TEXT CHECK (status IN ('aberta', 'em_progresso', 'concluida')) DEFAULT 'aberta',
    description TEXT NOT NULL,
    warranty_until DATE,
    notes TEXT,
    next_maintenance_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
-- ====================================================================================

-- Every table needs RLS enabled to ensure multi-tenant security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;

-- 3. Define RLS Policies for Multi-tenancy
-- ====================================================================================

-- Helper function to get the current user's org_id
CREATE OR REPLACE FUNCTION public.auth_org_id() RETURNS UUID AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- --- Organizations Policies ---
-- Users can only see and update their own organization
CREATE POLICY "Users can view their own organization" 
ON organizations FOR SELECT USING (id = public.auth_org_id());

CREATE POLICY "Admins can update their own organization" 
ON organizations FOR UPDATE USING (id = public.auth_org_id() AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- --- Users Policies ---
-- Users can view other users in their same organization
CREATE POLICY "Users can view org teammates" 
ON public.users FOR SELECT USING (org_id = public.auth_org_id());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE USING (id = auth.uid());

-- --- Clients Policies ---
-- Users can do all operations (CRUD) on clients belonging to their organization
CREATE POLICY "Users can view org clients" ON clients FOR SELECT USING (org_id = public.auth_org_id());
CREATE POLICY "Users can insert org clients" ON clients FOR INSERT WITH CHECK (org_id = public.auth_org_id());
CREATE POLICY "Users can update org clients" ON clients FOR UPDATE USING (org_id = public.auth_org_id());
CREATE POLICY "Users can delete org clients" ON clients FOR DELETE USING (org_id = public.auth_org_id());

-- --- Sectors Policies ---
-- Security through join: sector -> client -> org
CREATE POLICY "Users can view org sectors" ON sectors FOR SELECT 
USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = sectors.client_id AND clients.org_id = public.auth_org_id()));

CREATE POLICY "Users can modify org sectors" ON sectors FOR ALL
USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = sectors.client_id AND clients.org_id = public.auth_org_id()));

-- --- Equipments Policies ---
-- Security through join: equipment -> client -> org
CREATE POLICY "Users can view org equipments" ON equipments FOR SELECT 
USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = equipments.client_id AND clients.org_id = public.auth_org_id()));

CREATE POLICY "Users can modify org equipments" ON equipments FOR ALL
USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = equipments.client_id AND clients.org_id = public.auth_org_id()));

-- PUBLIC ACCESS POLICY FOR PORTAL/QR CODES
-- Anyone can read an equipment if they have the specific qr_code_uid
CREATE POLICY "Public read equipment via qr_code" ON equipments FOR SELECT USING (true);
-- Note: You might want to restrict this in production via API route, but for a direct Supabase connection this is needed for the /e/:qrCodeUid route.

-- --- Service Orders Policies ---
-- Security through join: service_order -> equipment -> client -> org
CREATE POLICY "Users can view org service orders" ON service_orders FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM equipments 
  JOIN clients ON equipments.client_id = clients.id
  WHERE equipments.id = service_orders.equipment_id AND clients.org_id = public.auth_org_id()
));

CREATE POLICY "Users can modify org service orders" ON service_orders FOR ALL
USING (EXISTS (
  SELECT 1 FROM equipments 
  JOIN clients ON equipments.client_id = clients.id
  WHERE equipments.id = service_orders.equipment_id AND clients.org_id = public.auth_org_id()
));

-- 4. Triggers (Optional but helpful)
-- ====================================================================================

-- Create a user record automatically when someone signs up in Supabase Auth
-- Note: In a real multitenant environment, signups are usually invite-based.
-- This trigger assumes the user will be assigned an org_id manually or via a separate flow.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, avatar_url)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'Nome do Usuário'), new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
