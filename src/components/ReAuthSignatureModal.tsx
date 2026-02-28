import { useState } from 'react';
import { X, ShieldCheck, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import type { ModuleSignatureRole } from '../utils/signatureService';

interface ReAuthSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (roleName: string, roleId: string, password: string) => Promise<void>;
  signerName: string;
  roles: ModuleSignatureRole[];
  disabledRoles?: string[];
}

export default function ReAuthSignatureModal({
  isOpen,
  onClose,
  onConfirm,
  signerName,
  roles,
  disabledRoles = [],
}: ReAuthSignatureModalProps) {
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const canConfirm = selectedRole !== '' && password.length > 0;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm(selectedRole, selectedRoleId, password);
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Imza kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setSelectedRole('');
    setSelectedRoleId('');
    setPassword('');
    setShowPassword(false);
    setError(null);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canConfirm && !saving) {
      handleConfirm();
    }
  };

  const gridCols = roles.length <= 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Onayla ve Imzala</h3>
              <p className="text-sm text-slate-500">{signerName}</p>
            </div>
          </div>
          <button onClick={handleClose} disabled={saving} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              Imzanizi onaylamak icin mevcut sifrenizi girin. Bu islem geri alinamaz.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Imza Rolu</label>
            <div className={`grid ${gridCols} gap-2`}>
              {roles.map(r => {
                const disabled = disabledRoles.includes(r.role_name);
                const selected = selectedRole === r.role_name;
                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setSelectedRole(r.role_name);
                      setSelectedRoleId(r.id);
                    }}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                      disabled
                        ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                        : selected
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {r.role_name}
                    {disabled && <span className="block text-[10px] mt-0.5 text-slate-400">Imzalandi</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Sifre</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Mevcut sifrenizi girin"
                autoComplete="current-password"
                className="w-full px-4 py-3 pr-12 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
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
            onClick={handleConfirm}
            disabled={!canConfirm || saving}
            className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <ShieldCheck className="w-4 h-4" />
            Onayla ve Imzala
          </button>
        </div>
      </div>
    </div>
  );
}
