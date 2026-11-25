import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, post } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Structure, Territory } from '../lib/types';
import {
  Badge, Button, Card, EmptyState, ErrorBox, Field, Input, PageHeader, Select, Spinner, Table,
} from '../components/ui';

interface Campaign {
  id: string;
  code: string;
  name: string;
  type?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  targetPopulation?: string;
  territoryId?: string;
  structureId?: string;
  territory?: { name?: string };
  structure?: { name?: string };
}

interface Session {
  id: string;
  scheduledAt?: string;
  location?: string;
  status: string;
  structure?: { name?: string };
  mobileTeam?: { name?: string };
}

interface Team {
  id: string;
  name?: string;
}

const STATUS: Record<string, { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }> = {
  draft: { label: 'Brouillon', tone: 'neutral' },
  planned: { label: 'Planifiée', tone: 'info' },
  active: { label: 'Active', tone: 'success' },
  paused: { label: 'En pause', tone: 'warning' },
  completed: { label: 'Terminée', tone: 'neutral' },
  cancelled: { label: 'Annulée', tone: 'danger' },
};

const TYPE: Record<string, string> = {
  routine: 'Routine',
  catchup: 'Rattrapage',
  campaign: 'Campagne spéciale',
  outbreak_response: 'Réponse à épidémie',
};

const SESSION_STATUS: Record<string, { label: string; tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
  scheduled: { label: 'Planifiée', tone: 'info' },
  in_progress: { label: 'En cours', tone: 'warning' },
  completed: { label: 'Terminée', tone: 'success' },
  cancelled: { label: 'Annulée', tone: 'danger' },
};

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

