import { useState, useEffect } from 'react';
import { Users, ChevronUp, ChevronDown, CircleUser as UserCircle2, Eye, UserPlus, X, EyeOff, Loader2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import TableLayout from './TableLayout';

interface PersonnelProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  job_title: string | null;
  academic_title: string | null;
  authorized_areas: string | null;
  experience_years: string | null;
  start_date: string | null;
  education_status: string | null;
  phone: string | null;
  department: string | null;
  created_at: string;
}

type SortField = 'full_name' | 'job_title' | 'academic_title' | 'start_date' | 'experience_years';
type SortDir = 'asc' | 'desc';

interface PersonnelListViewProps {
  onSelectProfile: (id: string) => void;
}

function AcademicTitleBadge({ title }: { title: string | null }) {
  if (!title) return <span className="text-gray-400 text-xs">-</span>;
  const lower = title.toLocaleLowerCase('tr-TR');
  let color = 'bg-gray-100 text-gray-700 border-gray-200';
  if (lower.includes('müh') || lower.includes('mühendis')) color = 'bg-blue-100 text-blue-800 border-blue-200';
  else if (lower.includes('dr') || lower.includes('doç') || lower.includes('prof')) color = 'bg-teal-100 text-teal-800 border-teal-200';
  else if (lower.includes('uzman')) color = 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${color}`}>
      {title}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; className: string }> = {
    admin: { label: 'Admin', className: 'bg-red-100 text-red-800 border-red-200' },
    quality_manager: { label: 'Kalite Müd.', className: 'bg-orange-100 text-orange-800 border-orange-200' },
    personnel: { label: 'Personel', className: 'bg-green-100 text-green-800 border-green-200' },
  };
  const cfg = map[role] || { label: role, className: 'bg-gray-100 text-gray-800 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function SortButton({ field, currentField, dir, onClick }: {
  field: SortField;
  currentField: SortField;
  dir: SortDir;
  onClick: (f: SortField) => void;
}) {
  const active = currentField === field;
  return (
    <button onClick={() => onClick(field)} className="inline-flex items-center gap-0.5 hover:text-gray-900 transition-colors">
      {active ? (
        dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      ) : (
        <ChevronDown className="w-3 h-3 opacity-30" />
      )}
    </button>
  );
}

const avatarColors = ['bg-blue-500', 'bg-teal-500', 'bg-orange-500', 'bg-rose-500', 'bg-cyan-500'];
const getColor = (id: string) => avatarColors[id.charCodeAt(0) % avatarColors.length];
const getInitials = (name: string | null) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toLocaleUpperCase('tr-TR').slice(0, 2);
};

type AppRole = 'admin' | 'quality_manager' | 'personnel' | 'super_admin';

interface NewPersonnelForm {
  full_name: string;
  email: string;
  password: string;
  role: AppRole;
}

const EMPTY_FORM: NewPersonnelForm = { full_name: '', email: '', password: '', role: 'personnel' };

export default function PersonnelListView({ onSelectProfile }: PersonnelListViewProps) {
  const { role: currentUserRole } = useAuth();
  const [profiles, setProfiles] = useState<PersonnelProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState<SortField>('full_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ role: 'Tümü', department: 'Tümü' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPersonnel, setNewPersonnel] = useState<NewPersonnelForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const canAdd = currentUserRole === 'admin' || currentUserRole === 'super_admin';
  const isSuperAdmin = currentUserRole === 'super_admin';

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const createPersonnel = async () => {
    if (!newPersonnel.email || !newPersonnel.password) {
      showToast('E-posta ve sifre zorunludur', 'error');
      return;
    }
    if (newPersonnel.password.length < 6) {
      showToast('Sifre en az 6 karakter olmalidir', 'error');
      return;
    }
    setCreating(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(newPersonnel),
        }
      );
      const result = await res.json();
      if (!res.ok) {
        showToast(result.error || 'Personel olusturulamadi', 'error');
      } else {
        showToast('Personel basariyla eklendi', 'success');
        setShowAddModal(false);
        setNewPersonnel(EMPTY_FORM);
        setShowPassword(false);
        fetchProfiles();
      }
    } catch {
      showToast('Baglanti hatasi', 'error');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('get_personnel_list');
      if (rpcError) throw rpcError;
      setProfiles((data as PersonnelProfile[]) || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Veriler yüklenemedi.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const departments = ['Tümü', ...Array.from(new Set(profiles.map(p => p.department).filter(Boolean) as string[]))];

  const filtered = profiles.filter(p => {
    if (filters.role !== 'Tümü' && p.role !== filters.role) return false;
    if (filters.department !== 'Tümü' && p.department !== filters.department) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = (a[sortField] ?? '') as string;
    const bv = (b[sortField] ?? '') as string;
    const cmp = av.localeCompare(bv, 'tr', { sensitivity: 'base' });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const activeFilterCount = [filters.role, filters.department].filter(v => v !== 'Tümü').length;

  const filterDefs = [
    {
      label: 'Rol',
      value: 'role',
      options: ['Tümü', 'admin', 'quality_manager', 'personnel'],
    },
    {
      label: 'Departman',
      value: 'department',
      options: departments,
    },
  ];

  const mobileCards = sorted.map(p => (
    <div key={p.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 ${getColor(p.id)} rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0`}>
          {getInitials(p.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">{p.full_name || '-'}</div>
          <div className="text-[11px] text-gray-500 truncate">{p.email}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <RoleBadge role={p.role} />
        <AcademicTitleBadge title={p.academic_title} />
      </div>
      {p.job_title && (
        <div className="text-xs text-gray-600 mb-2">
          <span className="font-medium">Görev:</span> {p.job_title}
        </div>
      )}
      {p.start_date && (
        <div className="text-xs text-gray-500">
          <span className="font-medium">Başlangıç:</span> {formatDate(p.start_date)}
        </div>
      )}
      <div className="flex justify-end pt-2 border-t border-gray-100 mt-2">
        <button
          onClick={() => onSelectProfile(p.id)}
          className="inline-flex items-center gap-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-[11px] transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          Görüntüle
        </button>
      </div>
    </div>
  ));

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <>
    <TableLayout
      title="Personel"
      description={`Laboratuvar personelinin yetki, eğitim ve görev bilgilerinin yönetimi.`}
      addButtonLabel="Yeni Personel Ekle"
      showAddButton={canAdd}
      onAdd={() => setShowAddModal(true)}
      filters={filterDefs}
      filterValues={filters}
      onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
      showFilters={showFilters}
      onToggleFilters={() => setShowFilters(v => !v)}
      activeFilterCount={activeFilterCount}
      onClearFilters={() => setFilters({ role: 'Tümü', department: 'Tümü' })}
      totalCount={profiles.length}
      filteredCount={sorted.length}
      loading={loading}
      emptyIcon={<UserCircle2 className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto" />}
      emptyTitle="Henüz personel kaydı yok"
      emptyDescription="Sisteme kayıtlı personel bulunmamaktadır"
      mobileCards={mobileCards}
    >
      <thead>
        <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
          <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
            <div className="flex items-center gap-1">
              Ad Soyad
              <SortButton field="full_name" currentField={sortField} dir={sortDir} onClick={handleSort} />
            </div>
          </th>
          <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-32">
            Rol
          </th>
          <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
            <div className="flex items-center gap-1">
              Görev
              <SortButton field="job_title" currentField={sortField} dir={sortDir} onClick={handleSort} />
            </div>
          </th>
          <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
            <div className="flex items-center gap-1">
              Ünvan
              <SortButton field="academic_title" currentField={sortField} dir={sortDir} onClick={handleSort} />
            </div>
          </th>
          <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide hidden lg:table-cell">
            Yetkilendirildiği Alanlar
          </th>
          <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide hidden md:table-cell w-20">
            <div className="flex items-center gap-1">
              Deneyim
              <SortButton field="experience_years" currentField={sortField} dir={sortDir} onClick={handleSort} />
            </div>
          </th>
          <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide hidden md:table-cell w-28">
            <div className="flex items-center gap-1">
              İşe Başlama
              <SortButton field="start_date" currentField={sortField} dir={sortDir} onClick={handleSort} />
            </div>
          </th>
          <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide w-24">
            İşlemler
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {sorted.map(p => (
          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors border-b border-gray-100">
            <td className="px-3 py-1.5">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 ${getColor(p.id)} rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                  {getInitials(p.full_name)}
                </div>
                <div>
                  <div className="text-[11px] font-medium text-gray-900">
                    {p.full_name || <span className="text-gray-400 italic">Belirtilmemiş</span>}
                  </div>
                  <div className="text-[10px] text-gray-400">{p.email}</div>
                </div>
              </div>
            </td>
            <td className="px-3 py-1.5 whitespace-nowrap">
              <RoleBadge role={p.role} />
            </td>
            <td className="px-3 py-1.5 text-[11px] text-gray-700">
              {p.job_title || <span className="text-gray-400">-</span>}
            </td>
            <td className="px-3 py-1.5 whitespace-nowrap">
              <AcademicTitleBadge title={p.academic_title} />
            </td>
            <td className="px-3 py-1.5 hidden lg:table-cell max-w-xs">
              <span className="text-[11px] text-gray-600 line-clamp-2">
                {p.authorized_areas || <span className="text-gray-400">Belirtilmemiş</span>}
              </span>
            </td>
            <td className="px-3 py-1.5 hidden md:table-cell text-[11px] text-gray-700 whitespace-nowrap">
              {p.experience_years || <span className="text-gray-400">-</span>}
            </td>
            <td className="px-3 py-1.5 hidden md:table-cell text-[11px] text-gray-700 whitespace-nowrap">
              {formatDate(p.start_date)}
            </td>
            <td className="px-3 py-1.5 text-right whitespace-nowrap">
              <button
                onClick={() => onSelectProfile(p.id)}
                className="inline-flex items-center gap-0.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded text-[10px] transition-colors"
              >
                <Eye className="w-2.5 h-2.5" />
                Görüntüle
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </TableLayout>

    {showAddModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-600">
            <div className="flex items-center gap-3">
              <UserPlus className="w-5 h-5 text-white" />
              <h3 className="text-lg font-semibold text-white">Yeni Personel Ekle</h3>
            </div>
            <button
              onClick={() => { setShowAddModal(false); setNewPersonnel(EMPTY_FORM); setShowPassword(false); }}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Ad Soyad</label>
              <input
                type="text"
                value={newPersonnel.full_name}
                onChange={(e) => setNewPersonnel({ ...newPersonnel, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all"
                placeholder="Ornek: Ahmet Yilmaz"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">E-posta *</label>
              <input
                type="email"
                value={newPersonnel.email}
                onChange={(e) => setNewPersonnel({ ...newPersonnel, email: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all"
                placeholder="ornek@sirket.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sifre *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPersonnel.password}
                  onChange={(e) => setNewPersonnel({ ...newPersonnel, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all pr-10"
                  placeholder="En az 6 karakter"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Rol</label>
              <select
                value={newPersonnel.role}
                onChange={(e) => setNewPersonnel({ ...newPersonnel, role: e.target.value as AppRole })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all bg-white"
              >
                <option value="personnel">Personel</option>
                <option value="quality_manager">Kalite Muduru</option>
                <option value="admin">Yonetici</option>
                {isSuperAdmin && <option value="super_admin">Super Admin</option>}
              </select>
            </div>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
            <button
              onClick={() => { setShowAddModal(false); setNewPersonnel(EMPTY_FORM); setShowPassword(false); }}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Iptal
            </button>
            <button
              onClick={createPersonnel}
              disabled={creating || !newPersonnel.email || !newPersonnel.password}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Olusturuluyor...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Personel Olustur
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}

    {toast && (
      <div className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 ${
        toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      }`}>
        {toast.type === 'success' ? (
          <Check className="w-5 h-5" />
        ) : (
          <AlertCircle className="w-5 h-5" />
        )}
        <span className="font-medium">{toast.message}</span>
      </div>
    )}
    </>
  );
}
