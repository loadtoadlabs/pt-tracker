import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadBodyCheckIns } from '@/lib/body-check-in-storage';
import { getAchievements, type Achievement } from '@/lib/achievements';

export default function AchievementsScreen() {
  const [badges, setBadges] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [saved, checkIns] = await Promise.all([AsyncStorage.getItem('workouts'), loadBodyCheckIns()]);
      const history = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(history)) throw new Error('Invalid history');
      setBadges(getAchievements(history, checkIns));
    } catch { setError('Could not load achievements. Your saved records have not been changed. Please try again.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return <ScrollView contentContainerStyle={styles.container}>
    <View style={styles.shell}>
      <Text style={styles.brand}>LOADTOAD PT</Text>
      <Text style={styles.title}>Achievements</Text>
      <Text style={styles.body}>Build consistency, train with control, and leave room for recovery.</Text>
      {loading ? <ActivityIndicator accessibilityLabel="Loading achievements" /> : error ? <>
        <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        <Pressable accessibilityRole="button" style={styles.button} onPress={load}><Text style={styles.buttonText}>Try Again</Text></Pressable>
      </> : <>
        <Text style={styles.heading}>{badges.filter((b) => b.earnedOn).length} of {badges.length} earned</Text>
        {(['Training', 'LoadToad'] as const).map((category) => <View key={category} style={styles.group}>
          <Text style={styles.heading}>{category === 'Training' ? 'Training Milestones' : 'Life in the Pond'}</Text>
          {badges.filter((b) => b.category === category).map((badge) => <View key={badge.id} style={[styles.card, badge.earnedOn && styles.earned]}>
            <Text style={styles.heading}>{badge.earnedOn ? '✓ ' : ''}{badge.title}</Text>
            <Text style={styles.body}>{badge.description}</Text>
            <Text style={styles.status}>{badge.earnedOn ? `Earned ${new Date(badge.earnedOn).toLocaleDateString()}` : `In progress · ${badge.current} / ${badge.target}`}</Text>
          </View>)}
        </View>)}
        <Text style={styles.body}>Session badges use planned workouts with every block completed. Manual result logs and skipped-only sessions do not qualify. Badges reflect your saved history; deleting qualifying records may remove a badge.</Text>
      </>}
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F4F7F5', padding: 20, alignItems: 'center', paddingBottom: 50 },
  shell: { width: '100%', maxWidth: 600, gap: 16 },
  group: { gap: 12 },
  brand: { color: '#2E8B57', fontWeight: '900', letterSpacing: 1.4 },
  title: { fontSize: 30, fontWeight: '900', color: '#17211C' },
  heading: { fontSize: 18, fontWeight: '700', color: '#17211C' },
  body: { color: '#34483B', lineHeight: 22 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: '#DCE4DF' },
  earned: { backgroundColor: '#E7F4EC', borderColor: '#2E8B57' },
  status: { color: '#236B43', fontWeight: '700' },
  button: { backgroundColor: '#236B43', padding: 16, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '800' },
  error: { color: '#9B2C2C' },
});
