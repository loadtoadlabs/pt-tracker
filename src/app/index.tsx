import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadUserProfile } from '@/lib/profile-storage';
import { formatTrainingDay, getTodayTrainingDay } from '@/lib/training-schedule';
import type { UserProfile } from '@/types/profile';

type Workout = {
  id: number;
  date: string;
  pushUps: string;
  plank: string;
  hamr: string;
  weight: string;
  notes: string;
};

const CARDIO_LABELS = {
  hamr: '20m HAMR',
  'two-mile-run': '2-Mile Run',
  'two-km-walk': '2 km Walk',
};

const STRENGTH_LABELS = {
  'push-ups': 'Push-Ups',
  'hand-release-push-ups': 'Hand-Release Push-Ups',
};

const CORE_LABELS = {
  plank: 'Forearm Plank',
  'sit-ups': 'Sit-Ups',
  'cross-leg-reverse-crunch': 'Cross-Leg Reverse Crunch',
};

export default function HomeScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [lastWorkout, setLastWorkout] = useState<Workout | null>(null);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadHome();
    }, [])
  );

  async function loadHome() {
    setLoading(true);

    try {
      const savedProfile = await loadUserProfile();

      if (!savedProfile.onboardingComplete) {
        router.replace('/setup');
        return;
      }

      setProfile(savedProfile);

      const savedWorkouts = await AsyncStorage.getItem('workouts');
      const workouts: Workout[] = savedWorkouts ? JSON.parse(savedWorkouts) : [];

      setWorkoutCount(workouts.length);
      setLastWorkout(workouts.length > 0 ? workouts[workouts.length - 1] : null);
    } catch (error) {
      console.log('Could not load home screen:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !profile) {
    return (
      <View style={styles.loadingPage}>
        <Text style={styles.loadingLogo}>🐸</Text>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const today = getTodayTrainingDay(profile.trainingDays);
  const daysRemaining = getDaysUntil(profile.testDate);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>LOADTOAD PT</Text>
          <Text style={styles.title}>Today</Text>
        </View>
        <Text style={styles.logo}>🐸</Text>
      </View>

      <View style={styles.testStrip}>
        <View>
          <Text style={styles.testStripLabel}>PFA COUNTDOWN</Text>
          <Text style={styles.testStripValue}>
            {daysRemaining === 0 ? 'Test day' : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`}
          </Text>
        </View>
        <Text style={styles.testDate}>{formatDate(profile.testDate)}</Text>
      </View>

      <View style={styles.todayCard}>
        <View style={styles.todayCardHeader}>
          <View>
            <Text style={styles.cardEyebrow}>TODAY'S WORKOUT</Text>
            <Text style={styles.todayTitle}>
              {today ? (today.type === 'pfa' ? 'PFA Focus' : 'Strength Support') : 'Recovery Day'}
            </Text>
          </View>
          {today && (
            <View style={today.type === 'pfa' ? styles.pfaBadge : styles.strengthBadge}>
              <Text style={today.type === 'pfa' ? styles.pfaBadgeText : styles.strengthBadgeText}>
                {today.type === 'pfa' ? 'PFA' : 'STRENGTH'}
              </Text>
            </View>
          )}
        </View>

        {today ? (
          <>
            <Text style={styles.todayDescription}>
              {today.type === 'pfa'
                ? `${CARDIO_LABELS[profile.cardioComponent as keyof typeof CARDIO_LABELS]} • ${STRENGTH_LABELS[profile.strengthComponent as keyof typeof STRENGTH_LABELS]} • ${CORE_LABELS[profile.coreComponent as keyof typeof CORE_LABELS]}`
                : 'Build the strength, durability, and trunk control that support your selected PFA path.'}
            </Text>
            <Text style={styles.scheduleNote}>{formatTrainingDay(today.day)} training session</Text>
            <Pressable style={styles.startButton} onPress={() => router.push('/log-workout')}>
              <Text style={styles.startButtonText}>Start Today's Workout</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.todayDescription}>
            No scheduled training today. Recover, move a little, and come back ready for the next session.
          </Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Progress</Text>

      <View style={styles.dashboard}>
        <View style={styles.dashboardHeader}>
          <Text style={styles.dashboardTitle}>Current Snapshot</Text>
          <Text style={styles.workoutCount}>{workoutCount} logged</Text>
        </View>

        {lastWorkout ? (
          <>
            <Text style={styles.lastWorkout}>
              Last logged workout • {new Date(lastWorkout.date).toLocaleDateString()}
            </Text>

            <View style={styles.statsRow}>
              <StatCard value={lastWorkout.pushUps || '-'} label="Push-Ups" />
              <StatCard value={lastWorkout.plank || '-'} label="Plank" />
            </View>
            <View style={styles.statsRow}>
              <StatCard value={lastWorkout.hamr || '-'} label="HAMR" />
              <StatCard value={lastWorkout.weight ? `${lastWorkout.weight}` : '-'} label="Weight" />
            </View>
          </>
        ) : (
          <Text style={styles.noData}>Your progress dashboard will fill in as you train.</Text>
        )}
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/log-workout')}>
          <Text style={styles.secondaryButtonText}>Log Workout</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/workout-history')}>
          <Text style={styles.secondaryButtonText}>History</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function getDaysUntil(value: string) {
  const target = new Date(`${value}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86_400_000));
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  loadingPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F4F7F5',
  },
  loadingLogo: {
    fontSize: 58,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#F4F7F5',
    padding: 20,
    paddingBottom: 50,
  },
  header: {
    width: '100%',
    maxWidth: 600,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '900',
    color: '#2E8B57',
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#17211C',
    marginTop: 2,
  },
  logo: {
    fontSize: 52,
  },
  testStrip: {
    width: '100%',
    maxWidth: 600,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#21372B',
    padding: 16,
    borderRadius: 15,
    marginBottom: 14,
  },
  testStripLabel: {
    color: '#A7C8B6',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  testStripValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 3,
  },
  testDate: {
    color: '#DDE8E1',
    fontWeight: '700',
  },
  todayCard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DCE4DF',
  },
  todayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardEyebrow: {
    fontSize: 11,
    letterSpacing: 1.3,
    fontWeight: '900',
    color: '#718078',
  },
  todayTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: '#18221D',
    marginTop: 4,
  },
  pfaBadge: {
    backgroundColor: '#E3F4EA',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 99,
  },
  pfaBadgeText: {
    color: '#1F6A43',
    fontWeight: '900',
    fontSize: 11,
  },
  strengthBadge: {
    backgroundColor: '#ECEEFA',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 99,
  },
  strengthBadgeText: {
    color: '#4C5788',
    fontWeight: '900',
    fontSize: 11,
  },
  todayDescription: {
    color: '#56645C',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 14,
  },
  scheduleNote: {
    color: '#7A857E',
    marginTop: 10,
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: '#2E8B57',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 18,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  sectionTitle: {
    width: '100%',
    maxWidth: 600,
    fontSize: 22,
    fontWeight: '900',
    color: '#17211C',
    marginTop: 28,
    marginBottom: 10,
  },
  dashboard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE4DF',
    borderRadius: 18,
    padding: 18,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashboardTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#25312B',
  },
  workoutCount: {
    color: '#718078',
    fontWeight: '700',
  },
  lastWorkout: {
    color: '#718078',
    marginTop: 5,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F7F9F8',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#213029',
  },
  statLabel: {
    fontSize: 13,
    color: '#6D7972',
    marginTop: 4,
  },
  noData: {
    color: '#69766E',
    paddingVertical: 22,
    textAlign: 'center',
  },
  actionRow: {
    width: '100%',
    maxWidth: 600,
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#BFCAC3',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 13,
  },
  secondaryButtonText: {
    color: '#34413A',
    fontWeight: '800',
  },
});
