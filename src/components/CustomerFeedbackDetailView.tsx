import { X, Printer, Calendar, AlertTriangle, Lightbulb, MessageSquare, Flag, FileText, Image, ExternalLink, Loader2, Download, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useState, useEffect, useCallback } from 'react';
import { generateFeedbackPDF } from '../utils/feedbackPdfExport';
import type { FeedbackAction, FeedbackSignatureGroup } from '../utils/feedbackPdfExport';
import { useModuleDocument } from '../hooks/useModuleDocument';
import DocumentSelectModal from './DocumentSelectModal';
import SignaturesSection from './SignaturesSection';
import { fetchSignatures, fetchModuleRoles, fetchRecordLockState } from '../utils/signatureService';

interface DetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

const CustomerFeedbackDetailView = ({ isOpen, onClose, data }: DetailViewProps) => {
  const { role } = useAuth();
  const [signingIndex, setSigningIndex] = useState<number | null>(null);
  const [orgName, setOrgName] = useState<string | undefined>(undefined);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [recordLocked, setRecordLocked] = useState(false);
  const [actions, setActions] = useState<FeedbackAction[]>([]);
  const { showSelector, closeSelector, onDocumentSelected, requestPdf } = useModuleDocument('customer_feedback');

  const handleLockChange = useCallback((locked: boolean) => {
    setRecordLocked(locked);
  }, []);

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
      const [feedbackSigs, closureSigs, lockInfo] = await Promise.all([
        data.id ? fetchSignatures('customer_feedback', data.id) : Promise.resolve([]),
        data.id ? fetchSignatures('feedback_closure', data.id) : Promise.resolve([]),
        data.id ? fetchRecordLockState(data.id) : Promise.resolve({ is_locked: false, locked_at: null, locked_by: null, unlocked_at: null, unlocked_by: null, unlock_reason: null }),
      ]);

      const [feedbackRoles, closureRoles, actionRoles] = await Promise.all([
        fetchModuleRoles('customer_feedback'),
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
          moduleKey: 'customer_feedback',
          label: 'Sorumluluk Karari',
          signatures: feedbackSigs.map((s) => ({ signer_role: s.signer_role, signer_name: s.signer_name, signed_at: s.signed_at, signature_image_url: s.signature_image_url })),
          roles: feedbackRoles.map((r) => ({ role_name: r.role_name, role_order: r.role_order })),
        },
        ...actionSigGroups,
        {
          moduleKey: 'feedback_closure',
          label: 'Kapatma',
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
          {recordLocked && (
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
            {(data.closure_date || data.closure_notes) && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-1 bg-teal-600 rounded-full"></div>
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  <h3 className="text-lg font-bold text-gray-900">Kapatma</h3>
                </div>
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
                        onLockChange={() => {}}
                      />
                    </div>
                  )}
                </div>
              </section>
            )}

            {data.id && (
              <SignaturesSection
                moduleKey="customer_feedback"
                recordId={data.id}
                onLockChange={handleLockChange}
              />
            )}
          </div>
        </div>

        {role === 'admin' && (
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
          <div className="flex justify-end gap-3">
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
    </>
  );
};

export default CustomerFeedbackDetailView;
