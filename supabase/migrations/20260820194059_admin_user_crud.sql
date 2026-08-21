CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.create_user_by_admin(
    p_email TEXT,
    p_full_name TEXT,
    p_phone_number TEXT,
    p_user_type TEXT,
    p_password TEXT DEFAULT 'password123'
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
        phone
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
        p_phone_number
    );

    -- The trigger `on_auth_user_created` will create the row in user_profiles.
    -- We just need to update it with the additional fields.
    UPDATE public.user_profiles
    SET 
        phone_number = p_phone_number,
        user_type = p_user_type
    WHERE id = new_user_id;

    RETURN new_user_id;
END;
$$;
