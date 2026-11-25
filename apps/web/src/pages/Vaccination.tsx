import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Beneficiary, Lot, Vaccine, VaccinationAct } from '../lib/types';
import {
  Badge, Button, Card, EmptyState, ErrorBox, Field, Input, PageHeader, Select, Spinner, Table,
} from '../components/ui';

const ACT_STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  planned: { label: 'Planifié', tone: 'info' },
  administered: { label: 'Administré', tone: 'success' },
  not_performed: { label: 'Non réalisé', tone: 'warning' },
  cancelled: { label: 'Annulé', tone: 'danger' },
};

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

export default function Vaccination() {
  const { hasPermission } = useAuth();
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const acts = useQuery({
    queryKey: ['acts', status],
    queryFn: () =>
      get<VaccinationAct[]>(`/vaccination-acts${status ? `?status=${status}` : ''}`),
  });

  return (
    <div>
      <PageHeader
        title="Actes de vaccination"
        subtitle="Historique et saisie des vaccinations"
        actions={
          hasPermission('act.create') ? (
            <Button onClick={() => setShowCreate(true)}>+ Saisir un acte</Button>
          ) : undefined
        }
      />
      <ErrorBox error={acts.error} />

      <Card className="p-4 mb-4 flex items-center gap-3">
        <span className="text-sm text-muted">Statut :</span>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-56">
          <option value="">Tous</option>
          <option value="planned">Planifié</option>
          <option value="administered">Administré</option>
          <option value="not_performed">Non réalisé</option>
          <option value="cancelled">Annulé</option>
        </Select>
      </Card>

      <Card>
        {acts.isLoading ? (
          <Spinner />
        ) : !acts.data || acts.data.length === 0 ? (
          <EmptyState message="Aucun acte trouvé." />
        ) : (
          <Table head={['Bénéficiaire', 'Vaccin', 'Dose', 'Statut', 'Date', 'Lieu', 'Source']}>
            {acts.data.map((a) => {
              const s = ACT_STATUS[a.status ?? ''] ?? ACT_STATUS.planned;
              return (
                <tr key={a.id} className="hover:bg-immuniq-mist-light">
                  <td className="px-4 py-3 font-mono text-xs">{a.beneficiaryId?.slice(0, 8) ?? '—'}</td>
                  <td className="px-4 py-3">{a.vaccine?.name ?? a.vaccineId?.slice(0, 8) ?? '—'}</td>
                  <td className="px-4 py-3">{a.doseNumber ?? '—'}</td>
                  <td className="px-4 py-3"><Badge tone={s.tone}>{s.label}</Badge></td>
                  <td className="px-4 py-3">{fmtDate(a.administeredAt)}</td>
                  <td className="px-4 py-3">{a.site ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted">{a.source ?? 'online'}</td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      {showCreate && <CreateActModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function BeneficiaryPicker({ value, onChange }: { value: Beneficiary | null; onChange: (b: Beneficiary | null) => void }) {
  const [q, setQ] = useState('');
  const [searched, setSearched] = useState(false);

  const results = useQuery({
    queryKey: ['beneficiaries', 'picker', q],
    queryFn: () => get<Beneficiary[]>(`/beneficiaries?q=${encodeURIComponent(q)}`),
    enabled: searched && q.length >= 2,
  });

  if (value) {
    return (
      <div className="flex items-center justify-between border border-line rounded-md px-3 py-2 bg-immuniq-mist-light">
        <span className="text-sm">
          {value.lastName} {value.firstName} — <span className="font-mono text-xs">{value.immuniqId}</span>
        </span>
        <button type="button" className="text-xs text-danger" onClick={() => onChange(null)}>changer</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <Input
          placeholder="IMQ-id ou nom…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setSearched(true))}
        />
        <Button type="button" variant="secondary" onClick={() => setSearched(true)}>OK</Button>
      </div>
      {searched && results.data && results.data.length > 0 && (
        <ul className="mt-1 border border-line rounded-md divide-y divide-line max-h-48 overflow-y-auto bg-surface">
          {results.data.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-immuniq-mist"
                onClick={() => onChange(b)}
              >
                {b.lastName} {b.firstName} <span className="font-mono text-xs text-muted">{b.immuniqId}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {searched && results.data && results.data.length === 0 && (
        <p className="text-xs text-muted mt-1">Aucun bénéficiaire trouvé.</p>
      )}
    </div>
  );
}

function CreateActModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [vaccineId, setVaccineId] = useState('');
  const [doseNumber, setDoseNumber] = useState('1');
  const [administeredAt, setAdministeredAt] = useState(new Date().toISOString().slice(0, 10));
  const [lotId, setLotId] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [site, setSite] = useState('');
  const [route, setRoute] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('administered');
  const [error, setError] = useState('');

  const vaccines = useQuery({
    queryKey: ['vaccines'],
    queryFn: () => get<Vaccine[]>('/referentials/vaccines'),
  });

  const lots = useQuery({
    queryKey: ['lots'],
    queryFn: () => get<Lot[]>('/stock/lots'),
    retry: false,
  });

  const vaccineList = useMemo(() => {
    const raw = vaccines.data;
    return Array.isArray(raw) ? raw : (((raw as unknown as { items?: Vaccine[] })?.items) ?? []);
  }, [vaccines.data]);

  const lotList = useMemo(() => {
    const raw = lots.data;
    return Array.isArray(raw) ? raw : (((raw as unknown as { items?: Lot[] })?.items) ?? []);
  }, [lots.data]);

  const mutation = useMutation({
    mutationFn: () =>
      post<VaccinationAct>('/vaccination-acts', {
        beneficiaryId: beneficiary!.id,
        vaccineId,
        doseNumber: Number(doseNumber),
        administeredAt: administeredAt ? new Date(administeredAt).toISOString() : undefined,
        lotId: lotId || undefined,
        lotNumber: lotNumber || undefined,
        site: site || undefined,
        route: route || undefined,
        notes: notes || undefined,
        status,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['acts'] });
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Erreur'),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!beneficiary) return setError('Sélectionnez un bénéficiaire');
    if (!vaccineId) return setError('Sélectionnez un vaccin');
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl p-6 my-8">
        <h2 className="text-lg font-bold mb-4">Saisir un acte de vaccination</h2>
        <ErrorBox error={error || null} />
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Bénéficiaire *">
            <BeneficiaryPicker value={beneficiary} onChange={setBeneficiary} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Vaccin *">
              <Select value={vaccineId} onChange={(e) => setVaccineId(e.target.value)} required>
                <option value="">— Choisir —</option>
                {vaccineList.map((v) => (
                  <option key={v.id} value={v.id}>{v.name ?? v.code ?? v.id}</option>
                ))}
              </Select>
            </Field>
            <Field label="Numéro de dose *">
              <Input type="number" min={1} value={doseNumber} onChange={(e) => setDoseNumber(e.target.value)} required />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date d'administration">
              <Input type="date" value={administeredAt} onChange={(e) => setAdministeredAt(e.target.value)} />
            </Field>
            <Field label="Statut">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="administered">Administré</option>
                <option value="planned">Planifié</option>
                <option value="not_performed">Non réalisé</option>
                <option value="cancelled">Annulé</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Lot (stock)">
              <Select value={lotId} onChange={(e) => setLotId(e.target.value)}>
                <option value="">— Aucun —</option>
                {lotList.map((l) => (
                  <option key={l.id} value={l.id}>{l.lotNumber ?? l.id}</option>
                ))}
              </Select>
            </Field>
            <Field label="N° de lot (saisie libre)">
              <Input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} placeholder="Si pas dans le stock" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Lieu / site">
              <Input value={site} onChange={(e) => setSite(e.target.value)} placeholder="Structure, campagne…" />
            </Field>
            <Field label="Voie d'administration">
              <Input value={route} onChange={(e) => setRoute(e.target.value)} placeholder="IM, SC, oral…" />
            </Field>
          </div>

          <Field label="Notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
