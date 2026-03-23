import { useState, useEffect } from 'react';
import { BarChart2, Users, Clock, CheckCircle2, Plus, CreditCard as Edit2, Trash2, Calendar, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Link, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CustomerSurveyModal from './CustomerSurveyModal';

const SURVEY_QUESTIONS = [
  'Teknik altyapımız yeterli mi?',
  'Teknik personelimizin bilgisi yeterli mi?',
  'Teknik personelimizin davranışları uygun mu?',
  'İstediğiniz kişiye rahat ulaşabiliyor musunuz?',
  'Teknik bilgi taleplerinizde yeterli cevap verilebiliyor mu?',
  'Teslim süresi yeterli mi?',
  'Herhangi bir şikayetiniz olduğunda hızlı bir çözüm sağlanıyor mu?',
];

const PREFERENCE_LABELS: Record<string, string> = {
  hizmet_kalitesi: 'Hizmet kalitesi',
  fiyat_avantaji: 'Fiyat avantajı',
  ulasim_kolayligi: 'Ulaşım kolaylığı',
  teslim_suresi: 'Teslim süresi',
  diger: 'Diğer',
};

interface Survey {
  id: string;
  customer_name: string;
  authorized_person: string | null;
  survey_date: string;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
  q5: number | null;
  q6: number | null;
  q7: number | null;
  preference_reasons: string[];
  evaluation_topics: string | null;
  customer_comments: string | null;
  status: string;
  survey_token: string;
  token_used: boolean;
  created_at: string;
}

const getScoreColor = (score: number) => {
  if (score >= 4) return 'text-green-700 bg-green-100';
  if (score >= 3) return 'text-amber-700 bg-amber-100';
  return 'text-red-700 bg-red-100';
};

const getBarColor = (score: number) => {
  if (score >= 4) return 'bg-green-500';
  if (score >= 3) return 'bg-amber-400';
  return 'bg-red-500';
};

function ScoreBadge({ score }: { score: number | null }) {
  if (!score) return <span className="text-[11px] text-slate-300">—</span>;
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold ${getScoreColor(score)}`}>
      {score}
    </span>
  );
}

function MiniBar({ value, max = 5 }: { value: number; max?: number }) {
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${getBarColor(value)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[11px] font-bold w-8 text-right ${
        value >= 4 ? 'text-green-700' : value >= 3 ? 'text-amber-600' : 'text-red-600'
      }`}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function TrendIcon({ value }: { value: number }) {
  if (value >= 4) return <TrendingUp className="w-3.5 h-3.5 text-green-600" />;
  if (value >= 3) return <Minus className="w-3.5 h-3.5 text-amber-500" />;
  return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
}

export default function CustomerSurveyView() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<Survey | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => { fetchSurveys(); }, []);

  const fetchSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_surveys')
        .select('*')
        .order('survey_date', { ascending: false });
      if (error) throw error;
      setSurveys(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu anketi silmek istediğinize emin misiniz?')) return;
    await supabase.from('customer_surveys').delete().eq('id', id);
    fetchSurveys();
  };

  const handleEdit = (survey: Survey) => {
    setEditData(survey);
    setIsModalOpen(true);
  };

  const handleCopyLink = async (token: string) => {
    const url = `${window.location.origin}/#survey/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const completedSurveys = surveys.filter(s => s.status === 'completed');
  const pendingSurveys = surveys.filter(s => s.status === 'pending');

  const getSurveyAvg = (s: Survey) => {
    const scores = [s.q1, s.q2, s.q3, s.q4, s.q5, s.q6, s.q7].filter((v): v is number => v != null && v > 0);
    if (!scores.length) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };

  const getQuestionAvg = (qIdx: number) => {
    const field = `q${qIdx + 1}` as keyof Survey;
    const vals = completedSurveys.map(s => s[field] as number | null).filter((v): v is number => v != null && v > 0);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const overallAvg = (() => {
    const avgs = completedSurveys.map(getSurveyAvg).filter((v): v is number => v != null);
    if (!avgs.length) return null;
    return avgs.reduce((a, b) => a + b, 0) / avgs.length;
  })();

  const preferenceCount: Record<string, number> = {};
  completedSurveys.forEach(s => {
    (s.preference_reasons || []).forEach(r => {
      preferenceCount[r] = (preferenceCount[r] || 0) + 1;
    });
  });
  const maxPrefCount = Math.max(1, ...Object.values(preferenceCount));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 md:py-5 pt-16 md:pt-5 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Müşteri Anketleri</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">ISO 17025 Müşteri Memnuniyeti</p>
          </div>
          <button
            onClick={() => { setEditData(undefined); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2.5 rounded-xl hover:bg-blue-800 transition-all font-semibold text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Yeni Anket
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-3 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 opacity-80" />
              <span className="text-[10px] font-semibold uppercase opacity-80">Toplam Anket</span>
            </div>
            <div className="text-2xl font-bold">{surveys.length}</div>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl p-3 text-white">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 opacity-80" />
              <span className="text-[10px] font-semibold uppercase opacity-80">Tamamlanan</span>
            </div>
            <div className="text-2xl font-bold">{completedSurveys.length}</div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-3 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 opacity-80" />
              <span className="text-[10px] font-semibold uppercase opacity-80">Bekleyen</span>
            </div>
            <div className="text-2xl font-bold">{pendingSurveys.length}</div>
          </div>
          <div className={`rounded-xl p-3 text-white ${
            overallAvg == null ? 'bg-gradient-to-br from-slate-500 to-slate-600' :
            overallAvg >= 4 ? 'bg-gradient-to-br from-green-600 to-teal-700' :
            overallAvg >= 3 ? 'bg-gradient-to-br from-amber-500 to-amber-600' :
            'bg-gradient-to-br from-red-600 to-red-700'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 className="w-4 h-4 opacity-80" />
              <span className="text-[10px] font-semibold uppercase opacity-80">Genel Ortalama</span>
            </div>
            <div className="text-2xl font-bold">{overallAvg != null ? overallAvg.toFixed(2) : '—'}</div>
          </div>
        </div>

        <div className="flex gap-1 mt-4">
          {(['list', 'analytics'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab === 'list' ? 'Anket Listesi' : 'Analiz & Grafikler'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {activeTab === 'list' && (
          <div className="space-y-2 max-w-4xl mx-auto">
            {surveys.length === 0 ? (
              <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                <BarChart2 className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                <p className="text-slate-600 font-medium text-sm">Henüz anket kaydı yok</p>
                <p className="text-slate-400 text-[11px] mt-1">Yeni anket oluşturmak için butonu kullanın</p>
              </div>
            ) : (
              surveys.map(survey => {
                const avg = getSurveyAvg(survey);
                const isExpanded = expandedId === survey.id;
                return (
                  <div key={survey.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/50"
                      onClick={() => setExpandedId(isExpanded ? null : survey.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-bold text-slate-800">{survey.customer_name}</span>
                          {survey.authorized_person && (
                            <span className="text-[11px] text-slate-500">{survey.authorized_person}</span>
                          )}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            survey.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {survey.status === 'completed' ? (
                              <><CheckCircle2 className="w-2.5 h-2.5" /> Tamamlandı</>
                            ) : (
                              <><Clock className="w-2.5 h-2.5" /> Bekliyor</>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Calendar className="w-2.5 h-2.5 text-slate-400" />
                          <span className="text-[10px] text-slate-400">{new Date(survey.survey_date).toLocaleDateString('tr-TR')}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {avg != null && (
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${getScoreColor(avg)}`}>
                            {avg.toFixed(2)} / 5
                          </span>
                        )}
                        {survey.status === 'pending' && (
                          <button
                            onClick={e => { e.stopPropagation(); handleCopyLink(survey.survey_token); }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Anket linkini kopyala"
                          >
                            {copiedToken === survey.survey_token
                              ? <Check className="w-3.5 h-3.5 text-green-600" />
                              : <Link className="w-3.5 h-3.5" />
                            }
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); handleEdit(survey); }}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(survey.id); }}
                          className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-slate-400" />
                          : <ChevronDown className="w-4 h-4 text-slate-400" />
                        }
                      </div>
                    </div>

                    {isExpanded && survey.status === 'completed' && (
                      <div className="border-t border-slate-100 px-4 py-4 bg-slate-50/30 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {SURVEY_QUESTIONS.map((q, idx) => {
                            const field = `q${idx + 1}` as keyof Survey;
                            const val = survey[field] as number | null;
                            return (
                              <div key={idx} className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] text-slate-600 leading-snug mb-1">{q}</p>
                                  {val ? (
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${getBarColor(val)}`}
                                          style={{ width: `${(val / 5) * 100}%` }}
                                        />
                                      </div>
                                      <span className={`text-[11px] font-bold ${
                                        val >= 4 ? 'text-green-700' : val >= 3 ? 'text-amber-600' : 'text-red-600'
                                      }`}>{val}</span>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-slate-300">Cevap yok</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {(survey.preference_reasons || []).length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Tercih Sebepleri</p>
                            <div className="flex flex-wrap gap-1.5">
                              {survey.preference_reasons.map(r => (
                                <span key={r} className="px-2.5 py-1 bg-blue-100 text-blue-700 text-[11px] font-semibold rounded-full">
                                  {PREFERENCE_LABELS[r] || r}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {survey.evaluation_topics && (
                          <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Değerlendirilmesi İstenen Konular</p>
                            <p className="text-[12px] text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-lg px-3 py-2">{survey.evaluation_topics}</p>
                          </div>
                        )}

                        {survey.customer_comments && (
                          <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Ek Görüşler</p>
                            <p className="text-[12px] text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-lg px-3 py-2">{survey.customer_comments}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {isExpanded && survey.status === 'pending' && (
                      <div className="border-t border-amber-100 bg-amber-50/50 px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-[12px] font-semibold text-amber-800">Anket bekleniyor</p>
                            <p className="text-[11px] text-amber-600 mt-0.5">Müşteri anketi henüz doldurmadı.</p>
                          </div>
                          <button
                            onClick={() => handleCopyLink(survey.survey_token)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-[11px] font-semibold hover:bg-amber-700 transition-colors"
                          >
                            {copiedToken === survey.survey_token
                              ? <><Check className="w-3 h-3" /> Kopyalandı</>
                              : <><Copy className="w-3 h-3" /> Linki Kopyala</>
                            }
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="max-w-4xl mx-auto space-y-5">
            {completedSurveys.length === 0 ? (
              <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                <BarChart2 className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                <p className="text-slate-600 font-medium text-sm">Analiz için tamamlanmış anket yok</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-700 text-white">
                    <h2 className="text-[12px] font-bold uppercase tracking-wider">Soru Bazlı Ortalamalar</h2>
                    <p className="text-[10px] text-slate-400 mt-0.5">{completedSurveys.length} tamamlanmış anket</p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {SURVEY_QUESTIONS.map((question, idx) => {
                      const avg = getQuestionAvg(idx);
                      if (avg == null) return null;
                      return (
                        <div key={idx} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50/50">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </span>
                          <p className="flex-1 text-[12px] text-slate-700 leading-snug">{question}</p>
                          <div className="w-40 flex-shrink-0">
                            <MiniBar value={avg} />
                          </div>
                          <TrendIcon value={avg} />
                        </div>
                      );
                    })}
                  </div>
                  {overallAvg != null && (
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Genel Ortalama</span>
                      <span className={`text-base font-bold px-3 py-1 rounded-lg ${getScoreColor(overallAvg)}`}>
                        {overallAvg.toFixed(2)} / 5.00
                      </span>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-700 text-white">
                    <h2 className="text-[12px] font-bold uppercase tracking-wider">Tercih Sebepleri Dağılımı</h2>
                    <p className="text-[10px] text-slate-400 mt-0.5">Çoklu seçim — {completedSurveys.length} anket</p>
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    {Object.keys(PREFERENCE_LABELS).map(key => {
                      const count = preferenceCount[key] || 0;
                      const pct = completedSurveys.length > 0 ? (count / completedSurveys.length) * 100 : 0;
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <span className="w-28 text-[11px] text-slate-600 font-medium text-right flex-shrink-0">{PREFERENCE_LABELS[key]}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all flex items-center justify-end pr-2"
                              style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                            >
                              {count > 0 && <span className="text-[10px] font-bold text-white">{count}</span>}
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-500 w-10 flex-shrink-0">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      );
                    })}
                    {Object.keys(preferenceCount).length === 0 && (
                      <p className="text-[12px] text-slate-400 italic py-2">Henüz tercih sebebi seçilmemiş.</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-700 text-white">
                    <h2 className="text-[12px] font-bold uppercase tracking-wider">Müşteri Bazlı Özet</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Firma</th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Tarih</th>
                          {[1,2,3,4,5,6,7].map(n => (
                            <th key={n} className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase w-8">S{n}</th>
                          ))}
                          <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Ort.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {completedSurveys.map(survey => {
                          const avg = getSurveyAvg(survey);
                          return (
                            <tr key={survey.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2">
                                <div className="text-[12px] font-semibold text-slate-800 leading-tight">{survey.customer_name}</div>
                                {survey.authorized_person && (
                                  <div className="text-[10px] text-slate-400">{survey.authorized_person}</div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-[11px] text-slate-500 whitespace-nowrap">
                                {new Date(survey.survey_date).toLocaleDateString('tr-TR')}
                              </td>
                              {[survey.q1, survey.q2, survey.q3, survey.q4, survey.q5, survey.q6, survey.q7].map((q, i) => (
                                <td key={i} className="px-2 py-2 text-center">
                                  <ScoreBadge score={q} />
                                </td>
                              ))}
                              <td className="px-3 py-2 text-center">
                                {avg != null ? (
                                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${getScoreColor(avg)}`}>
                                    {avg.toFixed(2)}
                                  </span>
                                ) : <span className="text-slate-300 text-[11px]">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {completedSurveys.some(s => s.evaluation_topics) && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-700 text-white">
                      <h2 className="text-[12px] font-bold uppercase tracking-wider">Değerlendirilmesi İstenen Konular</h2>
                    </div>
                    <div className="p-4 space-y-3">
                      {completedSurveys.filter(s => s.evaluation_topics).map(s => (
                        <div key={s.id} className="flex gap-3">
                          <span className="text-[11px] font-bold text-slate-600 w-32 flex-shrink-0 pt-0.5">{s.customer_name}</span>
                          <p className="text-[12px] text-slate-700 leading-relaxed bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 flex-1">
                            {s.evaluation_topics}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <CustomerSurveyModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditData(undefined); }}
        onSuccess={fetchSurveys}
        editData={editData}
      />
    </div>
  );
}
