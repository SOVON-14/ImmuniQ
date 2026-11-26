import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';
import { Button, Card, Field, inputCls } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [needMfa, setNeedMfa] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username, password, totp || undefined);
      navigate('/espace');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion';
      if (msg.toLowerCase().includes('mfa') || msg.toLowerCase().includes('code')) setNeedMfa(true);
      setError(err instanceof ApiError && err.status === 401 ? 'Identifiants incorrects.' : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md !p-8">
        <div className="text-center mb-6">
          <img src="/img/monogramme.png" alt="ImmuniQ" className="h-14 w-auto mx-auto" />
          <h1 className="mt-4 text-2xl font-bold">Connexion</h1>
          <p className="text-sm text-muted mt-1">Espace bénéficiaire ImmuniQ</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Identifiant">
            <input
              className={inputCls}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Votre identifiant"
              required
            />
          </Field>
          <Field label="Mot de passe">
            <input
              className={inputCls}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </Field>
          {needMfa && (
            <Field label="Code de vérification (6 chiffres)">
              <input
                className={`${inputCls} text-center tracking-[0.5em] font-mono`}
                value={totp}
                onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
              />
            </Field>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-immuniq-danger">
              {error}
            </div>
          )}
          <Button type="submit" disabled={busy || !username || !password} className="w-full !py-3">
            {busy ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-muted">
          Pas encore de compte ?{' '}
          <Link to="/" className="text-immuniq-teal-dark font-medium hover:underline">
            Retour à l'accueil
          </Link>
        </p>
      </Card>
    </div>
  );
}
