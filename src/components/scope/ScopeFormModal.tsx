import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface ScopeRow {
  id: string;
  parameter: string;
  method: string;
  range: string;
  uncertainty: string;
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
  method: '',
  range: '',
  uncertainty: '',
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
          method: editData.method,
          range: editData.range,
          uncertainty: editData.uncertainty,
          sort_order: editData.sort_order,
        });
      } else {
        setForm(defaultForm);
      }
      setError(null);
    }
  }, [isOpen, editData]);

  const field = (
    label: string,
    key: keyof typeof defaultForm,
    placeholder: string,
    required = false,
    multiline = false
  ) => (
    <div>
      <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {multiline ? (
        <textarea
          value={String(form[key])}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
        />
      ) : (
        <input
          type="text"
          value={String(form[key])}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      )}
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.parameter.trim() || !form.method.trim()) {
      setError('Parametre ve metod alanları zorunludur.');
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
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

            {field('Ölçülen Büyüklük / Parametre', 'parameter', 'ör. Uzunluk, Sıcaklık, Basınç...', true, true)}
            {field('Deney / Ölçüm Metodu', 'method', 'ör. TS EN ISO 9001, ASTM D...', true, true)}
            {field('Ölçüm Aralığı', 'range', 'ör. 0 – 100 mm', false, false)}
            {field('Genişletilmiş Belirsizlik', 'uncertainty', 'ör. ±0.05 mm (k=2)', false, false)}

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Sıra No</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                min={0}
                className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
