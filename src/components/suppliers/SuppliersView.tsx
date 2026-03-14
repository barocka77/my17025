import { useState, useEffect } from 'react';
import { Truck, Plus, CreditCard as Edit2, Trash2, ChevronRight, Star, CheckCircle2, AlertTriangle, XCircle, Shield, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SupplierFormModal from './SupplierFormModal';
import SupplierDetailView from './SupplierDetailView';

interface Supplier {
  id: string;
  supplier_no: string;
  name: string;
  category: string;
  status: string;
  contact_person: string;
  phone: string;
  email: string;
  is_accredited: boolean;
  accreditation_body: string;
  accreditation_no: string;
  accreditation_expiry: string | null;
  last_evaluation_date: string | null;
  last_evaluation_score: number | null;
  last_evaluation_result: string;
  warning_notes: string;
  created_at: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  calibration_lab: { label: 'Kalibrasyon Lab.', color: 'bg-blue-100 text-blue-700' },
  material: { label: 'Malzeme / Sarf', color: 'bg-slate-100 text-slate-600' },
  equipment: { label: 'Cihaz / Donanım', color: 'bg-purple-100 text-purple-700' },
  service: { label: 'Hizmet', color: 'bg-teal-100 text-teal-700' },
  other: { label: 'Diğer', color: 'bg-gray-100 text-gray-600' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  approved: { label: 'Onaylı', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  conditional: { label: 'Şartlı', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  suspended: { label: 'Askıya Alındı', color: 'bg-red-100 text-red-600', icon: XCircle },
  removed: { label: 'Listeden Çıkarıldı', color: 'bg-slate-100 text-slate-500', icon: XCircle },
};

export default function SuppliersView() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<Supplier | undefined>(undefined);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    try {
      const { data } = await supabase
        .from('suppliers')
        .select('id, supplier_no, name, category, status, contact_person, phone, email, is_accredited, accreditation_body, accreditation_no, accreditation_expiry, last_evaluation_date, last_evaluation_score, last_evaluation_result, warning_notes, created_at')
        .order('name');
      setSuppliers(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu tedarikçiyi ve tüm ilgili kayıtları silmek istediğinize emin misiniz?')) return;
    await supabase.from('suppliers').delete().eq('id', id);
    fetchSuppliers();
  };

  const filtered = suppliers.filter(s => {
    if (filterCategory !== 'all' && s.category !== filterCategory) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: suppliers.length,
    approved: suppliers.filter(s => s.status === 'approved').length,
    conditional: suppliers.filter(s => s.status === 'conditional').length,
    calibration: suppliers.filter(s => s.category === 'calibration_lab').length,
    expiring: suppliers.filter(s =>
      s.accreditation_expiry &&
      new Date(s.accreditation_expiry) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    ).length,
  };

  if (selectedSupplier) {
    return (
      <SupplierDetailView
        supplier={selectedSupplier}
        onBack={() => { setSelectedSupplier(null); fetchSuppliers(); }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 md:py-5 pt-16 md:pt-5 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Tedarikçiler</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">PR01.04 Rev.04 — LS.02 Onaylı Tedarikçi Listesi / FR.08 Değerlendirme / FR.09 Satınalma</p>
          </div>
          <button
            onClick={() => { setEditData(undefined); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2.5 rounded-xl hover:bg-orange-700 transition-all font-semibold text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tedarikçi Ekle
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
          <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-3 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-4 h-4 opacity-80" />
              <span className="text-[10px] font-semibold uppercase opacity-80">Toplam</span>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl p-3 text-white">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 opacity-80" />
              <span className="text-[10px] font-semibold uppercase opacity-80">Onaylı</span>
            </div>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-3 text-white">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 opacity-80" />
              <span className="text-[10px] font-semibold uppercase opacity-80">Şartlı</span>
            </div>
            <div className="text-2xl font-bold">{stats.conditional}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-3 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 opacity-80" />
              <span className="text-[10px] font-semibold uppercase opacity-80">Kal. Lab.</span>
            </div>
            <div className="text-2xl font-bold">{stats.calibration}</div>
          </div>
          <div className={`rounded-xl p-3 text-white ${stats.expiring > 0 ? 'bg-gradient-to-br from-red-600 to-red-700' : 'bg-gradient-to-br from-slate-500 to-slate-600'}`}>
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 opacity-80" />
              <span className="text-[10px] font-semibold uppercase opacity-80">Akred. Sona Eriyor</span>
            </div>
            <div className="text-2xl font-bold">{stats.expiring}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-4">
          <button onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${filterCategory === 'all' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
            Tümü
          </button>
          {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => setFilterCategory(k)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${filterCategory === k ? 'bg-orange-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              {v.label}
            </button>
          ))}
          <div className="w-px bg-slate-200 mx-1" />
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => setFilterStatus(filterStatus === k ? 'all' : k)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${filterStatus === k ? 'bg-orange-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="space-y-2 max-w-4xl mx-auto">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
              <Truck className="w-12 h-12 mx-auto mb-3 text-slate-200" />
              <p className="text-slate-600 font-medium text-sm">
                {suppliers.length === 0 ? 'Henüz tedarikçi kaydı yok' : 'Filtreye uygun tedarikçi bulunamadı'}
              </p>
              <p className="text-slate-400 text-[11px] mt-1">
                {suppliers.length === 0 ? 'Onaylı Tedarikçi Listesini oluşturmak için ilk tedarikçiyi ekleyin' : 'Filtre seçimini değiştirin'}
              </p>
            </div>
          ) : (
            filtered.map(supplier => {
              const catStyle = CATEGORY_CONFIG[supplier.category] || CATEGORY_CONFIG.other;
              const stStyle = STATUS_CONFIG[supplier.status] || STATUS_CONFIG.approved;
              const StatusIcon = stStyle.icon;
              const isExpiringSoon = supplier.accreditation_expiry &&
                new Date(supplier.accreditation_expiry) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
              const isExpired = supplier.accreditation_expiry &&
                new Date(supplier.accreditation_expiry) < new Date();

              return (
                <div key={supplier.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 px-4 py-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${catStyle.color.replace('text-', 'bg-').replace('700', '100').replace('600', '100')}`}>
                      <Truck className={`w-5 h-5 ${catStyle.color.split(' ')[1]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-bold text-slate-800">{supplier.name}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${stStyle.color}`}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          {stStyle.label}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${catStyle.color}`}>{catStyle.label}</span>
                        {supplier.is_accredited && !isExpired && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Akredite</span>
                        )}
                        {isExpired && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Akred. Süresi Dolmuş</span>
                        )}
                        {isExpiringSoon && !isExpired && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">60 Gün İçinde Sona Eriyor</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-0.5">
                        {supplier.supplier_no && <span className="text-[10px] text-slate-400">{supplier.supplier_no}</span>}
                        {supplier.contact_person && <span className="text-[10px] text-slate-500">{supplier.contact_person}</span>}
                        {supplier.phone && <span className="text-[10px] text-slate-500">{supplier.phone}</span>}
                        {supplier.accreditation_body && (
                          <span className="text-[10px] text-blue-600">{supplier.accreditation_body} — {supplier.accreditation_no}</span>
                        )}
                      </div>
                      {supplier.last_evaluation_score && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="w-3 h-3 text-amber-400" />
                          <span className="text-[10px] text-slate-500">Son değerlendirme: {supplier.last_evaluation_score}/5</span>
                          {supplier.last_evaluation_date && (
                            <span className="text-[10px] text-slate-400">
                              ({new Date(supplier.last_evaluation_date).toLocaleDateString('tr-TR')})
                            </span>
                          )}
                        </div>
                      )}
                      {supplier.warning_notes && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <span className="text-[10px] text-amber-700">{supplier.warning_notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); setEditData(supplier); setIsModalOpen(true); }}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(supplier.id); }}
                        className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setSelectedSupplier(supplier)}
                        className="flex items-center gap-1.5 ml-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-[11px] font-semibold hover:bg-orange-700 transition-colors"
                      >
                        Aç
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <SupplierFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditData(undefined); }}
        onSuccess={fetchSuppliers}
        editData={editData}
      />
    </div>
  );
}
