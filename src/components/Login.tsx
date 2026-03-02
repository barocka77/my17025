import { useState } from 'react';
import { LogIn, UserPlus, AlertCircle, Shield, CheckCircle, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LoginProps {
  redirectTo?: string | null;
}

export default function Login({ redirectTo: redirectToProp }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const redirectTo = redirectToProp || new URLSearchParams(window.location.search).get('redirectTo');

  const validateCorporateEmail = (email: string): boolean => {
    const domain = email.split('@')[1];
    if (!domain) return false;

    // Allow Gmail for testing purposes
    if (domain.toLowerCase() === 'gmail.com') return true;

    const restrictedDomains = ['yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
    return !restrictedDomains.includes(domain.toLowerCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!validateCorporateEmail(email)) {
          setError('Lütfen kurumsal e-posta adresinizi kullanın (Test için Gmail kullanılabilir).');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setError('Şifre en az 6 karakter olmalıdır.');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Şifreler eşleşmiyor.');
          setLoading(false);
          return;
        }

        await signUp(email, password);
        setShowVerificationSuccess(true);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      } else {
        if (redirectTo) {
          sessionStorage.setItem('pending_redirect_to', redirectTo);
        }
        await signIn(email, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);

      let errorMessage = err.message || 'Bir hata oluştu';

      if (err.message?.includes('Invalid login credentials')) {
        errorMessage = 'E-posta veya şifre hatalı.';
      } else if (err.message?.includes('Email not confirmed')) {
        errorMessage = 'E-posta adresiniz henüz doğrulanmadı.';
      } else if (err.message?.includes('User already registered')) {
        errorMessage = 'Bu e-posta adresi zaten kayıtlı.';
      } else if (err.message?.includes('corporate domain') || err.message?.includes('authorized')) {
        errorMessage = 'Erişim Reddedildi: Lütfen yetkili kurumsal e-posta adresinizi kullanın.';
      } else if (err.code === '23505') {
        errorMessage = 'Bu e-posta adresi zaten kayıtlı.';
      } else if (err.code === 'P0001' || err.message?.includes('trigger')) {
        errorMessage = 'Erişim Reddedildi: Lütfen yetkili kurumsal e-posta adresinizi kullanın.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {showVerificationSuccess ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Kaydınız Alındı</h2>
              <p className="text-sm font-bold text-red-900 mb-6 leading-relaxed">
                Lütfen kayıt olduğunuz e-posta kutusunu kontrol ederek mail aktivasyonunuzu gerçekleştirin.
              </p>
              <button
                onClick={() => {
                  setShowVerificationSuccess(false);
                  setIsSignUp(false);
                  setError('');
                  setSuccess('');
                }}
                className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors"
              >
                Giriş Sayfasına Dön
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-col items-center mb-6">
              <div className="w-14 h-14 bg-slate-900 rounded-lg flex items-center justify-center mb-3">
                {isSignUp ? (
                  <UserPlus className="w-7 h-7 text-white" />
                ) : (
                  <LogIn className="w-7 h-7 text-white" />
                )}
              </div>
              <h1 className="text-xl font-semibold text-slate-900">my17025</h1>
              <p className="text-xs text-slate-600 mt-0.5">Laboratuvar Bilgi Yönetim Sistemi</p>
            </div>

          {isSignUp && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-2.5">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-blue-900 font-medium mb-0.5">
                    Kurumsal E-posta Gerekli
                  </p>
                  <p className="text-[11px] text-blue-700">
                    Kayıt yetkili kurumsal alan adlarıyla sınırlıdır (örn: @sirketiniz.com).
                    Test amaçlı Gmail adresleri kabul edilir.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                E-posta
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                placeholder={isSignUp ? "kullanici@sirketiniz.com" : "ornek@email.com"}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Şifre
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                placeholder="••••••••"
                minLength={6}
              />
              {isSignUp && (
                <p className="text-xs text-slate-500 mt-1">En az 6 karakter</p>
              )}
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Şifre Tekrar
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-700">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? (isSignUp ? 'Kayıt yapılıyor...' : 'Giriş yapılıyor...')
                : (isSignUp ? 'Hesap Oluştur' : 'Giriş Yap')}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setSuccess('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              {isSignUp ? (
                <>
                  Zaten hesabınız var mı? <span className="font-medium">Giriş Yap</span>
                </>
              ) : (
                <>
                  Hesabınız yok mu? <span className="font-medium">Kayıt Ol</span>
                </>
              )}
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
