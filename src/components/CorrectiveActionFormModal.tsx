import { useState, useEffect } from 'react';
import {
  X, FileText, Save, CheckSquare, Square, AlertTriangle,
  ArrowRight, FileDown, CheckCircle2, PenLine, Clock,
  Plus, Trash2, ChevronDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateDfPDF } from '../utils/dfPdfExport';
import SignaturesSection from './SignaturesSection';

interface NonconformityData {
  id: string;
  nc_number: string;
  detection_date: string;
  source: string;
  description: string;
  severity: string;
  recurrence_risk: string;
  calibration_impact: string;
}

interface ExistingCA {
  id: string;
  ca_number?: string;
  action_description?: string;
  responsible_user?: string;
  planned_completion_date?: string;
  action_fulfilled?: boolean;
  fulfillment_date?: string;
  status?: string;
  nonconformity_cost?: string;
  root_cause_processes?: string;
  monitoring_period?: string;
  closure_date?: string;
  effectiveness_evaluation_date?: string;
  no_recurrence_observed?: boolean;
  no_recurrence_date?: string;
  recurrence_observed?: boolean;
  recurrence_date?: string;
}

interface ActionItem {
  id?: string;
  action_description: string;
  responsible_person: string;
  deadline: string;
  status: string;
  completed_date: string;
}

interface Props {
  nc: NonconformityData;
  existingCA?: ExistingCA | null;
  onClose: () => void;
  onSaved: () => void;
}

const SEVERITY_LABELS: Record<string, string> = {
  minor: 'Düşük',
  major: 'Orta',
  critical: 'Kritik',
};

const SEVERITY_COLORS: Record<string, string> = {
  minor: 'bg-green-100 text-green-800 border-green-200',
  major: 'bg-amber-100 text-amber-800 border-amber-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

const TABS = [
  { id: 'karar',    label: 'Faaliyet Kararı' },
  { id: 'takip',   label: 'Faaliyet Takibi' },
  { id: 'etkinlik', label: 'Etkinlik Değerlendirmesi' },
  { id: 'imzalar', label: 'İmzalar' },
];

function CheckboxRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-[11px] text-slate-700 flex-1 pr-4">{label}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
            !value
              ? 'bg-slate-700 text-white border-slate-700'
              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
          }`}
        >
          <Square className="w-3 h-3" />
          Hayır
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
            value
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-slate-400 border-slate-200 hover:border-red-300 hover:text-red-500'
          }`}
        >
          <CheckSquare className="w-3 h-3" />
          Evet
        </button>
      </div>
    </div>
  );
}

interface StepCardProps {
  step: number;
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  dateValue: string;
  onDateChange: (v: string) => void;
  dateLabel: string;
  disabled?: boolean;
}

