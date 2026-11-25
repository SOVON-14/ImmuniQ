import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  Badge, Button, Card, EmptyState, ErrorBox, Field, Input, PageHeader, Select, Spinner, Table,
} from '../components/ui';

interface Notification {
  id: string;
  channel: string;
  recipientRef?: string;
  status: string;
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  errorMessage?: string;
  createdAt: string;
  template?: { name?: string };
}

interface Template {
  id: string;
  code: string;
  name: string;
  channel: string;
  subject?: string;
  body: string;
  locale?: string;
  active?: boolean;
}

const CHANNEL: Record<string, string> = { sms: 'SMS', push: 'Push', portal: 'Portail', email: 'Email' };

const STATUS: Record<string, { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }> = {
  queued: { label: 'En file', tone: 'info' },
  sent: { label: 'Envoyée', tone: 'success' },
  delivered: { label: 'Livrée', tone: 'success' },
  failed: { label: 'Échec', tone: 'danger' },
  cancelled: { label: 'Annulée', tone: 'neutral' },
};

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleString('fr-FR') : '—');

export default function Notifications() {
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState<'list' | 'templates'>('list');
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');
  const [showSend, setShowSend] = useState(false);

  const list = useQuery({
    queryKey: ['notifications', status, channel],
    queryFn: () => {
      const p = new URLSearchParams();
      if (status) p.set('status', status);
      if (channel) p.set('channel', channel);
      const qs = p.toString();
      return get<Notification[]>(`/notifications${qs ? `?${qs}` : ''}`);
    },
    enabled: tab === 'list',
  });

  const templates = useQuery({
    queryKey: ['notification-templates'],
    queryFn: () => get<Template[]>('/notifications/templates'),
    enabled: tab === 'templates',
  });

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Rappels de vaccination et communications aux bénéficiaires"
        actions={hasPermission('notification.send') ? <Button onClick={() => setShowSend(true)}>+ Envoyer</Button> : undefined}
      />

      <div className="flex gap-2 mb-4">
        {(['list', 'templates'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${tab === t ? 'bg-immuniq-navy text-white' : 'bg-surface text-muted border border-line hover:bg-immuniq-mist'}`}>
            {t === 'list' ? 'Envois' : 'Modèles'}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <>
          <Card className="p-4 mb-4 flex flex-wrap gap-3">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
              <option value="">Tous statuts</option>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
            <Select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-40">
              <option value="">Tous canaux</option>
              {Object.entries(CHANNEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Card>
          <Card>
            <ErrorBox error={list.error} />
            {list.isLoading ? <Spinner /> : !list.data || list.data.length === 0 ? (
              <EmptyState message="Aucune notification." />
            ) : (
              <Table head={['Date', 'Canal', 'Destinataire', 'Statut', 'Envoyée le', 'Erreur']}>
                {list.data.map((n) => {
                  const s = STATUS[n.status] ?? STATUS.queued;
                  return (
                    <tr key={n.id}>
                      <td className="px-4 py-3">{fmtDate(n.createdAt)}</td>
                      <td className="px-4 py-3">{CHANNEL[n.channel] ?? n.channel}</td>
                      <td className="px-4 py-3 font-mono text-xs">{n.recipientRef ?? '—'}</td>
                      <td className="px-4 py-3"><Badge tone={s.tone}>{s.label}</Badge></td>
                      <td className="px-4 py-3">{fmtDate(n.sentAt ?? n.deliveredAt)}</td>
                      <td className="px-4 py-3 text-xs text-danger">{n.errorMessage ?? '—'}</td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </Card>
        </>
      )}

      {tab === 'templates' && (
        <Card>
          <ErrorBox error={templates.error} />
          {templates.isLoading ? <Spinner /> : !templates.data || templates.data.length === 0 ? (
            <EmptyState message="Aucun modèle." />
          ) : (
            <Table head={['Code', 'Nom', 'Canal', 'Langue', 'Aperçu du corps']}>
              {templates.data.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-mono text-xs">{t.code}</td>
                  <td className="px-4 py-3">{t.name}</td>
                  <td className="px-4 py-3">{CHANNEL[t.channel] ?? t.channel}</td>
                  <td className="px-4 py-3">{t.locale ?? 'fr'}</td>
                  <td className="px-4 py-3 text-xs text-muted max-w-md truncate">{t.body}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {showSend && <SendModal onClose={() => setShowSend(false)} />}
    </div>
  );
}

function SendModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ channel: 'sms', recipientRef: '', beneficiaryId: '', scheduledAt: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => post('/notifications/send', {
      channel: form.channel,
      recipientRef: form.recipientRef,
      beneficiaryId: form.beneficiaryId || undefined,
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); onClose(); },
    onError: (e) => setError(e instanceof Error ? e.message : 'Erreur'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-4">Envoyer une notification</h2>
        <ErrorBox error={error || null} />
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
          <Field label="Canal">
            <Select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
              {Object.entries(CHANNEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Destinataire (téléphone / identifiant) *">
            <Input value={form.recipientRef} onChange={(e) => setForm({ ...form, recipientRef: e.target.value })} required />
          </Field>
          <Field label="Bénéficiaire (UUID, optionnel)">
            <Input value={form.beneficiaryId} onChange={(e) => setForm({ ...form, beneficiaryId: e.target.value })} placeholder="Lier à un dossier bénéficiaire" />
          </Field>
          <Field label="Planifier pour le">
            <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={mutation.isPending}>Envoyer</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
