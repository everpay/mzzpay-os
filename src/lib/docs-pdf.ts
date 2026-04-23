import { jsPDF } from "jspdf";
import { DOCS_DOCUMENT_TITLE, DOCS_META, DOCS_SECTIONS } from "./docs-content";

/**
 * Generate the developer reference as a branded, paginated PDF and trigger download.
 * Mirrors the rendered docs and the LLM doc so all three formats stay in sync.
 */
export function downloadDocsPdf(): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const marginTop = 64;
  const marginBottom = 56;
  const contentWidth = pageWidth - marginX * 2;

  let y = marginTop;

  const drawHeader = (pageNum: number) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 36, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("MzzPay", marginX, 23);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(DOCS_DOCUMENT_TITLE, pageWidth - marginX, 23, { align: "right" });
    doc.setTextColor(0, 0, 0);
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Page ${pageNum}`, pageWidth - marginX, pageHeight - 24, { align: "right" });
    doc.text(`${DOCS_META.baseUrl}`, marginX, pageHeight - 24);
    doc.setTextColor(0, 0, 0);
  };

  let pageNum = 1;
  drawHeader(pageNum);

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - marginBottom) {
      doc.addPage();
      pageNum += 1;
      drawHeader(pageNum);
      y = marginTop;
    }
  };

  // Cover title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(DOCS_DOCUMENT_TITLE, marginX, y);
  y += 30;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `The complete developer reference. Generated ${new Date().toLocaleString()}.`,
    marginX,
    y,
  );
  y += 24;
  doc.setTextColor(0, 0, 0);

  for (const section of DOCS_SECTIONS) {
    ensureSpace(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(section.title, marginX, y);
    y += 20;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const paragraphs = section.body.split("\n\n");
    for (const para of paragraphs) {
      // Treat indented blocks (4+ spaces) as code: render in monospace.
      const isCode = para.split("\n").every((line) => line.startsWith("    ") || line.trim() === "");
      if (isCode) {
        doc.setFont("courier", "normal");
        doc.setFontSize(9);
        const codeLines = para.split("\n").map((l) => l.replace(/^ {4}/, ""));
        for (const line of codeLines) {
          ensureSpace(13);
          doc.setFillColor(245, 247, 250);
          doc.rect(marginX, y - 9, contentWidth, 13, "F");
          doc.text(line, marginX + 6, y);
          y += 13;
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        y += 6;
      } else {
        const wrapped = doc.splitTextToSize(para, contentWidth);
        for (const line of wrapped) {
          ensureSpace(14);
          doc.text(line, marginX, y);
          y += 14;
        }
        y += 8;
      }
    }
    y += 10;
  }

  doc.save(`mzzpay-api-reference-${new Date().toISOString().slice(0, 10)}.pdf`);
}
