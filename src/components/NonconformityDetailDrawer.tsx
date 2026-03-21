import { useEffect, useState } from 'react';
import {
  X, Plus, Save, AlertTriangle, ClipboardCheck, ShieldCheck,
  AlertCircle, CheckCircle2, Clock, Trash2, Users, Activity, Wrench, FileDown, GitBranch,
  Link2, ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import SignaturesSection from './SignaturesSection';
import CorrectiveActionFormModal from './CorrectiveActionFormModal';
import { generateNcPDF } from '../utils/ncPdfExport';
import type { NcSignatureGroup } from '../utils/ncPdfExport';
import { generateDfPDF } from '../utils/dfPdfExport';

const SOURCE_LABELS: Record<string, string> = {
  internal_audit: 'İç Tetkik',
  external_audit: 'Dış Tetkik',
  customer_feedback: 'Müşteri Geri Bildirimi',
  risk_analysis: 'Risk Analizi',
  personnel_observation: 'Personel Gözlemi',
  data_control: 'Veri Kontrolü',
  lak: 'Laboratuvarlar Arası Karşılaştırma (LAK)',
  pak: 'Personeller Arası Karşılaştırma (PAK)',
  ineffective_df: 'Etkisiz DF',
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
  Kapalı: { label: 'Kapalı', className: 'bg-slate-200 text-slate-700 border-slate-300' },
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

type Tab = 'general' | 'impact' | 'analysis' | 'actions' | 'signatures';

interface Props {
  ncId: string;
  onClose: () => void;
  onRefresh: () => void;
  onNavigateToFeedback?: (fbId: string) => void;
}

export default function NonconformityDetailDrawer({ ncId, onClose, onRefresh, onNavigateToFeedback }: Props) {
  const { role } = useAuth();
  const isManager = role === 'admin' || role === 'super_admin' || role === 'quality_manager';

  const [nc, setNc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('general');

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
  const [selectedCA, setSelectedCA] = useState<any>(null);

  const [correctionAction, setCorrectionAction] = useState('');
  const [correctionResponsible, setCorrectionResponsible] = useState('');
  const [correctionDeadline, setCorrectionDeadline] = useState('');
  const [correctionSaving, setCorrectionSaving] = useState(false);
  const [correctionEditMode, setCorrectionEditMode] = useState(false);
  const [followUpNcNumber, setFollowUpNcNumber] = useState<string | null>(null);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [dfPdfExporting, setDfPdfExporting] = useState<string | null>(null);

  const [spreadAnalysis, setSpreadAnalysis] = useState('');
  const [ncReference, setNcReference] = useState('');
  const [spreadEditMode, setSpreadEditMode] = useState(false);
  const [spreadSaving, setSpreadSaving] = useState(false);
  const [refEditMode, setRefEditMode] = useState(false);
  const [refSaving, setRefSaving] = useState(false);
  const [descriptionText, setDescriptionText] = useState('');
  const [descEditMode, setDescEditMode] = useState(false);
  const [descSaving, setDescSaving] = useState(false);

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
        setSpreadAnalysis(data.spread_analysis || '');
        setNcReference(data.nc_reference || '');
        setDescriptionText(data.description || '');
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

  const handleSpreadSave = async () => {
    setSpreadSaving(true);
    try {
      const payload = { spread_analysis: spreadAnalysis || null };
      const { error } = await supabase.from('nonconformities').update(payload).eq('id', ncId);
      if (error) throw error;
      setNc((prev: any) => ({ ...prev, ...payload }));
      setSpreadEditMode(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSpreadSaving(false);
    }
  };

  const handleRefSave = async () => {
    setRefSaving(true);
    try {
      const payload = { nc_reference: ncReference || null };
      const { error } = await supabase.from('nonconformities').update(payload).eq('id', ncId);
      if (error) throw error;
      setNc((prev: any) => ({ ...prev, ...payload }));
      setRefEditMode(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setRefSaving(false);
    }
  };

  const handleDescriptionSave = async () => {
    setDescSaving(true);
    try {
      const payload = { description: descriptionText || null };
      const { error } = await supabase.from('nonconformities').update(payload).eq('id', ncId);
      if (error) throw error;
      setNc((prev: any) => ({ ...prev, ...payload }));
      setDescEditMode(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setDescSaving(false);
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

      const hasRecurrence = (data || []).some((ca: any) => ca.recurrence_observed);
      if (hasRecurrence) {
        const { data: followUp } = await supabase
          .from('nonconformities')
          .select('nc_number')
          .eq('parent_nc_id', ncId)
          .maybeSingle();
        setFollowUpNcNumber(followUp?.nc_number || null);
      } else {
        setFollowUpNcNumber(null);
      }
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

  const handleExportPdf = async () => {
    if (!nc) return;
    setPdfExporting(true);
    try {
      const { data: sigData } = await supabase
        .from('record_signatures')
        .select('signer_role, signer_name, signed_at, signature_image_url, signature_id, signature_type')
        .eq('record_id', ncId);

      const { data: rolesData } = await supabase
        .from('module_signature_roles')
        .select('module_key, role_name, role_order')
        .eq('module_key', 'nonconformities');

      const { data: orgData } = await supabase
        .from('organizations')
        .select('name, logo_url')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const { data: docMetaData } = await supabase
        .from('document_master_list')
        .select('*')
        .ilike('dokuman_kodu', '%NC%')
        .limit(1)
        .maybeSingle();

      const sigs = (sigData || []) as any[];
      const roles = (rolesData || []) as { module_key: string; role_name: string; role_order: number }[];

      const signatureGroups: NcSignatureGroup[] = roles.length > 0 ? [{
        moduleKey: 'nonconformities',
        label: 'Onay Imzalari',
        signatures: sigs,
        roles: roles,
      }] : [];

      const corrResponsibleName = nc.correction_responsible
        ? (profiles.find(p => p.id === nc.correction_responsible)?.full_name || nc.correction_responsible)
        : undefined;

      const identifiedByName = nc.identified_by
        ? (profiles.find(p => p.id === nc.identified_by)?.full_name)
        : undefined;

      const analysisTeamNames: string[] = Array.isArray(nc.analysis_team)
        ? nc.analysis_team.map((id: string) => profiles.find(p => p.id === id)?.full_name || id)
        : [];

      await generateNcPDF({
        nc: {
          ...nc,
          identified_by_name: identifiedByName,
          analysis_team_names: analysisTeamNames,
          correction_responsible_name: corrResponsibleName,
        },
        rootCauses: rcaList.map(r => ({ rca_category: r.rca_category, rca_description: r.rca_description })),
        correctiveActions: caList.map(a => ({
          ca_number: a.ca_number,
          action_description: a.action_description,
          responsible_user: a.responsible_user,
          planned_completion_date: a.planned_completion_date,
          status: a.status,
          completed_date: a.completed_date,
        })),
        signatureGroups,
        organizationName: orgData?.name,
        logoUrl: orgData?.logo_url,
        docMeta: docMetaData || undefined,
        isLocked: false,
      });
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setPdfExporting(false);
    }
  };

  const handleDfPdfExport = async (ca: any) => {
    if (!nc) return;
    setDfPdfExporting(ca.id);
    try {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name, logo_url')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const { data: teamData } = await supabase
        .from('nonconformity_analysis_team')
        .select('user_id')
        .eq('nonconformity_id', ncId);

      const memberIds = (teamData || []).map((r: any) => r.user_id);
      const analysisTeam = profiles
        .filter((p: any) => memberIds.includes(p.id))
        .map((p: any) => ({ full_name: p.full_name, job_title: p.job_title || null }));

      const responsibleName = ca.responsible_user
        ? (profiles.find((p: any) => p.id === ca.responsible_user)?.full_name || ca.responsible_user)
        : undefined;

      await generateDfPDF({
        nc: {
          nc_number: nc.nc_number,
          detection_date: nc.detection_date,
          source: nc.source,
          description: nc.description,
          severity: nc.severity,
          status: nc.status,
        },
        ca: { ...ca, responsible_user_name: responsibleName },
        analysisTeam,
        logoUrl: orgData?.logo_url,
        organizationName: orgData?.name,
      });
    } catch (err) {
      console.error('DF PDF export error:', err);
    } finally {
      setDfPdfExporting(null);
    }
  };

  const sev = nc ? (SEVERITY_LABELS[nc.severity] || { label: nc.severity, className: 'bg-gray-100 text-gray-700 border-gray-200' }) : null;
  const st = nc ? (STATUS_CONFIG[nc.status] || { label: nc.status, className: 'bg-gray-100 text-gray-700 border-gray-200', icon: null }) : null;

  const identifiedByName = nc?.identified_by
    ? (profiles.find(p => p.id === nc.identified_by)?.full_name || '-')
    : '-';

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'general', label: 'Genel Bilgi', icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
    { key: 'impact', label: 'Uygunsuzluk Etki', icon: <Activity className="w-3.5 h-3.5" /> },
    { key: 'analysis', label: 'Analiz', icon: <AlertTriangle className="w-3.5 h-3.5" />, count: rcaList.length },
    { key: 'actions', label: 'Düzeltici Faaliyetler', icon: <Wrench className="w-3.5 h-3.5" />, count: caList.length },
    { key: 'signatures', label: 'İmzalar', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* FIXED HEADER */}
        <div className="flex-shrink-0 px-5 py-4 flex items-center justify-between" style={{ backgroundColor: '#1e293b' }}>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Uygunsuzluk Detayı</p>
            <p className="text-xl font-bold text-white leading-tight">
              {loading ? '...' : (nc?.nc_number || '-')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {st && nc && (
              <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${st.className}`}>
                {st.icon}{st.label}
              </span>
            )}
            <button
              onClick={handleExportPdf}
              disabled={pdfExporting || loading}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-semibold disabled:opacity-50"
              title="PDF olarak indir"
            >
              {pdfExporting ? (
                <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FIXED SUMMARY BAR */}
        {!loading && nc && (
          <div className="flex-shrink-0 bg-slate-50 border-b border-slate-200 px-5 py-3">
            <div className="grid grid-cols-4 gap-3">
              <SummaryCell
                label="Tespit Tarihi"
                value={nc.detection_date ? new Date(nc.detection_date).toLocaleDateString('tr-TR') : '-'}
              />
              <SummaryCell
                label="Kaynak"
                value={SOURCE_LABELS[nc.source] || nc.source || '-'}
              />
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Şiddet</p>
                {sev ? (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${sev.className}`}>
                    {sev.label}
                  </span>
                ) : <span className="text-[11px] text-slate-500">-</span>}
              </div>
              <SummaryCell label="Sorumlu" value={identifiedByName} />
            </div>
          </div>
        )}

        {/* TAB NAVIGATION */}
        <div className="flex-shrink-0 flex border-b border-gray-200 bg-white overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-3 text-[11px] font-semibold border-b-2 transition-all whitespace-nowrap flex-1 justify-center min-w-0 ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline truncate">{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                  activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <div className="flex-1 overflow-y-auto bg-white">

          {/* TAB 1: Genel Bilgi */}
          {activeTab === 'general' && (
            <div className="p-5 space-y-5">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600" />
                </div>
              ) : nc ? (
                <>
                  {/* Uygunsuzluk Tanımı */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Uygunsuzluk Tanımı</span>
                      {!descEditMode ? (
                        <button
                          type="button"
                          onClick={() => setDescEditMode(true)}
                          className="text-[10px] font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 hover:border-slate-400 px-2.5 py-1 rounded-md transition-all"
                        >
                          Düzenle
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleDescriptionSave}
                            disabled={descSaving}
                            className="flex items-center gap-1 text-[10px] font-semibold text-white bg-slate-700 hover:bg-slate-800 px-2.5 py-1 rounded-md transition-all disabled:opacity-60"
                          >
                            <Save className="w-3 h-3" />
                            {descSaving ? 'Kaydediliyor...' : 'Kaydet'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDescEditMode(false); setDescriptionText(nc.description || ''); }}
                            className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-300 hover:border-slate-400 px-2.5 py-1 rounded-md transition-all"
                          >
                            İptal
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      {descEditMode ? (
                        <textarea
                          value={descriptionText}
                          onChange={e => setDescriptionText(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                          placeholder="Uygunsuzluk tanımını girin..."
                        />
                      ) : (
                        <p className="text-[12px] text-slate-800 font-medium leading-relaxed">{nc.description || '-'}</p>
                      )}
                    </div>
                  </div>

                  {/* Linked GB Badge */}
                  {nc.linked_gb_id && nc.linked_gb_number && (
                    <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div>
                          <p className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">Bağlı Geri Bildirim</p>
                          <button
                            type="button"
                            onClick={() => onNavigateToFeedback && onNavigateToFeedback(nc.linked_gb_id)}
                            className="inline-flex items-center gap-1 text-[12px] font-bold text-blue-700 hover:text-blue-900 hover:underline transition-colors mt-0.5"
                          >
                            {nc.linked_gb_number}
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2-col grid: Tekrar Riski | Kalibrasyon Etkisi */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tekrar Riski</p>
                      <p className="text-[13px] font-semibold text-slate-700">
                        {RECURRENCE_LABELS[nc.recurrence_risk] || nc.recurrence_risk || '-'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Kalibrasyon Etkisi</p>
                      <p className="text-[13px] font-semibold text-slate-700">
                        {CALIBRATION_LABELS[nc.calibration_impact] || nc.calibration_impact || '-'}
                      </p>
                    </div>
                  </div>

                  {/* 2-col grid: Analiz Ekibi | Oluşturma Tarihi */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Users className="w-3 h-3 text-slate-400" />
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Analiz Ekibi</p>
                      </div>
                      {Array.isArray(nc.analysis_team) && nc.analysis_team.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(nc.analysis_team as string[]).map(memberId => {
                            const member = profiles.find(p => p.id === memberId);
                            if (!member) return null;
                            return (
                              <span key={memberId} className="inline-block px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold text-slate-700">
                                {member.full_name}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">Belirtilmemiş</p>
                      )}
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Oluşturma Tarihi</p>
                      <p className="text-[13px] font-semibold text-slate-700">
                        {nc.created_at ? new Date(nc.created_at).toLocaleDateString('tr-TR') : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Düzeltme Faaliyeti */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Düzeltme Faaliyeti</span>
                        <span className="text-[9px] text-slate-400">(İlk tepki)</span>
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
                        <p className="text-[11px] text-slate-400 italic">Henüz düzeltme faaliyeti belirlenmemiş.</p>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* TAB 2: Uygunsuzluk Etki */}
          {activeTab === 'impact' && (
            <div className="p-5">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600" />
                </div>
              ) : nc ? (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <Activity className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Uygunsuzluğun Etkisi</span>
                  </div>
                  <div className="divide-y divide-slate-100">
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
                      note={nc.impact_requires_extended_analysis && caList.length > 0 ? 'Evet — Bu uygunsuzluk için zaten bir DF kaydı mevcut.' : undefined}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 3: Analiz */}
          {activeTab === 'analysis' && (
            <div className="p-5 space-y-5">
              {/* Kök Neden Listesi */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-slate-500" />
                    <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Kök Neden Analizi</h3>
                    <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                      {rcaList.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setRcaModalOpen(true)}
                    className="flex items-center gap-1.5 bg-slate-700 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-[11px] font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ekle
                  </button>
                </div>

                {rcaLoading ? (
                  <div className="flex items-center justify-center h-20">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-600" />
                  </div>
                ) : rcaList.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                    <p className="text-[11px] text-slate-400">Henüz kök neden analizi eklenmemiş</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rcaList.map(item => (
                      <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-start gap-3 hover:border-slate-300 transition-colors">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap mt-0.5">
                          {RCA_CATEGORY_LABELS[item.rca_category] || item.rca_category}
                        </span>
                        <p className="text-[12px] text-slate-700 flex-1 leading-relaxed">{item.rca_description}</p>
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

              {/* Yayılım Analizi */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Yayılım Analizi</span>
                  </div>
                  {!spreadEditMode ? (
                    <button
                      type="button"
                      onClick={() => setSpreadEditMode(true)}
                      className="text-[10px] font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 hover:border-slate-400 px-2.5 py-1 rounded-md transition-all"
                    >
                      {nc?.spread_analysis ? 'Düzenle' : 'Ekle'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleSpreadSave}
                        disabled={spreadSaving}
                        className="flex items-center gap-1 text-[10px] font-semibold text-white bg-slate-700 hover:bg-slate-800 px-2.5 py-1 rounded-md transition-all disabled:opacity-60"
                      >
                        <Save className="w-3 h-3" />
                        {spreadSaving ? 'Kaydediliyor...' : 'Kaydet'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSpreadEditMode(false); setSpreadAnalysis(nc?.spread_analysis || ''); }}
                        className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-300 hover:border-slate-400 px-2.5 py-1 rounded-md transition-all"
                      >
                        İptal
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  {spreadEditMode ? (
                    <textarea
                      value={spreadAnalysis}
                      onChange={e => setSpreadAnalysis(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                      placeholder="Uygunsuzluğun ne kadar alana yayıldığını ve kapsamını açıklayın..."
                    />
                  ) : nc?.spread_analysis ? (
                    <p className="text-[12px] text-slate-700 leading-relaxed">{nc.spread_analysis}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">Henüz yayılım analizi girilmemiş.</p>
                  )}
                </div>
              </div>

              {/* Referans */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Referans</span>
                  </div>
                  {!refEditMode ? (
                    <button
                      type="button"
                      onClick={() => setRefEditMode(true)}
                      className="text-[10px] font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 hover:border-slate-400 px-2.5 py-1 rounded-md transition-all"
                    >
                      {nc?.nc_reference ? 'Düzenle' : 'Ekle'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleRefSave}
                        disabled={refSaving}
                        className="flex items-center gap-1 text-[10px] font-semibold text-white bg-slate-700 hover:bg-slate-800 px-2.5 py-1 rounded-md transition-all disabled:opacity-60"
                      >
                        <Save className="w-3 h-3" />
                        {refSaving ? 'Kaydediliyor...' : 'Kaydet'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRefEditMode(false); setNcReference(nc?.nc_reference || ''); }}
                        className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-300 hover:border-slate-400 px-2.5 py-1 rounded-md transition-all"
                      >
                        İptal
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  {refEditMode ? (
                    <textarea
                      value={ncReference}
                      onChange={e => setNcReference(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                      placeholder="İlgili doküman, standart maddesi veya referans numarası..."
                    />
                  ) : nc?.nc_reference ? (
                    <p className="text-[12px] text-slate-700 leading-relaxed">{nc.nc_reference}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">Henüz referans girilmemiş.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Düzeltici Faaliyetler */}
          {activeTab === 'actions' && (
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-slate-500" />
                <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Düzeltici Faaliyetler</h3>
                <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                  {caList.length}
                </span>
              </div>

              {caLoading ? (
                <div className="flex items-center justify-center h-24">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600" />
                </div>
              ) : caList.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                  <ClipboardCheck className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                  <p className="text-[11px] text-slate-400">Henüz düzeltici faaliyet eklenmemiş</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {caList.map(item => {
                    const caSt = CA_STATUS_CONFIG[item.status] || { label: item.status, className: 'bg-gray-100 text-gray-700 border-gray-200' };
                    const isOverdue = item.planned_completion_date && item.status !== 'Tamamlandı' && item.status !== 'Kapalı'
                      && new Date(item.planned_completion_date) < new Date();
                    return (
                      <div
                        key={item.id}
                        className={`bg-white border rounded-lg p-3 transition-colors cursor-pointer hover:border-blue-300 hover:bg-blue-50/20 ${isOverdue ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}
                        onClick={() => { setSelectedCA(item); setDfFormOpen(true); }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-700">{item.ca_number || '-'}</span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${caSt.className}`}>
                              {caSt.label}
                            </span>
                            {item.recurrence_observed && followUpNcNumber && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-red-50 text-red-700 border-red-200">
                                Takip: {followUpNcNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={e => { e.stopPropagation(); handleDfPdfExport(item); }}
                              disabled={dfPdfExporting === item.id}
                              title="PDF İndir"
                              className="flex items-center gap-1 text-slate-400 hover:text-blue-600 p-1 rounded transition-colors disabled:opacity-40"
                            >
                              {dfPdfExporting === item.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <FileDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {isManager && (
                              <button
                                onClick={e => { e.stopPropagation(); handleCaDelete(item.id); }}
                                className="text-red-400 hover:text-red-600 p-1 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[12px] text-slate-700 mt-1.5 leading-relaxed">{item.action_description || '-'}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-[10px] text-slate-500">
                            <span className="font-semibold">Sorumlu:</span> {(profiles.find(p => p.id === item.responsible_user)?.full_name) || item.responsible_user || '-'}
                          </span>
                          {item.planned_completion_date && (
                            <span className={`text-[10px] font-medium ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
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

          {/* TAB 5: İmzalar */}
          {activeTab === 'signatures' && (
            <div className="p-5">
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
          existingCA={selectedCA}
          onClose={() => { setDfFormOpen(false); setSelectedCA(null); }}
          onSaved={() => {
            setDfFormOpen(false);
            setSelectedCA(null);
            fetchCa();
            onRefresh();
            setActiveTab('actions');
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

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 truncate">{label}</p>
      <p className="text-[11px] font-semibold text-slate-700 truncate" title={value}>{value}</p>
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
    <div className="flex items-start justify-between gap-4 px-4 py-4">
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-slate-700 leading-snug">{label}</p>
        {note && value && (
          onNoteClick ? (
            <button
              type="button"
              onClick={onNoteClick}
              className="text-[10px] text-blue-700 font-semibold mt-1.5 bg-blue-50 border border-blue-200 px-2 py-1 rounded inline-block hover:bg-blue-100 transition-colors cursor-pointer"
            >
              {note}
            </button>
          ) : (
            <p className="text-[10px] text-amber-700 font-semibold mt-1.5 bg-amber-50 border border-amber-200 px-2 py-1 rounded inline-block">{note}</p>
          )
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {saving && (
          <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
        )}
        <button
          type="button"
          disabled={saving}
          onClick={() => onToggle(field, false)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all disabled:opacity-50 ${
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
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all disabled:opacity-50 ${
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
