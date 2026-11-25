import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { get, post } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Beneficiary } from '../lib/types';
import {
  Badge, Button, Card, EmptyState, ErrorBox, Field, Input, PageHeader, Select, Spinner, Table,
} from '../components/ui';

const STATUS_TONES: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  to_verify: 'warning',
  merged: 'neutral',
  archived: 'neutral',
  flagged: 'danger',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  to_verify: 'À vérifier',
  merged: 'Fusionné',
  archived: 'Archivé',
  flagged: 'Signalé',
};

export default function Beneficiaries() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['beneficiaries', search],
    queryFn: () => get<Beneficiary[]>(`/beneficiaries${search ? `?q=${encodeURIComponent(search)}` : ''}`),
  });

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearch(q);
  };

  return (
    <div>
      <PageHeader
        title="Bénéficiaires"
        subtitle="Recherche par IMQ-id, nom, téléphone…"
        actions={
          hasPermission('beneficiary.create') ? (
            <Button onClick={() => setShowCreate(true)}>+ Nouveau bénéficiaire</Button>
          ) : undefined
        }
      />
      <ErrorBox error={error} />

      <Card className="p-4 mb-4">
        <form onSubmit={onSearch} className="flex gap-2">
          <Input
            placeholder="Rechercher (IMQ-id, nom, prénom, téléphone)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button type="submit" variant="secondary">Rechercher</Button>
        </form>
      </Card>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : !data || data.length === 0 ? (
          <EmptyState message="Aucun bénéficiaire trouvé." />
        ) : (
          <Table head={['IMQ-id', 'Nom', 'Prénom', 'Naissance', 'Sexe', 'Téléphone', 'Statut', 'Doublons potentiels']}>
            {data.map((b) => (
              <tr key={b.id} className="hover:bg-immuniq-mist-light">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link to={`/beneficiaires/${b.id}`} className="text-immuniq-teal-dark hover:underline">
                    {b.immuniqId ?? b.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-3">{b.lastName}</td>
                <td className="px-4 py-3">{b.firstName}</td>
                <td className="px-4 py-3">{b.birthDate ?? '—'}</td>
                <td className="px-4 py-3">{b.sex ?? '—'}</td>
                <td className="px-4 py-3">{b.phone ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONES[b.status ?? ''] ?? 'neutral'}>
                    {STATUS_LABELS[b.status ?? ''] ?? b.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {(b.potentialDuplicates?.length ?? 0) > 0 ? (
                    <Badge tone="warning">{b.potentialDuplicates!.length} suspect(s)</Badge>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {showCreate && (
        <CreateBeneficiaryModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            qc.invalidateQueries({ queryKey: ['beneficiaries'] });
          }}
        />
      )}
    </div>
  );
}

function CreateBeneficiaryModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', birthDate: '', sex: 'unknown', phone: '', commune: '', address: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      post<Beneficiary>('/beneficiaries', {
        ...form,
        birthDate: form.birthDate || undefined,
        phone: form.phone || undefined,
        commune: form.commune || undefined,
        address: form.address || undefined,
      }),
    onSuccess: onCreated,
    onError: (e) => setError(e instanceof Error ? e.message : 'Erreur'),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4">
      <Card className="w-full max-w-lg p-6">
        <h2 className="text-lg font-bold mb-4">Nouveau bénéficiaire</h2>
        <ErrorBox error={error || null} />
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom *">
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </Field>
            <Field label="Prénom *">
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Date de naissance">
              <Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
            </Field>
            <Field label="Sexe">
              <Select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
                <option value="unknown">Inconnu</option>
                <option value="male">Masculin</option>
                <option value="female">Féminin</option>
              </Select>
            </Field>
            <Field label="Téléphone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Commune">
              <Input value={form.commune} onChange={(e) => setForm({ ...form, commune: e.target.value })} />
            </Field>
            <Field label="Adresse">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Création…' : 'Créer'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
