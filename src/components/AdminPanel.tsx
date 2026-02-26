import { useState, useEffect } from 'react';
import { Users, Shield, ChevronDown, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import OrganizationLogoUpload from './OrganizationLogoUpload';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'quality_manager' | 'personnel';
  created_at: string;
}

export default function AdminPanel() {
  const { role: currentUserRole } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_all_profiles');

    if (error) {
      console.error('Error fetching users:', error);
      showToast('Kullanıcılar yüklenirken hata oluştu', 'error');
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'quality_manager' | 'personnel') => {
    setUpdatingUserId(userId);
    setOpenDropdownId(null);

    const { error } = await supabase.rpc('update_user_role', {
      target_user_id: userId,
      new_role: newRole
    });

    if (error) {
      console.error('Error updating user role:', error);
      showToast('Rol güncellenirken hata oluştu', 'error');
    } else {
      showToast('Rol başarıyla güncellendi', 'success');
      fetchUsers();
    }
    setUpdatingUserId(null);
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-slate-800 text-white';
      case 'quality_manager':
        return 'bg-blue-900 text-blue-50';
      case 'personnel':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Yönetici',
      quality_manager: 'Kalite Müdürü',
      personnel: 'Personel',
    };
    return labels[role] || role;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!currentUserRole || !['admin', 'quality_manager'].includes(currentUserRole)) {
    return null;
  }

  if (loading) {
    return (
      <div className="p-6 md:p-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Yükleniyor...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-slate-800" />
            <h1 className="text-3xl font-bold text-slate-800">Yönetici Paneli</h1>
          </div>
          <p className="text-slate-600">Kullanıcı rollerini yönetin ve sistem erişimini kontrol edin</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-semibold text-slate-800">
                Kullanıcılar ({users.length})
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Kullanıcı
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    E-posta
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Kayıt Tarihi
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {user.full_name || 'İsimsiz'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600">{formatDate(user.created_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdownId(openDropdownId === user.id ? null : user.id)}
                          disabled={updatingUserId === user.id}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                          {updatingUserId === user.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin"></div>
                              Güncelleniyor...
                            </>
                          ) : (
                            <>
                              Rol Değiştir
                              <ChevronDown className="w-4 h-4" />
                            </>
                          )}
                        </button>

                        {openDropdownId === user.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenDropdownId(null)}
                            />
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-20 overflow-hidden">
                              {(['personnel', 'quality_manager', 'admin'] as const).map((role) => (
                                <button
                                  key={role}
                                  onClick={() => updateUserRole(user.id, role)}
                                  className={`w-full px-4 py-3 text-left text-sm hover:bg-slate-50 transition-colors flex items-center justify-between ${
                                    user.role === role ? 'bg-blue-50' : ''
                                  }`}
                                >
                                  <span className="font-medium">{getRoleLabel(role)}</span>
                                  {user.role === role && (
                                    <Check className="w-4 h-4 text-blue-600" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="px-6 py-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Henüz kullanıcı bulunmuyor</p>
            </div>
          )}
        </div>

        <div className="mt-8">
          <OrganizationLogoUpload />
        </div>
      </div>

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
    </div>
  );
}
