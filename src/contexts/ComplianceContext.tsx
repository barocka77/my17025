import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface ComplianceContextType {
  isLocked: boolean;
  criticalItemsCount: number;
  isAcknowledged: boolean;
  loading: boolean;
  acknowledgeCompliance: () => void;
  recheckCompliance: () => Promise<void>;
}

const ComplianceContext = createContext<ComplianceContextType | undefined>(undefined);

export function ComplianceProvider({ children }: { children: ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [criticalItemsCount, setCriticalItemsCount] = useState(0);
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [loading, setLoading] = useState(true);

  const getTodayKey = () => {
    const today = new Date();
    return `compliance_acknowledged_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const checkAcknowledgment = () => {
    const key = getTodayKey();
    const acknowledged = localStorage.getItem(key) === 'true';
    setIsAcknowledged(acknowledged);
    return acknowledged;
  };

  const fetchCriticalItems = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      const futureStr = thirtyDaysFromNow.toISOString().split('T')[0];

      console.log('[ComplianceContext] Checking critical items up to:', futureStr);

      const [feedbackResult, equipmentResult] = await Promise.all([
        supabase
          .from('feedback_records')
          .select('id')
          .not('deadline', 'is', null)
          .not('validation_status', 'eq', 'Kapalı')
          .lte('deadline', futureStr),

        supabase
          .from('equipment_hardware')
          .select('id')
          .not('next_calibration_date', 'is', null)
          .neq('status', 'Passive')
          .neq('status', 'Scrapped')
          .lte('next_calibration_date', futureStr)
      ]);

      const feedbackCount = feedbackResult.data?.length || 0;
      const equipmentCount = equipmentResult.data?.length || 0;
      const total = feedbackCount + equipmentCount;

      console.log('[ComplianceContext] Critical items found:', {
        feedback: feedbackCount,
        equipment: equipmentCount,
        total
      });

      setCriticalItemsCount(total);
      return total;
    } catch (error) {
      console.error('[ComplianceContext] Error fetching critical items:', error);
      return 0;
    }
  };

  const recheckCompliance = async () => {
    setLoading(true);
    const count = await fetchCriticalItems();
    const acknowledged = checkAcknowledgment();
    setIsLocked(count > 0 && !acknowledged);
    setLoading(false);
  };

  const acknowledgeCompliance = () => {
    const key = getTodayKey();
    localStorage.setItem(key, 'true');
    setIsAcknowledged(true);
    setIsLocked(false);
    console.log('[ComplianceContext] Compliance acknowledged for today');
  };

  useEffect(() => {
    recheckCompliance();
  }, []);

  useEffect(() => {
    const checkDateChange = () => {
      const currentKey = getTodayKey();
      const lastCheckedKey = localStorage.getItem('last_date_check');

      if (lastCheckedKey && lastCheckedKey !== currentKey) {
        console.log('[ComplianceContext] Date changed, clearing acknowledgment');
        recheckCompliance();
      }

      localStorage.setItem('last_date_check', currentKey);
    };

    const interval = setInterval(checkDateChange, 5 * 60 * 1000);
    checkDateChange();

    return () => clearInterval(interval);
  }, []);

  return (
    <ComplianceContext.Provider
      value={{
        isLocked,
        criticalItemsCount,
        isAcknowledged,
        loading,
        acknowledgeCompliance,
        recheckCompliance
      }}
    >
      {children}
    </ComplianceContext.Provider>
  );
}

export function useCompliance() {
  const context = useContext(ComplianceContext);
  if (context === undefined) {
    throw new Error('useCompliance must be used within a ComplianceProvider');
  }
  return context;
}
