import { useState, useEffect, useRef } from 'react';
import { CheckCircle, ChevronRight, RotateCcw, Save, Loader2, Info, CloudOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WhyStep {
  question: string;
  answer: string;
}

interface Props {
  ncId: string;
  ncDescription: string;
  onSaved: () => void;
}

async function callFiveWhyAI(prompt: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: { prompt },
  });
  if (error) throw new Error(error.message ?? 'API hatası');
  if (data?.error) throw new Error(data.error);
  return data?.result ?? '';
}

function buildNextPrompt(ncDescription: string, steps: WhyStep[], nextStepNumber: number): string {
  const history = steps
    .map((s, i) => `Neden ${i + 1} Sorusu: ${s.question}\nNeden ${i + 1} Cevabı: ${s.answer}`)
    .join('\n');

  if (nextStepNumber === 1) {
    return `Sen bir ISO 17025 kalite uzmanısın. Aşağıdaki uygunsuzluk tanımı için 5 Why (5 Neden) kök neden analizi yapıyorsun.\n\nUygunsuzluk: ${ncDescription}\n\nBu uygunsuzluğun kök nedenine ulaşmak için ilk soruyu sor.\nSoru kısa, net ve Türkçe olmalı. Sadece soruyu yaz, başka hiçbir şey yazma.`;
  }

  return `Sen bir ISO 17025 kalite uzmanısın. 5 Why analizi yapıyorsun.\n\nUygunsuzluk: ${ncDescription}\n\nŞimdiye kadar:\n${history}\n\nBir sonraki neden sorusunu sor. Kısa, net, Türkçe. Sadece soruyu yaz.`;
}

function buildSummaryPrompt(ncDescription: string, steps: WhyStep[]): string {
  const lines = steps.map((s, i) => `N${i + 1}: ${s.question} → ${s.answer}`).join('\n');
  return `Sen bir ISO 17025 kalite uzmanısın.\n\nUygunsuzluk: ${ncDescription}\n5 Why analizi tamamlandı:\n${lines}\n\nBu analize göre kök nedeni tek cümleyle özetle. Sadece özeti yaz, başka hiçbir şey yazma.`;
}

