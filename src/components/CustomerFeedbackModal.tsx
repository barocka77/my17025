import { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, Lightbulb, MessageSquare, Flag, Save, ChevronDown, Upload, FileText, Image, Loader2, AlertCircle, ExternalLink, Lock, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import SignaturesSection from './SignaturesSection';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;

interface CustomerFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
}

const CustomerFeedbackModal = ({ isOpen, onClose, onSuccess, editData }: CustomerFeedbackModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [personnelList, setPersonnelList] = useState<{ id: string; full_name: string }[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [signingIndex, setSigningIndex] = useState<number | null>(null);
  const [lockToast, setLockToast] = useState(false);
  const [actions, setActions] = useState<{ id?: string; action_description: string; responsible_person: string; deadline: string; status: string; completed_date: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLocked = !!(editData?.is_locked);

  useEffect(() => {
    const fetchPersonnel = async () => {
      const { data } = await supabase.rpc('get_personnel_list');
      if (data) {
        setPersonnelList(
          (data as { id: string; full_name: string | null; email: string }[])
            .map((p) => ({ id: p.id, full_name: p.full_name || p.email || '' }))
            .filter((p) => p.full_name)
        );
      }
    };
    fetchPersonnel();
  }, []);
  const [formData, setFormData] = useState<any>({
    application_no: '',
    form_date: new Date().toISOString().split('T')[0],
    received_by: '',
    feedback_type: 'İstek',
    communication_channel: 'E-posta',
    source_type: 'Müşteri',
    applicant_name: '',
    contact_person: '',
    phone: '',
    email: '',
    content_details: '',
    validation_status: 'Değerlendirmede',
    evaluation: '',
    action_plan: '',
    responsible_person: '',
    deadline: '',
    requires_capa: false,
    capa_no: '',
    risk_probability: 'Düşük',
    risk_severity: 'Hafif',
    status: 'Açık',
    izahat_text: '',
    izahat_by: '',
    closure_date: '',
    closure_notes: '',
  });

  useEffect(() => {
    if (!isOpen) return;

    if (editData) {
      setFormData({
        application_no: editData.application_no || '',
        form_date: editData.form_date || new Date().toISOString().split('T')[0],
        received_by: editData.received_by || '',
        feedback_type: editData.feedback_type || 'İstek',
        communication_channel: editData.communication_channel || 'E-posta',
        source_type: editData.source_type || 'Müşteri',
        applicant_name: editData.applicant_name || '',
        contact_person: editData.contact_person || '',
        phone: editData.phone || '',
        email: editData.email || '',
        content_details: editData.content_details || '',
        validation_status: editData.validation_status || 'Değerlendirmede',
        evaluation: editData.evaluation || '',
        action_plan: editData.action_plan || '',
        responsible_person: editData.responsible_person || '',
        deadline: editData.deadline || '',
        requires_capa: editData.requires_capa || false,
        capa_no: editData.capa_no || '',
        risk_probability: editData.risk_probability || 'Düşük',
        risk_severity: editData.risk_severity || 'Hafif',
        status: editData.status || 'Açık',
        izahat_text: editData.izahat_text || '',
        izahat_by: editData.izahat_by || '',
        closure_date: editData.closure_date || '',
        closure_notes: editData.closure_notes || '',
      });

      (async () => {
        const { data: freshRow } = await supabase
          .from('feedback_records')
          .select('attachments')
          .eq('id', editData.id)
          .maybeSingle();
        setAttachments(freshRow?.attachments || []);

        const { data: actionsData } = await supabase
          .from('feedback_actions')
          .select('*')
          .eq('feedback_id', editData.id)
          .order('sort_order', { ascending: true });
        if (actionsData && actionsData.length > 0) {
          setActions(actionsData.map((a: any) => ({
            id: a.id,
            action_description: a.action_description || '',
            responsible_person: a.responsible_person || '',
            deadline: a.deadline || '',
            status: a.status || 'Devam Ediyor',
            completed_date: a.completed_date || '',
          })));
        } else {
          setActions([]);
        }
      })();
    } else {
      generateApplicationNo();
      setAttachments([]);
      setActions([]);
    }
    setUploadError(null);
  }, [editData, isOpen]);

  const generateApplicationNo = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 9000) + 1000;
    setFormData(prev => ({ ...prev, application_no: `FB-${year}-${random}` }));
  };

  const calculateRiskLevel = (probability: string, severity: string): string => {
    const probMap: Record<string, number> = {
      'Çok Düşük': 1, 'Düşük': 2, 'Orta': 3, 'Yüksek': 4, 'Çok Yüksek': 5
    };
    const sevMap: Record<string, number> = {
      'Çok Hafif': 1, 'Hafif': 2, 'Orta': 3, 'Ciddi': 4, 'Çok Ciddi': 5
    };

    const score = (probMap[probability] || 2) * (sevMap[severity] || 2);

    if (score <= 4) return 'Düşük Risk';
    if (score <= 9) return 'Orta Risk';
    if (score <= 16) return 'Yüksek Risk';
    return 'Kritik Risk';
  };

  const getRiskLevelColor = (level: string): string => {
    const colors: Record<string, string> = {
      'Düşük Risk': 'bg-green-100 text-green-800 border-green-200',
      'Orta Risk': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Yüksek Risk': 'bg-orange-100 text-orange-800 border-orange-200',
      'Kritik Risk': 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  const getFileIcon = (path: string) => {
    if (path.toLowerCase().endsWith('.pdf')) return <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />;
    return <Image className="w-4 h-4 text-blue-500 flex-shrink-0" />;
  };

  const getFileName = (path: string) => path.split('/').pop() || path;

  const handleOpenFile = async (path: string, idx: number) => {
    setSigningIndex(idx);
    try {
      const { data: urlData, error } = await supabase.storage
        .from('feedback-files')
        .createSignedUrl(path, 60);
      if (error) throw error;
      window.open(urlData.signedUrl, '_blank');
    } catch {
      alert('Dosya açılamadı.');
    } finally {
      setSigningIndex(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editData) return;
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadError(null);

    const remaining = MAX_FILES - attachments.length;
    if (files.length > remaining) {
      setUploadError(`En fazla ${MAX_FILES} dosya yüklenebilir. Şu an ${attachments.length} dosya mevcut.`);
      e.target.value = '';
      return;
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setUploadError('Sadece PDF, JPG ve PNG dosyaları yüklenebilir.');
        e.target.value = '';
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`"${file.name}" dosyası 10MB sınırını aşıyor.`);
        e.target.value = '';
        return;
      }
    }

    setUploading(true);
    try {
      const newPaths: string[] = [];

      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `feedback/${editData.id}/${Date.now()}_${safeName}`;

        const { error: storageError } = await supabase.storage
          .from('feedback-files')
          .upload(path, file, { upsert: false });

        if (storageError) throw storageError;
        newPaths.push(path);
      }

      const updatedAttachments = [...attachments, ...newPaths];

      const { error: dbError, count } = await supabase
        .from('feedback_records')
        .update({ attachments: updatedAttachments })
        .eq('id', editData.id)
        .select('id', { count: 'exact', head: true });

      if (dbError) throw dbError;

      setAttachments(updatedAttachments);
    } catch (err: any) {
      setUploadError(err.message || 'Dosya yükleme başarısız oldu.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      setLockToast(true);
      setTimeout(() => setLockToast(false), 3500);
      return;
    }
    setLoading(true);

    try {
      const riskLevel = calculateRiskLevel(formData.risk_probability, formData.risk_severity);

      // Convert empty date strings to null to avoid PostgreSQL errors
      const { action_plan: _ap, responsible_person: _rp, deadline: _dl, ...restFormData } = formData;
      const dataToSave = {
        ...restFormData,
        risk_level: riskLevel,
        action_plan: formData.action_plan || null,
        responsible_person: formData.responsible_person || null,
        deadline: formData.deadline || null,
        response_date: null,
        attachments: attachments.length > 0 ? attachments : null,
        closure_date: formData.closure_date || null,
        closure_notes: formData.closure_notes || '',
      };

      console.log('Attempting to save to feedback_records table:', {
        operation: editData ? 'UPDATE' : 'INSERT',
        data: dataToSave
      });

      let recordId = editData?.id;

      if (editData) {
        const { data, error } = await supabase
          .from('feedback_records')
          .update(dataToSave)
          .eq('id', editData.id)
          .select();

        if (error) {
          console.error('Supabase UPDATE Error Details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        console.log('Update successful:', data);
      } else {
        const { data, error } = await supabase
          .from('feedback_records')
          .insert([{ ...dataToSave, profile_id: user?.id }])
          .select();

        if (error) {
          console.error('Supabase INSERT Error Details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        console.log('Insert successful:', data);
        if (data && data[0]) recordId = data[0].id;
      }

      if (recordId) {
        const existingIds = actions.filter(a => a.id).map(a => a.id!);

        if (editData) {
          const { data: currentActions } = await supabase
            .from('feedback_actions')
            .select('id')
            .eq('feedback_id', recordId);
          const idsToDelete = (currentActions || [])
            .map((a: any) => a.id)
            .filter((id: string) => !existingIds.includes(id));
          if (idsToDelete.length > 0) {
            await supabase.from('feedback_actions').delete().in('id', idsToDelete);
          }
        }

        for (let idx = 0; idx < actions.length; idx++) {
          const a = actions[idx];
          const payload = {
            action_description: a.action_description || '',
            responsible_person: a.responsible_person || '',
            deadline: a.deadline || null,
            status: a.status || 'Devam Ediyor',
            completed_date: a.completed_date || null,
            sort_order: idx,
          };

          if (a.id) {
            await supabase.from('feedback_actions').update(payload).eq('id', a.id);
          } else {
            await supabase.from('feedback_actions').insert({ ...payload, feedback_id: recordId });
          }
        }
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving feedback:', error);

      let errorMessage = 'Kaydetme sırasında bir hata oluştu.';

      if (error?.code === '42501') {
        errorMessage = 'İzin hatası: Bu işlem için yetkiniz yok. Lütfen yöneticinizle iletişime geçin.';
      } else if (error?.code === '23505') {
        errorMessage = 'Bu kayıt zaten mevcut.';
      } else if (error?.code === '22P02') {
        errorMessage = 'Tarih formatı hatası. Lütfen tarih alanlarını kontrol edin.';
      } else if (error?.message) {
        errorMessage = `Hata: ${error.message}`;
      }

      alert(errorMessage + '\n\nDetaylar için konsolu kontrol edin (F12).');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const riskLevel = calculateRiskLevel(formData.risk_probability, formData.risk_severity);
  const isInvalid = formData.validation_status === 'Geçersiz/Uygun Değil';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4 overflow-y-auto">
      <div className="bg-white md:rounded-xl shadow-2xl max-w-5xl w-full h-full md:h-auto my-0 md:my-8 md:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex justify-between items-center md:rounded-t-xl z-10">
          <div>
            <h2 className="text-sm md:text-base font-light text-gray-900">
              {editData ? 'Geri Bildirimi Düzenle' : 'Yeni Geri Bildirim'}
            </h2>
            <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1">Şikayetler, İtirazlar, Talep ve Öneriler</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {isLocked && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-300 rounded-xl">
              <Lock className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Bu kayıt imzalanmış ve kilitlidir.</p>
                <p className="text-xs text-red-600 mt-0.5">Düzenleme yapılamaz. Değişiklik gerekiyorsa önce admin tarafından kilidin açılması gerekir.</p>
              </div>
            </div>
          )}

          {lockToast && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 bg-red-600 text-white text-sm font-medium rounded-lg shadow-lg animate-fade-in">
              <Lock className="w-4 h-4 flex-shrink-0" />
              Kilitli kayıt güncellenemez.
            </div>
          )}

          <fieldset disabled={isLocked} className="space-y-4">
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-600 text-white flex items-center justify-center text-sm font-semibold">1</div>
              Bildirim Kaydı
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">Bildirim No</label>
                <input
                  type="text"
                  value={formData.application_no}
                  onChange={(e) => setFormData({ ...formData, application_no: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  placeholder="FB-2024-0001"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">Tarih</label>
                <input
                  type="date"
                  value={formData.form_date}
                  onChange={(e) => setFormData({ ...formData, form_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">Geri Bildirimi Alan</label>
                <div className="relative">
                  <select
                    value={formData.received_by}
                    onChange={(e) => setFormData({ ...formData, received_by: e.target.value })}
                    className="w-full appearance-none px-4 py-2.5 pr-9 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all bg-white text-[11px]"
                  >
                    <option value="">-- Personel Seçin --</option>
                    {personnelList.map((p) => (
                      <option key={p.id} value={p.full_name}>{p.full_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">İletişim Kanalı</label>
                <select
                  value={formData.communication_channel}
                  onChange={(e) => setFormData({ ...formData, communication_channel: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                >
                  <option>Şahsen</option>
                  <option>Telefon</option>
                  <option>Faks</option>
                  <option>E-posta</option>
                  <option>WhatsApp</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">Kaynak</label>
                <select
                  value={formData.source_type}
                  onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  required
                >
                  <option>Müşteri</option>
                  <option>Düzenleyici Kurum/Otorite</option>
                  <option>Tüketici/Son Kullanıcı</option>
                  <option>Rakip Laboratuvar</option>
                  <option>Personel</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">2</div>
              Bildirim Sahibi Bilgileri
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">Bildirim Sahibi / Kurum Adı</label>
                <input
                  type="text"
                  value={formData.applicant_name}
                  onChange={(e) => setFormData({ ...formData, applicant_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Firma veya kişi adı"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">Yetkili Kişi</label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="İletişim kurulacak kişi"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="+90 (___) ___ __ __"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">E-posta</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="ornek@firma.com"
                />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-semibold">3</div>
              İçerik
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">İçerik</label>
                <textarea
                  value={formData.content_details}
                  onChange={(e) => setFormData({ ...formData, content_details: e.target.value })}
                  rows={5}
                  className="w-full px-3 py-2 text-[11px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  placeholder="Bildirimin detaylı içeriği..."
                  required
                />
              </div>

            </div>
          </div>

          {editData && (
            <div className="bg-gradient-to-br from-cyan-50 to-sky-50 rounded-xl p-6 border border-cyan-200">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center text-sm font-semibold">4</div>
                İzahat
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Bildirime Sebep Olan Taraf (Personel/Tedarikçi/Taşeron vb.)</label>
                  <div className="relative">
                    <select
                      value={formData.izahat_by}
                      onChange={(e) => setFormData({ ...formData, izahat_by: e.target.value })}
                      className="w-full appearance-none px-4 py-2.5 pr-9 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all bg-white text-[11px]"
                    >
                      <option value="">-- Personel Seçin --</option>
                      {personnelList.map((p) => (
                        <option key={p.id} value={p.full_name}>{p.full_name}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Bildirime Sebep Taraf İzahatı</label>
                  <textarea
                    value={formData.izahat_text}
                    onChange={(e) => setFormData({ ...formData, izahat_text: e.target.value })}
                    rows={5}
                    className="w-full px-3 py-2 text-[11px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all resize-none"
                    placeholder="Geri bildirimle ilgili izahat ve açıklamalar..."
                  />
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl p-6 border border-slate-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-sm font-semibold">5</div>
              Sorumluluk Kararı
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">Değerlendirme Notları</label>
                <textarea
                  value={formData.evaluation}
                  onChange={(e) => setFormData({ ...formData, evaluation: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 text-[11px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                  placeholder={
                    isInvalid
                      ? 'Red gerekçesini yazınız...'
                      : 'Sorumluluk KABUL/RET kararı nedenleri ve Bildirim sahibine geri dönüş...'
                  }
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-900 mb-2 uppercase tracking-wide">Bildirim Türü</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { type: 'İstek', icon: MessageSquare },
                    { type: 'Öneri', icon: Lightbulb },
                    { type: 'İtiraz', icon: Flag },
                    { type: 'Şikayet', icon: AlertTriangle }
                  ].map(({ type, icon: Icon }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, feedback_type: type })}
                      className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                        formData.feedback_type === type
                          ? 'border-slate-600 bg-slate-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white p-5 rounded-lg border-2 border-slate-300">
                <label className="block text-[11px] font-semibold text-gray-900 mb-2 uppercase tracking-wide">Sorumluluk Kararı</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { status: 'Değerlendirmede', label: 'Değerlendirmede', color: 'blue', tooltip: '' },
                    { status: 'Geçerli/Uygun', label: 'KABUL / Geçerli / Uygun', color: 'green', tooltip: 'Bildirim sorumluluğu Kabul edildiğinde; gerekli aksiyonlar başlatılır.' },
                    { status: 'Geçersiz/Uygun Değil', label: 'RET / Geçersiz / Uygun Değil', color: 'red', tooltip: 'Bildirim sorumluluğu Reddedilirse, Bildirim sahibine bilgi verilerek kayıt kapatılır. İlgili tarafın Ret kararına itirazı varsa yeni gerekçeleriyle birlikte yeni bir kayıt açılarak tekrar değerlendirilir.' },
                  ].map(({ status, label, color, tooltip }) => (
                    <div key={status} className="relative group">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, validation_status: status })}
                        className={`w-full p-4 rounded-lg border-2 transition-all ${
                          formData.validation_status === status
                            ? color === 'blue'
                              ? 'border-blue-500 bg-blue-50 text-blue-900'
                              : color === 'green'
                              ? 'border-green-500 bg-green-50 text-green-900'
                              : 'border-red-500 bg-red-50 text-red-900'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <span className="font-medium text-sm">{label}</span>
                      </button>
                      {tooltip && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 pointer-events-none">
                          {tooltip}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-5 rounded-lg border-2 border-slate-300">
                <label className="block text-[11px] font-semibold text-gray-900 mb-2 uppercase tracking-wide">Düzeltici Faaliyet (DF) Gereksinimi</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: true, label: 'Evet', color: 'red' },
                    { value: false, label: 'Hayır', color: 'green' },
                  ].map(({ value, label, color }) => (
                    <div key={label} className="relative">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, requires_capa: value })}
                        className={`w-full p-4 rounded-lg border-2 transition-all ${
                          formData.requires_capa === value
                            ? color === 'red'
                              ? 'border-red-500 bg-red-50 text-red-900'
                              : 'border-green-500 bg-green-50 text-green-900'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <span className="font-medium text-sm">{label}</span>
                      </button>
                      {formData.requires_capa === value && (
                        <p className={`mt-2 text-xs ${color === 'red' ? 'text-red-700' : 'text-green-700'}`}>
                          {value
                            ? 'Bildirim uygunsuzluk ve DF formuna devredilerek kapatılır.'
                            : 'Düzeltme Faaliyeti bu form üzerinde takip edilir.'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {formData.requires_capa && (
                  <div className="mt-4">
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">DF Numarası</label>
                    <input
                      type="text"
                      value={formData.capa_no}
                      onChange={(e) => setFormData({ ...formData, capa_no: e.target.value })}
                      className="w-full px-3 py-2 text-[11px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      placeholder="DF-2024-001"
                    />
                  </div>
                )}
              </div>

              {editData?.id && (
                <div className="pt-6 border-t border-slate-200">
                  <SignaturesSection
                    moduleKey="customer_feedback"
                    recordId={editData.id}
                    onLockChange={(locked) => {}}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-semibold">6</div>
                Planlama ve Aksiyon
              </h3>
              <button
                type="button"
                onClick={() => setActions([...actions, { action_description: '', responsible_person: '', deadline: '', status: 'Devam Ediyor', completed_date: '' }])}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Yeni Aksiyon Ekle
              </button>
            </div>
            <div className="space-y-4">
              {actions.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Henüz aksiyon eklenmemiş. Yeni aksiyon eklemek için yukarıdaki butona tıklayın.
                </div>
              )}
              {actions.map((action, idx) => (
                <div key={idx} className="bg-white rounded-lg border border-emerald-200 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Aksiyon {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setActions(actions.filter((_, i) => i !== idx))}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Gerçekleştirilecek Faaliyet</label>
                    <textarea
                      value={action.action_description}
                      onChange={(e) => {
                        const updated = [...actions];
                        updated[idx] = { ...updated[idx], action_description: e.target.value };
                        setActions(updated);
                      }}
                      rows={3}
                      className="w-full px-3 py-2 text-[11px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
                      placeholder="Yapılacak faaliyet detayı..."
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">Sorumlu Kişi</label>
                      <div className="relative">
                        <select
                          value={action.responsible_person}
                          onChange={(e) => {
                            const updated = [...actions];
                            updated[idx] = { ...updated[idx], responsible_person: e.target.value };
                            setActions(updated);
                          }}
                          className="w-full appearance-none px-3 py-2.5 pr-9 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white text-[11px]"
                        >
                          <option value="">-- Personel Seçin --</option>
                          {personnelList.map((p) => (
                            <option key={p.id} value={p.full_name}>{p.full_name}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">Termin Tarihi</label>
                      <input
                        type="date"
                        value={action.deadline}
                        onChange={(e) => {
                          const updated = [...actions];
                          updated[idx] = { ...updated[idx], deadline: e.target.value };
                          setActions(updated);
                        }}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">Durum</label>
                      <select
                        value={action.status}
                        onChange={(e) => {
                          const updated = [...actions];
                          const newStatus = e.target.value;
                          updated[idx] = {
                            ...updated[idx],
                            status: newStatus,
                            completed_date: newStatus === 'Tamamlandı' && !updated[idx].completed_date
                              ? new Date().toISOString().split('T')[0]
                              : newStatus !== 'Tamamlandı' ? '' : updated[idx].completed_date,
                          };
                          setActions(updated);
                        }}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-[11px]"
                      >
                        <option>Devam Ediyor</option>
                        <option>Tamamlandı</option>
                      </select>
                    </div>
                  </div>
                  {action.status === 'Tamamlandı' && (
                    <div className="max-w-xs">
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">Tamamlanma Tarihi</label>
                      <input
                        type="date"
                        value={action.completed_date}
                        onChange={(e) => {
                          const updated = [...actions];
                          updated[idx] = { ...updated[idx], completed_date: e.target.value };
                          setActions(updated);
                        }}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-[11px]"
                      />
                    </div>
                  )}
                  {action.id && (
                    <div className="pt-4 border-t border-emerald-100">
                      <SignaturesSection
                        moduleKey="feedback_action"
                        recordId={action.id}
                        onLockChange={() => {}}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {editData && (
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-6 border border-teal-200">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-semibold">7</div>
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                Kapatma
              </h3>

              <div className="bg-white/80 border border-teal-200 rounded-lg p-4 mb-5">
                <p className="text-xs text-teal-800 leading-relaxed">
                  Bu bolum, geri bildirimin resmi olarak kapatildigini, alinan onlemlerin etkinliginin dogrulandigini ve laboratuvarin kalite sistemine sagladigi katki icin tesekkur mesajini icerir.
                </p>
              </div>

              <div className="space-y-4">
                <div className="max-w-xs">
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Kapatma Tarihi</label>
                  <input
                    type="date"
                    value={formData.closure_date}
                    onChange={(e) => setFormData({ ...formData, closure_date: e.target.value })}
                    disabled={isLocked}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-[11px] disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Kapatma Notlari</label>
                  <textarea
                    value={formData.closure_notes}
                    onChange={(e) => setFormData({ ...formData, closure_notes: e.target.value })}
                    rows={4}
                    disabled={isLocked}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-[11px] resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Geri bildirimin kapatilma gerekceleri, alinan onlemlerin etkinlik degerlendirmesi ve kalite sistemine katkisi..."
                  />
                </div>

                <div className="pt-3 border-t border-teal-100">
                  <SignaturesSection
                    moduleKey="feedback_closure"
                    recordId={editData.id}
                    onLockChange={() => {}}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center text-sm font-semibold">8</div>
              Risk Analizi
            </h3>
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-lg border-2 border-amber-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Olasılık</label>
                    <select
                      value={formData.risk_probability}
                      onChange={(e) => setFormData({ ...formData, risk_probability: e.target.value })}
                      className="w-full px-3 py-2 text-[11px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    >
                      <option>Çok Düşük</option>
                      <option>Düşük</option>
                      <option>Orta</option>
                      <option>Yüksek</option>
                      <option>Çok Yüksek</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Şiddet</label>
                    <select
                      value={formData.risk_severity}
                      onChange={(e) => setFormData({ ...formData, risk_severity: e.target.value })}
                      className="w-full px-3 py-2 text-[11px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    >
                      <option>Çok Hafif</option>
                      <option>Hafif</option>
                      <option>Orta</option>
                      <option>Ciddi</option>
                      <option>Çok Ciddi</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Hesaplanan Risk Seviyesi:</span>
                  <span className={`px-4 py-2 rounded-lg text-sm font-semibold border ${getRiskLevelColor(riskLevel)}`}>
                    {riskLevel}
                  </span>
                </div>
              </div>
            </div>
          </div>


          {editData && (
            <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-600 text-white flex items-center justify-center text-sm font-semibold">9</div>
                Ekler (Dosyalar)
              </h3>

              {uploadError && (
                <div className="flex items-start gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {uploadError}
                </div>
              )}

              {attachments.length > 0 ? (
                <ul className="space-y-2 mb-4">
                  {attachments.map((path, idx) => (
                    <li key={idx} className="flex items-center gap-3 px-3 py-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      {getFileIcon(path)}
                      <span className="text-sm text-gray-700 flex-1 truncate">{getFileName(path)}</span>
                      <button
                        type="button"
                        onClick={() => handleOpenFile(path, idx)}
                        disabled={signingIndex === idx}
                        className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 font-medium px-2 py-1 rounded hover:bg-slate-100 transition-colors disabled:opacity-50"
                      >
                        {signingIndex === idx ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ExternalLink className="w-3.5 h-3.5" />
                        )}
                        Aç
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 mb-4">Henüz ek dosya yüklenmemiş.</p>
              )}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ALLOWED_EXT.join(',')}
                onChange={handleFileChange}
                className="hidden"
              />

              {attachments.length < MAX_FILES && (
                <button
                  type="button"
                  onClick={() => {
                    setUploadError(null);
                    fileInputRef.current?.click();
                  }}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Yükleniyor...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Dosya Ekle
                    </>
                  )}
                </button>
              )}

              <p className="mt-2 text-xs text-gray-400">
                PDF, JPG, PNG — maks. 10MB/dosya — en fazla {MAX_FILES} dosya
                {attachments.length > 0 && ` (${attachments.length}/${MAX_FILES} yüklendi)`}
              </p>
            </div>
          )}

          </fieldset>

          <div className="flex justify-end gap-2 pt-3 pb-safe border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 md:py-2 text-xs md:text-[11px] border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all font-medium"
            >
              {isLocked ? 'Kapat' : 'İptal'}
            </button>
            {!isLocked && (
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-3 md:py-2 text-xs md:text-[11px] bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all font-medium flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 md:w-3.5 md:h-3.5" />
                {loading ? 'Kaydediliyor...' : editData ? 'Güncelle' : 'Kaydet'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerFeedbackModal;
