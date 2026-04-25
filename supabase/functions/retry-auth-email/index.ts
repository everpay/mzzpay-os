// Re-enqueues a failed auth email by pulling it from the DLQ and pushing
// it back into the auth_emails queue. Logs a new "pending" row in
// email_send_log so the dashboard reflects the retry.
//
// Auth: requires service_role JWT (admin-only). The function is called
// from the admin email dashboard.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const payload = parts[1]
      .replaceAll('-', '+')
      .replaceAll('_', '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=')
    return JSON.parse(atob(payload)) as Record<string, unknown>
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Require an authenticated admin caller. Verify role via JWT claims and
  // also check the user_roles table via has_role for defence in depth.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const token = authHeader.slice('Bearer '.length).trim()
  const claims = parseJwtClaims(token)
  const userId = typeof claims?.sub === 'string' ? (claims.sub as string) : null
  const role = typeof claims?.role === 'string' ? (claims.role as string) : null

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  if (role !== 'service_role') {
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: isAdmin, error: roleError } = await supabase.rpc('is_admin', {
      _user_id: userId,
    })
    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  let messageId: string
  try {
    const body = await req.json()
    messageId = String(body.messageId || body.message_id || '')
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (!messageId) {
    return new Response(JSON.stringify({ error: 'messageId is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Confirm the message is actually in a retryable state (failed or dlq).
  const { data: latestLog } = await supabase
    .from('email_send_log')
    .select('status, template_name, recipient_email')
    .eq('message_id', messageId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestLog) {
    return new Response(JSON.stringify({ error: 'Email not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!['failed', 'dlq'].includes(latestLog.status)) {
    return new Response(
      JSON.stringify({
        error: `Cannot retry email in status "${latestLog.status}"`,
        code: 'not_retryable',
      }),
      { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Find the original payload in the DLQ. We scan up to 100 messages —
  // typical DLQ depth is small. If found, capture both the queue row id
  // (for deletion) and the payload (for re-enqueue).
  const { data: dlqMessages, error: readErr } = await supabase.rpc('read_email_batch', {
    queue_name: 'auth_emails_dlq',
    batch_size: 100,
    vt: 30,
  })

  if (readErr) {
    console.error('Failed to read DLQ', { error: readErr })
    return new Response(JSON.stringify({ error: 'Failed to read dead-letter queue' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const match = (dlqMessages ?? []).find(
    (m: { message?: { message_id?: string } }) => m?.message?.message_id === messageId
  )

  if (!match) {
    return new Response(
      JSON.stringify({
        error:
          'Original payload not available for retry. The auth flow must be re-triggered (e.g., user requests a new signup confirmation or password reset).',
        code: 'payload_not_in_dlq',
      }),
      { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Re-enqueue with a fresh queued_at so TTL resets, and clear any
  // stale rate-limit fields if present.
  const newPayload = {
    ...match.message,
    queued_at: new Date().toISOString(),
    retried_from_dlq: true,
  }

  const { error: enqueueErr } = await supabase.rpc('enqueue_email', {
    queue_name: 'auth_emails',
    payload: newPayload,
  })

  if (enqueueErr) {
    console.error('Failed to re-enqueue auth email', { error: enqueueErr, messageId })
    return new Response(JSON.stringify({ error: 'Failed to re-enqueue email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Remove from DLQ now that it's been re-enqueued.
  await supabase.rpc('delete_email', {
    queue_name: 'auth_emails_dlq',
    message_id: match.msg_id,
  })

  // Log the retry as a new pending row. Append-only — keeps the failed
  // row intact for audit while the dashboard surfaces the latest status.
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: latestLog.template_name,
    recipient_email: latestLog.recipient_email,
    status: 'pending',
    error_message: null,
    metadata: { retried_from: latestLog.status, retried_at: new Date().toISOString() },
  })

  return new Response(
    JSON.stringify({ success: true, requeued: true, message_id: messageId }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
