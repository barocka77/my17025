import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DocumentMeta } from './documentLinkService';

const FONT_NAME = 'Roboto';

const PRIMARY_COLOR: [number, number, number] = [51, 65, 85];
const BORDER_COLOR: [number, number, number] = [203, 213, 225];
const TEXT_DARK: [number, number, number] = [15, 23, 42];
const TEXT_MUTED: [number, number, number] = [100, 116, 139];
const TEAL_COLOR: [number, number, number] = [13, 148, 136];
const AMBER_COLOR: [number, number, number] = [180, 83, 9];

const PAGE_BOTTOM = 275;
const TOP_MARGIN = 25;

const SOURCE_LABELS: Record<string, string> = {
  internal_audit: 'İç Tetkik',
  external_audit: 'Dış Tetkik',
  customer_feedback: 'Müşteri Geri Bildirimi',
  risk_analysis: 'Risk Analizi',
  data_control: 'Veri Kontrolü',
  lak: 'Laboratuvarlar Arası Karşılaştırma (LAK)',
  pak: 'Personeller Arası Karşılaştırma (PAK)',
  personnel_observation: 'Personel Gözlemi',
  ineffective_df: 'Etkisiz DF',
  other: 'Diğer',
};

const SOURCE_ABBR: Record<string, string> = {
  internal_audit: 'IT',
  external_audit: 'DT',
  customer_feedback: 'MGB',
  risk_analysis: 'RA',
  data_control: 'VK',
  lak: 'LAK',
  pak: 'PAK',
  personnel_observation: 'PG',
  ineffective_df: 'EDF',
  other: 'DG',
};

const SEVERITY_LABELS: Record<string, string> = {
  minor: 'Düşük',
  major: 'Orta',
  critical: 'Kritik',
};

const RECURRENCE_LABELS: Record<string, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
};

const CALIBRATION_LABELS: Record<string, string> = {
  none: 'Etkisi Yok',
  potential: 'Etkileme İhtimali',
  confirmed: 'Etkiledi',
};

const RCA_CATEGORY_LABELS: Record<string, string> = {
  human: 'İnsan',
  method: 'Yöntem',
  equipment: 'Ekipman',
  environment: 'Ortam',
  material: 'Materyal',
  management: 'Yönetim',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Açık',
  analysis: 'Analiz',
  action_required: 'Aksiyon Gerekli',
  monitoring: 'İzlemede',
  closed: 'Kapalı',
};

const formatDate = (d: string | null | undefined): string => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateTime = (d: string | null | undefined): string => {
  if (!d) return '-';
  return new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const TURKISH_MAP: Record<string, string> = {
  'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I',
  'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U',
};

function sanitize(text: string): string {
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

function ensureSpace(doc: jsPDF, neededHeight: number, currentY: number): number {
  if (currentY + neededHeight > PAGE_BOTTOM) {
    doc.addPage();
    return TOP_MARGIN;
  }
  return currentY;
}

function ensureSectionFits(doc: jsPDF, totalHeight: number, currentY: number): number {
  const maxSection = PAGE_BOTTOM - TOP_MARGIN;
  if (totalHeight > maxSection) return currentY;
  if (currentY + totalHeight > PAGE_BOTTOM) {
    doc.addPage();
    return TOP_MARGIN;
  }
  return currentY;
}

function estimateTableHeight(rowCount: number): number {
  return rowCount * 6.5 + 2;
}

function estimateTextBlockHeight(doc: jsPDF, label: string, text: string, contentWidth: number): number {
  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(8);
  const labelLines = doc.splitTextToSize(label, contentWidth - 8);
  const labelHeight = labelLines.length * 3.5;
  doc.setFont(FONT_NAME, 'normal');
  const bodyLines = doc.splitTextToSize(text || '-', contentWidth - 8);
  const bodyHeight = bodyLines.length * 3.5 + 4;
  return labelHeight + bodyHeight + 6 + 3;
}

function drawSectionHeader(
  doc: jsPDF, title: string, y: number, x: number, width: number,
  color?: [number, number, number]
): number {
  doc.setFillColor(...(color || PRIMARY_COLOR));
  doc.rect(x, y, width, 7, 'F');
  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(title, x + 3, y + 5);
  doc.setTextColor(...TEXT_DARK);
  return y + 9;
}

function drawTextBlock(
  doc: jsPDF, label: string, text: string,
  y: number, margin: number, contentWidth: number
): number {
  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  const labelLines = doc.splitTextToSize(label, contentWidth - 8);
  const labelHeight = labelLines.length * 3.5;

  doc.setFont(FONT_NAME, 'normal');
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
    const ph = doc.internal.pageSize.getHeight();
    const pw = doc.internal.pageSize.getWidth();
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.3);
    doc.line(10, ph - 15, pw - 10, ph - 15);
    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(revLine, 10, ph - 10);
    doc.text(`Sayfa ${i} / ${pageCount}`, pw - 10, ph - 10, { align: 'right' });
  }
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
    doc.text('İMZALI', pw / 2, ph / 2, { align: 'center', angle: 45 });
    doc.restoreGraphicsState();
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
      0: { cellWidth: 52, fontStyle: 'bold' as const, textColor: TEXT_MUTED, fontSize: 8 },
      1: { cellWidth: contentWidth - 52 },
    },
  };
}

