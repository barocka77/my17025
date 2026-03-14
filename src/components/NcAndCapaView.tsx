import { useEffect, useState } from 'react';
import { Plus, X, Save, AlertTriangle, ClipboardCheck, AlertCircle, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Tab = 'nonconformities' | 'corrective_actions';

const SEVERITY_OPTIONS = ['Düşük', 'Orta', 'Yüksek', 'Kritik'];
const NC_STATUS_OPTIONS = ['Açık', 'İşlemde', 'Kapalı'];
const RECURRENCE_OPTIONS = ['Düşük', 'Orta', 'Yüksek'];
const CALIBRATION_IMPACT_OPTIONS = ['Var', 'Yok', 'Belirsiz'];
const CA_STATUS_OPTIONS = ['Planlandı', 'İşlemde', 'Tamamlandı'];

const severityConfig: Record<string, { label: string; className: string }> = {
  Düşük: { label: 'Düşük', className: 'bg-green-100 text-green-800 border-green-200' },
  Orta: { label: 'Orta', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  Yüksek: { label: 'Yüksek', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  Kritik: { label: 'Kritik', className: 'bg-red-100 text-red-800 border-red-200' },
};

const ncStatusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  Açık: { label: 'Açık', className: 'bg-red-100 text-red-800 border-red-200', icon: <AlertCircle className="w-2.5 h-2.5" /> },
  İşlemde: { label: 'İşlemde', className: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Clock className="w-2.5 h-2.5" /> },
  Kapalı: { label: 'Kapalı', className: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle2 className="w-2.5 h-2.5" /> },
};

const caStatusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  Planlandı: { label: 'Planlandı', className: 'bg-gray-100 text-gray-800 border-gray-200', icon: <Clock className="w-2.5 h-2.5" /> },
  İşlemde: { label: 'İşlemde', className: 'bg-blue-100 text-blue-800 border-blue-200', icon: <ChevronRight className="w-2.5 h-2.5" /> },
  Tamamlandı: { label: 'Tamamlandı', className: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle2 className="w-2.5 h-2.5" /> },
};

const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'internal_audit', label: 'İç Tetkik' },
  { value: 'external_audit', label: 'Dış Tetkik' },
  { value: 'customer_feedback', label: 'Müşteri Geri Bildirimi' },
  { value: 'risk_analysis', label: 'Risk Analizi' },
  { value: 'personnel_observation', label: 'Personel Gözlemi' },
  { value: 'data_control', label: 'Veri Kontrolü' },
  { value: 'other', label: 'Diğer' },
];

interface NcFormData {
  detection_date: string;
  source: string;
  description: string;
  severity: string;
  recurrence_risk: string;
  calibration_impact: string;
}

interface CaFormData {
  action_description: string;
  responsible_user: string;
  planned_completion_date: string;
}

