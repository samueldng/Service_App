
-- Fix search_path warnings on all functions
CREATE OR REPLACE FUNCTION public.auth_org_id() RETURNS UUID AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, avatar_url)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'Usuário'), new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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

  INSERT INTO public.organizations (name, subscription_plan, max_equipments, trial_ends_at)
  VALUES (org_name, plan_name, equip_limit, NOW() + INTERVAL '7 days')
  RETURNING id INTO new_org_id;

  UPDATE public.users 
  SET org_id = new_org_id, role = 'admin' 
  WHERE id = auth.uid();

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
      FROM public.service_orders so WHERE so.equipment_id = e.id
    ), '[]'::jsonb)
  ) INTO result
  FROM public.equipments e
  LEFT JOIN public.clients c ON c.id = e.client_id
  LEFT JOIN public.sectors s ON s.id = e.sector_id
  WHERE e.qr_code_uid = qr_uid;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
