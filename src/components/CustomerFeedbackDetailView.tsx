import { X, Printer, Calendar, AlertTriangle, Lightbulb, MessageSquare, Flag, FileText, Image, ExternalLink, Loader2, Download, Lock, ShieldCheck, Ban, KeyRound, Eye, EyeOff, AlertCircle, Info, Unlock, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useState, useEffect, useCallback } from 'react';
import { generateFeedbackPDF } from '../utils/feedbackPdfExport';
import type { FeedbackAction, FeedbackSignatureGroup } from '../utils/feedbackPdfExport';
import { useModuleDocument } from '../hooks/useModuleDocument';
import DocumentSelectModal from './DocumentSelectModal';
import SignaturesSection from './SignaturesSection';
import { fetchSignatures, fetchModuleRoles, fetchRecordLockState, closeFeedbackRecord, fetchSignatureHistory, type RecordSignature } from '../utils/signatureService';

interface DetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onDataChange?: () => void;
}

const CustomerFeedbackDetailView = ({ isOpen, onClose, data, onDataChange }: DetailViewProps) => {
  const { role } = useAuth();
  const [signingIndex, setSigningIndex] = useState<number | null>(null);
  const [orgName, setOrgName] = useState<string | undefined>(undefined);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [recordLocked, setRecordLocked] = useState(false);
  const [recordClosed, setRecordClosed] = useState(false);
  const [actions, setActions] = useState<FeedbackAction[]>([]);
  const { showSelector, closeSelector, onDocumentSelected, requestPdf } = useModuleDocument('customer_feedback');

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closePassword, setClosePassword] = useState('');
  const [showClosePassword, setShowClosePassword] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [hasSorumlulukSig, setHasSorumlulukSig] = useState(false);
  const [hasClosureSig, setHasClosureSig] = useState(false);
  const [signatureHistory, setSignatureHistory] = useState<RecordSignature[]>([]);

  const handleLockChange = useCallback((locked: boolean) => {
    setRecordLocked(locked);
  }, []);

  const checkSignatureStates = useCallback(async () => {
    if (!data?.id) return;
    const [sigs, roles, closureSigs, history] = await Promise.all([
      fetchSignatures('customer_feedback', data.id),
      fetchModuleRoles('customer_feedback'),
      fetchSignatures('feedback_closure', data.id),
      fetchSignatureHistory(data.id),
    ]);
    const finalRoleNames = roles.filter(r => r.is_final_approval).map(r => r.role_name);
    setHasSorumlulukSig(sigs.some(s => finalRoleNames.includes(s.signer_role)));
    setHasClosureSig(closureSigs.length > 0);
    setSignatureHistory(history);
  }, [data?.id]);

  useEffect(() => {
    if (data) {
      setRecordClosed(data.status === 'Kapalı' && data.is_locked === true);
      checkSignatureStates();
    }
  }, [data, checkSignatureStates]);

  const handleCloseFeedback = async () => {
    if (!closePassword || !data?.id) return;
    setClosing(true);
    setCloseError(null);
    try {
      await closeFeedbackRecord({ password: closePassword, recordId: data.id });
      setShowCloseModal(false);
      setClosePassword('');
      setShowClosePassword(false);
      setRecordClosed(true);
      setRecordLocked(true);
      if (onDataChange) onDataChange();
    } catch (err: any) {
      setCloseError(err?.message || 'Bildirimi kapatma islemi basarisiz.');
    } finally {
      setClosing(false);
    }
  };

  const handleCloseModalDismiss = () => {
    if (closing) return;
    setShowCloseModal(false);
    setClosePassword('');
    setShowClosePassword(false);
    setCloseError(null);
  };

  useEffect(() => {
    const fetchOrg = async () => {
      const { data: org } = await supabase
        .from('organizations')
        .select('name, logo_url')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (org?.name) setOrgName(org.name);
      if (org?.logo_url) setLogoUrl(org.logo_url);
    };
    fetchOrg();
  }, []);

  useEffect(() => {
    if (!data?.id) return;
    const fetchActions = async () => {
      const { data: rows } = await supabase
        .from('feedback_actions')
        .select('id, action_description, responsible_person, deadline, status, completed_date')
        .eq('feedback_id', data.id)
        .order('sort_order', { ascending: true });
      setActions((rows || []) as FeedbackAction[]);
    };
    fetchActions();
  }, [data?.id]);

  const handlePdfDownload = () => {
    requestPdf(async (meta) => {
      const [feedbackSigs, izahatSigs, closureSigs, lockInfo] = await Promise.all([
        data.id ? fetchSignatures('customer_feedback', data.id) : Promise.resolve([]),
        data.id ? fetchSignatures('feedback_izahat', data.id) : Promise.resolve([]),
        data.id ? fetchSignatures('feedback_closure', data.id) : Promise.resolve([]),
        data.id ? fetchRecordLockState(data.id) : Promise.resolve({ is_locked: false, locked_at: null, locked_by: null, unlocked_at: null, unlocked_by: null, unlock_reason: null }),
      ]);

      const [feedbackRoles, izahatRoles, closureRoles, actionRoles] = await Promise.all([
        fetchModuleRoles('customer_feedback'),
        fetchModuleRoles('feedback_izahat'),
        fetchModuleRoles('feedback_closure'),
        fetchModuleRoles('feedback_action'),
      ]);

      const actionSigPromises = actions.map((a) =>
        fetchSignatures(`feedback_action_${a.id}`, a.id).then((sigs) => ({
          moduleKey: `feedback_action_${a.id}`,
          label: `Aksiyon: ${a.action_description?.substring(0, 40) || a.id}`,
          signatures: sigs.map((s) => ({ signer_role: s.signer_role, signer_name: s.signer_name, signed_at: s.signed_at, signature_image_url: s.signature_image_url })),
          roles: actionRoles.map((r) => ({ role_name: r.role_name, role_order: r.role_order })),
        } as FeedbackSignatureGroup))
      );
      const actionSigGroups = await Promise.all(actionSigPromises);

      const signatureGroups: FeedbackSignatureGroup[] = [
        {
          moduleKey: 'feedback_izahat',
          label: 'Izahat Sahibi Imzasi',
          signatures: izahatSigs.map((s) => ({ signer_role: s.signer_role, signer_name: s.signer_name, signed_at: s.signed_at, signature_image_url: s.signature_image_url })),
          roles: izahatRoles.map((r) => ({ role_name: r.role_name, role_order: r.role_order })),
        },
        {
          moduleKey: 'customer_feedback',
          label: 'Karar Verici Imzasi',
          signatures: feedbackSigs.map((s) => ({ signer_role: s.signer_role, signer_name: s.signer_name, signed_at: s.signed_at, signature_image_url: s.signature_image_url })),
          roles: feedbackRoles.map((r) => ({ role_name: r.role_name, role_order: r.role_order })),
        },
        ...actionSigGroups,
        {
          moduleKey: 'feedback_closure',
          label: 'Kapatan Yetkili Imzasi',
          signatures: closureSigs.map((s) => ({ signer_role: s.signer_role, signer_name: s.signer_name, signed_at: s.signed_at, signature_image_url: s.signature_image_url })),
          roles: closureRoles.map((r) => ({ role_name: r.role_name, role_order: r.role_order })),
        },
      ];

      await generateFeedbackPDF({
        data,
        organizationName: orgName,
        docMeta: meta,
        logoUrl,
        isLocked: lockInfo.is_locked,
        actions,
        signatureGroups,
      });
    });
  };

  if (!isOpen || !data) return null;

  const attachments: string[] = data.attachments || [];

  const formatAuditDate = (d: string | null | undefined) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getFeedbackTypeIcon = (type: string) => {
    switch (type) {
      case 'Şikayet': return <AlertTriangle className="w-4 h-4" />;
      case 'Öneri': return <Lightbulb className="w-4 h-4" />;
      case 'İtiraz': return <Flag className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getFeedbackTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      'Şikayet': 'bg-red-100 text-red-800 border-red-200',
      'Öneri': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'İtiraz': 'bg-orange-100 text-orange-800 border-orange-200',
      'İstek': 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return styles[type] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getSourceBadge = (source: string) => {
    const styles: Record<string, string> = {
      'Müşteri': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'Düzenleyici Kurum/Otorite': 'bg-purple-100 text-purple-800 border-purple-200',
      'Tüketici/Son Kullanıcı': 'bg-teal-100 text-teal-800 border-teal-200',
      'Rakip Laboratuvar': 'bg-pink-100 text-pink-800 border-pink-200',
      'Personel': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    };
    return styles[source] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getValidationBadge = (validation: string) => {
    if (validation === 'Değerlendirmede') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (validation === 'Geçerli/Uygun') return 'bg-green-100 text-green-800 border-green-200';
    if (validation === 'Geçersiz/Uygun Değil') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Açık': 'bg-orange-100 text-orange-800 border-orange-200',
      'Devam Ediyor': 'bg-blue-100 text-blue-800 border-blue-200',
      'Tamamlandı': 'bg-green-100 text-green-800 border-green-200',
      'Kapatıldı': 'bg-gray-100 text-gray-800 border-gray-200',
      'IMZALI': 'bg-green-100 text-green-800 border-green-200',
      'Kapalı': 'bg-slate-200 text-slate-800 border-slate-300',
    };
    return styles[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const handlePrint = () => window.print();

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

  return (
    <>
    <DocumentSelectModal
      isOpen={showSelector}
      moduleKey="customer_feedback"
      onSelect={onDocumentSelected}
      onClose={closeSelector}
    />
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full my-8">
        <div className="sticky top-0 bg-gradient-to-r from-slate-700 to-slate-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              {getFeedbackTypeIcon(data.feedback_type)}
            </div>
            <div>
              <h2 className="text-xl font-bold">Kayıt Detayları: {data.application_no || 'Yeni Kayıt'}</h2>
              <p className="text-sm text-slate-200 mt-0.5">Müşteri Geri Bildirimi</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePdfDownload}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors print:hidden"
              title="PDF İndir"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors print:hidden"
              title="Yazdır"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors print:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {recordClosed && (
            <div className="flex items-center gap-3 p-4 bg-slate-100 border border-slate-300 rounded-lg">
              <Ban className="w-5 h-5 text-slate-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-800">Bu bildirim kapatilmis ve kilitlenmistir.</p>
                <p className="text-xs text-slate-600 mt-0.5">Kapatilan bildirimler uzerinde degisiklik yapilamaz.</p>
              </div>
            </div>
          )}
          {recordLocked && !recordClosed && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <Lock className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">IMZALI - Bu kayit kilitlenmistir</p>
                <p className="text-xs text-green-700 mt-0.5">Kayit imzalanmis ve duzenlemeye karsi koruma altindadir.</p>
              </div>
            </div>
          )}
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg p-6 border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Termin Tarihi</div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  {data.deadline ? new Date(data.deadline).toLocaleDateString('tr-TR', {
                    day: '2-digit', month: 'long', year: 'numeric'
                  }) : '-'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Durum</div>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold border ${getStatusBadge(data.status)}`}>
                  {data.status || 'Açık'}
                </span>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Kaynak</div>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold border ${getSourceBadge(data.source_type)}`}>
                  {data.source_type || '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-1 bg-slate-600 rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-900">Bildirim Sahibi Bilgileri</h3>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Form Tarihi</dt>
                    <dd className="text-sm text-gray-900">
                      {data.form_date ? new Date(data.form_date).toLocaleDateString('tr-TR', {
                        day: '2-digit', month: 'long', year: 'numeric'
                      }) : '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Bildirim No</dt>
                    <dd className="text-sm font-semibold text-slate-700">{data.application_no || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Müşteri / Kurum Adı</dt>
                    <dd className="text-sm text-gray-900 font-medium">{data.applicant_name || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Geri Bildirimi Alan</dt>
                    <dd className="text-sm text-gray-900 font-medium">{data.received_by || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Yetkili Kişi</dt>
                    <dd className="text-sm text-gray-900">{data.contact_person || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Telefon</dt>
                    <dd className="text-sm text-gray-900">{data.contact_phone || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">E-posta</dt>
                    <dd className="text-sm text-gray-900">{data.contact_email || '-'}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Adres</dt>
                    <dd className="text-sm text-gray-900">{data.contact_address || '-'}</dd>
                  </div>
                </dl>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-1 bg-slate-600 rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-900">Geri Bildirim İçeriği</h3>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <dl className="space-y-4">
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bildirim Türü</dt>
                    <dd>
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border ${getFeedbackTypeBadge(data.feedback_type)}`}>
                        {getFeedbackTypeIcon(data.feedback_type)}
                        {data.feedback_type || 'İstek'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Konu (Detaylı Açıklama)</dt>
                    <dd className="text-sm text-gray-900 leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-200 whitespace-pre-wrap">
                      {data.content_details || 'Açıklama girilmemiş.'}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-1 bg-slate-600 rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-900">Değerlendirme & Risk Analizi</h3>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <dl className="space-y-4">
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Geçerlilik Durumu</dt>
                    <dd>
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold border ${getValidationBadge(data.validation_status)}`}>
                        {data.validation_status || 'Değerlendirmede'}
                      </span>
                    </dd>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Risk - Olasılık</dt>
                      <dd className="text-sm text-gray-900">
                        <div className="inline-flex items-center px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                          <span className="font-semibold text-blue-900">{data.risk_probability || '-'}</span>
                        </div>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Risk - Şiddet</dt>
                      <dd className="text-sm text-gray-900">
                        <div className="inline-flex items-center px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                          <span className="font-semibold text-orange-900">{data.risk_severity || '-'}</span>
                        </div>
                      </dd>
                    </div>
                  </div>
                  {data.risk_probability && data.risk_severity && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Risk Skoru</dt>
                      <dd>
                        <div className="inline-flex items-center px-4 py-2 bg-red-50 border-2 border-red-300 rounded-lg">
                          <span className="text-lg font-bold text-red-900">
                            {data.risk_probability * data.risk_severity}
                          </span>
                          <span className="text-xs text-red-700 ml-2">
                            ({data.risk_probability} x {data.risk_severity})
                          </span>
                        </div>
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Düzeltici Faaliyet (DF) Gereksinimi</dt>
                    <dd className="text-sm text-gray-900">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg font-semibold border ${
                        data.corrective_action_required === 'Evet'
                          ? 'bg-red-100 text-red-800 border-red-200'
                          : data.corrective_action_required === 'Hayır'
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : 'bg-gray-100 text-gray-800 border-gray-200'
                      }`}>
                        {data.corrective_action_required || '-'}
                      </span>
                    </dd>
                  </div>
                </dl>
                {data.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <SignaturesSection
                      moduleKey="customer_feedback"
                      recordId={data.id}
                      title="Karar Verici İmzası"
                      onLockChange={handleLockChange}
                      onSignatureChange={checkSignatureStates}
                    />
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-1 bg-slate-600 rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-900">Aksiyon & Takip</h3>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <dl className="space-y-4">
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sorumlu Kişi</dt>
                    <dd className="text-sm text-gray-900 font-medium">{data.responsible_person || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Alınan Aksiyon / Cevap</dt>
                    <dd className="text-sm text-gray-900 leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-200 whitespace-pre-wrap">
                      {data.action_taken || 'Henüz aksiyon alınmamış.'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Açıklama / Notlar</dt>
                    <dd className="text-sm text-gray-900 leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-200 whitespace-pre-wrap">
                      {data.explanation || 'Not bulunmamaktadır.'}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {(data.izahat_text || data.izahat_by) && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-1 bg-cyan-600 rounded-full"></div>
                  <h3 className="text-lg font-bold text-gray-900">İzahat</h3>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bildirime Sebep Olan Taraf</dt>
                      <dd className="text-sm text-gray-900 font-medium">{data.izahat_by || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bildirime Sebep Taraf İzahatı</dt>
                      <dd className="text-sm text-gray-900 leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-200 whitespace-pre-wrap">
                        {data.izahat_text || '-'}
                      </dd>
                    </div>
                  </dl>
                  {data.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <SignaturesSection
                        moduleKey="feedback_izahat"
                        recordId={data.id}
                        title="İzahat İmzaları"
                        onLockChange={() => {}}
                        signOnly
                      />
                    </div>
                  )}
                </div>
              </section>
            )}

            {attachments.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-1 bg-slate-600 rounded-full"></div>
                  <h3 className="text-lg font-bold text-gray-900">Ekler</h3>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <ul className="space-y-2">
                    {attachments.map((path, idx) => (
                      <li key={idx} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                        {getFileIcon(path)}
                        <span className="text-sm text-gray-700 flex-1 truncate">{getFileName(path)}</span>
                        <button
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
                </div>
              </section>
            )}
            {(data.closure_date || data.closure_notes || hasSorumlulukSig) && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`h-8 w-1 rounded-full ${hasSorumlulukSig ? 'bg-teal-600' : 'bg-gray-300'}`}></div>
                  <ShieldCheck className={`w-5 h-5 ${hasSorumlulukSig ? 'text-teal-600' : 'text-gray-400'}`} />
                  <h3 className={`text-lg font-bold ${hasSorumlulukSig ? 'text-gray-900' : 'text-gray-400'}`}>Kapatma</h3>
                </div>
                {!hasSorumlulukSig && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Kapatma bolumu henuz aktif degil</p>
                      <p className="text-xs text-amber-700 mt-1">Oncelikle "Sorumluluk Karari" bolumundeki imza tamamlanmalidir.</p>
                    </div>
                  </div>
                )}
                {hasSorumlulukSig && (
                  <div className="bg-white border border-teal-200 rounded-lg p-6">
                    <dl className="space-y-4">
                      <div>
                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kapatma Tarihi</dt>
                        <dd className="text-sm text-gray-900 font-medium">
                          {data.closure_date ? new Date(data.closure_date).toLocaleDateString('tr-TR', {
                            day: '2-digit', month: 'long', year: 'numeric'
                          }) : '-'}
                        </dd>
                      </div>
                      {data.closure_notes && (
                        <div>
                          <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kapatma Notlari</dt>
                          <dd className="text-sm text-gray-900 leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-200 whitespace-pre-wrap">
                            {data.closure_notes}
                          </dd>
                        </div>
                      )}
                    </dl>
                    <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                      <p className="text-xs text-teal-800 leading-relaxed">
                        Bu geri bildirim resmi olarak kapatilmistir. Alinan onlemlerin etkinligi dogrulanmis olup, laboratuvarin kalite sistemine sagladigi katki icin ilgili tum taraflara tesekkur edilir.
                      </p>
                    </div>
                    {data.id && (
                      <div className="mt-4 pt-4 border-t border-teal-100">
                        <SignaturesSection
                          moduleKey="feedback_closure"
                          recordId={data.id}
                          title="Kapatan Yetkili İmzası"
                          onLockChange={() => {}}
                          onSignatureChange={checkSignatureStates}
                        />
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {signatureHistory.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-1 bg-slate-400 rounded-full"></div>
                  <Clock className="w-5 h-5 text-slate-500" />
                  <h3 className="text-lg font-bold text-gray-900">Imza ve Kilit Gecmisi</h3>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="space-y-3">
                    {signatureHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                          entry.signature_type === 'unlock'
                            ? 'bg-amber-50 border-amber-200'
                            : entry.module_key === 'feedback_closure'
                            ? 'bg-teal-50 border-teal-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className={`p-1.5 rounded-md mt-0.5 ${
                          entry.signature_type === 'unlock'
                            ? 'bg-amber-100'
                            : entry.module_key === 'feedback_closure'
                            ? 'bg-teal-100'
                            : 'bg-slate-200'
                        }`}>
                          {entry.signature_type === 'unlock' ? (
                            <Unlock className="w-3.5 h-3.5 text-amber-700" />
                          ) : entry.module_key === 'feedback_closure' ? (
                            <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                          ) : entry.signature_type === 'auth' ? (
                            <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-800">{entry.signer_name}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                              entry.signature_type === 'unlock'
                                ? 'bg-amber-200 text-amber-800'
                                : entry.module_key === 'feedback_closure'
                                ? 'bg-teal-200 text-teal-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {entry.signature_type === 'unlock'
                                ? 'Kilit Acma'
                                : entry.module_key === 'feedback_closure'
                                ? 'Kapatma Onayi'
                                : 'Sorumluluk Karari'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {entry.signer_role} - {new Date(entry.signed_at).toLocaleDateString('tr-TR', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

          </div>
        </div>

        {(role === 'admin' || role === 'super_admin') && (
          <div className="px-8 pb-2">
            <div className="border border-slate-200 rounded-lg px-5 py-4 bg-slate-50">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Kayıt Bilgileri</p>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
                <div>
                  <dt className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Oluşturan</dt>
                  <dd className="text-xs font-medium text-slate-700">{data.created_by || '-'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Oluşturma Tarihi</dt>
                  <dd className="text-xs font-medium text-slate-700">{formatAuditDate(data.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Son Güncelleyen</dt>
                  <dd className="text-xs font-medium text-slate-700">{data.updated_by || '-'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Güncelleme Tarihi</dt>
                  <dd className="text-xs font-medium text-slate-700">{formatAuditDate(data.updated_at)}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-xl print:hidden">
          <div className="flex justify-between gap-3">
            <div className="flex items-center gap-3">
              {!recordLocked && !recordClosed && hasClosureSig && (
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium flex items-center gap-2"
                >
                  <Ban className="w-4 h-4" />
                  Bildirimi Kapat
                </button>
              )}
              {!recordLocked && !recordClosed && !hasClosureSig && hasSorumlulukSig && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="text-xs text-amber-800 font-medium">Kapatma imzasi olmadan kilitlenemez.</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePdfDownload}
                className="px-6 py-2.5 bg-white text-slate-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-all font-medium flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                PDF Indir
              </button>
              <button
                onClick={handlePrint}
                className="px-6 py-2.5 bg-white text-slate-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-all font-medium flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Yazdir
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all font-medium"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    {showCloseModal && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Bildirimi Kapat</h3>
                <p className="text-sm text-slate-500">{data?.application_no || ''}</p>
              </div>
            </div>
            <button onClick={handleCloseModalDismiss} disabled={closing} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium">
                Bu islem geri alinamaz. Bildirim kalici olarak kapatilacak ve kilitlenecektir.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Sifre</label>
              <div className="relative">
                <input
                  type={showClosePassword ? 'text' : 'password'}
                  value={closePassword}
                  onChange={(e) => setClosePassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && closePassword && !closing) handleCloseFeedback();
                  }}
                  placeholder="Mevcut sifrenizi girin"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowClosePassword(!showClosePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showClosePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {closeError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{closeError}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
            <button
              type="button"
              onClick={handleCloseModalDismiss}
              disabled={closing}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Iptal
            </button>
            <button
              type="button"
              onClick={handleCloseFeedback}
              disabled={!closePassword || closing}
              className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {closing && <Loader2 className="w-4 h-4 animate-spin" />}
              <Ban className="w-4 h-4" />
              Bildirimi Kapat
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default CustomerFeedbackDetailView;
