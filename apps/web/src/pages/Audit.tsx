import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { AuditEntry } from '../lib/types';
import { Badge, Card, EmptyState, ErrorBox, Field, Input, PageHeader, Spinner, Table } from '../components/ui';

const RESULT_TONE: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  success: 'success',
  failure: 'danger',
  denied: 'warning',
};

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleString('fr-FR') : '—');

export default function Audit() {
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [applied, setApplied] = useState({ action: '', resourceType: '', from: '', to: '' });

  const audit = useQuery({
    queryKey: ['audit-log', applied],
    queryFn: () => {
      const p = new URLSearchParams();
      if (applied.action) p.set('action', applied.action);
      if (applied.resourceType) p.set('resourceType', applied.resourceType);
      if (applied.from) p.set('from', applied.from);
      if (applied.to) p.set('to', applied.to);
      const qs = p.toString();
      return get<AuditEntry[]>(`/admin/audit-log${qs ? `?${qs}` : ''}`);
    },
  });

  const apply = () => setApplied({ action, resourceType, from, to });

  return (
    <div>
      <PageHeader title="Journal d'audit" subtitle="Traçabilité des opérations sensibles" />
      <ErrorBox error={audit.error} />

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <Field label="Action"><Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="ex. auth.login" className="w-44" /></Field>
          <Field label="Type de ressource"><Input value={resourceType} onChange={(e) => setResourceType(e.target.value)} placeholder="ex. user" className="w-44" /></Field>
          <Field label="Du"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Au"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <button onClick={apply} className="px-4 py-2 rounded-md bg-immuniq-navy text-white text-sm font-medium">Filtrer</button>
        </div>
      </Card>

      <Card>
        {audit.isLoading ? <Spinner /> : !audit.data || audit.data.length === 0 ? (
          <EmptyState message="Aucune entrée d'audit." />
        ) : (
          <Table head={['Date', 'Acteur', 'Action', 'Ressource', 'Résultat', 'IP']}>
            {audit.data.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 whitespace-nowrap">{fmtDate(a.createdAt)}</td>
                <td className="px-4 py-3 font-mono text-xs">{a.actorId ? a.actorId.slice(0, 8) : 'système'}</td>
                <td className="px-4 py-3 font-mono text-xs">{a.action}</td>
                <td className="px-4 py-3 text-xs">{a.resourceType ?? '—'}{a.resourceId ? ` (${a.resourceId.slice(0, 8)})` : ''}</td>
                <td className="px-4 py-3"><Badge tone={RESULT_TONE[a.result ?? ''] ?? 'neutral'}>{a.result}</Badge></td>
                <td className="px-4 py-3 text-xs text-muted">{a.ip ?? '—'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
