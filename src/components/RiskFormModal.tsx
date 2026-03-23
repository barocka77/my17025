import { useState } from 'react';
import { X, AlertTriangle, Save, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RiskRecord {
  id: string;
  risk_no: string;
  risk_type: string;
  risk_definition: string;
  risk_impact: string;
  impact_area: string;
  probability: number | null;
  severity: number | null;
  risk_level: number | null;
  related_activity: string;
  decision: string;
  activity_responsible: string;
  deadline: string;
  planned_review_term: string;
  requires_df: boolean;
  df_no: string;
  evaluators: string;
  evaluation_date: string;
  re_probability: number | null;
  re_severity: number | null;
  re_risk_level: number | null;
  re_related_activity: string;
  re_decision: string;
  re_activity_responsible: string;
  re_deadline: string;
  re_requires_df: boolean;
  re_df_no: string;
  re_evaluators: string;
  re_evaluation_date: string;
  review_date: string;
  risk_change_occurred: boolean;
  change_explanation: string;
  risk_change_cause: string;
  opportunities_improvements: string;
}

interface Props {
  record?: RiskRecord | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyForm = (): Omit<RiskRecord, 'id' | 'risk_no'> => ({
  risk_type: 'risk',
  risk_definition: '',
  risk_impact: '',
  impact_area: '',
  probability: null,
  severity: null,
  risk_level: null,
  related_activity: '',
  decision: '',
  activity_responsible: '',
  deadline: '',
  planned_review_term: '',
  requires_df: false,
  df_no: '',
  evaluators: '',
  evaluation_date: '',
  re_probability: null,
  re_severity: null,
  re_risk_level: null,
  re_related_activity: '',
  re_decision: '',
  re_activity_responsible: '',
  re_deadline: '',
  re_requires_df: false,
  re_df_no: '',
  re_evaluators: '',
  re_evaluation_date: '',
  review_date: '',
  risk_change_occurred: false,
  change_explanation: '',
  risk_change_cause: '',
  opportunities_improvements: '',
});

function getRiskColor(level: number | null): string {
  if (!level) return 'bg-gray-100 text-gray-600 border-gray-300';
  if (level <= 6) return 'bg-green-100 text-green-800 border-green-400';
  if (level <= 12) return 'bg-yellow-100 text-yellow-800 border-yellow-400';
  return 'bg-red-100 text-red-800 border-red-400';
}

function getRiskLabel(level: number | null): string {
  if (!level) return '—';
  if (level <= 6) return 'Düşük';
  if (level <= 12) return 'Orta';
  return 'Yüksek';
}

function ScoreSelector({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`w-8 h-8 rounded text-[11px] font-bold border transition-all ${
            value === n
              ? 'bg-blue-700 text-white border-blue-700'
              : 'bg-white text-slate-500 border-slate-300 hover:border-blue-400 hover:text-blue-600'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function YesNoToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-3 py-1 rounded text-[11px] font-bold border transition-all ${
          !value ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
        }`}
      >
        Hayır
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-3 py-1 rounded text-[11px] font-bold border transition-all ${
          value ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-400 border-slate-200 hover:border-red-300 hover:text-red-500'
        }`}
      >
        Evet
      </button>
    </div>
  );
}

export default function RiskFormModal({ record, onClose, onSaved }: Props) {
  const isEdit = !!record;
  const [form, setForm] = useState<Omit<RiskRecord, 'id' | 'risk_no'>>(
    record ? {
      risk_type: record.risk_type || 'risk',
      risk_definition: record.risk_definition || '',
      risk_impact: record.risk_impact || '',
      impact_area: record.impact_area || '',
      probability: record.probability,
      severity: record.severity,
      risk_level: record.risk_level,
      related_activity: record.related_activity || '',
      decision: record.decision || '',
      activity_responsible: record.activity_responsible || '',
      deadline: record.deadline || '',
      planned_review_term: record.planned_review_term || '',
      requires_df: record.requires_df || false,
      df_no: record.df_no || '',
      evaluators: record.evaluators || '',
      evaluation_date: record.evaluation_date || '',
      re_probability: record.re_probability,
      re_severity: record.re_severity,
      re_risk_level: record.re_risk_level,
      re_related_activity: record.re_related_activity || '',
      re_decision: record.re_decision || '',
      re_activity_responsible: record.re_activity_responsible || '',
      re_deadline: record.re_deadline || '',
      re_requires_df: record.re_requires_df || false,
      re_df_no: record.re_df_no || '',
      re_evaluators: record.re_evaluators || '',
      re_evaluation_date: record.re_evaluation_date || '',
      review_date: record.review_date || '',
      risk_change_occurred: record.risk_change_occurred || false,
      change_explanation: record.change_explanation || '',
      risk_change_cause: record.risk_change_cause || '',
      opportunities_improvements: record.opportunities_improvements || '',
    } : emptyForm()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: unknown) => {
    setForm(prev => {
      const updated = { ...prev, [key]: value };
      if (key === 'probability' || key === 'severity') {
        const p = key === 'probability' ? (value as number) : prev.probability;
        const s = key === 'severity' ? (value as number) : prev.severity;
        updated.risk_level = p && s ? p * s : null;
      }
      if (key === 're_probability' || key === 're_severity') {
        const p = key === 're_probability' ? (value as number) : prev.re_probability;
        const s = key === 're_severity' ? (value as number) : prev.re_severity;
        updated.re_risk_level = p && s ? p * s : null;
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.risk_definition.trim()) {
      setError('Risk Tanımı zorunludur.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { ...form };
      Object.keys(payload).forEach(k => {
        if (payload[k] === '') payload[k] = null;
      });
      payload.requires_df = form.requires_df;
      payload.re_requires_df = form.re_requires_df;
      payload.risk_change_occurred = form.risk_change_occurred;

      if (isEdit) {
        const { error: err } = await supabase
          .from('risks_opportunities')
          .update(payload)
          .eq('id', record!.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('risks_opportunities')
          .insert([payload]);
        if (err) throw err;
      }
      onSaved();
    } catch (err: unknown) {
      setError((err as Error).message || 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const riskLevelDisplay = form.risk_level;
  const reRiskLevelDisplay = form.re_risk_level;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-5 py-4 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-300" />
            <div>
              <div className="text-xs text-slate-300 font-medium">RİSK DEĞERLENDİRME FORMU</div>
              <div className="text-sm font-bold leading-tight">
                {isEdit ? `${record!.risk_no} — Düzenle` : 'Yeni Risk Kaydı'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit}>
            <div className="p-5 space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">{error}</div>
              )}

              {/* Risk Tipi */}
              <div className="flex gap-3 items-center">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Tip:</span>
                <div className="flex gap-2">
                  {['risk', 'opportunity'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set('risk_type', t)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                        form.risk_type === t
                          ? t === 'risk'
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {t === 'risk' ? 'Risk' : 'Fırsat'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Identification */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-700 text-white px-4 py-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Risk Tanımı</span>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                      Risk Tanımı <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={form.risk_definition}
                      onChange={e => set('risk_definition', e.target.value)}
                      rows={3}
                      required
                      className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      placeholder="Riskin tanımını giriniz..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Riskin Etkisi</label>
                      <textarea
                        value={form.risk_impact}
                        onChange={e => set('risk_impact', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                        placeholder="Olası etkileri..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Etki Alanı</label>
                      <input
                        type="text"
                        value={form.impact_area}
                        onChange={e => set('impact_area', e.target.value)}
                        className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Etki alanı..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Initial Evaluation */}
              <div className="border border-amber-200 rounded-xl overflow-hidden">
                <div className="bg-amber-600 text-white px-4 py-2 flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Değerlendirme</span>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex flex-wrap gap-6 items-end">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-2 uppercase tracking-wide">Olasılık (1-5)</label>
                      <ScoreSelector value={form.probability} onChange={v => set('probability', v)} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-2 uppercase tracking-wide">Şiddet (1-5)</label>
                      <ScoreSelector value={form.severity} onChange={v => set('severity', v)} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-2 uppercase tracking-wide">Risk Derecesi</label>
                      <div className={`px-4 py-1.5 rounded-lg border text-sm font-bold ${getRiskColor(riskLevelDisplay)}`}>
                        {riskLevelDisplay ? `${riskLevelDisplay} — ${getRiskLabel(riskLevelDisplay)}` : '—'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">İlgili Faaliyet</label>
                    <textarea
                      value={form.related_activity}
                      onChange={e => set('related_activity', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      placeholder="İlgili faaliyet açıklaması..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Karar</label>
                    <input
                      type="text"
                      value={form.decision}
                      onChange={e => set('decision', e.target.value)}
                      className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Alınan karar..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Faaliyet Sorumlusu</label>
                      <input
                        type="text"
                        value={form.activity_responsible}
                        onChange={e => set('activity_responsible', e.target.value)}
                        className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Ad Soyad"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Termin</label>
                      <input
                        type="date"
                        value={form.deadline}
                        onChange={e => set('deadline', e.target.value)}
                        className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Planlanan Gözden Geçirme Termini</label>
                      <input
                        type="date"
                        value={form.planned_review_term}
                        onChange={e => set('planned_review_term', e.target.value)}
                        className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Değerlendirme Tarihi</label>
                      <input
                        type="date"
                        value={form.evaluation_date}
                        onChange={e => set('evaluation_date', e.target.value)}
                        className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Değerlendirenler</label>
                    <input
                      type="text"
                      value={form.evaluators}
                      onChange={e => set('evaluators', e.target.value)}
                      className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Değerlendirmeyi yapanlar..."
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-1 border-t border-amber-100">
                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Düzeltici Faaliyet Açılacak mı?</span>
                    <YesNoToggle value={form.requires_df} onChange={v => set('requires_df', v)} />
                    {form.requires_df && (
                      <div className="flex-1">
                        <input
                          type="text"
                          value={form.df_no}
                          onChange={e => set('df_no', e.target.value)}
                          className="w-full px-3 py-1.5 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="DF No"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Re-Evaluation */}
              <div className="border border-blue-200 rounded-xl overflow-hidden">
                <div className="bg-blue-700 text-white px-4 py-2 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Tekrar Değerlendirme</span>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex flex-wrap gap-6 items-end">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-2 uppercase tracking-wide">Olasılık (1-5)</label>
                      <ScoreSelector value={form.re_probability} onChange={v => set('re_probability', v)} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-2 uppercase tracking-wide">Şiddet (1-5)</label>
                      <ScoreSelector value={form.re_severity} onChange={v => set('re_severity', v)} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-2 uppercase tracking-wide">Risk Derecesi</label>
                      <div className={`px-4 py-1.5 rounded-lg border text-sm font-bold ${getRiskColor(reRiskLevelDisplay)}`}>
                        {reRiskLevelDisplay ? `${reRiskLevelDisplay} — ${getRiskLabel(reRiskLevelDisplay)}` : '—'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">İlgili Faaliyet</label>
                    <textarea
                      value={form.re_related_activity}
                      onChange={e => set('re_related_activity', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      placeholder="Tekrar değerlendirme faaliyet açıklaması..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Karar</label>
                    <input
                      type="text"
                      value={form.re_decision}
                      onChange={e => set('re_decision', e.target.value)}
                      className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Alınan karar..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Faaliyet Sorumlusu</label>
                      <input
                        type="text"
                        value={form.re_activity_responsible}
                        onChange={e => set('re_activity_responsible', e.target.value)}
                        className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Ad Soyad"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Termin</label>
                      <input
                        type="date"
                        value={form.re_deadline}
                        onChange={e => set('re_deadline', e.target.value)}
                        className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Tekrar Değerlendirme Tarihi</label>
                      <input
                        type="date"
                        value={form.re_evaluation_date}
                        onChange={e => set('re_evaluation_date', e.target.value)}
                        className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Değerlendirenler</label>
                    <input
                      type="text"
                      value={form.re_evaluators}
                      onChange={e => set('re_evaluators', e.target.value)}
                      className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Tekrar değerlendirmeyi yapanlar..."
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-1 border-t border-blue-100">
                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Düzeltici Faaliyet Açılacak mı?</span>
                    <YesNoToggle value={form.re_requires_df} onChange={v => set('re_requires_df', v)} />
                    {form.re_requires_df && (
                      <div className="flex-1">
                        <input
                          type="text"
                          value={form.re_df_no}
                          onChange={e => set('re_df_no', e.target.value)}
                          className="w-full px-3 py-1.5 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="DF No"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Review & Outcome */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-600 text-white px-4 py-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Gözden Geçirme ve Sonuç</span>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Gözden Geçirme Tarihi</label>
                    <input
                      type="date"
                      value={form.review_date}
                      onChange={e => set('review_date', e.target.value)}
                      className="w-full max-w-xs px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide flex-1">
                      Mevcut risk derecesini değiştirecek bir durum oluştu mu?
                    </span>
                    <YesNoToggle value={form.risk_change_occurred} onChange={v => set('risk_change_occurred', v)} />
                  </div>

                  {form.risk_change_occurred && (
                    <>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Açıklama</label>
                        <textarea
                          value={form.change_explanation}
                          onChange={e => set('change_explanation', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                          placeholder="Açıklama..."
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                          Risk Derecesinde Değişikliğe Sebep Olan Durum
                        </label>
                        <textarea
                          value={form.risk_change_cause}
                          onChange={e => set('risk_change_cause', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                          placeholder="Değişime neden olan durum..."
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                      Fırsatlar / İyileştirmeler
                    </label>
                    <textarea
                      value={form.opportunities_improvements}
                      onChange={e => set('opportunities_improvements', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      placeholder="Fırsatlar ve iyileştirme önerileri..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 pb-5">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-xl hover:bg-slate-900 transition-all font-semibold text-sm disabled:opacity-60 shadow-sm"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Kaydı Oluştur'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-semibold text-sm"
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
