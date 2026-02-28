import { useState, useEffect } from 'react';
import { PenTool, Trash2, Lock, Unlock, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import SignatureModal from './SignatureModal';
import {
  fetchSignatures,
  fetchModuleRoles,
  fetchRecordLockState,
  saveSignature,
  deleteSignature,
  adminUnlockRecord,
  type RecordSignature,
  type ModuleSignatureRole,
  type RecordLockState,
} from '../utils/signatureService';

interface SignaturesSectionProps {
  moduleKey: string;
  recordId: string;
  onLockChange?: (locked: boolean) => void;
  title?: string;
}

export default function SignaturesSection({ moduleKey, recordId, onLockChange, title }: SignaturesSectionProps) {
  const { user, role } = useAuth();
  const [signatures, setSignatures] = useState<RecordSignature[]>([]);
  const [roles, setRoles] = useState<ModuleSignatureRole[]>([]);
  const [lockState, setLockState] = useState<RecordLockState>({
    is_locked: false, locked_at: null, locked_by: null,
    unlocked_at: null, unlocked_by: null, unlock_reason: null,
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [signerName, setSignerName] = useState('');
  const [showUnlockForm, setShowUnlockForm] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const locked = lockState.is_locked;

  useEffect(() => {
    if (onLockChange) onLockChange(locked);
  }, [locked, onLockChange]);

  useEffect(() => {
    loadData();
  }, [moduleKey, recordId]);

  useEffect(() => {
    if (user) {
      const meta = user.user_metadata;
      setSignerName(meta?.full_name || user.email || '');
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sigs, moduleRoles, dbLock] = await Promise.all([
        fetchSignatures(moduleKey, recordId),
        fetchModuleRoles(moduleKey),
        fetchRecordLockState(recordId),
      ]);
      setSignatures(sigs);
      setRoles(moduleRoles);
      setLockState(dbLock);
    } catch {
      setSignatures([]);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (roleName: string, dataUrl: string) => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const name = profile?.full_name || user.email || '';

    await saveSignature({
      moduleKey,
      recordId,
      signerRole: roleName,
      signerName: name,
      signerId: user.id,
      signatureDataUrl: dataUrl,
    });

    await loadData();
  };

  const handleDelete = async (sig: RecordSignature) => {
    if (!confirm('Bu imza silinecek. Devam etmek istiyor musunuz?')) return;
    setDeletingId(sig.id);
    try {
      await deleteSignature(sig.id, sig.signature_image_url);
      await loadData();
    } catch {
      alert('Imza silinemedi.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUnlock = async () => {
    if (!unlockReason.trim()) {
      setUnlockError('Kilit acma nedeni zorunludur.');
      return;
    }
    setUnlocking(true);
    setUnlockError(null);
    try {
      await adminUnlockRecord(recordId, unlockReason.trim());
      setShowUnlockForm(false);
      setUnlockReason('');
      await loadData();
    } catch (err: any) {
      setUnlockError(err?.message || 'Kilit acilamadi.');
    } finally {
      setUnlocking(false);
    }
  };

  const canDelete = (sig: RecordSignature) => {
    if (locked) return false;
    if (!user) return false;
    return sig.signer_id === user.id || role === 'admin' || role === 'quality_manager';
  };

  const disabledRoles = signatures.map(s => s.signer_role);

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const gridCols = roles.length <= 2 ? 'md:grid-cols-2' : 'md:grid-cols-3';

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-1 bg-slate-600 rounded-full"></div>
          <h3 className="text-lg font-bold text-gray-900">{title || 'Imzalar'}</h3>
          {locked && (
            <span className="inline-flex items-center gap-1 ml-2 px-2.5 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full border border-green-200">
              <Lock className="w-3 h-3" />
              IMZALI
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {locked && role === 'admin' && (
            <button
              onClick={() => {
                setShowUnlockForm(!showUnlockForm);
                setUnlockError(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <Unlock className="w-4 h-4" />
              Kilidi Ac
            </button>
          )}
          {!locked && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <PenTool className="w-4 h-4" />
              Imza Ekle
            </button>
          )}
        </div>
      </div>

      {locked && lockState.locked_at && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-800">
              <p className="font-semibold">Bu kayit imzalanmistir.</p>
              <p className="text-green-700 mt-1">
                Kilitlenme: {formatDate(lockState.locked_at)}
              </p>
              {lockState.unlocked_at && lockState.unlock_reason && (
                <p className="text-amber-700 mt-1 text-xs">
                  Son acilma: {formatDate(lockState.unlocked_at)} - Neden: {lockState.unlock_reason}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {showUnlockForm && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-lg space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Kayit Kilidini Ac</p>
              <p className="text-xs text-amber-700 mt-1">
                Mevcut imzalar silinmez. Kayit tekrar duzenlenebilir hale gelir.
                Nihai onay veren tekrar imzalarsa kayit yeniden kilitlenir.
              </p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-amber-800 mb-1">
              Acma Nedeni (zorunlu)
            </label>
            <textarea
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none bg-white"
              placeholder="Neden kilidi aciyorsunuz?"
            />
          </div>
          {unlockError && (
            <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700">{unlockError}</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowUnlockForm(false);
                setUnlockReason('');
                setUnlockError(null);
              }}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Iptal
            </button>
            <button
              onClick={handleUnlock}
              disabled={unlocking || !unlockReason.trim()}
              className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {unlocking && <Loader2 className="w-3 h-3 animate-spin" />}
              Kilidi Ac
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : signatures.length === 0 ? (
          <div className="text-center py-8">
            <PenTool className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Henuz imza eklenmemis.</p>
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
            {roles.map(r => {
              const sig = signatures.find(s => s.signer_role === r.role_name);
              return (
                <div
                  key={r.id}
                  className={`relative border rounded-lg p-4 transition-colors ${
                    sig
                      ? 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      : 'border-dashed border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-md uppercase tracking-wide">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {r.role_name}
                      {r.is_final_approval && (
                        <span className="text-[9px] text-slate-500 font-medium normal-case ml-1">(Nihai)</span>
                      )}
                    </span>
                    {sig && canDelete(sig) && (
                      <button
                        onClick={() => handleDelete(sig)}
                        disabled={deletingId === sig.id}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      >
                        {deletingId === sig.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {sig ? (
                    <>
                      {sig.signature_image_url && (
                        <div className="bg-white border border-slate-200 rounded-md p-2 mb-3">
                          <img
                            src={sig.signature_image_url}
                            alt={`${sig.signer_name} imzasi`}
                            className="w-full h-16 object-contain"
                          />
                        </div>
                      )}
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-800">{sig.signer_name}</p>
                        <p className="text-xs text-slate-500">{formatDate(sig.signed_at)}</p>
                      </div>
                    </>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-xs text-slate-400">Imza bekleniyor</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SignatureModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        signerName={signerName}
        roles={roles}
        disabledRoles={disabledRoles}
      />
    </section>
  );
}
