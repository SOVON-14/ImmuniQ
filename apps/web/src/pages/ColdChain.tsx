import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Structure } from '../lib/types';
import {
  Badge, Button, Card, EmptyState, ErrorBox, Field, Input, PageHeader, Select, Spinner, Table,
} from '../components/ui';

interface Equipment {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  minTempC: number;
  maxTempC: number;
  structure?: { name?: string };
}

interface Incident {
  id: string;
  equipmentId: string;
  equipment?: { name?: string; code?: string };
  detectedAt: string;
  resolvedAt?: string;
  status: string;
  severity: string;
  description?: string;
  tempMinObserved?: number;
  tempMaxObserved?: number;
  lotDecision?: string;
  decisionReason?: string;
}

const EQ_TYPE: Record<string, string> = {
  refrigerator: 'Réfrigérateur',
  freezer: 'Congélateur',
  cold_room: 'Chambre froide',
  passive_container: 'Conteneur passif',
  cold_box: 'Caisse froide',
  refrigerated_vehicle: 'Véhicule frigorifique',
};

const EQ_STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'neutral' }> = {
  active: { label: 'Actif', tone: 'success' },
  inactive: { label: 'Inactif', tone: 'neutral' },
  maintenance: { label: 'Maintenance', tone: 'warning' },
};

const INC_STATUS: Record<string, { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }> = {
  open: { label: 'Ouvert', tone: 'danger' },
  investigating: { label: 'En investigation', tone: 'warning' },
  resolved: { label: 'Résolu', tone: 'success' },
  closed: { label: 'Clôturé', tone: 'neutral' },
};

const SEVERITY: Record<string, { label: string; tone: 'neutral' | 'warning' | 'danger' }> = {
  low: { label: 'Faible', tone: 'neutral' },
  medium: { label: 'Moyenne', tone: 'warning' },
  high: { label: 'Élevée', tone: 'danger' },
  critical: { label: 'Critique', tone: 'danger' },
};

const DECISION: Record<string, string> = {
  pending: 'En attente',
  quarantine: 'Quarantaine',
  release: 'Libération',
  discard: 'Rejet',
};

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleString('fr-FR') : '—');

