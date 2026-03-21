import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FONT_NAME = 'Roboto';

const PRIMARY_COLOR: [number, number, number] = [51, 65, 85];
const BORDER_COLOR: [number, number, number] = [203, 213, 225];
const TEXT_DARK: [number, number, number] = [15, 23, 42];
const TEXT_MUTED: [number, number, number] = [100, 116, 139];
const TEAL_COLOR: [number, number, number] = [13, 148, 136];
const GREEN_COLOR: [number, number, number] = [22, 163, 74];
const RED_COLOR: [number, number, number] = [220, 38, 38];
const AMBER_COLOR: [number, number, number] = [180, 83, 9];

const PAGE_BOTTOM = 275;
const TOP_MARGIN = 25;

const HEADER_HEIGHT = 28;
const LOGO_WIDTH = 28;
const LOGO_HEIGHT = 20;

const SOURCE_LABELS: Record<string, string> = {
  internal_audit: 'Ic Tetkik',
  external_audit: 'Dis Tetkik',
  customer_feedback: 'Musteri Geri Bildirimi',
  risk_analysis: 'Risk Analizi',
  personnel_observation: 'Personel Gozlemi',
  data_control: 'Veri Kontrolu',
  lak: 'Laboratuvarlar Arasi Karsilastirma (LAK)',
  pak: 'Personeller Arasi Karsilastirma (PAK)',
  ineffective_df: 'Etkisiz DF',
  other: 'Diger',
};

const SEVERITY_LABELS: Record<string, string> = {
  minor: 'Dusuk',
  major: 'Orta',
  critical: 'Kritik',
};

const CA_STATUS_LABELS: Record<string, string> = {
  open: 'Acik',
  'Planlandı': 'Planlandi',
  'İşlemde': 'Islemde',
  'Tamamlandı': 'Tamamlandi',
  'Kapalı': 'Kapali',
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

const formatDate = (d: string | null | undefined): string => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

function yesNo(val: boolean | null | undefined): string {
  return val ? 'Evet' : 'Hayir';
}

async function registerFonts(doc: jsPDF) {
  const { ROBOTO_REGULAR, ROBOTO_BOLD } = await import('./robotoFontData');
  doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR);
  doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD);
  doc.addFont('Roboto-Regular.ttf', FONT_NAME, 'normal');
  doc.addFont('Roboto-Bold.ttf', FONT_NAME, 'bold');
  doc.setFont(FONT_NAME, 'normal');
}

function ensureSpace(doc: jsPDF, needed: number, y: number): number {
  if (y + needed > PAGE_BOTTOM) {
    doc.addPage();
    return TOP_MARGIN;
  }
  return y;
}

function ensureSectionFits(doc: jsPDF, total: number, y: number): number {
  if (total > PAGE_BOTTOM - TOP_MARGIN) return y;
  if (y + total > PAGE_BOTTOM) {
    doc.addPage();
    return TOP_MARGIN;
  }
  return y;
}

function estimateTableHeight(rowCount: number): number {
  return rowCount * 6.5 + 2;
}

function estimateTextBlockHeight(doc: jsPDF, label: string, text: string, contentWidth: number): number {
  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(8);
  const labelLines = doc.splitTextToSize(label, contentWidth - 8);
  const lh = labelLines.length * 3.5;
  doc.setFont(FONT_NAME, 'normal');
  const bodyLines = doc.splitTextToSize(text || '-', contentWidth - 8);
  const bh = bodyLines.length * 3.5 + 4;
  return lh + bh + 9;
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

function drawTextBlock(doc: jsPDF, label: string, text: string, y: number, margin: number, contentWidth: number): number {
  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  const labelLines = doc.splitTextToSize(label, contentWidth - 8);
  const lh = labelLines.length * 3.5;

  doc.setFont(FONT_NAME, 'normal');
  const bodyLines = doc.splitTextToSize(text || '-', contentWidth - 8);
  const bh = bodyLines.length * 3.5 + 4;
  const totalH = lh + bh + 6;

  y = ensureSpace(doc, totalH, y);

  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(labelLines, margin + 2, y);
  y += lh + 2;

  doc.setFont(FONT_NAME, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_DARK);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(margin + 1, y - 2, contentWidth - 2, bh, 1.5, 1.5, 'FD');
  doc.text(bodyLines, margin + 4, y + 2);
  return y + bh + 3;
}

function columnTableStyles(colWidth: number, leftMargin: number) {
  return {
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
      0: { cellWidth: colWidth * 0.44, fontStyle: 'bold' as const, textColor: TEXT_MUTED, fontSize: 8 },
      1: { cellWidth: colWidth * 0.56 },
    },
  };
}