export default function NcAndCapaView() {
  const { role } = useAuth();
  const isManager = role === 'admin' || role === 'super_admin' || role === 'quality_manager';

  const [activeTab, setActiveTab] = useState<Tab>('nonconformities');

  const [ncData, setNcData] = useState<any[]>([]);
  const [ncLoading, setNcLoading] = useState(true);
  const [ncModalOpen, setNcModalOpen] = useState(false);
  const [ncFormData, setNcFormData] = useState<NcFormData>({
    detection_date: '',
    source: '',
    description: '',
    severity: 'Orta',
    recurrence_risk: 'Orta',
    calibration_impact: 'Belirsiz',
  });
  const [ncSaving, setNcSaving] = useState(false);
  const [ncError, setNcError] = useState<string | null>(null);

  const [caData, setCaData] = useState<any[]>([]);
  const [caLoading, setCaLoading] = useState(true);
  const [caModalOpen, setCaModalOpen] = useState(false);
  const [caFormData, setCaFormData] = useState<CaFormData>({
    action_description: '',
    responsible_user: '',
    planned_completion_date: '',
  });
  const [caSaving, setCaSaving] = useState(false);
  const [caError, setCaError] = useState<string | null>(null);

  useEffect(() => {
    fetchNc();
    fetchCa();
  }, []);

  const fetchNc = async () => {
    setNcLoading(true);
    try {
      const { data, error } = await supabase
        .from('nonconformities')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setNcData(data || []);
    } catch (err) {
      console.error('NC fetch error:', err);
    } finally {
      setNcLoading(false);
    }
  };

  const fetchCa = async () => {
    setCaLoading(true);
    try {
      const { data, error } = await supabase
        .from('corrective_actions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCaData(data || []);
    } catch (err) {
      console.error('CA fetch error:', err);
    } finally {
      setCaLoading(false);
    }
  };

  const handleNcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNcSaving(true);
    setNcError(null);
    try {
      const { error } = await supabase.from('nonconformities').insert([ncFormData]);
      if (error) throw error;
      setNcModalOpen(false);
      setNcFormData({ detection_date: '', source: '', description: '', severity: 'Orta', recurrence_risk: 'Orta', calibration_impact: 'Belirsiz' });
      fetchNc();
    } catch (err: any) {
      setNcError(err.message || 'Kayıt sırasında bir hata oluştu');
    } finally {
      setNcSaving(false);
    }
  };

  const handleCaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaSaving(true);
    setCaError(null);
    try {
      const payload: any = { ...caFormData };
      if (!payload.planned_completion_date) delete payload.planned_completion_date;
      const { error } = await supabase.from('corrective_actions').insert([payload]);
      if (error) throw error;
      setCaModalOpen(false);
      setCaFormData({ action_description: '', responsible_user: '', planned_completion_date: '' });
      fetchCa();
    } catch (err: any) {
      setCaError(err.message || 'Kayıt sırasında bir hata oluştu');
    } finally {
      setCaSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-6 pt-16 md:pt-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-light text-gray-900">
              Uygunsuzluklar & Düzeltici Faaliyetler
            </h1>
          </div>
          <div>
            {activeTab === 'nonconformities' && (
              <button
                onClick={() => setNcModalOpen(true)}
                className="flex items-center gap-2 bg-slate-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-slate-700 transition-all shadow-sm hover:shadow-md font-medium text-xs md:text-sm"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">Yeni Uygunsuzluk</span>
                <span className="sm:hidden">Yeni</span>
              </button>
            )}
            {activeTab === 'corrective_actions' && (
              <button
                onClick={() => setCaModalOpen(true)}
                className="flex items-center gap-2 bg-slate-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-slate-700 transition-all shadow-sm hover:shadow-md font-medium text-xs md:text-sm"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">Yeni Düzeltici Faaliyet</span>
                <span className="sm:hidden">Yeni</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('nonconformities')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === 'nonconformities'
                ? 'border-slate-700 text-slate-800'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Uygunsuzluklar
            <span className={`ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              activeTab === 'nonconformities' ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {ncData.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('corrective_actions')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === 'corrective_actions'
                ? 'border-slate-700 text-slate-800'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            Düzeltici Faaliyetler
            <span className={`ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              activeTab === 'corrective_actions' ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {caData.length}
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-8">
        {activeTab === 'nonconformities' && (
          <NonconformitiesTab
            data={ncData}
            loading={ncLoading}
            isManager={isManager}
            onRefresh={fetchNc}
          />
        )}
        {activeTab === 'corrective_actions' && (
          <CorrectiveActionsTab
            data={caData}
            loading={caLoading}
            isManager={isManager}
            onRefresh={fetchCa}
          />
        )}
      </div>

      {/* NC Modal */}
      {ncModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white md:rounded-2xl shadow-2xl w-full h-full md:h-auto md:max-w-xl md:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-slate-700 to-slate-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm md:text-base font-bold">Yeni Uygunsuzluk</h3>
              </div>
              <button
                onClick={() => { setNcModalOpen(false); setNcError(null); }}
                className="hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleNcSubmit} className="p-4 space-y-4">
              {ncError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                  {ncError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Tespit Tarihi
                </label>
                <input
                  type="date"
                  value={ncFormData.detection_date}
                  onChange={e => setNcFormData({ ...ncFormData, detection_date: e.target.value })}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Uygunsuzluk Kaynağı
                </label>
                <select
                  value={ncFormData.source}
                  onChange={e => setNcFormData({ ...ncFormData, source: e.target.value })}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                >
                  <option value="">-- Seçiniz --</option>
                  {SOURCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Açıklama
                </label>
                <textarea
                  value={ncFormData.description}
                  onChange={e => setNcFormData({ ...ncFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                  placeholder="Uygunsuzluk açıklamasını girin..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Şiddet
                </label>
                <select
                  value={ncFormData.severity}
                  onChange={e => setNcFormData({ ...ncFormData, severity: e.target.value })}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                >
                  {SEVERITY_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Tekrarlama Riski
                </label>
                <select
                  value={ncFormData.recurrence_risk}
                  onChange={e => setNcFormData({ ...ncFormData, recurrence_risk: e.target.value })}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                >
                  {RECURRENCE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Kalibrasyon Etkisi
                </label>
                <select
                  value={ncFormData.calibration_impact}
                  onChange={e => setNcFormData({ ...ncFormData, calibration_impact: e.target.value })}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                >
                  {CALIBRATION_IMPACT_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={ncSaving}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 text-white px-4 py-3 md:py-2 rounded-lg hover:bg-slate-800 transition-all font-semibold text-xs disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {ncSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => { setNcModalOpen(false); setNcError(null); }}
                  className="flex-1 bg-slate-100 text-slate-700 px-4 py-3 md:py-2 rounded-lg hover:bg-slate-200 transition-colors font-semibold text-xs"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CA Modal */}
      {caModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white md:rounded-2xl shadow-2xl w-full h-full md:h-auto md:max-w-xl md:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-slate-700 to-slate-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                <h3 className="text-sm md:text-base font-bold">Yeni Düzeltici Faaliyet</h3>
              </div>
              <button
                onClick={() => { setCaModalOpen(false); setCaError(null); }}
                className="hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCaSubmit} className="p-4 space-y-4">
              {caError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                  {caError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Faaliyet Açıklaması
                </label>
                <textarea
                  value={caFormData.action_description}
                  onChange={e => setCaFormData({ ...caFormData, action_description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                  placeholder="Düzeltici faaliyet açıklamasını girin..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Sorumlu Kişi
                </label>
                <input
                  type="text"
                  value={caFormData.responsible_user}
                  onChange={e => setCaFormData({ ...caFormData, responsible_user: e.target.value })}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  placeholder="Sorumlu kişinin adını girin"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Planlanan Tamamlanma Tarihi
                </label>
                <input
                  type="date"
                  value={caFormData.planned_completion_date}
                  onChange={e => setCaFormData({ ...caFormData, planned_completion_date: e.target.value })}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={caSaving}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 text-white px-4 py-3 md:py-2 rounded-lg hover:bg-slate-800 transition-all font-semibold text-xs disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {caSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => { setCaModalOpen(false); setCaError(null); }}
                  className="flex-1 bg-slate-100 text-slate-700 px-4 py-3 md:py-2 rounded-lg hover:bg-slate-200 transition-colors font-semibold text-xs"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface NonconformitiesTabProps {
  data: any[];
  loading: boolean;
  isManager: boolean;
  onRefresh: () => void;
}

function NonconformitiesTab({ data, loading, isManager, onRefresh }: NonconformitiesTabProps) {
  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    try {
      const { error } = await supabase.from('nonconformities').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Kayıt silinirken bir hata oluştu!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Kayıt bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-32">NC No</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-28">Tespit Tarihi</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Açıklama</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-24">Şiddet</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-24">Durum</th>
              {isManager && (
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-20">İşlemler</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(item => {
              const sev = severityConfig[item.severity] || { label: item.severity, className: 'bg-gray-100 text-gray-800 border-gray-200' };
              const st = ncStatusConfig[item.status] || { label: item.status, className: 'bg-gray-100 text-gray-800 border-gray-200', icon: null };
              return (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 py-2 text-[11px] font-medium text-slate-700 whitespace-nowrap">
                    {item.nc_number || '-'}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-gray-600 whitespace-nowrap">
                    {item.detection_date ? new Date(item.detection_date).toLocaleDateString('tr-TR') : '-'}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-gray-700 max-w-xs">
                    <div className="truncate" title={item.description}>
                      {item.description || '-'}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${sev.className}`}>
                      {sev.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${st.className}`}>
                      {st.icon}
                      {st.label}
                    </span>
                  </td>
                  {isManager && (
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="inline-flex items-center gap-0.5 text-red-600 hover:text-red-800 hover:bg-red-50 px-1.5 py-0.5 rounded text-[10px] transition-colors"
                      >
                        Sil
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-50 px-3 py-1.5 border-t border-gray-200">
        <p className="text-[10px] text-gray-600">
          Toplam <span className="font-semibold text-gray-900">{data.length}</span> kayıt
        </p>
      </div>
    </div>
  );
}

interface CorrectiveActionsTabProps {
  data: any[];
  loading: boolean;
  isManager: boolean;
  onRefresh: () => void;
}

function CorrectiveActionsTab({ data, loading, isManager, onRefresh }: CorrectiveActionsTabProps) {
  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    try {
      const { error } = await supabase.from('corrective_actions').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Kayıt silinirken bir hata oluştu!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <ClipboardCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Kayıt bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-32">CA No</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Faaliyet Açıklaması</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-36">Sorumlu</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-36">Planlanan Tarih</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-28">Durum</th>
              {isManager && (
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-20">İşlemler</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(item => {
              const st = caStatusConfig[item.status] || { label: item.status, className: 'bg-gray-100 text-gray-800 border-gray-200', icon: null };
              const isOverdue = item.planned_completion_date && item.status !== 'Tamamlandı'
                && new Date(item.planned_completion_date) < new Date();
              return (
                <tr key={item.id} className={`transition-colors ${isOverdue ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-slate-50/50'}`}>
                  <td className="px-3 py-2 text-[11px] font-medium text-slate-700 whitespace-nowrap">
                    {item.ca_number || '-'}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-gray-700 max-w-xs">
                    <div className="truncate" title={item.action_description}>
                      {item.action_description || '-'}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-gray-600 whitespace-nowrap">
                    {item.responsible_user || '-'}
                  </td>
                  <td className="px-3 py-2 text-[11px] whitespace-nowrap">
                    <span className={isOverdue ? 'text-red-700 font-semibold' : 'text-gray-600'}>
                      {item.planned_completion_date
                        ? new Date(item.planned_completion_date).toLocaleDateString('tr-TR')
                        : '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${st.className}`}>
                      {st.icon}
                      {st.label}
                    </span>
                  </td>
                  {isManager && (
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="inline-flex items-center gap-0.5 text-red-600 hover:text-red-800 hover:bg-red-50 px-1.5 py-0.5 rounded text-[10px] transition-colors"
                      >
                        Sil
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-50 px-3 py-1.5 border-t border-gray-200">
        <p className="text-[10px] text-gray-600">
          Toplam <span className="font-semibold text-gray-900">{data.length}</span> kayıt
        </p>
      </div>
    </div>
  );
}
