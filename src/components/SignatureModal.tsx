import { useState } from 'react';
import { X, PenTool, Loader2, AlertCircle } from 'lucide-react';
import SignatureCanvas from './SignatureCanvas';
import { SIGNATURE_ROLES, type SignatureRoleValue } from '../utils/signatureService';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (role: SignatureRoleValue, signatureDataUrl: string) => Promise<void>;
  signerName: string;
  disabledRoles?: string[];
}

export default function SignatureModal({ isOpen, onClose, onSave, signerName, disabledRoles = [] }: SignatureModalProps) {
  const [selectedRole, setSelectedRole] = useState<SignatureRoleValue | ''>('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const canSave = selectedRole !== '' && signatureData !== null;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(selectedRole as SignatureRoleValue, signatureData!);
      setSelectedRole('');
      setSignatureData(null);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Imza kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setSelectedRole('');
    setSignatureData(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <PenTool className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Imza Ekle</h3>
              <p className="text-sm text-slate-500">{signerName}</p>
            </div>
          </div>
          <button onClick={handleClose} disabled={saving} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Imza Rolu</label>
            <div className="grid grid-cols-3 gap-2">
              {SIGNATURE_ROLES.map(r => {
                const disabled = disabledRoles.includes(r.value);
                const selected = selectedRole === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedRole(r.value)}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                      disabled
                        ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                        : selected
                        ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {r.label}
                    {disabled && <span className="block text-[10px] mt-0.5 text-slate-400">Imzalandi</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Imza</label>
            <SignatureCanvas onSignatureChange={setSignatureData} />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Iptal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="px-5 py-2.5 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Imzala
          </button>
        </div>
      </div>
    </div>
  );
}
