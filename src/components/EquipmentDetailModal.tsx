import { X, Wrench, Calendar, AlertCircle, CheckCircle, FileText, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useModuleDocument } from '../hooks/useModuleDocument';
import { generateFR35PDF } from '../utils/pdfExport';
import DocumentSelectModal from './DocumentSelectModal';

interface EquipmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: any;
}

export default function EquipmentDetailModal({
  isOpen,
  onClose,
  equipment,
}: EquipmentDetailModalProps) {
  const { role } = useAuth();
  const { showSelector, closeSelector, onDocumentSelected, requestPdf } = useModuleDocument('equipment_hardware');

  const handlePdfDownload = () => {
    requestPdf(async (meta) => {
      await generateFR35PDF(equipment, meta);
    });
  };

  if (!isOpen || !equipment) return null;

  const formatAuditDate = (d: string | null | undefined) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      active: {
        label: 'Aktif',
        className: 'bg-green-100 text-green-700 border-green-300',
      },
      maintenance: {
        label: 'Bakımda',
        className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      },
      in_calibration: {
        label: 'Kalibrasyonda',
        className: 'bg-blue-100 text-blue-700 border-blue-300',
      },
      calibration_due: {
        label: 'Kalibrasyon Bekliyor',
        className: 'bg-orange-100 text-orange-700 border-orange-300',
      },
      out_of_service: {
        label: 'Kullanım Dışı',
        className: 'bg-red-100 text-red-700 border-red-300',
      },
      Passive: {
        label: 'Pasif',
        className: 'bg-slate-100 text-slate-700 border-slate-300',
      },
      Scrapped: {
        label: 'Hurdaya Ayrıldı',
        className: 'bg-red-100 text-red-700 border-red-300',
      },
    };

    const config = statusConfig[status] || {
      label: status,
      className: 'bg-gray-100 text-gray-700 border-gray-300',
    };

    return (
      <span className={`px-3 py-1 text-sm font-semibold rounded-full border-2 ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const isCalibrationOverdue = (date: string) => {
    if (!date) return false;
    const calibrationDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return calibrationDate < today;
  };

  const getDaysUntilCalibration = (date: string) => {
    if (!date) return null;
    const calibrationDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = calibrationDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const daysUntil = equipment.next_calibration_date
    ? getDaysUntilCalibration(equipment.next_calibration_date)
    : null;
  const isOverdue = equipment.next_calibration_date
    ? isCalibrationOverdue(equipment.next_calibration_date)
    : false;

  return (
    <>
    <DocumentSelectModal
      isOpen={showSelector}
      moduleKey="equipment_hardware"
      onSelect={onDocumentSelected}
      onClose={closeSelector}
    />
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white md:rounded-2xl shadow-2xl w-full h-full md:h-auto md:max-w-3xl md:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between md:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Wrench className="w-6 h-6" />
            <div>
              <h3 className="text-lg font-bold">Cihaz Kimlik Kartı</h3>
              <p className="text-blue-100 text-sm">Detaylı Bilgiler</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePdfDownload}
              className="hover:bg-white/20 p-2 rounded-lg transition-colors"
              title="PDF İndir"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  {equipment.device_name || 'İsimsiz Cihaz'}
                </h2>
                <p className="text-slate-600 text-sm">
                  {equipment.brand && equipment.model
                    ? `${equipment.brand} - ${equipment.model}`
                    : equipment.brand || equipment.model || 'Marka/Model bilgisi yok'}
                </p>
              </div>
              {getStatusBadge(equipment.status || 'active')}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t-2 border-slate-300">
              <div>
                <p className="text-xs text-slate-500 mb-1">Cihaz Kodu</p>
                <p className="font-semibold text-slate-900">
                  {equipment.device_code || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Seri Numarası</p>
                <p className="font-semibold text-slate-900">
                  {equipment.serial_no || '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
            <h4 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b-2 border-blue-500 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Kalibrasyon Durumu
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Son Kalibrasyon Tarihi
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {formatDate(equipment.calibration_date)}
                </p>
                {equipment.calibration_period && (
                  <p className="text-xs text-slate-600 mt-1">
                    Periyot: {equipment.calibration_period}
                  </p>
                )}
              </div>

              <div className={`rounded-lg p-4 ${
                isOverdue
                  ? 'bg-red-50 border-2 border-red-300'
                  : daysUntil !== null && daysUntil <= 7
                  ? 'bg-orange-50 border-2 border-orange-300'
                  : 'bg-green-50'
              }`}>
                <p className="text-xs mb-2 flex items-center gap-1 font-semibold">
                  <AlertCircle className={`w-4 h-4 ${
                    isOverdue ? 'text-red-600' : 'text-slate-500'
                  }`} />
                  <span className={isOverdue ? 'text-red-700' : 'text-slate-500'}>
                    Sonraki Kalibrasyon Tarihi
                  </span>
                </p>
                <p className={`text-lg font-bold ${
                  isOverdue ? 'text-red-700' : 'text-slate-900'
                }`}>
                  {formatDate(equipment.next_calibration_date)}
                </p>
                {isOverdue && (
                  <div className="mt-2 flex items-center gap-1">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-600 text-white">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      SÜRESİ GEÇMİŞ
                    </span>
                  </div>
                )}
                {!isOverdue && daysUntil !== null && daysUntil >= 0 && (
                  <p className={`text-xs mt-1 font-semibold ${
                    daysUntil <= 7 ? 'text-orange-700' : 'text-green-700'
                  }`}>
                    {daysUntil === 0
                      ? 'Bugün'
                      : daysUntil === 1
                      ? 'Yarın'
                      : `${daysUntil} gün sonra`}
                  </p>
                )}
              </div>

              {equipment.certificate_no && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Sertifika No
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {equipment.certificate_no}
                  </p>
                </div>
              )}

              {equipment.calibration_performed_by && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 mb-2">Kalibrasyonu Yapan</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {equipment.calibration_performed_by}
                  </p>
                </div>
              )}
            </div>
          </div>

          {equipment.description && (
            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
              <h4 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b-2 border-slate-300">
                Notlar / Açıklama
              </h4>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {equipment.description}
              </p>
            </div>
          )}

          {(role === 'admin' || role === 'super_admin') && (
            <div className="border border-slate-200 rounded-xl px-5 py-4 bg-slate-50">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Kayıt Bilgileri</p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <dt className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Oluşturan</dt>
                  <dd className="text-xs font-medium text-slate-700">{equipment.created_by || '-'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Oluşturma Tarihi</dt>
                  <dd className="text-xs font-medium text-slate-700">{formatAuditDate(equipment.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Son Güncelleyen</dt>
                  <dd className="text-xs font-medium text-slate-700">{equipment.updated_by || '-'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Güncelleme Tarihi</dt>
                  <dd className="text-xs font-medium text-slate-700">{formatAuditDate(equipment.updated_at)}</dd>
                </div>
              </dl>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handlePdfDownload}
              className="flex-1 bg-white text-slate-700 px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              PDF İndir
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
