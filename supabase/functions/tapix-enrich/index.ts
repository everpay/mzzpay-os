import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TAPIX_BASE = 'https://api.tapix.io/v6';

interface EnrichRequest {
  action: 'enrich_card' | 'enrich_bank_transfer' | 'get_shop' | 'get_merchant' | 'enrich_full';
  posId?: string; merchantId?: string; description?: string; city?: string; country?: string; mcc?: string;
  transferType?: 'sepa' | 'uk' | 'certis';
  bic?: string; iban?: string; accountNumber?: string; sortCode?: string; name?: string; zip?: string;
  paymentType?: string; paymentMethod?: string;
  shopUid?: string; merchantUid?: string;
  transactionId?: string; transactionMerchantId?: string;
}

async function tapixFetch(path: string, token: string): Promise<any> {
  const res = await fetch(`${TAPIX_BASE}${path}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tapix API [${res.status}]: ${body}`);
  }
  return res.json();
}

async function findByCardTransaction(params: Record<string, string>, token: string) {
  return tapixFetch(`/shops/complete/findByCardTransaction?${new URLSearchParams(params)}`, token);
}
async function findByBankTransfer(type: string, params: Record<string, string>, token: string) {
  return tapixFetch(`/shops/findByBankTransfer/${type}?${new URLSearchParams(params)}`, token);
}
async function getShop(shopUid: string, token: string) {
  return tapixFetch(`/shops/${shopUid}`, token);
}
async function getMerchant(merchantUid: string, token: string) {
  return tapixFetch(`/merchants/${merchantUid}`, token);
}

