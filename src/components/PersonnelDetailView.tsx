import { useState, useEffect } from 'react';
import {
  ArrowLeft, Save, Edit2, X, Plus, Trash2,
  BookOpen, Phone, Calendar, GraduationCap,
  Briefcase, Award, MapPin, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import TrainingFormModal from './TrainingFormModal';

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
  created_by: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

interface TrainingRecord {
  id: string;
  user_id: string;
  subject: string;
  provider: string | null;
  training_date: string | null;
  duration: string | null;
  description: string | null;
  created_at: string;
}

interface PersonnelDetailViewProps {
  profileId: string;
  onBack: () => void;
}

function AcademicTitleBadge({ title }: { title: string | null }) {
  if (!title) return <span className="text-slate-400 text-xs">Belirtilmemiş</span>;
  const lower = title.toLowerCase();
  let color = 'bg-slate-100 text-slate-600 border-slate-200';
  if (lower.includes('müh') || lower.includes('mühendis')) color = 'bg-blue-50 text-blue-700 border-blue-200';
  else if (lower.includes('dr') || lower.includes('doç') || lower.includes('prof')) color = 'bg-teal-50 text-teal-700 border-teal-200';
  else if (lower.includes('uzman')) color = 'bg-amber-50 text-amber-700 border-amber-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
      {title}
    </span>
  );
}

interface EditableFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  editing: boolean;
  icon: React.ReactNode;
  placeholder?: string;
  type?: string;
}

function EditableField({ label, value, onChange, editing, icon, placeholder = 'Belirtilmemiş', type = 'text' }: EditableFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
        {icon}
        {label}
      </label>
      {editing ? (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          placeholder={placeholder}
        />
      ) : (
        <p className="text-sm text-slate-800 font-medium min-h-[2rem] flex items-center">
          {value || <span className="text-slate-400 font-normal italic">{placeholder}</span>}
        </p>
      )}
    </div>
  );
}

