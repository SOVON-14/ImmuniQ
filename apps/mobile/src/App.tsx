import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { restoreSession, AuthUser, logout as apiLogout } from './lib/api';
import { kv, pendingOps } from './lib/db';
import { pushPending } from './lib/sync';
import { Button, Card, SectionTitle } from './components/ui';
import { colors, spacing } from './theme';
import LoginScreen from './screens/Login';
import HomeScreen from './screens/Home';
import SearchScreen from './screens/Search';
import BeneficiaryScreen from './screens/Beneficiary';
import TemperatureScreen from './screens/Temperature';

type Tab = 'home' | 'search' | 'temp' | 'sync';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'home', label: 'Accueil', icon: '⌂' },
  { key: 'search', label: 'Bénéficiaires', icon: '☺' },
  { key: 'temp', label: 'Température', icon: '❄' },
  { key: 'sync', label: 'Sync', icon: '⚡' },
];

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    restoreSession();
    // La session est restaurée ; /auth/me confirmera au premier appel API.
    setReady(true);
  }, []);

  useEffect(() => {
    setPendingCount(pendingOps.count());
  }, [tab]);

  const onLogin = (u: AuthUser) => setUser(u);

  const onLogout = async () => {
    await apiLogout();
    setUser(null);
  };

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>ImmuniQ</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen onLogin={onLogin} />
      </>
    );
  }

  // Détail bénéficiaire = écran plein écran par-dessus les onglets
  if (selectedBeneficiary) {
    return (
      <>
        <StatusBar style="light" />
        <BeneficiaryScreen id={selectedBeneficiary} onBack={() => setSelectedBeneficiary(null)} />
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.mistLight }}>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        {tab === 'home' && <HomeScreen user={user} />}
        {tab === 'search' && <SearchScreen onSelect={setSelectedBeneficiary} />}
        {tab === 'temp' && <TemperatureScreen />}
        {tab === 'sync' && <SyncPlaceholder user={user} onRefresh={() => setPendingCount(pendingOps.count())} onLogout={onLogout} />}
      </View>

      {/* Barre d'onglets */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabIcon, tab === t.key && { color: colors.teal }]}>{t.icon}</Text>
            <Text style={[styles.tabLabel, tab === t.key && { color: colors.navy, fontWeight: '700' }]}>{t.label}</Text>
            {t.key === 'sync' && pendingCount > 0 && (
              <View style={styles.badgeDot}><Text style={styles.badgeText}>{pendingCount}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// Onglet Sync : file d'opérations + synchronisation manuelle + déconnexion
function SyncPlaceholder({ user, onRefresh, onLogout }: { user: AuthUser; onRefresh: () => void; onLogout: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const sync = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await pushPending();
      setMsg(`${res.summary.applied ?? 0} op(s) appliquée(s), ${res.summary.rejected ?? 0} rejetée(s)`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setBusy(false);
      onRefresh();
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.mistLight }} contentContainerStyle={{ padding: spacing.lg }}>
      <SectionTitle>Synchronisation</SectionTitle>
      <Card>
        <Text style={{ fontSize: 13, color: colors.muted }}>Connecté en tant que</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.navy }}>{user.firstName} {user.lastName}</Text>
      </Card>
      <Card>
        <Text style={{ fontSize: 13, color: colors.muted }}>Opérations en attente</Text>
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.navy }}>{pendingOps.count()}</Text>
        <Text style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
          Dernière sync : {kv.get('last_sync_at')?.slice(0, 16).replace('T', ' ') ?? 'jamais'}
        </Text>
      </Card>
      {msg ? <Text style={{ fontSize: 13, color: colors.tealDark, marginBottom: spacing.sm }}>{msg}</Text> : null}
      <Button title={busy ? 'Synchronisation…' : 'Synchroniser maintenant'} onPress={sync} disabled={busy || pendingOps.count() === 0} loading={busy} />
      <View style={{ height: spacing.lg }} />
      <Button title="Se déconnecter" onPress={onLogout} variant="ghost" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 6, paddingTop: 6,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabIcon: { fontSize: 18, color: colors.muted },
  tabLabel: { fontSize: 10, color: colors.muted, marginTop: 1 },
  badgeDot: {
    position: 'absolute', top: 0, right: '22%',
    backgroundColor: colors.warning, borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});
