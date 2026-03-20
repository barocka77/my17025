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
  phone?: string;
  email?: string;
  source_type?: string;
  feedback_type?: string;
  communication_channel?: string;
  received_by?: string;
  content_details?: string;
  validation_status?: string;
  evaluation?: string;
  risk_probability?: string;
  risk_severity?: string;
  risk_level?: string;
  requires_capa?: boolean;
  capa_no?: string;
  responsible_person?: string;
  status?: string;
  deadline?: string;
  response_date?: string;
  action_plan?: string;
  action_taken?: string;
  explanation?: string;
  izahat_text?: string;
  izahat_by?: string;
  closure_date?: string;
  closure_notes?: string;
  attachments?: string[];
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FeedbackAction {
  id: string;
  action_description: string;
  responsible_person: string;
  deadline: string;
  status: string;
  completed_date: string | null;
}

export interface FeedbackSignatureEntry {
  signer_role: string;
  signer_name: string;
  signed_at: string;
  signature_image_url: string | null;
  signature_id?: string;
  signature_type?: string;
}

export interface FeedbackSignatureGroup {
  moduleKey: string;
  label: string;
  signatures: FeedbackSignatureEntry[];
  roles: { role_name: string; role_order: number }[];
}

const FONT_NAME = 'Roboto';

const PRIMARY_COLOR: [number, number, number] = [51, 65, 85];
const BORDER_COLOR: [number, number, number] = [203, 213, 225];
const TEXT_DARK: [number, number, number] = [15, 23, 42];
const TEXT_MUTED: [number, number, number] = [100, 116, 139];
const TEAL_COLOR: [number, number, number] = [13, 148, 136];

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

const formatDateTime = (d: string | null | undefined): string => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

function ensureSectionFits(doc: jsPDF, totalSectionHeight: number, currentY: number): number {
  const maxSectionHeight = PAGE_BOTTOM - TOP_MARGIN;
  if (totalSectionHeight > maxSectionHeight) {
    return currentY;
  }
  if (currentY + totalSectionHeight > PAGE_BOTTOM) {
    doc.addPage();
    return TOP_MARGIN;
  }
  return currentY;
}

function estimateTextBlockHeight(doc: jsPDF, label: string, text: string, contentWidth: number): number {
  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(8);
  const labelLines = doc.splitTextToSize(label, contentWidth - 8);
  const labelHeight = labelLines.length * 3.5;

  doc.setFont(FONT_NAME, 'normal');
  doc.setFontSize(8);
  const bodyLines = doc.splitTextToSize(text || '-', contentWidth - 8);
  const bodyHeight = bodyLines.length * 3.5 + 4;

  return labelHeight + bodyHeight + 6 + 3;
}

function estimateSignatureGroupHeight(group: FeedbackSignatureGroup): number {
  const sigs = group.signatures.filter(s => s.signature_type !== 'unlock');
  const roleNames = group.roles.length > 0
    ? group.roles.map((r) => r.role_name)
    : sigs.map((s) => s.signer_role);
  if (roleNames.length === 0) return 0;
  const cols = Math.min(roleNames.length, 3);
  const totalRows = Math.ceil(roleNames.length / cols);
  const boxHeight = 28;
  return 6 + totalRows * (boxHeight + 4) + 2;
}

