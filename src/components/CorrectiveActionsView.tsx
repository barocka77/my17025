import { useEffect, useState, useMemo } from 'react';
import { ClipboardCheck, CheckCircle2, Clock, ChevronRight, Link } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const caStatusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  Planlandı: { label: 'Planlandı', className: 'bg-gray-100 text-gray-800 border-gray-200', icon: <Clock className="w-2.5 h-2.5" /> },
  İşlemde: { label: 'İşlemde', className: 'bg-blue-100 text-blue-800 border-blue-200', icon: <ChevronRight className="w-2.5 h-2.5" /> },
  Tamamlandı: { label: 'Tamamlandı', className: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle2 className="w-2.5 h-2.5" /> },
};

export default function CorrectiveActionsView() {
  const { role } = useAuth();
  const isManager = role === 'admin' || role === 'super_admin' || role === 'quality_manager';

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <span className="ml-0.5 opacity-30">↕</span>;
    return <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let av: string;
      let bv: string;
      if (sortKey === 'nc_number') {
        av = a.nonconformities?.nc_number ?? '';
        bv = b.nonconformities?.nc_number ?? '';
      } else {
        av = a[sortKey] ?? '';
        bv = b[sortKey] ?? '';
      }
      const cmp = String(av).localeCompare(String(bv), 'tr', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from('corrective_actions')
        .select('*, nonconformities(nc_number)')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setData(rows || []);
    } catch (err) {
      console.error('CA fetch error:', err);
    } finally {
      setLoading(false);
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
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Link className="w-3 h-3" />
              Düzeltici faaliyetler yalnızca Uygunsuzluk Analizi üzerinden açılabilir.
            </p>
          </div>
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
                    {[
                      { key: 'ca_number', label: 'CA No', cls: 'w-28' },
                      { key: 'nc_number', label: 'NC No', cls: 'w-28' },
                      { key: 'action_description', label: 'Faaliyet Açıklaması', cls: '' },
                      { key: 'responsible_user', label: 'Sorumlu', cls: 'w-36' },
                      { key: 'planned_completion_date', label: 'Planlanan Tarih', cls: 'w-36' },
                      { key: 'status', label: 'Durum', cls: 'w-28' },
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className={`px-3 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide cursor-pointer select-none hover:bg-slate-100 transition-colors ${col.cls}`}
                      >
                        {col.label}<SortIcon col={col.key} />
                      </th>
                    ))}
                    {isManager && (
                      <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-20">İşlemler</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedData.map(item => {
                    const st = caStatusConfig[item.status] || { label: item.status, className: 'bg-gray-100 text-gray-800 border-gray-200', icon: null };
                    const isOverdue = item.planned_completion_date && item.status !== 'Tamamlandı'
                      && new Date(item.planned_completion_date) < new Date();
                    return (
                      <tr key={item.id} className={`transition-colors ${isOverdue ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-slate-50/50'}`}>
                        <td className="px-3 py-2 text-[11px] font-medium text-slate-700 whitespace-nowrap">
                          {item.ca_number || '-'}
                        </td>
                        <td className="px-3 py-2 text-[11px] whitespace-nowrap">
                          {item.nonconformities?.nc_number ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-semibold text-[10px]">
                              <Link className="w-2.5 h-2.5" />
                              {item.nonconformities.nc_number}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
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
                Toplam <span className="font-semibold text-gray-900">{sortedData.length}</span> kayıt
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
