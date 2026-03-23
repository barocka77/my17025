import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PersonnelSelect } from '../common/PersonnelSelect';

const ISO_CLAUSES = [
  '4 – Genel Şartlar',
  '5 – Yapısal Şartlar',
  '6.1 – Personel',
  '6.2 – Tesisler ve Çevresel Koşullar',
  '6.3 – Donanım',
  '6.4 – Metrolojik İzlenebilirlik',
  '6.5 – Dışarıdan Tedarik Edilen Ürün/Hizmet',
  '7.1 – Talep, Teklif ve Sözleşmelerin Gözden Geçirilmesi',
  '7.2 – Metot Seçimi, Doğrulaması ve Geçerliliği',
  '7.3 – Numune Alma',
  '7.4 – Teknik Kayıtlar',
  '7.5 – Ölçüm Belirsizliği',
  '7.6 – Sonuçların Geçerliliğinin Sağlanması',
  '7.7 – Sonuçların Raporlanması',
  '7.8 – Şikayetler',
  '7.9 – Uygunsuz Çalışma',
  '7.10 – Verilerin Kontrolü ve Bilgi Yönetimi',
  '8.1 – Seçenekler',
  '8.2 – Yönetim Sistemi Dokümantasyonu',
  '8.3 – Yönetim Sistemi Kayıtlarının Kontrolü',
  '8.4 – Risk ve Fırsatların Belirlenmesi',
  '8.5 – İyileştirme',
  '8.6 – Düzeltici Faaliyet',
  '8.7 – İç Tetkikler',
  '8.8 – Yönetimin Gözden Geçirmesi',
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
}

const defaultForm = {
  audit_year: new Date().getFullYear(),
  audit_no: '',
  scope: '',
  auditor_name: '',
  auditee_name: '',
  planned_date: '',
  audit_type: 'planned' as 'planned' | 'unplanned',
  iso_clauses: [] as string[],
  notes: '',
};

export default function AuditPlanModal({ isOpen, onClose, onSuccess, editData }: Props) {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setForm({
          audit_year: editData.audit_year || new Date().getFullYear(),
          audit_no: editData.audit_no || '',
          scope: editData.scope || '',
          auditor_name: editData.auditor_name || '',
          auditee_name: editData.auditee_name || '',
          planned_date: editData.planned_date || '',
          audit_type: editData.audit_type || 'planned',
          iso_clauses: editData.iso_clauses || [],
          notes: editData.notes || '',
        });
      } else {
        const year = new Date().getFullYear();
        setForm({ ...defaultForm, audit_year: year });
      }
      setError(null);
    }
  }, [isOpen, editData]);

  const toggleClause = (clause: string) => {
    setForm(prev => ({
      ...prev,
      iso_clauses: prev.iso_clauses.includes(clause)
        ? prev.iso_clauses.filter(c => c !== clause)
        : [...prev.iso_clauses, clause],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.auditor_name.trim() || !form.scope.trim()) {
      setError('Tetkikçi adı ve kapsam zorunludur.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...form,
        planned_date: form.planned_date || null,
      };
      if (editData) {
        const { error: err } = await supabase.from('internal_audit_plans').update(payload).eq('id', editData.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('internal_audit_plans').insert([payload]);
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide">İç Tetkik Planı</div>
            <div className="text-base font-bold mt-0.5">{editData ? 'Planı Düzenle' : 'Yeni İç Tetkik Planı'}</div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Tetkik Yılı</label>
              <input
                type="number"
                value={form.audit_year}
                onChange={e => setForm(p => ({ ...p, audit_year: parseInt(e.target.value) || new Date().getFullYear() }))}
                className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                min={2020} max={2040}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Tetkik No</label>
              <input
                type="text"
                value={form.audit_no}
                onChange={e => setForm(p => ({ ...p, audit_no: e.target.value }))}
                className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                placeholder="ör. TT-2025-01"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Tetkik Türü</label>
              <select
                value={form.audit_type}
                onChange={e => setForm(p => ({ ...p, audit_type: e.target.value as any }))}
                className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
              >
                <option value="planned">Planlı</option>
                <option value="unplanned">Plan Dışı</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Planlanan Tarih</label>
              <input
                type="date"
                value={form.planned_date}
                onChange={e => setForm(p => ({ ...p, planned_date: e.target.value }))}
                className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Tetkikçi <span className="text-red-500">*</span></label>
              <PersonnelSelect
                isMulti
                value={form.auditor_name ? form.auditor_name.split(', ').filter(Boolean) : []}
                onChange={vals => setForm(p => ({ ...p, auditor_name: vals.join(', ') }))}
                valueField="full_name"
                placeholder="-- Tetkikçi(ler) Seçin --"
                showJobTitle
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Tetkik Edilen Birim</label>
              <input
                type="text"
                value={form.auditee_name}
                onChange={e => setForm(p => ({ ...p, auditee_name: e.target.value }))}
                className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                placeholder="Birim / bölüm adı"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Tetkik Kapsamı <span className="text-red-500">*</span></label>
            <textarea
              value={form.scope}
              onChange={e => setForm(p => ({ ...p, scope: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
              placeholder="Tetkikin kapsamını açıklayın..."
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-2 uppercase tracking-wide">TS EN ISO/IEC 17025 Maddeleri</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
              {ISO_CLAUSES.map(clause => {
                const selected = form.iso_clauses.includes(clause);
                return (
                  <button
                    key={clause}
                    type="button"
                    onClick={() => toggleClause(clause)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border text-left transition-all ${
                      selected
                        ? 'bg-slate-700 text-white border-slate-700'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-sm border flex-shrink-0 ${selected ? 'bg-white border-white' : 'border-slate-300'}`}>
                      {selected && <span className="block w-full h-full bg-slate-700 rounded-sm" />}
                    </span>
                    {clause}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Notlar</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
              placeholder="Ek notlar..."
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
            {loading ? 'Kaydediliyor...' : editData ? 'Güncelle' : 'Planı Kaydet'}
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
