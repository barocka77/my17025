import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
}

const defaultForm = {
  supplier_no: '',
  name: '',
  category: 'material' as string,
  status: 'approved' as string,
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  website: '',
  is_accredited: false,
  accreditation_body: '',
  accreditation_no: '',
  accreditation_scope: '',
  accreditation_expiry: '',
  notes: '',
  warning_notes: '',
};

const CATEGORIES: Record<string, string> = {
  calibration_lab: 'Kalibrasyon Laboratuvarı',
  material: 'Malzeme / Sarf',
  equipment: 'Cihaz / Donanım',
  service: 'Hizmet',
  other: 'Diğer',
};

const STATUSES: Record<string, { label: string; color: string }> = {
  approved: { label: 'Onaylı', color: 'text-green-700' },
  conditional: { label: 'Şartlı', color: 'text-amber-700' },
  suspended: { label: 'Askıya Alındı', color: 'text-red-600' },
  removed: { label: 'Listeden Çıkarıldı', color: 'text-slate-500' },
};

export default function SupplierFormModal({ isOpen, onClose, onSuccess, editData }: Props) {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setForm({
          supplier_no: editData.supplier_no || '',
          name: editData.name || '',
          category: editData.category || 'material',
          status: editData.status || 'approved',
          contact_person: editData.contact_person || '',
          phone: editData.phone || '',
          email: editData.email || '',
          address: editData.address || '',
          website: editData.website || '',
          is_accredited: editData.is_accredited || false,
          accreditation_body: editData.accreditation_body || '',
          accreditation_no: editData.accreditation_no || '',
          accreditation_scope: editData.accreditation_scope || '',
          accreditation_expiry: editData.accreditation_expiry || '',
          notes: editData.notes || '',
          warning_notes: editData.warning_notes || '',
        });
      } else {
        setForm(defaultForm);
      }
      setError(null);
    }
  }, [isOpen, editData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Tedarikçi adı zorunludur.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...form,
        accreditation_expiry: form.accreditation_expiry || null,
      };
      if (editData) {
        const { error: err } = await supabase.from('suppliers').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editData.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('suppliers').insert([payload]);
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <div className="text-xs text-orange-200 font-semibold uppercase tracking-wide">PR01.04 — LS.02 Onaylı Tedarikçi Listesi</div>
            <div className="text-base font-bold mt-0.5">{editData ? 'Tedarikçiyi Düzenle' : 'Yeni Tedarikçi Ekle'}</div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Tedarikçi No</label>
              <input
                type="text"
                value={form.supplier_no}
                onChange={e => setForm(p => ({ ...p, supplier_no: e.target.value }))}
                className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="ör. TDR-001"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Durum</label>
              <select
                value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {Object.entries(STATUSES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">
              Tedarikçi Adı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Firma adı"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Tedarikçi Kategorisi</label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, category: k }))}
                  className={`px-2 py-2 rounded-lg text-[10px] font-semibold border transition-all text-center ${
                    form.category === k
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">İletişim Kişisi</label>
              <input type="text" value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))}
                className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Ad Soyad" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Telefon</label>
              <input type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="+90..." />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">E-posta</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="info@firma.com" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Web Sitesi</label>
              <input type="text" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
                className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="www.firma.com" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Adres</label>
            <input type="text" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Firma adresi" />
          </div>

          {(form.category === 'calibration_lab' || form.category === 'service') && (
            <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/30">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-[11px] font-semibold text-blue-700 uppercase tracking-wide">Akreditasyon Bilgileri</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_accredited}
                    onChange={e => setForm(p => ({ ...p, is_accredited: e.target.checked }))}
                    className="w-3.5 h-3.5 accent-orange-600"
                  />
                  <span className="text-[11px] font-semibold text-slate-600">Akredite</span>
                </label>
              </div>
              {form.is_accredited && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Akreditasyon Kuruluşu</label>
                    <input type="text" value={form.accreditation_body} onChange={e => setForm(p => ({ ...p, accreditation_body: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white"
                      placeholder="ör. TÜRKAK" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Akreditasyon No</label>
                    <input type="text" value={form.accreditation_no} onChange={e => setForm(p => ({ ...p, accreditation_no: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white"
                      placeholder="AB-0123-T" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Akreditasyon Kapsamı</label>
                    <textarea value={form.accreditation_scope} onChange={e => setForm(p => ({ ...p, accreditation_scope: e.target.value }))}
                      rows={2} className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white resize-none"
                      placeholder="Kapsam bilgisi..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Geçerlilik Tarihi</label>
                    <input type="date" value={form.accreditation_expiry} onChange={e => setForm(p => ({ ...p, accreditation_expiry: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white" />
                  </div>
                </div>
              )}
            </div>
          )}

          {(form.status === 'conditional' || form.status === 'suspended') && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Uyarı / Şart Notu</label>
              <textarea value={form.warning_notes} onChange={e => setForm(p => ({ ...p, warning_notes: e.target.value }))}
                rows={2} className="w-full px-3 py-2 text-[12px] border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 transition-all resize-none"
                placeholder="Şartlı çalışma veya uyarı notları..." />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Genel Notlar</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2} className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 transition-all resize-none"
              placeholder="Ek notlar..." />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-600 text-white px-4 py-2.5 rounded-xl hover:bg-orange-700 transition-all font-semibold text-sm disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Kaydediliyor...' : editData ? 'Güncelle' : 'Tedarikçiyi Kaydet'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-semibold text-sm">
              İptal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
