import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DocumentRecord {
  id?: string;
  sira_no: number;
  dokuman_kodu: string;
  dokuman_adi: string;
  ilk_yayin_tarihi: string;
  revizyon_tarihi: string;
  rev_no: string;
  guncellik_kontrol_tarihi: string;
  aktif: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData: DocumentRecord | null;
}

const emptyForm: DocumentRecord = {
  sira_no: 0,
  dokuman_kodu: '',
  dokuman_adi: '',
  ilk_yayin_tarihi: '',
  revizyon_tarihi: '',
  rev_no: '',
  guncellik_kontrol_tarihi: '',
  aktif: true,
};

export default function DocumentMasterListFormModal({ isOpen, onClose, onSuccess, editData }: Props) {
  const [form, setForm] = useState<DocumentRecord>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editData) {
      setForm({
        ...editData,
        ilk_yayin_tarihi: editData.ilk_yayin_tarihi || '',
        revizyon_tarihi: editData.revizyon_tarihi || '',
        guncellik_kontrol_tarihi: editData.guncellik_kontrol_tarihi || '',
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [editData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editData?.id) {
        const updatePayload = {
          dokuman_kodu: form.dokuman_kodu,
          dokuman_adi: form.dokuman_adi,
          ilk_yayin_tarihi: form.ilk_yayin_tarihi || null,
          revizyon_tarihi: form.revizyon_tarihi || null,
          rev_no: form.rev_no,
          guncellik_kontrol_tarihi: form.guncellik_kontrol_tarihi || null,
          aktif: form.aktif,
          updated_at: new Date().toISOString(),
        };
        const { error: updateError } = await supabase
          .from('document_master_list')
          .update(updatePayload)
          .eq('id', editData.id);
        if (updateError) throw updateError;
      } else {
        const insertPayload = {
          sira_no: form.sira_no,
          dokuman_kodu: form.dokuman_kodu,
          dokuman_adi: form.dokuman_adi,
          ilk_yayin_tarihi: form.ilk_yayin_tarihi || null,
          revizyon_tarihi: form.revizyon_tarihi || null,
          rev_no: form.rev_no,
          guncellik_kontrol_tarihi: form.guncellik_kontrol_tarihi || null,
          aktif: form.aktif,
          updated_at: new Date().toISOString(),
        };
        const { error: insertError } = await supabase
          .from('document_master_list')
          .insert(insertPayload);
        if (insertError) throw insertError;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving document:', err);
      setError(err.message || 'Kaydetme sırasında hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50">
          <h2 className="text-lg font-semibold text-slate-800">
            {editData ? 'Dokümanı Düzenle' : 'Yeni Doküman Ekle'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sıra No</label>
              <input
                type="number"
                value={form.sira_no}
                onChange={(e) => setForm({ ...form, sira_no: parseInt(e.target.value) || 0 })}
                className={`w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg transition-all ${
                  editData ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-slate-500 focus:border-transparent'
                }`}
                required
                readOnly={!!editData}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Doküman Kodu</label>
              <input
                type="text"
                value={form.dokuman_kodu}
                onChange={(e) => setForm({ ...form, dokuman_kodu: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Doküman Adı</label>
            <input
              type="text"
              value={form.dokuman_adi}
              onChange={(e) => setForm({ ...form, dokuman_adi: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">İlk Yayın Tarihi</label>
              <input
                type="date"
                value={form.ilk_yayin_tarihi}
                onChange={(e) => setForm({ ...form, ilk_yayin_tarihi: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Revizyon Tarihi</label>
              <input
                type="date"
                value={form.revizyon_tarihi}
                onChange={(e) => setForm({ ...form, revizyon_tarihi: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rev. No</label>
              <input
                type="text"
                value={form.rev_no}
                onChange={(e) => setForm({ ...form, rev_no: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Güncellik Kontrol Tarihi</label>
              <input
                type="date"
                value={form.guncellik_kontrol_tarihi}
                onChange={(e) => setForm({ ...form, guncellik_kontrol_tarihi: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-slate-600 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
