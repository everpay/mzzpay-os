import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is authenticated and is super_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !caller) throw new Error('Unauthorized');

    // Check if caller is super_admin (skip check if no super_admins exist yet - bootstrap mode)
    const { count } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'super_admin');

    if (count && count > 0) {
      const { data: callerRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', caller.id)
        .eq('role', 'super_admin')
        .single();

      if (!callerRole) throw new Error('Only super admins can invite other admins');
    }

    const { email, fullName, role, idempotencyKey } = await req.json();

    if (!email || !role) throw new Error('email and role are required');

    // Idempotency: if same key was used, return cached result
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from('idempotency_keys')
        .select('response, created_at')
        .eq('key', idempotencyKey)
        .maybeSingle();
      if (existing?.response) {
        return new Response(
          JSON.stringify({ ...existing.response, duplicate: true, first_seen_at: existing.created_at }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      // Send magic link to existing user
      const { error: otpError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });
      if (otpError) console.error('Magic link generation error:', otpError);
    } else {
      // Create new user and send invite (which acts as magic link)
      const { data: newUser, error: createError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { display_name: fullName },
      });
      if (createError) throw createError;
      userId = newUser.user.id;
    }

    // Upsert the role
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert(
        { user_id: userId, role, invited_by: caller.id },
        { onConflict: 'user_id,role' }
      );
    if (roleError) throw roleError;

    // Ensure profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!existingProfile) {
      await supabase
        .from('profiles')
        .insert({ user_id: userId, display_name: fullName });
    }

    // Send transactional team-invite email so invitee gets a branded notification
    let emailSent = false;
    let emailError: string | null = null;
    try {
      const emailRes = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'team-invite',
          recipientEmail: email,
          idempotencyKey: `team-invite-${userId}-${role}`,
          templateData: {
            inviteeName: fullName || email.split('@')[0],
            inviterName: caller.email || 'A team member',
            role,
            loginUrl: 'https://mzzpay.io/auth',
          },
        },
      });
      if (emailRes.error) {
        emailError = emailRes.error.message || 'Email service error';
        console.error('Transactional email error:', emailRes.error);
      } else {
        emailSent = true;
      }
    } catch (emailErr) {
      emailError = emailErr instanceof Error ? emailErr.message : String(emailErr);
      console.error('Failed to send team-invite transactional email:', emailErr);
    }

    const result = { success: true, userId, email, role, emailSent, emailError };

    // Cache in idempotency_keys so repeated clicks return the same result
    if (idempotencyKey) {
      await supabase.from('idempotency_keys').upsert({
        key: idempotencyKey,
        merchant_id: caller.id, // use caller id as scoping key
        response: result,
      }, { onConflict: 'key' }).catch(() => {});
    }

    // Log invite email outcome in provider_events for activity feed auditing
    try {
      // Find merchant for the caller
      const { data: callerMerchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', caller.id)
        .maybeSingle();
      if (callerMerchant) {
        await supabase.from('provider_events').insert({
          merchant_id: callerMerchant.id,
          provider: 'system',
          event_type: emailSent ? 'invite.email_sent' : 'invite.email_failed',
          payload: {
            invitee_email: email,
            role,
            inviter: caller.email,
            emailSent,
            emailError: emailError || null,
          },
        });
      }
    } catch (_) { /* best-effort */ }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === 'Unauthorized' ? 401 : message.includes('super admin') ? 403 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
