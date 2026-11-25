import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { get, post } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Structure } from '../lib/types';
import {
  Badge, Button, Card, EmptyState, ErrorBox, Field, Input, PageHeader, Select, Spinner, Table,
} from '../components/ui';

interface Coverage {
  totalBeneficiaries: number;
  perVaccine: { vaccineId: string; vaccine: string; vaccinated: number; doses: number; coverageRate: number }[];
}
interface Activity { byStatus: { status: string; count: string; beneficiaries: string }[] }
interface StockReport { levels?: unknown[]; [key: string]: unknown }
interface ColdChainReport { total: number; byStatus: Record<string, number>; openIncidents: number; incidents: { id: string; status: string; severity?: string }[] }
type CampaignsReport = { id: string; name?: string; code?: string; status?: string; [key: string]: unknown }[];
interface ExportRecord { id: string; type: string; format: string; rowCount: number; generatedAt?: string; createdAt?: string }

const TABS = ['couverture', 'activite', 'stocks', 'froid', 'campagnes', 'exports'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  couverture: 'Couverture',
  activite: 'Activité',
  stocks: 'Stocks',
  froid: 'Chaîne du froid',
  campagnes: 'Campagnes',
  exports: 'Exports',
};

const ACT_STATUS: Record<string, string> = { planned: 'Planifié', administered: 'Administré', not_performed: 'Non réalisé', cancelled: 'Annulé' };
const EXPORT_TYPE: Record<string, string> = { acts: 'Actes', beneficiaries: 'Bénéficiaires', stock: 'Stocks', campaigns: 'Campagnes' };

