-- 0022_rbac_additions.sql

-- Add columns to user_profiles
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS user_type text DEFAULT 'farmer',
  ADD COLUMN IF NOT EXISTS tenant_id varchar(32) REFERENCES public.tenants(id) ON DELETE SET NULL;

-- Add parent_id to roles for tree structure
ALTER TABLE public.roles 
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.roles(id) ON DELETE CASCADE;

-- Update the handle_new_user_profile trigger function to support these if needed
CREATE OR REPLACE FUNCTION public.handle_new_user_profile() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, phone_number, user_type)
  VALUES (
    NEW.id, 
    NEW.email::text, 
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone_number',
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'farmer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
