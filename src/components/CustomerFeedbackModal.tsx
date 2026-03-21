import { useState, useEffect, useRef, useCallback } from 'react';
import { X, AlertTriangle, Lightbulb, MessageSquare, Flag, Save, ChevronDown, Upload, FileText, Image, Loader2, AlertCircle, ExternalLink, Lock, Plus, Trash2, ShieldCheck, Info, Link2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import SignaturesSection from './SignaturesSection';
import { fetchSignatures, fetchModuleRoles, triggerNotificationForNextStep } from '../utils/signatureService';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;

const TABS = [
  { id: 'kayit', label: 'Kayıt Bilgileri' },
  { id: 'sahip', label: 'Bildirim Sahibi' },
  { id: 'icerik', label: 'İçerik ve İzahat' },
  { id: 'karar', label: 'Sorumlu Karar' },
  { id: 'planlama', label: 'Planlama ve Aksiyon' },
  { id: 'kapatma', label: 'Kapatma' },
];

interface CustomerFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
  onNavigateToNC?: (ncId: string) => void;
}

const CustomerFeedbackModal = ({ isOpen, onClose, onSuccess, editData, onNavigateToNC }: CustomerFeedbackModalProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('kayit');
  const [loading, setLoading] = useState(false);
  const [personnelList, setPersonnelList] = useState<{ id: string; full_name: string }[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [signingIndex, setSigningIndex] = useState<number | null>(null);
  const [lockToast, setLockToast] = useState(false);
  const [actions, setActions] = useState<{ id?: string; action_description: string; responsible_person: string; deadline: string; status: string; completed_date: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasSorumlulukSig, setHasSorumlulukSig] = useState(false);
  const [hasClosureSig, setHasClosureSig] = useState(false);
  const [linkedNcId, setLinkedNcId] = useState<string | null>(null);
  const [linkedNcNumber, setLinkedNcNumber] = useState<string | null>(null);
  const [creatingNc, setCreatingNc] = useState(false);
  const [ncToast, setNcToast] = useState<string | null>(null);
  const [createNcOnSave, setCreateNcOnSave] = useState(false);

  const isLocked = !!(editData?.is_locked);

  const checkSignatureStates = useCallback(async () => {
    if (!editData?.id) {
      setHasSorumlulukSig(false);
      setHasClosureSig(false);
      return;
    }
    const [sigs, roles, closureSigs] = await Promise.all([
      fetchSignatures('customer_feedback', editData.id),
      fetchModuleRoles('customer_feedback'),
      fetchSignatures('feedback_closure', editData.id),
    ]);
    const finalRoleNames = roles.filter(r => r.is_final_approval).map(r => r.role_name);
    setHasSorumlulukSig(sigs.some(s => finalRoleNames.includes(s.signer_role)));
    setHasClosureSig(closureSigs.length > 0);
  }, [editData?.id]);

  useEffect(() => {
    if (isOpen && editData?.id) checkSignatureStates();
  }, [isOpen, editData?.id, checkSignatureStates]);

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
    setActiveTab('kayit');

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

      setLinkedNcId(editData.linked_nc_id || null);
      setLinkedNcNumber(editData.linked_nc_number || null);

      (async () => {
        const { data: freshRow } = await supabase
          .from('feedback_records')
          .select('attachments, linked_nc_id, linked_nc_number')
          .eq('id', editData.id)
          .maybeSingle();
        setAttachments(freshRow?.attachments || []);
        if (freshRow?.linked_nc_id) setLinkedNcId(freshRow.linked_nc_id);
        if (freshRow?.linked_nc_number) setLinkedNcNumber(freshRow.linked_nc_number);

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
      setFormData({
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
      setAttachments([]);
      setActions([]);
      setLinkedNcId(null);
      setLinkedNcNumber(null);
      setCreateNcOnSave(false);
    }
    setUploadError(null);
  }, [editData, isOpen]);

  const handleCreateNc = async (fbId: string, appNo: string, contentDetails: string) => {
    if (linkedNcId) return;
    setCreatingNc(true);
    try {
      const { data: ncData, error: ncError } = await supabase
        .from('nonconformities')
        .insert([{
          description: `Geri Bildirim kaydından otomatik oluşturuldu. GB No: ${appNo} | İçerik: ${contentDetails}`,
          source: 'customer_feedback',
          detection_date: new Date().toISOString().split('T')[0],
          severity: 'minor',
          recurrence_risk: 'low',
          calibration_impact: 'none',
          status: 'open',
          linked_gb_id: fbId,
          linked_gb_number: appNo,
        }])
        .select('id, nc_number')
        .maybeSingle();
      if (ncError) throw ncError;
      if (ncData) {
        await supabase.from('feedback_records').update({
          linked_nc_id: ncData.id,
          linked_nc_number: ncData.nc_number,
        }).eq('id', fbId);
        setLinkedNcId(ncData.id);
        setLinkedNcNumber(ncData.nc_number);
        setNcToast(ncData.nc_number);
        setTimeout(() => setNcToast(null), 4500);
      }
    } catch (err: any) {
      alert('Uygunsuzluk kaydı oluşturulamadı: ' + (err.message || ''));
    } finally {
      setCreatingNc(false);
    }
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

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      'Açık': 'bg-amber-100 text-amber-800 border border-amber-300',
      'Kapalı': 'bg-green-100 text-green-800 border border-green-300',
      'İptal': 'bg-gray-100 text-gray-600 border border-gray-300',
    };
    return map[status] || 'bg-gray-100 text-gray-600 border border-gray-300';
  };

  const getFileIcon = (path: string) => {
    if (path.toLocaleLowerCase('tr-TR').endsWith('.pdf')) return <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />;
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
      const { error: dbError } = await supabase
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
      const { action_plan: _ap, responsible_person: _rp, deadline: _dl, application_no: _an, ...restFormData } = formData;
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

      let recordId = editData?.id;

      if (editData) {
        const { error } = await supabase
          .from('feedback_records')
          .update(dataToSave)
          .eq('id', editData.id)
          .select();
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('feedback_records')
          .insert([{ ...dataToSave, profile_id: user?.id }])
          .select();
        if (error) throw error;
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

      if (createNcOnSave && recordId && !linkedNcId) {
        const { data: freshFb } = await supabase
          .from('feedback_records')
          .select('application_no')
          .eq('id', recordId)
          .maybeSingle();
        await handleCreateNc(
          recordId,
          freshFb?.application_no || formData.application_no || '',
          formData.content_details || '',
        );
      }

      const izahatByChanged = formData.izahat_by && formData.izahat_by !== (editData?.izahat_by || '');
      if (izahatByChanged && recordId) {
        await supabase
          .from('feedback_records')
          .update({ last_notified_step: null })
          .eq('id', recordId);
        triggerNotificationForNextStep({
          recordId,
          nextStep: 'feedback_izahat',
          targetPersonName: formData.izahat_by,
        });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      let errorMessage = 'Kaydetme sırasında bir hata oluştu.';
      if (error?.code === '42501') {
        errorMessage = 'İzin hatası: Bu işlem için yetkiniz yok.';
      } else if (error?.code === '23505') {
        errorMessage = 'Bu kayıt zaten mevcut.';
      } else if (error?.code === '22P02') {
        errorMessage = 'Tarih formatı hatası. Lütfen tarih alanlarını kontrol edin.';
      } else if (error?.message) {
        errorMessage = `Hata: ${error.message}`;
      }
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const riskLevel = calculateRiskLevel(formData.risk_probability, formData.risk_severity);
  const isInvalid = formData.validation_status === 'Geçersiz/Uygun Değil';

  const inputCls = 'w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white disabled:bg-slate-50 disabled:text-slate-400';
  const labelCls = 'block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-0 md:p-6">
      <div className="bg-white md:rounded-xl shadow-2xl w-full h-full md:h-auto md:max-h-[92vh] max-w-4xl flex flex-col overflow-hidden">

        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-[#1e293b] px-5 py-4 md:rounded-t-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-0.5">Geri Bildirim</p>
            <h2 className="text-xl font-bold text-white tracking-wide">
              {editData?.application_no || 'Yeni Kayıt'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {editData && (
              <span className={`text-[11px] font-semibold px-3 py-1 rounded-full ${getStatusBadge(formData.status)}`}>
                {formData.status}
              </span>
            )}
            {isLocked && (
              <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-900/60 text-red-300 border border-red-700">
                <Lock className="w-3 h-3" />
                Kilitli
              </span>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Bar */}
        <div className="flex-shrink-0 bg-slate-50 border-b border-slate-200 px-5 py-2.5 grid grid-cols-4 gap-4">
          {[
            { label: 'Tarih', value: formData.form_date || '-' },
            { label: 'İletişim Kanalı', value: formData.communication_channel || '-' },
            { label: 'Kaynak', value: formData.source_type || '-' },
            { label: 'Bildirim Türü', value: formData.feedback_type || '-' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
              <p className="text-[11px] font-semibold text-slate-700 mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-white px-4 overflow-x-auto">
          <div className="flex gap-0 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-[11px] font-semibold whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto">
            <fieldset disabled={isLocked} className="p-5 space-y-5">

              {/* Tab 1: Kayıt Bilgileri */}
              {activeTab === 'kayit' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Bildirim No</label>
                      <input
                        type="text"
                        value={editData ? (formData.application_no || '-') : 'Otomatik atanacak'}
                        readOnly
                        className={`${inputCls} bg-slate-50 text-slate-400 cursor-default`}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Tarih</label>
                      <input
                        type="date"
                        value={formData.form_date}
                        onChange={(e) => setFormData({ ...formData, form_date: e.target.value })}
                        className={inputCls}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Geri Bildirimi Alan</label>
                      <div className="relative">
                        <select
                          value={formData.received_by}
                          onChange={(e) => setFormData({ ...formData, received_by: e.target.value })}
                          className={`${inputCls} appearance-none pr-8`}
                        >
                          <option value="">-- Personel Seçin --</option>
                          {personnelList.map((p) => (
                            <option key={p.id} value={p.full_name}>{p.full_name}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>İletişim Kanalı</label>
                      <div className="relative">
                        <select
                          value={formData.communication_channel}
                          onChange={(e) => setFormData({ ...formData, communication_channel: e.target.value })}
                          className={`${inputCls} appearance-none pr-8`}
                        >
                          <option>Şahsen</option>
                          <option>Telefon</option>
                          <option>Faks</option>
                          <option>E-posta</option>
                          <option>WhatsApp</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Kaynak</label>
                      <div className="relative">
                        <select
                          value={formData.source_type}
                          onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
                          className={`${inputCls} appearance-none pr-8`}
                          required
                        >
                          <option>Müşteri</option>
                          <option>Düzenleyici Kurum/Otorite</option>
                          <option>Tüketici/Son Kullanıcı</option>
                          <option>Rakip Laboratuvar</option>
                          <option>Personel</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Bildirim Sahibi */}
              {activeTab === 'sahip' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Bildirim Sahibi / Kurum Adı</label>
                    <input
                      type="text"
                      value={formData.applicant_name}
                      onChange={(e) => setFormData({ ...formData, applicant_name: e.target.value })}
                      className={inputCls}
                      placeholder="Firma veya kişi adı"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Yetkili Kişi</label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className={inputCls}
                      placeholder="İletişim kurulacak kişi"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Telefon</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={inputCls}
                      placeholder="+90 (___) ___ __ __"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>E-posta</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={inputCls}
                      placeholder="ornek@firma.com"
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: İçerik ve İzahat */}
              {activeTab === 'icerik' && (
                <div className="space-y-5">
                  <div>
                    <label className={labelCls}>İçerik</label>
                    <textarea
                      value={formData.content_details}
                      onChange={(e) => setFormData({ ...formData, content_details: e.target.value })}
                      rows={5}
                      className={`${inputCls} resize-none`}
                      placeholder="Bildirimin detaylı içeriği..."
                      required
                    />
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">İzahat</p>
                    <div className="space-y-4">
                      <div>
                        <label className={labelCls}>Bildirimin Muhatabı (Personel/Tedarikçi/Taşeron vb.)</label>
                        <div className="relative">
                          <select
                            value={formData.izahat_by}
                            onChange={(e) => setFormData({ ...formData, izahat_by: e.target.value })}
                            className={`${inputCls} appearance-none pr-8`}
                          >
                            <option value="">-- Personel Seçin --</option>
                            {personnelList.map((p) => (
                              <option key={p.id} value={p.full_name}>{p.full_name}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Bildirim Muhatabı İzahatı</label>
                        <textarea
                          value={formData.izahat_text}
                          onChange={(e) => setFormData({ ...formData, izahat_text: e.target.value })}
                          rows={5}
                          className={`${inputCls} resize-none`}
                          placeholder="Geri bildirimle ilgili izahat ve açıklamalar..."
                        />
                      </div>
                      {editData?.id && (
                        <div className="pt-4 border-t border-slate-100">
                          <SignaturesSection
                            moduleKey="feedback_izahat"
                            recordId={editData.id}
                            onLockChange={() => {}}
                            title="Izahat Sahibi Imzasi"
                            signOnly
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Sorumlu Karar */}
              {activeTab === 'karar' && (
                <div className="space-y-5">
                  <div>
                    <label className={labelCls}>Değerlendirme Notları</label>
                    <textarea
                      value={formData.evaluation}
                      onChange={(e) => setFormData({ ...formData, evaluation: e.target.value })}
                      rows={4}
                      className={`${inputCls} resize-none`}
                      placeholder={isInvalid ? 'Red gerekçesini yazınız...' : 'Sorumluluk KABUL/RET kararı nedenleri...'}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Bildirim Türü</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { type: 'İstek', icon: MessageSquare },
                        { type: 'Öneri', icon: Lightbulb },
                        { type: 'İtiraz', icon: Flag },
                        { type: 'Şikayet', icon: AlertTriangle },
                      ].map(({ type, icon: Icon }) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({ ...formData, feedback_type: type })}
                          className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 text-[11px] font-semibold ${
                            formData.feedback_type === type
                              ? 'border-slate-600 bg-slate-50 text-slate-800 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-500'
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Sonuç / Geçerlilik Kararı</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { status: 'Değerlendirmede', label: 'Değerlendirmede', color: 'blue', tooltip: '' },
                        { status: 'Geçerli/Uygun', label: 'KABUL / Geçerli / Uygun', color: 'green', tooltip: 'Bildirim sorumluluğu Kabul edildiğinde; gerekli aksiyonlar başlatılır.' },
                        { status: 'Geçersiz/Uygun Değil', label: 'RET / Geçersiz / Uygun Değil', color: 'red', tooltip: 'Bildirim sorumluluğu Reddedilirse, Bildirim sahibine bilgi verilerek kayıt kapatılır.' },
                      ].map(({ status, label, color, tooltip }) => (
                        <div key={status} className="relative group">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, validation_status: status })}
                            className={`w-full p-3 rounded-lg border-2 transition-all text-[11px] font-semibold ${
                              formData.validation_status === status
                                ? color === 'blue' ? 'border-blue-500 bg-blue-50 text-blue-900'
                                : color === 'green' ? 'border-green-500 bg-green-50 text-green-900'
                                : 'border-red-500 bg-red-50 text-red-900'
                                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                            }`}
                          >
                            {label}
                          </button>
                          {tooltip && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 pointer-events-none">
                              {tooltip}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Uygunsuzluk Kaydı Açılacak mı?</label>
                    {linkedNcId && linkedNcNumber ? (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-500 mb-0.5">Bağlı Uygunsuzluk Kaydı</p>
                          <button
                            type="button"
                            onClick={() => onNavigateToNC && onNavigateToNC(linkedNcId)}
                            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-700 hover:text-blue-900 hover:underline transition-colors"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            {linkedNcNumber}
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              if (editData?.id) {
                                handleCreateNc(editData.id, formData.application_no || '', formData.content_details || '');
                              } else {
                                setCreateNcOnSave(true);
                              }
                            }}
                            disabled={creatingNc}
                            className={`w-full p-3 rounded-lg border-2 transition-all text-[11px] font-semibold disabled:opacity-60 ${
                              createNcOnSave
                                ? 'border-red-500 bg-red-50 text-red-900'
                                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                            }`}
                          >
                            {creatingNc ? (
                              <span className="flex items-center justify-center gap-1.5">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Oluşturuluyor...
                              </span>
                            ) : 'Evet'}
                          </button>
                          {createNcOnSave && !editData && (
                            <p className="mt-1.5 text-[10px] text-red-600">Kayıt kaydedilirken NC otomatik oluşturulacak.</p>
                          )}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => setCreateNcOnSave(false)}
                            className={`w-full p-3 rounded-lg border-2 transition-all text-[11px] font-semibold ${
                              !createNcOnSave
                                ? 'border-green-500 bg-green-50 text-green-900'
                                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                            }`}
                          >
                            Hayır
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {editData?.id && (
                    <div className="pt-4 border-t border-slate-100">
                      <SignaturesSection
                        moduleKey="customer_feedback"
                        recordId={editData.id}
                        onLockChange={() => {}}
                        onSignatureChange={checkSignatureStates}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Tab 5: Planlama ve Aksiyon */}
              {activeTab === 'planlama' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Aksiyonlar
                      <span className="ml-2 text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">{actions.length}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setActions([...actions, { action_description: '', responsible_person: '', deadline: '', status: 'Devam Ediyor', completed_date: '' }])}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[11px] font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Yeni Aksiyon Ekle
                    </button>
                  </div>

                  {actions.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                      Henüz aksiyon eklenmemiş.
                    </div>
                  )}

                  {actions.map((action, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aksiyon {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => setActions(actions.filter((_, i) => i !== idx))}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div>
                        <label className={labelCls}>Gerçekleştirilecek Faaliyet</label>
                        <textarea
                          value={action.action_description}
                          onChange={(e) => {
                            const updated = [...actions];
                            updated[idx] = { ...updated[idx], action_description: e.target.value };
                            setActions(updated);
                          }}
                          rows={3}
                          className={`${inputCls} resize-none`}
                          placeholder="Yapılacak faaliyet detayı..."
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className={labelCls}>Sorumlu Kişi</label>
                          <div className="relative">
                            <select
                              value={action.responsible_person}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx] = { ...updated[idx], responsible_person: e.target.value };
                                setActions(updated);
                              }}
                              className={`${inputCls} appearance-none pr-8`}
                            >
                              <option value="">-- Personel Seçin --</option>
                              {personnelList.map((p) => (
                                <option key={p.id} value={p.full_name}>{p.full_name}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}>Termin Tarihi</label>
                          <input
                            type="date"
                            value={action.deadline}
                            onChange={(e) => {
                              const updated = [...actions];
                              updated[idx] = { ...updated[idx], deadline: e.target.value };
                              setActions(updated);
                            }}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Durum</label>
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
                            className={inputCls}
                          >
                            <option>Devam Ediyor</option>
                            <option>Tamamlandı</option>
                          </select>
                        </div>
                      </div>
                      {action.status === 'Tamamlandı' && (
                        <div className="max-w-xs">
                          <label className={labelCls}>Tamamlanma Tarihi</label>
                          <input
                            type="date"
                            value={action.completed_date}
                            onChange={(e) => {
                              const updated = [...actions];
                              updated[idx] = { ...updated[idx], completed_date: e.target.value };
                              setActions(updated);
                            }}
                            className={inputCls}
                          />
                        </div>
                      )}
                      {action.id && (
                        <div className="pt-3 border-t border-slate-200">
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
              )}

              {/* Tab 6: Kapatma */}
              {activeTab === 'kapatma' && (
                <div className="space-y-5">
                  {!hasSorumlulukSig && editData && (
                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-semibold text-amber-800">Kapatma bölümü henüz aktif değil</p>
                        <p className="text-[10px] text-amber-700 mt-0.5">Öncelikle "Sorumlu Karar" sekmesindeki imza tamamlanmalıdır.</p>
                      </div>
                    </div>
                  )}

                  <fieldset disabled={!hasSorumlulukSig || isLocked} className="space-y-4">
                    <div className={`${!hasSorumlulukSig ? 'opacity-40 pointer-events-none' : ''} space-y-4`}>
                      <div className="max-w-xs">
                        <label className={labelCls}>Kapanma Tarihi</label>
                        <input
                          type="date"
                          value={formData.closure_date}
                          onChange={(e) => setFormData({ ...formData, closure_date: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Kapanma Notları</label>
                        <textarea
                          value={formData.closure_notes}
                          onChange={(e) => setFormData({ ...formData, closure_notes: e.target.value })}
                          rows={4}
                          className={`${inputCls} resize-none`}
                          placeholder="Kapatma gerekçeleri, alınan önlemlerin etkinlik değerlendirmesi..."
                        />
                      </div>

                      <div className="pt-3 border-t border-slate-100">
                        <label className={labelCls}>Risk Analizi</label>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Olasılık</label>
                            <select
                              value={formData.risk_probability}
                              onChange={(e) => setFormData({ ...formData, risk_probability: e.target.value })}
                              className={inputCls}
                            >
                              <option>Çok Düşük</option>
                              <option>Düşük</option>
                              <option>Orta</option>
                              <option>Yüksek</option>
                              <option>Çok Yüksek</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Şiddet</label>
                            <select
                              value={formData.risk_severity}
                              onChange={(e) => setFormData({ ...formData, risk_severity: e.target.value })}
                              className={inputCls}
                            >
                              <option>Çok Hafif</option>
                              <option>Hafif</option>
                              <option>Orta</option>
                              <option>Ciddi</option>
                              <option>Çok Ciddi</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-600 font-medium">Risk Seviyesi:</span>
                          <span className={`px-3 py-1 rounded-lg text-[11px] font-semibold border ${getRiskLevelColor(riskLevel)}`}>
                            {riskLevel}
                          </span>
                        </div>
                      </div>

                      {editData && (
                        <div className="pt-3 border-t border-slate-100">
                          <label className={`${labelCls} mb-3`}>Ekler (Dosyalar)</label>

                          {uploadError && (
                            <div className="flex items-start gap-2 mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700">
                              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              {uploadError}
                            </div>
                          )}

                          {attachments.length > 0 ? (
                            <ul className="space-y-2 mb-3">
                              {attachments.map((path, idx) => (
                                <li key={idx} className="flex items-center gap-3 px-3 py-2 bg-white border border-slate-200 rounded-lg">
                                  {getFileIcon(path)}
                                  <span className="text-[11px] text-slate-700 flex-1 truncate">{getFileName(path)}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenFile(path, idx)}
                                    disabled={signingIndex === idx}
                                    className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-700 font-medium px-2 py-1 rounded hover:bg-slate-100 transition-colors disabled:opacity-50"
                                  >
                                    {signingIndex === idx ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
                                    Aç
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[11px] text-slate-400 mb-3">Henüz ek dosya yüklenmemiş.</p>
                          )}

                          <input ref={fileInputRef} type="file" multiple accept={ALLOWED_EXT.join(',')} onChange={handleFileChange} className="hidden" />

                          {attachments.length < MAX_FILES && (
                            <button
                              type="button"
                              onClick={() => { setUploadError(null); fileInputRef.current?.click(); }}
                              disabled={uploading}
                              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-600 text-white text-[11px] font-semibold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-60"
                            >
                              {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Yükleniyor...</> : <><Upload className="w-3.5 h-3.5" />Dosya Ekle</>}
                            </button>
                          )}
                          <p className="mt-1.5 text-[10px] text-slate-400">
                            PDF, JPG, PNG — maks. 10MB/dosya — en fazla {MAX_FILES} dosya
                            {attachments.length > 0 && ` (${attachments.length}/${MAX_FILES})`}
                          </p>
                        </div>
                      )}

                      {editData?.id && (
                        <div className="pt-4 border-t border-slate-100">
                          <SignaturesSection
                            moduleKey="feedback_closure"
                            recordId={editData.id}
                            onLockChange={() => {}}
                            onSignatureChange={checkSignatureStates}
                          />
                        </div>
                      )}
                    </div>
                  </fieldset>

                  {!editData && (
                    <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <ShieldCheck className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-500">Kapatma alanları kayıt oluşturulduktan sonra kullanılabilir.</p>
                    </div>
                  )}
                </div>
              )}

            </fieldset>
          </div>

          {/* Fixed Footer */}
          <div className="flex-shrink-0 border-t border-slate-200 bg-white px-5 py-3 flex items-center justify-between md:rounded-b-xl">
            <div className="flex items-center gap-2">
              {activeTab !== TABS[0].id && (
                <button
                  type="button"
                  onClick={() => {
                    const idx = TABS.findIndex(t => t.id === activeTab);
                    if (idx > 0) setActiveTab(TABS[idx - 1].id);
                  }}
                  className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  ← Geri
                </button>
              )}
              {activeTab !== TABS[TABS.length - 1].id && (
                <button
                  type="button"
                  onClick={() => {
                    const idx = TABS.findIndex(t => t.id === activeTab);
                    if (idx < TABS.length - 1) setActiveTab(TABS[idx + 1].id);
                  }}
                  className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  İleri →
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-[11px] border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-all font-semibold"
              >
                {isLocked ? 'Kapat' : 'İptal'}
              </button>
              {!isLocked && (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-[11px] bg-[#1e293b] text-white rounded-lg hover:bg-slate-700 transition-all font-semibold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-3.5 h-3.5" />
                  {loading ? 'Kaydediliyor...' : editData ? 'Güncelle' : 'Kaydet'}
                </button>
              )}
            </div>
          </div>
        </form>

        {lockToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 bg-red-600 text-white text-[11px] font-semibold rounded-lg shadow-lg">
            <Lock className="w-4 h-4 flex-shrink-0" />
            Kilitli kayıt güncellenemez.
          </div>
        )}
        {ncToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 bg-green-700 text-white text-[11px] font-semibold rounded-lg shadow-lg">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Uygunsuzluk kaydı oluşturuldu: {ncToast}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerFeedbackModal;
