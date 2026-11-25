import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { get, post } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Beneficiary, VaccinationAct } from '../lib/types';
import {
  Badge, Button, Card, EmptyState, ErrorBox, PageHeader, Spinner, Table,
} from '../components/ui';

interface ScheduleDose {
  rule: { doseNumber: number; minAgeDays?: number; maxAgeDays?: number; minIntervalDays?: number };
  status: 'completed' | 'due' | 'upcoming' | 'overdue' | 'unknown_age';
  eligibleAt?: string;
  deadlineAt?: string;
}

interface ScheduleVaccine {
  vaccine: { id: string; name?: string; code?: string };
  doses: ScheduleDose[];
  status: 'complete' | 'in_progress' | 'not_started' | 'unknown_age';
  nextDueAt?: string;
}

interface Schedule {
  referential: { id: string; code?: string; name?: string; version?: number } | null;
  vaccines: ScheduleVaccine[];
}

interface Attestation {
  id: string;
  reference: string;
  issuedAt: string;
  status: string;
  revokeReason?: string;
}

interface BeneficiaryRecord {
  beneficiary: Beneficiary;
  acts: VaccinationAct[];
}

const DOSE_STATUS: Record<string, { label: string; tone: 'success' | 'info' | 'warning' | 'danger' | 'neutral' }> = {
  completed: { label: 'Administrée', tone: 'success' },
  due: { label: 'À faire', tone: 'warning' },
  upcoming: { label: 'À venir', tone: 'info' },
  overdue: { label: 'En retard', tone: 'danger' },
  unknown_age: { label: 'Âge inconnu', tone: 'neutral' },
};

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

export default function BeneficiaryDetail() {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'dossier' | 'echeancier' | 'attestations'>('dossier');

  const record = useQuery({
    queryKey: ['record', id],
    queryFn: () => get<BeneficiaryRecord>(`/records/${id}`),
    enabled: !!id,
  });

  const schedule = useQuery({
    queryKey: ['schedule', id],
    queryFn: () => get<Schedule>(`/records/${id}/schedule`),
    enabled: !!id && tab === 'echeancier',
  });

  const attestations = useQuery({
    queryKey: ['attestations', id],
    queryFn: () => get<Attestation[]>(`/records/${id}/attestations`),
    enabled: !!id && tab === 'attestations',
  });

  const issue = useMutation({
    mutationFn: () => post<Attestation>(`/records/${id}/attestations`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attestations', id] }),
  });

  if (record.isLoading) return <Spinner />;
  if (record.error || !record.data) {
    return <ErrorBox error={record.error ?? new Error('Bénéficiaire introuvable')} />;
  }

  const b = record.data.beneficiary;
  const acts = record.data.acts ?? [];

  return (
    <div>
      <PageHeader
        title={`${b.lastName ?? ''} ${b.firstName ?? ''}`.trim() || 'Bénéficiaire'}
        subtitle={`IMQ-id : ${b.immuniqId ?? '—'}`}
        actions={<Link to="/beneficiaires" className="text-sm text-immuniq-teal-dark hover:underline">← Retour</Link>}
      />
      <ErrorBox error={issue.error} />

      <Card className="p-5 mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div><span className="text-muted">Naissance :</span> {fmtDate(b.birthDate)}</div>
        <div><span className="text-muted">Sexe :</span> {b.sex ?? '—'}</div>
        <div><span className="text-muted">Téléphone :</span> {b.phone ?? '—'}</div>
        <div><span className="text-muted">Statut :</span> {b.status ?? '—'}</div>
        <div><span className="text-muted">Commune :</span> {b.commune ?? '—'}</div>
        <div><span className="text-muted">Structure :</span> {b.originStructure?.name ?? '—'}</div>
      </Card>

      <div className="flex gap-2 mb-4">
        {(['dossier', 'echeancier', 'attestations'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              tab === t ? 'bg-immuniq-navy text-white' : 'bg-surface text-muted border border-line hover:bg-immuniq-mist'
            }`}
          >
            {t === 'dossier' ? 'Dossier vaccinal' : t === 'echeancier' ? 'Échéancier' : 'Attestations'}
          </button>
        ))}
      </div>

      {tab === 'dossier' && (
        <Card>
          {acts.length === 0 ? (
            <EmptyState message="Aucun acte vaccinal enregistré." />
          ) : (
            <Table head={['Vaccin', 'Dose', 'Statut', 'Date', 'Lieu', 'Lot']}>
              {acts.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">{a.vaccine?.name ?? a.vaccineId ?? '—'}</td>
                  <td className="px-4 py-3">{a.doseNumber ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={a.status === 'administered' ? 'success' : a.status === 'not_performed' ? 'warning' : a.status === 'cancelled' ? 'danger' : 'info'}>
                      {a.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{fmtDate(a.administeredAt)}</td>
                  <td className="px-4 py-3">{a.site ?? '—'}</td>
                  <td className="px-4 py-3">{a.lotNumber ?? '—'}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {tab === 'echeancier' && (
        <div className="space-y-4">
          {schedule.isLoading ? (
            <Spinner />
          ) : !schedule.data || schedule.data.vaccines.length === 0 ? (
            <Card><EmptyState message="Aucun échéancier disponible (référentiel non publié ou pas de règles)." /></Card>
          ) : (
            schedule.data.vaccines.map((sv) => (
              <Card key={sv.vaccine.id} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold">{sv.vaccine.name ?? sv.vaccine.code}</h3>
                </div>
                <Table head={['Dose', 'Statut', 'Éligible le', 'Délai max']}>
                  {sv.doses.map((d) => {
                    const s = DOSE_STATUS[d.status] ?? DOSE_STATUS.unknown_age;
                    return (
                      <tr key={d.rule.doseNumber}>
                        <td className="px-4 py-3">Dose {d.rule.doseNumber}</td>
                        <td className="px-4 py-3"><Badge tone={s.tone}>{s.label}</Badge></td>
                        <td className="px-4 py-3">{fmtDate(d.eligibleAt)}</td>
                        <td className="px-4 py-3">{fmtDate(d.deadlineAt)}</td>
                      </tr>
                    );
                  })}
                </Table>
              </Card>
            ))
          )}
          {schedule.data?.referential && (
            <p className="text-xs text-muted">
              Échéancier calculé depuis le référentiel « {schedule.data.referential.name ?? schedule.data.referential.code} » v{schedule.data.referential.version}.
            </p>
          )}
        </div>
      )}

      {tab === 'attestations' && (
        <Card>
          <div className="p-4 border-b border-line flex justify-between items-center">
            <h3 className="font-bold">Attestations de vaccination</h3>
            {hasPermission('record.issue') && (
              <Button onClick={() => issue.mutate()} disabled={issue.isPending}>
                {issue.isPending ? 'Génération…' : 'Émettre une attestation'}
              </Button>
            )}
          </div>
          {(attestations.data ?? []).length === 0 ? (
            <EmptyState message="Aucune attestation émise." />
          ) : (
            <Table head={['Référence', 'Émise le', 'Statut', 'Motif révocation']}>
              {(attestations.data ?? []).map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-mono text-xs">{a.reference}</td>
                  <td className="px-4 py-3">{fmtDate(a.issuedAt)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={a.status === 'issued' ? 'success' : 'danger'}>{a.status}</Badge>
                  </td>
                  <td className="px-4 py-3">{a.revokeReason ?? '—'}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
