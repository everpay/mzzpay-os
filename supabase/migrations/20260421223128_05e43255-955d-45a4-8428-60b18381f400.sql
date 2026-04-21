-- Trigger function: create profile + merchant on new auth user
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

  -- Create profile
  INSERT INTO public.profiles (user_id, display_name, phone_number)
  VALUES (NEW.id, v_display_name, v_phone)
  ON CONFLICT DO NOTHING;

  -- Create merchant
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

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block signup if downstream insert fails
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill the orphaned signup
INSERT INTO public.profiles (user_id, display_name, phone_number)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
  u.raw_user_meta_data->>'phone_number'
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;

INSERT INTO public.merchants (user_id, name, contact_name, contact_email, phone_number, business_currency, status)
SELECT
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data->>'business_name', ''), COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email,'@',1)) || '''s Business'),
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
  u.email,
  u.raw_user_meta_data->>'phone_number',
  COALESCE(u.raw_user_meta_data->>'business_currency', 'USD'),
  'active'
FROM auth.users u
LEFT JOIN public.merchants m ON m.user_id = u.id
WHERE m.id IS NULL;