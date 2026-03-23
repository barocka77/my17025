import { useState, useEffect } from 'react';
import {
  ArrowLeft, Plus, Trash2, Save, ChevronDown, ChevronUp,
  CheckCircle2, Clock, AlertCircle, Users, FileText, ClipboardList
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const AGENDA_SECTIONS = [
  { key: 'internal_external_changes', label: 'İç ve Dış Meselelerdeki Değişiklikler' },
  { key: 'objectives_status', label: 'Hedeflerin Yerine Getirilmesi' },
  { key: 'policy_procedure_adequacy', label: 'Politika ve Prosedürlerin Uygunluğu' },
  { key: 'previous_review_status', label: 'Önceki YGG Faaliyetlerinin Durumu' },
  { key: 'internal_audit_results', label: 'Son Yapılan İç Tetkiklerin Sonucu' },
  { key: 'corrective_actions_status', label: 'Düzeltici Faaliyetler' },
  { key: 'external_assessments', label: 'Dış Kuruluşlar Tarafından Yapılan Değerlendirmeler' },
  { key: 'workload_changes', label: 'İşin Hacmi ve Tipindeki / Faaliyetlerin Aralığındaki Değişiklikler' },
  { key: 'customer_feedback_summary', label: 'Müşteri ve Personel Geri Bildirimleri' },
  { key: 'complaints_summary', label: 'Şikayetler' },
  { key: 'improvements_effectiveness', label: 'Uygulanan İyileştirmelerin Etkililiği' },
  { key: 'resources_adequacy', label: 'Kaynakların Yeterliliği' },
  { key: 'risk_assessment_results', label: 'Risk Tanımlamalarının Sonuçları' },
  { key: 'results_validity_outputs', label: 'Sonuçların Geçerliliğinin Güvence Altına Alınmasının Çıktıları' },
  { key: 'other_factors', label: 'İzleme Faaliyetleri ve Eğitim Gibi Diğer İlgili Faktörler' },
];

const MINUTES_OUTPUTS = [
  { key: 'management_system_effectiveness', label: 'Yönetim Sistemi ve Proseslerinin Etkililiği' },
  { key: 'iso_requirements_improvements', label: 'ISO 17025 Gerekliliklerinin Yerine Getirilmesi ile İlgili İyileştirmeler' },
  { key: 'resource_needs', label: 'Gerekli Kaynakların Temini' },
  { key: 'change_needs', label: 'Her Türlü Değişim İhtiyacı' },
];

const DECISION_TYPES: Record<string, { label: string; color: string }> = {
  action: { label: 'Aksiyon', color: 'bg-blue-100 text-blue-700' },
  corrective: { label: 'Düzeltici Faaliyet', color: 'bg-red-100 text-red-700' },
  improvement: { label: 'İyileştirme', color: 'bg-emerald-100 text-emerald-700' },
  resource: { label: 'Kaynak Kararı', color: 'bg-amber-100 text-amber-700' },
  other: { label: 'Diğer', color: 'bg-slate-100 text-slate-600' },
};

const DECISION_STATUSES: Record<string, { label: string; color: string }> = {
  open: { label: 'Açık', color: 'bg-red-100 text-red-700' },
  in_progress: { label: 'Devam Ediyor', color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Tamamlandı', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'İptal', color: 'bg-slate-100 text-slate-500' },
};

interface Props {
  review: any;
  onBack: () => void;
}

type Tab = 'agenda' | 'minutes' | 'decisions';

export default function ManagementReviewDetailView({ review, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('agenda');
  const [reviewData, setReviewData] = useState<any>(review);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDecision, setExpandedDecision] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState(review.status);

  useEffect(() => { fetchDecisions(); }, [review.id]);

  const fetchDecisions = async () => {
    try {
      const { data } = await supabase
        .from('management_review_decisions')
        .select('*')
        .eq('review_id', review.id)
        .order('created_at');
      setDecisions(data || []);
    } finally {
      setLoading(false);
    }
  };

  const updateReviewField = async (field: string, value: string) => {
    setReviewData((prev: any) => ({ ...prev, [field]: value }));
    await supabase
      .from('management_reviews')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', review.id);
  };

  const updateStatus = async (status: string) => {
    setReviewStatus(status);
    await supabase.from('management_reviews').update({ status, updated_at: new Date().toISOString() }).eq('id', review.id);
  };

  const addDecision = async () => {
    const decNo = `K-${review.meeting_year || new Date().getFullYear()}-${String(decisions.length + 1).padStart(2, '0')}`;
    const { data, error } = await supabase
      .from('management_review_decisions')
      .insert([{
        review_id: review.id,
        decision_no: decNo,
        decision_type: 'action',
        description: '',
        responsible_person: '',
        planned_date: null,
        status: 'open',
        completion_notes: '',
      }])
      .select()
      .single();
    if (!error && data) {
      setDecisions(prev => [...prev, data]);
      setExpandedDecision(data.id);
    }
  };

  const updateDecision = async (id: string, changes: any) => {
    setDecisions(prev => prev.map(d => d.id === id ? { ...d, ...changes } : d));
    await supabase.from('management_review_decisions').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id);
  };

  const deleteDecision = async (id: string) => {
    if (!confirm('Bu kararı silmek istediğinize emin misiniz?')) return;
    await supabase.from('management_review_decisions').delete().eq('id', id);
    setDecisions(prev => prev.filter(d => d.id !== id));
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    planned: { label: 'Planlandı', color: 'bg-slate-100 text-slate-600' },
    in_progress: { label: 'Devam Ediyor', color: 'bg-amber-100 text-amber-700' },
    completed: { label: 'Tamamlandı', color: 'bg-green-100 text-green-700' },
  };

  const decisionStats = {
    total: decisions.length,
    open: decisions.filter(d => d.status === 'open').length,
    in_progress: decisions.filter(d => d.status === 'in_progress').length,
    completed: decisions.filter(d => d.status === 'completed').length,
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-[11px] font-semibold transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Geri
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-[12px] font-semibold text-slate-700">
            {review.meeting_no || `YGG ${review.meeting_year}`}
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900">
                Yönetimin Gözden Geçirmesi
                {review.meeting_no && <span className="text-slate-500 font-normal"> — {review.meeting_no}</span>}
              </h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusConfig[reviewStatus]?.color}`}>
                {statusConfig[reviewStatus]?.label}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                review.meeting_type === 'periodic' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {review.meeting_type === 'periodic' ? 'Periyodik' : 'Olağanüstü'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              {review.meeting_date && (
                <span className="text-[11px] text-slate-500">
                  {new Date(review.meeting_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
              {review.meeting_location && (
                <span className="text-[11px] text-slate-500">{review.meeting_location}</span>
              )}
              {review.chairperson && (
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Users className="w-3 h-3" />
                  Başkan: {review.chairperson}
                </span>
              )}
            </div>
            {(review.participants || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {review.participants.map((p: string) => (
                  <span key={p} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{p}</span>
                ))}
              </div>
            )}
          </div>
          <select
            value={reviewStatus}
            onChange={e => updateStatus(e.target.value)}
            className="px-3 py-1.5 text-[11px] border border-slate-300 rounded-lg bg-white font-semibold text-slate-700 flex-shrink-0"
          >
            <option value="planned">Planlandı</option>
            <option value="in_progress">Devam Ediyor</option>
            <option value="completed">Tamamlandı</option>
          </select>
        </div>

        <div className="flex gap-1 mt-4 flex-wrap">
          {([
            { key: 'agenda', label: 'Değerlendirme Raporu', icon: FileText },
            { key: 'minutes', label: 'Toplantı Tutanağı', icon: ClipboardList },
            { key: 'decisions', label: `Kararlar (${decisionStats.total})`, icon: CheckCircle2 },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.key === 'decisions' && decisionStats.open > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {decisionStats.open}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {activeTab === 'agenda' && (
          <div className="max-w-3xl mx-auto space-y-3">
            <p className="text-[11px] text-slate-500">
              Yönetim Sistemi Değerlendirme Raporu gündem maddeleri (PR01.10 §5.2)
            </p>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-emerald-700 text-white px-5 py-3">
                <span className="text-[12px] font-bold uppercase tracking-wider">Gündem Maddeleri</span>
                <p className="text-[10px] text-emerald-300 mt-0.5">TS EN ISO/IEC 17025 §8.9 kapsamında değerlendirme</p>
              </div>
              <div className="divide-y divide-slate-100">
                {AGENDA_SECTIONS.map((section, idx) => (
                  <div key={section.key} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">{section.label}</label>
                        <textarea
                          value={reviewData[section.key] || ''}
                          onChange={e => updateReviewField(section.key, e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 text-[11px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all resize-none text-slate-700"
                          placeholder={`${section.label} hakkında değerlendirme...`}
                        />
                        {reviewData[section.key] && (
                          <div className="flex items-center gap-1 mt-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            <span className="text-[10px] text-green-600">Dolduruldu</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'minutes' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <p className="text-[11px] text-slate-500">
              Toplantı Tutanağı (PR01.10 §5.4) — Toplantı çıktıları ve kararlar
            </p>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-emerald-700 text-white px-5 py-3">
                <span className="text-[12px] font-bold uppercase tracking-wider">Açılış Konuşması</span>
              </div>
              <div className="p-5">
                <textarea
                  value={reviewData.opening_speech || ''}
                  onChange={e => updateReviewField('opening_speech', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-[11px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-400 transition-all resize-none"
                  placeholder="Şirket Müdürü'nün açılış konuşmasının özeti..."
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-emerald-700 text-white px-5 py-3">
                <span className="text-[12px] font-bold uppercase tracking-wider">Toplantı Çıktıları (§5.4)</span>
                <p className="text-[10px] text-emerald-300 mt-0.5">Asgari içermesi gereken kararlar ve faaliyetler</p>
              </div>
              <div className="divide-y divide-slate-100">
                {MINUTES_OUTPUTS.map((field, idx) => (
                  <div key={field.key} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">{field.label}</label>
                        <textarea
                          value={reviewData[field.key] || ''}
                          onChange={e => updateReviewField(field.key, e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 text-[11px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-400 transition-all resize-none"
                          placeholder={`${field.label} ile ilgili kararlar ve açıklamalar...`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-emerald-700 text-white px-5 py-3">
                <span className="text-[12px] font-bold uppercase tracking-wider">Genel Sonuç</span>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Genel Sonuç ve Değerlendirme</label>
                  <textarea
                    value={reviewData.general_conclusion || ''}
                    onChange={e => updateReviewField('general_conclusion', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 text-[11px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-400 transition-all resize-none"
                    placeholder="Toplantının genel sonucu ve değerlendirmesi..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Tutanağı Hazırlayan</label>
                    <input
                      type="text"
                      value={reviewData.minutes_prepared_by || ''}
                      onChange={e => updateReviewField('minutes_prepared_by', e.target.value)}
                      className="w-full px-3 py-2 text-[11px] border border-slate-200 rounded-lg"
                      placeholder="Kalite Yöneticisi"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Tutanak Dağıtım Tarihi</label>
                    <input
                      type="date"
                      value={reviewData.minutes_distributed_date || ''}
                      onChange={e => updateReviewField('minutes_distributed_date', e.target.value)}
                      className="w-full px-3 py-2 text-[11px] border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  Not: Toplantı tutanağı, toplantıyı takip eden 2 gün içinde tüm katılımcılara dağıtılmalıdır (§5.4).
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'decisions' && (
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-500">Toplantı kararları ve takip faaliyetleri (§5.5)</p>
                {decisionStats.total > 0 && (
                  <div className="flex gap-4 mt-1">
                    {[
                      { label: 'Toplam', value: decisionStats.total, color: 'text-slate-600' },
                      { label: 'Açık', value: decisionStats.open, color: 'text-red-600' },
                      { label: 'Devam', value: decisionStats.in_progress, color: 'text-amber-600' },
                      { label: 'Tamam', value: decisionStats.completed, color: 'text-green-600' },
                    ].map(s => (
                      <div key={s.label} className="text-center">
                        <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-[9px] text-slate-400 uppercase">{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={addDecision}
                className="flex items-center gap-1.5 bg-emerald-700 text-white px-3 py-2 rounded-lg text-[11px] font-semibold hover:bg-emerald-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Karar Ekle
              </button>
            </div>

            {decisions.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                <p className="text-slate-500 text-sm font-medium">Henüz karar kaydı yok</p>
                <p className="text-slate-400 text-[11px] mt-1">Toplantıda alınan kararları buraya ekleyin</p>
              </div>
            ) : (
              decisions.map(decision => {
                const isExpanded = expandedDecision === decision.id;
                const dtStyle = DECISION_TYPES[decision.decision_type] || DECISION_TYPES.other;
                const dsStyle = DECISION_STATUSES[decision.status] || DECISION_STATUSES.open;
                return (
                  <div key={decision.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/50"
                      onClick={() => setExpandedDecision(isExpanded ? null : decision.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[12px] font-bold text-slate-800">{decision.decision_no}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${dtStyle.color}`}>{dtStyle.label}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${dsStyle.color}`}>{dsStyle.label}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                          {decision.description || <span className="italic text-slate-400">Açıklama girilmedi</span>}
                        </p>
                        {decision.responsible_person && (
                          <p className="text-[10px] text-slate-400 mt-0.5">Sorumlu: {decision.responsible_person}</p>
                        )}
                        {decision.planned_date && (
                          <p className="text-[10px] text-slate-400">
                            Hedef: {new Date(decision.planned_date).toLocaleDateString('tr-TR')}
                            {decision.planned_date < new Date().toISOString().split('T')[0] && decision.status !== 'completed' && (
                              <span className="ml-1 text-red-500 font-semibold">— Gecikmiş</span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); deleteDecision(decision.id); }}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/30 px-4 py-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Karar No</label>
                            <input type="text" value={decision.decision_no}
                              onChange={e => updateDecision(decision.id, { decision_no: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Karar Türü</label>
                            <select value={decision.decision_type}
                              onChange={e => updateDecision(decision.id, { decision_type: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white">
                              {Object.entries(DECISION_TYPES).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Durum</label>
                            <select value={decision.status}
                              onChange={e => updateDecision(decision.id, { status: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white">
                              <option value="open">Açık</option>
                              <option value="in_progress">Devam Ediyor</option>
                              <option value="completed">Tamamlandı</option>
                              <option value="cancelled">İptal</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Sorumlu Kişi</label>
                            <input type="text" value={decision.responsible_person}
                              onChange={e => updateDecision(decision.id, { responsible_person: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white"
                              placeholder="Ad Soyad" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Hedef Tarih</label>
                            <input type="date" value={decision.planned_date || ''}
                              onChange={e => updateDecision(decision.id, { planned_date: e.target.value || null })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Gerçekleşme Tarihi</label>
                            <input type="date" value={decision.actual_date || ''}
                              onChange={e => updateDecision(decision.id, { actual_date: e.target.value || null })}
                              className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Karar Açıklaması</label>
                          <textarea value={decision.description}
                            onChange={e => updateDecision(decision.id, { description: e.target.value })}
                            rows={3} className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white resize-none"
                            placeholder="Alınan kararın detaylı açıklaması..." />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Tamamlanma Notu</label>
                          <textarea value={decision.completion_notes}
                            onChange={e => updateDecision(decision.id, { completion_notes: e.target.value })}
                            rows={2} className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white resize-none"
                            placeholder="Kararın uygulanma durumu ve sonucu..." />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
