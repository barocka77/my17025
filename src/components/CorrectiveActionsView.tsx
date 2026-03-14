import { useEffect, useState } from 'react';
import { Plus, X, Save, ClipboardCheck, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const caStatusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  Planlandı: { label: 'Planlandı', className: 'bg-gray-100 text-gray-800 border-gray-200', icon: <Clock className="w-2.5 h-2.5" /> },
  İşlemde: { label: 'İşlemde', className: 'bg-blue-100 text-blue-800 border-blue-200', icon: <ChevronRight className="w-2.5 h-2.5" /> },
  Tamamlandı: { label: 'Tamamlandı', className: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle2 className="w-2.5 h-2.5" /> },
};

interface CaFormData {
  action_description: string;
  responsible_user: string;
  planned_completion_date: string;
}

export default function CorrectiveActionsView() {
  const { role } = useAuth();
  const isManager = role === 'admin' || role === 'super_admin' || role === 'quality_manager';

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<CaFormData>({
    action_description: '',
    responsible_user: '',
    planned_completion_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from('corrective_actions')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setData(rows || []);
    } catch (err) {
      console.error('CA fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = { ...formData };
      if (!payload.planned_completion_date) delete payload.planned_completion_date;
      const { error: err } = await supabase.from('corrective_actions').insert([payload]);
      if (err) throw err;
      setModalOpen(false);
      setFormData({ action_description: '', responsible_user: '', planned_completion_date: '' });
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Kayıt sırasında bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    try {
      const { error: err } = await supabase.from('corrective_actions').delete().eq('id', id);
      if (err) throw err;
      fetchData();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Kayıt silinirken bir hata oluştu!');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-6 pt-16 md:pt-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-light text-gray-900">Düzeltici Faaliyetler</h1>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-slate-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-slate-700 transition-all shadow-sm hover:shadow-md font-medium text-xs md:text-sm"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Yeni Düzeltici Faaliyet</span>
            <span className="sm:hidden">Yeni</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <ClipboardCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Kayıt bulunamadı</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-32">CA No</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Faaliyet Açıklaması</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-36">Sorumlu</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-36">Planlanan Tarih</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-28">Durum</th>
                    {isManager && (
                      <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-20">İşlemler</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map(item => {
                    const st = caStatusConfig[item.status] || { label: item.status, className: 'bg-gray-100 text-gray-800 border-gray-200', icon: null };
                    const isOverdue = item.planned_completion_date && item.status !== 'Tamamlandı'
                      && new Date(item.planned_completion_date) < new Date();
                    return (
                      <tr key={item.id} className={`transition-colors ${isOverdue ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-slate-50/50'}`}>
                        <td className="px-3 py-2 text-[11px] font-medium text-slate-700 whitespace-nowrap">
                          {item.ca_number || '-'}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-gray-700 max-w-xs">
                          <div className="truncate" title={item.action_description}>
                            {item.action_description || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[11px] text-gray-600 whitespace-nowrap">
                          {item.responsible_user || '-'}
                        </td>
                        <td className="px-3 py-2 text-[11px] whitespace-nowrap">
                          <span className={isOverdue ? 'text-red-700 font-semibold' : 'text-gray-600'}>
                            {item.planned_completion_date
                              ? new Date(item.planned_completion_date).toLocaleDateString('tr-TR')
                              : '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${st.className}`}>
                            {st.icon}
                            {st.label}
                          </span>
                        </td>
                        {isManager && (
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="inline-flex items-center gap-0.5 text-red-600 hover:text-red-800 hover:bg-red-50 px-1.5 py-0.5 rounded text-[10px] transition-colors"
                            >
                              Sil
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 px-3 py-1.5 border-t border-gray-200">
              <p className="text-[10px] text-gray-600">
                Toplam <span className="font-semibold text-gray-900">{data.length}</span> kayıt
              </p>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white md:rounded-2xl shadow-2xl w-full h-full md:h-auto md:max-w-xl md:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-slate-700 to-slate-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                <h3 className="text-sm md:text-base font-bold">Yeni Düzeltici Faaliyet</h3>
              </div>
              <button
                onClick={() => { setModalOpen(false); setError(null); }}
                className="hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Faaliyet Açıklaması
                </label>
                <textarea
                  value={formData.action_description}
                  onChange={e => setFormData({ ...formData, action_description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                  placeholder="Düzeltici faaliyet açıklamasını girin..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Sorumlu Kişi
                </label>
                <input
                  type="text"
                  value={formData.responsible_user}
                  onChange={e => setFormData({ ...formData, responsible_user: e.target.value })}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  placeholder="Sorumlu kişinin adını girin"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Planlanan Tamamlanma Tarihi
                </label>
                <input
                  type="date"
                  value={formData.planned_completion_date}
                  onChange={e => setFormData({ ...formData, planned_completion_date: e.target.value })}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 text-white px-4 py-3 md:py-2 rounded-lg hover:bg-slate-800 transition-all font-semibold text-xs disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setError(null); }}
                  className="flex-1 bg-slate-100 text-slate-700 px-4 py-3 md:py-2 rounded-lg hover:bg-slate-200 transition-colors font-semibold text-xs"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
