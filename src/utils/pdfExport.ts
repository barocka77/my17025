import jsPDF from 'jspdf';
import type { DocumentMeta } from './documentLinkService';
import { formatRevDate } from './documentLinkService';

interface EquipmentData {
  device_code?: string;
  device_name?: string;
  brand?: string;
  model?: string;
  serial_no?: string;
  status?: string;
  calibration_date?: string;
  next_calibration_date?: string;
  certificate_no?: string;
  calibration_performed_by?: string;
  calibration_period?: string;
  description?: string;
}

const getStatusLabel = (status: string): string => {
  const statusLabels: Record<string, string> = {
    active: 'Aktif',
    maintenance: 'Bakımda',
    in_calibration: 'Kalibrasyonda',
    calibration_due: 'Kalibrasyon Bekliyor',
    out_of_service: 'Kullanım Dışı',
  };
  return statusLabels[status] || status;
};

const FONT_NAME = 'Roboto';

async function registerFonts(doc: jsPDF) {
  const { ROBOTO_REGULAR, ROBOTO_BOLD } = await import('./robotoFontData');
  doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR);
  doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD);
  doc.addFont('Roboto-Regular.ttf', FONT_NAME, 'normal');
  doc.addFont('Roboto-Bold.ttf', FONT_NAME, 'bold');
  doc.setFont(FONT_NAME, 'normal');
}

export const generateFR35PDF = async (equipment: EquipmentData, docMeta?: DocumentMeta) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  await registerFonts(doc);

  const revNo = docMeta?.rev_no || '';
  const revDate = docMeta?.revizyon_tarihi ? formatRevDate(docMeta.revizyon_tarihi) : '';

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  let yPosition = 20;

  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(18);
  doc.text(docMeta?.dokuman_adi || 'CİHAZ BİLGİ FORMU', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);

  yPosition += 10;

  const addField = (label: string, value: string = '-', bold: boolean = false) => {
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(10);
    doc.setFont(FONT_NAME, 'bold');
    doc.text(label, margin, yPosition);

    doc.setFont(FONT_NAME, bold ? 'bold' : 'normal');
    doc.setFontSize(11);
    const valueText = value || '-';
    doc.text(valueText, margin + 60, yPosition);

    yPosition += 8;
  };

  const addSection = (title: string) => {
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }

    yPosition += 5;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition - 5, contentWidth, 8, 'F');

    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(12);
    doc.text(title, margin + 2, yPosition);

    yPosition += 10;
  };

  addSection('GENEL BİLGİLER');
  addField('Cihaz Kodu:', equipment.device_code || '-', true);
  addField('Cihaz Adı:', equipment.device_name || '-', true);
  addField('Marka:', equipment.brand || '-');
  addField('Model:', equipment.model || '-');
  addField('Seri No:', equipment.serial_no || '-');
  addField('Durum:', getStatusLabel(equipment.status || ''));

  addSection('KALİBRASYON BİLGİLERİ');
  addField('Son Kalibrasyon Tarihi:', equipment.calibration_date || '-');
  addField('Sonraki Kalibrasyon Tarihi:', equipment.next_calibration_date || '-');
  addField('Kalibrasyon Periyodu:', equipment.calibration_period || '-');
  addField('Sertifika No:', equipment.certificate_no || '-');
  addField('Kalibrasyonu Yapan:', equipment.calibration_performed_by || '-');

  if (equipment.description) {
    addSection('AÇIKLAMA');
    addField('Açıklama:', equipment.description || '-');
  }

  yPosition += 20;
  doc.setLineWidth(0.3);
  doc.line(margin, yPosition, margin + 70, yPosition);
  doc.setFont(FONT_NAME, 'normal');
  doc.setFontSize(9);
  doc.text('Tarih ve İmza', margin, yPosition + 5);

  const docCode = docMeta?.dokuman_kodu || '';
  const revLine = `${docCode || '-'} | Rev: ${revNo || '-'} | Revizyon Tarihi: ${revDate || '-'}`;
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    const pw = doc.internal.pageSize.getWidth();
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(revLine, 10, ph - 10);
    doc.text(`Sayfa ${i} / ${pageCount}`, pw - 10, ph - 10, { align: 'right' });
  }

  const fileName = `FR35_${equipment.device_code || 'Cihaz'}_${new Date().getTime()}.pdf`;
  doc.save(fileName);
};
