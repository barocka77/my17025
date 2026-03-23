import { useEffect, useState, useMemo } from 'react';
import { AlertTriangle, Plus, Pencil, Trash2, TrendingUp, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import RiskFormModal from './RiskFormModal';

interface RiskRecord {
  id: string;
  risk_no: string;
  risk_type: string;
  risk_definition: string;
  risk_impact: string;
  impact_area: string;
  probability: number | null;
  severity: number | null;
  risk_level: number | null;
  related_activity: string;
  decision: string;
  activity_responsible: string;
  deadline: string;
  planned_review_term: string;
  requires_df: boolean;
  df_no: string;
  evaluators: string;
  evaluation_date: string;
  re_probability: number | null;
  re_severity: number | null;
  re_risk_level: number | null;
  re_related_activity: string;
  re_decision: string;
  re_activity_responsible: string;
  re_deadline: string;
  re_requires_df: boolean;
  re_df_no: string;
  re_evaluators: string;
  re_evaluation_date: string;
  review_date: string;
  risk_change_occurred: boolean;
  change_explanation: string;
  risk_change_cause: string;
  opportunities_improvements: string;
  created_at: string;
}

function getRiskBadge(level: number | null) {
  if (!level) return { label: '—', cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  if (level <= 6) return { label: `${level} Düşük`, cls: 'bg-green-100 text-green-800 border-green-300' };
  if (level <= 12) return { label: `${level} Orta`, cls: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
  return { label: `${level} Yüksek`, cls: 'bg-red-100 text-red-800 border-red-300' };
}

export default function RisksOpportunitiesView() {
  const { role } = useAuth();
  const isManager = role === 'admin' || role === 'super_admin' || role === 'quality_manager';

  const [data, setData] = useState<RiskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<RiskRecord | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'risk' | 'opportunity'>('all');
  const [sortKey, setSortKey] = useState<string>('evaluation_date');
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from('risks_opportunities')
        .select('*')
        .order('evaluation_date', { ascending: false, nullsFirst: false })
        .order('risk_no', { ascending: false });
      if (err) throw err;
      setData(rows || []);
    } catch (err) {
      console.error('Risk fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    try {
      const { error: err } = await supabase.from('risks_opportunities').delete().eq('id', id);
      if (err) throw err;
      fetchData();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Kayıt silinirken bir hata oluştu!');
    }
  };

  const filtered = useMemo(() => {
    const base = data.filter(r => {
      if (filterType === 'all') return true;
      if (filterType === 'risk') return r.risk_type !== 'opportunity';
      return r.risk_type === 'opportunity';
    });
    return [...base].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'tr', { numeric: true });
      if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
      const rcmp = String(a.risk_no ?? '').localeCompare(String(b.risk_no ?? ''), 'tr', { numeric: true });
      return -rcmp;
    });
  }, [data, filterType, sortKey, sortDir]);

  const counts = {
    all: data.length,
    risk: data.filter(r => r.risk_type !== 'opportunity').length,
    opportunity: data.filter(r => r.risk_type === 'opportunity').length,
    high: data.filter(r => r.risk_level && r.risk_level > 12).length,
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-6 pt-16 md:pt-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-light text-gray-900">Riskler ve Fırsatlar</h1>
            <p className="text-xs text-slate-500 mt-1">Risk Değerlendirme Formu</p>
          </div>
          <button
            onClick={() => { setEditRecord(null); setModalOpen(true); }}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition-colors text-sm font-semibold shadow-sm self-start"
          >
            <Plus className="w-4 h-4" />
            Yeni Kayıt
          </button>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-3 mt-4">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-semibold text-slate-700">{counts.risk} Risk</span>
          </div>
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[11px] font-semibold text-green-700">{counts.opportunity} Fırsat</span>
          </div>
          {counts.high > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span className="text-[11px] font-semibold text-red-700">{counts.high} Yüksek Risk</span>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mt-3">
          {(['all', 'risk', 'opportunity'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all border ${
                filterType === t
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
              }`}
            >
              {t === 'all' ? `Tümü (${counts.all})` : t === 'risk' ? `Riskler (${counts.risk})` : `Fırsatlar (${counts.opportunity})`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Kayıt bulunamadı</p>
            <button
              onClick={() => { setEditRecord(null); setModalOpen(true); }}
              className="mt-4 inline-flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              İlk kaydı oluştur
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
                    {[
                      { key: 'risk_no', label: 'Risk No', cls: 'w-20' },
                      { key: 'risk_type', label: 'Tip', cls: 'w-16' },
                      { key: 'risk_definition', label: 'Risk Tanımı', cls: '' },
                      { key: 'impact_area', label: 'Etki Alanı', cls: 'w-24' },
                      { key: 'risk_level', label: 'Risk Derecesi', cls: 'w-28' },
                      { key: 're_risk_level', label: <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" />Tekrar</span>, cls: 'w-28' },
                      { key: 'activity_responsible', label: 'Sorumlu', cls: 'w-32' },
                      { key: 'deadline', label: 'Termin', cls: 'w-24' },
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className={`px-3 py-2.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide cursor-pointer select-none hover:bg-slate-100 transition-colors ${col.cls}`}
                      >
                        <span className="flex items-center gap-0.5">{col.label}<SortIcon col={col.key} /></span>
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-20">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(item => {
                    const badge = getRiskBadge(item.risk_level);
                    const reBadge = getRiskBadge(item.re_risk_level);
                    const isOverdue = item.deadline && new Date(item.deadline) < new Date();
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-2.5 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                          {item.risk_no || '—'}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border ${
                            item.risk_type === 'opportunity'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {item.risk_type === 'opportunity' ? 'Fırsat' : 'Risk'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-gray-700 max-w-xs">
                          <div className="truncate" title={item.risk_definition}>
                            {item.risk_definition || '—'}
                          </div>
                          {item.risk_impact && (
                            <div className="text-[10px] text-gray-400 truncate mt-0.5" title={item.risk_impact}>
                              {item.risk_impact}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-gray-600 whitespace-nowrap">
                          {item.impact_area || '—'}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${badge.cls}`}>
                            {badge.label}
                          </span>
                          {item.probability && item.severity && (
                            <div className="text-[9px] text-gray-400 mt-0.5">{item.probability}×{item.severity}</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {item.re_risk_level ? (
                            <>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${reBadge.cls}`}>
                                {reBadge.label}
                              </span>
                              {item.re_probability && item.re_severity && (
                                <div className="text-[9px] text-gray-400 mt-0.5">{item.re_probability}×{item.re_severity}</div>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-300 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-gray-600 whitespace-nowrap">
                          {item.activity_responsible || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] whitespace-nowrap">
                          <span className={isOverdue ? 'text-red-700 font-semibold' : 'text-gray-600'}>
                            {item.deadline ? new Date(item.deadline).toLocaleDateString('tr-TR') : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setEditRecord(item); setModalOpen(true); }}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                              title="Düzenle"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {isManager && (
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                title="Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 px-3 py-1.5 border-t border-gray-200">
              <p className="text-[10px] text-gray-600">
                Toplam <span className="font-semibold text-gray-900">{filtered.length}</span> kayıt
              </p>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <RiskFormModal
          record={editRecord}
          onClose={() => { setModalOpen(false); setEditRecord(null); }}
          onSaved={() => { setModalOpen(false); setEditRecord(null); fetchData(); }}
        />
      )}
    </div>
  );
}
