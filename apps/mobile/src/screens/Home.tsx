import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Button, Card, Field, SectionTitle } from '../components/ui';
import { isNetworkError, AuthUser } from '../lib/api';
import { kv, pendingOps, PendingOp } from '../lib/db';
import { deviceId, pushPending } from '../lib/sync';
import { colors, spacing } from '../theme';

export default function HomeScreen({ user }: { user: AuthUser }) {
  const [pending, setPending] = useState(pendingOps.count());
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [offline, setOffline] = useState(false);
  const [lastOps, setLastOps] = useState<PendingOp[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setPending(pendingOps.count());
    setLastOps(pendingOps.list().slice(0, 5));
    setRefreshing(false);
  }, []);

  const onSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    setOffline(false);
    try {
      const res = await pushPending();
      const n = res.summary.applied ?? 0;
      setSyncMsg(`${n} opération(s) synchronisée(s)`);
    } catch (e) {
      if (isNetworkError(e)) setOffline(true);
      setSyncMsg(e instanceof Error ? e.message : 'Erreur de synchronisation');
    } finally {
      setSyncing(false);
      refresh();
    }
  };

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.teal} />}
    >
      {/* En-tête vaccinateur */}
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{user.firstName} {user.lastName}</Text>
          <Text style={styles.headerRole}>Vaccinateur · {user.role}</Text>
        </View>
        {pending > 0 && <Badge label={`${pending} en attente`} tone="warning" />}
      </View>

      {/* Barre de synchronisation */}
      <Card style={{ borderColor: offline ? colors.danger : pending > 0 ? colors.warning : colors.success }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.syncTitle}>
              {offline ? 'Hors ligne' : pending > 0 ? 'Mode hors ligne actif' : 'Synchronisé'}
            </Text>
            <Text style={styles.syncSub}>
              {offline
                ? 'Connexion perdue — les actes restent en file locale.'
                : pending > 0
                  ? `${pending} opération(s) en attente de synchronisation.`
                  : 'Aucune opération en attente.'}
            </Text>
            {syncMsg ? <Text style={styles.syncMsg}>{syncMsg}</Text> : null}
          </View>
          <Button title={syncing ? '…' : 'Sync'} onPress={onSync} disabled={pending === 0 || syncing} variant={pending > 0 ? 'primary' : 'ghost'} loading={syncing} />
        </View>
      </Card>

      {/* Actions rapides */}
      <SectionTitle>Actions</SectionTitle>
      <Card>
        <Field label="Appareil" value={deviceId().slice(0, 8) + '…'} />
        <Field label="Opérations locales" value={String(pendingOps.count())} />
        <Field label="Dernière sync" value={kv.get('last_sync_at')?.slice(0, 16).replace('T', ' ') ?? 'jamais'} />
      </Card>

      {/* File locale */}
      {lastOps.length > 0 && (
        <>
          <SectionTitle>Opérations en attente</SectionTitle>
          <Card>
            {lastOps.map((op) => (
                <View key={op.op_id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.mist }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>{op.type}</Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>{op.client_timestamp.slice(0, 16).replace('T', ' ')}</Text>
                  </View>
                  <Badge label={op.status} tone="warning" />
                </View>
              ))}
          </Card>
        </>
      )}

      <Button title="Actualiser" onPress={refresh} variant="ghost" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.mistLight },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.teal,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  headerName: { fontSize: 18, fontWeight: '700', color: colors.navy },
  headerRole: { fontSize: 12, color: colors.muted },
  syncTitle: { fontSize: 15, fontWeight: '700', color: colors.navy },
  syncSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  syncMsg: { fontSize: 11, color: colors.tealDark, marginTop: 4 },
});
