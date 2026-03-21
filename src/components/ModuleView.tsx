import { useEffect, useState } from 'react';
import { Plus, CreditCard as Edit2, Trash2, X, Save, Eye, Filter, CheckCircle2, AlertCircle, Clock, Wrench, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Module } from '../types/modules';
import EquipmentFormModal from './EquipmentFormModal';
import EquipmentDetailModal from './EquipmentDetailModal';

type UserRole = 'admin' | 'quality_manager' | 'personnel' | 'super_admin';

interface ModuleViewProps {
  module: Module;
  userRole?: UserRole | null;
  autoOpenRecordId?: string | null;
  onRecordOpened?: () => void;
}

export default function ModuleView({ module, userRole, autoOpenRecordId, onRecordOpened }: ModuleViewProps) {
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [columns, setColumns] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: 'Tümü', calibration: 'Tümü' });

  const isEquipment = module.table === 'equipment_hardware';

  const canModifyEquipment = () => {
    if (!isEquipment) return true;
    return userRole === 'admin' || userRole === 'super_admin' || userRole === 'quality_manager';
  };

  const getColumnLabel = (col: string) => {
    if (isEquipment) {
      const labels: Record<string, string> = {
        device_code: 'Cihaz Kodu',
        device_name: 'Cihaz Adı',
        brand: 'Marka',
        model: 'Model',
        serial_no: 'Seri No',
        status: 'Durum',
        calibration_date: 'Son Kalibrasyon',
        next_calibration_date: 'Sonraki Kalibrasyon',
      };
      return labels[col] || col.replace(/_/g, ' ');
    }
    return col.replace(/_/g, ' ');
  };

  const getStatusConfig = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      active: { label: 'Aktif', className: 'bg-green-100 text-green-800 border-green-200' },
      maintenance: { label: 'Bakımda', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      in_calibration: { label: 'Kalibrasyonda', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      calibration_due: { label: 'Kalibrasyon Bekliyor', className: 'bg-orange-100 text-orange-800 border-orange-200' },
      out_of_service: { label: 'Kullanım Dışı', className: 'bg-red-100 text-red-800 border-red-200' },
    };
    return config[status] || { label: status, className: 'bg-gray-100 text-gray-800 border-gray-200' };
  };

  const getCalibrationBadge = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    if (date < now) return { label: 'Süresi Geçti', className: 'bg-red-100 text-red-800 border-red-200' };
    if (date < in30) return { label: 'Yaklaşıyor', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    return { label: 'Geçerli', className: 'bg-green-100 text-green-800 border-green-200' };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="w-2.5 h-2.5" />;
      case 'out_of_service': return <AlertCircle className="w-2.5 h-2.5" />;
      case 'maintenance': return <Wrench className="w-2.5 h-2.5" />;
      case 'in_calibration': return <Activity className="w-2.5 h-2.5" />;
      default: return <Clock className="w-2.5 h-2.5" />;
    }
  };

  const activeFilterCount = [filters.status, filters.calibration].filter(f => f !== 'Tümü').length;

  const clearFilters = () => setFilters({ status: 'Tümü', calibration: 'Tümü' });

  useEffect(() => {
    fetchData();
  }, [module.table]);

  useEffect(() => {
    if (!isEquipment) {
      setFilteredData(data);
      return;
    }
    let filtered = [...data];
    if (filters.status !== 'Tümü') {
      filtered = filtered.filter(item => item.status === filters.status);
    }
    if (filters.calibration !== 'Tümü') {
      filtered = filtered.filter(item => {
        const badge = getCalibrationBadge(item.next_calibration_date);
        if (!badge) return filters.calibration === 'Belirsiz';
        return badge.label === filters.calibration;
      });
    }
    setFilteredData(filtered);
  }, [filters, data]);

  useEffect(() => {
    if (autoOpenRecordId && data.length > 0) {
      const record = data.find(item => item.id === autoOpenRecordId);
      if (record) {
        if (isEquipment) {
          handleView(record);
        } else {
          handleEdit(record);
        }
        if (onRecordOpened) onRecordOpened();
      }
    }
  }, [autoOpenRecordId, data, onRecordOpened]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from(module.table)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setData(result || []);
      setFilteredData(result || []);

      if (isEquipment) {
        setColumns(['device_code', 'device_name', 'brand', 'model', 'serial_no', 'status', 'calibration_date', 'next_calibration_date']);
      } else if (result && result.length > 0) {
        setColumns(Object.keys(result[0]).filter(col => col !== 'id' && col !== 'created_at' && col !== 'updated_at'));
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({});
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    const filtered = { ...item };
    delete filtered.id;
    delete filtered.created_at;
    delete filtered.updated_at;
    setFormData(filtered);
    setIsModalOpen(true);
  };

  const handleView = (item: any) => {
    setViewingItem(item);
    setIsDetailModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    try {
      const { error } = await supabase.from(module.table).delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Silme hatası:', error);
      alert('Kayıt silinirken bir hata oluştu!');
    }
  };

  const handleSubmit = async (e: React.FormEvent | any) => {
    if (e && e.preventDefault) e.preventDefault();

    let dataToSave = isEquipment ? e : formData;

    if (isEquipment) {
      dataToSave = { ...dataToSave };
      if (dataToSave.calibration_date === '') dataToSave.calibration_date = null;
      if (dataToSave.next_calibration_date === '') dataToSave.next_calibration_date = null;
    }

    try {
      if (editingItem) {
        const { error } = await supabase.from(module.table).update(dataToSave).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(module.table).insert([dataToSave]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      alert('Kayıt kaydedilirken bir hata oluştu!');
    }
  };

  const ModuleIcon = module.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isEquipment) {
    return (
      <div className="p-3 md:p-4 pt-16 md:pt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <ModuleIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            <h2 className="text-lg md:text-xl font-bold text-slate-800">{module.name}</h2>
          </div>
          <button
            onClick={handleAdd}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-slate-600 text-white px-4 py-3 md:py-2 rounded-lg hover:bg-slate-700 transition-all shadow-sm font-medium text-xs md:text-[11px]"
          >
            <Plus className="w-4 h-4" />
            Yeni Ekle
          </button>
        </div>

        {data.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 text-center">
            <ModuleIcon className="w-10 h-10 md:w-12 md:h-12 text-slate-300 mx-auto mb-2 md:mb-3" />
            <p className="text-slate-500 text-xs md:text-sm">Kayıt bulunamadı</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
                    {columns.map(col => (
                      <th key={col} className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                    <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      {columns.map(col => (
                        <td key={col} className="px-3 py-1.5 text-[11px] text-slate-700">{item[col]?.toString() || '-'}</td>
                      ))}
                      <td className="px-3 py-1.5 text-right whitespace-nowrap space-x-1">
                        <button onClick={() => handleEdit(item)} className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-1.5 py-0.5 rounded text-[10px] transition-colors">
                          <Edit2 className="w-2.5 h-2.5" />Düzenle
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="inline-flex items-center gap-0.5 text-red-600 hover:text-red-800 hover:bg-red-50 px-1.5 py-0.5 rounded text-[10px] transition-colors">
                          <Trash2 className="w-2.5 h-2.5" />Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-0 md:p-4">
            <div className="bg-white md:rounded-2xl shadow-2xl w-full h-full md:h-auto md:max-w-2xl md:max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ModuleIcon className="w-5 h-5" />
                  <h3 className="text-sm md:text-base font-bold">{editingItem ? 'Kaydı Düzenle' : 'Yeni Kayıt Ekle'}</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-3">
                {columns.map(col => (
                  <div key={col}>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">{col.replace(/_/g, ' ').toLocaleUpperCase('tr-TR')}</label>
                    <input
                      type="text"
                      value={formData[col] || ''}
                      onChange={e => setFormData({ ...formData, [col]: e.target.value })}
                      className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder={`${col.replace(/_/g, ' ')} girin`}
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-3">
                  <button type="submit" className="flex-1 flex items-center justify-center gap-1.5 bg-slate-600 text-white px-4 py-3 md:py-2 rounded-lg hover:bg-slate-700 transition-all font-semibold text-xs md:text-[11px]">
                    <Save className="w-4 h-4" />Kaydet
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-200 text-slate-700 px-4 py-3 md:py-2 rounded-lg hover:bg-slate-300 transition-colors font-semibold text-xs md:text-[11px]">
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-6 pt-16 md:pt-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-light text-gray-900">{module.name}</h1>
            <p className="mt-3 text-xs md:text-sm text-gray-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
              <span className="font-semibold text-slate-800">Donanım Yönetimi:</span> Cihaz kaydı → Kalibrasyon takibi → Durum güncelleme → Sertifika yönetimi → Periyodik kontrol.
            </p>
          </div>
          <div className="flex gap-2 md:gap-3">
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
            {canModifyEquipment() && (
              <button
                onClick={handleAdd}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-slate-700 transition-all shadow-sm hover:shadow-md font-medium text-xs md:text-sm"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">Yeni Cihaz Ekle</span>
                <span className="sm:hidden">Yeni</span>
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 md:mt-6 p-4 md:p-6 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h3 className="text-xs md:text-sm font-semibold text-gray-900 uppercase tracking-wide">Filtreler</h3>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs md:text-sm text-slate-600 hover:text-slate-800 font-medium flex items-center gap-1">
                  <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Temizle
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Durum</label>
                <select
                  value={filters.status}
                  onChange={e => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2.5 text-[11px] md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                >
                  <option>Tümü</option>
                  <option value="active">Aktif</option>
                  <option value="maintenance">Bakımda</option>
                  <option value="in_calibration">Kalibrasyonda</option>
                  <option value="calibration_due">Kalibrasyon Bekliyor</option>
                  <option value="out_of_service">Kullanım Dışı</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Kalibrasyon Durumu</label>
                <select
                  value={filters.calibration}
                  onChange={e => setFilters({ ...filters, calibration: e.target.value })}
                  className="w-full px-3 py-2.5 text-[11px] md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                >
                  <option>Tümü</option>
                  <option>Geçerli</option>
                  <option>Yaklaşıyor</option>
                  <option>Süresi Geçti</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-8">
        {filteredData.length === 0 ? (
          <div className="text-center py-12 md:py-16">
            <ModuleIcon className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">
              {activeFilterCount > 0 ? 'Filtre kriterlerine uygun kayıt bulunamadı' : 'Henüz cihaz kaydı yok'}
            </h3>
            <p className="text-sm md:text-base text-gray-500 mb-4 md:mb-6">
              {activeFilterCount > 0 ? 'Farklı filtreler deneyebilirsiniz' : 'İlk cihazı eklemek için yukarıdaki butona tıklayın'}
            </p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-slate-600 hover:text-slate-800 font-medium text-sm md:text-base py-2 px-4">
                Filtreleri Temizle
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredData.map(item => {
                const statusCfg = getStatusConfig(item.status);
                const calBadge = getCalibrationBadge(item.next_calibration_date);
                const isOverdue = calBadge?.label === 'Süresi Geçti';
                return (
                  <div key={item.id} className={`rounded-lg shadow-sm border p-4 ${isOverdue ? 'bg-red-50 border-red-300 text-red-900' : 'bg-white border-gray-200'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-700">{item.device_code || '-'}</span>
                        </div>
                        <div className="text-sm font-medium text-gray-900">{item.device_name || '-'}</div>
                        {(item.brand || item.model) && (
                          <div className="text-xs text-gray-500 mt-0.5">{item.brand}{item.model ? ` · ${item.model}` : ''}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border ${statusCfg.className}`}>
                        {getStatusIcon(item.status)}
                        {statusCfg.label}
                      </span>
                      {calBadge && (
                        <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-medium border ${calBadge.className}`}>
                          {calBadge.label}
                        </span>
                      )}
                    </div>
                    {item.next_calibration_date && (
                      <div className={`text-xs mb-3 px-2 py-1 rounded inline-block ${isOverdue ? 'bg-red-100 text-red-800 font-semibold' : 'text-gray-600'}`}>
                        <span className="font-medium">Sonraki Kalibrasyon:</span> {new Date(item.next_calibration_date).toLocaleDateString('tr-TR')}
                      </div>
                    )}
                    {item.serial_no && (
                      <div className="text-xs text-gray-500 mb-3">
                        <span className="font-medium">Seri No:</span> {item.serial_no}
                      </div>
                    )}
                    <div className="flex items-center justify-end pt-2 border-t border-gray-100 gap-1">
                      <button onClick={() => handleView(item)} className="inline-flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      {canModifyEquipment() && (
                        <>
                          <button onClick={() => handleEdit(item)} className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="inline-flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-28">Cihaz Kodu</th>
                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Cihaz Adı</th>
                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-28">Marka / Model</th>
                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-28">Seri No</th>
                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-32">Durum</th>
                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-28">Son Kalibrasyon</th>
                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-28">Sonraki Kal.</th>
                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-28">Kal. Durumu</th>
                      <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-36">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredData.map(item => {
                      const statusCfg = getStatusConfig(item.status);
                      const calBadge = getCalibrationBadge(item.next_calibration_date);
                      const isOverdue = calBadge?.label === 'Süresi Geçti';
                      return (
                        <tr key={item.id} className={`transition-colors border-b ${isOverdue ? 'bg-red-50 hover:bg-red-100 text-red-900 border-red-200' : 'hover:bg-slate-50/50 border-gray-100'}`}>
                          <td className="px-3 py-1.5 whitespace-nowrap">
                            <span className="text-[11px] font-medium text-slate-700">{item.device_code || '-'}</span>
                          </td>
                          <td className="px-3 py-1.5">
                            <div className="text-[11px] font-medium text-gray-900 leading-[1.3]">{item.device_name || '-'}</div>
                          </td>
                          <td className="px-3 py-1.5 whitespace-nowrap">
                            <div className="text-[11px] leading-tight">
                              <div className="font-medium text-gray-900 leading-[1.3]">{item.brand || '-'}</div>
                              {item.model && <div className="text-gray-500 mt-0.5 leading-[1.3]">{item.model}</div>}
                            </div>
                          </td>
                          <td className="px-3 py-1.5 text-[11px] text-gray-700 whitespace-nowrap">{item.serial_no || '-'}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusCfg.className}`}>
                              {getStatusIcon(item.status)}
                              {statusCfg.label}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-[11px] text-gray-700 whitespace-nowrap">
                            {item.calibration_date ? new Date(item.calibration_date).toLocaleDateString('tr-TR') : '-'}
                          </td>
                          <td className="px-3 py-1.5 text-[11px] whitespace-nowrap">
                            <span className={isOverdue ? 'text-red-800 font-semibold' : 'text-gray-700'}>
                              {item.next_calibration_date ? new Date(item.next_calibration_date).toLocaleDateString('tr-TR') : '-'}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 whitespace-nowrap">
                            {calBadge ? (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${calBadge.className}`}>
                                {calBadge.label}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-3 py-1.5 text-right whitespace-nowrap space-x-1">
                            <button
                              onClick={() => handleView(item)}
                              className="inline-flex items-center gap-0.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded text-[10px] transition-colors"
                            >
                              <Eye className="w-2.5 h-2.5" />
                              Görüntüle
                            </button>
                            {canModifyEquipment() && (
                              <>
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-1.5 py-0.5 rounded text-[10px] transition-colors"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                  Düzenle
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="inline-flex items-center gap-0.5 text-red-600 hover:text-red-800 hover:bg-red-50 px-1.5 py-0.5 rounded text-[10px] transition-colors"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                  Sil
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredData.length > 0 && (
                <div className="bg-gray-50 px-3 py-1.5 border-t border-gray-200">
                  <p className="text-[10px] text-gray-600">
                    Toplam <span className="font-semibold text-gray-900">{filteredData.length}</span> kayıt
                    {data.length !== filteredData.length && (
                      <span> (Tüm kayıtlar: {data.length})</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Mobile Footer */}
            {filteredData.length > 0 && (
              <div className="md:hidden mt-3 bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-2.5">
                <p className="text-[11px] text-gray-600 text-center">
                  Toplam <span className="font-semibold text-gray-900">{filteredData.length}</span> kayıt
                  {data.length !== filteredData.length && (
                    <span> (Tüm kayıtlar: {data.length})</span>
                  )}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <EquipmentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        editingItem={editingItem}
      />
      <EquipmentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        equipment={viewingItem}
      />
    </div>
  );
}
