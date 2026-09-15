import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadUserProfile } from '@/lib/profile-storage';
import { buildAdaptiveWorkout } from '@/lib/training-progression';
import { getTodayTrainingDay } from '@/lib/training-schedule';
import { createSessionRecord, prepareSession } from '@/lib/workout-session';
import type { BlockOutcome, DailyReadiness, PlannedWorkout } from '@/types/training';

export default function ActiveWorkoutScreen() {
  const [plan, setPlan] = useState<PlannedWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [readiness, setReadiness] = useState<Partial<DailyReadiness>>({});
  const [started, setStarted] = useState(false);
  const [outcomes, setOutcomes] = useState<Record<string, Partial<BlockOutcome>>>({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const sessionId = useRef(Date.now());
  useEffect(() => {
    loadUserProfile().then(async (profile) => {
      if (!profile.onboardingComplete) { router.replace('/setup'); return; }
      const today = getTodayTrainingDay(profile.trainingDays);
      const saved = await AsyncStorage.getItem('workouts');
      const history = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(history)) throw new Error('Could not read workout history.');
      if (today) setPlan(buildAdaptiveWorkout(profile, today, history));
    }).catch(() => setError('Could not load your workout. Return home and try again.'))
      .finally(() => setLoading(false));
  }, []);
  const ready = readiness.energy !== undefined && readiness.soreness !== undefined && readiness.pain !== undefined;
  const session = plan && ready ? prepareSession(plan, readiness as DailyReadiness) : null;

  async function save() {
    if (!plan || !session || !ready || savingRef.current) return;
    setError('');
    try {
      const completed = session.blocks.map((b) => ({ blockId: b.id,
        status: outcomes[b.id]?.status, clean: outcomes[b.id]?.clean,
        actual: outcomes[b.id]?.actual?.trim() || '' }));
      const record = createSessionRecord(sessionId.current, new Date().toISOString(), plan,
        readiness as DailyReadiness, completed as BlockOutcome[], notes);
      savingRef.current = true; setSaving(true);
      const saved = await AsyncStorage.getItem('workouts');
      const history = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(history)) throw new Error('Saved history could not be read.');
      if (!history.some((item) => item.id === record.id)) history.push(record);
      await AsyncStorage.setItem('workouts', JSON.stringify(history));
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.');
      savingRef.current = false; setSaving(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ margin: 40 }} accessibilityLabel="Loading workout" />;
  return <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <View style={styles.shell}>
      <Text style={styles.brand}>LOADTOAD PT</Text>
      <Text style={styles.title}>{started ? session?.title : 'Before You Start'}</Text>
      {!plan && <Text style={styles.body}>{error || 'Today is a recovery day. No workout is scheduled.'}</Text>}
      {plan && !started && <>
        <Text style={styles.body}>{plan.title}</Text>
        <Text style={styles.body}>Check in so today’s session matches how you feel.</Text>
        {(['energy', 'soreness', 'pain'] as const).map((key) => <View key={key} style={styles.card}>
          <Text style={styles.heading}>{key === 'energy' ? 'Energy: 1 very low · 5 high' : `${key === 'pain' ? 'Pain' : 'Soreness'}: 1 none · 5 high`}</Text>
          <View style={styles.row}>{([1, 2, 3, 4, 5] as const).map((value) => <Pressable key={value}
            accessibilityRole="radio" accessibilityLabel={`${key} ${value}`} accessibilityState={{ checked: readiness[key] === value }}
            style={[styles.choice, readiness[key] === value && styles.selected]}
            onPress={() => setReadiness({ ...readiness, [key]: value })}>
            <Text style={styles.body}>{value}</Text>
          </Pressable>)}</View>
        </View>)}
        {session && <Text style={styles.body}>{session.subtitle}</Text>}
        <Pressable accessibilityRole="button" disabled={!ready} style={[styles.button, !ready && styles.disabled]} onPress={() => setStarted(true)}>
          <Text style={styles.buttonText}>View My Session</Text>
        </Pressable>
      </>}
      {started && session && <>
        <Text style={styles.body}>{session.subtitle}</Text>
        <Text style={styles.body}>Choose Completed cleanly only when you met the full target with good form, without pain or extra strain. Otherwise choose Missed target or Skipped. Record actual work where useful.</Text>
        {session.guardrails.map((rule, i) => <Text key={i} style={styles.body}>• {rule}</Text>)}
        {session.blocks.map((b, i) => <View key={b.id} style={styles.card}>
          <Text style={styles.heading}>{i + 1}. {b.title}</Text>
          <Text style={styles.body}>{b.prescription}</Text>
          {!!b.coaching && <Text style={styles.body}>{b.coaching}</Text>}
          {!!b.purpose && <Text style={styles.body}>{b.purpose}</Text>}
          {b.progression && <Text style={styles.body}>{b.progression.reason}</Text>}
          <View style={styles.row}>{(['completed', 'missed', 'skipped'] as const).map((status) => <Pressable key={status}
            accessibilityRole="radio" accessibilityLabel={`${b.title}: ${status}`} accessibilityState={{ checked: outcomes[b.id]?.status === status }}
            style={[styles.choice, outcomes[b.id]?.status === status && styles.selected]} disabled={saving}
            onPress={() => setOutcomes({ ...outcomes, [b.id]: { ...outcomes[b.id], status, clean: status === 'completed' } })}>
            <Text>{status === 'completed' ? 'Completed cleanly' : status === 'missed' ? 'Missed target' : 'Skipped'}</Text>
          </Pressable>)}</View>
          <TextInput style={styles.input} accessibilityLabel={`Actual work for ${b.title}`} placeholder="Actual work / reason (optional)"
            multiline editable={!saving} value={outcomes[b.id]?.actual || ''}
            onChangeText={(actual) => setOutcomes({ ...outcomes, [b.id]: { ...outcomes[b.id], actual } })} />
        </View>)}
        <TextInput style={styles.input} accessibilityLabel="Session notes" placeholder="Session notes (optional)" multiline editable={!saving} value={notes} onChangeText={setNotes} />
        <Pressable accessibilityRole="button" style={styles.button} disabled={saving} onPress={save}><Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save Session'}</Text></Pressable>
      </>}
      {!!error && plan && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Pressable accessibilityRole="button" disabled={saving} onPress={() => router.replace('/')} style={styles.choice}><Text>Return Home Without Saving</Text></Pressable>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F4F7F5', padding: 20, alignItems: 'center', paddingBottom: 50 },
  shell: { width: '100%', maxWidth: 600, gap: 12 },
  brand: { color: '#2E8B57', fontWeight: '900', letterSpacing: 1.4 },
  title: { fontSize: 28, fontWeight: '900', color: '#17211C' },
  heading: { fontSize: 18, fontWeight: '700', color: '#17211C' },
  body: { color: '#34483B', lineHeight: 22 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: '#DCE4DF' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { padding: 12, borderWidth: 1, borderColor: '#A7B9AE', borderRadius: 8, alignItems: 'center', minWidth: 44 },
  selected: { backgroundColor: '#C6E8D3', borderColor: '#2E8B57', borderWidth: 2 },
  input: { borderWidth: 1, borderColor: '#A7B9AE', borderRadius: 8, padding: 12, backgroundColor: 'white', color: '#17211C' },
  button: { backgroundColor: '#236B43', padding: 16, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '800' },
  disabled: { opacity: 0.4 },
  error: { color: '#9B2C2C' },
});
