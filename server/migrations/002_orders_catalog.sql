-- ====================================================================================
-- MaintQR Migration: Add catalog_items, orders, order_items tables
-- Run this on the VPS PostgreSQL database
-- ====================================================================================

-- 1. Catalog Items — global per organization
CREATE TABLE IF NOT EXISTS catalog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('peca', 'servico')) NOT NULL,
    default_price NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Orders — financial/budget entity linked to client + equipment
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES equipments(id) ON DELETE SET NULL,
    defect TEXT,
    observations TEXT,
    status TEXT CHECK (status IN ('pendente','aprovado','em_andamento','concluido','cancelado')) DEFAULT 'pendente',
    subtotal NUMERIC(10,2) DEFAULT 0,
    discount NUMERIC(10,2) DEFAULT 0,
    delivery_fee NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(10,2) DEFAULT 0,
    payment_method TEXT,
    warranty TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Order Items — parts/services selected from catalog
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    catalog_item_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('peca', 'servico')) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS (backend handles authorization via middleware)
ALTER TABLE catalog_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- Done!