function StepCard({ step, title, description, checked, onToggle, dateValue, onDateChange, dateLabel, disabled }: StepCardProps) {
  return (
    <div
      className={`rounded-xl border-2 transition-all duration-200 overflow-hidden ${
        disabled
          ? 'opacity-40 pointer-events-none border-slate-200 bg-white'
          : checked
          ? 'border-green-300 bg-green-50/30'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
          checked ? 'bg-green-600' : 'bg-slate-50 hover:bg-slate-100'
        }`}
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 transition-colors ${
          checked ? 'bg-white/20 text-white' : 'bg-white border border-slate-300 text-slate-500'
        }`}>
          {checked ? <CheckCircle2 className="w-4 h-4 text-white" /> : step}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[12px] font-bold leading-tight ${checked ? 'text-white' : 'text-slate-700'}`}>{title}</p>
          <p className={`text-[10px] mt-0.5 ${checked ? 'text-green-100' : 'text-slate-500'}`}>{description}</p>
        </div>
        {checked
          ? <CheckSquare className="w-4 h-4 text-white flex-shrink-0" />
          : <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>

      <div className={`px-4 py-3 flex items-center gap-3 border-t ${checked ? 'border-green-200' : 'border-slate-100'}`}>
        <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${checked ? 'text-green-600' : 'text-slate-300'}`} />
        <span className={`text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${checked ? 'text-slate-600' : 'text-slate-400'}`}>
          {dateLabel}
        </span>
        <input
          type="date"
          value={dateValue}
          onChange={e => onDateChange(e.target.value)}
          disabled={!checked}
          onClick={e => e.stopPropagation()}
          className={`ml-auto text-[11px] border rounded-lg px-2.5 py-1.5 transition-all ${
            checked
              ? 'border-green-300 focus:ring-2 focus:ring-green-400 focus:border-transparent bg-white text-slate-700'
              : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
          }`}
        />
      </div>
    </div>
  );
}

export default function CorrectiveActionFormModal({ nc, existingCA, onClose, onSaved }: Props) {
  const isEdit = !!existingCA;
  const [activeTab, setActiveTab]                               = useState<string>('karar');
  const [actionDecision, setActionDecision]                     = useState(existingCA?.action_description || '');
  const [plannedDate, setPlannedDate]                           = useState(existingCA?.planned_completion_date || '');
  const [responsibleName, setResponsibleName]                   = useState(existingCA?.responsible_user || '');

  const [actionFulfilled, setActionFulfilled]                   = useState(existingCA?.action_fulfilled ?? false);
  const [fulfillmentDate, setFulfillmentDate]                   = useState(existingCA?.fulfillment_date || '');
  const [monitoringPeriod, setMonitoringPeriod]                 = useState(existingCA?.monitoring_period || '');
  const [closureDate, setClosureDate]                           = useState(existingCA?.closure_date || '');
  const [effectivenessEvaluationDate, setEffectivenessEvaluationDate] = useState(existingCA?.effectiveness_evaluation_date || '');
  const [noRecurrenceObserved, setNoRecurrenceObserved]         = useState(existingCA?.no_recurrence_observed ?? false);
  const [noRecurrenceDate, setNoRecurrenceDate]                 = useState(existingCA?.no_recurrence_date || '');
  const [recurrenceObserved, setRecurrenceObserved]             = useState(existingCA?.recurrence_observed ?? false);
  const [recurrenceDate, setRecurrenceDate]                     = useState(existingCA?.recurrence_date || '');
  const [followUpNcNumber, setFollowUpNcNumber]                 = useState<string | null>(null);
  const [saving, setSaving]                                     = useState(false);
  const [pdfExporting, setPdfExporting]                         = useState(false);
  const [error, setError]                                       = useState<string | null>(null);
  const [profiles, setProfiles]                                 = useState<{ id: string; full_name: string; job_title: string | null }[]>([]);
  const [analysisTeam, setAnalysisTeam]                         = useState<{ id: string; full_name: string; job_title: string | null }[]>([]);
  const [actionItems, setActionItems]                           = useState<ActionItem[]>([]);

  useEffect(() => {
    supabase.rpc('get_personnel_list').then(({ data }) => {
      const list = (data || []).map((p: any) => ({ id: p.id, full_name: p.full_name, job_title: p.job_title }));
      setProfiles(list);
      supabase
        .from('nonconformity_analysis_team')
        .select('user_id')
        .eq('nonconformity_id', nc.id)
        .then(({ data: teamData }) => {
          const memberIds = (teamData || []).map((r: any) => r.user_id);
          setAnalysisTeam(list.filter((p: any) => memberIds.includes(p.id)));
        });
    });

    if (existingCA?.id) {
      supabase
        .from('corrective_action_items')
        .select('*')
        .eq('corrective_action_id', existingCA.id)
        .order('sort_order', { ascending: true })
        .then(({ data }) => {
          if (data) {
            setActionItems(data.map((r: any) => ({
              id: r.id,
              action_description: r.action_description || '',
              responsible_person: r.responsible_person || '',
              deadline: r.deadline || '',
              status: r.status || 'Devam Ediyor',
              completed_date: r.completed_date || '',
            })));
          }
        });
    }
  }, [nc.id, existingCA?.id]);

  const syncActionItems = async (caId: string) => {
    const existingIds = actionItems.filter(i => i.id).map(i => i.id as string);
    if (existingIds.length > 0 || (isEdit && existingCA?.id)) {
      const { data: dbItems } = await supabase
        .from('corrective_action_items')
        .select('id')
        .eq('corrective_action_id', caId);
      const dbIds = (dbItems || []).map((r: any) => r.id as string);
      const toDelete = dbIds.filter(id => !existingIds.includes(id));
      if (toDelete.length > 0) {
        await supabase.from('corrective_action_items').delete().in('id', toDelete);
      }
    }
    for (let i = 0; i < actionItems.length; i++) {
      const item = actionItems[i];
      const row = {
        corrective_action_id: caId,
        action_description: item.action_description,
        responsible_person: item.responsible_person,
        deadline: item.deadline || null,
        status: item.status,
        completed_date: item.completed_date || null,
        sort_order: i,
      };
      if (item.id) {
        await supabase.from('corrective_action_items').update(row).eq('id', item.id);
      } else {
        const { data: inserted } = await supabase
          .from('corrective_action_items')
          .insert([row])
          .select('id')
          .single();
        if (inserted) {
          setActionItems(prev =>
            prev.map((p, idx) => (idx === i ? { ...p, id: inserted.id } : p))
          );
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionDecision.trim()) {
      setError('Karar verilen faaliyet alanı zorunludur.');
      setActiveTab('karar');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        action_description: actionDecision,
        responsible_user: responsibleName || null,
        action_fulfilled: actionFulfilled,
        planned_completion_date: plannedDate || null,
        fulfillment_date: fulfillmentDate || null,
        monitoring_period: monitoringPeriod || null,
        closure_date: closureDate || null,
        effectiveness_evaluation_date: effectivenessEvaluationDate || null,
        no_recurrence_observed: noRecurrenceObserved,
        no_recurrence_date: noRecurrenceDate || null,
        recurrence_observed: recurrenceObserved,
        recurrence_date: recurrenceDate || null,
      };

      if (noRecurrenceObserved) {
        payload.status = 'Kapalı';
      }

      let caId: string;

      if (isEdit && existingCA) {
        const { error: updateError } = await supabase
          .from('corrective_actions')
          .update(payload)
          .eq('id', existingCA.id);
        if (updateError) throw updateError;
        caId = existingCA.id;
      } else {
        payload.nonconformity_id = nc.id;
        payload.status = 'open';
        const { data: newCa, error: insertError } = await supabase
          .from('corrective_actions')
          .insert([payload])
          .select('id')
          .single();
        if (insertError) throw insertError;
        caId = newCa.id;
      }

      await syncActionItems(caId);

      if (recurrenceObserved) {
        const { data: existing } = await supabase
          .from('nonconformities')
          .select('id, nc_number')
          .eq('parent_nc_id', nc.id)
          .maybeSingle();

        if (!existing) {
          const followUpPayload: any = {
            detection_date: recurrenceDate || new Date().toISOString().split('T')[0],
            source: 'ineffective_df',
            description: nc.description,
            severity: nc.severity,
            recurrence_risk: nc.recurrence_risk,
            calibration_impact: nc.calibration_impact,
            parent_nc_id: nc.id,
            status: 'open',
          };
          const { data: newNc, error: ncErr } = await supabase
            .from('nonconformities')
            .insert([followUpPayload])
            .select('nc_number')
            .single();
          if (ncErr) throw ncErr;
          setFollowUpNcNumber(newNc.nc_number);
          setSaving(false);
          return;
        } else {
          setFollowUpNcNumber(existing.nc_number);
          setSaving(false);
          return;
        }
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handlePdfExport = async () => {
    setPdfExporting(true);
    try {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name, logo_url')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const resolvedResponsible = profiles.find(p => p.id === responsibleName)?.full_name || responsibleName || '-';

      await generateDfPDF({
        nc: {
          nc_number: nc.nc_number,
          detection_date: nc.detection_date,
          source: nc.source,
          description: nc.description,
          severity: nc.severity,
          status: '',
        },
        ca: {
          id: existingCA?.id || '',
          ca_number: existingCA?.ca_number,
          action_description: actionDecision,
          responsible_user: resolvedResponsible,
          planned_completion_date: plannedDate,
          action_fulfilled: actionFulfilled,
          fulfillment_date: fulfillmentDate,
          status: existingCA?.status,
          monitoring_period: monitoringPeriod,
          closure_date: closureDate,
          effectiveness_evaluation_date: effectivenessEvaluationDate,
          no_recurrence_observed: noRecurrenceObserved,
          no_recurrence_date: noRecurrenceDate,
          recurrence_observed: recurrenceObserved,
          recurrence_date: recurrenceDate,
        },
        analysisTeam: analysisTeam.map(m => ({ full_name: m.full_name, job_title: m.job_title })),
        logoUrl: orgData?.logo_url,
        organizationName: orgData?.name,
      });
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setPdfExporting(false);
    }
  };

  if (followUpNcNumber) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-5 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-200 flex-shrink-0" />
            <div>
              <div className="text-xs text-red-200 font-semibold uppercase tracking-wide">Otomatik Kayıt Oluşturuldu</div>
              <div className="text-base font-bold leading-tight mt-0.5">Tekrar Eden Uygunsuzluk</div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Düzeltici faaliyet sonrasında uygunsuzluğun tekrar ettiği işaretlendiğinden, mevcut kayıtla aynı içerikte yeni bir uygunsuzluk kaydı otomatik olarak oluşturulmuştur.
            </p>
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <div className="text-center">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Kaynak NC</div>
                <div className="text-sm font-bold text-slate-700 mt-0.5">{nc.nc_number}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-red-400 flex-shrink-0" />
              <div className="text-center">
                <div className="text-[10px] text-red-500 font-semibold uppercase">Yeni NC (Takip)</div>
                <div className="text-sm font-bold text-red-700 mt-0.5">{followUpNcNumber}</div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              Yeni kayıt, uygunsuzluklar listesinde görüntülenebilir ve düzeltici faaliyet süreci başlatılabilir.
            </p>
          </div>
          <div className="px-6 pb-6">
            <button
              type="button"
              onClick={onSaved}
              className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl hover:bg-red-700 transition-all font-semibold text-sm shadow-sm"
            >
              Tamam, Kapat
            </button>
          </div>
        </div>
      </div>
    );
  }

  const labelCls = 'block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1';
  const inputCls = 'w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white';
  const activeTabIndex = TABS.findIndex(t => t.id === activeTab);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-0 md:p-4">
      <div className="bg-white md:rounded-xl shadow-2xl w-full h-full md:h-auto md:max-h-[92vh] max-w-3xl flex flex-col overflow-hidden">

        {/* ── Fixed Header ── */}
        <div className="flex-shrink-0 bg-[#1e293b] px-5 py-4 md:rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Düzeltici Faaliyet Formu</p>
              <h2 className="text-base font-bold text-white leading-tight">
                {isEdit && existingCA?.ca_number ? existingCA.ca_number : nc.nc_number}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePdfExport}
              disabled={pdfExporting}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-1.5 rounded-lg transition-all text-[11px] font-semibold disabled:opacity-50"
            >
              {pdfExporting
                ? <div className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                : <FileDown className="w-3.5 h-3.5" />}
              PDF
            </button>
            <button
              type="submit"
              form="ca-form"
              disabled={saving}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-all text-[11px] font-semibold disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Fixed Summary Bar ── */}
        <div className="flex-shrink-0 bg-slate-50 border-b border-slate-200 px-5 py-2.5 grid grid-cols-4 gap-4">
          <div>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">NC No</p>
            <p className="text-[11px] font-bold text-slate-800 mt-0.5">{nc.nc_number}</p>
          </div>
          <div>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Tespit Tarihi</p>
            <p className="text-[11px] font-semibold text-slate-700 mt-0.5">
              {nc.detection_date ? new Date(nc.detection_date).toLocaleDateString('tr-TR') : '-'}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Şiddet</p>
            <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[nc.severity] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
              {SEVERITY_LABELS[nc.severity] || nc.severity || '-'}
            </span>
          </div>
          <div>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Uygunsuzluk Tanımı</p>
            <p className="text-[11px] font-semibold text-slate-700 mt-0.5 truncate" title={nc.description}>
              {nc.description || '-'}
            </p>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-white overflow-x-auto">
          <div className="flex min-w-max px-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-[11px] font-semibold whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Form wraps scrollable content + footer ── */}
        <form id="ca-form" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto">

            {/* ────────────────────────────────────────────────
                TAB 1: Faaliyet Kararı
            ──────────────────────────────────────────────── */}
            {activeTab === 'karar' && (
              <div className="p-5 space-y-5">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">{error}</div>
                )}

                <div>
                  <label className={labelCls}>
                    Karar Verilen Faaliyet <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={actionDecision}
                    onChange={e => setActionDecision(e.target.value)}
                    rows={5}
                    required
                    className={`${inputCls} resize-none`}
                    placeholder="Alınan kararı ve planlanan faaliyeti açıklayınız..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Planlanan Tamamlanma Tarihi</label>
                    <input
                      type="date"
                      value={plannedDate}
                      onChange={e => setPlannedDate(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Faaliyete Karar Veren Yetkili</label>
                    <select
                      value={responsibleName}
                      onChange={e => setResponsibleName(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">-- Seçiniz --</option>
                      {profiles.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.full_name}{p.job_title ? ` — ${p.job_title}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ── Action Items ── */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Faaliyetler
                      {actionItems.length > 0 && (
                        <span className="ml-2 text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">
                          {actionItems.length}
                        </span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => setActionItems(prev => [
                        ...prev,
                        { action_description: '', responsible_person: '', deadline: '', status: 'Devam Ediyor', completed_date: '' },
                      ])}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[11px] font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Yeni Faaliyet Ekle
                    </button>
                  </div>

                  {actionItems.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-[11px]">
                      Henüz faaliyet eklenmemiş.
                    </div>
                  )}

                  {actionItems.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Faaliyet {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActionItems(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <label className={labelCls}>Gerçekleştirilecek Faaliyet</label>
                        <textarea
                          value={item.action_description}
                          onChange={e => setActionItems(prev => {
                            const u = [...prev]; u[idx] = { ...u[idx], action_description: e.target.value }; return u;
                          })}
                          rows={3}
                          className={`${inputCls} resize-none`}
                          placeholder="Yapılacak faaliyet detayı..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className={labelCls}>Sorumlu Kişi</label>
                          <div className="relative">
                            <select
                              value={item.responsible_person}
                              onChange={e => setActionItems(prev => {
                                const u = [...prev]; u[idx] = { ...u[idx], responsible_person: e.target.value }; return u;
                              })}
                              className={`${inputCls} appearance-none pr-8`}
                            >
                              <option value="">-- Personel Seçin --</option>
                              {profiles.map(p => (
                                <option key={p.id} value={p.full_name}>{p.full_name}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}>Termin Tarihi</label>
                          <input
                            type="date"
                            value={item.deadline}
                            onChange={e => setActionItems(prev => {
                              const u = [...prev]; u[idx] = { ...u[idx], deadline: e.target.value }; return u;
                            })}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Durum</label>
                          <select
                            value={item.status}
                            onChange={e => {
                              const newStatus = e.target.value;
                              setActionItems(prev => {
                                const u = [...prev];
                                u[idx] = {
                                  ...u[idx],
                                  status: newStatus,
                                  completed_date: newStatus === 'Tamamlandı' && !u[idx].completed_date
                                    ? new Date().toISOString().split('T')[0]
                                    : newStatus !== 'Tamamlandı' ? '' : u[idx].completed_date,
                                };
                                return u;
                              });
                            }}
                            className={inputCls}
                          >
                            <option>Devam Ediyor</option>
                            <option>Tamamlandı</option>
                          </select>
                        </div>
                      </div>

                      {item.status === 'Tamamlandı' && (
                        <div className="max-w-xs">
                          <label className={labelCls}>Tamamlanma Tarihi</label>
                          <input
                            type="date"
                            value={item.completed_date}
                            onChange={e => setActionItems(prev => {
                              const u = [...prev]; u[idx] = { ...u[idx], completed_date: e.target.value }; return u;
                            })}
                            className={inputCls}
                          />
                        </div>
                      )}

                      {item.id && (
                        <div className="pt-3 border-t border-slate-200">
                          <SignaturesSection
                            moduleKey="ca_action_item"
                            recordId={item.id}
                            onLockChange={() => {}}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ────────────────────────────────────────────────
                TAB 2: Faaliyet Takibi
            ──────────────────────────────────────────────── */}
            {activeTab === 'takip' && (
              <div className="p-5 space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1">
                  Adım Adım Faaliyet Takibi
                </p>

                {/* Step 1 */}
                <StepCard
                  step={1}
                  title="İlgili Faaliyet Yerine Getirilmiştir"
                  description="Planlanan düzeltici faaliyet tamamlandı olarak işaretleyin"
                  checked={actionFulfilled}
                  onToggle={() => setActionFulfilled(v => !v)}
                  dateValue={fulfillmentDate}
                  onDateChange={setFulfillmentDate}
                  dateLabel="Tamamlanma Tarihi"
                />

                {/* Step 2 */}
                <StepCard
                  step={2}
                  title="Faaliyet Sonrası Uygunsuzluk Gözlemlenmemiştir"
                  description="Belirtilen süre içinde tekrar uygunsuzluk gözlemlenmedi"
                  checked={noRecurrenceObserved}
                  onToggle={() => setNoRecurrenceObserved(v => !v)}
                  dateValue={noRecurrenceDate}
                  onDateChange={setNoRecurrenceDate}
                  dateLabel="Gözlem Tarihi"
                  disabled={!actionFulfilled}
                />

                {/* Step 3 — informational */}
                <div className={`rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                  !actionFulfilled ? 'opacity-40 border-slate-200' : 'border-slate-300'
                } bg-white`}>
                  <div className="flex items-center gap-3 px-4 py-3.5 bg-slate-50">
                    <div className="w-7 h-7 rounded-full bg-white border border-slate-300 flex items-center justify-center text-[11px] font-black text-slate-500 flex-shrink-0">
                      <PenLine className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-slate-700 leading-tight">Analiz Ekibi Onayı Tamamlandı</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">İmzalar sekmesinden onay ve imza işlemlerini tamamlayın</p>
                    </div>
                  </div>
                  <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Bu adım kayıt oluşturulduktan sonra tamamlanabilir</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('imzalar')}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      İmzalar Sekmesine Git
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ────────────────────────────────────────────────
                TAB 3: Etkinlik Değerlendirmesi
            ──────────────────────────────────────────────── */}
            {activeTab === 'etkinlik' && (
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Etkinlik Değerlendirme Tarihi</label>
                    <input
                      type="date"
                      value={effectivenessEvaluationDate}
                      onChange={e => setEffectivenessEvaluationDate(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Faaliyetin Etkinliğini İzleme Bitiş Tarihi</label>
                    <input
                      type="date"
                      value={monitoringPeriod}
                      onChange={e => setMonitoringPeriod(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Kapanma Tarihi</label>
                    <input
                      type="date"
                      value={closureDate}
                      onChange={e => setClosureDate(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tekrarlama Durumu</p>

                  <div className={`rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                    recurrenceObserved ? 'border-red-300 bg-red-50/20' : 'border-slate-200 bg-white'
                  }`}>
                    <button
                      type="button"
                      onClick={() => setRecurrenceObserved(v => !v)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                        recurrenceObserved ? 'bg-red-600' : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                        recurrenceObserved ? 'bg-white/20' : 'bg-white border border-slate-300'
                      }`}>
                        {recurrenceObserved
                          ? <CheckSquare className="w-4 h-4 text-white" />
                          : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div className="flex-1">
                        <p className={`text-[12px] font-bold ${recurrenceObserved ? 'text-white' : 'text-slate-700'}`}>
                          Düzeltici Faaliyet Sonrası Uygunsuzluk Tekrar Etmektedir
                        </p>
                        <p className={`text-[10px] mt-0.5 ${recurrenceObserved ? 'text-red-100' : 'text-slate-500'}`}>
                          İşaretlenirse kaydet butonuna basıldığında otomatik NC oluşturulur
                        </p>
                      </div>
                    </button>
                    <div className={`px-4 py-3 flex items-center gap-3 border-t ${recurrenceObserved ? 'border-red-200' : 'border-slate-100'}`}>
                      <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${recurrenceObserved ? 'text-red-500' : 'text-slate-300'}`} />
                      <span className={`text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${recurrenceObserved ? 'text-slate-600' : 'text-slate-400'}`}>
                        Tekrar Tarihi
                      </span>
                      <input
                        type="date"
                        value={recurrenceDate}
                        onChange={e => setRecurrenceDate(e.target.value)}
                        disabled={!recurrenceObserved}
                        onClick={e => e.stopPropagation()}
                        className={`ml-auto text-[11px] border rounded-lg px-2.5 py-1.5 transition-all ${
                          recurrenceObserved
                            ? 'border-red-300 focus:ring-2 focus:ring-red-400 focus:border-transparent bg-white text-slate-700'
                            : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                        }`}
                      />
                    </div>
                  </div>

                  {recurrenceObserved && (
                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-bold text-amber-800">Tekrar uygunsuzluk tespit edildi</p>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Kaydet butonuna basıldığında yeni NC kaydı otomatik oluşturulacaktır.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ────────────────────────────────────────────────
                TAB 4: İmzalar
            ──────────────────────────────────────────────── */}
            {activeTab === 'imzalar' && (
              <div className="p-5">
                {existingCA?.id ? (
                  <SignaturesSection
                    moduleKey="corrective_actions"
                    recordId={existingCA.id}
                    title="Düzeltici Faaliyet İmzaları"
                  />
                ) : (
                  <div className="text-center py-14 border-2 border-dashed border-slate-200 rounded-xl">
                    <PenLine className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-[12px] font-semibold text-slate-500">İmza işlemleri için önce kaydedin</p>
                    <p className="text-[11px] text-slate-400 mt-1">Kaydı oluşturduktan sonra bu sekmeden imzalanabilir.</p>
                    <button
                      type="submit"
                      form="ca-form"
                      disabled={saving}
                      className="mt-4 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {saving ? 'Kaydediliyor...' : 'Şimdi Kaydet'}
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* ── Fixed Footer ── */}
          <div className="flex-shrink-0 border-t border-slate-200 bg-white px-5 py-3 flex items-center justify-between md:rounded-b-xl">
            <div className="flex items-center gap-2">
              {activeTabIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab(TABS[activeTabIndex - 1].id)}
                  className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  ← Geri
                </button>
              )}
              {activeTabIndex < TABS.length - 1 && (
                <button
                  type="button"
                  onClick={() => setActiveTab(TABS[activeTabIndex + 1].id)}
                  className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  İleri →
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[11px] border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-all font-semibold"
            >
              İptal
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
