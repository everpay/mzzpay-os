import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const now = new Date().toISOString();

    // Find all sent invoices with a due_date in the past
    const { data: overdueInvoices, error } = await supabase
      .from('invoices')
      .update({ status: 'overdue' })
      .eq('status', 'sent')
      .not('due_date', 'is', null)
      .lt('due_date', now)
      .select('id, invoice_number, customer_email');

    if (error) throw error;

    console.log(`Marked ${overdueInvoices?.length || 0} invoices as overdue`);

    return new Response(
      JSON.stringify({ updated: overdueInvoices?.length || 0, invoices: overdueInvoices }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Overdue check error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
