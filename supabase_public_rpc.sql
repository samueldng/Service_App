-- ====================================================================================
-- MaintQR SaaS - Public Equipment Tracking RPC
-- Execution: Copy and paste this script into the Supabase SQL Editor and run it.
-- Purpose: Safely allows anonymous users to view equipment tracking details without exposing the entire database.
-- ====================================================================================

CREATE OR REPLACE FUNCTION public.get_public_equipment_data(qr_uid UUID)
RETURNS JSON AS $$
DECLARE
  eq_record RECORD;
  result JSON;
BEGIN
  -- Find the equipment matching the public QR Code UID
  SELECT * INTO eq_record FROM public.equipments WHERE qr_code_uid = qr_uid;
  
  -- If not found, exit early
  IF eq_record IS NULL THEN
    RETURN NULL;
  END IF;

  -- Build a secure JSON object containing ONLY the data related to this specific equipment
  SELECT json_build_object(
    'equipment', row_to_json(eq_record),
    'client', (SELECT row_to_json(c) FROM public.clients c WHERE c.id = eq_record.client_id),
    'sector', (SELECT row_to_json(s) FROM public.sectors s WHERE s.id = eq_record.sector_id),
    'orders', (
        SELECT COALESCE(json_agg(row_to_json(so)), '[]'::json) 
        FROM (
            SELECT * FROM public.service_orders 
            WHERE equipment_id = eq_record.id 
            ORDER BY date DESC
        ) so
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