async function enrichFull(findResult: any, token: string, useCompleteEndpoint = false) {
  const response: any = { findResult };
  if (useCompleteEndpoint && findResult.result === 'found' && findResult.shop) {
    response.shopData = findResult.shop;
    if (findResult.shop.merchantUid) {
      try { response.merchantData = await getMerchant(findResult.shop.merchantUid, token); }
      catch (e) { console.warn('merchant fetch failed:', e); }
    }
    return response;
  }
  if (findResult.result === 'found' && findResult.shop?.uid) {
    try {
      response.shopData = await getShop(findResult.shop.uid, token);
      if (response.shopData?.merchantUid) {
        try { response.merchantData = await getMerchant(response.shopData.merchantUid, token); }
        catch (e) { console.warn('merchant fetch failed:', e); }
      }
    } catch (e) { console.warn('shop fetch failed:', e); }
  }
  return response;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const TAPIX_TOKEN = Deno.env.get('TAPIX_TOKEN');
    if (!TAPIX_TOKEN) throw new Error('TAPIX_TOKEN is not configured');

    const body: EnrichRequest = await req.json();
    const { action } = body;
    if (!action) {
      return new Response(JSON.stringify({ error: 'action is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result: any;

    switch (action) {
      case 'enrich_card': {
        const p: Record<string, string> = {};
        if (body.posId) p.posId = body.posId;
        if (body.merchantId) p.merchantId = body.merchantId;
        if (body.description) p.description = body.description;
        if (body.city) p.city = body.city;
        if (body.country) p.country = body.country;
        if (body.mcc) p.mcc = body.mcc;
        p.refresh = 'false';
        const findResult = await findByCardTransaction(p, TAPIX_TOKEN);
        result = await enrichFull(findResult, TAPIX_TOKEN, true);
        break;
      }
      case 'enrich_bank_transfer': {
        const tt = body.transferType || 'sepa';
        const p: Record<string, string> = {};
        if (body.bic) p.bic = body.bic;
        if (body.iban) p.iban = body.iban;
        if (body.accountNumber) p.accountNumber = body.accountNumber;
        if (body.sortCode) p.sortCode = body.sortCode;
        if (body.name) p.name = body.name;
        if (body.city) p.city = body.city;
        if (body.country) p.country = body.country;
        if (body.zip) p.zip = body.zip;
        if (body.paymentType) p.paymentType = body.paymentType;
        if (body.paymentMethod) p.paymentMethod = body.paymentMethod;
        p.refresh = 'false';
        const findResult = await findByBankTransfer(tt, p, TAPIX_TOKEN);
        result = await enrichFull(findResult, TAPIX_TOKEN);
        break;
      }
      case 'get_shop': {
        if (!body.shopUid) {
          return new Response(JSON.stringify({ error: 'shopUid is required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        result = await getShop(body.shopUid, TAPIX_TOKEN);
        break;
      }
      case 'get_merchant': {
        if (!body.merchantUid) {
          return new Response(JSON.stringify({ error: 'merchantUid is required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        result = await getMerchant(body.merchantUid, TAPIX_TOKEN);
        break;
      }
      case 'enrich_full': {
        if (!body.transactionId || !body.transactionMerchantId) {
          return new Response(JSON.stringify({ error: 'transactionId and transactionMerchantId are required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );

        const { data: cached } = await supabaseAdmin
          .from('tapix_enrichment_cache')
          .select('*')
          .eq('transaction_id', body.transactionId)
          .maybeSingle();

        if (cached) {
          result = {
            cached: true,
            findResult: cached.raw_find_response,
            shopData: cached.shop_data,
            merchantData: cached.merchant_data,
            handle: cached.tapix_handle,
            shopUid: cached.shop_uid,
            merchantUid: cached.merchant_uid,
          };
          break;
        }

        const { data: txData } = await supabaseAdmin
          .from('transactions').select('*').eq('id', body.transactionId).single();
        if (!txData) {
          return new Response(JSON.stringify({ error: 'Transaction not found' }), {
            status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const meta = (txData as any).metadata || {};
        let enrichResult: any;
        let enrichmentType = 'card';

        const pmt = (meta.payment_method_type || meta.payment_type || meta.payment_method || '').toString();
        const isBankTransfer = ['ach','sepa','pix','boleto','bank_transfer','wire','open_banking','bacs','faster_payment']
          .some(t => pmt.toLowerCase().includes(t));

        if (isBankTransfer) {
          enrichmentType = 'bank_transfer';
          const bp: Record<string, string> = {};
          if (meta.bic) bp.bic = meta.bic;
          if (meta.iban) bp.iban = meta.iban;
          if (meta.account_number || meta.accountNumber) bp.accountNumber = meta.account_number || meta.accountNumber;
          if (meta.sort_code || meta.sortCode) bp.sortCode = meta.sort_code || meta.sortCode;
          if (meta.counterparty_name || meta.name) bp.name = meta.counterparty_name || meta.name;
          if (meta.city) bp.city = meta.city;
          if (meta.country || txData.currency === 'GBP') bp.country = meta.country || (txData.currency === 'GBP' ? 'GB' : '');
          if (meta.zip) bp.zip = meta.zip;
          bp.refresh = 'false';

          let tt = 'sepa';
          if (txData.currency === 'GBP' || meta.country === 'GB') tt = 'uk';
          else if (txData.currency === 'CZK' || meta.country === 'CZ') tt = 'certis';

          try {
            const findResult = await findByBankTransfer(tt, bp, TAPIX_TOKEN);
            enrichResult = await enrichFull(findResult, TAPIX_TOKEN);
          } catch (e) {
            console.warn('bank enrich failed:', e);
            enrichResult = { findResult: { result: 'error', error: String(e) } };
          }
        } else {
          const cp: Record<string, string> = {};
          if (meta.pos_id || meta.posId) cp.posId = meta.pos_id || meta.posId;
          if (meta.acquirer_merchant_id || meta.merchantId) cp.merchantId = meta.acquirer_merchant_id || meta.merchantId;
          if (txData.description) cp.description = txData.description;
          if (meta.city) cp.city = meta.city;
          if (meta.country) cp.country = meta.country;
          if (meta.mcc) cp.mcc = meta.mcc;
          if (meta.cardFirst6) cp.cardNumber = meta.cardFirst6;
          cp.refresh = 'false';

          const hasEnough = cp.description || cp.posId || cp.merchantId || cp.cardNumber;
          if (!hasEnough) {
            enrichResult = { findResult: { result: 'not_found', reason: 'insufficient_params' } };
          } else {
            try {
              const findResult = await findByCardTransaction(cp, TAPIX_TOKEN);
              enrichResult = await enrichFull(findResult, TAPIX_TOKEN, true);
            } catch (e) {
              console.warn('card enrich failed:', e);
              enrichResult = { findResult: { result: 'error', error: String(e) } };
            }
          }
        }

        // Local fallback when Tapix has no data — keep UI useful.
        const tapixFailed = !enrichResult?.shopData && !enrichResult?.merchantData;
        if (tapixFailed) {
          const enhanced = meta.enhancedCardInfo || {};
          const descriptor = txData.description || meta.descriptor || meta.descriptor_text || meta.statement_descriptor || '';
          const merchantName =
            meta.merchant_name || meta.acquirer_descriptor || descriptor ||
            (enhanced.issuer ? `${enhanced.issuer} cardholder` : null) || 'Unmatched merchant';
          const country = meta.country || meta.country_code || enhanced.countryCode ||
            (txData.currency === 'GBP' ? 'GB' : txData.currency === 'EUR' ? 'EU' : txData.currency === 'CZK' ? 'CZ' : null);
          const city = meta.city || null;
          const tags: string[] = [];
          if (enhanced.scheme) tags.push(enhanced.scheme);
          if (enhanced.type) tags.push(enhanced.type);
          if (enhanced.category && enhanced.category !== 'STANDARD') tags.push(enhanced.category);
          if (meta.payment_method_type) tags.push(meta.payment_method_type);
          if (meta.provider || txData.provider) tags.push(meta.provider || txData.provider);

          enrichResult = {
            findResult: { result: 'local_fallback', source: 'derived' },
            shopData: {
              uid: null,
              type: meta.ecommerce_flag === false ? 'bricks' : 'online',
              tags: Array.from(new Set(tags.filter(Boolean))),
              category: meta.mcc_category ? { name: meta.mcc_category } : null,
              location: (city || country) ? { address: { city, country, street: meta.address_line1 || null, zip: meta.postal_code || null } } : null,
              url: meta.merchant_url || null,
            },
            merchantData: { uid: null, name: merchantName, logo: enhanced.iconLogo || null },
          };
        }

        const cacheEntry = {
          transaction_id: body.transactionId,
          merchant_id: body.transactionMerchantId,
          tapix_handle: enrichResult.findResult?.handle || null,
          shop_uid: enrichResult.shopData?.uid || enrichResult.findResult?.shop?.uid || null,
          merchant_uid: enrichResult.merchantData?.uid || enrichResult.shopData?.merchantUid || null,
          enrichment_type: enrichmentType,
          shop_data: enrichResult.shopData || null,
          merchant_data: enrichResult.merchantData || null,
          raw_find_response: enrichResult.findResult || null,
        };

        await supabaseAdmin.from('tapix_enrichment_cache').upsert(cacheEntry, { onConflict: 'transaction_id' });

        result = {
          cached: false,
          ...enrichResult,
          handle: cacheEntry.tapix_handle,
          shopUid: cacheEntry.shop_uid,
          merchantUid: cacheEntry.merchant_uid,
        };
        break;
      }
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('tapix-enrich error:', error);
    return new Response(JSON.stringify({
      error: 'An internal error occurred',
      details: error instanceof Error ? error.message : 'Unknown',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
