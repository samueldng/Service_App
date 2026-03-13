-- ====================================================================================
-- MaintQR SaaS - Fix Equipment RLS Data Leak
-- Execution: Copy and paste this script into the Supabase SQL Editor and run it.
-- Purpose: Restricts equipment visibility to only the owning tenant, while keeping public QR code access safe via the RPC function we already created.
-- ====================================================================================

-- 1. Drop the flawed public policy that was exposing all equipments to everyone
DROP POLICY IF EXISTS "Public read equipment via qr_code" ON equipments;

-- 2. Re-create the tenant isolation policy just to be absolutely sure it's correct
DROP POLICY IF EXISTS "Users can view org equipments" ON equipments;

CREATE POLICY "Users can view org equipments" ON equipments FOR SELECT 
USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = equipments.client_id AND clients.org_id = public.auth_org_id()));

-- Notice we do NOT re-create the `USING (true)` policy. 
-- The public tracking page now safely uses the `get_public_equipment_data` RPC function instead, 
-- which bypasses RLS securely for a specific QR Code without opening the entire table.

-- 3. Re-create Service Orders isolation policy to be absolutely sure it's tight
DROP POLICY IF EXISTS "Users can view org service orders" ON service_orders;

CREATE POLICY "Users can view org service orders" ON service_orders FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM equipments 
  JOIN clients ON equipments.client_id = clients.id
  WHERE equipments.id = service_orders.equipment_id AND clients.org_id = public.auth_org_id()
));

-- 4. Do the same for modification permissions
DROP POLICY IF EXISTS "Users can modify org equipments" ON equipments;
CREATE POLICY "Users can modify org equipments" ON equipments FOR ALL
USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = equipments.client_id AND clients.org_id = public.auth_org_id()));

DROP POLICY IF EXISTS "Users can modify org service orders" ON service_orders;
CREATE POLICY "Users can modify org service orders" ON service_orders FOR ALL
USING (EXISTS (
  SELECT 1 FROM equipments 
  JOIN clients ON equipments.client_id = clients.id
  WHERE equipments.id = service_orders.equipment_id AND clients.org_id = public.auth_org_id()
));
