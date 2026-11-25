import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Vaccine } from '../lib/types';
import {
  Badge, Button, Card, EmptyState, ErrorBox, Field, Input, PageHeader, Select, Spinner, Table,
} from '../components/ui';

interface Referential {
  id: string;
  type: string;
  version: number;
  status: string;
  sourceOfficial?: string;
  effectiveFrom?: string;
  publishedAt?: string;
  rules?: { id: string; vaccineId: string; doseNumber: number; minAgeDays?: number; maxAgeDays?: number; minIntervalDays?: number; vaccine?: { name?: string } }[];
}

const REF_STATUS: Record<string, { label: string; tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger' }> = {
  draft: { label: 'Brouillon', tone: 'neutral' },
  submitted: { label: 'Soumis', tone: 'info' },
  approved: { label: 'Approuvé', tone: 'warning' },
  published: { label: 'Publié', tone: 'success' },
  withdrawn: { label: 'Retiré', tone: 'danger' },
  archived: { label: 'Archivé', tone: 'neutral' },
};

const REF_TYPE: Record<string, string> = {
  routine_calendar: 'Calendrier de routine',
  campaign: 'Campagne',
  catchup: 'Rattrapage',
  specific: 'Spécifique',
};

const VAX_STATUS: Record<string, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  suspended: 'warning',
  archived: 'neutral',
};

