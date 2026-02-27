import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DocumentMeta } from './documentLinkService';
import { formatRevDate } from './documentLinkService';

interface FeedbackData {
  id?: string;
  form_date?: string;
  application_no?: string;
  applicant_name?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_address?: string;
  source_type?: string;
  feedback_type?: string;
  content_details?: string;
  validation_status?: string;
  risk_probability?: number;
  risk_severity?: number;
  risk_level?: number;
  corrective_action_required?: string;
  responsible_person?: string;
  status?: string;
  deadline?: string;
  response_date?: string;
  action_taken?: string;
  explanation?: string;
  izahat_text?: string;
  izahat_by?: string;
  attachments?: string[];
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

const FONT_NAME = 'Roboto';

const PRIMARY_COLOR: [number, number, number] = [51, 65, 85];
const BORDER_COLOR: [number, number, number] = [203, 213, 225];
const TEXT_DARK: [number, number, number] = [15, 23, 42];
const TEXT_MUTED: [number, number, number] = [100, 116, 139];

const PAGE_BOTTOM = 275;
const TOP_MARGIN = 25;

const formatDate = (d: string | null | undefined): string => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};


const TURKISH_MAP: Record<string, string> = {
  'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I',
  'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U',
};

function sanitizeForFilename(text: string): string {
  return text
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TURKISH_MAP[ch] || ch)
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-]/g, '');
}

async function registerFonts(doc: jsPDF) {
  const { ROBOTO_REGULAR, ROBOTO_BOLD } = await import('./robotoFontData');
  doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR);
  doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD);
  doc.addFont('Roboto-Regular.ttf', FONT_NAME, 'normal');
  doc.addFont('Roboto-Bold.ttf', FONT_NAME, 'bold');
  doc.setFont(FONT_NAME, 'normal');
}

function estimateTableHeight(rowCount: number): number {
  const rowHeight = 6.5;
  return rowCount * rowHeight + 2;
}

function ensureSpace(doc: jsPDF, neededHeight: number, currentY: number): number {
  if (currentY + neededHeight > PAGE_BOTTOM) {
    doc.addPage();
    return TOP_MARGIN;
  }
  return currentY;
}

function drawSectionHeader(doc: jsPDF, title: string, y: number, x: number, width: number): number {
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(x, y, width, 7, 'F');
  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(title, x + 3, y + 5);
  doc.setTextColor(...TEXT_DARK);
  return y + 9;
}

function drawTextBlock(doc: jsPDF, label: string, text: string, y: number, margin: number, contentWidth: number): number {
  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);

  const labelLines = doc.splitTextToSize(label, contentWidth - 8);
  const labelHeight = labelLines.length * 3.5;

  doc.setFont(FONT_NAME, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_DARK);
  const bodyLines = doc.splitTextToSize(text || '-', contentWidth - 8);
  const bodyHeight = bodyLines.length * 3.5 + 4;
  const totalHeight = labelHeight + bodyHeight + 6;

  y = ensureSpace(doc, totalHeight, y);

  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(labelLines, margin + 2, y);
  y += labelHeight + 2;

  doc.setFont(FONT_NAME, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_DARK);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(margin + 1, y - 2, contentWidth - 2, bodyHeight, 1.5, 1.5, 'FD');
  doc.text(bodyLines, margin + 4, y + 2);

  return y + bodyHeight + 3;
}

function addFooter(doc: jsPDF, docCode: string, revNo: string, revDate: string) {
  const pageCount = doc.getNumberOfPages();
  const revLine = `${docCode || '-'} | Rev: ${revNo || '-'} | Revizyon Tarihi: ${revDate || '-'}`;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.3);
    doc.line(10, pageHeight - 15, pageWidth - 10, pageHeight - 15);

    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(revLine, 10, pageHeight - 10);
    doc.text(
      `Sayfa ${i} / ${pageCount}`,
      pageWidth - 10,
      pageHeight - 10,
      { align: 'right' }
    );
  }
}

function columnTableStyles(colWidth: number, leftMargin: number) {
  return {
    startY: 0,
    margin: { left: leftMargin, right: 0 },
    tableWidth: colWidth,
    theme: 'plain' as const,
    styles: {
      font: FONT_NAME,
      fontSize: 8,
      cellPadding: { top: 1.8, bottom: 1.8, left: 3, right: 3 },
      textColor: TEXT_DARK,
      lineColor: BORDER_COLOR,
      lineWidth: 0.15,
      overflow: 'linebreak' as const,
    },
    columnStyles: {
      0: { cellWidth: colWidth * 0.4, fontStyle: 'bold' as const, textColor: TEXT_MUTED, fontSize: 8 },
      1: { cellWidth: colWidth * 0.6 },
    },
  };
}

function fullWidthTableStyles(contentWidth: number, margin: number) {
  return {
    startY: 0,
    margin: { left: margin, right: margin },
    theme: 'plain' as const,
    styles: {
      font: FONT_NAME,
      fontSize: 8,
      cellPadding: { top: 1.8, bottom: 1.8, left: 3, right: 3 },
      textColor: TEXT_DARK,
      lineColor: BORDER_COLOR,
      lineWidth: 0.15,
      overflow: 'linebreak' as const,
    },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold' as const, textColor: TEXT_MUTED, fontSize: 8 },
      1: { cellWidth: contentWidth - 42 },
    },
  };
}

function addImzaliWatermark(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    doc.saveGraphicsState();
    const gState = new (doc as any).GState({ opacity: 0.06 });
    doc.setGState(gState);

    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(72);
    doc.setTextColor(34, 139, 34);

    const cx = pw / 2;
    const cy = ph / 2;

    doc.text('IMZALI', cx, cy, {
      align: 'center',
      angle: 45,
    });

    doc.restoreGraphicsState();
  }
}

