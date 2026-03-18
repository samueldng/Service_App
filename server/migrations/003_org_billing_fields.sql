-- ====================================================================================
-- MaintQR Migration 003: Add organization billing/bank fields + order counter
-- ====================================================================================

-- Organization contact & address
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_name TEXT;

-- Bank / PIX
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_agency TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_account_type TEXT DEFAULT 'corrente';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_holder TEXT;

-- Sequential order counter per organization
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS order_counter INTEGER DEFAULT 0;

-- Sequential order number on orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number INTEGER;
