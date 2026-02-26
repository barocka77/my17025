import { ReactNode } from 'react';
import { Plus, Filter, X } from 'lucide-react';

interface FilterOption {
  label: string;
  value: string;
  options: string[];
}

interface TableLayoutProps {
  title: string;
  description?: string;
  addButtonLabel: string;
  onAdd?: () => void;
  showAddButton?: boolean;
  filters?: FilterOption[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
  onClearFilters: () => void;
  totalCount: number;
  filteredCount: number;
  loading?: boolean;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  children: ReactNode;
  mobileCards?: ReactNode;
}

export default function TableLayout({
  title,
  description,
  addButtonLabel,
  onAdd,
  showAddButton = true,
  filters = [],
  filterValues = {},
  onFilterChange,
  showFilters,
  onToggleFilters,
  activeFilterCount,
  onClearFilters,
  totalCount,
  filteredCount,
  loading = false,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  children,
  mobileCards,
}: TableLayoutProps) {
  const isEmpty = !loading && filteredCount === 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-6 pt-16 md:pt-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-light text-gray-900">{title}</h1>
            {description && (
              <p className="mt-3 text-xs md:text-sm text-gray-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                {description}
              </p>
            )}
          </div>
          <div className="flex gap-2 md:gap-3">
            {filters.length > 0 && (
              <button
                onClick={onToggleFilters}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-gray-700 px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-all shadow-sm font-medium relative text-xs md:text-sm"
              >
                <Filter className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">Filtrele</span>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-slate-600 text-white text-[10px] md:text-xs font-bold w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
            {showAddButton && onAdd && (
              <button
                onClick={onAdd}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-slate-700 transition-all shadow-sm hover:shadow-md font-medium text-xs md:text-sm"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">{addButtonLabel}</span>
                <span className="sm:hidden">Yeni</span>
              </button>
            )}
          </div>
        </div>

        {showFilters && filters.length > 0 && (
          <div className="mt-4 md:mt-6 p-4 md:p-6 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h3 className="text-xs md:text-sm font-semibold text-gray-900 uppercase tracking-wide">Filtreler</h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={onClearFilters}
                  className="text-xs md:text-sm text-slate-600 hover:text-slate-800 font-medium flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Temizle
                </button>
              )}
            </div>
            <div className={`grid grid-cols-1 gap-3 md:gap-4 ${filters.length === 1 ? 'md:grid-cols-1' : filters.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
              {filters.map(filter => (
                <div key={filter.value}>
                  <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    {filter.label}
                  </label>
                  <select
                    value={filterValues[filter.value] || 'Tümü'}
                    onChange={e => onFilterChange?.(filter.value, e.target.value)}
                    className="w-full px-3 py-2.5 text-[11px] md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  >
                    {filter.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Yükleniyor...</div>
          </div>
        ) : isEmpty ? (
          <div className="text-center py-12 md:py-16">
            {emptyIcon && <div className="mb-3 md:mb-4 flex justify-center">{emptyIcon}</div>}
            <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">
              {activeFilterCount > 0 ? 'Filtre kriterlerine uygun kayıt bulunamadı' : (emptyTitle || 'Henüz kayıt yok')}
            </h3>
            <p className="text-sm md:text-base text-gray-500 mb-4 md:mb-6">
              {activeFilterCount > 0 ? 'Farklı filtreler deneyebilirsiniz' : (emptyDescription || '')}
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={onClearFilters}
                className="text-slate-600 hover:text-slate-800 font-medium text-sm md:text-base py-2 px-4"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            {mobileCards && (
              <div className="md:hidden space-y-3">{mobileCards}</div>
            )}

            {/* Desktop Table */}
            <div className={`${mobileCards ? 'hidden md:block' : ''} bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  {children}
                </table>
              </div>

              <div className="bg-gray-50 px-3 py-1.5 border-t border-gray-200">
                <p className="text-[10px] text-gray-600">
                  Toplam <span className="font-semibold text-gray-900">{filteredCount}</span> kayıt
                  {totalCount !== filteredCount && (
                    <span> (Tüm kayıtlar: {totalCount})</span>
                  )}
                </p>
              </div>
            </div>

            {/* Mobile Footer */}
            {mobileCards && filteredCount > 0 && (
              <div className="md:hidden mt-3 bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-2.5">
                <p className="text-[11px] text-gray-600 text-center">
                  Toplam <span className="font-semibold text-gray-900">{filteredCount}</span> kayıt
                  {totalCount !== filteredCount && (
                    <span> (Tüm kayıtlar: {totalCount})</span>
                  )}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