function fullWidthTableStyles(contentWidth: number, margin: number) {
  return {
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
      0: { cellWidth: 58, fontStyle: 'bold' as const, textColor: TEXT_MUTED, fontSize: 8 },
      1: { cellWidth: contentWidth - 58 },
    },
  };
}

function drawAnalysisTeamBoxes(
  doc: jsPDF,
  members: { full_name: string; job_title: string | null }[],
  y: number,
  margin: number,
  contentWidth: number
): number {
  if (members.length === 0) return y;

  const boxHeight = 30;
  const boxGap = 4;
  const cols = Math.min(members.length, 3);
  const boxWidth = (contentWidth - boxGap * (cols - 1)) / cols;

  y = ensureSpace(doc, boxHeight + 6, y);

  members.forEach((member, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);

    if (row > 0 && col === 0) {
      y = ensureSpace(doc, boxHeight + 4, y);
    }

    const bx = margin + col * (boxWidth + boxGap);
    const by = y + row * (boxHeight + 4);

    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.2);
    doc.setFillColor(250, 250, 252);
    doc.roundedRect(bx, by, boxWidth, boxHeight, 1.5, 1.5, 'FD');

    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text('ANALIZ EKIBI UYESI', bx + 3, by + 4.5);

    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.1);
    doc.line(bx + 2, by + 6, bx + boxWidth - 2, by + 6);

    const lx = bx + 3;
    const vx = bx + 24;
    let ly = by + 10;

    const fields = [
      { label: 'Ad Soyad:', value: member.full_name },
      { label: 'Gorev:', value: member.job_title || '-' },
    ];
    for (const f of fields) {
      doc.setFont(FONT_NAME, 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...TEXT_MUTED);
      doc.text(f.label, lx, ly);
      doc.setFont(FONT_NAME, 'normal');
      doc.setTextColor(...TEXT_DARK);
      doc.text(f.value, vx, ly);
      ly += 4;
    }

    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text('Imza:', lx, ly);
    doc.setDrawColor(190, 200, 215);
    doc.setLineWidth(0.15);
    doc.line(vx, ly, bx + boxWidth - 4, ly);
    ly += 4;

    doc.text('Tarih:', lx, ly);
    doc.line(vx, ly, bx + boxWidth - 4, ly);
  });

  const totalRows = Math.ceil(members.length / cols);
  return y + totalRows * (boxHeight + 4) + 2;
}

function addFooter(doc: jsPDF, docCode: string, revNo: string, revDate: string) {
  const n = doc.getNumberOfPages();
  const revLine = `${docCode || '-'} | Rev: ${revNo || '-'} | Revizyon Tarihi: ${revDate || '-'}`;
  for (let i = 1; i <= n; i++) {
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
    doc.text(`Sayfa ${i} / ${n}`, pw - 10, ph - 10, { align: 'right' });
  }
}

export interface DfNcData {
  nc_number: string;
  detection_date: string;
  source: string;
  description: string;
  severity: string;
  status: string;
}

export interface DfCaData {
  id: string;
  ca_number?: string;
  action_description?: string;
  responsible_user?: string;
  responsible_user_name?: string;
  planned_completion_date?: string;
  df_customer_affected?: boolean;
  df_customer_notified?: boolean;
  df_report_recall?: boolean;
  action_fulfilled?: boolean;
  fulfillment_date?: string;
  status?: string;
  monitoring_period?: string;
  closure_date?: string;
  effectiveness_evaluation_date?: string;
  no_recurrence_observed?: boolean;
  no_recurrence_date?: string;
  recurrence_observed?: boolean;
  recurrence_date?: string;
}