export default function Campaigns() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const campaigns = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => get<Campaign[]>('/campaigns'),
  });

  return (
    <div>
      <PageHeader
        title="Campagnes de vaccination"
        subtitle="Campagnes spéciales, séances et suivi d'activité"
        actions={hasPermission('campaign.create') ? <Button onClick={() => setShowCreate(true)}>+ Nouvelle campagne</Button> : undefined}
      />
      <ErrorBox error={campaigns.error} />

      <Card>
        {campaigns.isLoading ? <Spinner /> : !campaigns.data || campaigns.data.length === 0 ? (
          <EmptyState message="Aucune campagne." />
        ) : (
          <Table head={['Code', 'Nom', 'Type', 'Statut', 'Début', 'Fin', 'Territoire / Structure']}>
            {campaigns.data.map((c) => {
              const s = STATUS[c.status] ?? STATUS.draft;
              return (
                <tr key={c.id} className="hover:bg-immuniq-mist-light cursor-pointer" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                  <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{TYPE[c.type ?? ''] ?? c.type ?? '—'}</td>
                  <td className="px-4 py-3"><Badge tone={s.tone}>{s.label}</Badge></td>
                  <td className="px-4 py-3">{fmtDate(c.startDate)}</td>
                  <td className="px-4 py-3">{fmtDate(c.endDate)}</td>
                  <td className="px-4 py-3 text-xs text-muted">{c.territory?.name ?? c.structure?.name ?? '—'}</td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      {expanded && <CampaignDetail id={expanded} onChanged={() => qc.invalidateQueries({ queryKey: ['campaigns'] })} />}
      {showCreate && <CreateCampaignModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CampaignDetail({ id, onChanged }: { id: string; onChanged: () => void }) {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [sessionForm, setSessionForm] = useState({ scheduledAt: '', location: '', structureId: '', mobileTeamId: '' });

  const detail = useQuery({ queryKey: ['campaign', id], queryFn: () => get<Campaign & { sessions?: Session[] }>(`/campaigns/${id}`) });
  const sessions = useQuery({ queryKey: ['campaign-sessions', id], queryFn: () => get<Session[]>(`/campaigns/${id}/sessions`) });
  const stats = useQuery({ queryKey: ['campaign-stats', id], queryFn: () => get<{ byStatus: { status: string; count: string }[]; totalSessions: number; completedSessions: number }>(`/campaigns/${id}/stats`) });
  const structures = useQuery({ queryKey: ['structures'], queryFn: () => get<Structure[]>('/org/structures'), retry: false });
  const teams = useQuery({ queryKey: ['teams'], queryFn: () => get<Team[]>('/org/teams'), retry: false });

  const transition = useMutation({
    mutationFn: (status: string) => post(`/campaigns/${id}/transition`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaign', id] }); qc.invalidateQueries({ queryKey: ['campaigns'] }); onChanged(); },
  });

  const addSession = useMutation({
    mutationFn: () => post(`/campaigns/${id}/sessions`, {
      scheduledAt: sessionForm.scheduledAt ? new Date(sessionForm.scheduledAt).toISOString() : undefined,
      location: sessionForm.location || undefined,
      structureId: sessionForm.structureId || undefined,
      mobileTeamId: sessionForm.mobileTeamId || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaign-sessions', id] }); setSessionForm({ scheduledAt: '', location: '', structureId: '', mobileTeamId: '' }); },
  });

  const updateSession = useMutation({
    mutationFn: ({ sid, status }: { sid: string; status: string }) => patch(`/campaigns/sessions/${sid}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-sessions', id] }),
  });

  if (detail.isLoading) return <Card className="p-5 mt-4"><Spinner /></Card>;
  const c = detail.data;
  if (!c) return null;
  const s = STATUS[c.status] ?? STATUS.draft;
  const sessionList = sessions.data ?? c.sessions ?? [];

  return (
    <Card className="p-5 mt-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg">{c.name} <span className="font-mono text-xs text-muted">{c.code}</span></h3>
          <div className="flex gap-2 mt-1 items-center">
            <Badge tone={s.tone}>{s.label}</Badge>
            <span className="text-xs text-muted">{fmtDate(c.startDate)} → {fmtDate(c.endDate)}</span>
          </div>
        </div>
        {hasPermission('campaign.update') && (
          <div className="flex gap-2">
            {c.status === 'draft' && <Button variant="secondary" onClick={() => transition.mutate('planned')}>Planifier</Button>}
            {c.status === 'planned' && <Button onClick={() => transition.mutate('active')}>Activer</Button>}
            {c.status === 'active' && <Button variant="secondary" onClick={() => transition.mutate('paused')}>Pause</Button>}
            {c.status === 'paused' && <Button onClick={() => transition.mutate('active')}>Reprendre</Button>}
            {['active', 'paused', 'planned'].includes(c.status) && <Button variant="danger" onClick={() => transition.mutate('cancelled')}>Annuler</Button>}
            {['active', 'paused'].includes(c.status) && <Button variant="ghost" onClick={() => transition.mutate('completed')}>Clôturer</Button>}
          </div>
        )}
      </div>
      <ErrorBox error={transition.error ?? addSession.error ?? updateSession.error} />

      {stats.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
          <div className="bg-immuniq-mist-light rounded-md p-3"><div className="text-muted text-xs">Séances</div><div className="font-bold">{stats.data.completedSessions}/{stats.data.totalSessions}</div></div>
          {(stats.data.byStatus ?? []).map((r) => (
            <div key={r.status} className="bg-immuniq-mist-light rounded-md p-3"><div className="text-muted text-xs">{r.status}</div><div className="font-bold">{r.count}</div></div>
          ))}
        </div>
      )}

      <h4 className="font-semibold mb-2">Séances</h4>
      {sessionList.length === 0 ? (
        <EmptyState message="Aucune séance planifiée." />
      ) : (
        <Table head={['Date prévue', 'Lieu', 'Structure / Équipe', 'Statut', 'Actions']}>
          {sessionList.map((sess) => {
            const ss = SESSION_STATUS[sess.status] ?? SESSION_STATUS.scheduled;
            return (
              <tr key={sess.id}>
                <td className="px-4 py-2">{sess.scheduledAt ? new Date(sess.scheduledAt).toLocaleString('fr-FR') : '—'}</td>
                <td className="px-4 py-2">{sess.location ?? '—'}</td>
                <td className="px-4 py-2 text-xs">{sess.structure?.name ?? sess.mobileTeam?.name ?? '—'}</td>
                <td className="px-4 py-2"><Badge tone={ss.tone}>{ss.label}</Badge></td>
                <td className="px-4 py-2">
                  {hasPermission('campaign.update') && sess.status === 'scheduled' && (
                    <button className="text-xs text-immuniq-teal-dark hover:underline" onClick={() => updateSession.mutate({ sid: sess.id, status: 'in_progress' })}>Démarrer</button>
                  )}
                  {hasPermission('campaign.update') && sess.status === 'in_progress' && (
                    <button className="text-xs text-success hover:underline" onClick={() => updateSession.mutate({ sid: sess.id, status: 'completed' })}>Terminer</button>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {hasPermission('campaign.update') && (
        <div className="mt-4 pt-4 border-t border-line">
          <h4 className="font-semibold mb-2 text-sm">Planifier une séance</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
            <Field label="Date/heure"><Input type="datetime-local" value={sessionForm.scheduledAt} onChange={(e) => setSessionForm({ ...sessionForm, scheduledAt: e.target.value })} /></Field>
            <Field label="Lieu"><Input value={sessionForm.location} onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })} /></Field>
            <Field label="Structure">
              <Select value={sessionForm.structureId} onChange={(e) => setSessionForm({ ...sessionForm, structureId: e.target.value })}>
                <option value="">—</option>
                {(structures.data ?? []).map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
              </Select>
            </Field>
            <Field label="Équipe mobile">
              <Select value={sessionForm.mobileTeamId} onChange={(e) => setSessionForm({ ...sessionForm, mobileTeamId: e.target.value })}>
                <option value="">—</option>
                {(teams.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="mt-2 flex justify-end">
            <Button variant="secondary" onClick={() => addSession.mutate()} disabled={addSession.isPending}>Ajouter la séance</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function CreateCampaignModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ code: '', name: '', type: 'campaign', startDate: '', endDate: '', targetPopulation: '', territoryId: '', structureId: '' });
  const [error, setError] = useState('');

  const territories = useQuery({ queryKey: ['territories'], queryFn: () => get<Territory[]>('/org/territories'), retry: false });
  const structures = useQuery({ queryKey: ['structures'], queryFn: () => get<Structure[]>('/org/structures'), retry: false });

  const mutation = useMutation({
    mutationFn: () => post('/campaigns', {
      ...form,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      targetPopulation: form.targetPopulation || undefined,
      territoryId: form.territoryId || undefined,
      structureId: form.structureId || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); onClose(); },
    onError: (e) => setError(e instanceof Error ? e.message : 'Erreur'),
  });

  const onSubmit = (e: FormEvent) => { e.preventDefault(); mutation.mutate(); };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4 overflow-y-auto">
      <Card className="w-full max-w-xl p-6 my-8">
        <h2 className="text-lg font-bold mb-4">Nouvelle campagne</h2>
        <ErrorBox error={error || null} />
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code *"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></Field>
            <Field label="Type">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Nom *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Début"><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="Fin"><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Territoire">
              <Select value={form.territoryId} onChange={(e) => setForm({ ...form, territoryId: e.target.value })}>
                <option value="">—</option>
                {(territories.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="Structure">
              <Select value={form.structureId} onChange={(e) => setForm({ ...form, structureId: e.target.value })}>
                <option value="">—</option>
                {(structures.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Population cible"><Input value={form.targetPopulation} onChange={(e) => setForm({ ...form, targetPopulation: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={mutation.isPending}>Créer</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
