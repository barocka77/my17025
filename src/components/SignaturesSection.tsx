import { useState, useEffect } from 'react';
import { PenTool, Trash2, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import SignatureModal from './SignatureModal';
import {
  fetchSignatures,
  fetchModuleRoles,
  saveSignature,
  deleteSignature,
  isRecordLocked,
  type RecordSignature,
  type ModuleSignatureRole,
} from '../utils/signatureService';

interface SignaturesSectionProps {
  moduleKey: string;
  recordId: string;
  onLockChange?: (locked: boolean) => void;
}

export default function SignaturesSection({ moduleKey, recordId, onLockChange }: SignaturesSectionProps) {
  const { user, role } = useAuth();
  const [signatures, setSignatures] = useState<RecordSignature[]>([]);
  const [roles, setRoles] = useState<ModuleSignatureRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [signerName, setSignerName] = useState('');

  const locked = isRecordLocked(signatures, roles);

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
      const [sigs, moduleRoles] = await Promise.all([
        fetchSignatures(moduleKey, recordId),
        fetchModuleRoles(moduleKey),
      ]);
      setSignatures(sigs);
      setRoles(moduleRoles);
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
          <h3 className="text-lg font-bold text-gray-900">Imzalar</h3>
          {locked && (
            <span className="inline-flex items-center gap-1 ml-2 px-2.5 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full border border-green-200">
              <Lock className="w-3 h-3" />
              Onaylandi
            </span>
          )}
        </div>
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
            {signatures.map(sig => (
              <div
                key={sig.id}
                className="relative border border-slate-200 rounded-lg p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-md uppercase tracking-wide">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {sig.signer_role}
                  </span>
                  {canDelete(sig) && (
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
              </div>
            ))}
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
