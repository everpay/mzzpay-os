import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * mzzpay-js-sdk — Drop-in MzzPay.js embed script for merchants.
 * Served from js.mzzpay.io/mzzpay.js (or via the edge function URL).
 *
 * Security:
 *  - Strict postMessage origin validation (only checkout.mzzpay.io, mzzpay.io, mzzpay.lovable.app)
 *  - CSP headers to restrict iframe embedding
 *  - X-Frame-Options DENY (this script page itself should not be framed)
 */

const ALLOWED_ORIGINS = [
  "https://checkout.mzzpay.io",
  "https://mzzpay.io",
  "https://www.mzzpay.io",
  "https://mzzpay.lovable.app",
];

const CHECKOUT_BASE = "https://mzzpay.io/checkout";

const sdkScript = `
(function(global) {
  'use strict';

  var ALLOWED_ORIGINS = ${JSON.stringify(ALLOWED_ORIGINS)};

  var MzzPay = {
    _version: '1.2.0',

    /**
     * MzzPay.init(opts)
     *
     * Required:
     *   containerId  — DOM element ID to mount the payment form
     *   publicKey    — Merchant public API key (pk_live_... or pk_test_...)
     *   amount       — Payment amount (number)
     *   currency     — ISO 4217 currency code
     *
     * Optional:
     *   merchantId   — Merchant UUID (for multi-merchant setups)
     *   invoiceId    — Invoice or payment link ID
     *   description  — Payment description
     *   testMode     — boolean, default false
     *   theme        — { primaryColor, buttonText, companyName, logoUrl }
     *   options      — { showCardBrands, enableAPMs }
     *   callbacks    — { onSuccess(payload), onError(payload), onClose(), onReady() }
     *   successUrl   — Redirect URL after successful payment
     *   cancelUrl    — Redirect URL on cancel
     *   metadata     — Arbitrary key/value pairs forwarded to the transaction
     */
    init: function(opts) {
      if (!opts || !opts.containerId) {
        console.error('[MzzPay] containerId is required');
        return null;
      }

      var container = document.getElementById(opts.containerId);
      if (!container) {
        console.error('[MzzPay] Container element not found: ' + opts.containerId);
        return null;
      }

      // Build checkout URL with all parameters
      var params = new URLSearchParams();
      if (opts.publicKey)    params.set('key', opts.publicKey);
      if (opts.amount)       params.set('amount', String(opts.amount));
      if (opts.currency)     params.set('currency', opts.currency);
      if (opts.description)  params.set('description', opts.description);
      if (opts.merchantId)   params.set('merchant_id', opts.merchantId);
      if (opts.invoiceId)    params.set('invoice_id', opts.invoiceId);
      if (opts.testMode)     params.set('test', '1');
      if (opts.successUrl)   params.set('success_url', opts.successUrl);
      if (opts.cancelUrl)    params.set('cancel_url', opts.cancelUrl);
      if (opts.theme && opts.theme.companyName) params.set('name', opts.theme.companyName);
      if (opts.metadata) {
        try { params.set('metadata', JSON.stringify(opts.metadata)); } catch(e) {}
      }

      var url = '${CHECKOUT_BASE}?' + params.toString();

      // Create iframe with security attributes
      var iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.style.cssText = 'width:100%;min-height:520px;border:none;border-radius:12px;';
      iframe.setAttribute('allowpaymentrequest', 'true');
      iframe.setAttribute('allow', 'payment');
      iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin allow-popups');
      iframe.title = 'MzzPay Payment Form';

      container.innerHTML = '';
      container.appendChild(iframe);

      // Strict postMessage origin validation
      var callbacks = opts.callbacks || {};
      function messageHandler(event) {
        // SECURITY: Only accept messages from allowed origins
        if (ALLOWED_ORIGINS.indexOf(event.origin) === -1) {
          return;
        }

        var data = event.data;
        if (!data || typeof data !== 'object' || !data.type) return;
        // Validate the type prefix
        if (data.type.indexOf('mzzpay:') !== 0) return;

        switch (data.type) {
          case 'mzzpay:success':
            if (callbacks.onSuccess) callbacks.onSuccess(data.payload);
            break;
          case 'mzzpay:error':
            if (callbacks.onError) callbacks.onError(data.payload);
            break;
          case 'mzzpay:close':
            if (callbacks.onClose) callbacks.onClose();
            break;
          case 'mzzpay:ready':
            if (callbacks.onReady) callbacks.onReady();
            break;
          case 'mzzpay:resize':
            if (data.height && typeof data.height === 'number') {
              iframe.style.height = data.height + 'px';
            }
            break;
        }
      }

      window.addEventListener('message', messageHandler);

      return {
        iframe: iframe,
        destroy: function() {
          window.removeEventListener('message', messageHandler);
          container.innerHTML = '';
        }
      };
    }
  };

  global.MzzPay = MzzPay;
})(typeof window !== 'undefined' ? window : this);
`;

serve(async (req: Request) => {
  const headers = new Headers({
    "Content-Type": "application/javascript; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "public, max-age=300, s-maxage=3600",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'none'; script-src 'self'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  return new Response(sdkScript, { status: 200, headers });
});
