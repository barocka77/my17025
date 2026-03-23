import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

const SURVEY_QUESTIONS = [
  'Teknik altyapımız yeterli mi?',
  'Teknik personelimizin bilgisi yeterli mi?',
  'Teknik personelimizin davranışları uygun mu?',
  'İstediğiniz kişiye rahat ulaşabiliyor musunuz?',
  'Teknik bilgi taleplerinizde yeterli cevap verilebiliyor mu?',
  'Teslim süresi yeterli mi?',
  'Herhangi bir şikayetiniz olduğunda hızlı bir çözüm sağlanıyor mu?',
];

const PREFERENCE_OPTIONS = [
  { key: 'hizmet_kalitesi', label: 'Hizmet kalitesi' },
  { key: 'fiyat_avantaji', label: 'Fiyat avantajı' },
  { key: 'ulasim_kolayligi', label: 'Ulaşım kolaylığı' },
  { key: 'teslim_suresi', label: 'Teslim süresi' },
  { key: 'diger', label: 'Diğer' },
];

interface Props {
  token: string;
}

type PageState = 'loading' | 'ready' | 'already_used' | 'not_found' | 'submitted' | 'error';

export default function PublicSurveyPage({ token }: Props) {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [survey, setSurvey] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [preferences, setPreferences] = useState<string[]>([]);
  const [evaluationTopics, setEvaluationTopics] = useState('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSurvey();
  }, [token]);

  const loadSurvey = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_surveys')
        .select('id, customer_name, authorized_person, survey_date, status, token_used')
        .eq('survey_token', token)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setPageState('not_found');
        return;
      }

      if (data.token_used || data.status === 'completed') {
        setSurvey(data);
        setPageState('already_used');
        return;
      }

      setSurvey(data);
      setPageState('ready');
    } catch (e) {
      console.error(e);
      setPageState('error');
    }
  };

  const setAnswer = (q: number, val: number) => {
    setAnswers(prev => ({ ...prev, [`q${q}`]: val }));
  };

  const togglePreference = (key: string) => {
    setPreferences(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    const missingQs = SURVEY_QUESTIONS.map((_, i) => i + 1).filter(n => !answers[`q${n}`]);
    if (missingQs.length > 0) {
      setError(`Lütfen tüm soruları cevaplayın. (${missingQs.map(n => `Soru ${n}`).join(', ')} eksik)`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('customer_surveys')
        .update({
          q1: answers.q1,
          q2: answers.q2,
          q3: answers.q3,
          q4: answers.q4,
          q5: answers.q5,
          q6: answers.q6,
          q7: answers.q7,
          preference_reasons: preferences,
          evaluation_topics: evaluationTopics || null,
          customer_comments: comments || null,
          status: 'completed',
          token_used: true,
        })
        .eq('survey_token', token)
        .eq('token_used', false);

      if (updateError) throw updateError;
      setPageState('submitted');
    } catch (e: any) {
      setError(e.message || 'Gönderim sırasında bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreBg = (q: number, score: number) => {
    const selected = answers[`q${q}`] === score;
    if (!selected) return 'border-slate-200 text-slate-500 bg-white hover:border-slate-400';
    if (score >= 4) return 'border-green-500 bg-green-500 text-white';
    if (score === 3) return 'border-amber-500 bg-amber-500 text-white';
    return 'border-red-500 bg-red-500 text-white';
  };

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (pageState === 'not_found') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Anket Bulunamadı</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Bu link geçersiz veya süresi dolmuş. Lütfen size gönderilen linki kontrol edin.
          </p>
        </div>
      </div>
    );
  }

  if (pageState === 'already_used') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Anket Zaten Dolduruldu</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Bu anketi daha önce doldurdunuz. Katılımınız için teşekkür ederiz.
          </p>
          {survey?.customer_name && (
            <p className="text-[12px] text-slate-400 mt-3">Firma: {survey.customer_name}</p>
          )}
        </div>
      </div>
    );
  }

  if (pageState === 'submitted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Teşekkür Ederiz!</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Anket cevaplarınız başarıyla kaydedildi. Değerli geri bildiriminiz için teşekkür ederiz.
          </p>
          <div className="mt-6 bg-slate-50 rounded-xl p-4 text-left">
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">UMS Kalite</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Elektriksel Kalibrasyon · Deney · Eğitim · Danışmanlık
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Bir Hata Oluştu</h2>
          <p className="text-sm text-slate-500">Lütfen sayfayı yenileyin ve tekrar deneyin.</p>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / 7) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm">UMS</span>
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-800">UMS Kalite Elektriksel Kalibrasyon</p>
              <p className="text-[10px] text-slate-500">Müşteri Memnuniyeti Anketi</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <p className="text-[12px] text-slate-600 leading-relaxed mb-4">
            Sayın müşterimiz;<br />
            <strong>Hizmet kalitemizi arttırabilmek adına, desteklerinizi bekliyoruz.</strong><br />
            Zamanınızı ayırıp cevapladığınız için teşekkür eder, iyi çalışmalar dileriz.
          </p>
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Firma</p>
              <p className="text-[13px] font-bold text-slate-800">{survey?.customer_name}</p>
            </div>
            {survey?.authorized_person && (
              <>
                <div className="w-px h-8 bg-slate-200" />
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Yetkili</p>
                  <p className="text-[13px] font-semibold text-slate-700">{survey.authorized_person}</p>
                </div>
              </>
            )}
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500 font-semibold">{answeredCount} / 7 soru cevaplandı</span>
              <span className="text-[10px] text-slate-500">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider">Değerlendirme Soruları</span>
            <span className="text-[10px] text-slate-400">5 : En iyi — 1 : En kötü</span>
          </div>
          <div className="divide-y divide-slate-100">
            {SURVEY_QUESTIONS.map((question, idx) => {
              const qn = idx + 1;
              const answered = !!answers[`q${qn}`];
              return (
                <div key={idx} className={`px-5 py-4 ${answered ? 'bg-white' : 'bg-white'}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <span className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      answered ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {qn}
                    </span>
                    <p className="text-[13px] text-slate-700 font-medium leading-snug">{question}</p>
                  </div>
                  <div className="flex gap-2 pl-9">
                    {[5, 4, 3, 2, 1].map(score => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setAnswer(qn, score)}
                        className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold border-2 transition-all ${getScoreBg(qn, score)}`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  {answers[`q${qn}`] && (
                    <div className="flex items-center gap-1 pl-9 mt-2">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      <span className="text-[10px] text-green-600 font-semibold">Seçildi: {answers[`q${qn}`]}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-800 text-white px-5 py-3">
            <span className="text-[11px] font-bold uppercase tracking-wider">Soru 8 — Tercih Sebebi</span>
            <p className="text-[10px] text-slate-400 mt-0.5">Laboratuvarımızı tercih sebebiniz (çoklu seçim yapabilirsiniz)</p>
          </div>
          <div className="px-5 py-4">
            <div className="grid grid-cols-2 gap-2">
              {PREFERENCE_OPTIONS.map(opt => {
                const selected = preferences.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => togglePreference(opt.key)}
                    className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-[12px] font-semibold transition-all text-left ${
                      selected
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      selected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                    }`}>
                      {selected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-800 text-white px-5 py-3">
            <span className="text-[11px] font-bold uppercase tracking-wider">Değerlendirilmesini İstediğiniz Konular</span>
          </div>
          <div className="px-5 py-4">
            <textarea
              value={evaluationTopics}
              onChange={e => setEvaluationTopics(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 text-[13px] border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-slate-700"
              placeholder="Değerlendirmemizi istediğiniz konuları buraya yazabilirsiniz..."
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-800 text-white px-5 py-3">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ek Görüş ve Öneriler</span>
          </div>
          <div className="px-5 py-4">
            <textarea
              value={comments}
              onChange={e => setComments(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 text-[13px] border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-slate-700"
              placeholder="Ek yorum, öneri veya geri bildiriminizi buraya yazabilirsiniz..."
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-blue-700 text-white px-6 py-4 rounded-2xl hover:bg-blue-800 transition-all font-bold text-[14px] disabled:opacity-60 shadow-lg shadow-blue-200"
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
          {submitting ? 'Gönderiliyor...' : 'Anketi Tamamla ve Gönder'}
        </button>

        <p className="text-center text-[10px] text-slate-400 pb-6">
          UMS Kalite Elektriksel Kalibrasyon Deney Eğitim Danışmanlık Mühendislik San. Ve Tic. Ltd. Şti.<br />
          Alınteri Bulvarı 1151. Sk Gül 86 Sitesi No: 1 Yenimahalle / ANKARA · T: 0312 395 85 36
        </p>
      </div>
    </div>
  );
}
