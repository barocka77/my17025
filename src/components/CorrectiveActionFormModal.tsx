import { useState, useEffect } from 'react';
import { X, FileText, Save, CheckSquare, Square, AlertTriangle, ArrowRight, Users, FileDown, CheckCircle2, ClipboardCheck, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateDfPDF } from '../utils/dfPdfExport';

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
  df_customer_affected?: boolean;
  df_customer_notified?: boolean;
  df_report_recall?: boolean;
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
  { id: 'karar', label: 'Faaliyet Kararı' },
  { id: 'takip', label: 'Faaliyet Takibi' },
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
            !value ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
          }`}
        >
          <Square className="w-3 h-3" />
          Hayır
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
            value ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-400 border-slate-200 hover:border-red-300 hover:text-red-500'
          }`}
        >
          <CheckSquare className="w-3 h-3" />
          Evet
        </button>
      </div>
    </div>
  );
}

export default function CorrectiveActionFormModal({ nc, existingCA, onClose, onSaved }: Props) {
  const isEdit = !!existingCA;
  const [activeTab, setActiveTab] = useState('karar');
  const [actionDecision, setActionDecision] = useState(existingCA?.action_description || '');
  const [plannedDate, setPlannedDate] = useState(existingCA?.planned_completion_date || '');
  const [responsibleName, setResponsibleName] = useState(existingCA?.responsible_user || '');
  const [customerAffected, setCustomerAffected] = useState(existingCA?.df_customer_affected ?? false);
  const [customerNotified, setCustomerNotified] = useState(existingCA?.df_customer_notified ?? false);
  const [reportRecall, setReportRecall] = useState(existingCA?.df_report_recall ?? false);
  const [actionFulfilled, setActionFulfilled] = useState(existingCA?.action_fulfilled ?? false);
  const [fulfillmentDate, setFulfillmentDate] = useState(existingCA?.fulfillment_date || '');
  const [monitoringPeriod, setMonitoringPeriod] = useState(existingCA?.monitoring_period || '');
  const [closureDate, setClosureDate] = useState(existingCA?.closure_date || '');
  const [effectivenessEvaluationDate, setEffectivenessEvaluationDate] = useState(existingCA?.effectiveness_evaluation_date || '');
  const [noRecurrenceObserved, setNoRecurrenceObserved] = useState(existingCA?.no_recurrence_observed ?? false);
  const [noRecurrenceDate, setNoRecurrenceDate] = useState(existingCA?.no_recurrence_date || '');
  const [recurrenceObserved, setRecurrenceObserved] = useState(existingCA?.recurrence_observed ?? false);
  const [recurrenceDate, setRecurrenceDate] = useState(existingCA?.recurrence_date || '');
  const [followUpNcNumber, setFollowUpNcNumber] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string; job_title: string | null }[]>([]);
  const [analysisTeam, setAnalysisTeam] = useState<{ id: string; full_name: string; job_title: string | null }[]>([]);

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
  }, [nc.id]);

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
        df_customer_affected: customerAffected,
        df_customer_notified: customerNotified,
        df_report_recall: reportRecall,
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

      if (isEdit && existingCA) {
        const { error: updateError } = await supabase
          .from('corrective_actions')
          .update(payload)
          .eq('id', existingCA.id);
        if (updateError) throw updateError;
      } else {
        payload.nonconformity_id = nc.id;
        payload.status = 'open';
        const { error: insertError } = await supabase.from('corrective_actions').insert([payload]);
        if (insertError) throw insertError;
      }

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
          df_customer_affected: customerAffected,
          df_customer_notified: customerNotified,
          df_report_recall: reportRecall,
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-0 md:p-4">
      <div className="bg-white md:rounded-xl shadow-2xl w-full h-full md:h-auto md:max-h-[92vh] max-w-3xl flex flex-col overflow-hidden">

        {/* Fixed Header */}
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
              {pdfExporting ? (
                <div className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
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
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Fixed Summary Bar */}
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

        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-white px-4 overflow-x-auto">
          <div className="flex gap-0 min-w-max">
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

        {/* Tab Content */}
        <form id="ca-form" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto">
            <div className="p-5">

              {/* Tab 1: Faaliyet Kararı */}
              {activeTab === 'karar' && (
                <div className="space-y-5">
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

                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Müşteri Etki Değerlendirmesi</span>
                    </div>
                    <div className="px-4 py-1">
                      <CheckboxRow
                        label="Uygunsuzluktan etkilenen müşteri var mı?"
                        value={customerAffected}
                        onChange={setCustomerAffected}
                      />
                      <CheckboxRow
                        label="Varsa bilgilendirildi mi?"
                        value={customerNotified}
                        onChange={setCustomerNotified}
                      />
                      <CheckboxRow
                        label="Verilen bir raporun geri çağrılması gerekiyor mu?"
                        value={reportRecall}
                        onChange={setReportRecall}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Faaliyet Takibi */}
              {activeTab === 'takip' && (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Adım Adım Faaliyet Takibi</p>

                  {/* Card 1: Action Fulfilled */}
                  <div className={`rounded-xl border-2 transition-all overflow-hidden ${actionFulfilled ? 'border-green-300 bg-green-50/40' : 'border-slate-200 bg-white'}`}>
                    <div className={`px-4 py-3 flex items-center justify-between transition-all ${actionFulfilled ? 'bg-green-600' : 'bg-slate-100'}`}>
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setActionFulfilled(v => !v)}
                          className="flex-shrink-0"
                        >
                          {actionFulfilled
                            ? <CheckSquare className="w-5 h-5 text-white" />
                            : <Square className="w-5 h-5 text-slate-400" />}
                        </button>
                        <span className={`text-[12px] font-bold ${actionFulfilled ? 'text-white' : 'text-slate-600'}`}>
                          İlgili Faaliyet Yerine Getirilmiştir
                        </span>
                      </div>
                      {actionFulfilled && (
                        <CheckCircle2 className="w-4 h-4 text-green-200 flex-shrink-0" />
                      )}
                    </div>
                    <div className="px-4 py-3 flex items-center gap-3">
                      <span className={`text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap ${actionFulfilled ? 'text-slate-600' : 'text-slate-400'}`}>
                        Tamamlanma Tarihi
                      </span>
                      <input
                        type="date"
                        value={fulfillmentDate}
                        onChange={e => setFulfillmentDate(e.target.value)}
                        disabled={!actionFulfilled}
                        className={`px-3 py-1.5 text-[11px] border rounded-lg transition-all ${
                          actionFulfilled
                            ? 'border-slate-300 focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white'
                            : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Card 2: No Recurrence */}
                  <div className={`rounded-xl border-2 transition-all overflow-hidden ${!actionFulfilled ? 'opacity-50 pointer-events-none' : ''} ${noRecurrenceObserved ? 'border-green-300 bg-green-50/40' : 'border-slate-200 bg-white'}`}>
                    <div className={`px-4 py-3 flex items-center justify-between transition-all ${noRecurrenceObserved ? 'bg-green-600' : 'bg-slate-100'}`}>
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setNoRecurrenceObserved(v => !v)}
                          className="flex-shrink-0"
                        >
                          {noRecurrenceObserved
                            ? <CheckSquare className="w-5 h-5 text-white" />
                            : <Square className="w-5 h-5 text-slate-400" />}
                        </button>
                        <span className={`text-[12px] font-bold ${noRecurrenceObserved ? 'text-white' : 'text-slate-600'}`}>
                          Faaliyet Sonrası Uygunsuzluk Gözlemlenmemiştir
                        </span>
                      </div>
                      {noRecurrenceObserved && (
                        <CheckCircle2 className="w-4 h-4 text-green-200 flex-shrink-0" />
                      )}
                    </div>
                    <div className="px-4 py-3 flex items-center gap-3">
                      <span className={`text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap ${noRecurrenceObserved ? 'text-slate-600' : 'text-slate-400'}`}>
                        Gözlem Tarihi
                      </span>
                      <input
                        type="date"
                        value={noRecurrenceDate}
                        onChange={e => setNoRecurrenceDate(e.target.value)}
                        disabled={!noRecurrenceObserved}
                        className={`px-3 py-1.5 text-[11px] border rounded-lg transition-all ${
                          noRecurrenceObserved
                            ? 'border-slate-300 focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white'
                            : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Card 3: Signatures info */}
                  <div className={`rounded-xl border-2 border-dashed transition-all overflow-hidden ${!actionFulfilled ? 'opacity-50' : ''} border-slate-300 bg-slate-50`}>
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                        <ClipboardCheck className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[12px] font-bold text-slate-600">Analiz Ekibi Onayı ve İmzalar</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          İmzalar için{' '}
                          <button
                            type="button"
                            onClick={() => setActiveTab('imzalar')}
                            className="text-blue-600 font-semibold hover:underline"
                          >
                            İmzalar sekmesine
                          </button>{' '}
                          gidin
                        </p>
                      </div>
                    </div>
                  </div>

                  {!actionFulfilled && (
                    <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-700">
                        Faaliyet tamamlandığında "İlgili Faaliyet Yerine Getirilmiştir" adımını işaretleyerek devam edin.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Etkinlik Değerlendirmesi */}
              {activeTab === 'etkinlik' && (
                <div className="space-y-5">
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

                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Tekrarlama Durumu</p>

                    <div className={`rounded-xl border-2 transition-all overflow-hidden ${recurrenceObserved ? 'border-red-300' : 'border-slate-200'}`}>
                      <div className={`px-4 py-3 flex items-center justify-between transition-all ${recurrenceObserved ? 'bg-red-600' : 'bg-slate-100'}`}>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setRecurrenceObserved(v => !v)}
                            className="flex-shrink-0"
                          >
                            {recurrenceObserved
                              ? <CheckSquare className="w-5 h-5 text-white" />
                              : <Square className="w-5 h-5 text-slate-400" />}
                          </button>
                          <span className={`text-[12px] font-bold ${recurrenceObserved ? 'text-white' : 'text-slate-600'}`}>
                            Düzeltici Faaliyet Sonrası Uygunsuzluk Tekrar Etmektedir
                          </span>
                        </div>
                      </div>
                      <div className="px-4 py-3 flex items-center gap-3">
                        <span className={`text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap ${recurrenceObserved ? 'text-slate-600' : 'text-slate-400'}`}>
                          Tekrar Tarihi
                        </span>
                        <input
                          type="date"
                          value={recurrenceDate}
                          onChange={e => setRecurrenceDate(e.target.value)}
                          disabled={!recurrenceObserved}
                          className={`px-3 py-1.5 text-[11px] border rounded-lg transition-all ${
                            recurrenceObserved
                              ? 'border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white'
                              : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                          }`}
                        />
                      </div>
                    </div>

                    {recurrenceObserved && (
                      <div className="mt-3 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] font-bold text-red-800">Tekrar uygunsuzluk tespit edildi</p>
                          <p className="text-[11px] text-red-700 mt-0.5">
                            Yeni NC kaydı otomatik oluşturulacaktır. Kaydettiğinizde bu işlem gerçekleşir.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: İmzalar */}
              {activeTab === 'imzalar' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Analiz Ekibi Onayı ve İmzalar</p>
                  </div>
                  {analysisTeam.length > 0 ? (
                    <div className="space-y-2">
                      {analysisTeam.map(member => (
                        <div key={member.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3">
                          <div>
                            <p className="text-[12px] font-semibold text-slate-700">{member.full_name}</p>
                            {member.job_title && (
                              <p className="text-[10px] text-slate-400 mt-0.5">{member.job_title}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 italic bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                            Faaliyet kaydedildikten sonra imzalanabilir
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-[11px] text-slate-400">Bu uygunsuzluğa henüz analiz ekibi atanmamış.</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Fixed Footer */}
          <div className="flex-shrink-0 border-t border-slate-200 bg-white px-5 py-3 flex items-center justify-between md:rounded-b-xl">
            <div className="flex items-center gap-2">
              {activeTab !== TABS[0].id && (
                <button
                  type="button"
                  onClick={() => {
                    const idx = TABS.findIndex(t => t.id === activeTab);
                    if (idx > 0) setActiveTab(TABS[idx - 1].id);
                  }}
                  className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  ← Geri
                </button>
              )}
              {activeTab !== TABS[TABS.length - 1].id && (
                <button
                  type="button"
                  onClick={() => {
                    const idx = TABS.findIndex(t => t.id === activeTab);
                    if (idx < TABS.length - 1) setActiveTab(TABS[idx + 1].id);
                  }}
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