export default function PersonnelDetailView({ profileId, onBack }: PersonnelDetailViewProps) {
  const { user, role } = useAuth();
  const [profile, setProfile] = useState<PersonnelProfile | null>(null);
  const [trainings, setTrainings] = useState<TrainingRecord[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingTrainings, setLoadingTrainings] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [academicTitle, setAcademicTitle] = useState('');
  const [educationStatus, setEducationStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [phone, setPhone] = useState('');
  const [authorizedAreas, setAuthorizedAreas] = useState('');
  const [experienceYears, setExperienceYears] = useState('');

  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [editingTraining, setEditingTraining] = useState<TrainingRecord | null>(null);
  const [deletingTrainingId, setDeletingTrainingId] = useState<string | null>(null);

  const isManager = role === 'admin' || role === 'quality_manager';
  const isSelf = user?.id === profileId;
  const canEdit = isManager || isSelf;

  useEffect(() => {
    fetchProfile();
    fetchTrainings();
  }, [profileId]);

  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase.rpc('get_profile_by_id', { target_id: profileId });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setProfile(row);
        setFullName(row.full_name || '');
        setJobTitle(row.job_title || '');
        setAcademicTitle(row.academic_title || '');
        setEducationStatus(row.education_status || '');
        setStartDate(row.start_date || '');
        setPhone(row.phone || '');
        setAuthorizedAreas(row.authorized_areas || '');
        setExperienceYears(row.experience_years || '');
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchTrainings = async () => {
    setLoadingTrainings(true);
    try {
      const { data, error } = await supabase
        .from('personnel_training')
        .select('*')
        .eq('user_id', profileId)
        .order('training_date', { ascending: false });
      if (error) throw error;
      setTrainings(data || []);
    } catch (err) {
      console.error('Trainings fetch error:', err);
    } finally {
      setLoadingTrainings(false);
    }
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { error } = await supabase.rpc('update_profile_by_id', {
        target_id: profileId,
        p_full_name: fullName.trim() || null,
        p_job_title: jobTitle.trim() || null,
        p_academic_title: academicTitle.trim() || null,
        p_education_status: educationStatus.trim() || null,
        p_start_date: startDate || null,
        p_phone: phone.trim() || null,
        p_authorized_areas: authorizedAreas.trim() || null,
        p_experience_years: experienceYears.trim() || null,
        p_updated_by: currentUser?.email ?? null,
      });
      if (error) throw error;
      await fetchProfile();
      setEditing(false);
      showToast('success', 'Profil güncellendi.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Güncelleme başarısız.';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setFullName(profile.full_name || '');
      setJobTitle(profile.job_title || '');
      setAcademicTitle(profile.academic_title || '');
      setEducationStatus(profile.education_status || '');
      setStartDate(profile.start_date || '');
      setPhone(profile.phone || '');
      setAuthorizedAreas(profile.authorized_areas || '');
      setExperienceYears(profile.experience_years || '');
    }
    setEditing(false);
  };

  const handleDeleteTraining = async (id: string) => {
    setDeletingTrainingId(id);
    try {
      const { error } = await supabase.from('personnel_training').delete().eq('id', id);
      if (error) throw error;
      await fetchTrainings();
      showToast('success', 'Eğitim kaydı silindi.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Silme işlemi başarısız.';
      showToast('error', msg);
    } finally {
      setDeletingTrainingId(null);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const avatarColors = ['bg-blue-500', 'bg-teal-500', 'bg-orange-500', 'bg-rose-500', 'bg-violet-500', 'bg-cyan-500'];
  const avatarColor = avatarColors[profileId.charCodeAt(0) % avatarColors.length];

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Profil bulunamadı.
      </div>
    );
  }

  const formatAuditDate = (d: string | null | undefined) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Personel Listesi
          </button>
          {canEdit && (
            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    İptal
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Düzenle
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 max-w-5xl mx-auto w-full">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Card Top Banner */}
          <div className="h-16 bg-gradient-to-r from-slate-800 to-slate-700" />

          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="flex items-end justify-between -mt-8 mb-5">
              <div className={`w-16 h-16 ${avatarColor} rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg border-4 border-white`}>
                {getInitials(profile.full_name)}
              </div>
              {editing && (
                <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2.5 py-1 rounded-full">
                  Düzenleme modu
                </span>
              )}
            </div>

            {/* Name & title inline */}
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <EditableField
                  label="Ad Soyad"
                  value={fullName}
                  onChange={setFullName}
                  editing={editing}
                  icon={<Award className="w-3 h-3" />}
                />
                <EditableField
                  label="Ünvan"
                  value={academicTitle}
                  onChange={setAcademicTitle}
                  editing={editing}
                  icon={<GraduationCap className="w-3 h-3" />}
                  placeholder="Örn: Mühendis, Tekniker..."
                />
              </div>
            ) : (
              <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900">
                  {profile.full_name || <span className="text-slate-400 italic font-normal">İsim Belirtilmemiş</span>}
                </h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <AcademicTitleBadge title={profile.academic_title} />
                  {profile.job_title && (
                    <span className="text-sm text-slate-500">{profile.job_title}</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">{profile.email}</p>
              </div>
            )}

            {/* Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 pt-4 border-t border-slate-100">
              {!editing && (
                <EditableField
                  label="Ad Soyad"
                  value={fullName}
                  onChange={setFullName}
                  editing={false}
                  icon={<Award className="w-3 h-3" />}
                />
              )}
              <EditableField
                label="Görev"
                value={jobTitle}
                onChange={setJobTitle}
                editing={editing}
                icon={<Briefcase className="w-3 h-3" />}
                placeholder="Görevi belirtilmemiş"
              />
              {editing && (
                <EditableField
                  label="Ünvan"
                  value={academicTitle}
                  onChange={setAcademicTitle}
                  editing={editing}
                  icon={<GraduationCap className="w-3 h-3" />}
                  placeholder="Örn: Mühendis, Tekniker..."
                />
              )}
              <EditableField
                label="Eğitim Durumu"
                value={educationStatus}
                onChange={setEducationStatus}
                editing={editing}
                icon={<GraduationCap className="w-3 h-3" />}
                placeholder="Örn: Lisans, Yüksek Lisans..."
              />
              <EditableField
                label="İşe Başlama"
                value={startDate}
                onChange={setStartDate}
                editing={editing}
                icon={<Calendar className="w-3 h-3" />}
                placeholder="Tarih seçin"
                type="date"
              />
              <EditableField
                label="Telefon"
                value={phone}
                onChange={setPhone}
                editing={editing}
                icon={<Phone className="w-3 h-3" />}
                placeholder="Belirtilmemiş"
                type="tel"
              />
              <EditableField
                label="Deneyim"
                value={experienceYears}
                onChange={setExperienceYears}
                editing={editing}
                icon={<Clock className="w-3 h-3" />}
                placeholder="Örn: 5 yıl"
              />
              <div className={editing ? 'sm:col-span-2 lg:col-span-3' : 'sm:col-span-2'}>
                <EditableField
                  label="Yetkilendirildiği Alanlar"
                  value={authorizedAreas}
                  onChange={setAuthorizedAreas}
                  editing={editing}
                  icon={<MapPin className="w-3 h-3" />}
                  placeholder="Belirtilmemiş"
                />
              </div>
            </div>

            {/* Display startDate nicely when not editing */}
            {!editing && profile.start_date && (
              <p className="text-[11px] text-slate-400 mt-3">
                İşe Giriş: {formatDate(profile.start_date)}
              </p>
            )}
          </div>
        </div>

        {/* Training History Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Eğitim Geçmişi (FR.27)</h3>
                <p className="text-[11px] text-slate-400">{trainings.length} eğitim kaydı</p>
              </div>
            </div>
            {canEdit && (
              <button
                onClick={() => { setEditingTraining(null); setShowTrainingModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Yeni Eğitim Ekle
              </button>
            )}
          </div>

          {loadingTrainings ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-3 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : trainings.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Henüz eğitim kaydı yok.</p>
              {canEdit && (
                <p className="text-xs mt-1">Yukarıdaki butonu kullanarak eğitim ekleyin.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Eğitim Konusu</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Veren Kuruluş</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tarih</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Süre</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Açıklama</th>
                    {canEdit && <th className="px-4 py-3 w-20" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trainings.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-900">{t.subject}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-sm text-slate-600">{t.provider || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{formatDate(t.training_date)}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-slate-600">{t.duration || '-'}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell max-w-xs">
                        <span className="text-xs text-slate-500 line-clamp-2">{t.description || '-'}</span>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => { setEditingTraining(t); setShowTrainingModal(true); }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTraining(t.id)}
                              disabled={deletingTrainingId === t.id}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Audit Info – admin only */}
      {role === 'admin' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-6 py-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Kayıt Bilgileri</p>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
            <div>
              <dt className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Oluşturan</dt>
              <dd className="text-xs font-medium text-slate-700">{profile.created_by || '-'}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Oluşturma Tarihi</dt>
              <dd className="text-xs font-medium text-slate-700">{formatAuditDate((profile as any).created_at)}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Son Güncelleyen</dt>
              <dd className="text-xs font-medium text-slate-700">{profile.updated_by || '-'}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Güncelleme Tarihi</dt>
              <dd className="text-xs font-medium text-slate-700">{formatAuditDate(profile.updated_at)}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Training Modal */}
      {showTrainingModal && (
        <TrainingFormModal
          userId={profileId}
          training={editingTraining}
          onClose={() => { setShowTrainingModal(false); setEditingTraining(null); }}
          onSaved={() => { setShowTrainingModal(false); setEditingTraining(null); fetchTrainings(); showToast('success', 'Eğitim kaydedildi.'); }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-white text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
