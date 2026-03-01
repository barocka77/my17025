import { useState, useEffect } from 'react';
import { Users, Shield, ChevronDown, Check, AlertCircle, UserPlus, X, Eye, EyeOff, Loader2, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import OrganizationLogoUpload from './OrganizationLogoUpload';

type AppRole = 'admin' | 'quality_manager' | 'personnel' | 'super_admin';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  created_at: string;
}

interface UserForm {
  email: string;
  password: string;
  full_name: string;
  role: AppRole;
}

interface EditUserForm extends UserForm {
  user_id: string;
}

const EMPTY_FORM: UserForm = { email: '', password: '', full_name: '', role: 'personnel' };

export default function AdminPanel() {
  const { role: currentUserRole } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState<UserForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<EditUserForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

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

  const updateUserRole = async (userId: string, newRole: AppRole) => {
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

  const createUser = async () => {
    if (!newUser.email || !newUser.password) {
      showToast('E-posta ve sifre zorunludur', 'error');
      return;
    }
    if (newUser.password.length < 6) {
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
          body: JSON.stringify(newUser),
        }
      );
      const result = await res.json();
      if (!res.ok) {
        showToast(result.error || 'Kullanici olusturulamadi', 'error');
      } else {
        showToast('Kullanici basariyla eklendi', 'success');
        setShowAddModal(false);
        setNewUser(EMPTY_FORM);
        setShowPassword(false);
        fetchUsers();
      }
    } catch {
      showToast('Baglanti hatasi', 'error');
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (user: UserProfile) => {
    setEditingUser({
      user_id: user.id,
      email: user.email,
      full_name: user.full_name || '',
      password: '',
      role: user.role,
    });
    setShowEditPassword(false);
  };

  const updateUser = async () => {
    if (!editingUser) return;
    if (editingUser.password && editingUser.password.length < 6) {
      showToast('Sifre en az 6 karakter olmalidir', 'error');
      return;
    }
    setSaving(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const payload: Record<string, string> = {
        user_id: editingUser.user_id,
        full_name: editingUser.full_name,
        email: editingUser.email,
        role: editingUser.role,
      };
      if (editingUser.password) {
        payload.password = editingUser.password;
      }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(payload),
        }
      );
      const result = await res.json();
      if (!res.ok) {
        showToast(result.error || 'Kullanici guncellenemedi', 'error');
      } else {
        showToast('Kullanici basariyla guncellendi', 'success');
        setEditingUser(null);
        fetchUsers();
      }
    } catch {
      showToast('Baglanti hatasi', 'error');
    } finally {
      setSaving(false);
    }
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

  const isSuperAdmin = currentUserRole === 'super_admin';

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
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

  if (!currentUserRole || !['super_admin', 'admin', 'quality_manager'].includes(currentUserRole)) {
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-slate-700" />
                <h2 className="text-lg font-semibold text-slate-800">
                  Kullanıcılar ({users.length})
                </h2>
              </div>
              {currentUserRole === 'admin' || currentUserRole === 'super_admin' && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Kullanici Ekle
                </button>
              )}
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
                      <div className="flex items-center gap-2">
                        {currentUserRole === 'admin' || currentUserRole === 'super_admin' && (
                          <button
                            onClick={() => openEditModal(user)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Duzenle
                          </button>
                        )}
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
                              {(['personnel', 'quality_manager', 'admin', ...(isSuperAdmin ? ['super_admin' as const] : [])] as AppRole[]).map((role) => (
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

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-600">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-white" />
                <h3 className="text-lg font-semibold text-white">Yeni Kullanici</h3>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setNewUser(EMPTY_FORM); setShowPassword(false); }}
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
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all"
                  placeholder="Ornek: Ahmet Yilmaz"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">E-posta *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all"
                  placeholder="ornek@sirket.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Sifre *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
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
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as AppRole })}
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
                onClick={() => { setShowAddModal(false); setNewUser(EMPTY_FORM); setShowPassword(false); }}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Iptal
              </button>
              <button
                onClick={createUser}
                disabled={creating || !newUser.email || !newUser.password}
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
                    Kullanici Olustur
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-600">
              <div className="flex items-center gap-3">
                <Pencil className="w-5 h-5 text-white" />
                <h3 className="text-lg font-semibold text-white">Kullanici Duzenle</h3>
              </div>
              <button
                onClick={() => { setEditingUser(null); setShowEditPassword(false); }}
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
                  value={editingUser.full_name}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">E-posta</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Yeni Sifre <span className="text-slate-400 font-normal">(bos birakirsaniz degismez)</span>
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editingUser.password}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all pr-10"
                    placeholder="En az 6 karakter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Rol</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as AppRole })}
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
                onClick={() => { setEditingUser(null); setShowEditPassword(false); }}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Iptal
              </button>
              <button
                onClick={updateUser}
                disabled={saving || !editingUser.email}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Kaydet
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
    </div>
  );
}
