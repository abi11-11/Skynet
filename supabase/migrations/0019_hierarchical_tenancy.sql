-- 0019_hierarchical_tenancy.sql

-- 1. Create tenants table
CREATE TABLE public.tenants (
  id varchar(32) PRIMARY KEY, -- e.g., "a1b2c3d4.e5f6g7h8"
  name text NOT NULL,
  level int NOT NULL CHECK (level IN (1, 2, 3)),
  parent_id varchar(32) REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Index for highly efficient prefix matching (e.g., LIKE 'a1b2c3d4%')
CREATE INDEX idx_tenants_id_pattern ON public.tenants (id text_pattern_ops);

-- 2. Create tenant_users mapping table
CREATE TABLE public.tenant_users (
  tenant_id varchar(32) REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'sub-manager')),
  PRIMARY KEY (tenant_id, user_id)
);

-- RLS for tenants and tenant_users
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

-- 2.5. Security Definer function to check tenant access without RLS recursion
CREATE OR REPLACE FUNCTION public.has_tenant_access(target_tenant_id varchar) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = auth.uid()
    AND target_tenant_id LIKE tenant_id || '%'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- You can see a tenant if you are part of it, OR if you are part of its parent hierarchy
CREATE POLICY select_tenants ON public.tenants
  FOR SELECT USING (public.has_tenant_access(id));

CREATE POLICY select_tenant_users ON public.tenant_users
  FOR SELECT USING (public.has_tenant_access(tenant_id));

-- 3. Add tenant_id to farm_plots
ALTER TABLE public.farm_plots ADD COLUMN tenant_id varchar(32) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 4. Helper function to generate an 8-char hex hash based on random data
CREATE OR REPLACE FUNCTION public.generate_tenant_hash() RETURNS text AS $$
BEGIN
  RETURN substr(md5(random()::text), 1, 8);
END;
$$ LANGUAGE plpgsql;

-- 5. Function to create a Level 1 tenant for new signups or existing users
CREATE OR REPLACE FUNCTION public.create_level_1_tenant_for_user(target_user_id uuid, target_email text) RETURNS varchar AS $$
DECLARE
  new_tenant_id varchar(32);
BEGIN
  new_tenant_id := public.generate_tenant_hash();
  
  INSERT INTO public.tenants (id, name, level, parent_id)
  VALUES (new_tenant_id, split_part(target_email, '@', 1) || '''s Organization', 1, NULL);
  
  INSERT INTO public.tenant_users (tenant_id, user_id, role)
  VALUES (new_tenant_id, target_user_id, 'owner');
  
  RETURN new_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger to automatically create a tenant when a new user registers
CREATE OR REPLACE FUNCTION public.handle_new_user_tenant() RETURNS trigger AS $$
BEGIN
  PERFORM public.create_level_1_tenant_for_user(NEW.id, NEW.email::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_tenant ON auth.users;
CREATE TRIGGER on_auth_user_created_tenant
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_tenant();

-- 7. Migrate existing users and plots
DO $$
DECLARE
  u record;
  t_id varchar(32);
BEGIN
  FOR u IN SELECT id, email FROM auth.users LOOP
    IF NOT EXISTS (SELECT 1 FROM public.tenant_users WHERE user_id = u.id) THEN
      t_id := public.create_level_1_tenant_for_user(u.id, u.email::text);
      -- Migrate their plots to this new tenant
      UPDATE public.farm_plots SET tenant_id = t_id WHERE owner_id = u.id;
    END IF;
  END LOOP;
END;
$$;

-- Make tenant_id NOT NULL now that data is migrated
ALTER TABLE public.farm_plots ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX idx_farm_plots_tenant_pattern ON public.farm_plots (tenant_id text_pattern_ops);

-- 8. Function to split a plot/farm and create a child tenant
CREATE OR REPLACE FUNCTION public.create_child_tenant(p_parent_tenant_id varchar(32), p_new_manager_id uuid, p_tenant_name text) RETURNS varchar AS $$
DECLARE
  parent_level int;
  new_level int;
  new_hash text;
  new_tenant_id varchar(32);
BEGIN
  -- Verify parent exists
  SELECT level INTO parent_level FROM public.tenants WHERE id = p_parent_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent tenant not found';
  END IF;
  
  new_level := parent_level + 1;
  IF new_level > 3 THEN
    RAISE EXCEPTION 'Maximum tenancy depth (3 levels) reached';
  END IF;

  new_hash := public.generate_tenant_hash();
  new_tenant_id := p_parent_tenant_id || '.' || new_hash;

  INSERT INTO public.tenants (id, name, level, parent_id)
  VALUES (new_tenant_id, p_tenant_name, new_level, p_parent_tenant_id);

  INSERT INTO public.tenant_users (tenant_id, user_id, role)
  VALUES (new_tenant_id, p_new_manager_id, CASE WHEN new_level = 2 THEN 'manager' ELSE 'sub-manager' END);

  RETURN new_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Replace old RLS on farm_plots with new Hierarchical Hashed Path Policy
DROP POLICY IF EXISTS select_farm_plots_assigned ON public.farm_plots;
DROP POLICY IF EXISTS insert_farm_plots_owner ON public.farm_plots;
DROP POLICY IF EXISTS update_farm_plots_owner ON public.farm_plots;
DROP POLICY IF EXISTS delete_farm_plots_owner ON public.farm_plots;

CREATE POLICY select_farm_plots ON public.farm_plots
  FOR SELECT USING (public.has_tenant_access(tenant_id));

CREATE POLICY insert_farm_plots ON public.farm_plots
  FOR INSERT WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY update_farm_plots ON public.farm_plots
  FOR UPDATE USING (public.has_tenant_access(tenant_id)) 
  WITH CHECK (public.has_tenant_access(tenant_id));

CREATE POLICY delete_farm_plots ON public.farm_plots
  FOR DELETE USING (public.has_tenant_access(tenant_id));