function drawSignatureSectionLabel(doc: jsPDF, label: string, y: number, margin: number): number {
  y = ensureSpace(doc, 8, y);
  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(label, margin + 2, y + 3);
  return y + 6;
}

function drawSignatureBoxes(
  doc: jsPDF,
  roles: { role_name: string; role_order: number }[],
  signatures: NcSignatureEntry[],
  y: number,
  margin: number,
  contentWidth: number
): number {
  if (roles.length === 0) return y;

  const sigMap = new Map(
    signatures.filter(s => s.signature_type !== 'unlock').map(s => [s.signer_role, s])
  );
  const sortedRoles = [...roles].sort((a, b) => a.role_order - b.role_order);

  const boxHeight = 28;
  const boxGap = 4;
  const cols = Math.min(sortedRoles.length, 3);
  const boxWidth = (contentWidth - boxGap * (cols - 1)) / cols;

  y = ensureSpace(doc, boxHeight + 6, y);

  sortedRoles.forEach((r, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);

    if (row > 0 && col === 0) {
      y = ensureSpace(doc, boxHeight + 4, y);
    }

    const bx = margin + col * (boxWidth + boxGap);
    const by = y + row * (boxHeight + 4);
    const sig = sigMap.get(r.role_name);
    const isSigned = !!sig;

    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.2);
    doc.setFillColor(isSigned ? 240 : 250, isSigned ? 253 : 250, isSigned ? 250 : 250);
    doc.roundedRect(bx, by, boxWidth, boxHeight, 1.5, 1.5, 'FD');

    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text('İMZA BİLGİSİ', bx + 3, by + 4.5);

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
    doc.text(r.role_name, valueX, lineY);

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
    doc.text('İmza Tarihi:', labelX, lineY);
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

  const totalRows = Math.ceil(sortedRoles.length / cols);
  return y + totalRows * (boxHeight + 4) + 2;
}

export interface NcSignatureEntry {
  signer_role: string;
  signer_name: string;
  signed_at: string;
  signature_image_url: string | null;
  signature_id?: string;
  signature_type?: string;
}

export interface NcSignatureGroup {
  moduleKey: string;
  label: string;
  signatures: NcSignatureEntry[];
  roles: { role_name: string; role_order: number }[];
}

export interface NcRootCause {
  rca_category: string;
  rca_description: string;
}

export interface NcCorrectiveAction {
  ca_number: string;
  action_description: string;
  responsible_user: string;
  planned_completion_date: string | null;
  status: string;
  completed_date: string | null;
}

