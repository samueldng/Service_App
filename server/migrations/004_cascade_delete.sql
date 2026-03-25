-- Migration 004: Add ON DELETE CASCADE to foreign keys
-- This fixes the inability to delete records due to FK constraint violations
-- Safe to run multiple times (idempotent)

-- service_orders -> equipments: CASCADE on delete
ALTER TABLE service_orders
  DROP CONSTRAINT IF EXISTS service_orders_equipment_id_fkey;
ALTER TABLE service_orders
  ADD CONSTRAINT service_orders_equipment_id_fkey
  FOREIGN KEY (equipment_id) REFERENCES equipments(id) ON DELETE CASCADE;

-- equipments -> clients: CASCADE on delete
ALTER TABLE equipments
  DROP CONSTRAINT IF EXISTS equipments_client_id_fkey;
ALTER TABLE equipments
  ADD CONSTRAINT equipments_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- equipments -> sectors: SET NULL on delete (equipment stays, just loses sector)
ALTER TABLE equipments
  DROP CONSTRAINT IF EXISTS equipments_sector_id_fkey;
ALTER TABLE equipments
  ADD CONSTRAINT equipments_sector_id_fkey
  FOREIGN KEY (sector_id) REFERENCES sectors(id) ON DELETE SET NULL;

-- sectors -> clients: CASCADE on delete
ALTER TABLE sectors
  DROP CONSTRAINT IF EXISTS sectors_client_id_fkey;
ALTER TABLE sectors
  ADD CONSTRAINT sectors_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
