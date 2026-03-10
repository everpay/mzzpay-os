import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailPayload {
  type: 'payment_receipt' | 'payout_confirmation' | 'subscription_invoice' | 'payment_failed' | 'refund_confirmation' | 'invoice_sent';
  to: string;
  data: Record<string, any>;
}

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
};

const buildEmailHtml = (type: string, data: Record<string, any>): { subject: string; html: string } => {
  const brandColor = 'hsl(172, 72%, 48%)';
  const headerStyle = `font-family: 'Space Grotesk', sans-serif; font-size: 24px; font-weight: bold; color: #0f172a; margin: 0 0 16px;`;
  const textStyle = `font-family: 'Inter', sans-serif; font-size: 15px; color: #64748b; line-height: 1.6; margin: 0 0 20px;`;
  const buttonStyle = `display: inline-block; background-color: ${brandColor}; color: #0f1419; font-size: 15px; font-weight: 600; border-radius: 8px; padding: 14px 24px; text-decoration: none;`;
  const footerStyle = `font-family: 'Inter', sans-serif; font-size: 13px; color: #94a3b8; margin: 32px 0 0;`;

  const wrapper = (content: string) => `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="background-color: #ffffff; font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0;">
      <div style="max-width: 480px; margin: 0 auto; padding: 32px 28px;">
        <p style="font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: bold; color: ${brandColor}; margin: 0 0 24px;">💳 Everpay</p>
        ${content}
        <p style="${footerStyle}">This is an automated message from Everpay. Please do not reply directly to this email.</p>
      </div>
    </body>
    </html>`;

  switch (type) {
    case 'payment_receipt':
      return {
        subject: `Payment receipt for ${formatCurrency(data.amount, data.currency)}`,
        html: wrapper(`
          <h1 style="${headerStyle}">Payment Confirmed</h1>
          <p style="${textStyle}">Your payment has been processed successfully.</p>
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
            <table style="width: 100%; font-family: 'Inter', sans-serif; font-size: 14px;">
              <tr><td style="color: #64748b; padding: 4px 0;">Amount</td><td style="text-align: right; font-weight: 600; color: #0f172a;">${formatCurrency(data.amount, data.currency)}</td></tr>
              <tr><td style="color: #64748b; padding: 4px 0;">Transaction ID</td><td style="text-align: right; font-family: monospace; font-size: 12px; color: #0f172a;">${data.transaction_id || 'N/A'}</td></tr>
              <tr><td style="color: #64748b; padding: 4px 0;">Date</td><td style="text-align: right; color: #0f172a;">${new Date(data.date || Date.now()).toLocaleDateString()}</td></tr>
              ${data.description ? `<tr><td style="color: #64748b; padding: 4px 0;">Description</td><td style="text-align: right; color: #0f172a;">${data.description}</td></tr>` : ''}
            </table>
          </div>
          <p style="${textStyle}">Thank you for your payment.</p>
        `),
      };

    case 'payout_confirmation':
      return {
        subject: `Payout of ${formatCurrency(data.amount, data.currency)} initiated`,
        html: wrapper(`
          <h1 style="${headerStyle}">Payout Initiated</h1>
          <p style="${textStyle}">Your payout has been submitted and is being processed.</p>
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
            <table style="width: 100%; font-family: 'Inter', sans-serif; font-size: 14px;">
              <tr><td style="color: #64748b; padding: 4px 0;">Amount</td><td style="text-align: right; font-weight: 600; color: #0f172a;">${formatCurrency(data.amount, data.currency)}</td></tr>
              <tr><td style="color: #64748b; padding: 4px 0;">Bank Account</td><td style="text-align: right; color: #0f172a;">•••• ${data.account_last4 || '****'}</td></tr>
              <tr><td style="color: #64748b; padding: 4px 0;">Expected Arrival</td><td style="text-align: right; color: #0f172a;">1-2 business days</td></tr>
            </table>
          </div>
          <p style="${textStyle}">You'll receive a confirmation once the funds arrive.</p>
        `),
      };

    case 'subscription_invoice':
      return {
        subject: `Invoice for ${data.plan_name || 'your subscription'}`,
        html: wrapper(`
          <h1 style="${headerStyle}">Subscription Invoice</h1>
          <p style="${textStyle}">Here's your invoice for the current billing period.</p>
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
            <table style="width: 100%; font-family: 'Inter', sans-serif; font-size: 14px;">
              <tr><td style="color: #64748b; padding: 4px 0;">Plan</td><td style="text-align: right; font-weight: 600; color: #0f172a;">${data.plan_name || 'Subscription'}</td></tr>
              <tr><td style="color: #64748b; padding: 4px 0;">Amount</td><td style="text-align: right; color: #0f172a;">${formatCurrency(data.amount, data.currency)}</td></tr>
              <tr><td style="color: #64748b; padding: 4px 0;">Period</td><td style="text-align: right; color: #0f172a;">${data.period_start ? new Date(data.period_start).toLocaleDateString() : ''} - ${data.period_end ? new Date(data.period_end).toLocaleDateString() : ''}</td></tr>
            </table>
          </div>
        `),
      };

    case 'payment_failed':
      return {
        subject: `Payment failed — action required`,
        html: wrapper(`
          <h1 style="${headerStyle}">Payment Failed</h1>
          <p style="${textStyle}">We were unable to process your payment. Please update your payment method to avoid service interruption.</p>
          <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
            <table style="width: 100%; font-family: 'Inter', sans-serif; font-size: 14px;">
              <tr><td style="color: #64748b; padding: 4px 0;">Amount Due</td><td style="text-align: right; font-weight: 600; color: #dc2626;">${formatCurrency(data.amount, data.currency)}</td></tr>
              ${data.retry_attempt ? `<tr><td style="color: #64748b; padding: 4px 0;">Retry Attempt</td><td style="text-align: right; color: #0f172a;">${data.retry_attempt}</td></tr>` : ''}
            </table>
          </div>
          ${data.portal_url ? `<a href="${data.portal_url}" style="${buttonStyle}">Update Payment Method</a>` : ''}
        `),
      };

    case 'refund_confirmation':
      return {
        subject: `Refund of ${formatCurrency(data.amount, data.currency)} processed`,
        html: wrapper(`
          <h1 style="${headerStyle}">Refund Processed</h1>
          <p style="${textStyle}">Your refund has been processed and will be returned to your original payment method.</p>
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
            <table style="width: 100%; font-family: 'Inter', sans-serif; font-size: 14px;">
              <tr><td style="color: #64748b; padding: 4px 0;">Refund Amount</td><td style="text-align: right; font-weight: 600; color: #0f172a;">${formatCurrency(data.amount, data.currency)}</td></tr>
              <tr><td style="color: #64748b; padding: 4px 0;">Original Transaction</td><td style="text-align: right; font-family: monospace; font-size: 12px; color: #0f172a;">${data.transaction_id || 'N/A'}</td></tr>
              <tr><td style="color: #64748b; padding: 4px 0;">Expected Return</td><td style="text-align: right; color: #0f172a;">5-10 business days</td></tr>
            </table>
          </div>
        `),
      };

    case 'invoice_sent': {
      const lineItemsHtml = Array.isArray(data.items) && data.items.length > 0
        ? data.items.map((item: any) => `
          <tr>
            <td style="color: #0f172a; padding: 6px 0; border-bottom: 1px solid #e2e8f0;">${item.description || 'Item'}</td>
            <td style="text-align: center; color: #64748b; padding: 6px 0; border-bottom: 1px solid #e2e8f0;">${item.quantity || 1}</td>
            <td style="text-align: right; color: #0f172a; padding: 6px 0; border-bottom: 1px solid #e2e8f0;">${formatCurrency((item.quantity || 1) * (item.unit_price || 0), data.currency)}</td>
          </tr>`).join('')
        : '';

      return {
        subject: `Invoice ${data.invoice_number} from Everpay — ${formatCurrency(data.amount, data.currency)}`,
        html: wrapper(`
          <h1 style="${headerStyle}">You've received an invoice</h1>
          <p style="${textStyle}">${data.customer_name ? `Hi ${data.customer_name},` : 'Hi,'} you have a new invoice from Everpay.</p>
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
            <table style="width: 100%; font-family: 'Inter', sans-serif; font-size: 14px;">
              <tr><td style="color: #64748b; padding: 4px 0;">Invoice</td><td style="text-align: right; font-weight: 600; color: #0f172a;">${data.invoice_number}</td></tr>
              <tr><td style="color: #64748b; padding: 4px 0;">Amount Due</td><td style="text-align: right; font-weight: 600; color: #0f172a;">${formatCurrency(data.amount, data.currency)}</td></tr>
              ${data.due_date ? `<tr><td style="color: #64748b; padding: 4px 0;">Due Date</td><td style="text-align: right; color: #0f172a;">${new Date(data.due_date).toLocaleDateString()}</td></tr>` : ''}
              ${data.description ? `<tr><td style="color: #64748b; padding: 4px 0;">Description</td><td style="text-align: right; color: #0f172a;">${data.description}</td></tr>` : ''}
            </table>
            ${lineItemsHtml ? `
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
              <table style="width: 100%; font-family: 'Inter', sans-serif; font-size: 13px;">
                <tr><th style="text-align: left; color: #64748b; padding: 4px 0; font-weight: 500;">Item</th><th style="text-align: center; color: #64748b; padding: 4px 0; font-weight: 500;">Qty</th><th style="text-align: right; color: #64748b; padding: 4px 0; font-weight: 500;">Total</th></tr>
                ${lineItemsHtml}
              </table>
            ` : ''}
          </div>
          <a href="${data.payment_url}" style="${buttonStyle}">Pay Invoice →</a>
          <p style="${textStyle}; margin-top: 20px;">If the button doesn't work, copy this link: <span style="font-size: 12px; word-break: break-all;">${data.payment_url}</span></p>
        `),
      };
    }

    default:
      return { subject: 'Notification from Everpay', html: wrapper(`<p style="${textStyle}">${JSON.stringify(data)}</p>`) };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const payload: EmailPayload = await req.json();
    const { type, to, data } = payload;

    if (!type || !to) {
      throw new Error('Missing required fields: type, to');
    }

    const { subject, html } = buildEmailHtml(type, data);

    console.log(`Sending ${type} email to ${to}: ${subject}`);

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_API_KEY.startsWith('re_') && RESEND_API_KEY.length < 50 
          ? 'Everpay <onboarding@resend.dev>'  // Test sender for testing
          : 'Everpay <notify@everpayinc.com>',
        to: [to],
        subject,
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(`Resend API error [${resendResponse.status}]: ${JSON.stringify(resendData)}`);
    }

    console.log('Email sent successfully:', resendData.id);

    return new Response(
      JSON.stringify({ success: true, email_id: resendData.id, type, to }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Send email error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