export interface NcData {
  id: string;
  nc_number: string;
  detection_date: string;
  source: string;
  description: string;
  severity: string;
  recurrence_risk: string;
  calibration_impact: string;
  identified_by?: string;
  identified_by_name?: string;
  status: string;
  analysis_team_names?: string[];
  impact_inappropriate_calibration: boolean;
  impact_requires_stoppage: boolean;
  impact_recurrence_possible: boolean;
  impact_requires_extended_analysis: boolean;
  correction_action?: string;
  correction_responsible?: string;
  correction_responsible_name?: string;
  correction_deadline?: string;
  created_at?: string;
}

export interface GenerateNcPdfOptions {
  nc: NcData;
  rootCauses?: NcRootCause[];
  correctiveActions?: NcCorrectiveAction[];
  signatureGroups?: NcSignatureGroup[];
  organizationName?: string;
  docMeta?: DocumentMeta;
  logoUrl?: string;
  isLocked?: boolean;
}

export const generateNcPDF = async (options: GenerateNcPdfOptions) => {
  const {
    nc,
    rootCauses = [],
    correctiveActions = [],
    signatureGroups = [],
    docMeta,
    logoUrl,
    isLocked = false,
  } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await registerFonts(doc);

  const docCode = 'FR.13';
  const docName = docMeta?.dokuman_adi || 'Uygunsuzluk Analiz Formu';
  const revNo = '03';
  const revDate = '17.03.2026';

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - 2 * margin;
  const gap = 4;
  const colWidth = (contentWidth - gap) / 2;

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

  const HEADER_HEIGHT = 28;
  const LOGO_WIDTH = 28;
  const LOGO_HEIGHT = 20;
  const LOGO_X = pageWidth - margin - LOGO_WIDTH;
  const LOGO_Y = (HEADER_HEIGHT - LOGO_HEIGHT) / 2;

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
    doc.addImage(logoImgData, 'PNG', LOGO_X, LOGO_Y, LOGO_WIDTH, LOGO_HEIGHT);
  }

  let y = HEADER_HEIGHT + 6;

  const fwStyles = fullWidthTableStyles(contentWidth, margin);

  // 1. UYGUNSUZLUK BILGILERI & TANILAMA (side-by-side)
  const leftRows = [
    ['NC No', nc.nc_number || '-'],
    ['Tespit Tarihi', formatDate(nc.detection_date)],
    ['Tespit Noktası', SOURCE_LABELS[nc.source] || nc.source || '-'],
    ['Kayıt Tarihi', formatDate(nc.created_at)],
  ];

  const rightRows = [
    ['Şiddet', SEVERITY_LABELS[nc.severity] || nc.severity || '-'],
    ['Tekrarlama Riski', RECURRENCE_LABELS[nc.recurrence_risk] || nc.recurrence_risk || '-'],
    ['Kalibrasyon Etkisi', CALIBRATION_LABELS[nc.calibration_impact] || nc.calibration_impact || '-'],
    ['Durum', STATUS_LABELS[nc.status] || nc.status || '-'],
  ];

  const headerHeight = 7;
  const leftTableH = estimateTableHeight(leftRows.length);
  const rightTableH = estimateTableHeight(rightRows.length);
  const totalSideBySide = headerHeight + Math.max(leftTableH, rightTableH) + 4;

  y = ensureSpace(doc, totalSideBySide, y);

  const leftX = margin;
  const rightX = margin + colWidth + gap;

  const leftY = drawSectionHeader(doc, 'UYGUNSUZLUK BİLGİLERİ', y, leftX, colWidth);
  const rightY = drawSectionHeader(doc, 'TANILAMA', y, rightX, colWidth);

  const leftStyles = columnTableStyles(colWidth, leftX);
  autoTable(doc, { ...leftStyles, startY: leftY, body: leftRows });
  const leftFinalY = (doc as any).lastAutoTable.finalY;

  const rightStyles = columnTableStyles(colWidth, rightX);
  autoTable(doc, { ...rightStyles, startY: rightY, body: rightRows });
  const rightFinalY = (doc as any).lastAutoTable.finalY;

  y = Math.max(leftFinalY, rightFinalY) + 6;

  // 2. ICERIK
  {
    const sectionH = 9 + estimateTextBlockHeight(doc, 'Uygunsuzluk Tanimi', nc.description || '-', contentWidth);
    y = ensureSectionFits(doc, sectionH, y);
  }
  y = drawSectionHeader(doc, 'İÇERİK', y, margin, contentWidth);
  y = drawTextBlock(doc, 'Uygunsuzluk Tanımı', nc.description || '-', y, margin, contentWidth);

  if (nc.identified_by_name) {
    const rows = [['Uygunsuzluğu Tanımlayan', nc.identified_by_name]];
    autoTable(doc, { ...fwStyles, startY: y, body: rows });
    y = (doc as any).lastAutoTable.finalY + 3;
  }

  if (nc.analysis_team_names && nc.analysis_team_names.length > 0) {
    const rows = [['Analiz Ekibi', nc.analysis_team_names.join(', ')]];
    autoTable(doc, { ...fwStyles, startY: y, body: rows });
    y = (doc as any).lastAutoTable.finalY + 3;
  }

  // 3. UYGUNSUZLUGUN ETKISI
  {
    const impactRows = [
      ['Uygun Olmayan Kalibrasyon', nc.impact_inappropriate_calibration ? 'Evet' : 'Hayır'],
      ['Kalibrasyon Durdurma Gerekiyor', nc.impact_requires_stoppage ? 'Evet' : 'Hayır'],
      ['Tekrarlama İhtimali', nc.impact_recurrence_possible ? 'Evet' : 'Hayır'],
      ['DF Açılması Gerekiyor', nc.impact_requires_extended_analysis ? 'Evet' : 'Hayır'],
    ];
    const sectionH = 9 + estimateTableHeight(impactRows.length) + 2;
    y = ensureSectionFits(doc, sectionH, y);
    y = drawSectionHeader(doc, 'UYGUNSUZLUĞUN ETKİSİ', y, margin, contentWidth, AMBER_COLOR);
    autoTable(doc, { ...fwStyles, startY: y, body: impactRows });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // 4. DUZELTME FAALIYETI
  {
    const correctionRows = [
      ['Düzeltme Açıklaması', nc.correction_action || '-'],
      ['Sorumlu', nc.correction_responsible_name || nc.correction_responsible || '-'],
      ['Termin Tarihi', formatDate(nc.correction_deadline)],
    ];
    const sectionH = 9 + estimateTableHeight(correctionRows.length) + 2;
    y = ensureSectionFits(doc, sectionH, y);
    y = drawSectionHeader(doc, 'DÜZELTME FAALİYETİ', y, margin, contentWidth);
    autoTable(doc, { ...fwStyles, startY: y, body: correctionRows });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // 5. KOK NEDEN ANALIZI
  {
    const rcaRows = rootCauses.length > 0
      ? rootCauses.map((r, i) => [
          String(i + 1),
          RCA_CATEGORY_LABELS[r.rca_category] || r.rca_category || '-',
          r.rca_description || '-',
        ])
      : [['1', '-', '-']];

    const sectionH = 9 + estimateTableHeight(rcaRows.length + 1) + 4;
    y = ensureSectionFits(doc, sectionH, y);
    y = drawSectionHeader(doc, 'KÖK NEDEN ANALİZİ', y, margin, contentWidth);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'plain' as const,
      head: [['#', 'Kategori', 'Açıklama']],
      body: rcaRows,
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
        1: { cellWidth: contentWidth * 0.22 },
        2: { cellWidth: contentWidth - 8 - contentWidth * 0.22 },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // 6. PLANLAMA VE AKSIYON (DÜZELTİCİ FAALİYETLER)
  {
    const statusMap: Record<string, string> = {
      'Planlandı': 'Planlandı',
      'İşlemde': 'İşlemde',
      'Tamamlandı': 'Tamamlandı',
      'Kapalı': 'Kapalı',
    };

    const caRows = correctiveActions.length > 0
      ? correctiveActions.map((a, i) => [
          String(i + 1),
          a.ca_number || '-',
          a.action_description || '-',
          a.responsible_user || '-',
          formatDate(a.planned_completion_date),
          statusMap[a.status] || a.status || '-',
          formatDate(a.completed_date),
        ])
      : [['1', '-', '-', '-', '-', '-', '-']];

    const sectionH = 9 + estimateTableHeight(caRows.length + 1) + 4;
    y = ensureSectionFits(doc, sectionH, y);
    y = drawSectionHeader(doc, 'DÜZELTİCİ FAALİYETLER', y, margin, contentWidth, TEAL_COLOR);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'plain' as const,
      head: [['#', 'DF No', 'Aksiyon', 'Sorumlu', 'Termin', 'Durum', 'Tamamlanma']],
      body: caRows,
      styles: {
        font: FONT_NAME,
        fontSize: 7,
        cellPadding: { top: 1.8, bottom: 1.8, left: 2, right: 2 },
        textColor: TEXT_DARK,
        lineColor: BORDER_COLOR,
        lineWidth: 0.15,
        overflow: 'linebreak' as const,
      },
      headStyles: {
        fillColor: [240, 253, 250],
        textColor: TEXT_MUTED,
        fontStyle: 'bold',
        fontSize: 6.5,
      },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' as const },
        1: { cellWidth: contentWidth * 0.13 },
        2: { cellWidth: contentWidth * 0.28 },
        3: { cellWidth: contentWidth * 0.16 },
        4: { cellWidth: contentWidth * 0.12 },
        5: { cellWidth: contentWidth * 0.12 },
        6: { cellWidth: contentWidth - 7 - contentWidth * 0.13 - contentWidth * 0.28 - contentWidth * 0.16 - contentWidth * 0.12 - contentWidth * 0.12 },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // 7. IMZALAR
  for (const group of signatureGroups) {
    if (group.roles.length === 0) continue;
    const sigH = 10 + 32 * Math.ceil(group.roles.length / 3);
    y = ensureSpace(doc, sigH + 4, y);
    y = drawSignatureSectionLabel(doc, group.label, y, margin);
    y = drawSignatureBoxes(doc, group.roles, group.signatures, y, margin, contentWidth);
  }

  const hasAnySignature = signatureGroups.some(g =>
    g.signatures.some(s => s.signature_type !== 'unlock')
  );

  if (hasAnySignature) {
    const eNotice = 'Bu doküman elektronik ortamda imzalanmıştır. İmza kayıtları sistem veritabanında doğrulanabilir.';
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
    doc.setTextColor(...TEXT_MUTED);
    doc.text(noticeLines, margin + 4 + textLeftOffset, y + 4);
    y += noticeH + 4;
  }

  addFooter(doc, docCode, revNo, revDate);

  {
    const totalPages = doc.getNumberOfPages();
    for (let i = 2; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(...BORDER_COLOR);
      doc.setLineWidth(0.3);
      doc.line(0, HEADER_HEIGHT, pageWidth, HEADER_HEIGHT);
      if (logoImgData) {
        doc.addImage(logoImgData, 'PNG', pageWidth - margin - LOGO_WIDTH, LOGO_Y, LOGO_WIDTH, LOGO_HEIGHT);
      }
    }
  }

  if (isLocked) {
    addImzaliWatermark(doc);
  }

  const sourceAbbr = SOURCE_ABBR[nc.source] || sanitize(SOURCE_LABELS[nc.source] || nc.source || '');
  const ncNumberPart = sanitize(nc.nc_number || '');
  const fileName = `NC_${sourceAbbr}_${ncNumberPart}`;
  doc.save(`${fileName}.pdf`);
};
