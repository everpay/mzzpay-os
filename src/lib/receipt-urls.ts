/**
 * Build canonical receipt URLs for a completed payment.
 *
 * These URLs are embedded in the payment-confirmation email so the
 * "Save as PDF" and "Copy link" buttons always render. Both routes are
 * served by the public receipt page on the production domain (mzzpay.io).
 */
export function buildReceiptUrls(transactionId: string): {
  receiptUrl: string;
  pdfUrl: string;
} {
  const base = 'https://mzzpay.io/receipts';
  const id = encodeURIComponent(transactionId);
  return {
    receiptUrl: `${base}/${id}`,
    pdfUrl: `${base}/${id}.pdf`,
  };
}
