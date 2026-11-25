import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { get, isNetworkError, post } from '../lib/api';
import { Badge, Button, Card, Field, Input, SectionTitle } from '../components/ui';
import { colors, spacing } from '../theme';

interface Equipment {
  id: string;
  code: string;
  name: string;
  type?: string;
  minTempC?: number;
  maxTempC?: number;
  status?: string;
}

const TYPE_LABEL: Record<string, string> = {
  refrigerator: 'Réfrigérateur', freezer: 'Congélateur', cold_room: 'Chambre froide',
  passive_container: 'Conteneur passif', cold_box: 'Caisse froide', refrigerated_vehicle: 'Véhicule',
};

export default function TemperatureScreen() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selected, setSelected] = useState<Equipment | null>(null);
  const [temp, setTemp] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    get<Equipment[]>('/cold-chain/equipment')
      .then(setEquipment)
      .catch((e) => { if (isNetworkError(e)) setOffline(true); });
  }, []);

  const submit = async () => {
    if (!selected || temp === '') return;
    setBusy(true);
    setError('');
    setOk('');
    try {
      await post(`/cold-chain/equipment/${selected.id}/readings`, {
        readings: [{
          recordedAt: new Date().toISOString(),
          temperatureC: Number(temp.replace(',', '.')),
          source: 'manual',
          notes: notes || undefined,
        }],
      });
      setOk(`Relevé enregistré : ${temp} °C sur ${selected.name}`);
      setTemp('');
      setNotes('');
    } catch (e) {
      setError(isNetworkError(e) ? 'Hors ligne — le relevé n\'a pas pu être envoyé.' : e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const tempNum = temp ? Number(temp.replace(',', '.')) : null;
  const outOfRange = selected && tempNum !== null && selected.minTempC !== undefined && selected.maxTempC !== undefined
    ? tempNum < Number(selected.minTempC) || tempNum > Number(selected.maxTempC)
    : false;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.mistLight }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
      <SectionTitle>Relevé de température</SectionTitle>
      {offline && <Badge label="Hors ligne — liste des équipements indisponible" tone="warning" />}

      <Card>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: spacing.sm }}>Équipement</Text>
        {equipment.length === 0 && !offline && <Text style={{ color: colors.muted, fontSize: 13 }}>Chargement…</Text>}
        {equipment.map((e) => (
          <TouchableOpacity key={e.id} onPress={() => setSelected(e)} style={[styles.eqRow, selected?.id === e.id && styles.eqRowActive]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>{e.name}</Text>
              <Text style={{ fontSize: 11, color: colors.muted }}>{TYPE_LABEL[e.type ?? ''] ?? e.type} · {e.code}</Text>
            </View>
            {selected?.id === e.id && <Badge label="Sélectionné" tone="info" />}
          </TouchableOpacity>
        ))}
      </Card>

      {selected && (
        <Card>
          <Field label="Équipement" value={selected.name} />
          <Field label="Plage cible" value={`${selected.minTempC}°C → ${selected.maxTempC}°C`} />
          <Input
            label="Température relevée (°C)"
            value={temp}
            onChangeText={setTemp}
            keyboardType="decimal-pad"
            placeholder="ex. 4,6"
          />
          {outOfRange && (
            <View style={{ backgroundColor: '#FEEBC8', borderRadius: 10, padding: spacing.md, marginBottom: spacing.md }}>
              <Text style={{ color: colors.warning, fontSize: 13, fontWeight: '600' }}>
                ⚠ Valeur hors plage cible — un incident sera peut-être créé.
              </Text>
            </View>
          )}
          <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Optionnel" />
          {error ? <Text style={{ color: colors.danger, fontSize: 13, marginBottom: spacing.sm }}>{error}</Text> : null}
          {ok ? <Text style={{ color: colors.success, fontSize: 13, marginBottom: spacing.sm }}>{ok}</Text> : null}
          <Button title={busy ? 'Envoi…' : 'Enregistrer le relevé'} onPress={submit} disabled={busy || temp === ''} loading={busy} />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  eqRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.mist,
  },
  eqRowActive: { backgroundColor: colors.mistLight, borderRadius: 8, paddingHorizontal: 8 },
});
