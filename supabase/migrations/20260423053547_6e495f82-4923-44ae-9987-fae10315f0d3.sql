-- Confirm admin@mzzpay.io email so login works
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'admin@mzzpay.io' AND email_confirmed_at IS NULL;