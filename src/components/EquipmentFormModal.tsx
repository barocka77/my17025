import { X, Save, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface EquipmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  editingItem: any;
}

export default function EquipmentFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingItem,
}: EquipmentFormModalProps) {
  const [personnelList, setPersonnelList] = useState<{ id: string; full_name: string }[]>([]);
  const [formData, setFormData] = useState({
    device_name: '',
    device_code: '',
    brand: '',
    model: '',
    serial_no: '',
    status: 'active',
    calibration_date: '',
    next_calibration_date: '',
    calibration_period: '',
    certificate_no: '',
    calibration_performed_by: '',
    description: '',
  });

  useEffect(() => {
    const fetchPersonnel = async () => {
      const { data } = await supabase.rpc('get_personnel_list');
      if (data) {
        setPersonnelList(
          (data as { id: string; full_name: string | null; email: string }[])
            .map((p) => ({ id: p.id, full_name: p.full_name || p.email || '' }))
            .filter((p) => p.full_name)
        );
      }
    };
    fetchPersonnel();
  }, []);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        device_name: editingItem.device_name || '',
        device_code: editingItem.device_code || '',
        brand: editingItem.brand || '',
        model: editingItem.model || '',
        serial_no: editingItem.serial_no || '',
        status: editingItem.status || 'active',
        calibration_date: editingItem.calibration_date || '',
        next_calibration_date: editingItem.next_calibration_date || '',
        calibration_period: editingItem.calibration_period || '',
        certificate_no: editingItem.certificate_no || '',
        calibration_performed_by: editingItem.calibration_performed_by || '',
        description: editingItem.description || '',
      });
    } else {
      setFormData({
        device_name: '',
        device_code: '',
        brand: '',
        model: '',
        serial_no: '',
        status: 'active',
        calibration_date: '',
        next_calibration_date: '',
        calibration_period: '',
        certificate_no: '',
        calibration_performed_by: '',
        description: '',
      });
    }
  }, [editingItem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white md:rounded-2xl shadow-2xl w-full h-full md:h-auto md:max-w-4xl md:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-orange-700 text-white p-4 flex items-center justify-between md:rounded-t-2xl">
          <h3 className="text-sm md:text-base font-bold">
            {editingItem ? 'Cihaz Bilgilerini Düzenle' : 'Cihaz Bilgi Formu'}
          </h3>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="border-2 border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <h4 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b-2 border-orange-500">
              Cihaz Kimlik Bilgileri
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Cihaz Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.device_name}
                  onChange={(e) =>
                    setFormData({ ...formData, device_name: e.target.value })
                  }
                  className="w-full px-3 py-2 text-[11px] border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="Örn: Dijital Terazi"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Cihaz Kodu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.device_code}
                  onChange={(e) =>
                    setFormData({ ...formData, device_code: e.target.value })
                  }
                  className="w-full px-3 py-2 text-[11px] border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="Örn: DT-001"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Marka
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) =>
                    setFormData({ ...formData, brand: e.target.value })
                  }
                  className="w-full px-3 py-2 text-[11px] border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="Örn: Mettler Toledo"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Model
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  className="w-full px-3 py-2 text-[11px] border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="Örn: XPR-2003S"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Seri No
                </label>
                <input
                  type="text"
                  value={formData.serial_no}
                  onChange={(e) =>
                    setFormData({ ...formData, serial_no: e.target.value })
                  }
                  className="w-full px-3 py-2 text-[11px] border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="Örn: 123456789"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Cihaz Durumu <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-3 py-2 text-[11px] border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="active">Aktif</option>
                  <option value="maintenance">Bakımda</option>
                  <option value="in_calibration">Kalibrasyonda</option>
                  <option value="calibration_due">Kalibrasyon Bekliyor</option>
                  <option value="out_of_service">Kullanım Dışı</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-2 border-slate-200 rounded-xl p-4 bg-blue-50/30">
            <h4 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b-2 border-blue-500">
              Kalibrasyon Durumu
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Kalibrasyon Tarihi
                </label>
                <input
                  type="date"
                  value={formData.calibration_date}
                  onChange={(e) =>
                    setFormData({ ...formData, calibration_date: e.target.value })
                  }
                  className="w-full px-3 py-2 text-[11px] border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Sonraki Kal. Tarihi
                </label>
                <input
                  type="date"
                  value={formData.next_calibration_date}
                  onChange={(e) =>
                    setFormData({ ...formData, next_calibration_date: e.target.value })
                  }
                  className="w-full px-3 py-2 text-[11px] border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Periyot
                </label>
                <input
                  type="text"
                  value={formData.calibration_period}
                  onChange={(e) =>
                    setFormData({ ...formData, calibration_period: e.target.value })
                  }
                  className="w-full px-3 py-2 text-[11px] border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Örn: 1 Yıl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Sertifika No
                </label>
                <input
                  type="text"
                  value={formData.certificate_no}
                  onChange={(e) =>
                    setFormData({ ...formData, certificate_no: e.target.value })
                  }
                  className="w-full px-3 py-2 text-[11px] border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Örn: CERT-2024-001"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Kalibrasyonu Yapan
                </label>
                <div className="relative">
                  <select
                    value={formData.calibration_performed_by}
                    onChange={(e) =>
                      setFormData({ ...formData, calibration_performed_by: e.target.value })
                    }
                    className="w-full appearance-none px-3 py-2 pr-8 text-[11px] border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                  >
                    <option value="">— Personel Seçin —</option>
                    {personnelList.length === 0 && (
                      <option disabled>Personel bulunamadı</option>
                    )}
                    {personnelList.map((p) => (
                      <option key={p.id} value={p.full_name}>{p.full_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Açıklama / Notlar
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                className="w-full px-3 py-2 text-[11px] border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                placeholder="Cihaz hakkında ek bilgiler, özel notlar..."
              />
            </div>
          </div>

          <div className="flex gap-2 pt-3 pb-safe">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white px-4 py-3 md:py-2 rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold text-xs md:text-[11px]"
            >
              <Save className="w-4 h-4" />
              Kaydet
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-200 text-slate-700 px-4 py-3 md:py-2 rounded-lg hover:bg-slate-300 transition-colors font-semibold text-xs md:text-[11px]"
            >
              İptal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
