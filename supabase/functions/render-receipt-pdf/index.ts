// Server-side PDF receipt generator. Returns application/pdf so the
// "Save as PDF" button in the receipt email and the .pdf URL render a
// real, downloadable PDF instead of the SPA shell.
//
// We use jspdf because it runs purely in V8 — no headless browser, no
// native deps. The PDF mirrors the on-screen receipt: monospace tx id
// header, two-column details grid, and a footer line with the descriptor
// the customer will see on their statement.

import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';
import { loadReceipt } from '../public-receipt/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const id =
    url.searchParams.get('id') ||
    url.pathname.replace(/\.pdf$/i, '').split('/').filter(Boolean).pop() ||
    '';

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return new Response(JSON.stringify({ error: 'Invalid receipt id' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const r = await loadReceipt(id);
    if (!r) {
      return new Response(JSON.stringify({ error: 'Receipt not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 56;
    let y = margin;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor('#0f172a');
    doc.text(r.merchant.name, margin, y);
    y += 22;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor('#64748b');
    doc.text('Payment receipt', margin, y);
    y += 28;

    // Tx id pill
    doc.setDrawColor('#e2e8f0');
    doc.setFillColor('#f1f5f9');
    doc.roundedRect(margin, y - 14, pageWidth - margin * 2, 26, 4, 4, 'FD');
    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    doc.setTextColor('#0f172a');
    doc.text(`# ${r.id}`, pageWidth / 2, y + 3, { align: 'center' });
    y += 30;

    // Details box
    const rowGap = 22;
    const labelX = margin + 14;
    const valueX = pageWidth - margin - 14;
    const rows: Array<[string, string | null]> = [
      ['Order ID', r.orderId || r.id],
      ['Type', r.type],
      ['Amount', `${r.amount} (${r.currency})`],
      ['Date', r.date],
      ['Status', r.status],
      ['Method', r.method],
      ['Description', r.description],
      ['Descriptor', r.descriptor ? `${r.descriptor} (statement)` : null],
    ];
    const visibleRows = rows.filter(([, v]) => !!v);
    const boxHeight = visibleRows.length * rowGap + 14;

    doc.setDrawColor('#e2e8f0');
    doc.setFillColor('#ffffff');
    doc.roundedRect(margin, y, pageWidth - margin * 2, boxHeight, 6, 6, 'FD');

    let rowY = y + rowGap;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    for (const [label, value] of visibleRows) {
      doc.setTextColor('#0f172a');
      doc.setFont('helvetica', 'bold');
      doc.text(label, labelX, rowY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#475569');
      const text = String(value);
      // wrap long descriptions
      const lines = doc.splitTextToSize(text, (pageWidth - margin * 2) * 0.55);
      doc.text(lines as string[], valueX, rowY, { align: 'right' });
      rowY += rowGap;
    }
    y += boxHeight + 24;

    // Descriptor explainer — "be on their email receipt" requirement
    if (r.descriptor) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor('#64748b');
      const explainer = doc.splitTextToSize(
        `This charge will appear on your statement as "${r.descriptor}". ` +
          `If you do not recognize it, please contact ${r.merchant.supportEmail || 'the merchant'} before disputing.`,
        pageWidth - margin * 2,
      );
      doc.text(explainer as string[], margin, y);
      y += (explainer as string[]).length * 14 + 12;
    }

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor('#94a3b8');
    doc.text(
      `Generated ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC · MZZPay`,
      margin,
      doc.internal.pageSize.getHeight() - 36,
    );

    const arrayBuffer = doc.output('arraybuffer') as ArrayBuffer;
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="receipt-${r.id}.pdf"`,
        // Cache for an hour — receipts don't change once issued
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    console.error('render-receipt-pdf error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
