import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TAPIX_TOKEN = Deno.env.get('TAPIX_TOKEN');
    if (!TAPIX_TOKEN) {
      throw new Error('TAPIX_TOKEN is not configured');
    }

    const { cardNumber, amount, transactionId } = await req.json();

    if (!cardNumber) {
      return new Response(
        JSON.stringify({ error: 'cardNumber is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Tapix enrich endpoint
    const enrichResponse = await fetch('https://api.tapix.io/v1/enrich', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TAPIX_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        card_number: cardNumber,
        amount: amount || 0,
      }),
    });

    if (!enrichResponse.ok) {
      const errorData = await enrichResponse.text();
      throw new Error(`Tapix enrich API failed [${enrichResponse.status}]: ${errorData}`);
    }

    const enrichData = await enrichResponse.json();

    // Get transaction details if transactionId is provided
    let transactionData = null;
    if (transactionId) {
      const transactionResponse = await fetch(`https://api.tapix.io/v1/transactions/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${TAPIX_TOKEN}`,
        },
      });

      if (transactionResponse.ok) {
        transactionData = await transactionResponse.json();
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        enrichment: enrichData,
        transaction: transactionData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in tapix-enrich:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
