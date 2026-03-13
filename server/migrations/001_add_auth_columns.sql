-- ====================================================================================
-- MaintQR Migration: Add auth columns + fix UUID defaults for VPS
-- Run this on the VPS PostgreSQL database
-- ====================================================================================

-- 1. Add auth columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create unique index on email (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'users_email_unique') THEN
    CREATE UNIQUE INDEX users_email_unique ON users(email);
  END IF;
END $$;

-- 2. Remove FK constraint to auth.users (Supabase-specific table that doesn't exist on VPS)
-- First check if it exists before dropping
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_id_fkey' AND table_name = 'users'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_id_fkey;
  END IF;
END $$;

-- 3. Update UUID defaults from uuid_generate_v4() to gen_random_uuid()
ALTER TABLE organizations ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE clients ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE sectors ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE equipments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE equipments ALTER COLUMN qr_code_uid SET DEFAULT gen_random_uuid();
ALTER TABLE service_orders ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 4. Disable RLS on all tables (backend now handles authorization via middleware)
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE sectors DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders DISABLE ROW LEVEL SECURITY;

-- 5. Add missing columns that may exist in Supabase but not in migration
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_equipments INTEGER DEFAULT 30;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;

-- 6. Add photos columns to service_orders if not present
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS photos_before JSONB;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS photos_after JSONB;

-- Done!
-- After running this, set passwords for existing users:
-- UPDATE users SET email = 'user@email.com', password_hash = '$2a$12$...' WHERE id = '...';
