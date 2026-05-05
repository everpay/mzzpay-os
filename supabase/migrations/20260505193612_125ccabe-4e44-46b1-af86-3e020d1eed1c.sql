DO $$
DECLARE
  v_user_id uuid;
  v_password text := 'MathanA1984!';
  v_emails text[] := ARRAY['paylyfe@gmail.com', 'richard.r@everpayinc.com'];
  v_email text;
BEGIN
  FOREACH v_email IN ARRAY v_emails LOOP
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change,
        email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
        v_email, crypt(v_password, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        now(), now(), '', '', '', ''
      );
      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      VALUES (gen_random_uuid(), v_user_id,
              jsonb_build_object('sub', v_user_id::text, 'email', v_email),
              'email', v_user_id::text, now(), now(), now());
    ELSE
      UPDATE auth.users
      SET encrypted_password = crypt(v_password, gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          updated_at = now()
      WHERE id = v_user_id;
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'super_admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Use ON CONFLICT on user_id since that's the unique constraint
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
      INSERT INTO public.profiles (id, user_id, status)
      VALUES (v_user_id, v_user_id, 'active')
      ON CONFLICT (user_id) DO UPDATE SET status = 'active';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
      INSERT INTO public.users (user_id, email, role)
      VALUES (v_user_id, v_email, 'super_admin')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;