
-- Create profile and merchant for existing user
INSERT INTO public.profiles (user_id, display_name)
VALUES ('261a9ffe-feb5-471c-948e-5d3fc3fd4946', 'Richard Rowe')
ON CONFLICT DO NOTHING;