export default function FiveWhyInterface({ ncId, ncDescription, onSaved }: Props) {
  const [started, setStarted] = useState(false);
  const [steps, setSteps] = useState<WhyStep[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [summary, setSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draftLoading, setDraftLoading] = useState(true);
  const [draftRestored, setDraftRestored] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const userIdRef = useRef<string | null>(null);

  const currentStep = steps.length + 1;
  const isComplete = steps.length === 5 && summary !== '';

  useEffect(() => {
    loadDraft();
  }, [ncId]);

  const loadDraft = async () => {
    setDraftLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;

      const { data } = await supabase
        .from('five_why_drafts')
        .select('*')
        .eq('nonconformity_id', ncId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        const loadedSteps: WhyStep[] = data.steps ?? [];
        if (loadedSteps.length > 0 || data.current_question) {
          setSteps(loadedSteps);
          setCurrentQuestion(data.current_question ?? '');
          setSummary(data.summary ?? '');
          setStarted(true);
          setDraftRestored(true);
        }
      }
    } catch (e) {
      console.error('Taslak yüklenemedi:', e);
    } finally {
      setDraftLoading(false);
    }
  };

  const saveDraft = async (
    draftSteps: WhyStep[],
    draftQuestion: string,
    draftSummary: string
  ) => {
    if (!userIdRef.current) return;
    setAutoSaving(true);
    try {
      await supabase.from('five_why_drafts').upsert(
        {
          nonconformity_id: ncId,
          user_id: userIdRef.current,
          steps: draftSteps,
          current_question: draftQuestion,
          summary: draftSummary,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'nonconformity_id,user_id' }
      );
    } catch (e) {
      console.error('Taslak kayıt hatası:', e);
    } finally {
      setAutoSaving(false);
    }
  };

  const deleteDraft = async () => {
    if (!userIdRef.current) return;
    try {
      await supabase
        .from('five_why_drafts')
        .delete()
        .eq('nonconformity_id', ncId)
        .eq('user_id', userIdRef.current);
    } catch (e) {
      console.error('Taslak silinemedi:', e);
    }
  };

  const handleStart = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const q = await callFiveWhyAI(buildNextPrompt(ncDescription, [], 1));
      const question = q.trim();
      setCurrentQuestion(question);
      setStarted(true);
      await saveDraft([], question, '');
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleNext = async () => {
    if (!currentAnswer.trim()) return;
    const newStep: WhyStep = { question: currentQuestion, answer: currentAnswer.trim() };
    const newSteps = [...steps, newStep];
    setSteps(newSteps);
    setCurrentAnswer('');
    setCurrentQuestion('');
    setAiLoading(true);
    setAiError(null);
    try {
      if (newSteps.length === 5) {
        const sum = await callFiveWhyAI(buildSummaryPrompt(ncDescription, newSteps));
        const trimmedSum = sum.trim();
        setSummary(trimmedSum);
        await saveDraft(newSteps, '', trimmedSum);
      } else {
        const q = await callFiveWhyAI(buildNextPrompt(ncDescription, newSteps, newSteps.length + 1));
        const question = q.trim();
        setCurrentQuestion(question);
        await saveDraft(newSteps, question, '');
      }
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleBack = () => {
    if (steps.length === 0) {
      setStarted(false);
      setCurrentQuestion('');
      setCurrentAnswer('');
      saveDraft([], '', '');
      return;
    }
    const prev = steps[steps.length - 1];
    const newSteps = steps.slice(0, -1);
    setCurrentQuestion(prev.question);
    setCurrentAnswer(prev.answer);
    setSummary('');
    setSteps(newSteps);
    setAiError(null);
    saveDraft(newSteps, prev.question, '');
  };

  const handleSave = async () => {
    if (!isComplete) return;
    setSaving(true);
    setAiError(null);
    try {
      const payload: any = {
        nonconformity_id: ncId,
        rca_method: '5why',
        rca_category: 'five_why',
        rca_description: summary,
        root_cause_summary: summary,
      };
      steps.forEach((s, i) => {
        payload[`why_${i + 1}_question`] = s.question;
        payload[`why_${i + 1}_answer`] = s.answer;
      });
      const { error } = await supabase.from('nonconformity_root_causes').insert([payload]);
      if (error) throw error;
      await deleteDraft();
      setSaved(true);
      setTimeout(() => onSaved(), 1500);
    } catch (e: any) {
      console.error('5Why kayıt hatası:', e);
      setAiError(e.message || e.details || e.hint || 'Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  const progressPercent = isComplete ? 100 : ((steps.length) / 5) * 100;

  if (draftLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[12px]">Yükleniyor...</span>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-7 h-7 text-emerald-600" />
        </div>
        <p className="text-sm font-semibold text-emerald-700">5 Why analizi başarıyla kaydedildi</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* NC Description */}
      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl p-3.5">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Uygunsuzluk</p>
          <p className="text-[12px] text-blue-800 leading-relaxed">{ncDescription || 'Açıklama girilmemiş'}</p>
        </div>
        {autoSaving && (
          <div className="flex items-center gap-1 flex-shrink-0 text-slate-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-[9px]">Kaydediliyor</span>
          </div>
        )}
      </div>

      {/* Draft restored banner */}
      {draftRestored && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <CloudOff className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <p className="text-[11px] text-amber-700 font-medium">Kaldığınız yerden devam ediyorsunuz</p>
        </div>
      )}

      {!started ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <p className="text-[11px] text-slate-500 text-center max-w-xs">
            Yapay zeka, uygunsuzluğun kök nedenine ulaşmak için sizi adım adım yönlendirecek.
          </p>
          <button
            onClick={handleStart}
            disabled={aiLoading}
            className="flex items-center gap-2 bg-slate-700 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-all font-semibold text-[12px] disabled:opacity-60"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            {aiLoading ? 'Hazırlanıyor...' : 'Analizi Başlat'}
          </button>
          {aiError && <p className="text-[11px] text-red-500">{aiError}</p>}
        </div>
      ) : (
        <>
          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {isComplete ? 'Tamamlandı' : `Adım ${Math.min(currentStep, 5)} / 5`}
              </span>
              <span className="text-[10px] font-bold text-slate-400">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-slate-700 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Completed Steps */}
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <div className="flex-shrink-0 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center mt-0.5">
                <CheckCircle className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-100 px-1.5 py-0.5 rounded-full">
                    Neden {i + 1}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-emerald-800 leading-snug mb-1">{step.question}</p>
                <p className="text-[11px] text-emerald-700 leading-relaxed">{step.answer}</p>
              </div>
            </div>
          ))}

          {/* Current Active Step */}
          {!isComplete && currentQuestion && (
            <div className="border-2 border-slate-700 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-700 px-4 py-2.5 flex items-center gap-2">
                <span className="w-5 h-5 bg-white text-slate-700 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {currentStep}
                </span>
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  Neden {currentStep}
                </span>
              </div>
              <div className="p-4 space-y-3 bg-white">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-[12px] font-semibold text-blue-900 leading-relaxed">{currentQuestion}</p>
                </div>
                <textarea
                  value={currentAnswer}
                  onChange={e => setCurrentAnswer(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none placeholder-slate-400"
                  placeholder="Cevabınızı buraya yazın..."
                />
                {aiError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-300 px-3 py-2.5 rounded-lg">
                    <span className="text-red-500 text-[11px] font-bold flex-shrink-0 mt-0.5">Hata:</span>
                    <p className="text-[11px] text-red-700 leading-relaxed">{aiError}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleBack}
                    disabled={aiLoading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-600 text-[11px] font-semibold hover:bg-slate-50 transition-all disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Geri Al
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!currentAnswer.trim() || aiLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-all font-semibold text-[11px] disabled:opacity-50"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {steps.length === 4 ? 'Özet hazırlanıyor...' : 'Sonraki soru hazırlanıyor...'}
                      </>
                    ) : (
                      <>
                        {steps.length === 4 ? 'Analizi Tamamla' : 'Sonraki Neden →'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading while AI generates */}
          {!isComplete && !currentQuestion && aiLoading && (
            <div className="flex items-center justify-center gap-2 py-6 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[12px]">Yapay zeka soruyu hazırlıyor...</span>
            </div>
          )}

          {/* Final Summary */}
          {isComplete && (
            <>
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Tespit Edilen Kök Neden</span>
                </div>
                <p className="text-[13px] font-semibold text-emerald-900 leading-relaxed">{summary}</p>
              </div>

              {aiError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-300 px-3 py-2.5 rounded-lg">
                  <span className="text-red-500 text-[11px] font-bold flex-shrink-0 mt-0.5">Hata:</span>
                  <p className="text-[11px] text-red-700 leading-relaxed">{aiError}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleBack}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-[11px] font-semibold hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  <RotateCcw className="w-3 h-3" />
                  Geri Al
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-all font-semibold text-[12px] disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
