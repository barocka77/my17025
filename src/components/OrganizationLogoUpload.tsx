import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Building2, Check, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function OrganizationLogoUpload() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [nameValue, setNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameChanged, setNameChanged] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, logo_url')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      showToast('Kurulus yuklenirken hata olustu', 'error');
      return;
    }

    if (data) {
      setOrg(data);
      setNameValue(data.name);
      setPreview(data.logo_url);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleNameChange = (value: string) => {
    setNameValue(value);
    setNameChanged(value.trim() !== (org?.name || ''));
  };

  const handleSaveName = async () => {
    if (!org || !nameValue.trim()) return;
    const trimmed = nameValue.trim();
    if (trimmed === org.name) {
      setNameChanged(false);
      return;
    }

    setSavingName(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: trimmed })
        .eq('id', org.id);

      if (error) throw error;

      setOrg({ ...org, name: trimmed });
      setNameChanged(false);
      showToast('Kurulus adi guncellendi', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Kurulus adi guncellenirken hata olustu';
      showToast(message, 'error');
    } finally {
      setSavingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveName();
    if (e.key === 'Escape') {
      setNameValue(org?.name || '');
      setNameChanged(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !org) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Yalnizca PNG, JPG, WebP veya SVG dosyalari yuklenebilir', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Dosya boyutu 2MB\'dan kucuk olmalidir', 'error');
      return;
    }

    setUploading(true);

    try {
      const ext = file.name.split('.').pop()?.toLocaleLowerCase('tr-TR') || 'png';
      const filePath = `${org.id}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('organization-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('organization-assets')
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: publicUrl })
        .eq('id', org.id);

      if (updateError) throw updateError;

      setPreview(publicUrl);
      setOrg({ ...org, logo_url: publicUrl });
      showToast('Logo basariyla yuklendi', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Logo yuklenirken hata olustu';
      showToast(message, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!org) return;
    setRemoving(true);

    try {
      const { data: files } = await supabase.storage
        .from('organization-assets')
        .list(org.id);

      if (files && files.length > 0) {
        const paths = files.map(f => `${org.id}/${f.name}`);
        await supabase.storage.from('organization-assets').remove(paths);
      }

      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: null })
        .eq('id', org.id);

      if (updateError) throw updateError;

      setPreview(null);
      setOrg({ ...org, logo_url: null });
      showToast('Logo kaldirildi', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Logo kaldirilirken hata olustu';
      showToast(message, 'error');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-800">Kurulus Ayarlari</h2>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Kurulus Adi
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={nameValue}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={handleNameKeyDown}
              className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition-all"
              placeholder="Kurulus adi"
              disabled={savingName || !org}
            />
            {nameChanged && (
              <button
                onClick={handleSaveName}
                disabled={savingName || !nameValue.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {savingName ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Kaydet
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Bu isim PDF raporlarinin basliginda kullanilir.
          </p>
        </div>

        <div className="pt-5 border-t border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Logo
          </label>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden flex-shrink-0">
              {preview ? (
                <img
                  src={preview}
                  alt="Kurulus logosu"
                  className="w-full h-full object-contain p-2"
                  onError={() => setPreview(null)}
                />
              ) : (
                <Building2 className="w-10 h-10 text-slate-300" />
              )}
            </div>

            <div className="flex-1 space-y-3">
              <p className="text-sm text-slate-600">
                PNG, JPG, WebP veya SVG. Maksimum 2MB.
              </p>

              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || !org}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Yukleniyor...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Logo Yukle
                    </>
                  )}
                </button>

                {preview && (
                  <button
                    onClick={handleRemoveLogo}
                    disabled={removing}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    {removing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Kaldir
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
