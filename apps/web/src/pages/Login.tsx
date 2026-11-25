import { FormEvent, KeyboardEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

/* ------------------------------------------------------------------ */
/*  Panneau de marque (partie gauche du login)                          */
/* ------------------------------------------------------------------ */

function BrandPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-immuniq-navy p-12 text-white">
      {/* Halo décoratifs animés */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-immuniq-teal/20 blur-3xl animate-pulse" />
      <div
        className="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full bg-immuniq-teal-dark/30 blur-3xl"
        style={{ animation: 'float 9s ease-in-out infinite' }}
      />
      {/* Grille subtile */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      <div className="relative flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-immuniq-teal flex items-center justify-center font-bold shadow-lg shadow-teal-500/30">
          IQ
        </div>
        <div>
          <div className="font-heading font-bold text-lg leading-tight">ImmuniQ</div>
          <div className="text-[10px] text-[#9FC3E8] tracking-wide">SANTÉ · TOGO</div>
        </div>
      </div>

      <div className="relative">
        <h2 className="font-heading text-4xl font-bold leading-tight mb-4">
          La vaccination,
          <br />
          <span className="text-immuniq-teal-light">sous contrôle.</span>
        </h2>
        <p className="text-white/60 text-sm max-w-sm leading-relaxed mb-10">
          Dossier vaccinal national, chaîne du froid tracée, synchronisation hors ligne —
          une plateforme pensée pour les équipes de terrain.
        </p>
        <ul className="space-y-3 text-sm">
          {[
            'Dossier vaccinal unique par IMQ-id',
            'Actes idempotents, corrections historisées',
            'Chaîne du froid surveillée en temps réel',
          ].map((t) => (
            <li key={t} className="flex items-center gap-3 text-white/80">
              <span className="w-5 h-5 rounded-full bg-immuniq-teal/20 border border-immuniq-teal/40 flex items-center justify-center text-[10px] text-immuniq-teal-light">
                ✓
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative text-[11px] text-white/40">
        © {new Date().getFullYear()} ImmuniQ — Programme national de vaccination
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Champ de saisie stylé                                               */
/* ------------------------------------------------------------------ */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-line bg-immuniq-mist-light text-sm transition-all focus:outline-none focus:ring-2 focus:ring-immuniq-teal/60 focus:border-immuniq-teal focus:bg-surface';

/* ------------------------------------------------------------------ */
/*  Étape MFA : 6 cases auto-avancées                                  */
/* ------------------------------------------------------------------ */

function MfaInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.padEnd(6, ' ').split('').slice(0, 6);

  const handleChange = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, '').slice(-1);
    const next = value.split('');
    next[i] = d || ' ';
    onChange(next.join('').replace(/ /g, ''));
    if (d && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d.trim()}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          autoFocus={i === 0}
          className={`w-11 h-14 text-center text-xl font-bold rounded-xl border bg-immuniq-mist-light font-mono transition-all focus:outline-none focus:ring-2 focus:ring-immuniq-teal/60 ${
            d.trim() ? 'border-immuniq-teal text-immuniq-navy' : 'border-line text-ink'
          }`}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page de connexion                                                   */
/* ------------------------------------------------------------------ */

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
      if (msg.includes('MFA')) setStep('mfa');
      else setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const submitMfa = async (e: FormEvent) => {
    e.preventDefault();
    if (totpCode.length !== 6) return;
    setError('');
    setBusy(true);
    try {
      await login(username, password, totpCode);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code invalide');
      setTotpCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-immuniq-mist-light">
      <BrandPanel />

      {/* Partie formulaire */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="w-11 h-11 rounded-xl bg-immuniq-teal flex items-center justify-center font-bold text-white shadow-lg">
              IQ
            </div>
            <div className="font-heading font-bold text-xl text-immuniq-navy">ImmuniQ</div>
          </div>

          <div className="bg-surface rounded-2xl border border-line shadow-card p-8 md:p-10 animate-[fade-up_.5s_ease-out]">
            {step === 'credentials' ? (
              <form onSubmit={submitCredentials} className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-immuniq-navy">Connexion</h1>
                  <p className="text-muted text-sm mt-1">
                    Accédez à votre espace professionnel de vaccination.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-danger text-sm rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}

                <Field label="Identifiant">
                  <input
                    className={inputCls}
                    placeholder="ex. vaccinateur.tsevi"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    required
                  />
                </Field>

                <Field label="Mot de passe">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`${inputCls} pr-20`}
                      placeholder="••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted hover:text-immuniq-navy"
                    >
                      {showPassword ? 'Masquer' : 'Afficher'}
                    </button>
                  </div>
                </Field>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3.5 rounded-xl bg-immuniq-teal hover:bg-immuniq-teal-dark text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-500/20"
                >
                  {busy ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Vérification…
                    </span>
                  ) : (
                    'Se connecter'
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={submitMfa} className="space-y-6">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-immuniq-teal/10 text-immuniq-teal-dark flex items-center justify-center mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-immuniq-navy">Vérification en deux étapes</h1>
                  <p className="text-muted text-sm mt-1">
                    Saisissez le code à 6 chiffres de votre application d'authentification.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-danger text-sm rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}

                <MfaInput value={totpCode} onChange={setTotpCode} />

                <button
                  type="submit"
                  disabled={busy || totpCode.length !== 6}
                  className="w-full py-3.5 rounded-xl bg-immuniq-teal hover:bg-immuniq-teal-dark text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-500/20"
                >
                  {busy ? 'Vérification…' : 'Vérifier et entrer'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setTotpCode(''); setError(''); }}
                  className="w-full text-center text-xs text-muted hover:text-immuniq-navy transition-colors"
                >
                  ← Retour à la connexion
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-muted text-[11px] mt-6">
            Accès réservé aux professionnels de santé habilités ·{' '}
            <a href="/portail" className="text-immuniq-teal-dark hover:underline font-medium">
              Espace bénéficiaire →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
