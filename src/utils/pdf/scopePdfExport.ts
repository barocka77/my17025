import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Configurable document meta ────────────────────────────────────────────
const DOC_NO          = 'FR.XX';
const DOC_REV         = '00';
const DOC_REV_DATE    = '25.03.2026';
// ───────────────────────────────────────────────────────────────────────────

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

// ─── Palette ────────────────────────────────────────────────────────────────
const C_HEADER_BG: [number, number, number] = [22, 36, 71];   // dark navy
const C_HEADER_FG: [number, number, number] = [255, 255, 255];
const C_ACCENT:    [number, number, number] = [30, 110, 200];  // blue rule
const C_ROW_ALT:   [number, number, number] = [245, 247, 251];
const C_BORDER:    [number, number, number] = [200, 210, 225];
const C_TEXT_DARK: [number, number, number] = [20, 30, 50];
const C_TEXT_GREY: [number, number, number] = [100, 115, 135];
const C_WHITE:     [number, number, number] = [255, 255, 255];
// ────────────────────────────────────────────────────────────────────────────

const FONT = 'Roboto';

// Page geometry (landscape A4: 297 × 210 mm)
const M           = 12;       // side margin
const HEADER_H    = 28;       // header box height (mm)
const HEADER_TOP  = 8;        // header top Y (mm)
const FOOTER_Y    = 198;      // footer line Y (mm)

// Header column widths (total usable = 297 - 2*12 = 273 mm)
const COL_LOGO_W   = 44;
const COL_MID_W    = 130;
// right column takes the rest

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
  orgName: string,
  logoDataUrl: string | null | undefined,
) {
  const x1 = M;
  const y1 = HEADER_TOP;
  const totalW = pageW - 2 * M;
  const h = HEADER_H;
  const rightColW = totalW - COL_LOGO_W - COL_MID_W;

  // ── outer border ─────────────────────────────────────────────────────────
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.4);
  doc.rect(x1, y1, totalW, h, 'S');

  // ── logo column ───────────────────────────────────────────────────────────
  const logoX = x1;
  const logoColRight = x1 + COL_LOGO_W;

  if (logoDataUrl) {
    try {
      const imgPad = 3;
      doc.addImage(
        logoDataUrl,
        logoX + imgPad,
        y1 + imgPad,
        COL_LOGO_W - imgPad * 2,
        h - imgPad * 2,
        undefined,
        'FAST',
      );
    } catch {
      // fallback: draw a light placeholder rect with "LOGO" text
      doc.setFillColor(240, 243, 248);
      doc.rect(logoX + 1, y1 + 1, COL_LOGO_W - 2, h - 2, 'F');
      doc.setFont(FONT, 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...C_TEXT_GREY);
      doc.text('LOGO', logoX + COL_LOGO_W / 2, y1 + h / 2, { align: 'center', baseline: 'middle' });
    }
  } else {
    doc.setFillColor(240, 243, 248);
    doc.rect(logoX + 1, y1 + 1, COL_LOGO_W - 2, h - 2, 'F');
    doc.setFont(FONT, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C_TEXT_GREY);
    doc.text('LOGO', logoX + COL_LOGO_W / 2, y1 + h / 2, { align: 'center', baseline: 'middle' });
  }

  // vertical separator after logo
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.4);
  doc.line(logoColRight, y1, logoColRight, y1 + h);

  // ── center column: org name + standard ───────────────────────────────────
  const midX = logoColRight;
  const midCenterX = midX + COL_MID_W / 2;

  doc.setFont(FONT, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C_TEXT_DARK);
  doc.text(orgName || 'UMS Kalite', midCenterX, y1 + 9, { align: 'center', baseline: 'middle' });

  doc.setFont(FONT, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C_TEXT_GREY);
  doc.text('TS EN ISO/IEC 17025:2017', midCenterX, y1 + 16.5, { align: 'center', baseline: 'middle' });

  doc.setFont(FONT, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C_TEXT_GREY);
  doc.text('Akredite Kalibrasyon Laboratuvarı', midCenterX, y1 + 22.5, { align: 'center', baseline: 'middle' });

  // vertical separator after center
  const midColRight = midX + COL_MID_W;
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.4);
  doc.line(midColRight, y1, midColRight, y1 + h);

  // ── right column: document title ─────────────────────────────────────────
  const rightCenterX = midColRight + rightColW / 2;

  // navy background for the title column
  doc.setFillColor(...C_HEADER_BG);
  doc.rect(midColRight + 0.2, y1 + 0.2, rightColW - 0.4, h - 0.4, 'F');

  doc.setFont(FONT, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...C_HEADER_FG);
  doc.text('AKREDİTASYON', rightCenterX, y1 + 10, { align: 'center', baseline: 'middle' });
  doc.text('KAPSAMI', rightCenterX, y1 + 19, { align: 'center', baseline: 'middle' });

  // ── blue accent line below header ─────────────────────────────────────────
  doc.setFillColor(...C_ACCENT);
  doc.rect(x1, y1 + h, totalW, 1.2, 'F');
}

function drawFooter(
  doc: jsPDF,
  pageW: number,
  pageNumber: number,
  totalPages: number,
) {
  // separator line
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.35);
  doc.line(M, FOOTER_Y, pageW - M, FOOTER_Y);

  const textY = FOOTER_Y + 5;

  // left: document meta
  doc.setFont(FONT, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C_TEXT_GREY);
  doc.text(
    `Doküman No: ${DOC_NO}   |   Rev: ${DOC_REV}   |   Revizyon Tarihi: ${DOC_REV_DATE}`,
    M,
    textY,
  );

  // right: page count
  doc.setFont(FONT, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...C_TEXT_GREY);
  doc.text(`Sayfa ${pageNumber} / ${totalPages}`, pageW - M, textY, { align: 'right' });
}

export async function exportScopePDF(
  items: ScopeItem[],
  options: ScopePDFOptions = {},
) {
  const { logoDataUrl, orgName = 'UMS Kalite' } = options;

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

  // Landscape A4 usable width: 297 - 2*12 = 273 mm
  autoTable(doc, {
    startY: HEADER_TOP + HEADER_H + 5,
    margin: { left: M, right: M, bottom: 16 },
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
      fillColor: C_HEADER_BG,
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
      const pg: number = (doc as any).internal.getCurrentPageInfo().pageNumber;
      const total: number = (doc as any).internal.getNumberOfPages();
      drawHeader(doc, pageW, orgName, logoDataUrl);
      drawFooter(doc, pageW, pg, total);
    },
  });

  // Redraw all pages so headers/footers are always on top of table content
  const totalPages: number = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawHeader(doc, pageW, orgName, logoDataUrl);
    drawFooter(doc, pageW, i, totalPages);
  }

  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  doc.save(`Akreditasyon_Kapsami_${stamp}.pdf`);
}
