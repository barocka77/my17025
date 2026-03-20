import { useState, useEffect } from 'react';
import { X, FileText, Save, CheckSquare, Square, AlertTriangle, ArrowRight, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

const SOURCE_LABELS: Record<string, string> = {
  internal_audit: 'İç Tetkik',
  external_audit: 'Dış Tetkik',
  customer_feedback: 'Müşteri Geri Bildirimi',
  risk_analysis: 'Risk Analizi',
  personnel_observation: 'Personel Gözlemi',
  data_control: 'Veri Kontrolü',
  other: 'Diğer',
};

const SEVERITY_LABELS: Record<string, string> = {
  minor: 'Düşük',
  major: 'Orta',
  critical: 'Kritik',
};

function CheckboxRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-[11px] text-slate-700 flex-1 pr-4">{label}</span>
      <div className="flex items-center gap-3 flex-shrink-0">
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
  const [actionDecision, setActionDecision] = useState(existingCA?.action_description || '');
  const [plannedDate, setPlannedDate] = useState(existingCA?.planned_completion_date || '');
  const [responsibleName, setResponsibleName] = useState(existingCA?.responsible_user || '');
  const [customerAffected, setCustomerAffected] = useState(existingCA?.df_customer_affected ?? false);
  const [customerNotified, setCustomerNotified] = useState(existingCA?.df_customer_notified ?? false);
  const [reportRecall, setReportRecall] = useState(existingCA?.df_report_recall ?? false);
  const [actionFulfilled, setActionFulfilled] = useState(existingCA?.action_fulfilled ?? false);
  const [fulfillmentDate, setFulfillmentDate] = useState(existingCA?.fulfillment_date || '');
  const [nonconformityCost, setNonconformityCost] = useState(existingCA?.nonconformity_cost || '');
  const [rootCauseProcesses, setRootCauseProcesses] = useState(existingCA?.root_cause_processes || '');
  const [monitoringPeriod, setMonitoringPeriod] = useState(existingCA?.monitoring_period || '');
  const [closureDate, setClosureDate] = useState(existingCA?.closure_date || '');
  const [effectivenessEvaluationDate, setEffectivenessEvaluationDate] = useState(existingCA?.effectiveness_evaluation_date || '');
  const [noRecurrenceObserved, setNoRecurrenceObserved] = useState(existingCA?.no_recurrence_observed ?? false);
  const [noRecurrenceDate, setNoRecurrenceDate] = useState(existingCA?.no_recurrence_date || '');
  const [recurrenceObserved, setRecurrenceObserved] = useState(existingCA?.recurrence_observed ?? false);
  const [recurrenceDate, setRecurrenceDate] = useState(existingCA?.recurrence_date || '');
  const [followUpNcNumber, setFollowUpNcNumber] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
        nonconformity_cost: nonconformityCost || null,
        root_cause_processes: rootCauseProcesses || null,
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white px-5 py-4 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-blue-200" />
            <div>
              <div className="text-xs text-blue-200 font-medium">
                {isEdit ? 'DÜZELTİCİ FAALİYET DÜZENLE' : 'DÜZELTİCİ FAALİYET FORMU'}
              </div>
              <div className="text-sm font-bold leading-tight">
                {isEdit && existingCA?.ca_number ? existingCA.ca_number : nc.nc_number}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="submit"
              form="ca-form"
              disabled={saving}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white px-3 py-1.5 rounded-lg transition-all text-xs font-semibold disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          <form id="ca-form" onSubmit={handleSubmit}>
            <div className="p-5 space-y-5">
              {/* NC Info Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Uygunsuzluk Bilgileri</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">NC No</span>
                    <p className="text-[12px] font-bold text-slate-800">{nc.nc_number}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Tespit Tarihi</span>
                    <p className="text-[12px] font-medium text-slate-800">
                      {nc.detection_date ? new Date(nc.detection_date).toLocaleDateString('tr-TR') : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Tespit Noktası</span>
                    <p className="text-[12px] font-medium text-slate-800">{SOURCE_LABELS[nc.source] || nc.source || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Şiddet</span>
                    <p className="text-[12px] font-medium text-slate-800">{SEVERITY_LABELS[nc.severity] || nc.severity || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Uygunsuzluk Tanımı</span>
                    <p className="text-[12px] font-medium text-slate-800 leading-relaxed">{nc.description || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Section: Uygunsuzluk Analizi ve Faaliyet Seçimi */}
              <div className="border border-blue-200 rounded-xl overflow-hidden">
                <div className="bg-blue-600 text-white px-4 py-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Uygunsuzluk Analizi ve Faaliyet Seçimi</span>
                </div>
                <div className="p-4 space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">{error}</div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                      Karar Verilen Faaliyet <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={actionDecision}
                      onChange={e => setActionDecision(e.target.value)}
                      rows={4}
                      required
                      className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      placeholder="Alınan kararı ve planlanan faaliyeti açıklayınız..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                        Planlanan Faaliyet Tamamlama Tarihi
                      </label>
                      <input
                        type="date"
                        value={plannedDate}
                        onChange={e => setPlannedDate(e.target.value)}
                        className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                        Faaliyete Karar Veren Yetkili
                      </label>
                      <select
                        value={responsibleName}
                        onChange={e => setResponsibleName(e.target.value)}
                        className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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

                  <div className="space-y-1 pt-1">
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

              {/* Section: Sonuçların Değerlendirilmesi */}
              <div className={`border rounded-xl overflow-hidden transition-all ${actionFulfilled ? 'border-green-300' : 'border-slate-200'}`}>
                <div className={`px-4 py-2 flex items-center justify-between transition-all ${actionFulfilled ? 'bg-green-700' : 'bg-slate-600'} text-white`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider">Sonuçların Değerlendirilmesi</span>
                  {actionFulfilled && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                      <CheckSquare className="w-3 h-3" />
                      Faaliyet Tamamlandı
                    </span>
                  )}
                </div>
                <div className={`p-4 transition-all ${actionFulfilled ? 'bg-green-50/30' : 'bg-white'}`}>
                  {/* Fulfilled toggle — always visible at top */}
                  <div className="flex items-center justify-between gap-4 flex-wrap mb-4 pb-4 border-b border-slate-200">
                    <button
                      type="button"
                      onClick={() => setActionFulfilled(v => !v)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                        actionFulfilled
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-slate-500 border-slate-300 hover:border-green-400 hover:text-green-600'
                      }`}
                    >
                      {actionFulfilled ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                      İLGİLİ FAALİYET YERİNE GETİRİLMİŞTİR
                    </button>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap ${actionFulfilled ? 'text-slate-600' : 'text-slate-400'}`}>TARİH:</span>
                      <input
                        type="date"
                        value={fulfillmentDate}
                        onChange={e => setFulfillmentDate(e.target.value)}
                        disabled={!actionFulfilled}
                        className={`px-2 py-1 text-[11px] border rounded-lg transition-all ${
                          actionFulfilled
                            ? 'border-slate-300 focus:ring-2 focus:ring-green-500 focus:border-transparent'
                            : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                        }`}
                      />
                    </div>
                  </div>
                  {!actionFulfilled && (
                    <p className="text-[11px] text-slate-400 italic mb-4">
                      Bu bölüm, faaliyet yerine getirildi olarak işaretlendiğinde doldurulabilir hale gelir.
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-[10px] font-semibold uppercase tracking-wide mb-1 ${actionFulfilled ? 'text-slate-600' : 'text-slate-400'}`}>
                        Uygunsuzluk Maliyeti
                      </label>
                      {actionFulfilled ? (
                        <input
                          type="text"
                          value={nonconformityCost}
                          onChange={e => setNonconformityCost(e.target.value)}
                          placeholder="Örn: 1.500 TL"
                          className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        />
                      ) : (
                        <p className="text-[12px] text-slate-300 mt-0.5">—</p>
                      )}
                    </div>
                    <div>
                      <label className={`block text-[10px] font-semibold uppercase tracking-wide mb-1 ${actionFulfilled ? 'text-slate-600' : 'text-slate-400'}`}>
                        Kök Neden Prosesleri
                      </label>
                      {actionFulfilled ? (
                        <input
                          type="text"
                          value={rootCauseProcesses}
                          onChange={e => setRootCauseProcesses(e.target.value)}
                          placeholder="Uygunsuzluğun yaşandığı proses adı..."
                          className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        />
                      ) : (
                        <p className="text-[12px] text-slate-300 mt-0.5">—</p>
                      )}
                    </div>
                    <div>
                      <label className={`block text-[10px] font-semibold uppercase tracking-wide mb-1 ${actionFulfilled ? 'text-slate-600' : 'text-slate-400'}`}>
                        Faaliyetin Etkinliğini İzleme Bitiş Tarihi
                      </label>
                      {actionFulfilled ? (
                        <input
                          type="date"
                          value={monitoringPeriod}
                          onChange={e => setMonitoringPeriod(e.target.value)}
                          className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        />
                      ) : (
                        <p className="text-[12px] text-slate-300 mt-0.5">—</p>
                      )}
                    </div>
                  </div>
                  {/* Recurrence observation */}
                  <div className={`mt-4 pt-4 border-t border-slate-200 space-y-2 transition-all ${!actionFulfilled ? 'opacity-40 pointer-events-none' : ''}`}>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setNoRecurrenceObserved(v => !v)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                          noRecurrenceObserved
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-slate-500 border-slate-300 hover:border-green-400 hover:text-green-600'
                        }`}
                      >
                        {noRecurrenceObserved ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                        FAALİYETTEN SONRA UYGUNSUZLUK GÖRÜLMEMİŞTİR
                      </button>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap ${noRecurrenceObserved ? 'text-slate-600' : 'text-slate-400'}`}>TARİH:</span>
                        <input
                          type="date"
                          value={noRecurrenceDate}
                          onChange={e => setNoRecurrenceDate(e.target.value)}
                          disabled={!noRecurrenceObserved}
                          className={`px-2 py-1 text-[11px] border rounded-lg transition-all ${
                            noRecurrenceObserved
                              ? 'border-slate-300 focus:ring-2 focus:ring-green-500 focus:border-transparent'
                              : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                          }`}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setRecurrenceObserved(v => !v)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                          recurrenceObserved
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-slate-500 border-slate-300 hover:border-red-400 hover:text-red-600'
                        }`}
                      >
                        {recurrenceObserved ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                        DÜZELTİCİ FAALİYET SONRASI UYGUNSUZLUK TEKRAR ETMEKTEDİR
                      </button>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap ${recurrenceObserved ? 'text-slate-600' : 'text-slate-400'}`}>TARİH:</span>
                        <input
                          type="date"
                          value={recurrenceDate}
                          onChange={e => setRecurrenceDate(e.target.value)}
                          disabled={!recurrenceObserved}
                          className={`px-2 py-1 text-[11px] border rounded-lg transition-all ${
                            recurrenceObserved
                              ? 'border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-transparent'
                              : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Analiz Ekibi Onayı / İmzalar</span>
                    </div>
                    {analysisTeam.length > 0 ? (
                      <div className="space-y-1.5">
                        {analysisTeam.map(member => (
                          <div key={member.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                            <div>
                              <p className="text-[12px] font-semibold text-slate-700">{member.full_name}</p>
                              {member.job_title && (
                                <p className="text-[10px] text-slate-400">{member.job_title}</p>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 italic">Faaliyet kaydedildikten sonra imzalanabilir</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">Bu uygunsuzluğa henüz analiz ekibi atanmamış.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end px-5 pb-5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors font-medium text-xs"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
