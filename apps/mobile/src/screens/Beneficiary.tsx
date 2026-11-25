import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { get, isNetworkError, post } from '../lib/api';
import { pendingOps } from '../lib/db';
import { opId } from '../lib/sync';
import { Badge, Button, Card, Field, Input, SectionTitle } from '../components/ui';
import { colors, radius, spacing } from '../theme';

interface Beneficiary {
  id: string;
  immuniqId?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  sex?: string;
  phone?: string;
}

interface Act {
  id: string;
  doseNumber?: number;
  status?: string;
  administeredAt?: string;
  vaccine?: { name?: string };
  vaccineId?: string;
  lotNumber?: string;
  site?: string;
}

interface ScheduleDose {
  rule: { doseNumber: number };
  status: 'completed' | 'due' | 'upcoming' | 'overdue' | 'unknown_age';
  eligibleAt?: string;
  deadlineAt?: string;
}
interface ScheduleVaccine {
  vaccine: { id: string; name?: string };
  doses: ScheduleDose[];
  status: string;
}

const DOSE_TONE: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'neutral'> = {
  completed: 'success', due: 'warning', upcoming: 'info', overdue: 'danger', unknown_age: 'neutral',
};
const DOSE_LABEL: Record<string, string> = {
  completed: 'Administrée', due: 'À faire', upcoming: 'À venir', overdue: 'En retard', unknown_age: 'Âge inconnu',
};
const ACT_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  administered: 'success', not_performed: 'warning', cancelled: 'danger', planned: 'info',
};
const ACT_LABEL: Record<string, string> = {
  administered: 'Administré', not_performed: 'Non réalisé', cancelled: 'Annulé', planned: 'Planifié',
};

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');
const age = (birth?: string) => {
  if (!birth) return '—';
  const months = Math.floor((Date.now() - new Date(birth).getTime()) / (30.44 * 86400000));
  return months < 24 ? `${months} mois` : `${Math.floor(months / 12)} ans`;
};

export default function BeneficiaryScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const [tab, setTab] = useState<'dossier' | 'echeancier'>('dossier');
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [acts, setActs] = useState<Act[]>([]);
  const [schedule, setSchedule] = useState<ScheduleVaccine[]>([]);
  const [referential, setReferential] = useState<{ code?: string; version?: number } | null>(null);
  const [error, setError] = useState('');
  const [showActForm, setShowActForm] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const record = await get<{ beneficiary: Beneficiary; acts: Act[] }>(`/records/${id}`);
      setBeneficiary(record.beneficiary);
      setActs(record.acts ?? []);
    } catch (e) {
      if (!isNetworkError(e)) setError(e instanceof Error ? e.message : 'Erreur');
      // en hors ligne : impossible de charger le dossier distant
    }
  }, [id]);

  const loadSchedule = useCallback(async () => {
    try {
      const s = await get<{ referential: { code?: string; version?: number } | null; vaccines: ScheduleVaccine[] }>(`/records/${id}/schedule`);
      setSchedule(s.vaccines ?? []);
      setReferential(s.referential);
    } catch { /* silencieux */ }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'echeancier') loadSchedule(); }, [tab, loadSchedule]);

  const nextDose = schedule.flatMap((v) => v.doses).find((d) => d.status === 'due' || d.status === 'overdue');

  return (
    <View style={{ flex: 1, backgroundColor: colors.mistLight }}>
      {/* En-tête */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><Text style={styles.backText}>←</Text></TouchableOpacity>
        <Text style={styles.topTitle}>Dossier vaccinal</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
        {beneficiary && (
          <Card>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.navy }}>
              {beneficiary.lastName} {beneficiary.firstName}
            </Text>
            <View style={{ marginTop: spacing.sm, gap: 4 }}>
              <Field label="IMQ-id" value={beneficiary.immuniqId ?? '—'} />
              <Field label="Âge" value={age(beneficiary.birthDate)} />
              <Field label="Naissance" value={fmtDate(beneficiary.birthDate)} />
              <Field label="Téléphone" value={beneficiary.phone ?? '—'} />
            </View>
          </Card>
        )}

        {nextDose && (
          <Card style={{ borderColor: colors.warning }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.warning }}>⚠ Prochaine dose en retard / à faire</Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
              Dose {nextDose.rule.doseNumber} — éligible depuis le {fmtDate(nextDose.eligibleAt)}
            </Text>
          </Card>
        )}

        {/* Onglets */}
        <View style={styles.tabs}>
          {(['dossier', 'echeancier'] as const).map((t) => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'dossier' ? 'Dossier' : 'Échéancier'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={{ color: colors.danger, fontSize: 13, marginBottom: spacing.sm }}>{error} — mode hors ligne : seules les données en cache sont visibles.</Text> : null}

        {tab === 'dossier' && (
          <>
            <SectionTitle>Actes enregistrés ({acts.length})</SectionTitle>
            <Card>
              {acts.length === 0 ? (
                <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 13 }}>Aucun acte.</Text>
              ) : (
                acts.map((a) => (
                  <View key={a.id} style={styles.actRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>{a.vaccine?.name ?? 'Vaccin'}</Text>
                      <Text style={{ fontSize: 11, color: colors.muted }}>
                        Dose {a.doseNumber ?? '?'} · {fmtDate(a.administeredAt)}{a.lotNumber ? ` · lot ${a.lotNumber}` : ''}
                      </Text>
                    </View>
                    <Badge label={ACT_LABEL[a.status ?? ''] ?? a.status ?? ''} tone={ACT_TONE[a.status ?? ''] ?? 'neutral'} />
                  </View>
                ))
              )}
            </Card>
          </>
        )}

        {tab === 'echeancier' && (
          <>
            {referential && (
              <Text style={{ fontSize: 11, color: colors.muted, marginBottom: spacing.sm }}>
                Référentiel {referential.code ?? ''} v{referential.version ?? '?'}
              </Text>
            )}
            {schedule.length === 0 ? (
              <Card><Text style={{ color: colors.muted, textAlign: 'center', fontSize: 13 }}>Aucun échéancier disponible hors ligne.</Text></Card>
            ) : (
              schedule.map((sv) => (
                <Card key={sv.vaccine.id}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.navy, marginBottom: spacing.sm }}>
                    {sv.vaccine.name}
                  </Text>
                  {sv.doses.map((d) => (
                    <View key={d.rule.doseNumber} style={styles.actRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.ink }}>Dose {d.rule.doseNumber}</Text>
                        <Text style={{ fontSize: 11, color: colors.muted }}>
                          {d.eligibleAt ? `Éligible : ${fmtDate(d.eligibleAt)}` : ''}
                          {d.deadlineAt ? ` · limite : ${fmtDate(d.deadlineAt)}` : ''}
                        </Text>
                      </View>
                      <Badge label={DOSE_LABEL[d.status] ?? d.status} tone={DOSE_TONE[d.status] ?? 'neutral'} />
                    </View>
                  ))}
                </Card>
              ))
            )}
          </>
        )}

        <Button title="+ Enregistrer une vaccination" onPress={() => setShowActForm(true)} />
      </ScrollView>

      {showActForm && <ActForm beneficiaryId={id} onClose={() => setShowActForm(false)} onDone={() => { setShowActForm(false); load(); }} />}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Formulaire d'acte : en ligne si possible, sinon file locale         */
