import { useState, useEffect } from 'react';
import { X, FileText, Save, CheckSquare, Square } from 'lucide-react';
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string; job_title: string | null }[]>([]);

  useEffect(() => {
    supabase.rpc('get_personnel_list').then(({ data }) => {
      setProfiles((data || []).map((p: any) => ({ id: p.id, full_name: p.full_name, job_title: p.job_title })));
    });
  }, []);

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
      };

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
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

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
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit}>
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
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Açıklama</span>
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

              {/* Section: Sonuçların Değerlendirilmesi (read-only info) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-600 text-white px-4 py-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Sonuçların Değerlendirilmesi</span>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <p className="text-[11px] text-slate-500 italic">
                        Bu bölüm, faaliyet tamamlandıktan sonra etkinlik değerlendirmesi için doldurulacaktır.
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Uygunsuzluk Maliyeti</span>
                      <p className="text-[12px] text-slate-400 mt-0.5">—</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Kök Neden Prosesleri</span>
                      <p className="text-[12px] text-slate-400 mt-0.5">—</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Faaliyetin Etkinliğini İzleme Süresi</span>
                      <p className="text-[12px] text-slate-400 mt-0.5">—</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Faaliyet Kapatma Tarihi</span>
                      <p className="text-[12px] text-slate-400 mt-0.5">—</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Etkinlik Değerlendirme Tarihi</span>
                      <p className="text-[12px] text-slate-400 mt-0.5">—</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setActionFulfilled(v => !v)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                            actionFulfilled
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-slate-400 border-slate-300 hover:border-green-400 hover:text-green-600'
                          }`}
                        >
                          {actionFulfilled ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                          İLGİLİ FAALİYET YERİNE GETİRİLMİŞTİR
                        </button>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">TARİH:</span>
                        <input
                          type="date"
                          value={fulfillmentDate}
                          onChange={e => setFulfillmentDate(e.target.value)}
                          className="px-2 py-1 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Analiz Ekibi Onayı / İmzalar</span>
                    <p className="text-[11px] text-slate-400 italic mt-0.5">Faaliyet kaydedildikten sonra imza süreçleri başlatılabilir.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 pb-5">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-700 text-white px-4 py-2.5 rounded-xl hover:bg-blue-800 transition-all font-semibold text-sm disabled:opacity-60 shadow-sm"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Kaydediliyor...' : isEdit ? 'Değişiklikleri Kaydet' : 'Düzeltici Faaliyet Kaydını Oluştur'}
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
