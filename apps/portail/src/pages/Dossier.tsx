import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { PortalRecord } from '../lib/types';
import { Badge, Button, Card, Spinner } from '../components/ui';

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

const DOSE_META: Record<string, { label: string; tone: 'success' | 'warning' | 'info' | 'danger' | 'neutral'; dot: string }> = {
  completed: { label: 'Administrée', tone: 'success', dot: 'bg-success' },
  due: { label: 'À faire', tone: 'warning', dot: 'bg-warning' },
  upcoming: { label: 'À venir', tone: 'info', dot: 'bg-immuniq-teal' },
  overdue: { label: 'En retard', tone: 'danger', dot: 'bg-immuniq-danger' },
  unknown_age: { label: 'Âge inconnu', tone: 'neutral', dot: 'bg-muted' },
};

export default function Dossier() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['portal-record', id],
    queryFn: () => get<PortalRecord>(`/portal/beneficiaries/${id}/record`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold mb-2">Dossier indisponible</h1>
        <p className="text-sm text-muted mb-6">
          Ce dossier n'est pas lié à votre compte ou n'existe pas.
        </p>
        <Link to="/espace">
          <Button variant="ghost">Retour à l'accueil</Button>
        </Link>
      </div>
    );
  }

  const { beneficiary: b, acts, schedule, attestations } = data;
  const upcoming = schedule.vaccines.flatMap((v) =>
    v.doses
      .filter((d) => ['due', 'overdue'].includes(d.status))
      .map((d) => ({ vaccine: v.vaccine, dose: d })),
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* En-tête dossier */}
      <Card className="!bg-gradient-to-br !from-immuniq-navy !to-immuniq-navy-light !border-transparent text-white mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-immuniq-teal-light font-semibold">Dossier vaccinal</p>
            <h1 className="text-2xl font-bold mt-1 !text-white">
              {b.lastName} {b.firstName}
            </h1>
            <p className="text-sm text-white/70 font-mono mt-1">{b.immuniqId}</p>
            <p className="text-xs text-white/60 mt-2">
              Naissance : {fmtDate(b.birthDate)}
              {b.commune ? ` · ${b.commune}` : ''}
            </p>
          </div>
          <Badge tone="info">{schedule.referential ? `Référentiel v${schedule.referential.version ?? '?'}` : '—'}</Badge>
        </div>
      </Card>

      {/* Prochaines doses */}
      {upcoming.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-3">Doses à faire</h2>
          <div className="space-y-2">
            {upcoming.map(({ vaccine, dose }) => (
              <div
                key={`${vaccine.id}-${dose.rule.doseNumber}`}
                className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4"
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${DOSE_META[dose.status].dot}`} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-immuniq-navy">
                    {vaccine.name} — dose {dose.rule.doseNumber}
                  </p>
                  <p className="text-xs text-muted">
                    {dose.status === 'overdue' ? 'En retard — ' : ''}
                    {dose.eligibleAt ? `éligible depuis le ${fmtDate(dose.eligibleAt)}` : ''}
                    {dose.deadlineAt ? ` · limite ${fmtDate(dose.deadlineAt)}` : ''}
                  </p>
                </div>
                <Badge tone={DOSE_META[dose.status].tone}>{DOSE_META[dose.status].label}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historique des vaccinations */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-3">Vaccinations réalisées ({acts.length})</h2>
        <Card className="!p-0 overflow-hidden">
          {acts.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Aucune vaccination enregistrée.</p>
          ) : (
            <ul className="divide-y divide-line">
              {acts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-success shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-immuniq-navy">
                      {a.vaccine?.name ?? 'Vaccin'} — dose {a.doseNumber ?? '?'}
                    </p>
                    <p className="text-xs text-muted">
                      {fmtDate(a.administeredAt)}
                      {a.structure?.name ? ` · ${a.structure.name}` : ''}
                      {a.site ? ` · ${a.site}` : ''}
                    </p>
                  </div>
                  <Badge tone="success">Fait</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Échéancier complet */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-3">Échéancier vaccinal</h2>
        <div className="space-y-3">
          {schedule.vaccines.map((v) => (
            <Card key={v.vaccine.id}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-immuniq-navy">{v.vaccine.name}</h3>
                <Badge
                  tone={
                    v.status === 'complete' ? 'success' : v.status === 'in_progress' ? 'info' : v.status === 'unknown_age' ? 'neutral' : 'warning'
                  }
                >
                  {v.status === 'complete' ? 'Complet' : v.status === 'in_progress' ? 'En cours' : v.status === 'unknown_age' ? 'Âge inconnu' : 'Non commencé'}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {v.doses.map((d) => (
                  <span
                    key={d.rule.doseNumber}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                      DOSE_META[d.status].tone === 'success'
                        ? 'border-green-200 bg-green-50 text-success'
                        : DOSE_META[d.status].tone === 'danger'
                          ? 'border-red-200 bg-red-50 text-immuniq-danger'
                          : DOSE_META[d.status].tone === 'warning'
                            ? 'border-amber-200 bg-amber-50 text-warning'
                            : 'border-line bg-immuniq-mist-light text-muted'
                    }`}
                    title={d.eligibleAt ? `Éligible : ${fmtDate(d.eligibleAt)}` : undefined}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${DOSE_META[d.status].dot}`} />
                    Dose {d.rule.doseNumber} · {DOSE_META[d.status].label}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Attestations */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-3">Attestations ({attestations.length})</h2>
        {attestations.length === 0 ? (
          <Card>
            <p className="text-sm text-muted text-center py-6">
              Aucune attestation délivrée pour le moment. Votre centre de santé peut en émettre une.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {attestations.map((a) => (
              <Card key={a.id} className="!p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-immuniq-navy font-mono">{a.reference}</p>
                  <p className="text-xs text-muted">Délivrée le {fmtDate(a.issuedAt)}</p>
                </div>
                <Badge tone={a.status === 'issued' ? 'success' : 'neutral'}>{a.status}</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="navy" onClick={() => window.print()}>
          🖨 Imprimer / télécharger le carnet vaccinal
        </Button>
        <Link to="/espace/rappels">
          <Button variant="ghost">Gérer mes rappels</Button>
        </Link>
      </div>
    </div>
  );
}