function drawSectionHeader(doc: jsPDF, title: string, y: number, x: number, width: number, color?: [number, number, number]): number {
  doc.setFillColor(...(color || PRIMARY_COLOR));
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

function drawSignatureSectionLabel(doc: jsPDF, label: string, y: number, margin: number): number {
  y = ensureSpace(doc, 8, y);
  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(label, margin + 2, y + 3);
  return y + 6;
}

function drawKeyIcon(doc: jsPDF, cx: number, cy: number, size: number, color: [number, number, number]) {
  doc.setDrawColor(...color);
  doc.setFillColor(...color);
  const r = size * 0.28;
  doc.circle(cx, cy - size * 0.15, r, 'S');
  doc.setLineWidth(0.3);
  doc.line(cx, cy - size * 0.15 + r, cx, cy + size * 0.35);
  doc.line(cx, cy + size * 0.15, cx + size * 0.18, cy + size * 0.15);
  doc.line(cx, cy + size * 0.28, cx + size * 0.14, cy + size * 0.28);
}

function drawPenIcon(doc: jsPDF, cx: number, cy: number, size: number, color: [number, number, number]) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.35);
  const half = size * 0.45;
  const bx1 = cx - half * 0.3;
  const by1 = cy + half;
  const tx = cx + half * 0.7;
  const ty = cy - half * 0.5;
  doc.line(bx1, by1, tx - half * 0.25, ty + half * 0.25);
  doc.line(tx - half * 0.25, ty + half * 0.25, tx, ty);
  doc.line(tx, ty, tx + half * 0.15, ty + half * 0.1);
  doc.line(tx + half * 0.15, ty + half * 0.1, bx1 + half * 0.2, by1 - half * 0.15);
  doc.line(bx1 + half * 0.2, by1 - half * 0.15, bx1, by1);

  doc.setFillColor(...color);
  doc.triangle(bx1, by1, bx1 - size * 0.08, by1 + size * 0.14, bx1 + size * 0.1, by1 + size * 0.04, 'F');

  const waveStartX = cx + half * 0.2;
  const waveY = cy + half * 0.6;
  const points: [number, number][] = [];
  for (let t = 0; t <= 1; t += 0.08) {
    points.push([waveStartX + t * size * 0.5, waveY + Math.sin(t * Math.PI * 2) * size * 0.08]);
  }
  for (let j = 0; j < points.length - 1; j++) {
    doc.line(points[j][0], points[j][1], points[j + 1][0], points[j + 1][1]);
  }
}

function drawNoticeSignatureIcon(doc: jsPDF, iconX: number, iconY: number) {
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  doc.line(iconX, iconY + 3.2, iconX + 1.76, iconY);
  doc.line(iconX + 1.76, iconY, iconX + 2.24, iconY + 0.48);
  doc.line(iconX + 2.24, iconY + 0.48, iconX + 0.48, iconY + 3.68);
  doc.line(iconX + 0.48, iconY + 3.68, iconX, iconY + 3.2);
  doc.setFillColor(100, 116, 139);
  doc.triangle(iconX, iconY + 3.2, iconX + 0.48, iconY + 3.68, iconX - 0.16, iconY + 4.16, 'F');
  const waveStart = iconX + 4;
  const waveY = iconY + 2.8;
  doc.setLineWidth(0.25);
  const pts: [number, number][] = [];
  for (let t = 0; t <= 1; t += 0.05) {
    pts.push([waveStart + t * 3.2, waveY + Math.sin(t * Math.PI * 2) * 0.48]);
  }
  for (let j = 0; j < pts.length - 1; j++) {
    doc.line(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]);
  }
}

function drawSignatureBoxes(
  doc: jsPDF,
  group: FeedbackSignatureGroup,
  y: number,
  margin: number,
  contentWidth: number
): number {
  const filteredSigs = group.signatures.filter(s => s.signature_type !== 'unlock');
  const sigMap = new Map(filteredSigs.map((s) => [s.signer_role, s]));
  const roleNames = group.roles.length > 0
    ? group.roles.sort((a, b) => a.role_order - b.role_order).map((r) => r.role_name)
    : filteredSigs.map((s) => s.signer_role);

  if (roleNames.length === 0) return y;

  const boxHeight = 28;
  const boxGap = 4;
  const cols = Math.min(roleNames.length, 3);
  const boxWidth = (contentWidth - boxGap * (cols - 1)) / cols;

  y = ensureSpace(doc, boxHeight + 6, y);

  roleNames.forEach((role, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);

    if (row > 0 && col === 0) {
      y = ensureSpace(doc, boxHeight + 4, y);
    }

    const bx = margin + col * (boxWidth + boxGap);
    const by = y + row * (boxHeight + 4);

    const sig = sigMap.get(role);
    const isSigned = !!sig;

    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.2);
    doc.setFillColor(isSigned ? 240 : 250, isSigned ? 253 : 250, isSigned ? 250 : 250);
    doc.roundedRect(bx, by, boxWidth, boxHeight, 1.5, 1.5, 'FD');

    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text('IMZA BILGISI', bx + 3, by + 4.5);

    if (isSigned && sig) {
      const iconX = bx + boxWidth - 8;
      const iconY = by + 3.5;
      const iconSize = 4;
      if (sig.signature_type === 'auth') {
        drawKeyIcon(doc, iconX, iconY, iconSize, [71, 85, 105]);
      } else if (sig.signature_type === 'drawn') {
        drawPenIcon(doc, iconX, iconY, iconSize, [71, 85, 105]);
      }
      drawNoticeSignatureIcon(doc, bx + 3, by + boxHeight - 6);
    }

    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.1);
    doc.line(bx + 2, by + 6, bx + boxWidth - 2, by + 6);

    const labelX = bx + 3;
    const valueX = bx + 24;
    let lineY = by + 10;

    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text('Rol:', labelX, lineY);
    doc.setFont(FONT_NAME, 'normal');
    doc.setTextColor(...TEXT_DARK);
    doc.text(role, valueX, lineY);

    lineY += 4;
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(...TEXT_MUTED);
    doc.text('Ad Soyad:', labelX, lineY);
    doc.setFont(FONT_NAME, 'normal');
    doc.setTextColor(...TEXT_DARK);
    doc.text(sig?.signer_name || '-', valueX, lineY);

    lineY += 4;
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(...TEXT_MUTED);
    doc.text('Imza Tarihi:', labelX, lineY);
    doc.setFont(FONT_NAME, 'normal');
    doc.setTextColor(...TEXT_DARK);
    doc.text(sig ? formatDateTime(sig.signed_at) : '-', valueX, lineY);

    lineY += 4;
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(...TEXT_MUTED);
    doc.text('Signature ID:', labelX, lineY);
    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(...TEXT_MUTED);
    const sigId = sig?.signature_id ? sig.signature_id.substring(0, 18) + '...' : '-';
    doc.text(sigId, valueX, lineY);
  });

  const totalRows = Math.ceil(roleNames.length / cols);
  return y + totalRows * (boxHeight + 4) + 2;
}

