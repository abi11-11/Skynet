-- Seed data for testing

-- 1. Insert the Users into auth.users so foreign key constraints on owner_id pass
-- Demo Admin User
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES (
  '11111111-1111-1111-1111-111111111111', 
  'authenticated', 
  'authenticated', 
  'admin@skynet.farm', 
  crypt('password', gen_salt('bf')), 
  NOW(),
  '{"full_name": "Admin User", "user_type": "admin"}'::jsonb
) ON CONFLICT DO NOTHING;

-- Demo Manager User
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES (
  '22222222-2222-2222-2222-222222222222', 
  'authenticated', 
  'authenticated', 
  'manager@skynet.farm', 
  crypt('password', gen_salt('bf')), 
  NOW(),
  '{"full_name": "Farm Manager", "user_type": "manager"}'::jsonb
) ON CONFLICT DO NOTHING;

-- Demo Farmer User (The original fallback ID)
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES (
  'eaa8b274-f66a-4e66-8e23-c4ed375f5476', 
  'authenticated', 
  'authenticated', 
  'farmer@skynet.farm', 
  crypt('password', gen_salt('bf')), 
  NOW(),
  '{"full_name": "John Farmer", "user_type": "farmer"}'::jsonb
) ON CONFLICT DO NOTHING;


-- Seed initial global tenant if not exists
INSERT INTO public.tenants (id, name, level, parent_id)
VALUES ('tenant-skynet-001', 'Skynet Global', 1, NULL)
ON CONFLICT (id) DO NOTHING;

-- Assign admin to the global tenant
INSERT INTO public.tenant_users (tenant_id, user_id, role)
VALUES ('tenant-skynet-001', '11111111-1111-1111-1111-111111111111', 'owner')
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- We will insert a mock booking for the first available farm plot if one exists,
DO $$
DECLARE
  v_plot_id uuid;
  v_pilot_id uuid;
BEGIN
  SELECT id, owner_id INTO v_plot_id, v_pilot_id FROM farm_plots LIMIT 1;
  
  IF v_plot_id IS NOT NULL THEN
    INSERT INTO bookings (plot_id, pilot_id, status)
    VALUES (v_plot_id, v_pilot_id, 'pending') ON CONFLICT DO NOTHING;
  END IF;
END $$;
