import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { loadUserProfile } from '@/lib/profile-storage';
import { loadBodyCheckIns, saveBodyCheckIn } from '@/lib/body-check-in-storage';
import { getWeekStart, isCheckInDue, type BodyCheckIn } from '@/lib/body-check-in';
import { buildWeeklySchedule, formatTrainingDay } from '@/lib/training-schedule';
import type { UserProfile } from '@/types/profile';

export default function WeeklyCheckInScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [records, setRecords] = useState<BodyCheckIn[]>([]);
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);

  const load = useCallback(async () => {
    setLoading(true); setError(''); setLoaded(false);
    try {
      const [savedProfile, savedRecords] = await Promise.all([loadUserProfile(), loadBodyCheckIns()]);
      if (!savedProfile.onboardingComplete) { router.replace('/setup'); return; }
      setProfile(savedProfile); setRecords(savedRecords); setLoaded(true);
    } catch { setError('Could not load your check-ins. Please try again.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function save() {
    if (!profile || busy.current) return;
    busy.current = true; setSaving(true); setError('');
    try {
      // Re-read the profile in case the schedule changed since this screen opened.
      const current = await loadUserProfile();
      if (!current.onboardingComplete) { router.replace('/setup'); return; }
      await saveBodyCheckIn(current.trainingDays, weight, waist);
      setWeight(''); setWaist('');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save your check-in. Please try again.'); }
    finally { busy.current = false; setSaving(false); }
  }

  const schedule = profile ? buildWeeklySchedule(profile.trainingDays) : [];
  const finalDay = schedule[schedule.length - 1]?.day;
  const due = loaded && profile && isCheckInDue(profile.trainingDays, records);
  const savedThisWeek = records.some((record) => record.weekStart === getWeekStart());

  return <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <View style={styles.shell}>
      <Text style={styles.brand}>LOADTOAD PT</Text>
      <Text style={styles.title}>Weekly Check-In</Text>
      <Text style={styles.body}>Track weight and waist once a week, on your final training day. Daily measurements aren’t needed.</Text>
      {loading ? <ActivityIndicator accessibilityLabel="Loading check-ins" /> : <>
        {loaded && <Text style={styles.body}>{savedThisWeek ? 'This week’s check-in is saved.' : finalDay ? `Your check-in day is ${formatTrainingDay(finalDay)}.` : 'Choose your training days in setup to schedule a check-in.'}</Text>}
        {due && <View style={styles.card}>
          <Text style={styles.heading}>This Week</Text>
          <Text style={styles.body}>Weight (lb)</Text>
          <TextInput style={styles.input} accessibilityLabel="Weight in pounds" keyboardType="decimal-pad" value={weight} onChangeText={setWeight} editable={!saving} />
          <Text style={styles.body}>Waist (inches, optional)</Text>
          <TextInput style={styles.input} accessibilityLabel="Waist in inches, optional" keyboardType="decimal-pad" value={waist} onChangeText={setWaist} editable={!saving} />
          <Pressable accessibilityRole="button" disabled={saving} style={styles.button} onPress={save}><Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save Weekly Check-In'}</Text></Pressable>
        </View>}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {!loaded && <Pressable accessibilityRole="button" style={styles.button} onPress={load}><Text style={styles.buttonText}>Try Again</Text></Pressable>}
        {loaded && <>
          <Text style={styles.heading}>Check-In History</Text>
          {records.length === 0 && <Text style={styles.body}>Your weekly check-ins will appear here.</Text>}
          {[...records].sort((a, b) => b.weekStart.localeCompare(a.weekStart)).map((record) => <View key={record.weekStart} style={styles.card}>
            <Text style={styles.heading}>{new Date(record.date).toLocaleDateString()}</Text>
            <Text style={styles.body}>Weight: {record.weightLb} lb</Text>
            <Text style={styles.body}>Waist: {record.waistInches === undefined ? 'Not recorded' : `${record.waistInches} in`}</Text>
          </View>)}
        </>}
      </>}
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F4F7F5', padding: 20, alignItems: 'center', paddingBottom: 50 },
  shell: { width: '100%', maxWidth: 600, gap: 16 },
  brand: { color: '#2E8B57', fontWeight: '900', letterSpacing: 1.4 },
  title: { fontSize: 28, fontWeight: '900', color: '#17211C' },
  heading: { fontSize: 18, fontWeight: '700', color: '#17211C' },
  body: { color: '#34483B', lineHeight: 22 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: '#DCE4DF' },
  input: { borderWidth: 1, borderColor: '#A7B9AE', borderRadius: 8, padding: 12, backgroundColor: 'white', color: '#17211C' },
  button: { backgroundColor: '#236B43', padding: 16, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '800' },
  error: { color: '#9B2C2C' },
});
