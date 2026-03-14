import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
}

const defaultForm = {
  meeting_year: new Date().getFullYear(),
  meeting_no: '',
  meeting_type: 'periodic' as 'periodic' | 'extraordinary',
  meeting_date: '',
  meeting_location: '',
  chairperson: '',
  participants: [] as string[],
  status: 'planned' as 'planned' | 'in_progress' | 'completed',
};

export default function ManagementReviewModal({ isOpen, onClose, onSuccess, editData }: Props) {
  const [form, setForm] = useState(defaultForm);
  const [participantInput, setParticipantInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setForm({
          meeting_year: editData.meeting_year || new Date().getFullYear(),
          meeting_no: editData.meeting_no || '',
          meeting_type: editData.meeting_type || 'periodic',
          meeting_date: editData.meeting_date || '',
          meeting_location: editData.meeting_location || '',
          chairperson: editData.chairperson || '',
          participants: editData.participants || [],
          status: editData.status || 'planned',
        });
      } else {
        const year = new Date().getFullYear();
        setForm({ ...defaultForm, meeting_year: year });
      }
      setParticipantInput('');
      setError(null);
    }
  }, [isOpen, editData]);

  const addParticipant = () => {
    const name = participantInput.trim();
    if (!name) return;
    if (!form.participants.includes(name)) {
      setForm(p => ({ ...p, participants: [...p.participants, name] }));
    }
    setParticipantInput('');
  };

  const removeParticipant = (name: string) => {
    setForm(p => ({ ...p, participants: p.participants.filter(n => n !== name) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.chairperson.trim()) {
      setError('Toplantı başkanı zorunludur.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = { ...form, meeting_date: form.meeting_date || null };
      if (editData) {
        const { error: err } = await supabase.from('management_reviews').update(payload).eq('id', editData.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('management_reviews').insert([payload]);
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-4">
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-300 font-semibold uppercase tracking-wide">PR01.10 — YGG</div>
            <div className="text-base font-bold mt-0.5">{editData ? 'Toplantıyı Düzenle' : 'Yeni YGG Toplantısı'}</div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Yıl</label>
              <input
                type="number"
                value={form.meeting_year}
                onChange={e => setForm(p => ({ ...p, meeting_year: parseInt(e.target.value) || new Date().getFullYear() }))}
                className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                min={2020} max={2040}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Toplantı No</label>
              <input
                type="text"
                value={form.meeting_no}
                onChange={e => setForm(p => ({ ...p, meeting_no: e.target.value }))}
                className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="ör. YGG-2025-01"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Toplantı Türü</label>
              <select
                value={form.meeting_type}
                onChange={e => setForm(p => ({ ...p, meeting_type: e.target.value as any }))}
                className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="periodic">Periyodik (Yıllık)</option>
                <option value="extraordinary">Olağanüstü</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Durum</label>
              <select
                value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}
                className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="planned">Planlandı</option>
                <option value="in_progress">Devam Ediyor</option>
                <option value="completed">Tamamlandı</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Toplantı Tarihi</label>
              <input
                type="date"
                value={form.meeting_date}
                onChange={e => setForm(p => ({ ...p, meeting_date: e.target.value }))}
                className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">Toplantı Yeri</label>
              <input
                type="text"
                value={form.meeting_location}
                onChange={e => setForm(p => ({ ...p, meeting_location: e.target.value }))}
                className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="ör. Toplantı Salonu"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">
              Toplantı Başkanı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.chairperson}
              onChange={e => setForm(p => ({ ...p, chairperson: e.target.value }))}
              className="w-full px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Şirket Müdürü"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-2 uppercase tracking-wide">Katılımcılar</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={participantInput}
                onChange={e => setParticipantInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addParticipant(); } }}
                className="flex-1 px-3 py-2 text-[12px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Ad Soyad (Enter ile ekle)"
              />
              <button
                type="button"
                onClick={addParticipant}
                className="px-3 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {form.participants.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.participants.map(p => (
                  <span key={p} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold">
                    {p}
                    <button type="button" onClick={() => removeParticipant(p)} className="hover:text-red-600 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-700 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-800 transition-all font-semibold text-sm disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Kaydediliyor...' : editData ? 'Güncelle' : 'Toplantıyı Kaydet'}
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
