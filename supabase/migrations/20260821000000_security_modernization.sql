-- Add lifecycle fields to user_profiles
ALTER TABLE public.user_profiles 
  ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN expires_at TIMESTAMPTZ DEFAULT NULL;

-- Update the existing create_user_by_admin function to support these fields
CREATE OR REPLACE FUNCTION public.create_user_by_admin(
    p_email TEXT,
    p_full_name TEXT,
    p_phone_number TEXT,
    p_user_type TEXT,
    p_password TEXT DEFAULT 'password123',
    p_is_active BOOLEAN DEFAULT TRUE,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id UUID;
    hashed_password TEXT;
BEGIN
    new_user_id := gen_random_uuid();
    hashed_password := crypt(p_password, gen_salt('bf'));

    INSERT INTO auth.users (
        id, 
        instance_id, 
        email, 
        encrypted_password, 
        email_confirmed_at, 
        raw_app_meta_data, 
        raw_user_meta_data, 
        aud, 
        role,
        created_at,
        updated_at,
        phone,
        banned_until
    ) VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        p_email,
        hashed_password,
        now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', p_full_name, 'phone_number', p_phone_number, 'user_type', p_user_type),
        'authenticated',
        'authenticated',
        now(),
        now(),
        p_phone_number,
        CASE WHEN p_is_active = FALSE THEN (now() + interval '100 years') ELSE NULL END
    );

    UPDATE public.user_profiles
    SET 
        phone_number = p_phone_number,
        user_type = p_user_type,
        is_active = p_is_active,
        expires_at = p_expires_at
    WHERE id = new_user_id;

    RETURN new_user_id;
END;
$$;

-- Create an RPC to update a user's lifecycle (deactivate/expire)
CREATE OR REPLACE FUNCTION public.update_user_lifecycle(
    p_user_id UUID,
    p_is_active BOOLEAN,
    p_expires_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.user_profiles
    SET is_active = p_is_active,
        expires_at = p_expires_at
    WHERE id = p_user_id;

    UPDATE auth.users
    SET banned_until = CASE 
        WHEN p_is_active = FALSE THEN (now() + interval '100 years') 
        WHEN p_expires_at IS NOT NULL AND p_expires_at < now() THEN (now() + interval '100 years')
        ELSE NULL 
    END
    WHERE id = p_user_id;
END;
$$;

-- ZTA: Helper function to check if current user is active
CREATE OR REPLACE FUNCTION public.is_current_user_active()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT COALESCE((SELECT is_active FROM public.user_profiles WHERE id = auth.uid()), false);
$$;

-- Drop insecure public access policies from RBAC
DROP POLICY IF EXISTS "Public read/write access for roles" ON public.roles;
DROP POLICY IF EXISTS "Public read/write access for groups" ON public.groups;
DROP POLICY IF EXISTS "Public read/write access for group_roles" ON public.group_roles;
DROP POLICY IF EXISTS "Public read/write access for user_groups" ON public.user_groups;
DROP POLICY IF EXISTS "Public read/write access for audit_logs" ON public.audit_logs;

-- Replace with authenticated-only Zero Trust policies
CREATE POLICY "ZTA access for roles" ON public.roles 
  FOR ALL USING (auth.role() = 'authenticated' AND public.is_current_user_active());

CREATE POLICY "ZTA access for groups" ON public.groups 
  FOR ALL USING (auth.role() = 'authenticated' AND public.is_current_user_active());

CREATE POLICY "ZTA access for group_roles" ON public.group_roles 
  FOR ALL USING (auth.role() = 'authenticated' AND public.is_current_user_active());

CREATE POLICY "ZTA access for user_groups" ON public.user_groups 
  FOR ALL USING (auth.role() = 'authenticated' AND public.is_current_user_active());

CREATE POLICY "ZTA access for audit_logs" ON public.audit_logs 
  FOR ALL USING (auth.role() = 'authenticated' AND public.is_current_user_active());