export default function ColdChain() {
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState<'equipment' | 'incidents'>('equipment');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);

  const equipment = useQuery({
    queryKey: ['coldchain-equipment'],
    queryFn: () => get<Equipment[]>('/cold-chain/equipment'),
    enabled: tab === 'equipment',
  });

  const incidents = useQuery({
    queryKey: ['coldchain-incidents'],
    queryFn: () => get<Incident[]>('/cold-chain/incidents'),
    enabled: tab === 'incidents',
  });

  return (
    <div>
      <PageHeader
        title="Chaîne du froid"
        subtitle="Équipements de conservation, relevés de température et incidents"
        actions={hasPermission('coldchain.manage') ? <Button onClick={() => setShowCreate(true)}>+ Équipement</Button> : undefined}
      />

      <div className="flex gap-2 mb-4">
        {(['equipment', 'incidents'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${tab === t ? 'bg-immuniq-navy text-white' : 'bg-surface text-muted border border-line hover:bg-immuniq-mist'}`}>
            {t === 'equipment' ? 'Équipements' : 'Incidents'}
          </button>
        ))}
      </div>

      {tab === 'equipment' && (
        <Card>
          <ErrorBox error={equipment.error} />
          {equipment.isLoading ? <Spinner /> : !equipment.data || equipment.data.length === 0 ? (
            <EmptyState message="Aucun équipement." />
          ) : (
            <Table head={['Code', 'Nom', 'Type', 'Structure', 'Plage cible', 'Statut']}>
              {equipment.data.map((e) => {
                const s = EQ_STATUS[e.status] ?? EQ_STATUS.active;
                return (
                  <tr key={e.id}>
                    <td className="px-4 py-3 font-mono text-xs">{e.code}</td>
                    <td className="px-4 py-3">{e.name}</td>
                    <td className="px-4 py-3">{EQ_TYPE[e.type] ?? e.type}</td>
                    <td className="px-4 py-3 text-xs">{e.structure?.name ?? '—'}</td>
                    <td className="px-4 py-3">{e.minTempC}°C → {e.maxTempC}°C</td>
                    <td className="px-4 py-3"><Badge tone={s.tone}>{s.label}</Badge></td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Card>
      )}

      {tab === 'incidents' && (
        <Card>
          <ErrorBox error={incidents.error} />
          {incidents.isLoading ? <Spinner /> : !incidents.data || incidents.data.length === 0 ? (
            <EmptyState message="Aucun incident." />
          ) : (
            <Table head={['Détecté le', 'Équipement', 'Sévérité', 'Statut', 'Décision lot', 'Temp. observées']}>
              {incidents.data.map((i) => {
                const st = INC_STATUS[i.status] ?? INC_STATUS.open;
                const sev = SEVERITY[i.severity] ?? SEVERITY.medium;
                return (
                  <tr key={i.id} className="hover:bg-immuniq-mist-light cursor-pointer" onClick={() => setExpandedIncident(expandedIncident === i.id ? null : i.id)}>
                    <td className="px-4 py-3">{fmtDate(i.detectedAt)}</td>
                    <td className="px-4 py-3">{i.equipment?.name ?? i.equipmentId.slice(0, 8)}</td>
                    <td className="px-4 py-3"><Badge tone={sev.tone}>{sev.label}</Badge></td>
                    <td className="px-4 py-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                    <td className="px-4 py-3">{DECISION[i.lotDecision ?? 'pending'] ?? '—'}</td>
                    <td className="px-4 py-3 text-xs">{i.tempMinObserved ?? '—'}°C / {i.tempMaxObserved ?? '—'}°C</td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Card>
      )}

      {showCreate && <CreateEquipmentModal onClose={() => setShowCreate(false)} />}
      {expandedIncident && <IncidentDetail id={expandedIncident} onClose={() => setExpandedIncident(null)} />}
    </div>
  );
}

function CreateEquipmentModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const structures = useQuery({ queryKey: ['structures'], queryFn: () => get<Structure[]>('/org/structures'), retry: false });
  const [form, setForm] = useState({ code: '', name: '', type: 'refrigerator', structureId: '', minTempC: '2', maxTempC: '8', commissionedAt: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => post('/cold-chain/equipment', {
      ...form,
      minTempC: Number(form.minTempC),
      maxTempC: Number(form.maxTempC),
      structureId: form.structureId || undefined,
      commissionedAt: form.commissionedAt || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coldchain-equipment'] }); onClose(); },
    onError: (e) => setError(e instanceof Error ? e.message : 'Erreur'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4">
      <Card className="w-full max-w-lg p-6">
        <h2 className="text-lg font-bold mb-4">Nouvel équipement</h2>
        <ErrorBox error={error || null} />
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code *"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></Field>
            <Field label="Nom *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(EQ_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Structure">
              <Select value={form.structureId} onChange={(e) => setForm({ ...form, structureId: e.target.value })}>
                <option value="">—</option>
                {(structures.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="T° min *"><Input type="number" step="0.1" value={form.minTempC} onChange={(e) => setForm({ ...form, minTempC: e.target.value })} required /></Field>
            <Field label="T° max *"><Input type="number" step="0.1" value={form.maxTempC} onChange={(e) => setForm({ ...form, maxTempC: e.target.value })} required /></Field>
            <Field label="Mise en service"><Input type="date" value={form.commissionedAt} onChange={(e) => setForm({ ...form, commissionedAt: e.target.value })} /></Field>
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

function IncidentDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [decision, setDecision] = useState('quarantine');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const incident = useQuery({ queryKey: ['incident', id], queryFn: () => get<Incident>(`/cold-chain/incidents/${id}`) });

  const setStatus = useMutation({
    mutationFn: (status: string) => post(`/cold-chain/incidents/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coldchain-incidents'] }),
    onError: (e) => setError(e instanceof Error ? e.message : 'Erreur'),
  });

  const decide = useMutation({
    mutationFn: () => post(`/cold-chain/incidents/${id}/decide`, { lotDecision: decision, reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incident', id] }); qc.invalidateQueries({ queryKey: ['coldchain-incidents'] }); },
    onError: (e) => setError(e instanceof Error ? e.message : 'Erreur'),
  });

  if (incident.isLoading) return <Card className="p-5 mt-4"><Spinner /></Card>;
  const i = incident.data;
  if (!i) return null;
  const st = INC_STATUS[i.status] ?? INC_STATUS.open;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4">
      <Card className="w-full max-w-xl p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-bold">Incident de chaîne du froid</h2>
          <button onClick={onClose} className="text-muted hover:text-ink">✕</button>
        </div>
        <ErrorBox error={error || null} />
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div><span className="text-muted">Détecté :</span> {fmtDate(i.detectedAt)}</div>
          <div><span className="text-muted">Statut :</span> <Badge tone={st.tone}>{st.label}</Badge></div>
          <div><span className="text-muted">Sévérité :</span> {(SEVERITY[i.severity] ?? SEVERITY.medium).label}</div>
          <div><span className="text-muted">Temp. observées :</span> {i.tempMinObserved ?? '—'}°C / {i.tempMaxObserved ?? '—'}°C</div>
          {i.description && <div className="col-span-2"><span className="text-muted">Description :</span> {i.description}</div>}
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {i.status === 'open' && hasPermission('incident.manage') && (
            <Button variant="secondary" onClick={() => setStatus.mutate('investigating')}>Commencer l'investigation</Button>
          )}
          {i.status === 'investigating' && hasPermission('incident.manage') && (
            <Button onClick={() => setStatus.mutate('resolved')}>Marquer résolu</Button>
          )}
          {i.status === 'resolved' && hasPermission('incident.manage') && (
            <Button variant="ghost" onClick={() => setStatus.mutate('closed')}>Clôturer</Button>
          )}
        </div>

        {hasPermission('incident.evaluate') && i.status !== 'closed' && (
          <div className="border-t border-line pt-4">
            <h3 className="font-semibold mb-2 text-sm">Décision sur les lots exposés</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Décision">
                <Select value={decision} onChange={(e) => setDecision(e.target.value)}>
                  <option value="quarantine">Quarantaine</option>
                  <option value="release">Libération</option>
                  <option value="discard">Rejet</option>
                </Select>
              </Field>
              <Field label="Motif *"><Input value={reason} onChange={(e) => setReason(e.target.value)} required /></Field>
            </div>
            <div className="flex justify-end mt-3">
              <Button onClick={() => decide.mutate()} disabled={decide.isPending || !reason}>Enregistrer la décision</Button>
            </div>
            {i.decisionReason && <p className="text-xs text-muted mt-2">Décision actuelle : {DECISION[i.lotDecision ?? ''] ?? '—'} — {i.decisionReason}</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