export interface DfAnalysisTeamMember {
  full_name: string;
  job_title: string | null;
}

export interface GenerateDfPdfOptions {
  nc: DfNcData;
  ca: DfCaData;
  analysisTeam?: DfAnalysisTeamMember[];
  logoUrl?: string;
  organizationName?: string;
}

export const generateDfPDF = async (options: GenerateDfPdfOptions): Promise<void> => {
  const { nc, ca, analysisTeam = [], logoUrl } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await registerFonts(doc);

  const docCode = 'FR.14';
  const docName = 'Duzeltici Faaliyet Formu';
  const revNo = '01';
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
  const statusLabel = CA_STATUS_LABELS[ca.status || ''] || ca.status || '-';

  // 1. UYGUNSUZLUK BILGILERI & FAALIYET BILGILERI (side by side)
  {
    const leftRows = [
      ['NC No', nc.nc_number || '-'],
      ['Tespit Tarihi', formatDate(nc.detection_date)],
      ['Tespit Noktasi', SOURCE_LABELS[nc.source] || nc.source || '-'],
      ['Siddet', SEVERITY_LABELS[nc.severity] || nc.severity || '-'],
    ];
    const rightRows = [
      ['DF No', ca.ca_number || '-'],
      ['Durum', statusLabel],
      ['Sorumlu Yetkili', ca.responsible_user_name || ca.responsible_user || '-'],
      ['Planlanan Termin', formatDate(ca.planned_completion_date)],
    ];

    const leftH = estimateTableHeight(leftRows.length);
    const rightH = estimateTableHeight(rightRows.length);
    y = ensureSpace(doc, 7 + Math.max(leftH, rightH) + 4, y);

    const lx = margin;
    const rx = margin + colWidth + gap;
    const ly = drawSectionHeader(doc, 'UYGUNSUZLUK BILGILERI', y, lx, colWidth);
    const ry = drawSectionHeader(doc, 'FAALIYET BILGILERI', y, rx, colWidth);

    autoTable(doc, { ...columnTableStyles(colWidth, lx), startY: ly, body: leftRows });
    const lfy = (doc as any).lastAutoTable.finalY;
    autoTable(doc, { ...columnTableStyles(colWidth, rx), startY: ry, body: rightRows });
    const rfy = (doc as any).lastAutoTable.finalY;

    y = Math.max(lfy, rfy) + 6;
  }

  // 2. ICERIK — uygunsuzluk tanimi
  {
    const sh = 9 + estimateTextBlockHeight(doc, 'Uygunsuzluk Tanimi', nc.description || '-', contentWidth);
    y = ensureSectionFits(doc, sh, y);
  }
  y = drawSectionHeader(doc, 'ICERIK', y, margin, contentWidth);
  y = drawTextBlock(doc, 'Uygunsuzluk Tanimi', nc.description || '-', y, margin, contentWidth);

  // 3. KARAR VERILEN FAALIYET
  {
    const sh = 9 + estimateTextBlockHeight(doc, 'Karar Verilen Faaliyet', ca.action_description || '-', contentWidth);
    y = ensureSectionFits(doc, sh, y);
  }
  y = drawSectionHeader(doc, 'KARAR VERILEN FAALIYET', y, margin, contentWidth, TEAL_COLOR);
  y = drawTextBlock(doc, 'Karar Verilen Faaliyet', ca.action_description || '-', y, margin, contentWidth);

  // 4. MUSTERI ETKISI
  {
    const rows = [
      ['Etkilenen Musteri Var Mi', yesNo(ca.df_customer_affected)],
      ['Musteri Bilgilendirildi Mi', yesNo(ca.df_customer_notified)],
      ['Rapor Geri Cagrisi Gerekiyor Mu', yesNo(ca.df_report_recall)],
    ];
    const sh = 9 + estimateTableHeight(rows.length) + 2;
    y = ensureSectionFits(doc, sh, y);
    y = drawSectionHeader(doc, 'MUSTERI ETKISI', y, margin, contentWidth, AMBER_COLOR);
    autoTable(doc, { ...fwStyles, startY: y, body: rows });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // 5. FAALIYET TAKIBI
  {
    const rows: string[][] = [
      ['Faaliyet Yerine Getirildi Mi', yesNo(ca.action_fulfilled)],
      ['Tamamlanma Tarihi', formatDate(ca.fulfillment_date)],
      ['Etkinlik Izleme Bitis Tarihi', formatDate(ca.monitoring_period)],
    ];
    const sh = 9 + estimateTableHeight(rows.length) + 2;
    y = ensureSectionFits(doc, sh, y);
    y = drawSectionHeader(doc, 'FAALIYET TAKIBI', y, margin, contentWidth, GREEN_COLOR);
    autoTable(doc, { ...fwStyles, startY: y, body: rows });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // 6. YENIDEN OLUSMA TAKIBI
  {
    const rows: string[][] = [
      ['Uygunsuzluk Gorulemedi Mi', yesNo(ca.no_recurrence_observed)],
      ['Gorulememe Tarihi', formatDate(ca.no_recurrence_date)],
      ['Uygunsuzluk Tekrar Etti Mi', yesNo(ca.recurrence_observed)],
      ['Tekrar Tarihi', formatDate(ca.recurrence_date)],
    ];
    const sh = 9 + estimateTableHeight(rows.length) + 2;
    y = ensureSectionFits(doc, sh, y);
    const color = ca.recurrence_observed ? RED_COLOR : PRIMARY_COLOR;
    y = drawSectionHeader(doc, 'YENIDEN OLUSMA TAKIBI', y, margin, contentWidth, color);
    autoTable(doc, { ...fwStyles, startY: y, body: rows });
    y = (doc as any).lastAutoTable.finalY + 6;

    if (ca.recurrence_observed) {
      const notice = 'Duzeltici faaliyet sonrasinda uygunsuzluk tekrar etmistir. Takip NC kaydina bakiniz.';
      const lines = doc.splitTextToSize(notice, contentWidth - 8);
      const nh = lines.length * 3 + 6;
      y = ensureSpace(doc, nh + 4, y);
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(252, 165, 165);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin + 1, y - 1, contentWidth - 2, nh, 1.5, 1.5, 'FD');
      doc.setFont(FONT_NAME, 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...RED_COLOR);
      doc.text(lines, margin + 4, y + 3);
      y += nh + 4;
    }

    if (ca.no_recurrence_observed && !ca.recurrence_observed) {
      const notice = 'Duzeltici faaliyet etkin bulunmustur. Uygunsuzluk izleme sureci tamamlanmistir.';
      const lines = doc.splitTextToSize(notice, contentWidth - 8);
      const nh = lines.length * 3 + 6;
      y = ensureSpace(doc, nh + 4, y);
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(134, 239, 172);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin + 1, y - 1, contentWidth - 2, nh, 1.5, 1.5, 'FD');
      doc.setFont(FONT_NAME, 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...GREEN_COLOR);
      doc.text(lines, margin + 4, y + 3);
      y += nh + 4;
    }
  }

  // 7. ANALIZ EKIBI ONAY / IMZALAR
  if (analysisTeam.length > 0) {
    const perRow = Math.min(analysisTeam.length, 3);
    const rows = Math.ceil(analysisTeam.length / perRow);
    const sh = 9 + rows * 34 + 2;
    y = ensureSectionFits(doc, sh, y);
    y = drawSectionHeader(doc, 'ANALIZ EKIBI ONAY / IMZALAR', y, margin, contentWidth);
    y = drawAnalysisTeamBoxes(doc, analysisTeam, y, margin, contentWidth);
  }

  addFooter(doc, docCode, revNo, revDate);

  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.3);
    doc.line(0, HEADER_HEIGHT, pageWidth, HEADER_HEIGHT);
    if (logoImgData) {
      doc.addImage(logoImgData, 'PNG', LOGO_X, LOGO_Y, LOGO_WIDTH, LOGO_HEIGHT);
    }
  }

  const ncPart = sanitize(nc.nc_number || '');
  const caPart = sanitize(ca.ca_number || '');
  doc.save(`DF_${ncPart}_${caPart || 'taslak'}.pdf`);
};
