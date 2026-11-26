import { Link } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { PortalItem, PortalRecord } from '../lib/types';
import { Badge, Button, Card, Spinner } from '../components/ui';

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

interface DueItem {
  beneficiaryId: string;
  beneficiaryName: string;
  immuniqId: string;
  vaccineName: string;
  doseNumber: number;
  status: string;
  eligibleAt?: string;
  deadlineAt?: string;
}

export default function Echeances() {
  const { data: items, isLoading } = useQuery({
    queryKey: ['portal-me'],
    queryFn: () => get<PortalItem[]>('/portal/me'),
  });

  const records = useQueries({
    queries: (items ?? []).map((i) => ({
      queryKey: ['portal-record', i.beneficiary.id],
      queryFn: () => get<PortalRecord>(`/portal/beneficiaries/${i.beneficiary.id}/record`),
      enabled: !!items,
    })),
  });

  if (isLoading || records.some((r) => r.isLoading)) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const dues: DueItem[] = [];
  (items ?? []).forEach((item, idx) => {
    const rec = records[idx].data;
    if (!rec) return;
    for (const v of rec.schedule.vaccines) {
      for (const d of v.doses) {
        if (d.status === 'due' || d.status === 'overdue') {
          dues.push({
            beneficiaryId: item.beneficiary.id,
            beneficiaryName: `${item.beneficiary.lastName} ${item.beneficiary.firstName}`,
            immuniqId: item.beneficiary.immuniqId,
            vaccineName: v.vaccine.name ?? 'Vaccin',
            doseNumber: d.rule.doseNumber,
            status: d.status,
            eligibleAt: d.eligibleAt,
            deadlineAt: d.deadlineAt,
          });
        }
      }
    }
  });

  // Tri : retards d'abord, puis par date d'éligibilité
  dues.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'overdue' ? -1 : 1;
    return (a.eligibleAt ?? '').localeCompare(b.eligibleAt ?? '');
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold mb-1">Échéances vaccinales</h1>
      <p className="text-sm text-muted mb-8">
        Les doses à faire pour les dossiers liés à votre compte.
      </p>

      {dues.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-lg font-bold mb-2">Aucune dose en attente</h2>
          <p className="text-sm text-muted">Toutes les vaccinations requises sont à jour.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {dues.map((d, i) => (
            <Card key={`${d.beneficiaryId}-${d.vaccineName}-${d.doseNumber}-${i}`} className={d.status === 'overdue' ? 'border-immuniq-danger/40' : ''}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-immuniq-navy">{d.vaccineName} — dose {d.doseNumber}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {d.beneficiaryName} · {d.immuniqId}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {d.status === 'overdue' ? 'En retard — ' : ''}
                    {d.eligibleAt ? `éligible depuis le ${fmtDate(d.eligibleAt)}` : ''}
                    {d.deadlineAt ? ` · limite ${fmtDate(d.deadlineAt)}` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge tone={d.status === 'overdue' ? 'danger' : 'warning'}>
                    {d.status === 'overdue' ? 'En retard' : 'À faire'}
                  </Badge>
                  <Link to={`/espace/dossier/${d.beneficiaryId}`}>
                    <Button variant="ghost" className="!px-3 !py-1.5 !text-xs">Détail</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