export const generateFeedbackPDF = async (data: FeedbackData, organizationName?: string, docMeta?: DocumentMeta, logoUrl?: string, _signatures: unknown[] = [], _roles: unknown[] = [], isLocked: boolean = false) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await registerFonts(doc);

  const docCode = docMeta?.dokuman_kodu || 'FR-12';
  const docName = docMeta?.dokuman_adi || 'Geri Bildirim Raporu';
  const revNo = docMeta?.rev_no || '';
  const revDate = docMeta?.revizyon_tarihi ? formatRevDate(docMeta.revizyon_tarihi) : '';

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - 2 * margin;
  const gap = 4;
  const colWidth = (contentWidth - gap) / 2;

  let y = 14;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.line(0, 28, pageWidth, 28);

  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 172, 193);
  doc.text(docName, pageWidth / 2, 17, { align: 'center' });

  let logoImgData: string | null = null;
  if (logoUrl) {
    try {
      const resp = await fetch(logoUrl);
      const blob = await resp.blob();
      logoImgData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      logoImgData = null;
    }
  }

  y = 34;

  const leftRows = [
    ['Form Tarihi', formatDate(data.form_date)],
    ['Bildirim No', data.application_no || '-'],
    ['Bildirim Türü', data.feedback_type || 'İstek'],
    ['Kaynak', data.source_type || '-'],
    ['Durum', data.status || 'Açık'],
    ['Geçerlilik', data.validation_status || 'Değerlendirmede'],
    ['Termin Tarihi', formatDate(data.deadline)],
    ['Yanıt Tarihi', formatDate(data.response_date)],
  ];

  const rightRows = [
    ['Müşteri / Kurum', data.applicant_name || '-'],
    ['Yetkili Kişi', data.contact_person || '-'],
    ['Telefon', data.contact_phone || '-'],
    ['E-posta', data.contact_email || '-'],
    ['Adres', data.contact_address || '-'],
  ];

  const headerHeight = 7;
  const sectionGap = 9;
  const leftTableHeight = estimateTableHeight(leftRows.length);
  const rightTableHeight = estimateTableHeight(rightRows.length);
  const totalSideBySideHeight = headerHeight + Math.max(leftTableHeight, rightTableHeight) + 4;

  y = ensureSpace(doc, totalSideBySideHeight, y);

  const leftX = margin;
  const rightX = margin + colWidth + gap;

  let leftY = drawSectionHeader(doc, 'BAŞVURU BİLGİLERİ', y, leftX, colWidth);
  let rightY = drawSectionHeader(doc, 'MÜŞTERİ BİLGİLERİ', y, rightX, colWidth);

  const leftStyles = columnTableStyles(colWidth, leftX);
  autoTable(doc, {
    ...leftStyles,
    startY: leftY,
    body: leftRows,
  });
  const leftFinalY = (doc as any).lastAutoTable.finalY;

  const rightStyles = columnTableStyles(colWidth, rightX);
  autoTable(doc, {
    ...rightStyles,
    startY: rightY,
    body: rightRows,
  });
  const rightFinalY = (doc as any).lastAutoTable.finalY;

  y = Math.max(leftFinalY, rightFinalY) + 6;

  const fwStyles = fullWidthTableStyles(contentWidth, margin);

  const descriptionEstimate = 7 + 8 + 30;
  y = ensureSpace(doc, descriptionEstimate, y);
  y = drawSectionHeader(doc, 'AÇIKLAMA', y, margin, contentWidth);
  y = drawTextBlock(doc, 'Konu (Detaylı Açıklama)', data.content_details || '-', y, margin, contentWidth);

  const actionRows = [['Sorumlu Kişi', data.responsible_person || '-']];
  const actionTextEstimate = sectionGap + estimateTableHeight(actionRows.length) + 50;
  y = ensureSpace(doc, actionTextEstimate, y);
  y = drawSectionHeader(doc, 'AKSİYON BİLGİSİ', y, margin, contentWidth);

  autoTable(doc, {
    ...fwStyles,
    startY: y,
    body: actionRows,
  });
  y = (doc as any).lastAutoTable.finalY + 3;
  y = drawTextBlock(doc, 'Alınan Aksiyon / Cevap', data.action_taken || '-', y, margin, contentWidth);
  y = drawTextBlock(doc, 'Açıklama / Notlar', data.explanation || '-', y, margin, contentWidth);

  if (data.izahat_text || data.izahat_by) {
    const izahatRows = [['Bildirime Sebep Olan Taraf', data.izahat_by || '-']];
    const izahatEstimate = sectionGap + estimateTableHeight(izahatRows.length) + 40;
    y = ensureSpace(doc, izahatEstimate, y);
    y = drawSectionHeader(doc, 'İZAHAT', y, margin, contentWidth);

    autoTable(doc, {
      ...fwStyles,
      startY: y,
      body: izahatRows,
    });
    y = (doc as any).lastAutoTable.finalY + 3;
    y = drawTextBlock(doc, 'Bildirime Sebep Taraf İzahatı', data.izahat_text || '-', y, margin, contentWidth);
  }

  addFooter(doc, docCode, revNo, revDate);

  if (logoImgData) {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.addImage(logoImgData, 'PNG', pageWidth - 42, 4, 26, 18);
    }
  }

  if (isLocked) {
    addImzaliWatermark(doc);
  }

  const customerPart = sanitizeForFilename(data.applicant_name || '');
  const applicationPart = sanitizeForFilename(data.application_no || '');
  const nameParts = [customerPart, applicationPart].filter(Boolean);
  const pdfFileName = nameParts.length > 0 ? nameParts.join('_') : 'rapor';
  doc.save(`${pdfFileName}.pdf`);
};