export default function Reports() {
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState<Tab>('couverture');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [structureId, setStructureId] = useState('');
  const [exportOpen, setExportOpen] = useState(false);

  const qs = () => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (structureId) p.set('structureId', structureId);
    const s = p.toString();
    return s ? `?${s}` : '';
  };

  const coverage = useQuery({ queryKey: ['report-coverage', from, to, structureId], queryFn: () => get<Coverage>(`/reports/coverage${qs()}`), enabled: tab === 'couverture' });
  const activity = useQuery({ queryKey: ['report-activity', from, to, structureId], queryFn: () => get<Activity>(`/reports/activity${qs()}`), enabled: tab === 'activite' });
  const stock = useQuery({ queryKey: ['report-stock', from, to, structureId], queryFn: () => get<StockReport>(`/reports/stock${qs()}`), enabled: tab === 'stocks' });
  const cold = useQuery({ queryKey: ['report-cold', from, to, structureId], queryFn: () => get<ColdChainReport>(`/reports/cold-chain${qs()}`), enabled: tab === 'froid' });
  const campaigns = useQuery({ queryKey: ['report-campaigns'], queryFn: () => get<CampaignsReport>('/reports/campaigns'), enabled: tab === 'campagnes' });
  const exports = useQuery({ queryKey: ['report-exports'], queryFn: () => get<ExportRecord[]>('/reports/exports'), enabled: tab === 'exports' });
  const structures = useQuery({ queryKey: ['structures'], queryFn: () => get<Structure[]>('/org/structures'), retry: false });

  return (
    <div>
      <PageHeader
        title="Rapports & indicateurs"
        subtitle="Couverture, activité, stocks, chaîne du froid et exports"
        actions={hasPermission('export.create') ? <Button variant="secondary" onClick={() => setExportOpen(true)}>Exporter des données</Button> : undefined}
      />

      <Card className="p-4 mb-4 flex flex-wrap gap-3 items-end">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-sm ${tab === t ? 'bg-immuniq-navy text-white' : 'text-muted hover:bg-immuniq-mist'}`}>
            {TAB_LABELS[t]}
          </button>
        ))}
        <div className="flex gap-2 ml-auto items-end">
          <Field label="Du"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Au"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Field label="Structure">
            <Select value={structureId} onChange={(e) => setStructureId(e.target.value)} className="w-44">
              <option value="">Toutes</option>
              {(structures.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      {tab === 'couverture' && (
        <Card className="p-5">
          <ErrorBox error={coverage.error} />
          {coverage.isLoading ? <Spinner /> : (
            <>
              <p className="text-sm text-muted mb-4">{coverage.data?.totalBeneficiaries ?? 0} bénéficiaires au total</p>
              <Table head={['Vaccin', 'Vaccinés', 'Doses', 'Couverture']}>
                {(coverage.data?.perVaccine ?? []).map((v) => (
                  <tr key={v.vaccineId}>
                    <td className="px-4 py-3">{v.vaccine}</td>
                    <td className="px-4 py-3">{v.vaccinated}</td>
                    <td className="px-4 py-3">{v.doses}</td>
                    <td className="px-4 py-3 font-semibold">{v.coverageRate} %</td>
                  </tr>
                ))}
              </Table>
            </>
          )}
        </Card>
      )}

      {tab === 'activite' && (
        <Card className="p-5">
          <ErrorBox error={activity.error} />
          {activity.isLoading ? <Spinner /> : (
            <Table head={['Statut', 'Actes', 'Bénéficiaires']}>
              {(activity.data?.byStatus ?? []).map((r) => (
                <tr key={r.status}>
                  <td className="px-4 py-3">{ACT_STATUS[r.status] ?? r.status}</td>
                  <td className="px-4 py-3 font-semibold">{r.count}</td>
                  <td className="px-4 py-3">{r.beneficiaries}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {tab === 'stocks' && (
        <Card className="p-5">
          <ErrorBox error={stock.error} />
          {stock.isLoading ? <Spinner /> : (
            <pre className="text-xs bg-immuniq-mist-light rounded-md p-4 overflow-x-auto">{JSON.stringify(stock.data, null, 2)}</pre>
          )}
        </Card>
      )}

      {tab === 'froid' && (
        <Card className="p-5">
          <ErrorBox error={cold.error} />
          {cold.isLoading ? <Spinner /> : cold.data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-immuniq-mist-light rounded-md p-4"><div className="text-xs text-muted">Incidents</div><div className="text-2xl font-bold">{cold.data.total}</div></div>
                <div className="bg-immuniq-mist-light rounded-md p-4"><div className="text-xs text-muted">Ouverts / en cours</div><div className="text-2xl font-bold text-danger">{cold.data.openIncidents}</div></div>
              </div>
              <Table head={['Statut', 'Nombre']}>
                {Object.entries(cold.data.byStatus ?? {}).map(([k, v]) => (
                  <tr key={k}><td className="px-4 py-3">{k}</td><td className="px-4 py-3 font-semibold">{v}</td></tr>
                ))}
              </Table>
            </div>
          ) : null}
        </Card>
      )}

      {tab === 'campagnes' && (
        <Card>
          <ErrorBox error={campaigns.error} />
          {campaigns.isLoading ? <Spinner /> : !campaigns.data || campaigns.data.length === 0 ? (
            <EmptyState message="Aucune campagne." />
          ) : (
            <Table head={['Code', 'Nom', 'Statut']}>
              {campaigns.data.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                  <td className="px-4 py-3">{c.name}</td>
                  <td className="px-4 py-3"><Badge tone={c.status === 'active' ? 'success' : 'neutral'}>{c.status}</Badge></td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {tab === 'exports' && (
        <Card>
          <ErrorBox error={exports.error} />
          {exports.isLoading ? <Spinner /> : !exports.data || exports.data.length === 0 ? (
            <EmptyState message="Aucun export généré." />
          ) : (
            <Table head={['Type', 'Format', 'Lignes', 'Généré le']}>
              {exports.data.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3">{EXPORT_TYPE[e.type] ?? e.type}</td>
                  <td className="px-4 py-3 uppercase">{e.format}</td>
                  <td className="px-4 py-3">{e.rowCount}</td>
                  <td className="px-4 py-3">{e.generatedAt ?? e.createdAt ? new Date((e.generatedAt ?? e.createdAt)!).toLocaleString('fr-FR') : '—'}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {exportOpen && <ExportModal filters={{ from, to, structureId }} onClose={() => setExportOpen(false)} />}
    </div>
  );
}

function ExportModal({ filters, onClose }: { filters: { from: string; to: string; structureId: string }; onClose: () => void }) {
  const [type, setType] = useState('acts');
  const [format, setFormat] = useState('csv');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      post<{ csv?: string; data?: unknown[]; format: string }>('/reports/exports', {
        type,
        format,
        from: filters.from || undefined,
        to: filters.to || undefined,
        structureId: filters.structureId || undefined,
      }),
    onSuccess: (res) => {
      if (res.format === 'csv' && res.csv) {
        const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `immuniq-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `immuniq-${type}-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Erreur'),
  });

  const onSubmit = (e: FormEvent) => { e.preventDefault(); mutation.mutate(); };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-2">Exporter des données</h2>
        <p className="text-xs text-muted mb-4">L'export est journalisé (auteur, périmètre, date) conformément aux exigences CDC.</p>
        <ErrorBox error={error || null} />
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="Type de données">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(EXPORT_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Format">
            <Select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={mutation.isPending}>Générer</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