interface GeneratePdfOptions {
  data: FeedbackData;
  organizationName?: string;
  docMeta?: DocumentMeta;
  logoUrl?: string;
  isLocked?: boolean;
  actions?: FeedbackAction[];
  signatureGroups?: FeedbackSignatureGroup[];
}

export const generateFeedbackPDF = async (
  dataOrOptions: FeedbackData | GeneratePdfOptions,
  organizationName?: string,
  docMeta?: DocumentMeta,
  logoUrl?: string,
  _signatures: unknown[] = [],
  _roles: unknown[] = [],
  isLocked: boolean = false
) => {
  let opts: GeneratePdfOptions;

  if ('data' in dataOrOptions && dataOrOptions.data) {
    opts = dataOrOptions as GeneratePdfOptions;
  } else {
    opts = {
      data: dataOrOptions as FeedbackData,
      organizationName,
      docMeta,
      logoUrl,
      isLocked,
      actions: [],
      signatureGroups: [],
    };
  }

  const data = opts.data;
  const actions = opts.actions || [];
  const signatureGroups = opts.signatureGroups || [];

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await registerFonts(doc);

  const docCode = opts.docMeta?.dokuman_kodu || 'FR-12';
  const docName = opts.docMeta?.dokuman_adi || 'Geri Bildirim Raporu';
  const revNo = opts.docMeta?.rev_no || '';
  const revDate = opts.docMeta?.revizyon_tarihi ? formatRevDate(opts.docMeta.revizyon_tarihi) : '';

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - 2 * margin;
  const gap = 4;
  const colWidth = (contentWidth - gap) / 2;

  const HEADER_HEIGHT = 28;
  const LOGO_WIDTH = 28;
  const LOGO_HEIGHT = 20;
  const LOGO_Y = (HEADER_HEIGHT - LOGO_HEIGHT) / 2;

  let logoImgData: string | null = null;
  if (opts.logoUrl) {
    try {
      const resp = await fetch(opts.logoUrl);
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

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, HEADER_HEIGHT, 'F');
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.line(0, HEADER_HEIGHT, pageWidth, HEADER_HEIGHT);
  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 172, 193);
  const titleMaxWidth = pageWidth - 2 * margin - LOGO_WIDTH - 6;
  doc.text(docName, margin + titleMaxWidth / 2, 17, { align: 'center', maxWidth: titleMaxWidth });

  if (logoImgData) {
    doc.addImage(logoImgData, 'PNG', pageWidth - margin - LOGO_WIDTH, LOGO_Y, LOGO_WIDTH, LOGO_HEIGHT);
  }

  let y = HEADER_HEIGHT + 6;

  // 1. BASVURU BILGILERI & MUSTERI BILGILERI (side-by-side)
  const leftRows = [
    ['Form Tarihi', formatDate(data.form_date)],
    ['Bildirim No', data.application_no || '-'],
    ['Iletisim Kanali', data.communication_channel || '-'],
    ['Geri Bildr. Alan', data.received_by || '-'],
  ];

  const rightRows = [
    [data.source_type || 'Kaynak', data.applicant_name || '-'],
    ['Yetkili Kisi', data.contact_person || '-'],
    ['Telefon', data.contact_phone || data.phone || '-'],
    ['E-posta', data.contact_email || data.email || '-'],
  ];

  const headerHeight = 7;
  const leftTableHeight = estimateTableHeight(leftRows.length);
  const rightTableHeight = estimateTableHeight(rightRows.length);
  const totalSideBySideHeight = headerHeight + Math.max(leftTableHeight, rightTableHeight) + 4;

  y = ensureSpace(doc, totalSideBySideHeight, y);

  const leftX = margin;
  const rightX = margin + colWidth + gap;

  const leftY = drawSectionHeader(doc, 'BASVURU BILGILERI', y, leftX, colWidth);
  const rightY = drawSectionHeader(doc, 'GERI BILDIRIM SAHIBI', y, rightX, colWidth);

  const leftStyles = columnTableStyles(colWidth, leftX);
  autoTable(doc, { ...leftStyles, startY: leftY, body: leftRows });
  const leftFinalY = (doc as any).lastAutoTable.finalY;

  const rightStyles = columnTableStyles(colWidth, rightX);
  autoTable(doc, { ...rightStyles, startY: rightY, body: rightRows });
  const rightFinalY = (doc as any).lastAutoTable.finalY;

  y = Math.max(leftFinalY, rightFinalY) + 6;

  const fwStyles = fullWidthTableStyles(contentWidth, margin);

  // 2. ICERIK
  {
    const sectionHeight = 9 + estimateTextBlockHeight(doc, 'Konu (Detayli Aciklama)', data.content_details || '-', contentWidth);
    y = ensureSectionFits(doc, sectionHeight, y);
  }
  y = drawSectionHeader(doc, 'ICERIK', y, margin, contentWidth);
  y = drawTextBlock(doc, 'Konu (Detayli Aciklama)', data.content_details || '-', y, margin, contentWidth);

  // 3. IZAHAT
  {
    const izahatRows = [['Bildirimin Muhatabi', data.izahat_by || '-']];
    const izahatSigGroup = signatureGroups.find((g) => g.moduleKey === 'feedback_izahat');
    const izahatSectionHeight = 9
      + estimateTableHeight(izahatRows.length) + 3
      + estimateTextBlockHeight(doc, 'Bildirim Muhatabi Izahati', data.izahat_text || '-', contentWidth)
      + (izahatSigGroup ? estimateSignatureGroupHeight(izahatSigGroup) : 0);
    y = ensureSectionFits(doc, izahatSectionHeight, y);

    y = drawSectionHeader(doc, 'IZAHAT', y, margin, contentWidth);

    autoTable(doc, { ...fwStyles, startY: y, body: izahatRows });
    y = (doc as any).lastAutoTable.finalY + 3;
    y = drawTextBlock(doc, 'Bildirim Muhatabi Izahati', data.izahat_text || '-', y, margin, contentWidth);

    if (izahatSigGroup) {
      y = drawSignatureSectionLabel(doc, 'Izahat Sahibi Imzasi', y, margin);
      y = drawSignatureBoxes(doc, izahatSigGroup, y, margin, contentWidth);
    }
  }

  // 4. SORUMLULUK KARARI
  const validityMap: Record<string, string> = {
    'Geçerli/Uygun': 'KABUL / Gecerli / Uygun',
    'Geçersiz/Uygun Değil': 'RET / Gecersiz / Uygun Degil',
  };
  const validityLabel = validityMap[data.validation_status || ''] || data.validation_status || 'Degerlendirmede';
  const evalRows = [
    ['Bildirim Turu', data.feedback_type || '-'],
    ['Gecerlilik Karari', validityLabel],
    ['DF Gereksinimi', data.requires_capa ? 'Evet' : 'Hayir'],
  ];
  if (data.requires_capa && data.capa_no) {
    evalRows.push(['DF Numarasi', data.capa_no]);
  }

  const feedbackSigGroup = signatureGroups.find((g) => g.moduleKey === 'customer_feedback');
  {
    const evalSectionHeight = 9
      + estimateTableHeight(evalRows.length) + 3
      + (data.evaluation ? estimateTextBlockHeight(doc, 'Degerlendirme Notlari', data.evaluation, contentWidth) : 0)
      + (feedbackSigGroup ? estimateSignatureGroupHeight(feedbackSigGroup) : 0);
    y = ensureSectionFits(doc, evalSectionHeight, y);
  }
  y = drawSectionHeader(doc, 'SORUMLULUK KARARI', y, margin, contentWidth);

  autoTable(doc, { ...fwStyles, startY: y, body: evalRows });
  y = (doc as any).lastAutoTable.finalY + 3;

  if (data.evaluation) {
    y = drawTextBlock(doc, 'Degerlendirme Notlari', data.evaluation, y, margin, contentWidth);
  }

  if (feedbackSigGroup) {
    y = drawSignatureSectionLabel(doc, 'Karar Verici Imzasi', y, margin);
    y = drawSignatureBoxes(doc, feedbackSigGroup, y, margin, contentWidth);
  }

  // 5. PLANLAMA VE AKSIYON
  {
    const statusMap: Record<string, string> = {
      'Planlandı': 'Planlandi',
      'Devam Ediyor': 'Devam Ediyor',
      'Tamamlandı': 'Tamamlandi',
    };

    const actionTableRows = actions.length > 0
      ? actions.map((a, i) => [
          String(i + 1),
          a.action_description || '-',
          a.responsible_person || '-',
          formatDate(a.deadline),
          statusMap[a.status] || a.status || '-',
          formatDate(a.completed_date),
        ])
      : [['1', '-', '-', '-', '-', '-']];

    const actionSigGroups = signatureGroups.filter((g) => g.moduleKey.startsWith('feedback_action_'));
    const actionSigHeight = actionSigGroups.reduce((sum, sg) => sum + estimateSignatureGroupHeight(sg), 0);
    const actionSectionHeight = 9 + estimateTableHeight(actionTableRows.length + 1) + 4 + actionSigHeight;
    y = ensureSectionFits(doc, actionSectionHeight, y);

    y = drawSectionHeader(doc, 'PLANLAMA VE AKSIYON', y, margin, contentWidth);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'plain' as const,
      head: [['#', 'Aksiyon', 'Sorumlu', 'Termin', 'Durum', 'Tamamlanma']],
      body: actionTableRows,
      styles: {
        font: FONT_NAME,
        fontSize: 7.5,
        cellPadding: { top: 1.8, bottom: 1.8, left: 2, right: 2 },
        textColor: TEXT_DARK,
        lineColor: BORDER_COLOR,
        lineWidth: 0.15,
        overflow: 'linebreak' as const,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: TEXT_MUTED,
        fontStyle: 'bold',
        fontSize: 7,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' as const },
        1: { cellWidth: contentWidth * 0.32 },
        2: { cellWidth: contentWidth * 0.18 },
        3: { cellWidth: contentWidth * 0.14 },
        4: { cellWidth: contentWidth * 0.14 },
        5: { cellWidth: contentWidth - 8 - contentWidth * 0.32 - contentWidth * 0.18 - contentWidth * 0.14 - contentWidth * 0.14 },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 4;

    for (const sg of actionSigGroups) {
      y = drawSignatureBoxes(doc, sg, y, margin, contentWidth);
    }
  }

  // 6. KAPATMA
  {
    const closureRows = [
      ['Kapatma Tarihi', formatDate(data.closure_date)],
    ];
    const closureSigGroup = signatureGroups.find((g) => g.moduleKey === 'feedback_closure');

    let closureNoticeHeight = 0;
    if (data.closure_date) {
      doc.setFont(FONT_NAME, 'normal');
      doc.setFontSize(7);
      const closureNotice = 'Bu geri bildirim resmi olarak kapatilmistir. Alinan onlemlerin etkinligi dogrulanmis olup, laboratuvarin kalite sistemine sagladigi katki icin ilgili tum taraflara tesekkur edilir.';
      const noticeLines = doc.splitTextToSize(closureNotice, contentWidth - 8);
      closureNoticeHeight = noticeLines.length * 3 + 6 + 4;
    }

    const closureSectionHeight = 9
      + estimateTableHeight(closureRows.length) + 3
      + estimateTextBlockHeight(doc, 'Kapatma Notlari', data.closure_notes || '-', contentWidth)
      + closureNoticeHeight
      + (closureSigGroup ? estimateSignatureGroupHeight(closureSigGroup) : 0);
    y = ensureSectionFits(doc, closureSectionHeight, y);

    y = drawSectionHeader(doc, 'KAPATMA', y, margin, contentWidth, TEAL_COLOR);

    autoTable(doc, { ...fwStyles, startY: y, body: closureRows });
    y = (doc as any).lastAutoTable.finalY + 3;

    y = drawTextBlock(doc, 'Kapatma Notlari', data.closure_notes || '-', y, margin, contentWidth);

    if (data.closure_date) {
      doc.setFont(FONT_NAME, 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...TEXT_MUTED);
      const closureNotice = 'Bu geri bildirim resmi olarak kapatilmistir. Alinan onlemlerin etkinligi dogrulanmis olup, laboratuvarin kalite sistemine sagladigi katki icin ilgili tum taraflara tesekkur edilir.';
      const noticeLines = doc.splitTextToSize(closureNotice, contentWidth - 8);
      const noticeHeight = noticeLines.length * 3 + 6;

      doc.setFillColor(240, 253, 250);
      doc.setDrawColor(153, 246, 228);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin + 1, y - 1, contentWidth - 2, noticeHeight, 1.5, 1.5, 'FD');
      doc.text(noticeLines, margin + 4, y + 3);
      y += noticeHeight + 4;
    }

    if (closureSigGroup) {
      y = drawSignatureSectionLabel(doc, 'Kapatan Yetkili Imzasi', y, margin);
      y = drawSignatureBoxes(doc, closureSigGroup, y, margin, contentWidth);
    }
  }

  const hasAnySignature = signatureGroups.some((g) =>
    g.signatures.some((s) => s.signature_type !== 'unlock')
  );

  if (hasAnySignature) {
    const eNotice = 'Bu dokuman elektronik ortamda imzalanmistir. Imza kayitlari sistem veritabaninda dogrulanabilir.';
    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(6.5);
    const textLeftOffset = 12;
    const noticeLines = doc.splitTextToSize(eNotice, contentWidth - 8 - textLeftOffset);
    const noticeH = Math.max(noticeLines.length * 3 + 6, 10);
    y = ensureSpace(doc, noticeH + 4, y);

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin + 1, y, contentWidth - 2, noticeH, 1.5, 1.5, 'FD');

    const iconX = margin + 4;
    const iconY = y + noticeH / 2 - 2;
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.35);
    doc.line(iconX, iconY + 4, iconX + 2.2, iconY);
    doc.line(iconX + 2.2, iconY, iconX + 2.8, iconY + 0.6);
    doc.line(iconX + 2.8, iconY + 0.6, iconX + 0.6, iconY + 4.6);
    doc.line(iconX + 0.6, iconY + 4.6, iconX, iconY + 4);
    doc.setFillColor(100, 116, 139);
    doc.triangle(iconX, iconY + 4, iconX + 0.6, iconY + 4.6, iconX - 0.2, iconY + 5.2, 'F');

    const penTipRight = iconX + 5;
    doc.setLineWidth(0.3);
    doc.setDrawColor(100, 116, 139);
    const waveY = iconY + 3.5;
    const points: [number, number][] = [];
    for (let t = 0; t <= 1; t += 0.05) {
      const px = penTipRight + t * 4;
      const py = waveY + Math.sin(t * Math.PI * 2) * 0.6;
      points.push([px, py]);
    }
    for (let j = 0; j < points.length - 1; j++) {
      doc.line(points[j][0], points[j][1], points[j + 1][0], points[j + 1][1]);
    }

    doc.setTextColor(...TEXT_MUTED);
    doc.text(noticeLines, margin + 4 + textLeftOffset, y + 4);
    y += noticeH + 4;
  }

  addFooter(doc, docCode, revNo, revDate);

  if (logoImgData) {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.addImage(logoImgData, 'PNG', pageWidth - 42, 4, 26, 18);
    }
  }

  if (logoImgData) {
    const totalPages = doc.getNumberOfPages();
    for (let i = 2; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(...BORDER_COLOR);
      doc.setLineWidth(0.3);
      doc.line(0, HEADER_HEIGHT, pageWidth, HEADER_HEIGHT);
      doc.addImage(logoImgData, 'PNG', pageWidth - margin - LOGO_WIDTH, LOGO_Y, LOGO_WIDTH, LOGO_HEIGHT);
    }
  }

  if (opts.isLocked) {
    addImzaliWatermark(doc);
  }

  const customerPart = sanitizeForFilename(data.applicant_name || '');
  const applicationPart = sanitizeForFilename(data.application_no || '');
  const nameParts = [customerPart, applicationPart].filter(Boolean);
  const pdfFileName = nameParts.length > 0 ? nameParts.join('_') : 'rapor';
  doc.save(`${pdfFileName}.pdf`);
};
