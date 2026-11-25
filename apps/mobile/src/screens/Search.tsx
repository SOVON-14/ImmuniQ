import { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { get, isNetworkError } from '../lib/api';
import { Badge, Button, Card, Input } from '../components/ui';
import { colors, spacing } from '../theme';

interface Beneficiary {
  id: string;
  immuniqId?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  sex?: string;
  phone?: string;
  status?: string;
}

export default function SearchScreen({ onSelect }: { onSelect: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Beneficiary[] | null>(null);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    if (q.trim().length < 2) return;
    setBusy(true);
    setError('');
    setOffline(false);
    try {
      const data = await get<Beneficiary[]>(`/beneficiaries?q=${encodeURIComponent(q.trim())}`);
      setResults(data);
    } catch (e) {
      if (isNetworkError(e)) {
        setOffline(true);
        setResults(null);
      } else {
        setError(e instanceof Error ? e.message : 'Erreur');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.mistLight, padding: spacing.lg }}>
      <Card>
        <Input
          label="Rechercher un bénéficiaire"
          value={q}
          onChangeText={setQ}
          placeholder="IMQ-id, nom, prénom, téléphone…"
          returnKeyType="search"
          onSubmitEditing={search}
        />
        <Button title={busy ? 'Recherche…' : 'Rechercher'} onPress={search} disabled={busy || q.trim().length < 2} loading={busy} />
        {offline && (
          <View style={{ marginTop: spacing.sm }}>
            <Badge label="Hors ligne — recherche impossible" tone="warning" />
          </View>
        )}
        {error ? <Text style={{ color: colors.danger, fontSize: 13, marginTop: spacing.sm }}>{error}</Text> : null}
      </Card>

      {results !== null && (
        <FlatList
          data={results}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ paddingBottom: 30 }}
          ListEmptyComponent={
            <Card><Text style={{ color: colors.muted, textAlign: 'center', fontSize: 13 }}>Aucun bénéficiaire trouvé.</Text></Card>
          }
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => onSelect(item.id)}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>
                      {item.lastName} {item.firstName}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>
                      {item.immuniqId ?? item.id.slice(0, 8)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.tealDark }}>Ouvrir →</Text>
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
