-- ====================================================================================
-- MaintQR SaaS - Supabase RPC for Self-Serve Tenant Registration
-- Execution: Copy and paste this script into the Supabase SQL Editor and run it.
-- ====================================================================================

-- This function creates an Organization and links the authenticated User to it automatically.
-- It uses SECURITY DEFINER so it can bypass RLS temporarily to insert the Org.

CREATE OR REPLACE FUNCTION public.create_tenant_from_auth(org_name text)
RETURNS uuid AS $$
DECLARE
  new_org_id uuid;
BEGIN
  -- 1. Create the new Organization
  INSERT INTO organizations (name) VALUES (org_name) RETURNING id INTO new_org_id;
  
  -- 2. Update the calling user to be linked to this organization as 'admin'
  UPDATE public.users 
  SET org_id = new_org_id, role = 'admin' 
  WHERE id = auth.uid();
  
  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
