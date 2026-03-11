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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // --- Step 1: Send 48hr pre-notification emails ---
    const { data: upcomingReserves } = await supabase
      .from('rolling_reserves')
      .select('*, merchants(name, user_id, contact_email)')
      .eq('status', 'held')
      .lte('release_at', in48Hours.toISOString())
      .gt('release_at', now.toISOString());

    if (upcomingReserves && upcomingReserves.length > 0) {
      // Group by merchant
      const byMerchant: Record<string, { email: string; merchantName: string; reserves: any[] }> = {};
      for (const r of upcomingReserves) {
        const mid = r.merchant_id;
        if (!byMerchant[mid]) {
          // Get merchant's user email
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', (r as any).merchants?.user_id)
            .single();
          
          const { data: authUser } = await supabase.auth.admin.getUserById((r as any).merchants?.user_id);
          
          byMerchant[mid] = {
            email: (r as any).merchants?.contact_email || authUser?.user?.email || '',
            merchantName: (r as any).merchants?.name || 'Merchant',
            reserves: [],
          };
        }
        byMerchant[mid].reserves.push(r);
      }

      // Send notification emails
      for (const [, data] of Object.entries(byMerchant)) {
        if (!data.email) continue;
        
        const totalAmount = data.reserves.reduce((s: number, r: any) => s + Number(r.amount), 0);
        const currency = data.reserves[0]?.currency || 'USD';

        try {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              type: 'reserve_release_notice',
              to: data.email,
              data: {
                merchant_name: data.merchantName,
                amount: totalAmount,
                currency,
                reserve_count: data.reserves.length,
                release_date: data.reserves[0]?.release_at,
              },
            },
          });
          console.log(`Sent 48hr reserve release notice to ${data.email} for ${totalAmount} ${currency}`);
        } catch (e) {
          console.error(`Failed to send reserve notice to ${data.email}:`, e);
        }
      }
    }

    // --- Step 2: Release reserves that are past due ---
    const { data: dueReserves, error: fetchError } = await supabase
      .from('rolling_reserves')
      .select('*, merchants(name, user_id)')
      .eq('status', 'held')
      .lte('release_at', now.toISOString());

    if (fetchError) throw fetchError;

    let releasedCount = 0;
    let totalReleased = 0;

    if (dueReserves && dueReserves.length > 0) {
      for (const reserve of dueReserves) {
        // Update reserve status
        const { error: updateError } = await supabase
          .from('rolling_reserves')
          .update({ status: 'released', released_at: now.toISOString() })
          .eq('id', reserve.id);

        if (updateError) {
          console.error(`Failed to release reserve ${reserve.id}:`, updateError);
          continue;
        }

        // Credit merchant's available balance
        const { data: account } = await supabase
          .from('accounts')
          .select('id, available_balance')
          .eq('merchant_id', reserve.merchant_id)
          .eq('currency', reserve.currency)
          .single();

        if (account) {
          await supabase
            .from('accounts')
            .update({ available_balance: account.available_balance + Number(reserve.amount) })
            .eq('id', account.id);
        }

        // Log as a transaction (reserve release)
        const { data: releaseTx } = await supabase
          .from('transactions')
          .insert({
            merchant_id: reserve.merchant_id,
            amount: Number(reserve.amount),
            currency: reserve.currency,
            provider: 'system',
            status: 'completed',
            description: `Rolling reserve release (180-day hold) — original tx ${reserve.transaction_id}`,
          })
          .select()
          .single();

        // Log as provider event (activity feed)
        await supabase.from('provider_events').insert({
          merchant_id: reserve.merchant_id,
          transaction_id: releaseTx?.id || null,
          provider: 'system',
          event_type: 'reserve.released',
          payload: {
            reserve_id: reserve.id,
            amount: reserve.amount,
            currency: reserve.currency,
            original_transaction_id: reserve.transaction_id,
            held_at: reserve.held_at,
            released_at: now.toISOString(),
          },
        });

        releasedCount++;
        totalReleased += Number(reserve.amount);
        console.log(`Released reserve ${reserve.id}: ${reserve.amount} ${reserve.currency} for merchant ${(reserve as any).merchants?.name}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: upcomingReserves?.length || 0,
        reserves_released: releasedCount,
        total_released: totalReleased,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Reserve release error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});