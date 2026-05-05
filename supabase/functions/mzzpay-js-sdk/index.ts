import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * mzzpay-js-sdk
 * ─────────────
 * Serves the drop-in MzzPay.js script that merchants embed on their sites.
 * Designed to be served from js.mzzpay.io/mzzpay.js (or via the edge function URL).
 *
 * The script creates an iframe that points to the hosted checkout page,
 * communicates via postMessage, and exposes a simple MzzPay.init() API.
 */

const CHECKOUT_ORIGIN = "https://checkout.mzzpay.io";
const FALLBACK_CHECKOUT = "https://mzzpay.io/checkout";

const sdkScript = `
(function(global) {
  'use strict';

  var MzzPay = {
    _version: '1.0.0',

    init: function(opts) {
      if (!opts || !opts.containerId) {
        console.error('[MzzPay] containerId is required');
        return;
      }

      var container = document.getElementById(opts.containerId);
      if (!container) {
        console.error('[MzzPay] Container element not found: ' + opts.containerId);
        return;
      }

      // Build checkout URL
      var base = '${FALLBACK_CHECKOUT}';
      var params = new URLSearchParams();
      if (opts.publicKey) params.set('key', opts.publicKey);
      if (opts.amount) params.set('amount', String(opts.amount));
      if (opts.currency) params.set('currency', opts.currency);
      if (opts.description) params.set('description', opts.description);
      if (opts.theme && opts.theme.companyName) params.set('name', opts.theme.companyName);
      if (opts.options && opts.options.testMode) params.set('test', '1');

      var url = base + '?' + params.toString();

      // Create iframe
      var iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.style.cssText = 'width:100%;min-height:520px;border:none;border-radius:12px;';
      iframe.setAttribute('allowpaymentrequest', 'true');
      iframe.setAttribute('allow', 'payment');
      iframe.title = 'MzzPay Payment Form';

      container.innerHTML = '';
      container.appendChild(iframe);

      // Listen for postMessage from checkout
      var callbacks = opts.callbacks || {};
      window.addEventListener('message', function handler(event) {
        // Only accept messages from our checkout origins
        if (event.origin !== '${CHECKOUT_ORIGIN}' &&
            event.origin !== 'https://mzzpay.io' &&
            event.origin !== 'https://mzzpay.lovable.app') return;

        var data = event.data;
        if (!data || !data.type) return;

        if (data.type === 'mzzpay:success' && callbacks.onSuccess) {
          callbacks.onSuccess(data.payload);
        } else if (data.type === 'mzzpay:error' && callbacks.onError) {
          callbacks.onError(data.payload);
        } else if (data.type === 'mzzpay:close' && callbacks.onClose) {
          callbacks.onClose();
        } else if (data.type === 'mzzpay:resize' && data.height) {
          iframe.style.height = data.height + 'px';
        }
      });

      return { iframe: iframe, destroy: function() {
        container.innerHTML = '';
      }};
    }
  };

  global.MzzPay = MzzPay;
})(typeof window !== 'undefined' ? window : this);
`;

serve(async (req: Request) => {
  // CORS headers for cross-origin script loading
  const headers = new Headers({
    "Content-Type": "application/javascript; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "public, max-age=300, s-maxage=3600",
    "X-Content-Type-Options": "nosniff",
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  return new Response(sdkScript, { status: 200, headers });
});
