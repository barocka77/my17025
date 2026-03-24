import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface ScopeRow {
  id: string;
  parameter: string;
  range: string;
  conditions: string;
  uncertainty: string;
  method: string;
  sort_order: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: ScopeRow | null;
}

const defaultForm = {
  parameter: '',
  range: '',
  conditions: '',
  uncertainty: '',
  method: '',
  sort_order: 0,
};

export default function ScopeFormModal({ isOpen, onClose, onSuccess, editData }: Props) {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setForm({
          parameter: editData.parameter,
          range: editData.range,
          conditions: editData.conditions,
          uncertainty: editData.uncertainty,
          method: editData.method,
          sort_order: editData.sort_order,
        });
      } else {
        setForm(defaultForm);
      }
      setError(null);
    }
  }, [isOpen, editData]);

  type TextKey = keyof Omit<typeof defaultForm, 'sort_order'>;

  const textField = (
    label: string,
    key: TextKey,
    placeholder: string,
    required = false,
    rows = 3
  ) => (
    <div>
      <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-y font-mono"
      />
      <p className="text-[10px] text-slate-400 mt-0.5">Enter tuşu ile yeni satır ekleyebilirsiniz.</p>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.parameter.trim() || !form.method.trim()) {
      setError('Ölçüm Büyüklüğü ve Kalibrasyon Metodu alanları zorunludur.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (editData) {
        const { error: err } = await supabase
          .from('accreditation_scope')
          .update(form)
          .eq('id', editData.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('accreditation_scope')
          .insert([form]);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Akreditasyon Kapsamı</div>
            <div className="text-base font-bold mt-0.5">
              {editData ? 'Kalem Düzenle' : 'Yeni Kapsam Kalemi'}
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">{error}</div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-[11px] text-blue-700 font-medium">
                Hücre içeriği TÜRKAK sertifikasındaki gibi çok satırlı girilebilir.
                Enter tuşu ile yeni satır ekleyip PDF'te aynı görünümü elde edebilirsiniz.
              </p>
            </div>

            {textField(
              'Ölçüm Büyüklüğü / Kalibre Edilen Cihazlar',
              'parameter',
              'ör. Uzunluk\nKumpas\nMikrometre',
              true,
              4
            )}

            <div className="grid grid-cols-2 gap-4">
              {textField('Ölçüm Aralığı', 'range', 'ör. 0 – 150 mm\n0 – 25 mm', false, 4)}
              {textField('Ölçüm Şartları', 'conditions', 'ör. 20 ± 1 °C\nLaboratuvar Ortamı', false, 4)}
            </div>

            {textField(
              'Genişletilmiş Ölçüm Belirsizliği (k=2)',
              'uncertainty',
              'ör. ± 3 µm\n± 2 µm',
              false,
              4
            )}

            {textField(
              'Açıklamalar / Kalibrasyon Metodu',
              'method',
              'ör. TS EN ISO 13225\nKarşılaştırma metodu',
              true,
              4
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Sıra No</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                min={0}
                className="w-28 px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3 p-4 border-t border-slate-200 flex-shrink-0 bg-white rounded-b-2xl">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-700 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-all font-semibold text-sm disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Kaydediliyor...' : editData ? 'Güncelle' : 'Kaydet'}
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
  );
}
