import { useEffect, useState } from 'react';
import { Plus, X, Save, AlertTriangle, AlertCircle, CheckCircle2, Clock, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import NonconformityDetailDrawer from './NonconformityDetailDrawer';

const SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'minor', label: 'Düşük' },
  { value: 'major', label: 'Orta' },
  { value: 'critical', label: 'Kritik' },
];

const RECURRENCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'low', label: 'Düşük' },
  { value: 'medium', label: 'Orta' },
  { value: 'high', label: 'Yüksek' },
];

const CALIBRATION_IMPACT_OPTIONS: { value: string; label: string }[] = [
  { value: 'none', label: 'Etkisi Yok' },
  { value: 'potential', label: 'Etkileme İhtimali' },
  { value: 'confirmed', label: 'Etkiledi' },
];

const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'internal_audit', label: 'İç Tetkik' },
  { value: 'external_audit', label: 'Dış Tetkik' },
  { value: 'customer_feedback', label: 'Müşteri Geri Bildirimi' },
  { value: 'risk_analysis', label: 'Risk Analizi' },
  { value: 'data_control', label: 'Veri Kontrolü' },
  { value: 'lak', label: 'Laboratuvarlar Arası Karşılaştırma (LAK)' },
  { value: 'pak', label: 'Personeller Arası Karşılaştırma (PAK)' },
  { value: 'personnel_observation', label: 'Personel Gözlemi' },
  { value: 'other', label: 'Diğer' },
];

const severityConfig: Record<string, { label: string; className: string }> = {
  minor: { label: 'Düşük', className: 'bg-green-100 text-green-800 border-green-200' },
  major: { label: 'Orta', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  critical: { label: 'Kritik', className: 'bg-red-100 text-red-800 border-red-200' },
};

const ncStatusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  open: { label: 'Açık', className: 'bg-red-100 text-red-800 border-red-200', icon: <AlertCircle className="w-2.5 h-2.5" /> },
  analysis: { label: 'Analiz', className: 'bg-orange-100 text-orange-800 border-orange-200', icon: <Clock className="w-2.5 h-2.5" /> },
  action_required: { label: 'Aksiyon Gerekli', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <AlertTriangle className="w-2.5 h-2.5" /> },
  monitoring: { label: 'İzlemede', className: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Clock className="w-2.5 h-2.5" /> },
  closed: { label: 'Kapalı', className: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle2 className="w-2.5 h-2.5" /> },
  Açık: { label: 'Açık', className: 'bg-red-100 text-red-800 border-red-200', icon: <AlertCircle className="w-2.5 h-2.5" /> },
  İşlemde: { label: 'İşlemde', className: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Clock className="w-2.5 h-2.5" /> },
  Kapalı: { label: 'Kapalı', className: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle2 className="w-2.5 h-2.5" /> },
};

interface NcFormData {
  detection_date: string;
  source: string[];
  description: string;
  severity: string;
  recurrence_risk: string;
  calibration_impact: string;
  analysis_team: string[];
}

