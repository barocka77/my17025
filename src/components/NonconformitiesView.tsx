import { useEffect, useState, useMemo } from 'react';
import { Plus, X, Save, AlertTriangle, AlertCircle, CheckCircle2, Clock, Users, Pencil, FlaskConical, Search, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import NonconformityDetailDrawer from './NonconformityDetailDrawer';

const SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'minor', label: 'Düşük' },
  { value: 'major', label: 'Orta' },
  { value: 'critical', label: 'Kritik' },
];

const RECURRENCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'low', label: 'Düşük' },
  { value: 'medium', label: 'Orta' },
  { value: 'high', label: 'Yüksek' },
];

const CALIBRATION_IMPACT_OPTIONS: { value: string; label: string }[] = [
  { value: 'none', label: 'Etkisi Yok' },
  { value: 'potential', label: 'Etkileme İhtimali' },
  { value: 'confirmed', label: 'Etkiledi' },
];

const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'internal_audit', label: 'İç Tetkik' },
  { value: 'external_audit', label: 'Dış Tetkik' },
  { value: 'customer_feedback', label: 'Müşteri Geri Bildirimi' },
  { value: 'risk_analysis', label: 'Risk Analizi' },
  { value: 'data_control', label: 'Veri Kontrolü' },
  { value: 'lak', label: 'Laboratuvarlar Arası Karşılaştırma (LAK)' },
  { value: 'pak', label: 'Personeller Arası Karşılaştırma (PAK)' },
  { value: 'personnel_observation', label: 'Personel Gözlemi' },
  { value: 'ineffective_df', label: 'Etkisiz DF' },
  { value: 'other', label: 'Diğer' },
];

