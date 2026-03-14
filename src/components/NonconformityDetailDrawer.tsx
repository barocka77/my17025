import { useEffect, useState } from 'react';
import {
  X, Plus, Save, AlertTriangle, ClipboardCheck, ShieldCheck,
  AlertCircle, CheckCircle2, Clock, Trash2, Users, Activity, Wrench,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import SignaturesSection from './SignaturesSection';
import CorrectiveActionFormModal from './CorrectiveActionFormModal';

const SOURCE_LABELS: Record<string, string> = {
  internal_audit: 'İç Tetkik',
  external_audit: 'Dış Tetkik',
  customer_feedback: 'Müşteri Geri Bildirimi',
  risk_analysis: 'Risk Analizi',
  personnel_observation: 'Personel Gözlemi',
  data_control: 'Veri Kontrolü',
  other: 'Diğer',
};

const SEVERITY_LABELS: Record<string, { label: string; className: string }> = {
  minor: { label: 'Düşük', className: 'bg-green-100 text-green-800 border-green-200' },
  major: { label: 'Orta', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  critical: { label: 'Kritik', className: 'bg-red-100 text-red-800 border-red-200' },
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

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  open: { label: 'Açık', className: 'bg-red-100 text-red-800 border-red-200', icon: <AlertCircle className="w-3 h-3" /> },
  analysis: { label: 'Analiz', className: 'bg-orange-100 text-orange-800 border-orange-200', icon: <Clock className="w-3 h-3" /> },
  action_required: { label: 'Aksiyon Gerekli', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <AlertTriangle className="w-3 h-3" /> },
  monitoring: { label: 'İzlemede', className: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Clock className="w-3 h-3" /> },
  closed: { label: 'Kapalı', className: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle2 className="w-3 h-3" /> },
};

const CA_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  Planlandı: { label: 'Planlandı', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  İşlemde: { label: 'İşlemde', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  Tamamlandı: { label: 'Tamamlandı', className: 'bg-green-100 text-green-800 border-green-200' },
};

const RCA_CATEGORY_OPTIONS = [
  { value: 'human', label: 'İnsan (Human)' },
  { value: 'method', label: 'Yöntem (Method)' },
  { value: 'equipment', label: 'Ekipman (Equipment)' },
  { value: 'environment', label: 'Ortam (Environment)' },
  { value: 'material', label: 'Materyal (Material)' },
  { value: 'management', label: 'Yönetim (Management)' },
];

const RCA_CATEGORY_LABELS: Record<string, string> = {
  human: 'İnsan',
  method: 'Yöntem',
  equipment: 'Ekipman',
  environment: 'Ortam',
  material: 'Materyal',
  management: 'Yönetim',
};

type Tab = 'rca' | 'ca' | 'signatures';

interface Props {
  ncId: string;
  onClose: () => void;
  onRefresh: () => void;
}

export default function NonconformityDetailDrawer({ ncId, onClose, onRefresh }: Props) {
  const { role } = useAuth();
  const isManager = role === 'admin' || role === 'super_admin' || role === 'quality_manager';

  const [nc, setNc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('rca');

  const [rcaList, setRcaList] = useState<any[]>([]);
  const [rcaLoading, setRcaLoading] = useState(true);
  const [rcaModalOpen, setRcaModalOpen] = useState(false);
  const [rcaCategory, setRcaCategory] = useState('human');
  const [rcaDescription, setRcaDescription] = useState('');
  const [rcaSaving, setRcaSaving] = useState(false);
  const [rcaError, setRcaError] = useState<string | null>(null);

  const [caList, setCaList] = useState<any[]>([]);
  const [caLoading, setCaLoading] = useState(true);
  const [caModalOpen, setCaModalOpen] = useState(false);
  const [caDescription, setCaDescription] = useState('');
  const [caResponsible, setCaResponsible] = useState('');
  const [caDate, setCaDate] = useState('');
  const [caSaving, setCaSaving] = useState(false);
  const [caError, setCaError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string; job_title: string | null }[]>([]);
  const [impactSaving, setImpactSaving] = useState<string | null>(null);
  const [dfFormOpen, setDfFormOpen] = useState(false);

  const [correctionAction, setCorrectionAction] = useState('');
  const [correctionResponsible, setCorrectionResponsible] = useState('');
  const [correctionDeadline, setCorrectionDeadline] = useState('');
  const [correctionSaving, setCorrectionSaving] = useState(false);
  const [correctionEditMode, setCorrectionEditMode] = useState(false);

  useEffect(() => {
    fetchNc();
    fetchRca();
    fetchCa();
    fetchProfiles();
  }, [ncId]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase.rpc('get_personnel_list');
      if (error) throw error;
      setProfiles((data || []).map((p: any) => ({ id: p.id, full_name: p.full_name, job_title: p.job_title })));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNc = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nonconformities')
        .select('*')
        .eq('id', ncId)
        .maybeSingle();
      if (error) throw error;
      setNc(data);
      if (data) {
        setCorrectionAction(data.correction_action || '');
        setCorrectionResponsible(data.correction_responsible || '');
        setCorrectionDeadline(data.correction_deadline || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImpactToggle = async (field: string, value: boolean) => {
    setImpactSaving(field);
    try {
      const { error } = await supabase
        .from('nonconformities')
        .update({ [field]: value })
        .eq('id', ncId);
      if (error) throw error;
      setNc((prev: any) => ({ ...prev, [field]: value }));
      onRefresh();
      if (field === 'impact_requires_extended_analysis' && value === true) {
        if (caList.length === 0) {
          setDfFormOpen(true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setImpactSaving(null);
    }
  };

  const handleCorrectionSave = async () => {
    setCorrectionSaving(true);
    try {
      const payload: any = {
        correction_action: correctionAction || null,
        correction_responsible: correctionResponsible || null,
        correction_deadline: correctionDeadline || null,
      };
      const { error } = await supabase
        .from('nonconformities')
        .update(payload)
        .eq('id', ncId);
      if (error) throw error;
      setNc((prev: any) => ({ ...prev, ...payload }));
      setCorrectionEditMode(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setCorrectionSaving(false);
    }
  };

  const fetchRca = async () => {
    setRcaLoading(true);
    try {
      const { data, error } = await supabase
        .from('nonconformity_root_causes')
        .select('*')
        .eq('nonconformity_id', ncId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setRcaList(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setRcaLoading(false);
    }
  };

  const fetchCa = async () => {
    setCaLoading(true);
    try {
      const { data, error } = await supabase
        .from('corrective_actions')
        .select('*')
        .eq('nonconformity_id', ncId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setCaList(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCaLoading(false);
    }
  };

  const handleRcaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRcaSaving(true);
    setRcaError(null);
    try {
      const { error } = await supabase.from('nonconformity_root_causes').insert([{
        nonconformity_id: ncId,
        rca_category: rcaCategory,
        rca_description: rcaDescription,
      }]);
      if (error) throw error;
      setRcaModalOpen(false);
      setRcaCategory('human');
      setRcaDescription('');
      fetchRca();
    } catch (err: any) {
      setRcaError(err.message || 'Kayıt sırasında bir hata oluştu');
    } finally {
      setRcaSaving(false);
    }
  };

  const handleRcaDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    try {
      const { error } = await supabase.from('nonconformity_root_causes').delete().eq('id', id);
      if (error) throw error;
      fetchRca();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaSaving(true);
    setCaError(null);
    try {
      const payload: any = {
        nonconformity_id: ncId,
        action_description: caDescription,
        responsible_user: caResponsible,
      };
      if (caDate) payload.planned_completion_date = caDate;
      const { error } = await supabase.from('corrective_actions').insert([payload]);
      if (error) throw error;
      setCaModalOpen(false);
      setCaDescription('');
      setCaResponsible('');
      setCaDate('');
      fetchCa();
      onRefresh();
    } catch (err: any) {
      setCaError(err.message || 'Kayıt sırasında bir hata oluştu');
    } finally {
      setCaSaving(false);
    }
  };

  const handleCaDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    try {
      const { error } = await supabase.from('corrective_actions').delete().eq('id', id);
      if (error) throw error;
      fetchCa();
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const sev = nc ? (SEVERITY_LABELS[nc.severity] || { label: nc.severity, className: 'bg-gray-100 text-gray-700 border-gray-200' }) : null;
  const st = nc ? (STATUS_CONFIG[nc.status] || { label: nc.status, className: 'bg-gray-100 text-gray-700 border-gray-200', icon: null }) : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-300" />
            <div>
              <div className="text-xs text-slate-300 font-medium">Uygunsuzluk Analizi</div>
              <div className="text-base font-bold leading-tight">{loading ? '...' : (nc?.nc_number || '-')}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info cards */}
        {!loading && nc && (
          <div className="flex-shrink-0 bg-slate-50 border-b border-slate-200 px-5 py-4 max-h-[55vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Tespit Tarihi" value={nc.detection_date ? new Date(nc.detection_date).toLocaleDateString('tr-TR') : '-'} />
              <InfoRow label="Tespit Noktası" value={SOURCE_LABELS[nc.source] || nc.source || '-'} />
              <div className="col-span-2">
                <InfoRow label="Açıklama" value={nc.description || '-'} />
              </div>
              {nc.identified_by && (
                <div className="col-span-2">
                  <InfoRow
                    label="Uygunsuzluğu Tanımlayan"
                    value={profiles.find(p => p.id === nc.identified_by)?.full_name || '-'}
                  />
                </div>
              )}
              <div className="flex items-center gap-4 flex-wrap col-span-2">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-0.5">Şiddet</span>
                  {sev && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${sev.className}`}>
                      {sev.label}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-0.5">Tekrarlama Riski</span>
                  <span className="text-[11px] font-medium text-slate-700">{RECURRENCE_LABELS[nc.recurrence_risk] || nc.recurrence_risk || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-0.5">Kalibrasyon Etkisi</span>
                  <span className="text-[11px] font-medium text-slate-700">{CALIBRATION_LABELS[nc.calibration_impact] || nc.calibration_impact || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-0.5">Durum</span>
                  {st && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${st.className}`}>
                      {st.icon}{st.label}
                    </span>
                  )}
                </div>
              </div>

              {Array.isArray(nc.analysis_team) && nc.analysis_team.length > 0 && (
                <div className="col-span-2">
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    <Users className="w-3 h-3" />
                    Analiz Ekibi
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(nc.analysis_team as string[]).map(memberId => {
                      const member = profiles.find(p => p.id === memberId);
                      if (!member) return null;
                      return (
                        <span
                          key={memberId}
                          className="inline-flex flex-col items-start px-2 py-1 rounded-md bg-slate-100 border border-slate-200"
                        >
                          <span className="text-[11px] font-semibold text-slate-800 leading-tight">{member.full_name}</span>
                          {member.job_title && (
                            <span className="text-[9px] text-slate-500 leading-tight">{member.job_title}</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Impact Analysis Section */}
              <div className="col-span-2 mt-1">
                <div className="flex items-center gap-1.5 mb-3">
                  <Activity className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Uygunsuzluğun Etkisi</span>
                </div>
                <div className="space-y-2.5">
                  <ImpactRow
                    field="impact_inappropriate_calibration"
                    label="Uygunsuzluğun içeriği UYGUN OLMAYAN KALİBRASYON İŞİ – mahiyetinde mi?"
                    value={nc.impact_inappropriate_calibration ?? false}
                    saving={impactSaving === 'impact_inappropriate_calibration'}
                    onToggle={handleImpactToggle}
                  />
                  <ImpactRow
                    field="impact_requires_stoppage"
                    label="Uygunsuzluk herhangi bir kalibrasyonun durdurulmasını, tekrarlanmasını veya raporların bekletilmesini gerektiriyor mu?"
                    value={nc.impact_requires_stoppage ?? false}
                    saving={impactSaving === 'impact_requires_stoppage'}
                    onToggle={handleImpactToggle}
                    note={nc.impact_requires_stoppage ? 'Evet ise; Kalibrasyon Durdurma Formu doldurulması gerekiyor.' : undefined}
                  />
                  <ImpactRow
                    field="impact_recurrence_possible"
                    label="Uygunsuzluğun ileride aynı yerde veya başka yerlerde tekrarlanma ihtimali var mı?"
                    value={nc.impact_recurrence_possible ?? false}
                    saving={impactSaving === 'impact_recurrence_possible'}
                    onToggle={handleImpactToggle}
                  />
                  <ImpactRow
                    field="impact_requires_extended_analysis"
                    label="Uygunsuzluğun etkisi, Düzeltici Faaliyet açılmasını gerektiriyor mu?"
                    value={nc.impact_requires_extended_analysis ?? false}
                    saving={impactSaving === 'impact_requires_extended_analysis'}
                    onToggle={handleImpactToggle}
                    note={nc.impact_requires_extended_analysis ? (caList.length > 0 ? 'Evet — Bu uygunsuzluk için zaten bir DF kaydı mevcut.' : 'Evet — Düzeltici Faaliyet Formu açmak için tıklayın.') : undefined}
                    onNoteClick={nc.impact_requires_extended_analysis ? () => { if (caList.length === 0) setDfFormOpen(true); } : undefined}
                  />
                </div>
              </div>

              {/* Düzeltme Faaliyeti Section */}
              <div className="col-span-2 mt-2">
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Düzeltme Faaliyeti</span>
                      <span className="text-[9px] text-slate-400 font-normal">(Uygunsuzluğa karşı ilk tepki)</span>
                    </div>
                    {!correctionEditMode ? (
                      <button
                        type="button"
                        onClick={() => setCorrectionEditMode(true)}
                        className="text-[10px] font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 hover:border-slate-400 px-2.5 py-1 rounded-md transition-all"
                      >
                        {nc.correction_action ? 'Düzenle' : 'Ekle'}
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCorrectionSave}
                          disabled={correctionSaving}
                          className="flex items-center gap-1 text-[10px] font-semibold text-white bg-slate-700 hover:bg-slate-800 px-2.5 py-1 rounded-md transition-all disabled:opacity-60"
                        >
                          <Save className="w-3 h-3" />
                          {correctionSaving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCorrectionEditMode(false);
                            setCorrectionAction(nc.correction_action || '');
                            setCorrectionResponsible(nc.correction_responsible || '');
                            setCorrectionDeadline(nc.correction_deadline || '');
                          }}
                          className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-300 hover:border-slate-400 px-2.5 py-1 rounded-md transition-all"
                        >
                          İptal
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    {correctionEditMode ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Düzeltme Açıklaması</label>
                          <textarea
                            value={correctionAction}
                            onChange={e => setCorrectionAction(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                            placeholder="Uygunsuzluğa karşı alınan ilk düzeltme tedbirini açıklayın..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Sorumlu</label>
                            <select
                              value={correctionResponsible}
                              onChange={e => setCorrectionResponsible(e.target.value)}
                              className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                            >
                              <option value="">-- Seçiniz --</option>
                              {profiles.map(p => (
                                <option key={p.id} value={p.id}>{p.full_name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Termin Tarihi</label>
                            <input
                              type="date"
                              value={correctionDeadline}
                              onChange={e => setCorrectionDeadline(e.target.value)}
                              className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    ) : nc.correction_action ? (
                      <div className="space-y-3">
                        <p className="text-[12px] text-slate-700 leading-relaxed">{nc.correction_action}</p>
                        <div className="flex items-center gap-4 flex-wrap pt-1 border-t border-slate-100">
                          {nc.correction_responsible && (
                            <div>
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-0.5">Sorumlu</span>
                              <span className="text-[11px] font-semibold text-slate-700">{nc.correction_responsible}</span>
                            </div>
                          )}
                          {nc.correction_deadline && (
                            <div>
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-0.5">Termin</span>
                              <span className={`text-[11px] font-semibold ${new Date(nc.correction_deadline) < new Date() ? 'text-red-600' : 'text-slate-700'}`}>
                                {new Date(nc.correction_deadline).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic py-1">Henüz düzeltme faaliyeti belirlenmemiş.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex-shrink-0 flex border-b border-gray-200 bg-white">
          <TabButton active={activeTab === 'rca'} onClick={() => setActiveTab('rca')} icon={<AlertTriangle className="w-3.5 h-3.5" />} label="Kök Neden Analizi" count={rcaList.length} />
          <TabButton active={activeTab === 'ca'} onClick={() => setActiveTab('ca')} icon={<ClipboardCheck className="w-3.5 h-3.5" />} label="Düzeltici Faaliyetler" count={caList.length} />
          <TabButton active={activeTab === 'signatures'} onClick={() => setActiveTab('signatures')} icon={<ShieldCheck className="w-3.5 h-3.5" />} label="İmza ve Onay" />
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {/* RCA Tab */}
          {activeTab === 'rca' && (
            <div className="p-4 space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={() => setRcaModalOpen(true)}
                  className="flex items-center gap-1.5 bg-slate-700 text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Kök Neden Ekle
                </button>
              </div>

              {rcaLoading ? (
                <div className="flex items-center justify-center h-24">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600"></div>
                </div>
              ) : rcaList.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                  Henüz kök neden analizi eklenmemiş
                </div>
              ) : (
                <div className="space-y-2">
                  {rcaList.map(item => (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-3 hover:border-slate-300 transition-colors">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap mt-0.5">
                        {RCA_CATEGORY_LABELS[item.rca_category] || item.rca_category}
                      </span>
                      <p className="text-[12px] text-gray-700 flex-1 leading-relaxed">{item.rca_description}</p>
                      {isManager && (
                        <button
                          onClick={() => handleRcaDelete(item.id)}
                          className="text-red-400 hover:text-red-600 p-1 rounded transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CA Tab */}
          {activeTab === 'ca' && (
            <div className="p-4 space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={() => setCaModalOpen(true)}
                  className="flex items-center gap-1.5 bg-slate-700 text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Düzeltici Faaliyet Aç
                </button>
              </div>

              {caLoading ? (
                <div className="flex items-center justify-center h-24">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600"></div>
                </div>
              ) : caList.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  <ClipboardCheck className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                  Henüz düzeltici faaliyet eklenmemiş
                </div>
              ) : (
                <div className="space-y-2">
                  {caList.map(item => {
                    const caSt = CA_STATUS_CONFIG[item.status] || { label: item.status, className: 'bg-gray-100 text-gray-700 border-gray-200' };
                    const isOverdue = item.planned_completion_date && item.status !== 'Tamamlandı'
                      && new Date(item.planned_completion_date) < new Date();
                    return (
                      <div key={item.id} className={`bg-white border rounded-lg p-3 hover:border-slate-300 transition-colors ${isOverdue ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-700">{item.ca_number || '-'}</span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${caSt.className}`}>
                              {caSt.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {isManager && (
                              <button
                                onClick={() => handleCaDelete(item.id)}
                                className="text-red-400 hover:text-red-600 p-1 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[12px] text-gray-700 mt-1.5 leading-relaxed">{item.action_description || '-'}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-[10px] text-gray-500">
                            <span className="font-semibold">Sorumlu:</span> {item.responsible_user || '-'}
                          </span>
                          {item.planned_completion_date && (
                            <span className={`text-[10px] font-medium ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                              <span className="font-semibold">Planlanan:</span> {new Date(item.planned_completion_date).toLocaleDateString('tr-TR')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Signatures Tab */}
          {activeTab === 'signatures' && (
            <div className="p-4">
              <SignaturesSection
                moduleKey="nonconformities"
                recordId={ncId}
              />
            </div>
          )}
        </div>
      </div>

      {/* RCA Modal */}
      {rcaModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-bold text-sm">Kök Neden Ekle</span>
              </div>
              <button onClick={() => { setRcaModalOpen(false); setRcaError(null); }} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRcaSubmit} className="p-4 space-y-4">
              {rcaError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">{rcaError}</div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">Kategori</label>
                <select
                  value={rcaCategory}
                  onChange={e => setRcaCategory(e.target.value)}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                >
                  {RCA_CATEGORY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">Açıklama</label>
                <textarea
                  value={rcaDescription}
                  onChange={e => setRcaDescription(e.target.value)}
                  rows={4}
                  required
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                  placeholder="Kök neden açıklamasını girin..."
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={rcaSaving}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 text-white px-4 py-2.5 rounded-lg hover:bg-slate-800 transition-all font-semibold text-xs disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" />
                  {rcaSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => { setRcaModalOpen(false); setRcaError(null); }}
                  className="flex-1 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-lg hover:bg-slate-200 transition-colors font-semibold text-xs"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Düzeltici Faaliyet Formu Modal */}
      {dfFormOpen && nc && (
        <CorrectiveActionFormModal
          nc={nc}
          onClose={() => setDfFormOpen(false)}
          onSaved={() => {
            setDfFormOpen(false);
            fetchCa();
            onRefresh();
            setActiveTab('ca');
          }}
        />
      )}

      {/* CA Modal */}
      {caModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                <span className="font-bold text-sm">Düzeltici Faaliyet Aç</span>
              </div>
              <button onClick={() => { setCaModalOpen(false); setCaError(null); }} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCaSubmit} className="p-4 space-y-4">
              {caError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">{caError}</div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">Faaliyet Açıklaması</label>
                <textarea
                  value={caDescription}
                  onChange={e => setCaDescription(e.target.value)}
                  rows={3}
                  required
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                  placeholder="Düzeltici faaliyet açıklamasını girin..."
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">Sorumlu Personel</label>
                <select
                  value={caResponsible}
                  onChange={e => setCaResponsible(e.target.value)}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                >
                  <option value="">-- Seçiniz --</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.full_name}>{p.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">Planlanan Tamamlanma Tarihi</label>
                <input
                  type="date"
                  value={caDate}
                  onChange={e => setCaDate(e.target.value)}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={caSaving}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 text-white px-4 py-2.5 rounded-lg hover:bg-slate-800 transition-all font-semibold text-xs disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" />
                  {caSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => { setCaModalOpen(false); setCaError(null); }}
                  className="flex-1 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-lg hover:bg-slate-200 transition-colors font-semibold text-xs"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-0.5">{label}</span>
      <span className="text-[12px] text-slate-800 font-medium">{value}</span>
    </div>
  );
}

function ImpactRow({ field, label, value, note, saving, onToggle, onNoteClick }: {
  field: string;
  label: string;
  value: boolean;
  note?: string;
  saving: boolean;
  onToggle: (field: string, value: boolean) => void;
  onNoteClick?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex-1">
        <p className="text-[11px] text-slate-700 leading-snug">{label}</p>
        {note && value && (
          onNoteClick ? (
            <button
              type="button"
              onClick={onNoteClick}
              className="text-[10px] text-blue-700 font-semibold mt-1 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded inline-block hover:bg-blue-100 transition-colors cursor-pointer"
            >
              {note}
            </button>
          ) : (
            <p className="text-[10px] text-amber-700 font-semibold mt-1 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded inline-block">{note}</p>
          )
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {saving ? (
          <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
        ) : null}
        <button
          type="button"
          disabled={saving}
          onClick={() => onToggle(field, false)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all disabled:opacity-50 ${
            !value
              ? 'bg-slate-700 text-white border-slate-700'
              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400 hover:text-slate-600'
          }`}
        >
          Hayır
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => onToggle(field, true)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all disabled:opacity-50 ${
            value
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-slate-400 border-slate-200 hover:border-red-300 hover:text-red-500'
          }`}
        >
          Evet
        </button>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors flex-1 justify-center ${
        active
          ? 'border-slate-700 text-slate-800 bg-slate-50'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {count !== undefined && (
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-500'}`}>
          {count}
        </span>
      )}
    </button>
  );
}
