import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Eye, AlertTriangle, Lightbulb, MessageSquare, Flag, Clock, CheckCircle2, PlayCircle, Filter, X, RotateCcw, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import CustomerFeedbackModal from './CustomerFeedbackModal';
import CustomerFeedbackDetailView from './CustomerFeedbackDetailView';
import { fetchFinalApprovalRoleNames } from '../utils/signatureService';

interface CustomerFeedbackViewProps {
  autoOpenRecordId?: string | null;
  onRecordOpened?: () => void;
}

const CustomerFeedbackView = ({ autoOpenRecordId, onRecordOpened }: CustomerFeedbackViewProps) => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [viewData, setViewData] = useState<any>(null);
  const [filters, setFilters] = useState({
    type: 'Tümü',
    status: 'Tümü',
    validation: 'Tümü',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [lockedRecordIds, setLockedRecordIds] = useState<Set<string>>(new Set());

  const fetchLockedRecords = async () => {
    const finalRoleNames = await fetchFinalApprovalRoleNames('customer_feedback');
    if (finalRoleNames.length === 0) return;
    const { data } = await supabase
      .from('record_signatures')
      .select('record_id')
      .eq('module_key', 'customer_feedback')
      .in('signer_role', finalRoleNames);
    if (data) {
      setLockedRecordIds(new Set(data.map(r => r.record_id)));
    }
  };

  const fetchFeedbacks = async (includeDeleted = false) => {
    setLoading(true);
    try {
      let query = supabase
        .from('feedback_records')
        .select('*')
        .order('form_date', { ascending: false });

      if (!isAdmin || !includeDeleted) {
        query = query.eq('is_deleted', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFeedbacks(data || []);
      setFilteredFeedbacks(data || []);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks(showDeleted);
    fetchLockedRecords();
  }, [showDeleted]);

  useEffect(() => {
    let filtered = [...feedbacks];

    if (filters.type !== 'Tümü') {
      filtered = filtered.filter(f => f.feedback_type === filters.type);
    }

    if (filters.status !== 'Tümü') {
      filtered = filtered.filter(f => f.status === filters.status);
    }

    if (filters.validation !== 'Tümü') {
      filtered = filtered.filter(f => f.validation_status === filters.validation);
    }

    setFilteredFeedbacks(filtered);
  }, [filters, feedbacks]);

  useEffect(() => {
    if (autoOpenRecordId && feedbacks.length > 0) {
      const record = feedbacks.find(f => f.id === autoOpenRecordId);
      if (record) {
        setViewData(record);
        setIsDetailViewOpen(true);
        if (onRecordOpened) {
          onRecordOpened();
        }
      }
    }
  }, [autoOpenRecordId, feedbacks, onRecordOpened]);

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('feedback_records')
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) throw error;
      fetchFeedbacks();
    } catch (error) {
      console.error('Error deleting feedback:', error);
      alert('Silme işlemi başarısız oldu.');
    }
  };

  const handleRestore = async (id: string) => {
    if (!confirm('Bu kaydı geri yüklemek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('feedback_records')
        .update({ is_deleted: false })
        .eq('id', id);

      if (error) throw error;
      fetchFeedbacks(showDeleted);
    } catch (error) {
      console.error('Error restoring feedback:', error);
      alert('Geri yükleme işlemi başarısız oldu.');
    }
  };

  const handleEdit = (feedback: any) => {
    setEditData({ ...feedback });
    setIsModalOpen(true);
  };

  const handleView = (feedback: any) => {
    setViewData(feedback);
    setIsDetailViewOpen(true);
  };

  const handleAddNew = () => {
    setEditData(null);
    setIsModalOpen(true);
  };

  const clearFilters = () => {
    setFilters({ type: 'Tümü', status: 'Tümü', validation: 'Tümü' });
  };

  const getFeedbackTypeIcon = (type: string) => {
    switch (type) {
      case 'Şikayet':
        return <AlertTriangle className="w-2.5 h-2.5" />;
      case 'Öneri':
        return <Lightbulb className="w-2.5 h-2.5" />;
      case 'İtiraz':
        return <Flag className="w-2.5 h-2.5" />;
      default:
        return <MessageSquare className="w-2.5 h-2.5" />;
    }
  };

  const getFeedbackTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      'Şikayet': 'bg-red-100 text-red-800 border-red-200',
      'Öneri': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'İtiraz': 'bg-orange-100 text-orange-800 border-orange-200',
      'İstek': 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return styles[type] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getSourceBadge = (source: string) => {
    const styles: Record<string, string> = {
      'Müşteri': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'Düzenleyici Kurum/Otorite': 'bg-purple-100 text-purple-800 border-purple-200',
      'Tüketici/Son Kullanıcı': 'bg-teal-100 text-teal-800 border-teal-200',
      'Rakip Laboratuvar': 'bg-pink-100 text-pink-800 border-pink-200',
      'Personel': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    };
    return styles[source] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getValidationBadge = (validation: string) => {
    if (validation === 'Değerlendirmede') {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (validation === 'Geçerli/Uygun') {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (validation === 'Geçersiz/Uygun Değil') {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Tamamlandı':
      case 'Kapatıldı':
        return <CheckCircle2 className="w-2.5 h-2.5" />;
      case 'Devam Ediyor':
        return <PlayCircle className="w-2.5 h-2.5" />;
      default:
        return <Clock className="w-2.5 h-2.5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Açık': 'bg-orange-100 text-orange-800 border-orange-200',
      'Devam Ediyor': 'bg-blue-100 text-blue-800 border-blue-200',
      'Tamamlandı': 'bg-green-100 text-green-800 border-green-200',
      'Kapatıldı': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return styles[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const isDeadlineUrgent = (deadline: string | null) => {
    if (!deadline) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);

    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays <= 3;
  };

  const getDeadlineStyle = (deadline: string | null) => {
    if (!deadline) return '';

    if (isDeadlineUrgent(deadline)) {
      return 'bg-red-100 text-red-800 font-semibold';
    }
    return '';
  };

  const activeFilterCount = [filters.type, filters.status, filters.validation].filter(f => f !== 'Tümü').length;

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-6 pt-16 md:pt-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-light text-gray-900">Şikayetler, İtirazlar, Talep ve Öneriler</h1>
            <p className="mt-3 text-xs md:text-sm text-gray-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
              <span className="font-semibold text-slate-800">Gelen Bildirim Yönetimi:</span> İçeriğin sisteme kaydı → Geçerliliğin Doğrulanması → Teknik/İdari Değerlendirme → Düzeltici Faaliyet Kararı → Kabul Bildirimi - Aksiyon → Süreç Kapanışı.
            </p>
          </div>
          <div className="flex gap-2 md:gap-3">
            {isAdmin && (
              <button
                onClick={() => setShowDeleted(!showDeleted)}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all shadow-sm font-medium text-xs md:text-sm ${
                  showDeleted
                    ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">Silinenleri Göster</span>
                <span className="sm:hidden">Silinenler</span>
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-gray-700 px-4 py-3 md:py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-all shadow-sm font-medium relative text-xs md:text-sm"
            >
              <Filter className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Filtrele</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-slate-600 text-white text-[10px] md:text-xs font-bold w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              onClick={handleAddNew}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-slate-700 transition-all shadow-sm hover:shadow-md font-medium text-xs md:text-sm"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Yeni Bildirim Ekle</span>
              <span className="sm:hidden">Yeni</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 md:mt-6 p-4 md:p-6 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h3 className="text-xs md:text-sm font-semibold text-gray-900 uppercase tracking-wide">Filtreler</h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs md:text-sm text-slate-600 hover:text-slate-800 font-medium flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Temizle
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div>
                <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Bildirim Türü</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full px-3 py-2.5 text-[11px] md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                >
                  <option>Tümü</option>
                  <option>İstek</option>
                  <option>Öneri</option>
                  <option>İtiraz</option>
                  <option>Şikayet</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Durum</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2.5 text-[11px] md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                >
                  <option>Tümü</option>
                  <option>Açık</option>
                  <option>Devam Ediyor</option>
                  <option>Tamamlandı</option>
                  <option>Kapatıldı</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Geçerlilik</label>
                <select
                  value={filters.validation}
                  onChange={(e) => setFilters({ ...filters, validation: e.target.value })}
                  className="w-full px-3 py-2.5 text-[11px] md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                >
                  <option>Tümü</option>
                  <option>Değerlendirmede</option>
                  <option>Geçerli/Uygun</option>
                  <option>Geçersiz/Uygun Değil</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Yükleniyor...</div>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="text-center py-12 md:py-16">
            <MessageSquare className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">
              {activeFilterCount > 0 ? 'Filtre kriterlerine uygun kayıt bulunamadı' : 'Henüz geri bildirim yok'}
            </h3>
            <p className="text-sm md:text-base text-gray-500 mb-4 md:mb-6">
              {activeFilterCount > 0 ? 'Farklı filtreler deneyebilirsiniz' : 'İlk geri bildirimi eklemek için yukarıdaki butona tıklayın'}
            </p>
            {activeFilterCount > 0 && (
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
              {filteredFeedbacks.map((feedback) => (
                <div key={feedback.id} className={`rounded-lg shadow-sm border p-4 ${feedback.is_deleted ? 'bg-gray-50 border-gray-300 opacity-70' : isDeadlineUrgent(feedback.deadline) ? 'bg-red-50 border-red-300 text-red-900' : 'bg-white border-gray-200'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-700">{feedback.application_no || '-'}</span>
                        <span className="text-[10px] text-gray-500">
                          {feedback.form_date ? new Date(feedback.form_date).toLocaleDateString('tr-TR') : '-'}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-900">{feedback.applicant_name || '-'}</div>
                      {feedback.contact_person && (
                        <div className="text-xs text-gray-500 mt-0.5">{feedback.contact_person}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {feedback.source_type && (
                      <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-medium border ${getSourceBadge(feedback.source_type)}`}>
                        {feedback.source_type === 'Düzenleyici Kurum/Otorite' ? 'Düz. Kurum' : feedback.source_type}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border ${getFeedbackTypeBadge(feedback.feedback_type)}`}>
                      {getFeedbackTypeIcon(feedback.feedback_type)}
                      {feedback.feedback_type || 'İstek'}
                    </span>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-gray-100">
                    <div className="flex flex-wrap gap-2">
                      {feedback.validation_status && (
                        <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-medium border ${getValidationBadge(feedback.validation_status)}`}>
                          {feedback.validation_status === 'Değerlendirmede'
                            ? 'İncelemede'
                            : feedback.validation_status === 'Geçerli/Uygun'
                            ? 'Geçerli'
                            : 'Geçersiz'}
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border ${getStatusBadge(feedback.status)}`}>
                        {getStatusIcon(feedback.status)}
                        {feedback.status || 'Açık'}
                      </span>
                    </div>

                    {feedback.responsible_person && (
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Sorumlu:</span> {feedback.responsible_person}
                      </div>
                    )}
                    {feedback.deadline && (
                      <div className={`text-xs px-2 py-1 rounded inline-block ${getDeadlineStyle(feedback.deadline) || 'text-gray-600'}`}>
                        <span className="font-medium">Termin:</span> {new Date(feedback.deadline).toLocaleDateString('tr-TR')}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    {feedback.is_deleted && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-200 text-gray-600 border border-gray-300">
                        Silinmiş
                      </span>
                    )}
                    {!feedback.is_deleted && <span />}
                    <div className="flex gap-1">
                      {feedback.is_deleted ? (
                        isAdmin && (
                          <button
                            onClick={() => handleRestore(feedback.id)}
                            className="inline-flex items-center gap-1 text-green-700 hover:text-green-900 hover:bg-green-50 px-2 py-1 rounded text-[10px] font-medium transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Geri Yükle
                          </button>
                        )
                      ) : (
                        <>
                          <button
                            onClick={() => handleView(feedback)}
                            className="inline-flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {lockedRecordIds.has(feedback.id) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded">
                              <Lock className="w-3 h-3" />
                              Imzali
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(feedback)}
                                className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(feedback.id)}
                                className="inline-flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
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
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-20">Tarih</th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-28">Başvuru No</th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Başvuru Sahibi</th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-24">Kaynak</th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-20">Tür</th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-28">Geçerlilik</th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-24">Durum</th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-28">Sorumlu</th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-20">Termin</th>
                    <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-36">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredFeedbacks.map((feedback) => (
                    <tr key={feedback.id} className={`transition-colors border-b ${feedback.is_deleted ? 'bg-gray-50 opacity-70 border-gray-200' : isDeadlineUrgent(feedback.deadline) ? 'bg-red-50 hover:bg-red-100 text-red-900 border-red-200' : 'hover:bg-slate-50/50 border-gray-100'}`}>
                      <td className="px-3 py-1.5 whitespace-nowrap text-[11px] text-gray-900">
                        {feedback.form_date ? new Date(feedback.form_date).toLocaleDateString('tr-TR') : '-'}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <span className="text-[11px] font-medium text-slate-700">{feedback.application_no || '-'}</span>
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="text-[11px] leading-tight">
                          <div className="font-medium text-gray-900 leading-[1.3]">{feedback.applicant_name || '-'}</div>
                          {feedback.contact_person && (
                            <div className="text-gray-500 mt-0.5 leading-[1.3]">{feedback.contact_person}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {feedback.source_type && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getSourceBadge(feedback.source_type)}`}>
                            {feedback.source_type === 'Düzenleyici Kurum/Otorite' ? 'Düz. Kurum' : feedback.source_type === 'Müşteri' ? 'Müşteri' : feedback.source_type.substring(0, 8)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${getFeedbackTypeBadge(feedback.feedback_type)}`}>
                          {getFeedbackTypeIcon(feedback.feedback_type)}
                          {feedback.feedback_type || 'İstek'}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {feedback.validation_status && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getValidationBadge(feedback.validation_status)}`}>
                            {feedback.validation_status === 'Değerlendirmede'
                              ? 'İncelemede'
                              : feedback.validation_status === 'Geçerli/Uygun'
                              ? 'Geçerli'
                              : 'Geçersiz'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusBadge(feedback.status)}`}>
                          {getStatusIcon(feedback.status)}
                          {feedback.status || 'Açık'}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-[11px] text-gray-700">
                        {feedback.responsible_person || '-'}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-[11px]">
                        <span className={`px-2 py-1 rounded inline-block ${getDeadlineStyle(feedback.deadline) || 'text-gray-900'}`}>
                          {feedback.deadline ? new Date(feedback.deadline).toLocaleDateString('tr-TR') : '-'}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap space-x-1">
                        {feedback.is_deleted ? (
                          <>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-200 text-gray-600 border border-gray-300 mr-1">
                              Silinmiş
                            </span>
                            {isAdmin && (
                              <button
                                onClick={() => handleRestore(feedback.id)}
                                className="inline-flex items-center gap-0.5 text-green-700 hover:text-green-900 hover:bg-green-50 px-1.5 py-0.5 rounded text-[10px] transition-colors"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                Geri Yükle
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleView(feedback)}
                              className="inline-flex items-center gap-0.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded text-[10px] transition-colors"
                            >
                              <Eye className="w-2.5 h-2.5" />
                              Goruntule
                            </button>
                            {lockedRecordIds.has(feedback.id) ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded">
                                <Lock className="w-2.5 h-2.5" />
                                Imzali
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEdit(feedback)}
                                  className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-1.5 py-0.5 rounded text-[10px] transition-colors"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                  Duzenle
                                </button>
                                <button
                                  onClick={() => handleDelete(feedback.id)}
                                  className="inline-flex items-center gap-0.5 text-red-600 hover:text-red-800 hover:bg-red-50 px-1.5 py-0.5 rounded text-[10px] transition-colors"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                  Sil
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredFeedbacks.length > 0 && (
              <div className="bg-gray-50 px-3 py-1.5 border-t border-gray-200">
                <p className="text-[10px] text-gray-600">
                  Toplam <span className="font-semibold text-gray-900">{filteredFeedbacks.length}</span> kayıt
                  {feedbacks.length !== filteredFeedbacks.length && (
                    <span> (Tüm kayıtlar: {feedbacks.length})</span>
                  )}
                </p>
              </div>
            )}
          </div>

            {/* Mobile Footer */}
            {filteredFeedbacks.length > 0 && (
              <div className="md:hidden mt-3 bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-2.5">
                <p className="text-[11px] text-gray-600 text-center">
                  Toplam <span className="font-semibold text-gray-900">{filteredFeedbacks.length}</span> kayıt
                  {feedbacks.length !== filteredFeedbacks.length && (
                    <span> (Tüm kayıtlar: {feedbacks.length})</span>
                  )}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <CustomerFeedbackModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditData(null);
        }}
        onSuccess={fetchFeedbacks}
        editData={editData}
      />

      <CustomerFeedbackDetailView
        isOpen={isDetailViewOpen}
        onClose={() => {
          setIsDetailViewOpen(false);
          setViewData(null);
          fetchLockedRecords();
        }}
        data={viewData}
      />
    </div>
  );
};

export default CustomerFeedbackView;
