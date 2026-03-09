import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CHARGEFLOW_API_URL = 'https://api.chargeflow.io/public/2025-04-01';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const chargeflowApiKey = Deno.env.get('CHARGEFLOW_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const { data: merchant } = await supabase
      .from('merchants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!merchant) throw new Error('Merchant not found');

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'list-disputes': {
        // Fetch from local DB
        const { data: disputes, error } = await supabase
          .from('disputes')
          .select('*')
          .eq('merchant_id', merchant.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, disputes: disputes || [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'sync-disputes': {
        if (!chargeflowApiKey) {
          throw new Error('Chargeflow API key not configured');
        }

        // Fetch disputes from Chargeflow API
        const response = await fetch(`${CHARGEFLOW_API_URL}/disputes`, {
          headers: { 'x-api-key': chargeflowApiKey },
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Chargeflow API error: ${error}`);
        }

        const result = await response.json();
        const disputes = result.data || [];

        // Upsert disputes into local DB
        for (const dispute of disputes) {
          await supabase.from('disputes').upsert({
            merchant_id: merchant.id,
            chargeflow_id: dispute.id,
            amount: dispute.amount || 0,
            currency: dispute.currency || 'USD',
            status: dispute.status || 'open',
            reason: dispute.reason,
            evidence_due_date: dispute.evidence_due_date,
            provider: dispute.provider,
            customer_email: dispute.customer_email,
            description: dispute.description,
            outcome: dispute.outcome,
            chargeflow_payload: dispute,
          }, { onConflict: 'chargeflow_id' });
        }

        return new Response(
          JSON.stringify({ success: true, synced: disputes.length }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-dispute': {
        const { dispute_id } = await req.json();
        
        const { data: dispute, error } = await supabase
          .from('disputes')
          .select('*')
          .eq('id', dispute_id)
          .eq('merchant_id', merchant.id)
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, dispute }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'enrich-dispute': {
        if (!chargeflowApiKey) {
          throw new Error('Chargeflow API key not configured');
        }

        const body = await req.json();
        const { dispute_id, chargeflow_dispute_id, order_data } = body;

        // Send order data to Chargeflow to enrich the dispute
        const response = await fetch(
          `${CHARGEFLOW_API_URL}/disputes/${chargeflow_dispute_id}/order`,
          {
            method: 'POST',
            headers: {
              'x-api-key': chargeflowApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(order_data),
          }
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Chargeflow enrich error: ${error}`);
        }

        const result = await response.json();

        // Update local dispute
        await supabase.from('disputes')
          .update({ chargeflow_payload: result })
          .eq('id', dispute_id);

        return new Response(
          JSON.stringify({ success: true, result }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Chargeflow error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