export default function Referentials() {
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState<'referentials' | 'vaccines'>('referentials');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');

  const refs = useQuery({
    queryKey: ['referentials', status, type],
    queryFn: () => {
      const p = new URLSearchParams();
      if (status) p.set('status', status);
      if (type) p.set('type', type);
      const qs = p.toString();
      return get<Referential[]>(`/referentials${qs ? `?${qs}` : ''}`);
    },
    enabled: tab === 'referentials',
  });

  const vaccines = useQuery({
    queryKey: ['vaccines', 'all'],
    queryFn: () => get<Vaccine[]>('/referentials/vaccines'),
    enabled: tab === 'vaccines',
  });

  return (
    <div>
      <PageHeader title="Référentiels vaccinaux" subtitle="Calendriers, règles de vaccination et catalogue des vaccins" />

      <div className="flex gap-2 mb-4">
        {(['referentials', 'vaccines'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              tab === t ? 'bg-immuniq-navy text-white' : 'bg-surface text-muted border border-line hover:bg-immuniq-mist'
            }`}
          >
            {t === 'referentials' ? 'Référentiels & règles' : 'Vaccins'}
          </button>
        ))}
      </div>

      {tab === 'referentials' && (
        <>
          <Card className="p-4 mb-4 flex flex-wrap gap-3 items-center">
            <Select value={type} onChange={(e) => setType(e.target.value)} className="w-52">
              <option value="">Tous les types</option>
              {Object.entries(REF_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
              <option value="">Tous les statuts</option>
              {Object.entries(REF_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Card>

          <ErrorBox error={refs.error} />
          <Card>
            {refs.isLoading ? <Spinner /> : !refs.data || refs.data.length === 0 ? (
              <EmptyState message="Aucun référentiel." />
            ) : (
              <Table head={['Type', 'Version', 'Statut', 'Source officielle', 'Effet depuis', 'Publié le', 'Actions']}>
                {refs.data.map((r) => {
                  const s = REF_STATUS[r.status] ?? REF_STATUS.draft;
                  return (
                    <ReferentialRow key={r.id} r={r} tone={s.tone} label={s.label} canDraft={hasPermission('referential.draft')} canApprove={hasPermission('referential.approve')} canPublish={hasPermission('referential.publish')} />
                  );
                })}
              </Table>
            )}
          </Card>
        </>
      )}

      {tab === 'vaccines' && (
        <>
          <ErrorBox error={vaccines.error} />
          <Card>
            {vaccines.isLoading ? <Spinner /> : !vaccines.data || vaccines.data.length === 0 ? (
              <EmptyState message="Aucun vaccin au catalogue." />
            ) : (
              <Table head={['Code', 'Nom', 'Statut', 'Source']}>
                {(vaccines.data ?? []).map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-3 font-mono text-xs">{v.code ?? '—'}</td>
                    <td className="px-4 py-3">{v.name}</td>
                    <td className="px-4 py-3"><Badge tone={VAX_STATUS[v.status ?? ''] ?? 'neutral'}>{v.status}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted">{v.sourceReference ?? '—'}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
          {hasPermission('referential.draft') && <CreateVaccineForm />}
        </>
      )}
    </div>
  );
}

function ReferentialRow({
  r, tone, label, canDraft, canApprove, canPublish,
}: {
  r: Referential;
  tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger';
  label: string;
  canDraft: boolean;
  canApprove: boolean;
  canPublish: boolean;
}) {
  const qc = useQueryClient();
  const [showRules, setShowRules] = useState(false);

  const detail = useQuery({
    queryKey: ['referential', r.id],
    queryFn: () => get<Referential>(`/referentials/${r.id}`),
    enabled: showRules,
  });

  const rules = detail.data?.rules ?? r.rules ?? [];

  const transition = useMutation({
    mutationFn: (action: 'submit' | 'approve' | 'publish' | 'withdraw') =>
      post(`/referentials/${r.id}/${action}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['referentials'] }),
  });

  return (
    <>
      <tr className="hover:bg-immuniq-mist-light">
        <td className="px-4 py-3">{REF_TYPE[r.type] ?? r.type}</td>
        <td className="px-4 py-3">v{r.version}</td>
        <td className="px-4 py-3"><Badge tone={tone}>{label}</Badge></td>
        <td className="px-4 py-3 text-xs">{r.sourceOfficial ?? '—'}</td>
        <td className="px-4 py-3">{r.effectiveFrom ? new Date(r.effectiveFrom).toLocaleDateString('fr-FR') : '—'}</td>
        <td className="px-4 py-3">{r.publishedAt ? new Date(r.publishedAt).toLocaleDateString('fr-FR') : '—'}</td>
        <td className="px-4 py-3">
          <div className="flex gap-1 flex-wrap">
            <button className="text-xs text-immuniq-teal-dark hover:underline" onClick={() => setShowRules(!showRules)}>
              {showRules ? 'Masquer règles' : 'Règles'}
            </button>
            {r.status === 'draft' && canDraft && (
              <button className="text-xs text-warning hover:underline" onClick={() => transition.mutate('submit')}>
                Soumettre
              </button>
            )}
            {r.status === 'submitted' && canApprove && (
              <button className="text-xs text-warning hover:underline" onClick={() => transition.mutate('approve')}>
                Approuver
              </button>
            )}
            {r.status === 'approved' && canPublish && (
              <button className="text-xs text-success hover:underline" onClick={() => transition.mutate('publish')}>
                Publier
              </button>
            )}
            {['published', 'approved'].includes(r.status) && canPublish && (
              <button className="text-xs text-danger hover:underline" onClick={() => transition.mutate('withdraw')}>
                Retirer
              </button>
            )}
          </div>
          <ErrorBox error={transition.error} />
        </td>
      </tr>
      {showRules && (
        <tr>
          <td colSpan={7} className="px-4 py-3 bg-immuniq-mist-light">
            {detail.isLoading ? (
              <Spinner />
            ) : rules.length === 0 ? (
              <span className="text-xs text-muted">Aucune règle dans ce référentiel.</span>
            ) : (
              <Table head={['Vaccin', 'Dose', 'Âge min (j)', 'Âge max (j)', 'Intervalle min (j)']}>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="px-4 py-2">{rule.vaccine?.name ?? rule.vaccineId.slice(0, 8)}</td>
                    <td className="px-4 py-2">{rule.doseNumber}</td>
                    <td className="px-4 py-2">{rule.minAgeDays ?? '—'}</td>
                    <td className="px-4 py-2">{rule.maxAgeDays ?? '—'}</td>
                    <td className="px-4 py-2">{rule.minIntervalDays ?? '—'}</td>
                  </tr>
                ))}
              </Table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function CreateVaccineForm() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '', sourceReference: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => post('/referentials/vaccines', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vaccines'] });
      setOpen(false);
      setForm({ code: '', name: '', description: '', sourceReference: '' });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Erreur'),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  if (!open) {
    return (
      <div className="mt-4">
        <Button variant="secondary" onClick={() => setOpen(true)}>+ Ajouter un vaccin</Button>
      </div>
    );
  }

  return (
    <Card className="p-5 mt-4">
      <h3 className="font-bold mb-3">Nouveau vaccin</h3>
      <ErrorBox error={error || null} />
      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
        <Field label="Code *"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></Field>
        <Field label="Nom *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
        <Field label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Référence source"><Input value={form.sourceReference} onChange={(e) => setForm({ ...form, sourceReference: e.target.value })} /></Field>
        <div className="col-span-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button type="submit" disabled={mutation.isPending}>Créer</Button>
        </div>
      </form>
    </Card>
  );
}
