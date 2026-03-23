import { useState, useEffect } from 'react';
import { ChevronDown, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Personnel {
  id: string;
  full_name: string;
  job_title: string | null;
}

interface PersonnelSelectProps {
  value: string;
  onChange: (value: string) => void;
  valueField?: 'id' | 'full_name';
  placeholder?: string;
  className?: string;
  showJobTitle?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function PersonnelSelect({
  value,
  onChange,
  valueField = 'id',
  placeholder = '-- Personel Seçin --',
  className,
  showJobTitle = false,
  disabled = false,
  size = 'md',
}: PersonnelSelectProps) {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .rpc('get_personnel_list')
      .then(({ data }) => {
        setPersonnel(
          (data || []).map((p: any) => ({
            id: p.id,
            full_name: p.full_name,
            job_title: p.job_title ?? null,
          }))
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-1.5 text-[11px]'
      : 'px-3 py-2 text-[12px]';

  const baseClasses = `w-full ${sizeClasses} border border-slate-200 rounded-lg bg-white text-slate-800
    appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors`;

  const resolvedValue = (() => {
    if (!value) return '';
    if (valueField === 'id') return value;
    return value;
  })();

  return (
    <div className={`relative ${className ?? ''}`}>
      {loading ? (
        <div className={`w-full ${sizeClasses} border border-slate-200 rounded-lg bg-slate-50 text-slate-400 flex items-center gap-2`}>
          <User className="w-3 h-3 shrink-0" />
          <span>Yükleniyor...</span>
        </div>
      ) : (
        <>
          <select
            value={resolvedValue}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            className={baseClasses}
          >
            <option value="">{placeholder}</option>
            {personnel.map(p => (
              <option key={p.id} value={valueField === 'id' ? p.id : p.full_name}>
                {showJobTitle && p.job_title
                  ? `${p.full_name} — ${p.job_title}`
                  : p.full_name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </>
      )}
    </div>
  );
}
