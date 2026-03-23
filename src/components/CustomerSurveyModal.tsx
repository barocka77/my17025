import { useState, useEffect } from 'react';
import { X, Save, Link, Copy, Check, Send } from 'lucide-react';
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
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
}

interface FormData {
  customer_name: string;
  authorized_person: string;
  survey_date: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: number;
  q6: number;
  q7: number;
  preference_reasons: string[];
  evaluation_topics: string;
  customer_comments: string;
}

const defaultForm: FormData = {
  customer_name: '',
  authorized_person: '',
  survey_date: new Date().toISOString().split('T')[0],
  q1: 0,
  q2: 0,
  q3: 0,
  q4: 0,
  q5: 0,
  q6: 0,
  q7: 0,
  preference_reasons: [],
  evaluation_topics: '',
  customer_comments: '',
};

export default function CustomerSurveyModal({ isOpen, onClose, onSuccess, editData }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultForm);
  const [mode, setMode] = useState<'direct' | 'link'>('direct');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setFormData({
          customer_name: editData.customer_name || '',
          authorized_person: editData.authorized_person || '',
          survey_date: editData.survey_date || new Date().toISOString().split('T')[0],
          q1: editData.q1 || 0,
          q2: editData.q2 || 0,
          q3: editData.q3 || 0,
          q4: editData.q4 || 0,
          q5: editData.q5 || 0,
          q6: editData.q6 || 0,
          q7: editData.q7 || 0,
          preference_reasons: editData.preference_reasons || [],
          evaluation_topics: editData.evaluation_topics || '',
          customer_comments: editData.customer_comments || '',
        });
      } else {
        setFormData(defaultForm);
      }
      setGeneratedToken(null);
      setMode('direct');
      setError(null);
    }
  }, [isOpen, editData]);

  const togglePreference = (key: string) => {
    setFormData(prev => ({
      ...prev,
      preference_reasons: prev.preference_reasons.includes(key)
        ? prev.preference_reasons.filter(k => k !== key)
        : [...prev.preference_reasons, key],
    }));
  };

  const setQuestion = (field: keyof FormData, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateAverage = () => {
    const scores = [formData.q1, formData.q2, formData.q3, formData.q4, formData.q5, formData.q6, formData.q7].filter(v => v > 0);
    if (scores.length === 0) return null;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
  };

  const handleSendLink = async () => {
    if (!formData.customer_name.trim()) {
      setError('Müşteri adı zorunludur.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('customer_surveys')
        .insert([{
          customer_name: formData.customer_name.trim(),
          authorized_person: formData.authorized_person.trim() || null,
          survey_date: formData.survey_date,
          status: 'pending',
          token_used: false,
          preference_reasons: [],
          evaluation_topics: '',
          customer_comments: '',
        }])
        .select('survey_token')
        .single();
      if (err) throw err;
      setGeneratedToken(data.survey_token);
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const scores = [formData.q1, formData.q2, formData.q3, formData.q4, formData.q5, formData.q6, formData.q7];
    if (scores.some(s => s === 0)) {
      setError('Lütfen tüm soruları değerlendirin.');
      return;
    }
    if (!formData.customer_name.trim()) {
      setError('Müşteri adı zorunludur.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        customer_name: formData.customer_name.trim(),
        authorized_person: formData.authorized_person.trim() || null,
        survey_date: formData.survey_date,
        q1: formData.q1, q2: formData.q2, q3: formData.q3, q4: formData.q4,
        q5: formData.q5, q6: formData.q6, q7: formData.q7,
        preference_reasons: formData.preference_reasons,
        evaluation_topics: formData.evaluation_topics,
        customer_comments: formData.customer_comments,
        status: 'completed',
        token_used: true,
      };
      if (editData) {
        const { error: err } = await supabase.from('customer_surveys').update(payload).eq('id', editData.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('customer_surveys').insert([payload]);
        if (err) throw err;
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Kaydetme sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const getSurveyUrl = (token: string) => `${window.location.origin}/#survey/${token}`;

  const handleCopy = async () => {
    if (!generatedToken) return;
    await navigator.clipboard.writeText(getSurveyUrl(generatedToken));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  if (generatedToken) {
    const url = getSurveyUrl(generatedToken);
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Link className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-blue-200 font-semibold uppercase tracking-wide">Anket Linki Oluşturuldu</div>
                <div className="text-base font-bold mt-0.5">Müşteriyle Paylaşın</div>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Aşağıdaki linki müşterinizle paylaşın. Müşteri bu linke tıklayarak anketi doldurabilir.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-[11px] text-slate-500 font-semibold uppercase mb-1.5">Anket Linki</p>
              <p className="text-xs text-blue-700 break-all font-mono leading-relaxed">{url}</p>
            </div>
            <button
              onClick={handleCopy}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                copied ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Kopyalandı!' : 'Linki Kopyala'}
            </button>
            <p className="text-[11px] text-slate-400 italic text-center">
              Link tek kullanımlıktır ve müşteri anketi doldurduktan sonra geçersiz olur.
            </p>
          </div>
          <div className="px-6 pb-6">
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-semibold text-sm"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    );
  }

  const avg = calculateAverage();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <div className="text-xs text-blue-200 font-semibold uppercase tracking-wide">Müşteri Memnuniyeti Anketi</div>
            <div className="text-base font-bold mt-0.5">
              {editData ? 'Anketi Düzenle' : 'Yeni Müşteri Anketi'}
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!editData && (
          <div className="px-6 pt-5 flex gap-2">
            <button
              type="button"
              onClick={() => setMode('direct')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[11px] font-bold border transition-all ${
                mode === 'direct'
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              Anketi Şimdi Doldur
            </button>
            <button
              type="button"
              onClick={() => setMode('link')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[11px] font-bold border transition-all ${
                mode === 'link'
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              Müşteriye Link Gönder
            </button>
          </div>
        )}

        <form onSubmit={handleDirectSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                Firma Adı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.customer_name}
                onChange={e => setFormData(p => ({ ...p, customer_name: e.target.value }))}
                className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Firma adı"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                Firma Yetkilisi
              </label>
              <input
                type="text"
                value={formData.authorized_person}
                onChange={e => setFormData(p => ({ ...p, authorized_person: e.target.value }))}
                className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Yetkili adı soyadı"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                Anket Tarihi <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.survey_date}
                onChange={e => setFormData(p => ({ ...p, survey_date: e.target.value }))}
                className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>
          </div>

          {mode === 'link' && !editData ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Send className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">Müşteri Linki Oluştur</p>
                  <p className="text-[11px] text-blue-600 mt-1 leading-relaxed">
                    Müşteri bilgilerini girdikten sonra "Link Oluştur" butonuna basın. Oluşan linki müşterinizle paylaşın; müşteriniz linke tıklayarak anketi kendisi doldurabilir.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-700 text-white px-4 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Değerlendirme Soruları</span>
                    {avg && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        parseFloat(avg) >= 4 ? 'bg-green-500/30 text-green-100' :
                        parseFloat(avg) >= 3 ? 'bg-amber-500/30 text-amber-100' :
                        'bg-red-500/30 text-red-100'
                      }`}>
                        Ort: {avg}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">5: En iyi — 1: En kötü</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {SURVEY_QUESTIONS.map((question, idx) => {
                    const field = `q${idx + 1}` as keyof FormData;
                    const val = formData[field] as number;
                    return (
                      <div key={idx} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/50">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="flex-1 text-[11px] text-slate-700 leading-snug">{question}</span>
                        <div className="flex gap-1 flex-shrink-0">
                          {[5, 4, 3, 2, 1].map(score => (
                            <button
                              key={score}
                              type="button"
                              onClick={() => setQuestion(field, score)}
                              className={`w-7 h-7 rounded text-[10px] font-bold border transition-all ${
                                val === score
                                  ? score >= 4 ? 'bg-green-600 text-white border-green-600'
                                    : score === 3 ? 'bg-amber-500 text-white border-amber-500'
                                    : 'bg-red-500 text-white border-red-500'
                                  : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400 hover:text-slate-600'
                              }`}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-700 text-white px-4 py-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Soru 8 — Tercih Sebebi</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Laboratuvarımızı tercih sebebiniz (çoklu seçim yapabilirsiniz)</p>
                </div>
                <div className="px-4 py-3 flex flex-wrap gap-2">
                  {PREFERENCE_OPTIONS.map(opt => {
                    const selected = formData.preference_reasons.includes(opt.key);
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => togglePreference(opt.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                          selected
                            ? 'bg-blue-700 text-white border-blue-700'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${selected ? 'bg-white border-white' : 'border-slate-300'}`}>
                          {selected && <span className="block w-2 h-2 bg-blue-700 rounded-sm" />}
                        </span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Değerlendirilmesini İstediğiniz Konular
                </label>
                <textarea
                  value={formData.evaluation_topics}
                  onChange={e => setFormData(p => ({ ...p, evaluation_topics: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  placeholder="Değerlendirmemizi istediğiniz konuları buraya yazabilirsiniz..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Ek Görüş ve Öneriler
                </label>
                <textarea
                  value={formData.customer_comments}
                  onChange={e => setFormData(p => ({ ...p, customer_comments: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  placeholder="Ek yorumlar..."
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-1">
            {mode === 'link' && !editData ? (
              <button
                type="button"
                disabled={loading}
                onClick={handleSendLink}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-700 text-white px-4 py-2.5 rounded-xl hover:bg-blue-800 transition-all font-semibold text-sm disabled:opacity-60 shadow-sm"
              >
                <Link className="w-4 h-4" />
                {loading ? 'Oluşturuluyor...' : 'Link Oluştur'}
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-700 text-white px-4 py-2.5 rounded-xl hover:bg-blue-800 transition-all font-semibold text-sm disabled:opacity-60 shadow-sm"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Kaydediliyor...' : editData ? 'Değişiklikleri Kaydet' : 'Anketi Kaydet'}
              </button>
            )}
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
  );
}
