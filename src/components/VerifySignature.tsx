import { useState } from 'react';
import { Search, ShieldCheck, ShieldX, Loader2, Microscope, FileSignature } from 'lucide-react';

interface SignatureData {
  signer_role: string;
  signer_name: string;
  signed_at: string;
  application_no: string;
  applicant_name: string;
}

interface VerifyResult {
  verified: boolean;
  message?: string;
  data?: SignatureData;
}

const ROLE_LABELS: Record<string, string> = {
  'Izahat Sahibi': 'Izahat Sahibi',
  'Onaylayan': 'Onaylayan',
  'Hazirlayan': 'Hazirlayan',
  'Kapatma Onay': 'Kapatma Onay',
  'Kilit Acan': 'Kilit Acan',
};

export default function VerifySignature() {
  const [signatureId, setSignatureId] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = signatureId.trim();
    if (!trimmed) return;

    setLoading(true);
    setResult(null);
    setError('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(
        `${supabaseUrl}/functions/v1/verify-signature-public`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${anonKey}`,
            Apikey: anonKey,
          },
          body: JSON.stringify({ signature_id: trimmed }),
        }
      );

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError('Baglanti hatasi. Lutfen tekrar deneyiniz.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      <header className="bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center gap-3">
          <Microscope className="w-7 h-7 text-blue-400" />
          <div>
            <h1 className="text-lg font-bold tracking-wide">my17025</h1>
            <p className="text-[11px] text-slate-400">Imza Dogrulama Sistemi</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <FileSignature className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              Imza Dogrulama
            </h2>
            <p className="text-sm text-slate-500">
              Imza kimligini girerek imzanin gecerliligini dogrulayabilirsiniz.
            </p>
          </div>

          <form onSubmit={handleVerify} className="mb-6">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={signatureId}
                  onChange={(e) => setSignatureId(e.target.value)}
                  placeholder="Signature ID giriniz..."
                  className="w-full pl-4 pr-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all bg-white shadow-sm"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !signatureId.trim()}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Dogrula</span>
              </button>
            </div>
          </form>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {result && result.verified && result.data && (
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-in fade-in">
              <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-900 text-sm">
                    Imza Gecerli
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Bu imza dogrulanmistir.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                <InfoRow
                  label="Rol"
                  value={ROLE_LABELS[result.data.signer_role] || result.data.signer_role}
                />
                <InfoRow label="Ad Soyad" value={result.data.signer_name} />
                <InfoRow
                  label="Imza Tarihi"
                  value={formatDate(result.data.signed_at)}
                />
                {result.data.application_no && (
                  <InfoRow
                    label="Bildirim No"
                    value={result.data.application_no}
                  />
                )}
                {result.data.applicant_name && (
                  <InfoRow
                    label="Musteri"
                    value={result.data.applicant_name}
                  />
                )}
                <div className="px-5 py-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">
                    Imza Durumu
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    Gecerli
                  </span>
                </div>
              </div>
            </div>
          )}

          {result && !result.verified && (
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-red-50 border-b border-red-200 px-5 py-6 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <ShieldX className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="font-semibold text-red-900 text-sm">
                    Imza Bulunamadi
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    {result.message || 'Girilen Signature ID ile eslesen gecerli bir imza bulunamadi.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white/60">
        <div className="max-w-3xl mx-auto px-4 py-4 text-center">
          <p className="text-[11px] text-slate-400">
            my17025 Laboratuvar Bilgi Yonetim Sistemi
          </p>
        </div>
      </footer>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-3 flex items-center justify-between">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}
