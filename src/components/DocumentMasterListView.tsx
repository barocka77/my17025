import { useEffect, useState, useMemo } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Filter, X, RotateCcw, ListOrdered, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DocumentMasterListFormModal from './DocumentMasterListFormModal';

interface DocumentRecord {
  id: string;
  sira_no: number;
  dokuman_kodu: string;
  dokuman_adi: string;
  ilk_yayin_tarihi: string | null;
  revizyon_tarihi: string | null;
  rev_no: string;
  guncellik_kontrol_tarihi: string | null;
  aktif: boolean;
  created_at: string;
  updated_at: string;
}

export default function DocumentMasterListView() {
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'super_admin';

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string>('sira_no');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

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

  const fetchDocuments = async (includeDeleted = false) => {
    setLoading(true);
    try {
      let query = supabase
        .from('document_master_list')
        .select('*')
        .order('sira_no', { ascending: true });

      if (includeDeleted) {
        query = query.eq('aktif', false);
      } else {
        query = query.eq('aktif', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDocuments(data || []);
      setFilteredDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments(showDeleted);
  }, [showDeleted]);

  useEffect(() => {
    let filtered = [...documents];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          (d.dokuman_kodu || '').toLowerCase().includes(q) ||
          (d.dokuman_adi || '').toLowerCase().includes(q) ||
          (d.rev_no || '').toLowerCase().includes(q) ||
          String(d.sira_no).includes(q)
      );
    }

    setFilteredDocuments(filtered);
  }, [searchQuery, documents]);

  const sortedDocuments = useMemo(() => {
    return [...filteredDocuments].sort((a, b) => {
      const av = a[sortKey as keyof DocumentRecord] ?? '';
      const bv = b[sortKey as keyof DocumentRecord] ?? '';
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'tr', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredDocuments, sortKey, sortDir]);

  const handleSoftDelete = async (id: string) => {
    if (!confirm('Bu dokümanı silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('document_master_list')
        .update({ aktif: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      fetchDocuments(showDeleted);
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleRestore = async (id: string) => {
    if (!confirm('Bu dokümanı geri yüklemek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('document_master_list')
        .update({ aktif: true, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      fetchDocuments(showDeleted);
    } catch (error) {
      console.error('Error restoring document:', error);
    }
  };

  const handleEdit = (doc: DocumentRecord) => {
    setEditData({ ...doc });
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditData(null);
    setIsModalOpen(true);
  };

  const clearFilters = () => {
    setSearchQuery('');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

  const hasActiveFilters = searchQuery.trim().length > 0;

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <ListOrdered className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erişim Engellendi</h3>
          <p className="text-gray-500">Bu modüle yalnızca yöneticiler erişebilir.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-6 pt-16 md:pt-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-light text-gray-900">Ana Doküman Listesi</h1>
            <p className="mt-3 text-xs md:text-sm text-gray-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
              <span className="font-semibold text-slate-800">Doküman Yönetimi:</span> Tüm yönetim sistemi dokümanlarının güncel listesi ve revizyon takibi.
            </p>
          </div>
          <div className="flex gap-2 md:gap-3">
            <button
              onClick={() => setShowDeleted(!showDeleted)}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all shadow-sm font-medium text-xs md:text-sm ${
                showDeleted
                  ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Pasif Dokümanlar</span>
              <span className="sm:hidden">Pasif</span>
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-gray-700 px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-all shadow-sm font-medium relative text-xs md:text-sm"
            >
              <Filter className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Filtrele</span>
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-slate-600 text-white text-[10px] md:text-xs font-bold w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center">
                  1
                </span>
              )}
            </button>
            <button
              onClick={handleAddNew}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-slate-700 transition-all shadow-sm hover:shadow-md font-medium text-xs md:text-sm"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Yeni Doküman Ekle</span>
              <span className="sm:hidden">Yeni</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 md:mt-6 p-4 md:p-6 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h3 className="text-xs md:text-sm font-semibold text-gray-900 uppercase tracking-wide">Filtreler</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs md:text-sm text-slate-600 hover:text-slate-800 font-medium flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Temizle
                </button>
              )}
            </div>
            <div>
              <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Arama</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Doküman kodu, adı veya sıra no ile arayın..."
                  className="w-full pl-10 pr-3 py-2.5 text-[11px] md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Yükleniyor...</p>
            </div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12 md:py-16">
            <ListOrdered className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">
              {hasActiveFilters ? 'Arama kriterlerine uygun kayıt bulunamadı' : 'Henüz doküman eklenmemiş'}
            </h3>
            <p className="text-sm md:text-base text-gray-500 mb-4 md:mb-6">
              {hasActiveFilters ? 'Farklı arama terimleri deneyebilirsiniz' : 'İlk dokümanı eklemek için yukarıdaki butona tıklayın'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-slate-600 hover:text-slate-800 font-medium text-sm md:text-base py-2 px-4"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className={`rounded-lg shadow-sm border p-4 ${
                    !doc.aktif ? 'bg-gray-50 border-gray-300 opacity-70' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          #{doc.sira_no}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">{doc.dokuman_kodu}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 mt-1">{doc.dokuman_adi}</div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600">
                    {doc.rev_no && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">Rev:</span>
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-medium">{doc.rev_no}</span>
                      </div>
                    )}
                    {doc.ilk_yayin_tarihi && (
                      <div><span className="font-medium">İlk Yayın:</span> {formatDate(doc.ilk_yayin_tarihi)}</div>
                    )}
                    {doc.revizyon_tarihi && (
                      <div><span className="font-medium">Revizyon:</span> {formatDate(doc.revizyon_tarihi)}</div>
                    )}
                    {doc.guncellik_kontrol_tarihi && (
                      <div><span className="font-medium">Güncellik Kontrol:</span> {formatDate(doc.guncellik_kontrol_tarihi)}</div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
                    {!doc.aktif && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-200 text-gray-600 border border-gray-300">
                        Pasif
                      </span>
                    )}
                    {doc.aktif && <span />}
                    <div className="flex gap-1">
                      {!doc.aktif ? (
                        <button
                          onClick={() => handleRestore(doc.id)}
                          className="inline-flex items-center gap-1 text-green-700 hover:text-green-900 hover:bg-green-50 px-2 py-1 rounded text-[10px] font-medium transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Geri Yükle
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(doc)}
                            className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSoftDelete(doc.id)}
                            className="inline-flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
                      {[
                        { key: 'sira_no', label: 'Sıra No', cls: 'w-16' },
                        { key: 'dokuman_kodu', label: 'Doküman Kodu', cls: 'w-28' },
                        { key: 'dokuman_adi', label: 'Doküman Adı', cls: '' },
                        { key: 'ilk_yayin_tarihi', label: 'İlk Yayın', cls: 'w-24' },
                        { key: 'revizyon_tarihi', label: 'Revizyon', cls: 'w-24' },
                        { key: 'rev_no', label: 'Rev. No', cls: 'w-16' },
                        { key: 'guncellik_kontrol_tarihi', label: 'Güncellik Kontrol', cls: 'w-28' },
                      ].map(col => (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className={`px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide cursor-pointer select-none hover:bg-slate-100 transition-colors ${col.cls}`}
                        >
                          {col.label}<SortIcon col={col.key} />
                        </th>
                      ))}
                      <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-28">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedDocuments.map((doc) => (
                      <tr
                        key={doc.id}
                        className={`transition-colors border-b ${
                          !doc.aktif
                            ? 'bg-gray-50 opacity-70 border-gray-200'
                            : 'hover:bg-slate-50/50 border-gray-100'
                        }`}
                      >
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          <span className="text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                            {doc.sira_no}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          <span className="text-[11px] font-medium text-slate-700">{doc.dokuman_kodu}</span>
                        </td>
                        <td className="px-3 py-1.5">
                          <span className="text-[11px] text-gray-900">{doc.dokuman_adi}</span>
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-[11px] text-gray-700">
                          {formatDate(doc.ilk_yayin_tarihi)}
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-[11px] text-gray-700">
                          {formatDate(doc.revizyon_tarihi)}
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          {doc.rev_no ? (
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-medium">
                              {doc.rev_no}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-[11px] text-gray-700">
                          {formatDate(doc.guncellik_kontrol_tarihi)}
                        </td>
                        <td className="px-3 py-1.5 text-right whitespace-nowrap space-x-1">
                          {!doc.aktif ? (
                            <>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-200 text-gray-600 border border-gray-300 mr-1">
                                Pasif
                              </span>
                              <button
                                onClick={() => handleRestore(doc.id)}
                                className="inline-flex items-center gap-0.5 text-green-700 hover:text-green-900 hover:bg-green-50 px-1.5 py-0.5 rounded text-[10px] transition-colors"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                Geri Yükle
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(doc)}
                                className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-1.5 py-0.5 rounded text-[10px] transition-colors"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                                Düzenle
                              </button>
                              <button
                                onClick={() => handleSoftDelete(doc.id)}
                                className="inline-flex items-center gap-0.5 text-red-600 hover:text-red-800 hover:bg-red-50 px-1.5 py-0.5 rounded text-[10px] transition-colors"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                                Sil
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {sortedDocuments.length > 0 && (
                <div className="bg-gray-50 px-3 py-1.5 border-t border-gray-200">
                  <p className="text-[10px] text-gray-600">
                    Toplam <span className="font-semibold text-gray-900">{sortedDocuments.length}</span> kayıt
                    {documents.length !== sortedDocuments.length && (
                      <span> (Tüm kayıtlar: {documents.length})</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Mobile Footer */}
            {filteredDocuments.length > 0 && (
              <div className="md:hidden mt-3 bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-2.5">
                <p className="text-[11px] text-gray-600 text-center">
                  Toplam <span className="font-semibold text-gray-900">{filteredDocuments.length}</span> kayıt
                  {documents.length !== filteredDocuments.length && (
                    <span> (Tüm kayıtlar: {documents.length})</span>
                  )}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <DocumentMasterListFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditData(null);
        }}
        onSuccess={() => fetchDocuments(showDeleted)}
        editData={editData}
      />
    </div>
  );
}
