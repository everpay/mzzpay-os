import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ELEKTROPAY_BASE = Deno.env.get('ELEKTROPAY_BASE_URL') || 'https://apiv3.elektropay.com';

type Action =
  | 'list_assets'
  | 'sync_assets'
  | 'get_accounts'
  | 'create_store'
  | 'create_wallet'
  | 'get_address'
  | 'create_deposit'
  | 'create_withdrawal'
  | 'create_transfer'
  | 'convert'
  | 'list_wallets'
  | 'freeze_wallet'
  | 'close_wallet'
  | 'auto_provision_us_merchant'
  | 'auto_provision_merchant'
  | 'commission_upsert'
  | 'commission_delete'
  | 'retry_webhook';

interface RequestBody { action: Action; payload?: Record<string, any>; }

async function callElektropay(path: string, opts: { method?: string; body?: any } = {}) {
  const apiKey = Deno.env.get('ELEKTROPAY_API_KEY');
  if (!apiKey) throw new Error('ELEKTROPAY_API_KEY not configured');

  const res = await fetch(`${ELEKTROPAY_BASE}${path}`, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`Elektropay ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ success: false, error: 'Authentication required' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return jsonResponse({ success: false, error: 'Invalid auth' }, 401);

    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const isAdmin = roles?.some((r: any) => r.role === 'super_admin' || r.role === 'admin');

    const body: RequestBody = await req.json();
    const { action, payload = {} } = body;

    console.log(`[elektropay-wallet] action=${action} user=${user.id}`);

    switch (action) {
      case 'list_assets': {
        const { data } = await supabase.from('crypto_assets').select('*').eq('is_active', true).order('symbol');
        return jsonResponse({ success: true, data });
      }

      case 'sync_assets': {
        if (!isAdmin) return forbidden();
        const remote = await callElektropay('/assets');
        const list = Array.isArray(remote) ? remote : remote?.assets || [];
        for (const a of list) {
          await supabase.from('crypto_assets').upsert({
            asset_id: a.asset_id || a.id,
            symbol: a.symbol || a.asset_id,
            name: a.name || a.symbol,
            network: a.network || a.crypto_network,
            decimals: a.decimals ?? 8,
            is_fiat: a.is_fiat ?? false,
            min_withdrawal_amount: a.min_withdrawal_amount,
            max_withdrawal_amount: a.max_withdrawal_amount,
          }, { onConflict: 'asset_id' });
        }
        return jsonResponse({ success: true, synced: list.length });
      }

      case 'get_accounts': {
        const accounts = await callElektropay('/accounts');
        return jsonResponse({ success: true, data: accounts });
      }

      case 'create_store': {
        if (!isAdmin) return forbidden();
        const { merchant_id, name, base_currency = 'USD' } = payload;
        if (!merchant_id || !name) return jsonResponse({ success: false, error: 'merchant_id and name required' }, 400);

        const { data, error } = await supabase.from('crypto_stores').insert({
          merchant_id, name, base_currency, metadata: { created_by: user.id },
        }).select().single();
        if (error) throw error;
        await audit(supabase, user, 'crypto_store_created', merchant_id, data);
        return jsonResponse({ success: true, data });
      }

      case 'create_wallet': {
        const { store_id, asset_id, is_user_added = false } = payload;
        if (!store_id || !asset_id) return jsonResponse({ success: false, error: 'store_id and asset_id required' }, 400);

        const { data: store, error: storeErr } = await supabase
          .from('crypto_stores').select('id, merchant_id').eq('id', store_id).single();
        if (storeErr) throw storeErr;

        if (!isAdmin) {
          // In this project, profiles don't carry merchant_id; merchants table has user_id.
          const { data: ownedMerchant } = await supabase.from('merchants')
            .select('id').eq('user_id', user.id).maybeSingle();
          if (ownedMerchant?.id !== store.merchant_id) return forbidden();

          if (is_user_added) {
            const { count } = await supabase.from('crypto_wallets')
              .select('*', { count: 'exact', head: true })
              .eq('merchant_id', store.merchant_id)
              .eq('is_user_added', true);
            if ((count ?? 0) >= 2) {
              return jsonResponse({ success: false, error: 'Maximum of 2 additional wallets reached' }, 400);
            }
          }
        }

        let address: string | null = null;
        let network: string | null = null;
        try {
          const dedicate = await callElektropay('/dedicate', {
            method: 'POST',
            body: { payment_asset_id: asset_id, dedicate_type: 'USES' },
          });
          address = dedicate?.address || null;
          network = dedicate?.crypto_network || null;
        } catch (e) {
          console.warn('Elektropay dedicate failed, creating wallet without address:', e);
        }

        const { data: asset } = await supabase.from('crypto_assets').select('network').eq('asset_id', asset_id).single();

        const { data, error } = await supabase.from('crypto_wallets').insert({
          store_id, merchant_id: store.merchant_id, asset_id, address,
          network: network || asset?.network, is_user_added,
        }).select().single();
        if (error) throw error;
        await audit(supabase, user, 'crypto_wallet_created', store.merchant_id, data);
        return jsonResponse({ success: true, data });
      }

      case 'create_deposit': {
        const { wallet_id, amount } = payload;
        const wallet = await getWalletWithGuard(supabase, wallet_id, user, isAdmin);
        if (!wallet) return forbidden();

        let elektropayResp: any = {};
        try {
          elektropayResp = await callElektropay('/payment', {
            method: 'POST',
            body: {
              amount: String(amount || 0),
              asset_id: wallet.asset_id,
              payment_asset_id: wallet.asset_id,
              payment_type: amount ? 'FIXED_AMOUNT' : 'OPEN_AMOUNT',
            },
          });
        } catch (e) { console.warn('Elektropay payment create failed:', e); }

        const { data, error } = await supabase.from('crypto_transactions').insert({
          wallet_id, merchant_id: wallet.merchant_id, store_id: wallet.store_id,
          tx_type: 'deposit', status: 'pending', asset_id: wallet.asset_id,
          amount: amount || 0, to_address: elektropayResp?.address || wallet.address,
          elektropay_id: elektropayResp?.payment_id,
          metadata: { payment_url: elektropayResp?.payment_url, raw: elektropayResp },
          initiated_by: user.id,
        }).select().single();
        if (error) throw error;
        await audit(supabase, user, 'crypto_deposit_initiated', wallet.merchant_id, data);
        return jsonResponse({ success: true, data, payment_url: elektropayResp?.payment_url, address: data.to_address });
      }

      case 'create_withdrawal': {
        const { wallet_id, amount, to_address } = payload;
        const wallet = await getWalletWithGuard(supabase, wallet_id, user, isAdmin);
        if (!wallet) return forbidden();
        if (!amount || !to_address) return jsonResponse({ success: false, error: 'amount and to_address required' }, 400);
        if (Number(wallet.available) < Number(amount)) {
          return jsonResponse({ success: false, error: 'Insufficient available balance' }, 400);
        }

        let elektropayResp: any = {};
        try {
          elektropayResp = await callElektropay('/withdraw', {
            method: 'POST',
            body: { amount: String(amount), asset_id: wallet.asset_id, address: to_address },
          });
        } catch (e) { console.warn('Elektropay withdraw failed:', e); }

        const { data, error } = await supabase.from('crypto_transactions').insert({
          wallet_id, merchant_id: wallet.merchant_id, store_id: wallet.store_id,
          tx_type: 'withdrawal',
          status: elektropayResp?.status === 'COMPLETE' ? 'complete' : 'pending',
          asset_id: wallet.asset_id, amount,
          fee: elektropayResp?.fee ?? 0,
          fee_asset_id: elektropayResp?.fee_asset_id ?? wallet.asset_id,
          to_address, elektropay_id: elektropayResp?.withdraw_id,
          metadata: { raw: elektropayResp }, initiated_by: user.id,
        }).select().single();
        if (error) throw error;
        await audit(supabase, user, 'crypto_withdraw_initiated', wallet.merchant_id, data);
        return jsonResponse({ success: true, data });
      }

      case 'create_transfer': {
        if (!isAdmin) return forbidden();
        const { from_wallet_id, to_wallet_id, amount, description } = payload;
        const { data: fromW } = await supabase.from('crypto_wallets').select('*').eq('id', from_wallet_id).single();
        const { data: toW } = await supabase.from('crypto_wallets').select('*').eq('id', to_wallet_id).single();
        if (!fromW || !toW) return jsonResponse({ success: false, error: 'wallets not found' }, 404);

        let elektropayResp: any = {};
        try {
          elektropayResp = await callElektropay('/transfer', {
            method: 'POST',
            body: { amount: String(amount), asset_id: fromW.asset_id, description },
          });
        } catch (e) { console.warn('transfer failed:', e); }

        await supabase.from('crypto_transactions').insert([
          { wallet_id: from_wallet_id, merchant_id: fromW.merchant_id, store_id: fromW.store_id,
            tx_type: 'transfer_out', status: 'complete', asset_id: fromW.asset_id, amount,
            elektropay_id: elektropayResp?.transfer_id, description, initiated_by: user.id },
          { wallet_id: to_wallet_id, merchant_id: toW.merchant_id, store_id: toW.store_id,
            tx_type: 'transfer_in', status: 'complete', asset_id: toW.asset_id, amount,
            elektropay_id: elektropayResp?.transfer_id, description, initiated_by: user.id },
        ]);
        await audit(supabase, user, 'crypto_transfer', fromW.merchant_id, { from: from_wallet_id, to: to_wallet_id, amount });
        return jsonResponse({ success: true, data: elektropayResp });
      }

      case 'convert': {
        const { wallet_id, amount, target_asset_id } = payload;
        const wallet = await getWalletWithGuard(supabase, wallet_id, user, isAdmin);
        if (!wallet) return forbidden();

        let elektropayResp: any = {};
        try {
          elektropayResp = await callElektropay('/convert', {
            method: 'POST',
            body: { amount: String(amount), asset_id: wallet.asset_id, to_asset_id: target_asset_id },
          });
        } catch (e) { console.warn('convert failed:', e); }

        const { data, error } = await supabase.from('crypto_transactions').insert({
          wallet_id, merchant_id: wallet.merchant_id, store_id: wallet.store_id,
          tx_type: 'convert', status: 'complete', asset_id: wallet.asset_id, amount,
          rate: elektropayResp?.rate, rate_date: elektropayResp?.rate_date,
          metadata: { target_asset_id, raw: elektropayResp }, initiated_by: user.id,
        }).select().single();
        if (error) throw error;
        await audit(supabase, user, 'crypto_convert', wallet.merchant_id, data);
        return jsonResponse({ success: true, data });
      }

      case 'list_wallets': {
        const { merchant_id } = payload;
        let q = supabase.from('crypto_wallets').select('*, crypto_stores(name, base_currency)');
        if (merchant_id) q = q.eq('merchant_id', merchant_id);
        const { data, error } = await q;
        if (error) throw error;
        return jsonResponse({ success: true, data });
      }

      case 'freeze_wallet':
      case 'close_wallet': {
        if (!isAdmin) return forbidden();
        const { wallet_id } = payload;
        const status = action === 'freeze_wallet' ? 'frozen' : 'closed';
        const { data, error } = await supabase.from('crypto_wallets')
          .update({ status, is_active: status === 'frozen' }).eq('id', wallet_id).select().single();
        if (error) throw error;
        await audit(supabase, user, `crypto_wallet_${status}`, data.merchant_id, data);
        return jsonResponse({ success: true, data });
      }

      case 'auto_provision_us_merchant':
      case 'auto_provision_merchant': {
        const { merchant_id, business_name, country } = payload;
        if (!merchant_id || !business_name) return jsonResponse({ success: false, error: 'merchant_id and business_name required' }, 400);

        const cc = String(country || '').toUpperCase();
        const SANCTIONED = ['IR','IRAN','KP','NORTH KOREA','SY','SYRIA','CU','CUBA','RU','RUSSIA','BY','BELARUS','MM','MYANMAR','VE','VENEZUELA','ZW','ZIMBABWE','SD','SUDAN','SS','SOUTH SUDAN'];
        if (cc && SANCTIONED.includes(cc)) {
          await audit(supabase, user, 'crypto_provision_skipped_sanctioned', merchant_id, { country: cc });
          return jsonResponse({ success: true, skipped: true, reason: 'sanctioned region' });
        }
        const NA = ['US','USA','UNITED STATES','CA','CANADA','MX','MEXICO'];
        const isNA = NA.includes(cc);
        const defaultAssetId = isNA ? 'USDC.ERC20' : 'USDT.TRC20';
        const defaultNetwork = isNA ? 'ERC20' : 'TRC20';

        const { data: store, error: storeErr } = await supabase.from('crypto_stores').upsert({
          merchant_id, name: business_name, base_currency: 'USD',
          metadata: { auto_provisioned: true, region: isNA ? 'NA' : 'INTL', country: cc || null },
        }, { onConflict: 'merchant_id,name' }).select().single();
        if (storeErr) throw storeErr;

        const existing = await supabase.from('crypto_wallets').select('id, address')
          .eq('store_id', store.id).eq('asset_id', defaultAssetId).maybeSingle();

        let wallet = existing.data;
        if (!wallet) {
          let address: string | null = null;
          try {
            const ded = await callElektropay('/dedicate', {
              method: 'POST',
              body: { payment_asset_id: defaultAssetId, dedicate_type: 'USES' },
            });
            address = ded?.address || null;
          } catch (e) { console.warn('dedicate failed during provision:', e); }

          const ins = await supabase.from('crypto_wallets').insert({
            store_id: store.id, merchant_id, asset_id: defaultAssetId,
            network: defaultNetwork, address, is_default: true,
          }).select().single();
          if (ins.error) throw ins.error;
          wallet = ins.data;
        }

        await audit(supabase, user, 'crypto_auto_provisioned', merchant_id, {
          store_id: store.id, wallet_id: wallet?.id, asset_id: defaultAssetId, region: isNA ? 'NA' : 'INTL',
        });
        return jsonResponse({ success: true, store, wallet, asset_id: defaultAssetId });
      }

      case 'commission_upsert': {
        if (!isAdmin) return forbidden();
        const row = payload.row || payload;
        const { data, error } = await supabase.from('crypto_commissions').upsert(row).select().single();
        if (error) throw error;
        await audit(supabase, user, 'crypto_commission_upsert', data.merchant_id ?? 'global', data);
        return jsonResponse({ success: true, data });
      }

      case 'commission_delete': {
        if (!isAdmin) return forbidden();
        const { id } = payload;
        const { data: row } = await supabase.from('crypto_commissions').select('*').eq('id', id).maybeSingle();
        const { error } = await supabase.from('crypto_commissions').delete().eq('id', id);
        if (error) throw error;
        await audit(supabase, user, 'crypto_commission_delete', row?.merchant_id ?? 'global', row);
        return jsonResponse({ success: true });
      }

      case 'retry_webhook': {
        if (!isAdmin) return forbidden();
        const { event_id } = payload;
        const { data: ev } = await supabase.from('elektropay_webhook_events').select('*').eq('event_id', event_id).maybeSingle();
        if (!ev) return jsonResponse({ success: false, error: 'event not found' }, 404);
        const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/elektropay-webhook`;
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ev.payload) });
        const ok = r.ok;
        await audit(supabase, user, 'crypto_webhook_retry', 'system', { event_id, ok });
        return jsonResponse({ success: ok });
      }

      default:
        return jsonResponse({ success: false, error: `Unknown action: ${action}` }, 400);
    }
  } catch (e: any) {
    console.error('[elektropay-wallet] error:', e);
    return jsonResponse({ success: false, error: e?.message || 'Unexpected error' }, 500);
  }
});

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function forbidden() { return jsonResponse({ success: false, error: 'Forbidden' }, 403); }

async function getWalletWithGuard(supabase: any, wallet_id: string, user: any, isAdmin: boolean) {
  if (!wallet_id) return null;
  const { data: wallet } = await supabase.from('crypto_wallets').select('*').eq('id', wallet_id).single();
  if (!wallet) return null;
  if (isAdmin) return wallet;
  const { data: ownedMerchant } = await supabase.from('merchants').select('id').eq('user_id', user.id).maybeSingle();
  return ownedMerchant?.id === wallet.merchant_id ? wallet : null;
}

async function audit(supabase: any, user: any, change_type: string, merchant_id: string, data: any) {
  try {
    const isUuid = typeof merchant_id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(merchant_id);
    await supabase.from('audit_logs').insert({
      action: change_type,
      entity_type: 'crypto',
      entity_id: typeof merchant_id === 'string' ? merchant_id : String(merchant_id),
      user_id: user.id,
      merchant_id: isUuid ? merchant_id : null,
      metadata: { change_type, actor_email: user.email, payload: data },
    });
  } catch (e) { console.warn('audit failed:', e); }
}
