import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch } from '../lib/api';
import { PortalItem, PortalNotification, PortalPreference } from '../lib/types';
import { Badge, Button, Card, Field, Spinner } from '../components/ui';

const CHANNELS: { key: PortalPreference['channel']; label: string; icon: string }[] = [
  { key: 'sms', label: 'SMS', icon: '💬' },
  { key: 'push', label: 'Notification push', icon: '🔔' },
  { key: 'portal', label: 'Portail', icon: '🌐' },
  { key: 'email', label: 'E-mail', icon: '✉️' },
];

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

export default function Rappels() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  const { data: items } = useQuery({
    queryKey: ['portal-me'],
    queryFn: () => get<PortalItem[]>('/portal/me'),
  });

  const { data: notifications } = useQuery({
    queryKey: ['portal-notifications'],
    queryFn: () => get<PortalNotification[]>('/portal/notifications'),
  });

  const current = selected ?? items?.[0]?.beneficiary.id ?? null;

  const { data: prefs, isLoading: prefsLoading } = useQuery({
    queryKey: ['portal-prefs', current],
    queryFn: () => get<PortalPreference[]>(`/portal/beneficiaries/${current}/preferences`),
    enabled: !!current,
  });

  const mutation = useMutation({
    mutationFn: (body: { channel: string; optedIn: boolean }) =>
      patch(`/portal/beneficiaries/${current}/preferences`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal-prefs', current] }),
  });

  const prefFor = (channel: string) => prefs?.find((p) => p.channel === channel);

  if (!items || items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold mb-2">Aucun dossier lié</h1>
        <p className="text-sm text-muted">Liez d'abord un dossier pour gérer vos rappels.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold mb-1">Rappels et notifications</h1>
      <p className="text-sm text-muted mb-8">
        Choisissez comment vous souhaitez être prévenu des prochaines échéances.
      </p>

      {/* Sélecteur de dossier */}
      {items.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {items.map((i) => (
            <button
              key={i.beneficiary.id}
              onClick={() => setSelected(i.beneficiary.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                current === i.beneficiary.id
                  ? 'bg-immuniq-teal text-white'
                  : 'bg-surface border border-line text-muted hover:text-immuniq-navy'
              }`}
            >
              {i.beneficiary.firstName} {i.beneficiary.lastName}
            </button>
          ))}
        </div>
      )}

      {/* Préférences */}
      <Card className="mb-8">
        <h2 className="font-bold text-immuniq-navy mb-4">Canaux de rappel</h2>
        {prefsLoading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : (
          <div className="space-y-3">
            {CHANNELS.map((c) => {
              const pref = prefFor(c.key);
              const optedIn = pref?.optedIn ?? false;
              return (
                <div key={c.key} className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{c.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-immuniq-navy">{c.label}</p>
                      <p className="text-xs text-muted">
                        {optedIn ? 'Rappels activés' : 'Rappels désactivés'}
                        {c.key === 'sms' && pref?.phoneOverride ? ` · ${pref.phoneOverride}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => mutation.mutate({ channel: c.key, optedIn: !optedIn })}
                    disabled={mutation.isPending}
                    className={`relative w-12 h-6 rounded-full transition ${optedIn ? 'bg-immuniq-teal' : 'bg-line'}`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${optedIn ? 'left-[26px]' : 'left-0.5'}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted mt-4">
          Sans accord explicite, aucun rappel n'est envoyé sur un canal. Vous pouvez changer d'avis à tout moment.
        </p>
      </Card>

      {/* Historique */}
      <h2 className="font-bold text-immuniq-navy mb-3">Notifications reçues</h2>
      {!notifications || notifications.length === 0 ? (
        <Card>
          <p className="text-sm text-muted text-center py-6">Aucune notification pour le moment.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className="!p-4 flex items-center gap-3">
              <span className="text-lg">🔔</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink truncate">
                  {(n.payload?.title as string) ?? `Rappel ${n.channel}`}
                </p>
                <p className="text-xs text-muted">{fmtDate(n.createdAt)}</p>
              </div>
              <Badge tone={n.channel === 'sms' ? 'info' : n.channel === 'email' ? 'neutral' : 'success'}>
                {n.channel}
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
