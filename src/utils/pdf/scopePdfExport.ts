import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ScopeItem {
  parameter: string;
  method: string;
  range: string;
  uncertainty: string;
}

const FONT_NAME = 'Roboto';

const SLATE_DARK: [number, number, number] = [30, 41, 59];
const SLATE_MID: [number, number, number] = [71, 85, 105];
const SLATE_LIGHT: [number, number, number] = [241, 245, 249];
const BORDER_COLOR: [number, number, number] = [203, 213, 225];
const WHITE: [number, number, number] = [255, 255, 255];
const TEXT_DARK: [number, number, number] = [15, 23, 42];

async function registerFonts(doc: jsPDF) {
  const { ROBOTO_REGULAR, ROBOTO_BOLD } = await import('../robotoFontData');
  doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR);
  doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD);
  doc.addFont('Roboto-Regular.ttf', FONT_NAME, 'normal');
  doc.addFont('Roboto-Bold.ttf', FONT_NAME, 'bold');
  doc.setFont(FONT_NAME, 'normal');
}

export async function exportScopePDF(items: ScopeItem[], organizationName = 'UMS Kalite') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  await registerFonts(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  const drawHeader = (pageNumber: number, totalPages: number) => {
    // Header background
    doc.setFillColor(...SLATE_DARK);
    doc.rect(0, 0, pageW, 28, 'F');

    // Accent stripe
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 28, pageW, 1.5, 'F');

    // ── LOGO PLACEHOLDER ─────────────────────────────────────────────────────
    // To inject the UMS logo, replace the block below with:
    //   doc.addImage(UMS_LOGO_BASE64, 'PNG', margin, 4, 28, 20);
    // where UMS_LOGO_BASE64 is the base64-encoded PNG string.
    doc.setFillColor(255, 255, 255, 0.15 as any);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, 5, 28, 17, 2, 2, 'S');
    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(7);
    doc.setTextColor(200, 200, 200);
    doc.text('LOGO', margin + 14, 14.5, { align: 'center' });
    // ─────────────────────────────────────────────────────────────────────────

    // Title block
    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...WHITE);
    doc.text('AKREDİTASYON KAPSAMI', margin + 36, 13);

    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`${organizationName}  —  TS EN ISO/IEC 17025:2017`, margin + 36, 20);

    // Page number
    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Sayfa ${pageNumber} / ${totalPages}`, pageW - margin, 17, { align: 'right' });

    // Timestamp
    const now = new Date();
    const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    doc.text(`Oluşturulma: ${dateStr}`, pageW - margin, 23, { align: 'right' });
  };

  const drawFooter = () => {
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 10, pageW - margin, pageH - 10);

    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...SLATE_MID);
    doc.text('Bu belge, akredite laboratuvarın onaylı deney kapsamını göstermektedir.', margin, pageH - 5);
    doc.text('Gizlilik: Kurum İçi', pageW - margin, pageH - 5, { align: 'right' });
  };

  const tableRows = items.map((item, idx) => [
    String(idx + 1),
    item.parameter,
    item.method,
    item.range,
    item.uncertainty,
  ]);

  autoTable(doc, {
    startY: 34,
    margin: { left: margin, right: margin, bottom: 18 },
    head: [['#', 'Ölçülen Büyüklük / Parametre', 'Deney / Ölçüm Metodu', 'Ölçüm Aralığı', 'Genişletilmiş Belirsizlik']],
    body: tableRows,
    styles: {
      font: FONT_NAME,
      fontSize: 9,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      textColor: TEXT_DARK,
      lineColor: BORDER_COLOR,
      lineWidth: 0.25,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: SLATE_DARK,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
      cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
    },
    alternateRowStyles: {
      fillColor: SLATE_LIGHT,
    },
    bodyStyles: {
      fillColor: WHITE,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10, fontStyle: 'bold' },
      1: { cellWidth: 60 },
      2: { cellWidth: 70 },
      3: { cellWidth: 60 },
      4: { cellWidth: 60 },
    },
    didDrawPage: (data) => {
      const pageNumber: number = (doc as any).internal.getCurrentPageInfo().pageNumber;
      const totalPages: number = (doc as any).internal.getNumberOfPages();
      drawHeader(pageNumber, totalPages);
      drawFooter();
    },
  });

  const totalPages: number = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawHeader(i, totalPages);
    drawFooter();
  }

  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  doc.save(`Akreditasyon_Kapsami_${stamp}.pdf`);
}
