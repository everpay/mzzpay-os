/**
 * Build canonical receipt URLs for a completed payment.
 *
 * - `receiptUrl` is the public SPA receipt page (HTML)
 * - `pdfUrl` is the edge function that streams a real application/pdf
 *
 * Both URLs are embedded in the payment-confirmation email so the
 * "Save as PDF" and "Copy link" buttons always render. We hard-code the
 * Supabase functions endpoint for the PDF rather than going through the
 * SPA host because react-router would otherwise serve the SPA shell for
 * `/receipts/<id>.pdf` instead of the binary PDF body.
 */
const SUPABASE_PROJECT_ID =
  (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID ?? 'sprjfzeyyihtfvxnfuhb';

export function buildReceiptUrls(transactionId: string): {
  receiptUrl: string;
  pdfUrl: string;
} {
  const id = encodeURIComponent(transactionId);
  return {
    receiptUrl: `https://mzzpay.io/receipts/${id}`,
    pdfUrl: `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/render-receipt-pdf?id=${id}`,
  };
}
