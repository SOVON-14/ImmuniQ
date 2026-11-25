import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button, Card, ErrorBox } from '../components/ui';

type Step = 'credentials' | 'mfa';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submitCredentials = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion';
      if (msg.includes('MFA')) {
        setStep('mfa');
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const submitMfa = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username, password, totpCode);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code invalide');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-immuniq-navy via-[#0A4A7E] to-immuniq-teal-dark p-4">
      <div className="w-full max-w-md">
        <Card className="p-10 shadow-2xl">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-xl bg-immuniq-teal flex items-center justify-center text-white font-bold text-xl shadow-md">
              IQ
            </div>
            <div>
              <h1 className="text-2xl font-bold text-immuniq-navy leading-tight">ImmuniQ</h1>
              <p className="text-muted text-xs">
                Système national de gestion et de suivi de la vaccination — Togo
              </p>
            </div>
          </div>

          {step === 'credentials' ? (
            <form onSubmit={submitCredentials} className="mt-8 space-y-5">
              <ErrorBox error={error || null} />
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Identifiant
                </label>
                <input
                  className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-immuniq-mist-light text-sm focus:outline-none focus:ring-2 focus:ring-immuniq-teal focus:border-transparent"
                  placeholder="ex. vaccinateur.tsevi"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-immuniq-mist-light text-sm focus:outline-none focus:ring-2 focus:ring-immuniq-teal focus:border-transparent pr-16"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-immuniq-navy"
                  >
                    {showPassword ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full justify-center py-3" disabled={busy}>
                {busy ? 'Vérification…' : 'Se connecter'}
              </Button>
            </form>
          ) : (
            <form onSubmit={submitMfa} className="mt-8 space-y-5">
              <div className="bg-immuniq-mist-light border border-immuniq-teal/30 rounded-lg px-4 py-3 text-sm text-immuniq-navy">
                Ce compte est protégé par un second facteur.
                <br />
                <span className="text-xs text-muted">
                  Saisissez le code à 6 chiffres de votre application d'authentification.
                </span>
              </div>
              <ErrorBox error={error || null} />
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Code de vérification (TOTP)
                </label>
                <input
                  className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-immuniq-mist-light text-sm font-mono tracking-[0.4em] text-center focus:outline-none focus:ring-2 focus:ring-immuniq-teal focus:border-transparent"
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                />
              </div>
              <Button type="submit" className="w-full justify-center py-3" disabled={busy || totpCode.length !== 6}>
                {busy ? 'Vérification…' : 'Vérifier'}
              </Button>
              <button
                type="button"
                onClick={() => { setStep('credentials'); setTotpCode(''); setError(''); }}
                className="w-full text-center text-xs text-muted hover:text-immuniq-navy"
              >
                ← Retour à la connexion
              </button>
            </form>
          )}
        </Card>

        <p className="text-center text-white/60 text-[11px] mt-6">
          Accès réservé aux professionnels de santé habilités ·{' '}
          <a href="/portail" className="text-immuniq-teal-light hover:underline">
            Espace bénéficiaire →
          </a>
        </p>
      </div>
    </div>
  );
}