export default function NonconformitiesView() {
  const { role } = useAuth();
  const isManager = role === 'admin' || role === 'super_admin' || role === 'quality_manager';

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<NcFormData>({
    detection_date: '',
    source: [],
    description: '',
    severity: 'major',
    recurrence_risk: 'medium',
    calibration_impact: 'none',
    analysis_team: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNcId, setSelectedNcId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string; job_title: string | null; role: string | null }[]>([]);

  useEffect(() => {
    fetchData();
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data: rows, error: err } = await supabase
        .from('profiles')
        .select('id, full_name, job_title, role')
        .order('full_name', { ascending: true });
      if (err) throw err;
      setProfiles(rows || []);
    } catch (err) {
      console.error('Profiles fetch error:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from('nonconformities')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setData(rows || []);
    } catch (err) {
      console.error('NC fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { analysis_team, source, ...rest } = formData;
      const ncData = { ...rest, source: source.join(',') };
      const { data: newNc, error: ncErr } = await supabase
        .from('nonconformities')
        .insert([ncData])
        .select('id')
        .single();
      if (ncErr) throw ncErr;

      if (analysis_team.length > 0) {
        const teamRows = analysis_team.map(userId => ({
          nonconformity_id: newNc.id,
          user_id: userId,
          role: 'member',
        }));
        const { error: teamErr } = await supabase.from('nonconformity_analysis_team').insert(teamRows);
        if (teamErr) throw teamErr;
      }

      setModalOpen(false);
      setFormData({ detection_date: '', source: [], description: '', severity: 'major', recurrence_risk: 'medium', calibration_impact: 'none', analysis_team: [] });
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Kayıt sırasında bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    try {
      const { error: err } = await supabase.from('nonconformities').delete().eq('id', id);
      if (err) throw err;
      fetchData();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Kayıt silinirken bir hata oluştu!');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-6 pt-16 md:pt-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-light text-gray-900">Uygunsuzluklar</h1>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-slate-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-slate-700 transition-all shadow-sm hover:shadow-md font-medium text-xs md:text-sm"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Yeni Uygunsuzluk</span>
            <span className="sm:hidden">Yeni</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Kayıt bulunamadı</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-32">NC No</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-28">Tespit Tarihi</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Açıklama</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-24">Şiddet</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-28">Durum</th>
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
                      <tr key={item.id} onClick={() => setSelectedNcId(item.id)} className="hover:bg-slate-50 transition-colors cursor-pointer">
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
                              onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
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
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white md:rounded-2xl shadow-2xl w-full h-full md:h-auto md:max-w-xl md:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-slate-700 to-slate-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm md:text-base font-bold">Yeni Uygunsuzluk</h3>
              </div>
              <button
                onClick={() => { setModalOpen(false); setError(null); }}
                className="hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Tespit Tarihi
                </label>
                <input
                  type="date"
                  value={formData.detection_date}
                  onChange={e => setFormData({ ...formData, detection_date: e.target.value })}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  Tespit Noktası
                  {formData.source.length > 0 && (
                    <span className="ml-1 bg-slate-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      {formData.source.length}
                    </span>
                  )}
                </label>
                <div className="border border-slate-300 rounded-lg overflow-hidden max-h-44 overflow-y-auto divide-y divide-slate-100">
                  {SOURCE_OPTIONS.map(opt => {
                    const selected = formData.source.includes(opt.value);
                    const toggle = () => setFormData(prev => ({
                      ...prev,
                      source: prev.source.includes(opt.value)
                        ? prev.source.filter(v => v !== opt.value)
                        : [...prev.source, opt.value],
                    }));
                    return (
                      <div
                        key={opt.value}
                        onClick={toggle}
                        className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors select-none ${selected ? 'bg-slate-50 border-l-2 border-l-slate-500' : 'hover:bg-gray-50 border-l-2 border-l-transparent'}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={toggle}
                          onClick={e => e.stopPropagation()}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-slate-700 focus:ring-slate-500 flex-shrink-0"
                        />
                        <span className={`text-[11px] font-medium truncate ${selected ? 'text-slate-900' : 'text-slate-700'}`}>
                          {opt.label}
                        </span>
                        {selected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 ml-auto" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Uygunsuzluk Tanımı
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
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
                  value={formData.severity}
                  onChange={e => setFormData({ ...formData, severity: e.target.value })}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                >
                  {SEVERITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Tekrarlama Riski
                </label>
                <select
                  value={formData.recurrence_risk}
                  onChange={e => setFormData({ ...formData, recurrence_risk: e.target.value })}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                >
                  {RECURRENCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Kalibrasyon Etkisi
                </label>
                <select
                  value={formData.calibration_impact}
                  onChange={e => setFormData({ ...formData, calibration_impact: e.target.value })}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                >
                  {CALIBRATION_IMPACT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  <Users className="w-3.5 h-3.5" />
                  Analiz Ekibi
                  {formData.analysis_team.length > 0 && (
                    <span className="ml-1 bg-slate-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      {formData.analysis_team.length}
                    </span>
                  )}
                </label>
                <div className="border border-slate-300 rounded-lg overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {profiles.length === 0 ? (
                    <p className="text-[11px] text-slate-400 px-3 py-3 text-center">Personel bulunamadı</p>
                  ) : (
                    profiles.map(p => {
                      const selected = formData.analysis_team.includes(p.id);
                      const toggle = () => setFormData(prev => ({
                        ...prev,
                        analysis_team: prev.analysis_team.includes(p.id)
                          ? prev.analysis_team.filter(id => id !== p.id)
                          : [...prev.analysis_team, p.id],
                      }));
                      return (
                        <div
                          key={p.id}
                          onClick={toggle}
                          className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors select-none ${selected ? 'bg-slate-50 border-l-2 border-l-slate-500' : 'hover:bg-gray-50 border-l-2 border-l-transparent'}`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={toggle}
                            onClick={e => e.stopPropagation()}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-slate-700 focus:ring-slate-500 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className={`text-[11px] font-medium block truncate ${selected ? 'text-slate-900' : 'text-slate-700'}`}>{p.full_name}</span>
                            {(p.job_title || p.role) && (
                              <span className="text-[10px] text-slate-400 block truncate">
                                {p.job_title || p.role}
                              </span>
                            )}
                          </div>
                          {selected && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 text-white px-4 py-3 md:py-2 rounded-lg hover:bg-slate-800 transition-all font-semibold text-xs disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setError(null); }}
                  className="flex-1 bg-slate-100 text-slate-700 px-4 py-3 md:py-2 rounded-lg hover:bg-slate-200 transition-colors font-semibold text-xs"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedNcId && (
        <NonconformityDetailDrawer
          ncId={selectedNcId}
          onClose={() => setSelectedNcId(null)}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}
