import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { get } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Badge, Card, ErrorBox, PageHeader, Spinner, StatCard, Table } from '../components/ui';

interface Coverage {
  totalBeneficiaries: number;
  perVaccine: { vaccineId: string; vaccine: string; vaccinated: number; doses: number; coverageRate: number }[];
}

interface Activity {
  byStatus: { status: string; count: string; beneficiaries: string }[];
}

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planifié',
  administered: 'Administré',
  not_performed: 'Non réalisé',
  cancelled: 'Annulé',
};

const STATUS_TONES: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  planned: 'info',
  administered: 'success',
  not_performed: 'warning',
  cancelled: 'danger',
};

export default function Dashboard() {
  const { user } = useAuth();

  const coverage = useQuery({
    queryKey: ['reports', 'coverage'],
    queryFn: () => get<Coverage>('/reports/coverage'),
  });

  const activity = useQuery({
    queryKey: ['reports', 'activity'],
    queryFn: () => get<Activity>('/reports/activity'),
  });

  const totalDoses = coverage.data?.perVaccine.reduce((s, v) => s + v.doses, 0) ?? 0;

  return (
    <div>
      <PageHeader
        title={`Bonjour, ${user?.firstName ?? ''}`}
        subtitle="Vue d'ensemble de l'activité de vaccination"
      />
      <ErrorBox error={coverage.error ?? activity.error} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Bénéficiaires enregistrés"
          value={coverage.data ? coverage.data.totalBeneficiaries : '—'}
        />
        <StatCard label="Doses administrées" value={coverage.data ? totalDoses : '—'} />
        <StatCard
          label="Actes (par statut)"
          value={activity.data ? activity.data.byStatus.reduce((s, r) => s + Number(r.count), 0) : '—'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="font-bold text-immuniq-navy mb-4">Couverture par vaccin</h2>
          {coverage.isLoading ? (
            <Spinner />
          ) : (
            <Table head={['Vaccin', 'Vaccinés', 'Doses', 'Couverture']}>
              {(coverage.data?.perVaccine ?? []).map((v) => (
                <tr key={v.vaccineId}>
                  <td className="px-4 py-3">{v.vaccine}</td>
                  <td className="px-4 py-3">{v.vaccinated}</td>
                  <td className="px-4 py-3">{v.doses}</td>
                  <td className="px-4 py-3 font-medium">{v.coverageRate} %</td>
                </tr>
              ))}
              {coverage.data && coverage.data.perVaccine.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted">
                    Aucun acte administré pour le moment.
                  </td>
                </tr>
              )}
            </Table>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-bold text-immuniq-navy mb-4">Actes par statut</h2>
          {activity.isLoading ? (
            <Spinner />
          ) : (
            <div className="space-y-3">
              {(activity.data?.byStatus ?? []).map((r) => (
                <div key={r.status} className="flex items-center justify-between">
                  <Badge tone={STATUS_TONES[r.status] ?? 'neutral'}>
                    {STATUS_LABELS[r.status] ?? r.status}
                  </Badge>
                  <div className="text-sm">
                    <span className="font-semibold">{r.count}</span>
                    <span className="text-muted"> actes · {r.beneficiaries} bénéficiaires</span>
                  </div>
                </div>
              ))}
              {activity.data && activity.data.byStatus.length === 0 && (
                <p className="text-muted text-sm">Aucun acte enregistré.</p>
              )}
            </div>
          )}
          <div className="mt-6 pt-4 border-t border-line flex gap-4 text-sm">
            <Link to="/beneficiaires" className="text-immuniq-teal-dark hover:underline">
              Gérer les bénéficiaires →
            </Link>
            <Link to="/vaccination" className="text-immuniq-teal-dark hover:underline">
              Saisir un acte →
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
