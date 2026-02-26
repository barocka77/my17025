import { useEffect, useState } from 'react';
import { X, AlertTriangle, Calendar, MessageSquare, Wrench } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UrgentRecord {
  id: string;
  type: 'feedback' | 'equipment';
  title: string;
  subtitle: string;
  description: string;
  deadline: string;
  daysRemaining: number;
}

interface UrgentDeadlinesModalProps {
  onClose: () => void;
  onViewDetails: (recordId: string, type: 'feedback' | 'equipment') => void;
}

const STORAGE_KEY = 'acknowledgedAlertIds';
const DATE_KEY = 'acknowledgedAlertsDate';

const getTodayString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const clearIfNewDay = () => {
  const storedDate = sessionStorage.getItem(DATE_KEY);
  const today = getTodayString();

  if (storedDate !== today) {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.setItem(DATE_KEY, today);
  }
};

const getAcknowledgedIds = (): string[] => {
  try {
    clearIfNewDay();
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addAcknowledgedId = (id: string) => {
  clearIfNewDay();
  const acknowledged = getAcknowledgedIds();
  if (!acknowledged.includes(id)) {
    acknowledged.push(id);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(acknowledged));
  }
};

const addMultipleAcknowledgedIds = (ids: string[]) => {
  clearIfNewDay();
  const acknowledged = getAcknowledgedIds();
  const updated = [...new Set([...acknowledged, ...ids])];
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const checkHasUrgentAlerts = async (): Promise<boolean> => {
  try {
    clearIfNewDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);

    const [feedbackResult, equipmentResult] = await Promise.all([
      supabase
        .from('feedback_records')
        .select('id')
        .not('validation_status', 'eq', 'Kapalı')
        .lte('deadline', threeDaysLater.toISOString().split('T')[0]),

      supabase
        .from('equipment_hardware')
        .select('id')
        .not('status', 'in', '("Passive","Scrapped")')
        .lte('next_calibration_date', sevenDaysLater.toISOString().split('T')[0])
    ]);

    if (feedbackResult.error || equipmentResult.error) {
      return false;
    }

    const allIds = [
      ...(feedbackResult.data || []).map(r => r.id),
      ...(equipmentResult.data || []).map(r => r.id)
    ];

    const acknowledgedIds = getAcknowledgedIds();
    const unacknowledgedIds = allIds.filter(id => !acknowledgedIds.includes(id));

    return unacknowledgedIds.length > 0;
  } catch {
    return false;
  }
};

const UrgentDeadlinesModal = ({ onClose, onViewDetails }: UrgentDeadlinesModalProps) => {
  const [urgentRecords, setUrgentRecords] = useState<UrgentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUrgentDeadlines();
  }, []);

  const handleAcknowledgeItem = (recordId: string, type: 'feedback' | 'equipment') => {
    addAcknowledgedId(recordId);
    const updatedRecords = urgentRecords.filter(r => r.id !== recordId);
    setUrgentRecords(updatedRecords);

    if (updatedRecords.length === 0) {
      onClose();
    } else {
      onViewDetails(recordId, type);
    }
  };

  const calculateDaysRemaining = (deadlineStr: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineStr);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const fetchUrgentDeadlines = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const threeDaysLater = new Date(today);
      threeDaysLater.setDate(today.getDate() + 3);
      const sevenDaysLater = new Date(today);
      sevenDaysLater.setDate(today.getDate() + 7);

      const [feedbackResult, equipmentResult] = await Promise.all([
        supabase
          .from('feedback_records')
          .select('id, application_no, applicant_name, content_details, deadline, validation_status')
          .not('validation_status', 'eq', 'Kapalı')
          .lte('deadline', threeDaysLater.toISOString().split('T')[0])
          .order('deadline', { ascending: true }),

        supabase
          .from('equipment_hardware')
          .select('id, device_name, device_code, next_calibration_date, status')
          .not('status', 'in', '("Passive","Scrapped")')
          .lte('next_calibration_date', sevenDaysLater.toISOString().split('T')[0])
          .order('next_calibration_date', { ascending: true })
      ]);

      if (feedbackResult.error) throw feedbackResult.error;
      if (equipmentResult.error) throw equipmentResult.error;

      const feedbackRecords: UrgentRecord[] = (feedbackResult.data || []).map(record => ({
        id: record.id,
        type: 'feedback' as const,
        title: record.application_no || 'N/A',
        subtitle: record.applicant_name || 'İsimsiz',
        description: record.content_details || '',
        deadline: record.deadline,
        daysRemaining: calculateDaysRemaining(record.deadline)
      }));

      const equipmentRecords: UrgentRecord[] = (equipmentResult.data || []).map(record => ({
        id: record.id,
        type: 'equipment' as const,
        title: record.device_code || 'N/A',
        subtitle: record.device_name || 'İsimsiz Cihaz',
        description: `Kalibrasyon Tarihi: ${record.next_calibration_date}`,
        deadline: record.next_calibration_date,
        daysRemaining: calculateDaysRemaining(record.next_calibration_date)
      }));

      const allRecords = [...feedbackRecords, ...equipmentRecords]
        .sort((a, b) => a.daysRemaining - b.daysRemaining);

      const acknowledgedIds = getAcknowledgedIds();
      const unacknowledgedRecords = allRecords.filter(
        record => !acknowledgedIds.includes(record.id)
      );

      setUrgentRecords(unacknowledgedRecords);
    } catch (error) {
      console.error('Error fetching urgent deadlines:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemainingText = (days: number): string => {
    if (days < 0) {
      return `${Math.abs(days)} Gün (Gecikmiş)`;
    } else if (days === 0) {
      return 'Bugün';
    } else if (days === 1) {
      return '1 Gün Kaldı';
    } else {
      return `${days} Gün Kaldı`;
    }
  };

  const getDaysRemainingColor = (days: number): string => {
    if (days < 0) {
      return 'text-red-700 bg-red-100';
    } else if (days === 0) {
      return 'text-orange-700 bg-orange-100';
    } else {
      return 'text-amber-700 bg-amber-100';
    }
  };

  const truncateText = (text: string, maxLength: number = 50): string => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (loading) {
    return null;
  }

  if (urgentRecords.length === 0) {
    return null;
  }

  const handleCloseAttempt = () => {
    alert('Lütfen tüm acil işleri görüntüleyin veya "Tamam, Anlaşıldı" butonuna tıklayın.');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
            <h2 className="text-xl font-bold">Dikkat: Yaklaşan Terminler</h2>
          </div>
          <button
            onClick={handleCloseAttempt}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            title="Tüm acil işleri görüntüleyin"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-slate-600 mb-4">
            Termin tarihi yaklaşan veya gecikmiş {urgentRecords.length} kayıt bulunmaktadır.
          </p>

          <div className="space-y-3">
            {urgentRecords.map((record) => (
              <div
                key={record.id}
                className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {record.type === 'feedback' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Şikayet/İstek
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                          <Wrench className="w-3 h-3 mr-1" />
                          Kalibrasyon
                        </span>
                      )}
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {record.title}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getDaysRemainingColor(record.daysRemaining)}`}
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        {getDaysRemainingText(record.daysRemaining)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1">
                      {record.subtitle}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {truncateText(record.description, 80)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAcknowledgeItem(record.id, record.type)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    Detayları Gör
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
          <button
            onClick={() => {
              addMultipleAcknowledgedIds(urgentRecords.map(r => r.id));
              onClose();
            }}
            className="w-full px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            Tamam, Anlaşıldı
          </button>
        </div>
      </div>
    </div>
  );
};

export default UrgentDeadlinesModal;
