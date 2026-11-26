import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, ApiError } from '../lib/api';
import { PortalItem } from '../lib/types';
import { Button, Card, Field, inputCls } from '../components/ui';
import { useAuth } from '../lib/auth';

export default function LinkBeneficiary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [immuniqId, setImmuniqId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: items } = useQuery({
    queryKey: ['portal-me'],
    queryFn: () => get<PortalItem[]>('/portal/me'),
  });

  // Si l'utilisateur n'a aucun rôle portail, on le signale
  const isPortalRole = ['beneficiary', 'legal_representative'].includes(user?.role ?? '');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await post('/portal/link', { immuniqId: immuniqId.trim().toUpperCase(), birthDate });
      await queryClient.invalidateQueries({ queryKey: ['portal-me'] });
      navigate('/espace');
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? 'IMQ-id ou date de naissance incorrects.'
          : err instanceof Error
            ? err.message
            : 'Erreur',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">Lier votre dossier vaccinal</h1>
      <p className="text-sm text-muted mb-8">
        Pour accéder à votre espace, associez votre compte à votre dossier en saisissant votre
        identifiant ImmuniQ et votre date de naissance.
      </p>

      {!isPortalRole && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-warning">
          Ce compte n'est pas un compte bénéficiaire. Contactez votre centre de santé pour obtenir
          un accès portail.
        </div>
      )}

      {items && items.length > 0 && (
        <Card className="mb-6">
          <p className="text-sm font-semibold text-immuniq-navy mb-2">Dossiers déjà liés</p>
          <ul className="text-sm text-muted space-y-1">
            {items.map((i) => (
              <li key={i.beneficiary.id}>
                {i.beneficiary.lastName} {i.beneficiary.firstName} — {i.beneficiary.immuniqId}{' '}
                <span className="text-xs">({i.relation === 'self' ? 'vous-même' : 'personne sous votre responsabilité'})</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Identifiant ImmuniQ (IMQ-id)">
            <input
              className={`${inputCls} font-mono uppercase`}
              value={immuniqId}
              onChange={(e) => setImmuniqId(e.target.value)}
              placeholder="IMQ-XXXXXXXX"
              required
            />
          </Field>
          <Field label="Date de naissance">
            <input
              className={inputCls}
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
            />
          </Field>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-immuniq-danger">
              {error}
            </div>
          )}
          <Button type="submit" disabled={busy || !isPortalRole} className="w-full !py-3">
            {busy ? 'Vérification…' : 'Vérifier et lier'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
