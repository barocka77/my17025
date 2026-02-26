import { useState, useEffect } from 'react';
import { X, Save, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CustomerSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
}

const CustomerSurveyModal = ({ isOpen, onClose, onSuccess, editData }: CustomerSurveyModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    survey_date: new Date().toISOString().split('T')[0],
    service_quality: 3,
    technical_competence: 3,
    deadline_compliance: 3,
    communication_quality: 3,
    overall_satisfaction: 3,
    customer_comments: '',
  });

  useEffect(() => {
    if (editData) {
      setFormData({
        customer_name: editData.customer_name || '',
        survey_date: editData.survey_date || new Date().toISOString().split('T')[0],
        service_quality: editData.service_quality || 3,
        technical_competence: editData.technical_competence || 3,
        deadline_compliance: editData.deadline_compliance || 3,
        communication_quality: editData.communication_quality || 3,
        overall_satisfaction: editData.overall_satisfaction || 3,
        customer_comments: editData.customer_comments || '',
      });
    }
  }, [editData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Attempting to save to customer_surveys table:', {
        operation: editData ? 'UPDATE' : 'INSERT',
        data: formData
      });

      if (editData) {
        const { data, error } = await supabase
          .from('customer_surveys')
          .update(formData)
          .eq('id', editData.id)
          .select();

        if (error) {
          console.error('Supabase UPDATE Error Details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        console.log('Update successful:', data);
      } else {
        const { data, error } = await supabase
          .from('customer_surveys')
          .insert([formData])
          .select();

        if (error) {
          console.error('Supabase INSERT Error Details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        console.log('Insert successful:', data);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving survey:', error);

      let errorMessage = 'Kaydetme sırasında bir hata oluştu.';

      if (error?.code === '42501') {
        errorMessage = 'İzin hatası: Bu işlem için yetkiniz yok. Lütfen yöneticinizle iletişime geçin.';
      } else if (error?.code === '23505') {
        errorMessage = 'Bu kayıt zaten mevcut.';
      } else if (error?.message) {
        errorMessage = `Hata: ${error.message}`;
      }

      alert(errorMessage + '\n\nDetaylar için konsolu kontrol edin (F12).');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const RatingRow = ({
    label,
    field,
    value
  }: {
    label: string;
    field: keyof typeof formData;
    value: number;
  }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center py-4 border-b border-gray-100 last:border-0">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => setFormData({ ...formData, [field]: rating })}
            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all font-semibold text-center ${
              value === rating
                ? rating <= 2
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : rating === 3
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 hover:border-gray-300 bg-white text-gray-600'
            }`}
          >
            {rating}
          </button>
        ))}
      </div>
    </div>
  );

  const calculateAverageScore = () => {
    const scores = [
      formData.service_quality,
      formData.technical_competence,
      formData.deadline_compliance,
      formData.communication_quality,
    ];
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return avg.toFixed(1);
  };

  const averageScore = parseFloat(calculateAverageScore());
  const satisfactionColor =
    averageScore >= 4 ? 'text-emerald-600' :
    averageScore >= 3 ? 'text-amber-600' :
    'text-red-600';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4 overflow-y-auto">
      <div className="bg-white md:rounded-xl shadow-2xl max-w-4xl w-full h-full md:h-auto my-0 md:my-8 md:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex justify-between items-center md:rounded-t-xl z-10">
          <div>
            <h2 className="text-sm md:text-base font-light text-gray-900">
              {editData ? 'Anketi Düzenle' : 'Yeni Müşteri Anketi'}
            </h2>
            <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1">ISO 17025 Müşteri Memnuniyeti Değerlendirmesi</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-600 text-white flex items-center justify-center text-sm font-semibold">1</div>
              Temel Bilgiler
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">Müşteri Adı *</label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  placeholder="Müşteri veya firma adı"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">Anket Tarihi *</label>
                <input
                  type="date"
                  value={formData.survey_date}
                  onChange={(e) => setFormData({ ...formData, survey_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">2</div>
              Değerlendirme Kriterleri
            </h3>
            <div className="bg-white rounded-lg p-6 space-y-1">
              <div className="mb-6 pb-4 border-b border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  Lütfen aşağıdaki kriterleri 1 (Çok Kötü) ile 5 (Mükemmel) arasında değerlendirin
                </p>
              </div>

              <RatingRow
                label="Hizmet Kalitesi"
                field="service_quality"
                value={formData.service_quality}
              />

              <RatingRow
                label="Teknik Yeterlilik"
                field="technical_competence"
                value={formData.technical_competence}
              />

              <RatingRow
                label="Termin Sürelerine Uyumluluk"
                field="deadline_compliance"
                value={formData.deadline_compliance}
              />

              <RatingRow
                label="İletişim Kalitesi"
                field="communication_quality"
                value={formData.communication_quality}
              />

              <div className="mt-6 pt-6 border-t-2 border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Ortalama Puan
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-3xl font-bold ${satisfactionColor}`}>
                      {calculateAverageScore()}
                    </span>
                    <span className="text-gray-400 text-lg">/5.0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-semibold">3</div>
              Genel Değerlendirme
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Genel Memnuniyet</label>
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormData({ ...formData, overall_satisfaction: rating })}
                      className={`flex-1 px-6 py-4 rounded-xl border-2 transition-all font-bold text-lg flex items-center justify-center gap-2 ${
                        formData.overall_satisfaction === rating
                          ? rating <= 2
                            ? 'border-red-500 bg-red-50 text-red-700 shadow-lg'
                            : rating === 3
                            ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-lg'
                            : 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300 bg-white text-gray-600'
                      }`}
                    >
                      {rating}
                      <Star className={`w-4 h-4 ${formData.overall_satisfaction === rating ? 'fill-current' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">Müşteri Görüşleri ve Öneriler</label>
                <textarea
                  value={formData.customer_comments}
                  onChange={(e) => setFormData({ ...formData, customer_comments: e.target.value })}
                  rows={5}
                  className="w-full px-3 py-2 text-[11px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
                  placeholder="Müşterinin yorumları, önerileri ve geri bildirimleri..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 pb-safe border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 md:py-2 text-xs md:text-[11px] border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all font-medium"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-3 md:py-2 text-xs md:text-[11px] bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all font-medium flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 md:w-3.5 md:h-3.5" />
              {loading ? 'Kaydediliyor...' : editData ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerSurveyModal;
