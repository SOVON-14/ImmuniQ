import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button, Card, ErrorBox, Field, Input } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needMfa, setNeedMfa] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username, password, totpCode || undefined);
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion';
      if (msg.includes('MFA')) setNeedMfa(true);
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-immuniq-navy">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="text-4xl font-bold text-white font-heading">ImmuniQ</div>
          <div className="text-immuniq-teal-light text-sm mt-1">
            Système national de gestion de la vaccination
          </div>
        </div>
        <Card className="p-8">
          <h1 className="text-xl font-bold mb-6">Connexion</h1>
          <ErrorBox error={error || null} />
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Nom d'utilisateur">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </Field>
            <Field label="Mot de passe">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
            {needMfa && (
              <Field label="Code MFA (application d'authentification)">
                <Input
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  required
                />
              </Field>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>
        </Card>
        <p className="text-center text-white/50 text-xs mt-6">
          Accès réservé aux professionnels de santé habilités.
        </p>
      </div>
    </div>
  );
}
