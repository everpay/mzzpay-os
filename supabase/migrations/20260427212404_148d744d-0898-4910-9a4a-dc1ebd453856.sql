-- 1) Revoke PUBLIC EXECUTE on SECURITY DEFINER helper functions so they aren't
--    callable directly via PostgREST. Keep callable from triggers / internal use.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.accept_team_invitations_on_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_admin_writes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_retry_settings_for_merchant() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 2) Replace permissive public-bucket SELECT policies on email-assets storage.
--    The "Public read individual email-assets" policy allowed listing the bucket
--    (bucket_id = 'email-assets' with no name filter). Drop it; keep the policy
--    that requires a non-empty foldered path so direct file reads still work.
DROP POLICY IF EXISTS "Public read individual email-assets" ON storage.objects;
-- "Public can read email-assets files" already restricts to objects with a path,
-- so listing the bucket root returns nothing.