import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, post } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  Badge, Button, Card, EmptyState, ErrorBox, Field, Input, PageHeader, Select, Spinner, Table,
} from '../components/ui';

interface Setting {
  id: string;
  key: string;
  value: unknown;
  category?: string;
  description?: string;
}

interface Nomenclature {
  id: string;
  domain: string;
  code: string;
  label: string;
  parentCode?: string;
  sortOrder: number;
  active: boolean;
}

interface Retention {
  id: string;
  dataType: string;
  retentionDays: number;
  legalBasis?: string;
  active: boolean;
}

interface Backup {
  id: string;
  type: string;
  status: string;
  sizeBytes?: number;
  storageRef?: string;
  errorMessage?: string;
  startedAt: string;
  finishedAt?: string;
}

const TABS = ['parametres', 'nomenclatures', 'retention', 'sauvegardes'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { parametres: 'Paramètres', nomenclatures: 'Nomenclatures', retention: 'Rétention', sauvegardes: 'Sauvegardes' };

const BACKUP_STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  running: { label: 'En cours', tone: 'info' },
  completed: { label: 'Terminée', tone: 'success' },
  failed: { label: 'Échec', tone: 'danger' },
};

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleString('fr-FR') : '—');

export default function Admin() {
  const [tab, setTab] = useState<Tab>('parametres');

  return (
    <div>
      <PageHeader title="Administration" subtitle="Paramétrage, nomenclatures, rétention et sauvegardes" />
      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${tab === t ? 'bg-immuniq-navy text-white' : 'bg-surface text-muted border border-line hover:bg-immuniq-mist'}`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'parametres' && <SettingsTab />}
      {tab === 'nomenclatures' && <NomenclaturesTab />}
      {tab === 'retention' && <RetentionTab />}
      {tab === 'sauvegardes' && <BackupsTab />}
    </div>
  );
}

function SettingsTab() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState('');

  const settings = useQuery({
    queryKey: ['admin-settings', category],
    queryFn: () => get<Setting[]>(`/admin/settings${category ? `?category=${category}` : ''}`),
  });

  const save = useMutation({
    mutationFn: ({ key, val }: { key: string; val: unknown }) =>
      patch(`/admin/settings/${key}`, { value: val }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-settings'] }); setEditing(null); },
  });

  return (
    <Card>
      <div className="p-4 border-b border-line flex gap-3 items-center">
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-52">
          <option value="">Toutes catégories</option>
        </Select>
        <ErrorBox error={settings.error ?? save.error} />
      </div>
      {settings.isLoading ? <Spinner /> : !settings.data || settings.data.length === 0 ? (
        <EmptyState message="Aucun paramètre." />
      ) : (
        <Table head={['Clé', 'Valeur', 'Catégorie', 'Description', 'Actions']}>
          {settings.data.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3 font-mono text-xs">{s.key}</td>
              <td className="px-4 py-3">
                {editing === s.key ? (
                  <Input value={value} onChange={(e) => setValue(e.target.value)} className="w-48" />
                ) : (
                  <span className="text-xs">{typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value ?? '—')}</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs">{s.category ?? '—'}</td>
              <td className="px-4 py-3 text-xs text-muted">{s.description ?? '—'}</td>
              <td className="px-4 py-3">
                {hasPermission('settings.manage') && (
                  editing === s.key ? (
                    <button className="text-xs text-success hover:underline" onClick={() => {
                      let parsed: unknown = value;
                      try { parsed = JSON.parse(value); } catch { /* garder chaîne */ }
                      save.mutate({ key: s.key, val: parsed });
                    }}>Enregistrer</button>
                  ) : (
                    <button className="text-xs text-immuniq-teal-dark hover:underline" onClick={() => { setEditing(s.key); setValue(typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value ?? '')); }}>Modifier</button>
                  )
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}

function NomenclaturesTab() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [domain, setDomain] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ domain: '', code: '', label: '', parentCode: '', sortOrder: '0' });
  const [error, setError] = useState('');

  const list = useQuery({
    queryKey: ['nomenclatures', domain],
    queryFn: () => get<Nomenclature[]>(`/admin/nomenclatures${domain ? `?domain=${domain}` : ''}`),
  });

  const create = useMutation({
    mutationFn: () => post('/admin/nomenclatures', { ...form, sortOrder: Number(form.sortOrder) || 0, parentCode: form.parentCode || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['nomenclatures'] }); setShowCreate(false); setForm({ domain: '', code: '', label: '', parentCode: '', sortOrder: '0' }); },
    onError: (e) => setError(e instanceof Error ? e.message : 'Erreur'),
  });

  return (
    <Card>
      <div className="p-4 border-b border-line flex gap-3 items-center">
        <Input placeholder="Filtrer par domaine…" value={domain} onChange={(e) => setDomain(e.target.value)} className="w-56" />
        {hasPermission('nomenclature.manage') && <Button variant="secondary" onClick={() => setShowCreate(!showCreate)}>+ Entrée</Button>}
      </div>
      {showCreate && (
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); create.mutate(); }} className="p-4 border-b border-line grid grid-cols-5 gap-2 items-end">
          <Field label="Domaine *"><Input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} required /></Field>
          <Field label="Code *"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></Field>
          <Field label="Libellé *"><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required /></Field>
          <Field label="Parent"><Input value={form.parentCode} onChange={(e) => setForm({ ...form, parentCode: e.target.value })} /></Field>
          <div className="flex gap-2">
            <Field label="Ordre"><Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></Field>
            <Button type="submit" disabled={create.isPending}>OK</Button>
          </div>
        </form>
      )}
      <ErrorBox error={list.error ?? create.error ?? (error || null)} />
      {list.isLoading ? <Spinner /> : !list.data || list.data.length === 0 ? (
        <EmptyState message="Aucune nomenclature." />
      ) : (
        <Table head={['Domaine', 'Code', 'Libellé', 'Parent', 'Ordre', 'Actif']}>
          {list.data.map((n) => (
            <tr key={n.id}>
              <td className="px-4 py-3 text-xs">{n.domain}</td>
              <td className="px-4 py-3 font-mono text-xs">{n.code}</td>
              <td className="px-4 py-3">{n.label}</td>
              <td className="px-4 py-3 font-mono text-xs">{n.parentCode ?? '—'}</td>
              <td className="px-4 py-3">{n.sortOrder}</td>
              <td className="px-4 py-3"><Badge tone={n.active ? 'success' : 'neutral'}>{n.active ? 'Oui' : 'Non'}</Badge></td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}

function RetentionTab() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [editDays, setEditDays] = useState<Record<string, string>>({});

  const list = useQuery({ queryKey: ['retentions'], queryFn: () => get<Retention[]>('/admin/retention') });

  const save = useMutation({
    mutationFn: ({ dataType, days }: { dataType: string; days: number }) =>
      patch(`/admin/retention/${dataType}`, { retentionDays: days }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['retentions'] }),
  });

  return (
    <Card>
      <ErrorBox error={list.error ?? save.error} />
      {list.isLoading ? <Spinner /> : !list.data || list.data.length === 0 ? (
        <EmptyState message="Aucune politique de rétention." />
      ) : (
        <Table head={['Type de données', 'Durée (jours)', 'Base légale', 'Actif', 'Actions']}>
          {list.data.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-mono text-xs">{r.dataType}</td>
              <td className="px-4 py-3">
                {hasPermission('retention.manage') ? (
                  <Input type="number" min={1} value={editDays[r.dataType] ?? String(r.retentionDays)}
                    onChange={(e) => setEditDays({ ...editDays, [r.dataType]: e.target.value })} className="w-28" />
                ) : r.retentionDays}
              </td>
              <td className="px-4 py-3 text-xs text-muted">{r.legalBasis ?? '—'}</td>
              <td className="px-4 py-3"><Badge tone={r.active ? 'success' : 'neutral'}>{r.active ? 'Oui' : 'Non'}</Badge></td>
              <td className="px-4 py-3">
                {hasPermission('retention.manage') && (
                  <button className="text-xs text-immuniq-teal-dark hover:underline"
                    onClick={() => save.mutate({ dataType: r.dataType, days: Number(editDays[r.dataType] ?? r.retentionDays) })}>
                    Enregistrer
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}

function BackupsTab() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [error, setError] = useState('');

  const list = useQuery({ queryKey: ['backups'], queryFn: () => get<Backup[]>('/admin/backups') });

  const trigger = useMutation({
    mutationFn: () => post('/admin/backups', { type: 'full' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backups'] }),
    onError: (e) => setError(e instanceof Error ? e.message : 'Erreur'),
  });

  return (
    <Card>
      <div className="p-4 border-b border-line flex justify-between items-center">
        <h3 className="font-semibold">Sauvegardes de la base de données</h3>
        {hasPermission('backup.manage') && <Button variant="secondary" onClick={() => trigger.mutate()} disabled={trigger.isPending}>+ Lancer une sauvegarde</Button>}
      </div>
      <ErrorBox error={error || null} />
      {list.isLoading ? <Spinner /> : !list.data || list.data.length === 0 ? (
        <EmptyState message="Aucune sauvegarde." />
      ) : (
        <Table head={['Type', 'Statut', 'Taille', 'Référence', 'Début', 'Fin']}>
          {list.data.map((b) => {
            const s = BACKUP_STATUS[b.status] ?? BACKUP_STATUS.running;
            return (
              <tr key={b.id}>
                <td className="px-4 py-3">{b.type}</td>
                <td className="px-4 py-3"><Badge tone={s.tone}>{s.label}</Badge></td>
                <td className="px-4 py-3">{b.sizeBytes != null ? `${(Number(b.sizeBytes) / 1024 / 1024).toFixed(1)} Mo` : '—'}</td>
                <td className="px-4 py-3 font-mono text-xs">{b.storageRef ?? '—'}</td>
                <td className="px-4 py-3">{fmtDate(b.startedAt)}</td>
                <td className="px-4 py-3">{fmtDate(b.finishedAt)}</td>
              </tr>
            );
          })}
        </Table>
      )}
    </Card>
  );
}
