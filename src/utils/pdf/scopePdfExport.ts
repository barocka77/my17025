import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Palette (matches other PDFs) ───────────────────────────────────────────
const C_TEAL:      [number, number, number] = [0,   172, 193];
const C_NAVY:      [number, number, number] = [22,  36,  71];
const C_ROW_ALT:   [number, number, number] = [245, 247, 251];
const C_BORDER:    [number, number, number] = [203, 213, 225];
const C_TEXT_DARK: [number, number, number] = [15,  23,  42];
const C_TEXT_GREY: [number, number, number] = [100, 116, 139];
const C_WHITE:     [number, number, number] = [255, 255, 255];
// ────────────────────────────────────────────────────────────────────────────

const FONT = 'Roboto';

// Page geometry — landscape A4: 297 × 210 mm
const M             = 14;    // side margin
const HEADER_H      = 28;    // header zone height (matches other PDFs)
const LOGO_W        = 38;    // logo width  (mm)
const LOGO_H        = 20;    // logo height (mm)
const LOGO_Y        = (HEADER_H - LOGO_H) / 2;   // vertically centred in header
const TABLE_START_Y = HEADER_H + 6;               // table top on page 1
const FOOTER_OFFSET = 15;    // distance from page bottom to footer separator line

// Footer meta — no "Doküman No:" label, with revision date
const FOOTER_LEFT = 'KEK EK 2 | Rev: 10 | Revizyon Tarihi: 25.03.2026';

export interface ScopeItem {
  parameter:   string;
  range:       string;
  conditions:  string;
  uncertainty: string;
  method:      string;
}

export interface ScopePDFOptions {
  logoDataUrl?: string | null;
  orgName?:     string;
}

async function registerFonts(doc: jsPDF) {
  const { ROBOTO_REGULAR, ROBOTO_BOLD } = await import('../robotoFontData');
  doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR);
  doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD);
  doc.addFont('Roboto-Regular.ttf', FONT, 'normal');
  doc.addFont('Roboto-Bold.ttf', FONT, 'bold');
  doc.setFont(FONT, 'normal');
}

function drawHeader(
  doc: jsPDF,
  pageW: number,
  logoDataUrl: string | null | undefined,
) {
  // White header background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, HEADER_H, 'F');

  // Bottom border line
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.line(0, HEADER_H, pageW, HEADER_H);

  // ── "Hizmet Kapsamı" — teal bold, centred in the area left of the logo ───
  const titleAreaW = pageW - 2 * M - LOGO_W - 6;
  doc.setFont(FONT, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...C_TEAL);
  doc.text(
    'Hizmet Kapsamı',
    M + titleAreaW / 2,
    17,
    { align: 'center', maxWidth: titleAreaW },
  );

  // ── Logo — top right, vertically centred in header ───────────────────────
  const logoX = pageW - M - LOGO_W;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, logoX, LOGO_Y, LOGO_W, LOGO_H, undefined, 'FAST');
    } catch {
      doc.setFillColor(240, 243, 248);
      doc.setDrawColor(...C_BORDER);
      doc.setLineWidth(0.3);
      doc.rect(logoX, LOGO_Y, LOGO_W, LOGO_H, 'FD');
      doc.setFont(FONT, 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...C_TEXT_GREY);
      doc.text('LOGO', logoX + LOGO_W / 2, LOGO_Y + LOGO_H / 2, {
        align: 'center',
        baseline: 'middle',
      });
    }
  }
}

function addFooter(doc: jsPDF, pageW: number) {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    const lineY  = pageH - FOOTER_OFFSET;
    const textY  = lineY + 5;

    doc.setDrawColor(...C_BORDER);
    doc.setLineWidth(0.3);
    doc.line(M, lineY, pageW - M, lineY);

    doc.setFont(FONT, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C_TEXT_GREY);
    doc.text(FOOTER_LEFT, M, textY);

    doc.text(`Sayfa ${i} / ${totalPages}`, pageW - M, textY, { align: 'right' });
  }
}

export async function exportScopePDF(
  items: ScopeItem[],
  options: ScopePDFOptions = {},
) {
  const { logoDataUrl } = options;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  await registerFonts(doc);

  const tableRows = items.map(item => [
    item.parameter,
    item.range,
    item.conditions,
    item.uncertainty,
    item.method,
  ]);

  autoTable(doc, {
    startY: TABLE_START_Y,
    margin: { top: TABLE_START_Y, left: M, right: M, bottom: FOOTER_OFFSET + 6 },
    head: [[
      'Ölçüm Büyüklüğü /\nKalibre Edilen Cihazlar',
      'Ölçüm Aralığı',
      'Ölçüm Şartları',
      'Genişletilmiş Ölçüm\nBelirsizliği (k=2)',
      'Açıklamalar /\nKalibrasyon Metodu',
    ]],
    body: tableRows,
    styles: {
      font: FONT,
      fontSize: 8.5,
      cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
      textColor: C_TEXT_DARK,
      lineColor: C_BORDER,
      lineWidth: 0.25,
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: {
      fillColor: C_NAVY,
      textColor: C_WHITE,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      valign: 'middle',
      cellPadding: { top: 5, bottom: 5, left: 5, right: 5 },
    },
    alternateRowStyles: { fillColor: C_ROW_ALT },
    bodyStyles: { fillColor: C_WHITE },
    columnStyles: {
      0: { cellWidth: 63 },
      1: { cellWidth: 46, halign: 'center' },
      2: { cellWidth: 46, halign: 'center' },
      3: { cellWidth: 52, halign: 'center' },
      4: { cellWidth: 66 },
    },
    didDrawPage: () => {
      drawHeader(doc, pageW, logoDataUrl);
    },
  });

  // Redraw headers after autoTable to prevent table from painting over them
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawHeader(doc, pageW, logoDataUrl);
  }

  // Add footer after all pages are known
  addFooter(doc, pageW);

  const now   = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  doc.save(`Hizmet_Kapsami_${stamp}.pdf`);
}