const severityConfig: Record<string, { label: string; className: string }> = {
  minor: { label: 'Düşük', className: 'bg-green-100 text-green-800 border-green-200' },
  major: { label: 'Orta', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  critical: { label: 'Kritik', className: 'bg-red-100 text-red-800 border-red-200' },
};

const sourceConfig: Record<string, { label: string; className: string }> = {
  internal_audit:      { label: 'İç Tetkik',         className: 'bg-blue-100 text-blue-800 border-blue-200' },
  external_audit:      { label: 'Dış Tetkik',         className: 'bg-violet-100 text-violet-800 border-violet-200' },
  customer_feedback:   { label: 'Müşteri Geri Bildirimi', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  risk_analysis:       { label: 'Risk Analizi',        className: 'bg-rose-100 text-rose-800 border-rose-200' },
  data_control:        { label: 'Veri Kontrolü',       className: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  lak:                 { label: 'LAK',                 className: 'bg-teal-100 text-teal-800 border-teal-200' },
  pak:                 { label: 'PAK',                 className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  personnel_observation: { label: 'Personel Gözlemi', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  ineffective_df:      { label: 'Etkisiz DF',          className: 'bg-red-100 text-red-800 border-red-200' },
  other:               { label: 'Diğer',               className: 'bg-gray-100 text-gray-700 border-gray-200' },
};

const ncStatusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  open: { label: 'Açık', className: 'bg-red-100 text-red-800 border-red-200', icon: <AlertCircle className="w-2.5 h-2.5" /> },
  analysis: { label: 'Analiz', className: 'bg-orange-100 text-orange-800 border-orange-200', icon: <Clock className="w-2.5 h-2.5" /> },
  action_required: { label: 'Aksiyon Gerekli', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <AlertTriangle className="w-2.5 h-2.5" /> },
  monitoring: { label: 'İzlemede', className: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Clock className="w-2.5 h-2.5" /> },
  closed: { label: 'Kapalı', className: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle2 className="w-2.5 h-2.5" /> },
  Açık: { label: 'Açık', className: 'bg-red-100 text-red-800 border-red-200', icon: <AlertCircle className="w-2.5 h-2.5" /> },
  İşlemde: { label: 'İşlemde', className: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Clock className="w-2.5 h-2.5" /> },
  Kapalı: { label: 'Kapalı', className: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle2 className="w-2.5 h-2.5" /> },
};

const EMPTY_FORM = {
  detection_date: '',
  source: '',
  description: '',
  severity: 'major',
  recurrence_risk: 'medium',
  calibration_impact: 'none',
  identified_by: '',
  analysis_team: [] as string[],
  impact_inappropriate_calibration: false,
  impact_requires_stoppage: false,
  impact_recurrence_possible: false,
  impact_requires_extended_analysis: false,
};

interface NcFormData {
  detection_date: string;
  source: string;
  description: string;
  severity: string;
  recurrence_risk: string;
  calibration_impact: string;
  identified_by: string;
  analysis_team: string[];
  impact_inappropriate_calibration: boolean;
  impact_requires_stoppage: boolean;
  impact_recurrence_possible: boolean;
  impact_requires_extended_analysis: boolean;
}


export default function NonconformitiesView() {
  const { role } = useAuth();
  const isManager = role === 'admin' || role === 'super_admin' || role === 'quality_manager';

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<NcFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNcId, setSelectedNcId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string; job_title: string | null; role: string | null; department: string | null }[]>([]);

  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string>('nc_number');
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

  const activeFilterCount = [filterStatus, filterSeverity, filterSource, filterDateFrom, filterDateTo].filter(Boolean).length;

  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (searchText) {
        const q = searchText.toLowerCase();
        const matchesSearch =
          (item.nc_number || '').toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      if (filterStatus && item.status !== filterStatus) return false;
      if (filterSeverity && item.severity !== filterSeverity) return false;
      if (filterSource && item.source !== filterSource) return false;
      if (filterDateFrom && item.detection_date && item.detection_date < filterDateFrom) return false;
      if (filterDateTo && item.detection_date && item.detection_date > filterDateTo) return false;
      return true;
    });
  }, [data, searchText, filterStatus, filterSeverity, filterSource, filterDateFrom, filterDateTo]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = String(av).localeCompare(String(bv), 'tr', { numeric: true });
      if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
      const ancmp = String(a.nc_number ?? '').localeCompare(String(b.nc_number ?? ''), 'tr', { numeric: true });
      return sortDir === 'asc' ? ancmp : -ancmp;
    });
  }, [filteredData, sortKey, sortDir]);

  const clearFilters = () => {
    setSearchText('');
    setFilterStatus('');
    setFilterSeverity('');
    setFilterSource('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  useEffect(() => {
    fetchData();
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data: rows, error: err } = await supabase.rpc('get_personnel_list');
      if (err) throw err;
      setProfiles((rows || []) as { id: string; full_name: string; job_title: string | null; role: string | null; department: string | null }[]);
    } catch (err) {
      console.error('Profiles fetch error:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from('nonconformities')
        .select('*')
        .order('nc_number', { ascending: true });
      if (err) throw err;
      setData(rows || []);
    } catch (err) {
      console.error('NC fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    setError(null);
    setEditingId(item.id);

    let teamIds: string[] = [];
    try {
      const { data: teamRows } = await supabase
        .from('nonconformity_analysis_team')
        .select('user_id')
        .eq('nonconformity_id', item.id);
      teamIds = (teamRows || []).map((r: any) => r.user_id);
    } catch {
      teamIds = Array.isArray(item.analysis_team) ? item.analysis_team : [];
    }

    setFormData({
      detection_date: item.detection_date || '',
      source: item.source || '',
      description: item.description || '',
      severity: item.severity || 'major',
      recurrence_risk: item.recurrence_risk || 'medium',
      calibration_impact: item.calibration_impact || 'none',
      identified_by: item.identified_by || '',
      analysis_team: teamIds,
      impact_inappropriate_calibration: item.impact_inappropriate_calibration ?? false,
      impact_requires_stoppage: item.impact_requires_stoppage ?? false,
      impact_recurrence_possible: item.impact_recurrence_possible ?? false,
      impact_requires_extended_analysis: item.impact_requires_extended_analysis ?? false,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { analysis_team, ...ncData } = formData;

      if (editingId) {
        const { error: updateErr } = await supabase
          .from('nonconformities')
          .update({ ...ncData, analysis_team: analysis_team })
          .eq('id', editingId);
        if (updateErr) throw updateErr;

        const { data: existingRows, error: fetchErr } = await supabase
          .from('nonconformity_analysis_team')
          .select('id, user_id')
          .eq('nonconformity_id', editingId);
        if (fetchErr) throw fetchErr;

        const existingIds = (existingRows || []).map((r: any) => r.user_id as string);
        const toDelete = (existingRows || []).filter((r: any) => !analysis_team.includes(r.user_id));
        const toAdd = analysis_team.filter(uid => !existingIds.includes(uid));

        if (toDelete.length > 0) {
          const deleteIds = toDelete.map((r: any) => r.id);
          const { error: delErr } = await supabase
            .from('nonconformity_analysis_team')
            .delete()
            .in('id', deleteIds);
          if (delErr) throw delErr;
        }

        if (toAdd.length > 0) {
          const teamRows = toAdd.map(userId => ({
            nonconformity_id: editingId,
            user_id: userId,
            role: 'member',
          }));
          const { error: teamErr } = await supabase.from('nonconformity_analysis_team').insert(teamRows);
          if (teamErr) throw teamErr;
        }
      } else {
        const { data: newNc, error: ncErr } = await supabase
          .from('nonconformities')
          .insert([{ ...ncData, analysis_team }])
          .select('id')
          .single();
        if (ncErr) throw ncErr;

        if (analysis_team.length > 0) {
          const teamRows = analysis_team.map(userId => ({
            nonconformity_id: newNc.id,
            user_id: userId,
            role: 'member',
          }));
          const { error: teamErr } = await supabase.from('nonconformity_analysis_team').insert(teamRows);
          if (teamErr) throw teamErr;
        }
      }

      closeModal();
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
      const { error: err } = await supabase.from('nonconformities').delete().eq('id', id);
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
            <h1 className="text-xl md:text-3xl font-light text-gray-900">Uygunsuzluklar</h1>
          </div>
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 bg-slate-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-slate-700 transition-all shadow-sm hover:shadow-md font-medium text-xs md:text-sm"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Yeni Uygunsuzluk</span>
            <span className="sm:hidden">Yeni</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8">

        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="NC No veya açıklama ara..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all placeholder-gray-400"
              />
              {searchText && (
                <button onClick={() => setSearchText('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setFiltersOpen(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                filtersOpen || activeFilterCount > 0
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white text-slate-700 border-gray-200 hover:border-slate-400'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filtreler
              {activeFilterCount > 0 && (
                <span className="bg-white text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={`w-3 h-3 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 text-xs font-medium transition-all"
              >
                <X className="w-3.5 h-3.5" />
                Temizle
              </button>
            )}
          </div>

          {filtersOpen && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 shadow-sm">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Durum</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent bg-white"
                >
                  <option value="">Tümü</option>
                  <option value="open">Açık</option>
                  <option value="analysis">Analiz</option>
                  <option value="action_required">Aksiyon Gerekli</option>
                  <option value="monitoring">İzlemede</option>
                  <option value="closed">Kapalı</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Şiddet</label>
                <select
                  value={filterSeverity}
                  onChange={e => setFilterSeverity(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent bg-white"
                >
                  <option value="">Tümü</option>
                  {SEVERITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Kaynak</label>
                <select
                  value={filterSource}
                  onChange={e => setFilterSource(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent bg-white"
                >
                  <option value="">Tümü</option>
                  {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Tarih Başlangıç</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Tarih Bitiş</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={e => setFilterDateTo(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {data.length === 0 ? 'Kayıt bulunamadı' : 'Filtreyle eşleşen kayıt bulunamadı'}
            </p>
            {data.length > 0 && activeFilterCount > 0 && (
              <button onClick={clearFilters} className="mt-3 text-xs text-slate-500 underline hover:text-slate-700">
                Filtreleri temizle
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
                    {[
                      { key: 'nc_number', label: 'NC No', cls: 'w-32' },
                      { key: 'source', label: 'Tespit Noktası', cls: 'w-36' },
                      { key: 'detection_date', label: 'Tespit Tarihi', cls: 'w-28' },
                      { key: 'description', label: 'Açıklama', cls: '' },
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
                      <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-28">İşlemler</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedData.map(item => {
                    const st = ncStatusConfig[item.status] || { label: item.status, className: 'bg-gray-100 text-gray-800 border-gray-200', icon: null };
                    return (
                      <tr key={item.id} onClick={() => setSelectedNcId(item.id)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                        <td className="px-3 py-2 text-[11px] font-medium text-slate-700 whitespace-nowrap">
                          {item.nc_number || '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {item.source ? (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${(sourceConfig[item.source] || { className: 'bg-gray-100 text-gray-700 border-gray-200' }).className}`}>
                              {(sourceConfig[item.source] || { label: item.source }).label}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-gray-600 whitespace-nowrap">
                          {item.detection_date ? new Date(item.detection_date).toLocaleDateString('tr-TR') : '-'}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-gray-700 max-w-xs">
                          <div className="truncate" title={item.description}>
                            {item.description || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${st.className}`}>
                            {st.icon}
                            {st.label}
                          </span>
                        </td>
                        {isManager && (
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={e => openEditModal(e, item)}
                                className="inline-flex items-center gap-0.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-1.5 py-0.5 rounded text-[10px] transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                                Düzenle
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); setSelectedNcId(item.id); }}
                                className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-1.5 py-0.5 rounded text-[10px] transition-colors"
                              >
                                <FlaskConical className="w-3 h-3" />
                                U. Analizi
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                                className="inline-flex items-center gap-0.5 text-red-600 hover:text-red-800 hover:bg-red-50 px-1.5 py-0.5 rounded text-[10px] transition-colors"
                              >
                                Sil
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 px-3 py-1.5 border-t border-gray-200 flex items-center justify-between">
              <p className="text-[10px] text-gray-600">
                {activeFilterCount > 0
                  ? <><span className="font-semibold text-gray-900">{sortedData.length}</span> / {data.length} kayıt gösteriliyor</>
                  : <>Toplam <span className="font-semibold text-gray-900">{data.length}</span> kayıt</>
                }
              </p>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-[10px] text-slate-500 hover:text-slate-700 underline">
                  Filtreleri temizle
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white md:rounded-2xl shadow-2xl w-full h-full md:h-auto md:max-w-xl md:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-slate-700 to-slate-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm md:text-base font-bold">
                  Uygunsuzluk Kaydı
                </h3>
              </div>
              <button
                onClick={closeModal}
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
                  Tespit Tarihi
                </label>
                <input
                  type="date"
                  value={formData.detection_date}
                  onChange={e => setFormData({ ...formData, detection_date: e.target.value })}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Tespit Noktası
                </label>
                <select
                  value={formData.source}
                  onChange={e => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                >
                  <option value="">-- Seçiniz --</option>
                  {SOURCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} disabled={!editingId && opt.value === 'ineffective_df'}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Uygunsuzluk Tanımı
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                  placeholder="Uygunsuzluk açıklamasını girin..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Uygunsuzluğu Tanımlayan
                </label>
                <select
                  value={formData.identified_by}
                  onChange={e => setFormData({ ...formData, identified_by: e.target.value })}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                >
                  <option value="">-- Seçiniz --</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}{p.job_title ? ` — ${p.job_title}` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  <Users className="w-3.5 h-3.5" />
                  Analiz Ekibi
                  {formData.analysis_team.length > 0 && (
                    <span className="ml-1 bg-slate-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      {formData.analysis_team.length}
                    </span>
                  )}
                </label>
                <select
                  value=""
                  onChange={e => {
                    const id = e.target.value;
                    if (!id) return;
                    setFormData(prev => ({
                      ...prev,
                      analysis_team: prev.analysis_team.includes(id)
                        ? prev.analysis_team.filter(i => i !== id)
                        : [...prev.analysis_team, id],
                    }));
                  }}
                  className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                >
                  <option value="">-- Ekip üyesi seç / çıkar --</option>
                  {profiles.map(p => {
                    const selected = formData.analysis_team.includes(p.id);
                    return (
                      <option key={p.id} value={p.id}>
                        {selected ? '✓ ' : '    '}{p.full_name}{p.job_title ? ` — ${p.job_title}` : ''}
                      </option>
                    );
                  })}
                </select>
                {formData.analysis_team.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formData.analysis_team.map(id => {
                      const p = profiles.find(pr => pr.id === id);
                      if (!p) return null;
                      return (
                        <span key={id} className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-medium px-2 py-1 rounded-md group">
                          {p.full_name}
                          <button
                            type="button"
                            onMouseDown={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              setFormData(prev => ({ ...prev, analysis_team: prev.analysis_team.filter(i => i !== id) }));
                            }}
                            className="ml-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-transparent hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
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
                  onClick={closeModal}
                  className="flex-1 bg-slate-100 text-slate-700 px-4 py-3 md:py-2 rounded-lg hover:bg-slate-200 transition-colors font-semibold text-xs"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedNcId && (
        <NonconformityDetailDrawer
          ncId={selectedNcId}
          onClose={() => setSelectedNcId(null)}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}

function ImpactToggle({ label, value, onChange, note }: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  note?: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
      <p className="text-[11px] text-slate-700 leading-snug mb-2">{label}</p>
      {note && value && (
        <p className="text-[10px] text-amber-700 font-semibold mb-2 bg-amber-50 border border-amber-200 px-2 py-1 rounded">{note}</p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold border transition-all ${
            !value
              ? 'bg-slate-700 text-white border-slate-700'
              : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'
          }`}
        >
          Hayır
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold border transition-all ${
            value
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'
          }`}
        >
          Evet
        </button>
      </div>
    </div>
  );
}
