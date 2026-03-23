import { useState, useEffect, useRef } from 'react';
import { ChevronDown, User, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Personnel {
  id: string;
  full_name: string;
  job_title: string | null;
}

interface BaseProps {
  valueField?: 'id' | 'full_name';
  placeholder?: string;
  className?: string;
  showJobTitle?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

interface SingleSelectProps extends BaseProps {
  isMulti?: false;
  value: string;
  onChange: (value: string) => void;
}

interface MultiSelectProps extends BaseProps {
  isMulti: true;
  value: string[];
  onChange: (value: string[]) => void;
}

type PersonnelSelectProps = SingleSelectProps | MultiSelectProps;

export function PersonnelSelect(props: PersonnelSelectProps) {
  const {
    valueField = 'id',
    placeholder = '-- Personel Seçin --',
    className,
    showJobTitle = false,
    disabled = false,
    size = 'md',
  } = props;

  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-1.5 text-[11px]'
      : 'px-3 py-2 text-[12px]';

  const baseClasses = `w-full ${sizeClasses} border border-slate-200 rounded-lg bg-white text-slate-800
    appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors`;

  if (loading) {
    return (
      <div className={`relative ${className ?? ''}`}>
        <div className={`w-full ${sizeClasses} border border-slate-200 rounded-lg bg-slate-50 text-slate-400 flex items-center gap-2`}>
          <User className="w-3 h-3 shrink-0" />
          <span>Yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (!props.isMulti) {
    return (
      <div className={`relative ${className ?? ''}`}>
        <select
          value={props.value || ''}
          onChange={e => props.onChange(e.target.value)}
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
      </div>
    );
  }

  const selectedValues = props.value;

  const toggle = (val: string) => {
    if (selectedValues.includes(val)) {
      props.onChange(selectedValues.filter(v => v !== val));
    } else {
      props.onChange([...selectedValues, val]);
    }
  };

  const remove = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    props.onChange(selectedValues.filter(v => v !== val));
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`w-full min-h-[36px] px-3 py-1.5 border rounded-lg bg-white text-left flex flex-wrap items-center gap-1.5
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors
          ${disabled
            ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200'
            : 'border-slate-200 hover:border-slate-300 cursor-pointer'
          }`}
      >
        {selectedValues.length === 0 ? (
          <span className="text-[12px] text-slate-400 flex-1 py-0.5">{placeholder}</span>
        ) : (
          selectedValues.map(val => (
            <span
              key={val}
              className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-md"
            >
              {val}
              {!disabled && (
                <X
                  className="w-2.5 h-2.5 text-slate-500 hover:text-red-500 cursor-pointer"
                  onClick={e => remove(val, e)}
                />
              )}
            </span>
          ))
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 ml-auto flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {personnel.length === 0 ? (
            <div className="px-3 py-2.5 text-[12px] text-slate-400">Personel bulunamadı.</div>
          ) : (
            personnel.map(p => {
              const val = valueField === 'id' ? p.id : p.full_name;
              const isSelected = selectedValues.includes(val);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(val)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px] hover:bg-slate-50 transition-colors ${isSelected ? 'bg-slate-50' : ''}`}
                >
                  <span
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-slate-700 border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                  </span>
                  <span className="text-slate-800">
                    {showJobTitle && p.job_title
                      ? `${p.full_name} — ${p.job_title}`
                      : p.full_name}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
