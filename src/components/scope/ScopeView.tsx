import { useState, useEffect, useCallback } from 'react';
import { Plus, Download, Pencil, Trash2, Award, Search, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ScopeFormModal, { type ScopeRow } from './ScopeFormModal';
import { exportScopePDF } from '../../utils/pdf/scopePdfExport';

export default function ScopeView() {
  const { role } = useAuth();
  const [items, setItems] = useState<ScopeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ScopeRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScopeRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = role === 'admin' || role === 'quality_manager' || role === 'super_admin';

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('accreditation_scope')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (err) {
      setError(err.message);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const { error: err } = await supabase
      .from('accreditation_scope')
      .delete()
      .eq('id', deleteTarget.id);
    setDeleteLoading(false);
    if (!err) {
      setDeleteTarget(null);
      fetchItems();
    }
  };

  const handleOpenAdd = () => {
    setEditItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: ScopeRow) => {
    setEditItem(item);
    setModalOpen(true);
  };

  const handlePDF = async () => {
    setPdfLoading(true);
    try {
      await exportScopePDF(filtered);
    } finally {
      setPdfLoading(false);
    }
  };

  const filtered = items.filter(item =>
    [item.parameter, item.method, item.range, item.uncertainty]
      .some(f => f.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Akreditasyon Kapsamı</h1>
            <p className="text-[11px] text-slate-500">TS EN ISO/IEC 17025:2017 — Akredite Deney / Ölçüm Kapsamı</p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mt-4 flex items-center gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            <span className="text-[12px] font-semibold text-blue-800">{items.length} Kapsam Kalemi</span>
          </div>
          {filtered.length !== items.length && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2">
              <span className="text-[12px] text-slate-600">{filtered.length} sonuç gösteriliyor</span>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Parametre, metod veya aralık ara..."
            className="w-full pl-9 pr-4 py-2.5 text-[12px] border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
          />
        </div>

        <button
          onClick={fetchItems}
          title="Yenile"
          className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-[12px] font-medium"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          onClick={handlePDF}
          disabled={pdfLoading || filtered.length === 0}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all text-[12px] font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {pdfLoading ? 'Oluşturuluyor...' : 'Kapsamı PDF İndir'}
        </button>

        {canEdit && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all text-[12px] font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Yeni Ekle
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-500">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            <span className="text-sm">Yükleniyor...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <Award className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium text-sm">
              {search ? 'Arama kriterlerine uyan kayıt bulunamadı.' : 'Henüz kapsam kalemi eklenmemiş.'}
            </p>
            {!search && canEdit && (
              <button
                onClick={handleOpenAdd}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                İlk Kalemi Ekle
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide w-10 text-center">#</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide">Ölçülen Büyüklük / Parametre</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide">Deney / Ölçüm Metodu</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide">Ölçüm Aralığı</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide">Genişletilmiş Belirsizlik</th>
                  {canEdit && (
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-center w-24">İşlem</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-t border-slate-100 transition-colors hover:bg-blue-50/40 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    <td className="px-4 py-3 text-center">
                      <span className="text-[11px] font-semibold text-slate-500">{idx + 1}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[12px] font-medium text-slate-900 leading-relaxed">{item.parameter}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[12px] text-slate-700 leading-relaxed">{item.method}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[12px] text-slate-600">{item.range || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[12px] text-slate-600">{item.uncertainty || '—'}</p>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                            title="Düzenle"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Kalemi Sil</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Bu işlem geri alınamaz.</p>
              </div>
            </div>
            <p className="text-[12px] text-slate-700 bg-slate-50 rounded-lg p-3 mb-5 border border-slate-200 leading-relaxed">
              <span className="font-semibold">{deleteTarget.parameter}</span> kalemini silmek istediğinize emin misiniz?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {deleteLoading ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      <ScopeFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchItems}
        editData={editItem}
      />
    </div>
  );
}
