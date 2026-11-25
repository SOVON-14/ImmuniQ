import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, post } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Structure, Territory } from '../lib/types';
import {
  Badge, Button, Card, EmptyState, ErrorBox, Field, Input, PageHeader, Select, Spinner, Table,
} from '../components/ui';

interface AppUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  status: string;
  role?: { code?: string; name?: string } | string;
  mfaEnabled?: boolean;
  lastLoginAt?: string;
}

const ROLES: Record<string, string> = {
  national_admin: 'Administrateur national',
  health_authority: 'Autorité sanitaire',
  facility_manager: 'Responsable de structure',
  stock_manager: 'Gestionnaire de stock',
  vaccinator: 'Vaccinateur',
  campaign_agent: 'Agent de campagne',
  mobile_team_leader: 'Chef d’équipe mobile',
  beneficiary: 'Bénéficiaire',
  legal_representative: 'Représentant légal',
};

const STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  active: { label: 'Actif', tone: 'success' },
  pending: { label: 'En attente', tone: 'warning' },
  suspended: { label: 'Suspendu', tone: 'danger' },
  blocked: { label: 'Bloqué', tone: 'danger' },
  disabled: { label: 'Désactivé', tone: 'neutral' },
};

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleString('fr-FR') : '—');
const roleCode = (r?: AppUser['role']) => (typeof r === 'string' ? r : r?.code ?? '');
const roleName = (r?: AppUser['role']) => ROLES[roleCode(r)] ?? roleCode(r) ?? '—';

export default function Users() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const users = useQuery({
    queryKey: ['users', statusFilter, roleFilter],
    queryFn: () => {
      const p = new URLSearchParams();
      if (statusFilter) p.set('status', statusFilter);
      if (roleFilter) p.set('roleCode', roleFilter);
      const qs = p.toString();
      return get<AppUser[]>(`/users${qs ? `?${qs}` : ''}`);
    },
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      patch(`/users/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div>
      <PageHeader
        title="Utilisateurs & comptes"
        subtitle="Comptes professionnels, rôles et statuts"
        actions={hasPermission('account.create') ? <Button onClick={() => setShowCreate(true)}>+ Nouvel utilisateur</Button> : undefined}
      />
      <ErrorBox error={users.error ?? setStatus.error} />

      <Card className="p-4 mb-4 flex gap-3">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-44">
          <option value="">Tous statuts</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-56">
          <option value="">Tous rôles</option>
          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Card>

      <Card>
        {users.isLoading ? <Spinner /> : !users.data || users.data.length === 0 ? (
          <EmptyState message="Aucun utilisateur." />
        ) : (
          <Table head={['Utilisateur', 'Nom', 'Rôle', 'Statut', 'MFA', 'Dernière connexion', 'Actions']}>
            {users.data.map((u) => {
              const s = STATUS[u.status] ?? STATUS.pending;
              return (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-mono text-xs">{u.username}</td>
                  <td className="px-4 py-3">{u.firstName} {u.lastName}</td>
                  <td className="px-4 py-3">{roleName(u.role)}</td>
                  <td className="px-4 py-3"><Badge tone={s.tone}>{s.label}</Badge></td>
                  <td className="px-4 py-3">{u.mfaEnabled ? '✓' : '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted">{fmtDate(u.lastLoginAt)}</td>
                  <td className="px-4 py-3">
                    {hasPermission('account.suspend') && u.status === 'active' && (
                      <button className="text-xs text-danger hover:underline" onClick={() => setStatus.mutate({ id: u.id, status: 'suspended' })}>
                        Suspendre
                      </button>
                    )}
                    {hasPermission('account.suspend') && u.status === 'suspended' && (
                      <button className="text-xs text-success hover:underline" onClick={() => setStatus.mutate({ id: u.id, status: 'active' })}>
                        Réactiver
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ username: '', password: '', firstName: '', lastName: '', email: '', phone: '', roleCode: 'vaccinator', structureId: '', territoryId: '' });
  const [error, setError] = useState('');

  const structures = useQuery({ queryKey: ['structures'], queryFn: () => get<Structure[]>('/org/structures'), retry: false });
  const territories = useQuery({ queryKey: ['territories'], queryFn: () => get<Territory[]>('/org/territories'), retry: false });

  const mutation = useMutation({
    mutationFn: () => post('/users', {
      ...form,
      email: form.email || undefined,
      phone: form.phone || undefined,
      structureId: form.structureId || undefined,
      territoryId: form.territoryId || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose(); },
    onError: (e) => setError(e instanceof Error ? e.message : 'Erreur'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4 overflow-y-auto">
      <Card className="w-full max-w-xl p-6 my-8">
        <h2 className="text-lg font-bold mb-4">Nouvel utilisateur</h2>
        <ErrorBox error={error || null} />
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom d'utilisateur *"><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></Field>
            <Field label="Mot de passe * (min. 10 caractères)"><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={10} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom *"><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></Field>
            <Field label="Nom *"><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Téléphone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
          <Field label="Rôle *">
            <Select value={form.roleCode} onChange={(e) => setForm({ ...form, roleCode: e.target.value })}>
              {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Structure">
              <Select value={form.structureId} onChange={(e) => setForm({ ...form, structureId: e.target.value })}>
                <option value="">—</option>
                {(structures.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Territoire">
              <Select value={form.territoryId} onChange={(e) => setForm({ ...form, territoryId: e.target.value })}>
                <option value="">—</option>
                {(territories.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={mutation.isPending}>Créer</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
