CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name text;
  v_phone text;
  v_business_name text;
  v_business_currency text;
  v_country text;
BEGIN
  v_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
  v_phone := NEW.raw_user_meta_data->>'phone_number';
  v_business_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'business_name', ''), v_display_name || '''s Business');
  v_business_currency := COALESCE(NEW.raw_user_meta_data->>'business_currency', 'USD');
  v_country := COALESCE(NEW.raw_user_meta_data->>'country', 'US');

  INSERT INTO public.profiles (user_id, display_name, phone_number)
  VALUES (NEW.id, v_display_name, v_phone)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.merchants (user_id, name, contact_name, contact_email, phone_number, business_currency, status)
  VALUES (
    NEW.id,
    v_business_name,
    v_display_name,
    NEW.email,
    v_phone,
    v_business_currency,
    'active'
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'merchant'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

INSERT INTO public.user_roles (user_id, role)
SELECT m.user_id, 'merchant'::public.app_role
FROM public.merchants m
WHERE m.user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;