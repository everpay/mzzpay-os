import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportPdfOptions {
  title: string;
  filename?: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  subtitle?: string;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Generate a branded PDF table report and trigger download.
 * Used as the PDF counterpart to the existing CSV exports across the app.
 */
export function exportPdf({
  title,
  filename,
  headers,
  rows,
  subtitle,
  orientation = 'landscape',
}: ExportPdfOptions): void {
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 56, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('MZZPay', 32, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(title, 32, 42);

  doc.setFontSize(9);
  const generated = `Generated ${new Date().toLocaleString()}`;
  doc.text(generated, pageWidth - 32, 24, { align: 'right' });
  if (subtitle) {
    doc.text(subtitle, pageWidth - 32, 42, { align: 'right' });
  }

  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: 76,
    head: [headers],
    body: rows.map((r) => r.map((c) => (c == null ? '' : String(c)))),
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [20, 184, 166], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 24, right: 24 },
  });

  const safeName = (filename || title.toLowerCase().replace(/\s+/g, '-')) +
    `-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(safeName);
}
