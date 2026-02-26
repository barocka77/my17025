import { useState, useEffect } from 'react';
import { Star, TrendingUp, Users, Calendar, Edit2, Trash2, FileText, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CustomerSurveyModal from './CustomerSurveyModal';

interface Survey {
  id: string;
  customer_name: string;
  survey_date: string;
  service_quality: number;
  technical_competence: number;
  deadline_compliance: number;
  communication_quality: number;
  overall_satisfaction: number;
  customer_comments: string;
  created_at: string;
}

const CustomerSurveyView = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<Survey | undefined>(undefined);

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_surveys')
        .select('*')
        .order('survey_date', { ascending: false });

      if (error) throw error;
      setSurveys(data || []);
    } catch (error) {
      console.error('Error fetching surveys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu anketi silmek istediğinize emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('customer_surveys')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchSurveys();
    } catch (error) {
      console.error('Error deleting survey:', error);
      alert('Silme işlemi sırasında bir hata oluştu.');
    }
  };

  const handleEdit = (survey: Survey) => {
    setEditData(survey);
    setIsModalOpen(true);
  };

  const calculateOverallAverage = () => {
    if (surveys.length === 0) return 0;
    const sum = surveys.reduce((acc, survey) => acc + survey.overall_satisfaction, 0);
    return (sum / surveys.length).toFixed(1);
  };

  const calculateCategoryAverage = (category: keyof Survey) => {
    if (surveys.length === 0) return 0;
    const sum = surveys.reduce((acc, survey) => {
      const value = survey[category];
      return acc + (typeof value === 'number' ? value : 0);
    }, 0);
    return (sum / surveys.length).toFixed(1);
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-emerald-600 bg-emerald-50';
    if (score >= 3) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 4) return 'bg-emerald-500';
    if (score >= 3) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating
              ? 'fill-amber-400 text-amber-400'
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );

  const overallAvg = parseFloat(calculateOverallAverage());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-6 pt-16 md:pt-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-light text-gray-900">Müşteri Anketleri</h1>
            <p className="text-xs md:text-sm text-gray-500 mt-1 md:mt-2">ISO 17025 Müşteri Memnuniyeti Değerlendirmesi</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-slate-700 transition-all shadow-sm hover:shadow-md font-medium text-xs md:text-sm"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            Yeni Anket Ekle
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div id="customer-surveys-content" className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 md:p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-6 h-6 md:w-8 md:h-8 opacity-80" />
              <div className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${
                overallAvg >= 4 ? 'bg-white/20' : 'bg-white/30'
              }`}>
                Ortalama
              </div>
            </div>
            <div className="text-3xl md:text-4xl font-bold mb-1">{calculateOverallAverage()}</div>
            <div className="text-emerald-100 text-xs md:text-sm font-medium">Genel Memnuniyet</div>
            <div className="mt-2 md:mt-3 flex items-center gap-0.5 md:gap-1">
              <StarRating rating={Math.round(overallAvg)} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 md:p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-6 h-6 md:w-8 md:h-8 opacity-80" />
            </div>
            <div className="text-3xl md:text-4xl font-bold mb-1">{surveys.length}</div>
            <div className="text-blue-100 text-xs md:text-sm font-medium">Toplam Anket</div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 border-2 border-gray-200 shadow-sm">
            <div className="text-xs md:text-sm font-medium text-gray-600 mb-2 md:mb-3">Hizmet Kalitesi</div>
            <div className="flex items-baseline gap-1 md:gap-2">
              <div className="text-2xl md:text-3xl font-bold text-gray-900">{calculateCategoryAverage('service_quality')}</div>
              <div className="text-gray-400 text-xs md:text-sm">/5.0</div>
            </div>
            <div className="mt-1.5 md:mt-2">
              <StarRating rating={Math.round(parseFloat(calculateCategoryAverage('service_quality')))} />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 border-2 border-gray-200 shadow-sm">
            <div className="text-xs md:text-sm font-medium text-gray-600 mb-2 md:mb-3">Teknik Yeterlilik</div>
            <div className="flex items-baseline gap-1 md:gap-2">
              <div className="text-2xl md:text-3xl font-bold text-gray-900">{calculateCategoryAverage('technical_competence')}</div>
              <div className="text-gray-400 text-xs md:text-sm">/5.0</div>
            </div>
            <div className="mt-1.5 md:mt-2">
              <StarRating rating={Math.round(parseFloat(calculateCategoryAverage('technical_competence')))} />
            </div>
          </div>
        </div>

        {surveys.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 md:p-12 text-center">
            <div className="text-gray-400 mb-2">
              <FileText className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 opacity-50" />
            </div>
            <p className="text-gray-600 font-medium text-sm md:text-base">Henüz anket kaydı bulunmuyor</p>
            <p className="text-gray-500 text-xs md:text-sm mt-2">Yeni bir anket eklemek için yukarıdaki butonu kullanın</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {surveys.map((survey) => (
                <div key={survey.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{survey.customer_name}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(survey.survey_date).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(survey)}
                        className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(survey.id)}
                        className="inline-flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-600">Genel Memnuniyet</span>
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-bold text-xs ${getScoreColor(survey.overall_satisfaction)}`}>
                        {survey.overall_satisfaction}.0
                        <Star className="w-3 h-3 fill-current" />
                      </div>
                    </div>
                    <div className="mt-1.5 flex justify-center">
                      <StarRating rating={survey.overall_satisfaction} />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-100">
                    <div className="text-center">
                      <div className="text-[10px] text-gray-500 mb-1">Hizmet</div>
                      <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center font-bold text-[11px] text-white ${getScoreBadgeColor(survey.service_quality)}`}>
                        {survey.service_quality}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-gray-500 mb-1">Teknik</div>
                      <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center font-bold text-[11px] text-white ${getScoreBadgeColor(survey.technical_competence)}`}>
                        {survey.technical_competence}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-gray-500 mb-1">Termin</div>
                      <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center font-bold text-[11px] text-white ${getScoreBadgeColor(survey.deadline_compliance)}`}>
                        {survey.deadline_compliance}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-gray-500 mb-1">İletişim</div>
                      <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center font-bold text-[11px] text-white ${getScoreBadgeColor(survey.communication_quality)}`}>
                        {survey.communication_quality}
                      </div>
                    </div>
                  </div>

                  {survey.customer_comments && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-[10px] text-gray-500 mb-1">Yorumlar:</div>
                      <div className="text-[11px] text-gray-700 line-clamp-2">
                        {survey.customer_comments}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                      Müşteri Adı
                    </th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-24">
                      Tarih
                    </th>
                    <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-28">
                      Genel Memnuniyet
                    </th>
                    <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-16">
                      Hizmet
                    </th>
                    <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-16">
                      Teknik
                    </th>
                    <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-16">
                      Termin
                    </th>
                    <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-16">
                      İletişim
                    </th>
                    <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-20">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {surveys.map((survey) => {
                    const avgScore = (
                      (survey.service_quality +
                        survey.technical_competence +
                        survey.deadline_compliance +
                        survey.communication_quality) / 4
                    ).toFixed(1);

                    return (
                      <tr key={survey.id} className="hover:bg-slate-50/50 transition-colors border-b border-gray-100">
                        <td className="px-3 py-1.5">
                          <div className="font-medium text-gray-900 text-[11px] leading-[1.3]">{survey.customer_name}</div>
                          {survey.customer_comments && (
                            <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-1 leading-[1.3]">
                              {survey.customer_comments}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-1 text-[11px] text-gray-600">
                            <Calendar className="w-2.5 h-2.5" />
                            {new Date(survey.survey_date).toLocaleDateString('tr-TR')}
                          </div>
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex flex-col items-center gap-0.5">
                            <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-bold text-[10px] ${getScoreColor(survey.overall_satisfaction)}`}>
                              {survey.overall_satisfaction}.0
                              <Star className="w-2.5 h-2.5 fill-current" />
                            </div>
                            <div className="scale-[0.65] origin-center">
                              <StarRating rating={survey.overall_satisfaction} />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <div className="flex justify-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white ${getScoreBadgeColor(survey.service_quality)}`}>
                              {survey.service_quality}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <div className="flex justify-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white ${getScoreBadgeColor(survey.technical_competence)}`}>
                              {survey.technical_competence}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <div className="flex justify-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white ${getScoreBadgeColor(survey.deadline_compliance)}`}>
                              {survey.deadline_compliance}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <div className="flex justify-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white ${getScoreBadgeColor(survey.communication_quality)}`}>
                              {survey.communication_quality}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              onClick={() => handleEdit(survey)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Düzenle"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(survey.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Sil"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          </>
        )}
        </div>
      </div>

      <CustomerSurveyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditData(undefined);
        }}
        onSuccess={fetchSurveys}
        editData={editData}
      />
    </div>
  );
};

export default CustomerSurveyView;
