import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Configurable document meta ────────────────────────────────────────────
const DOC_META        = 'Doküman No: KEK EK 2 | Rev: 10';
const TOTAL_PAGES_PH  = '{totalPages}';
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
const C_NAVY:      [number, number, number] = [22,  36,  71];
const C_BLUE:      [number, number, number] = [30,  110, 200];
const C_ROW_ALT:   [number, number, number] = [245, 247, 251];
const C_BORDER:    [number, number, number] = [200, 210, 225];
const C_TEXT_DARK: [number, number, number] = [20,  30,  50];
const C_TEXT_GREY: [number, number, number] = [100, 115, 135];
const C_WHITE:     [number, number, number] = [255, 255, 255];
// ────────────────────────────────────────────────────────────────────────────

const FONT = 'Roboto';

// Page geometry constants (landscape A4: 297 × 210 mm)
const M             = 12;    // side / top / bottom margin
const HEADER_TOP_Y  = 8;     // where the header text starts
const LOGO_W        = 38;    // logo image width  (mm)
const LOGO_H        = 20;    // logo image height (mm)
const HEADER_H      = 26;    // total header zone height (text + padding)
const TABLE_START_Y = HEADER_TOP_Y + HEADER_H + 4;  // 38 mm — table top on page 1
const FOOTER_OFFSET = 15;    // distance from page bottom to footer line

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
  const y = HEADER_TOP_Y;

  // ── Title block — TOP LEFT ────────────────────────────────────────────────
  doc.setFont(FONT, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...C_NAVY);
  doc.text('Hizmet Kapsamı', M, y + 8);

  doc.setFont(FONT, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C_TEXT_GREY);
  doc.text(`${orgName}  —  TS EN ISO/IEC 17025:2017`, M, y + 16);

  // ── Logo — TOP RIGHT ──────────────────────────────────────────────────────
  const logoX = pageW - M - LOGO_W;
  const logoY = y;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, logoX, logoY, LOGO_W, LOGO_H, undefined, 'FAST');
    } catch {
      // fallback placeholder box
      doc.setFillColor(240, 243, 248);
      doc.setDrawColor(...C_BORDER);
      doc.setLineWidth(0.3);
      doc.rect(logoX, logoY, LOGO_W, LOGO_H, 'FD');
      doc.setFont(FONT, 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...C_TEXT_GREY);
      doc.text('LOGO', logoX + LOGO_W / 2, logoY + LOGO_H / 2, {
        align: 'center',
        baseline: 'middle',
      });
    }
  }

  // ── Thin accent rule below header ─────────────────────────────────────────
  doc.setFillColor(...C_BLUE);
  doc.rect(M, HEADER_TOP_Y + HEADER_H, pageW - 2 * M, 0.8, 'F');
}

function drawFooter(
  doc: jsPDF,
  pageW: number,
  pageNumber: number,
) {
  // Calculate strictly from the page bottom — no drift across pages
  const pageH      = doc.internal.pageSize.getHeight();
  const lineY      = pageH - FOOTER_OFFSET;
  const textY      = lineY + 5;

  // separator line
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.35);
  doc.line(M, lineY, pageW - M, lineY);

  // left: document meta
  doc.setFont(FONT, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C_TEXT_GREY);
  doc.text(DOC_META, M, textY);

  // right: page number (total pages replaced by putTotalPages after generation)
  doc.setFont(FONT, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...C_TEXT_GREY);
  doc.text(`Sayfa ${pageNumber} / ${TOTAL_PAGES_PH}`, pageW - M, textY, { align: 'right' });
}

export async function exportScopePDF(
  items: ScopeItem[],
  options: ScopePDFOptions = {},
) {
  const { logoDataUrl, orgName = 'UMS Kalite' } = options;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  await registerFonts(doc);

  // Register total-pages placeholder — jsPDF replaces this string with the
  // real count when we call doc.putTotalPages() before saving.
  doc.putTotalPages(TOTAL_PAGES_PH);

  const tableRows = items.map(item => [
    item.parameter,
    item.range,
    item.conditions,
    item.uncertainty,
    item.method,
  ]);

  // Landscape A4 usable width: 297 - 2×12 = 273 mm
  autoTable(doc, {
    startY: TABLE_START_Y,
    // margin.top ensures autoTable re-starts below the header on every page break
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
    didDrawPage: (data) => {
      drawHeader(doc, pageW, orgName, logoDataUrl);
      drawFooter(doc, pageW, data.pageNumber);
    },
  });

  // Final pass: redraw header + footer on every page to ensure nothing
  // rendered by autoTable can paint over them.
  const totalPages: number = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawHeader(doc, pageW, orgName, logoDataUrl);
    drawFooter(doc, pageW, i);
  }

  // Replace the placeholder string with the real total page count
  doc.putTotalPages(TOTAL_PAGES_PH);

  const now   = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  doc.save(`Hizmet_Kapsami_${stamp}.pdf`);
}
