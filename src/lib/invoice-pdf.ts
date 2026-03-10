import { formatCurrency } from '@/lib/format';
import { Currency } from '@/lib/types';

interface InvoiceData {
  invoice_number: string;
  customer_name?: string | null;
  customer_email: string;
  amount: number;
  currency: Currency;
  status: string;
  description?: string | null;
  due_date?: string | null;
  created_at: string;
  notes?: string | null;
  items?: Array<{ description: string; quantity: number; unit_price: number }> | null;
}

export function generateInvoicePDF(invoice: InvoiceData): void {
  const lineItemsRows = Array.isArray(invoice.items) && invoice.items.length > 0
    ? invoice.items.map(item => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${item.description || 'Item'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatCurrency(item.unit_price, invoice.currency)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${formatCurrency(item.quantity * item.unit_price, invoice.currency)}</td>
      </tr>`).join('')
    : `<tr><td colspan="4" style="padding:10px 12px;text-align:center;color:#94a3b8;">No line items</td></tr>`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoice_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; background: #fff; }
        .page { max-width: 800px; margin: 0 auto; padding: 48px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
        .brand { font-size: 28px; font-weight: 800; color: #0f172a; }
        .brand-sub { font-size: 12px; color: #94a3b8; margin-top: 4px; }
        .inv-label { font-size: 32px; font-weight: 800; color: #0f172a; text-align: right; }
        .inv-number { font-size: 14px; color: #64748b; text-align: right; margin-top: 4px; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .meta-section h3 { font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 8px; }
        .meta-section p { font-size: 14px; color: #0f172a; line-height: 1.6; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        thead th { background: #f8fafc; padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; text-align: left; }
        thead th:nth-child(2) { text-align: center; }
        thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
        tbody td { font-size: 14px; }
        .total-row { border-top: 2px solid #0f172a; }
        .total-row td { padding: 14px 12px; font-size: 16px; font-weight: 700; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .status-draft { background: #f1f5f9; color: #64748b; }
        .status-sent { background: #dbeafe; color: #2563eb; }
        .status-paid { background: #d1fae5; color: #059669; }
        .status-overdue { background: #fee2e2; color: #dc2626; }
        .notes { background: #f8fafc; border-radius: 8px; padding: 16px; margin-top: 32px; font-size: 13px; color: #64748b; line-height: 1.6; }
        .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { padding: 24px; } }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div>
            <div class="brand">MZZPay</div>
            <div class="brand-sub">mzzpay.io</div>
          </div>
          <div>
            <div class="inv-label">INVOICE</div>
            <div class="inv-number">${invoice.invoice_number || 'N/A'}</div>
          </div>
        </div>

        <div class="meta">
          <div class="meta-section">
            <h3>Bill To</h3>
            <p>${invoice.customer_name || invoice.customer_email}</p>
            <p>${invoice.customer_email}</p>
          </div>
          <div class="meta-section" style="text-align:right;">
            <h3>Invoice Details</h3>
            <p>Date: ${new Date(invoice.created_at).toLocaleDateString()}</p>
            ${invoice.due_date ? `<p>Due: ${new Date(invoice.due_date).toLocaleDateString()}</p>` : ''}
            <p>Status: <span class="status status-${invoice.status}">${invoice.status}</span></p>
          </div>
        </div>

        ${invoice.description ? `<p style="font-size:14px;color:#64748b;margin-bottom:24px;">${invoice.description}</p>` : ''}

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsRows}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="3" style="text-align:right;padding:14px 12px;">Total Due</td>
              <td style="text-align:right;padding:14px 12px;">${formatCurrency(invoice.amount, invoice.currency)}</td>
            </tr>
          </tfoot>
        </table>

        ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}

        <div class="footer">
          <p>MZZPay · mzzpay.io</p>
        </div>
      </div>
    </body>
    </html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
