import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, AlertTriangle, Wrench, MessageCircle, ShieldCheck, CheckCircle } from 'lucide-react';
import { useCompliance } from '../contexts/ComplianceContext';

interface ActionItem {
  id: string;
  source: 'feedback' | 'equipment';
  title: string;
  date: string;
  status: 'overdue' | 'today' | 'upcoming';
  daysRemaining: number;
  originalData?: any;
}

interface ActionTrackingProps {
  onViewItem: (source: 'feedback' | 'equipment', id: string) => void;
}

export default function ActionTracking({ onViewItem }: ActionTrackingProps) {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today' | 'upcoming'>('all');
  const { isLocked, isAcknowledged, criticalItemsCount, acknowledgeCompliance, recheckCompliance } = useCompliance();
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    fetchActions();
  }, []);

  const fetchActions = async () => {
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      const futureStr = thirtyDaysFromNow.toISOString().split('T')[0];

      console.log('[ActionTracking] Fetching data with date range up to:', futureStr);

      const [feedbackResult, equipmentResult] = await Promise.all([
        supabase
          .from('feedback_records')
          .select('id, application_no, applicant_name, content_details, deadline, validation_status')
          .not('deadline', 'is', null)
          .not('validation_status', 'eq', 'Kapalı')
          .lte('deadline', futureStr)
          .order('deadline', { ascending: true }),

        supabase
          .from('equipment_hardware')
          .select('id, device_name, device_code, next_calibration_date, status')
          .not('next_calibration_date', 'is', null)
          .neq('status', 'Passive')
          .neq('status', 'Scrapped')
          .lte('next_calibration_date', futureStr)
          .order('next_calibration_date', { ascending: true })
      ]);

      if (feedbackResult.error) {
        console.error('[ActionTracking] Feedback query error:', feedbackResult.error);
        throw feedbackResult.error;
      }

      if (equipmentResult.error) {
        console.error('[ActionTracking] Equipment query error:', equipmentResult.error);
        throw equipmentResult.error;
      }

      console.log('[ActionTracking] Feedback records found:', feedbackResult.data?.length || 0);
      console.log('[ActionTracking] Equipment records found:', equipmentResult.data?.length || 0);

      const normalizedActions: ActionItem[] = [];

      if (feedbackResult.data) {
        feedbackResult.data.forEach((item) => {
          const deadline = new Date(item.deadline);
          deadline.setHours(0, 0, 0, 0);
          const diffTime = deadline.getTime() - today.getTime();
          const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          let status: 'overdue' | 'today' | 'upcoming' = 'upcoming';
          if (daysRemaining < 0) status = 'overdue';
          else if (daysRemaining === 0) status = 'today';

          normalizedActions.push({
            id: item.id,
            source: 'feedback',
            title: item.applicant_name || item.application_no || 'İsimsiz Müşteri',
            date: item.deadline,
            status,
            daysRemaining,
            originalData: item,
          });
        });
      }

      if (equipmentResult.data) {
        equipmentResult.data.forEach((item) => {
          const calibrationDate = new Date(item.next_calibration_date);
          calibrationDate.setHours(0, 0, 0, 0);
          const diffTime = calibrationDate.getTime() - today.getTime();
          const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          let status: 'overdue' | 'today' | 'upcoming' = 'upcoming';
          if (daysRemaining < 0) status = 'overdue';
          else if (daysRemaining === 0) status = 'today';

          normalizedActions.push({
            id: item.id,
            source: 'equipment',
            title: item.device_name || item.device_code || 'İsimsiz Cihaz',
            date: item.next_calibration_date,
            status,
            daysRemaining,
            originalData: item,
          });
        });
      }

      normalizedActions.sort((a, b) => a.daysRemaining - b.daysRemaining);

      console.log('[ActionTracking] Total actions found:', normalizedActions.length);
      console.log('[ActionTracking] Actions breakdown:', {
        overdue: normalizedActions.filter(a => a.status === 'overdue').length,
        today: normalizedActions.filter(a => a.status === 'today').length,
        upcoming: normalizedActions.filter(a => a.status === 'upcoming').length
      });

      setActions(normalizedActions);
    } catch (error) {
      console.error('[ActionTracking] Error fetching actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: 'overdue' | 'today' | 'upcoming') => {
    switch (status) {
      case 'overdue':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-100 text-red-700">
            Gecikmiş
          </span>
        );
      case 'today':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-orange-100 text-orange-700">
            Bugün
          </span>
        );
      case 'upcoming':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-yellow-100 text-yellow-700">
            Yaklaşıyor
          </span>
        );
    }
  };

  const getSourceBadge = (source: 'feedback' | 'equipment') => {
    if (source === 'feedback') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-700">
          <MessageCircle className="w-3 h-3" />
          Şikayet
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-purple-100 text-purple-700">
        <Wrench className="w-3 h-3" />
        Cihaz
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDaysRemaining = (days: number) => {
    if (days < 0) return `${Math.abs(days)} Gün Geçti`;
    if (days === 0) return 'Bugün';
    return `${days} Gün Kaldı`;
  };

  const filteredActions = actions.filter((action) => {
    if (filter === 'all') return true;
    return action.status === filter;
  });

  const overdueCoun = actions.filter((a) => a.status === 'overdue').length;
  const todayCount = actions.filter((a) => a.status === 'today').length;
  const upcomingCount = actions.filter((a) => a.status === 'upcoming').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleAcknowledge = () => {
    acknowledgeCompliance();
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
    recheckCompliance();
  };

  return (
    <div className="p-3 md:p-4 pt-16 md:pt-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
          <h2 className="text-lg md:text-xl font-bold text-slate-800">Aksiyon Takip</h2>
        </div>
      </div>

      {isLocked && criticalItemsCount > 0 && !isAcknowledged && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-lg p-4 mb-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-red-900 mb-1.5">
                Sistem Erişimi Kısıtlandı
              </h3>
              <p className="text-xs text-red-800 mb-3">
                Termini yaklaşan veya geçmiş aksiyonlar bulunmaktadır. Devam edebilmek için lütfen aşağıdaki aksiyonları inceleyin ve incelediğinizi onaylayın.
              </p>
              <label className="flex items-start gap-2 cursor-pointer group">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleAcknowledge();
                      }
                    }}
                    className="w-4 h-4 text-green-600 border-2 border-red-400 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                  />
                </div>
                <span className="text-xs font-semibold text-red-900 group-hover:text-red-700 transition-colors">
                  Gerekli sistem aksiyonlarını okudum
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {!isLocked && isAcknowledged && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-3 mb-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-xs text-green-800">
            Sistem aksiyonları bugün için onaylanmıştır. Tüm modüllere erişebilirsiniz.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
            filter === 'all'
              ? 'bg-slate-800 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Tümü ({actions.length})
        </button>
        <button
          onClick={() => setFilter('overdue')}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
            filter === 'overdue'
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Gecikmiş ({overdueCoun})
        </button>
        <button
          onClick={() => setFilter('today')}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
            filter === 'today'
              ? 'bg-orange-600 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Bugün ({todayCount})
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
            filter === 'upcoming'
              ? 'bg-yellow-600 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Yaklaşan ({upcomingCount})
        </button>
      </div>

      {filteredActions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-6 md:p-8 text-center">
          <AlertTriangle className="w-10 h-10 md:w-12 md:h-12 text-slate-300 mx-auto mb-2 md:mb-3" />
          <p className="text-slate-500 text-xs md:text-sm">Gösterilecek aksiyon bulunmuyor</p>
          <p className="text-slate-400 text-[10px] md:text-[11px] mt-1">
            Seçili filtrede kayıt bulunamadı
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto -mx-3 md:mx-0">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                    <tr>
                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                        Durum
                      </th>
                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                        Kaynak
                      </th>
                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                        Konu/Başlık
                      </th>
                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                        Termin Tarihi
                      </th>
                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                        Kalan Süre
                      </th>
                      <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredActions.map((action, idx) => (
                      <tr
                        key={`${action.source}-${action.id}`}
                        className={`hover:bg-slate-50 transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                        }`}
                      >
                        <td className="px-3 py-1.5">
                          {getStatusBadge(action.status)}
                        </td>
                        <td className="px-3 py-1.5">
                          {getSourceBadge(action.source)}
                        </td>
                        <td className="px-3 py-1.5 text-[11px] text-slate-700">
                          <span className="font-medium">{action.title}</span>
                        </td>
                        <td className="px-3 py-1.5 text-[11px] text-slate-600">
                          {formatDate(action.date)}
                        </td>
                        <td className="px-3 py-1.5 text-[11px]">
                          <span className={`font-semibold ${
                            action.status === 'overdue'
                              ? 'text-red-600'
                              : action.status === 'today'
                              ? 'text-orange-600'
                              : 'text-yellow-600'
                          }`}>
                            {formatDaysRemaining(action.daysRemaining)}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => onViewItem(action.source, action.id)}
                            className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1.5 md:py-0.5 rounded transition-colors text-[10px]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Görüntüle</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 px-6 py-4 rounded-lg shadow-xl bg-green-600 text-white flex items-center gap-3 animate-slide-in">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Sistem erişimi açıldı</span>
        </div>
      )}
    </div>
  );
}
