import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { PortalItem, PortalNotification } from '../lib/types';
import { Badge, Button, Card, Spinner } from '../components/ui';

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

export default function Dashboard() {
  const { data: items, isLoading } = useQuery({
    queryKey: ['portal-me'],
    queryFn: () => get<PortalItem[]>('/portal/me'),
  });

  const { data: notifications } = useQuery({
    queryKey: ['portal-notifications'],
    queryFn: () => get<PortalNotification[]>('/portal/notifications'),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const empty = !items || items.length === 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold mb-1">Bonjour</h1>
      <p className="text-sm text-muted mb-8">Votre espace santé vaccinale en un coup d'œil.</p>

      {empty ? (
        <Card className="text-center py-12">
          <div className="text-4xl mb-4">💉</div>
          <h2 className="text-lg font-bold mb-2">Aucun dossier lié</h2>
          <p className="text-sm text-muted max-w-sm mx-auto mb-6">
            Liez votre dossier vaccinal pour consulter vos vaccinations et échéances.
          </p>
          <Link to="/espace/lien">
            <Button>Lier mon dossier</Button>
          </Link>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <Link key={item.beneficiary.id} to={`/espace/dossier/${item.beneficiary.id}`}>
                <Card className="hover:border-immuniq-teal hover:shadow-md transition cursor-pointer h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-immuniq-navy">
                        {item.beneficiary.lastName} {item.beneficiary.firstName}
                      </h2>
                      <p className="text-xs text-muted font-mono mt-0.5">{item.beneficiary.immuniqId}</p>
                    </div>
                    <Badge tone={item.relation === 'self' ? 'info' : 'neutral'}>
                      {item.relation === 'self' ? 'Vous' : 'MINEUR / PROCHE'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted mt-3">
                    Naissance : {fmtDate(item.beneficiary.birthDate)}
                    {item.beneficiary.commune ? ` · ${item.beneficiary.commune}` : ''}
                  </p>
                  <p className="text-sm font-medium text-immuniq-teal-dark mt-3">Voir le dossier →</p>
                </Card>
              </Link>
            ))}
            <Link to="/espace/lien">
              <Card className="border-dashed !border-immuniq-teal/40 h-full flex flex-col items-center justify-center text-center py-10 cursor-pointer hover:bg-immuniq-mist-light transition">
                <span className="text-2xl mb-2">+</span>
                <p className="text-sm font-semibold text-immuniq-navy">Ajouter un dossier</p>
                <p className="text-xs text-muted mt-1">Enfant ou proche sous votre responsabilité</p>
              </Card>
            </Link>
          </div>

          {notifications && notifications.length > 0 && (
            <div className="mt-10">
              <h2 className="text-lg font-bold mb-4">Dernières notifications</h2>
              <div className="space-y-2">
                {notifications.slice(0, 5).map((n) => (
                  <Card key={n.id} className="!p-4 flex items-center gap-3">
                    <span className="text-lg">🔔</span>
                    <div className="flex-1">
                      <p className="text-sm text-ink">
                        {(n.payload?.title as string) ?? `Notification ${n.channel}`}
                      </p>
                      <p className="text-xs text-muted">{fmtDate(n.createdAt)}</p>
                    </div>
                    <Badge tone={n.status === 'delivered' ? 'success' : n.status === 'failed' ? 'danger' : 'info'}>
                      {n.status}
                    </Badge>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
