
-- Enable the UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- organizations: Represents the tenants (service providers)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    document TEXT,
    email TEXT,
    phone TEXT,
    logo_url TEXT,
    brand_color TEXT,
    subscription_plan TEXT DEFAULT 'free',
    payment_status TEXT DEFAULT 'active',
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    max_equipments INTEGER DEFAULT 30,
    asaas_customer_id TEXT,
    asaas_subscription_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- users: Extends auth.users with app-specific roles
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'technician')) DEFAULT 'technician',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- clients
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    document TEXT NOT NULL,
    document_type TEXT CHECK (document_type IN ('CPF', 'CNPJ')),
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- sectors
CREATE TABLE IF NOT EXISTS sectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- equipments
CREATE TABLE IF NOT EXISTS equipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    sector_id UUID REFERENCES sectors(id) ON DELETE SET NULL,
    qr_code_uid UUID DEFAULT uuid_generate_v4() UNIQUE,
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

-- service_orders
CREATE TABLE IF NOT EXISTS service_orders (
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
    photos_before TEXT[],
    photos_after TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;

-- Helper function to get org_id
CREATE OR REPLACE FUNCTION public.auth_org_id() RETURNS UUID AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Organizations Policies
CREATE POLICY "Users can view their own organization" 
ON organizations FOR SELECT USING (id = public.auth_org_id());

CREATE POLICY "Admins can update their own organization" 
ON organizations FOR UPDATE USING (id = public.auth_org_id());

-- Users Policies
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can view org teammates" 
ON public.users FOR SELECT USING (org_id = public.auth_org_id());

CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON public.users FOR INSERT WITH CHECK (id = auth.uid());

-- Clients Policies
CREATE POLICY "Users can view org clients" ON clients FOR SELECT USING (org_id = public.auth_org_id());
CREATE POLICY "Users can insert org clients" ON clients FOR INSERT WITH CHECK (org_id = public.auth_org_id());
CREATE POLICY "Users can update org clients" ON clients FOR UPDATE USING (org_id = public.auth_org_id());
CREATE POLICY "Users can delete org clients" ON clients FOR DELETE USING (org_id = public.auth_org_id());

-- Sectors Policies
CREATE POLICY "Users can view org sectors" ON sectors FOR SELECT 
USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = sectors.client_id AND clients.org_id = public.auth_org_id()));

CREATE POLICY "Users can modify org sectors" ON sectors FOR ALL
USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = sectors.client_id AND clients.org_id = public.auth_org_id()));

-- Equipments Policies
CREATE POLICY "Users can view org equipments" ON equipments FOR SELECT 
USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = equipments.client_id AND clients.org_id = public.auth_org_id()));

CREATE POLICY "Users can modify org equipments" ON equipments FOR ALL
USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = equipments.client_id AND clients.org_id = public.auth_org_id()));

CREATE POLICY "Public read equipment via qr_code" ON equipments FOR SELECT USING (true);

-- Service Orders Policies
CREATE POLICY "Users can view org service orders" ON service_orders FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM equipments JOIN clients ON equipments.client_id = clients.id
  WHERE equipments.id = service_orders.equipment_id AND clients.org_id = public.auth_org_id()
));

CREATE POLICY "Users can modify org service orders" ON service_orders FOR ALL
USING (EXISTS (
  SELECT 1 FROM equipments JOIN clients ON equipments.client_id = clients.id
  WHERE equipments.id = service_orders.equipment_id AND clients.org_id = public.auth_org_id()
));

-- Trigger: auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, avatar_url)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'Usuário'), new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RPC: Create tenant from auth
CREATE OR REPLACE FUNCTION public.create_tenant_from_auth(org_name text, plan_name text DEFAULT 'starter')
RETURNS uuid AS $$
DECLARE
  new_org_id uuid;
  equip_limit integer;
BEGIN
  CASE plan_name
    WHEN 'starter' THEN equip_limit := 30;
    WHEN 'professional' THEN equip_limit := 150;
    WHEN 'enterprise' THEN equip_limit := 9999;
    ELSE equip_limit := 30;
  END CASE;

  INSERT INTO organizations (name, subscription_plan, max_equipments, trial_ends_at)
  VALUES (org_name, plan_name, equip_limit, NOW() + INTERVAL '7 days')
  RETURNING id INTO new_org_id;

  UPDATE public.users 
  SET org_id = new_org_id, role = 'admin' 
  WHERE id = auth.uid();

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage bucket for org logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read logos" ON storage.objects 
FOR SELECT USING (bucket_id = 'org-logos');

CREATE POLICY "Auth users upload logos" ON storage.objects 
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'org-logos');

CREATE POLICY "Auth users update logos" ON storage.objects 
FOR UPDATE TO authenticated USING (bucket_id = 'org-logos');

-- Public RPC for equipment data (QR code portal)
CREATE OR REPLACE FUNCTION public.get_public_equipment_data(qr_uid uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'equipment', row_to_json(e),
    'client', row_to_json(c),
    'sector', row_to_json(s),
    'orders', COALESCE((
      SELECT jsonb_agg(row_to_json(so) ORDER BY so.date DESC)
      FROM service_orders so WHERE so.equipment_id = e.id
    ), '[]'::jsonb)
  ) INTO result
  FROM equipments e
  LEFT JOIN clients c ON c.id = e.client_id
  LEFT JOIN sectors s ON s.id = e.sector_id
  WHERE e.qr_code_uid = qr_uid;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