/* ------------------------------------------------------------------ */

function ActForm({ beneficiaryId, onClose, onDone }: { beneficiaryId: string; onClose: () => void; onDone: () => void }) {
  const [vaccineId, setVaccineId] = useState('');
  const [doseNumber, setDoseNumber] = useState('1');
  const [lotNumber, setLotNumber] = useState('');
  const [site, setSite] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('administered');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    const payload = {
      beneficiaryId,
      vaccineId: vaccineId || undefined,
      doseNumber: Number(doseNumber) || 1,
      administeredAt: status === 'administered' ? new Date().toISOString() : undefined,
      lotNumber: lotNumber || undefined,
      site: site || undefined,
      notes: notes || undefined,
      status,
    };

    const id = opId();
    try {
      // Tente l'envoi direct d'abord (mode en ligne)
      await post('/vaccination-acts', { ...payload, localId: id });
      onDone();
    } catch (e) {
      if (isNetworkError(e)) {
        // Hors ligne → file locale idempotente, synchronisée plus tard via /sync/push
        pendingOps.enqueue({ opId: id, type: 'act.create', payload });
        onDone();
      } else {
        setError(e instanceof Error ? e.message : 'Erreur');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.modalBg}>
      <View style={styles.modal}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.navy, marginBottom: spacing.md }}>Nouvel acte</Text>
        {error ? <Text style={{ color: colors.danger, fontSize: 12, marginBottom: spacing.sm }}>{error}</Text> : null}

        <Input label="ID vaccin (UUID)" value={vaccineId} onChangeText={setVaccineId} placeholder="Laisser vide si inconnu" autoCapitalize="none" />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Input label="Dose n°" value={doseNumber} onChangeText={setDoseNumber} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 2 }}>
            <Input label="N° de lot" value={lotNumber} onChangeText={setLotNumber} />
          </View>
        </View>
        <Input label="Lieu / site" value={site} onChangeText={setSite} placeholder="Structure, campagne…" />
        <Input label="Notes" value={notes} onChangeText={setNotes} />

        <Text style={styles.label}>Statut</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          {(['administered', 'not_performed', 'cancelled'] as const).map((s) => (
            <TouchableOpacity key={s} style={[styles.chip, status === s && styles.chipActive]} onPress={() => setStatus(s)}>
              <Text style={[styles.chipText, status === s && styles.chipTextActive]}>
                {ACT_LABEL[s]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}><Button title="Annuler" onPress={onClose} variant="ghost" /></View>
          <View style={{ flex: 1 }}><Button title={busy ? '…' : 'Valider'} onPress={submit} disabled={busy} loading={busy} /></View>
        </View>
        <Text style={{ fontSize: 10, color: colors.muted, textAlign: 'center', marginTop: spacing.sm }}>
          Hors ligne ? L'acte est mis en file et synchronisé automatiquement.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md,
    backgroundColor: colors.navy,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#fff', fontSize: 18 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  tabs: { flexDirection: 'row', backgroundColor: colors.mist, borderRadius: radius.md, padding: 4, marginBottom: spacing.md },
  tab: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  tabTextActive: { color: colors.navy },
  actRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.mist },
  label: { fontSize: 11, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,56,96,.5)', justifyContent: 'center', padding: spacing.xl },
  modal: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl },
  chip: { flex: 1, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  chipTextActive: { color: '#fff' },
});
