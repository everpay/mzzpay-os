// One-off end-to-end test of the email queue RPCs.
// Calls enqueue_email -> read_email_batch -> move_to_dlq -> delete_email
// using the service-role client, so SECURITY DEFINER functions are allowed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const log: Record<string, unknown> = {};
  try {
    const payload = {
      message_id: `test-rpc-${crypto.randomUUID()}`,
      to: "test@mzzpay.io",
      subject: "RPC E2E test",
      html: "<p>hi</p>",
      queued_at: new Date().toISOString(),
    };

    // 1. enqueue
    const enq = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload,
    });
    if (enq.error) throw new Error(`enqueue_email failed: ${enq.error.message}`);
    log.step1_enqueue_msg_id = enq.data;

    // 2. read
    const rd = await supabase.rpc("read_email_batch", {
      queue_name: "transactional_emails",
      batch_size: 5,
      vt: 30,
    });
    if (rd.error) throw new Error(`read_email_batch failed: ${rd.error.message}`);
    const ours = (rd.data ?? []).find(
      (r: { message: { message_id?: string } }) => r?.message?.message_id === payload.message_id,
    );
    if (!ours) throw new Error("read_email_batch did not return our enqueued message");
    log.step2_read = { msg_id: ours.msg_id, read_ct: ours.read_ct, found: true };

    // 3. move_to_dlq
    const mv = await supabase.rpc("move_to_dlq", {
      source_queue: "transactional_emails",
      dlq_name: "transactional_emails_dlq",
      message_id: ours.msg_id,
      payload: ours.message,
    });
    if (mv.error) throw new Error(`move_to_dlq failed: ${mv.error.message}`);
    log.step3_dlq_id = mv.data;

    // 4. delete from DLQ to clean up
    const del = await supabase.rpc("delete_email", {
      queue_name: "transactional_emails_dlq",
      message_id: mv.data,
    });
    if (del.error) throw new Error(`delete_email failed: ${del.error.message}`);
    log.step4_deleted = del.data;

    return new Response(
      JSON.stringify({ success: true, summary: "ALL 4 RPCs OK ✅", log }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e), log }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
