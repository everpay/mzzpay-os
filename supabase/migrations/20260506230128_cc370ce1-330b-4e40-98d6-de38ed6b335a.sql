DO $$
DECLARE
  v_user_id uuid;
  v_emails text[] := ARRAY[
    'paylyfe@gmail.com',
    'richard.r@everpayinc.com',
    'privatepartner41@gmail.com'
  ];
  v_email text;
BEGIN
  FOREACH v_email IN ARRAY v_emails LOOP
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user_id, 'super_admin'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
        INSERT INTO public.profiles (user_id)
        VALUES (v_user_id)
        ON CONFLICT (user_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Catch-all backup
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::app_role
FROM auth.users u
WHERE u.email IN ('paylyfe@gmail.com','richard.r@everpayinc.com','privatepartner41@gmail.com')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = u.id AND ur.role = 'super_admin'::app_role
  );