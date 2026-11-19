import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFReportOptions {
  companyName: string;
  reportTitle: string;
  generatedDate?: string;
  dateRange?: string;
  filters?: Record<string, string>;
  summaryMetrics?: { label: string; value: string | number }[];
  columns: { header: string; dataKey: string }[];
  rows: Record<string, any>[];
}

export function generatePDFReport(options: PDFReportOptions): Uint8Array {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const generatedDate = options.generatedDate || new Date().toLocaleString();

  // 1. Header & Title Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(options.companyName.toUpperCase(), 14, 10);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text('Smart Attendance & Enterprise HRMS', 14, 16);

  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${generatedDate}`, 283, 15, { align: 'right' });

  // 2. Report Subheading
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(options.reportTitle, 14, 34);

  let currentY = 40;

  // 3. Optional Filters & Date Range
  if (options.dateRange || (options.filters && Object.keys(options.filters).length > 0)) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139); // Slate-500

    const filterTexts: string[] = [];
    if (options.dateRange) filterTexts.push(`Period: ${options.dateRange}`);
    if (options.filters) {
      for (const [k, v] of Object.entries(options.filters)) {
        if (v) filterTexts.push(`${k}: ${v}`);
      }
    }
    doc.text(filterTexts.join('  |  '), 14, currentY);
    currentY += 6;
  }

  // 4. Summary Metrics Cards (if provided)
  if (options.summaryMetrics && options.summaryMetrics.length > 0) {
    const cardWidth = Math.min(45, (297 - 28) / options.summaryMetrics.length - 2);
    let cardX = 14;

    options.summaryMetrics.forEach((m) => {
      doc.setFillColor(248, 250, 252); // Slate-50
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.roundedRect(cardX, currentY, cardWidth, 14, 2, 2, 'FD');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(m.label.toUpperCase(), cardX + 3, currentY + 5);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(String(m.value), cardX + 3, currentY + 11);

      cardX += cardWidth + 3;
    });

    currentY += 18;
  }

  // 5. Data Table via autoTable
  autoTable(doc, {
    startY: currentY,
    head: [options.columns.map((c) => c.header)],
    body: options.rows.map((r) => options.columns.map((c) => r[c.dataKey] ?? '--')),
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    margin: { left: 14, right: 14, bottom: 16 },
    didDrawPage: (data) => {
      // Page Numbering in Footer
      const pageCount = (doc.internal as any).getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        283,
        205,
        { align: 'right' }
      );
      doc.text(
        `Confidential - ${options.companyName} Internal Use Only`,
        14,
        205
      );
    },
  });

  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}
