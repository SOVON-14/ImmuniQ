import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { login, AuthUser } from '../lib/api';
import { Badge, Button, Input } from '../components/ui';
import { colors, spacing } from '../theme';

export default function LoginScreen({ onLogin }: { onLogin: (u: AuthUser) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [needMfa, setNeedMfa] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const user = await login(username, password, totp || undefined);
      onLogin(user);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur de connexion';
      if (msg.includes('MFA')) setNeedMfa(true);
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>IQ</Text>
        </View>
        <Text style={styles.title}>ImmuniQ</Text>
        <Text style={styles.subtitle}>Vaccinateur · Mode hors ligne</Text>

        <View style={styles.card}>
          <Input label="Identifiant" value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="ex. vaccinateur.tsevi" />
          <Input label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
          {needMfa && (
            <Input
              label="Code MFA (6 chiffres)"
              value={totp}
              onChangeText={(t) => setTotp(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder="000000"
            />
          )}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <Button title={busy ? 'Connexion…' : 'Se connecter'} onPress={submit} disabled={busy || !username || !password} loading={busy} />
        </View>

        <Badge label="Les actes sont enregistrés localement puis synchronisés" tone="info" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.mistLight },
  logoBox: {
    width: 72, height: 72, borderRadius: 18, backgroundColor: colors.teal,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.md,
    shadowColor: colors.teal, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  logoText: { color: '#fff', fontWeight: '800', fontSize: 26 },
  title: { textAlign: 'center', fontSize: 28, fontWeight: '800', color: colors.navy, fontFamily: undefined as never },
  subtitle: { textAlign: 'center', color: colors.muted, fontSize: 13, marginBottom: spacing.xl, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, marginBottom: spacing.lg },
  errorBox: { backgroundColor: '#FED7D7', borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  errorText: { color: colors.danger, fontSize: 13 },
});
