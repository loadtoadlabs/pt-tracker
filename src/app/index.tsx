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
import { buildPlannedWorkout } from '@/lib/training-program';
import { formatTrainingDay, getTodayTrainingDay } from '@/lib/training-schedule';
import type { UserProfile } from '@/types/profile';
import type { PlannedWorkout } from '@/types/training';

const SESSION_KEY = 'loadtoad.training-sessions.v1';

type Workout = {
  id: number;
  date: string;
  strengthResult?: string;
  coreResult?: string;
  cardioResult?: string;
  pushUps?: string;
  plank?: string;
  hamr?: string;
};

type StoredTrainingSession = {
  id: number;
  date: string;
  sessionTitle: string;
};

export default function HomeScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [lastWorkout, setLastWorkout] = useState<Workout | null>(null);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
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

      const [savedWorkouts, savedSessions] = await Promise.all([
        AsyncStorage.getItem('workouts'),
        AsyncStorage.getItem(SESSION_KEY),
      ]);

      const workouts: Workout[] = savedWorkouts ? JSON.parse(savedWorkouts) : [];
      const sessions: StoredTrainingSession[] = savedSessions ? JSON.parse(savedSessions) : [];

      setWorkoutCount(workouts.length);
      setSessionCount(sessions.length);
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

  const scheduled = getTodayTrainingDay(profile.trainingDays);
  const workout = scheduled ? buildPlannedWorkout(profile, scheduled) : null;
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
            {daysRemaining === 0
              ? 'Test day'
              : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`}
          </Text>
        </View>
        <Text style={styles.testDate}>{formatDate(profile.testDate)}</Text>
      </View>

      <TodayWorkoutCard workout={workout} />

      <Text style={styles.sectionTitle}>Progress</Text>

      <View style={styles.dashboard}>
        <View style={styles.dashboardHeader}>
          <Text style={styles.dashboardTitle}>Current Snapshot</Text>
          <Text style={styles.workoutCount}>{sessionCount} sessions</Text>
        </View>

        {lastWorkout ? (
          <>
            <Text style={styles.lastWorkout}>
              Last PFA result • {new Date(lastWorkout.date).toLocaleDateString()}
            </Text>

            <View style={styles.statsRow}>
              <StatCard
                value={lastWorkout.strengthResult || lastWorkout.pushUps || '-'}
                label={strengthLabel(profile)}
              />
              <StatCard
                value={lastWorkout.coreResult || lastWorkout.plank || '-'}
                label={coreLabel(profile)}
              />
            </View>

            <View style={styles.statsRow}>
              <StatCard
                value={lastWorkout.cardioResult || lastWorkout.hamr || '-'}
                label={cardioLabel(profile)}
              />
              <StatCard value={phaseLabel(workout?.phase)} label="Training Phase" />
            </View>
          </>
        ) : (
          <View style={styles.emptyProgress}>
            <Text style={styles.emptyProgressTitle}>Training plan is live</Text>
            <Text style={styles.noData}>
              Finish guided sessions and quick-log PFA results to build your progress history.
            </Text>
          </View>
        )}

        <Text style={styles.logSummary}>
          {workoutCount} PFA result{workoutCount === 1 ? '' : 's'} logged
        </Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/log-workout')}>
          <Text style={styles.secondaryButtonText}>Quick Log PFA</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/workout-history')}>
          <Text style={styles.secondaryButtonText}>History</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function TodayWorkoutCard({ workout }: { workout: PlannedWorkout | null }) {
  if (!workout) {
    return (
      <View style={styles.todayCard}>
        <Text style={styles.cardEyebrow}>TODAY'S WORKOUT</Text>
        <Text style={styles.todayTitle}>Recovery Day</Text>
        <Text style={styles.todayDescription}>
          No scheduled training today. Keep movement easy, recover, and come back ready for the next session.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.todayCard}>
      <View style={styles.todayCardHeader}>
        <View style={styles.titleColumn}>
          <Text style={styles.cardEyebrow}>TODAY'S WORKOUT</Text>
          <Text style={styles.todayTitle}>{workout.title}</Text>
        </View>

        <View style={workout.type === 'pfa' ? styles.pfaBadge : styles.strengthBadge}>
          <Text style={workout.type === 'pfa' ? styles.pfaBadgeText : styles.strengthBadgeText}>
            {workout.type === 'pfa' ? (workout.isMock ? 'MOCK' : 'PFA') : 'STRENGTH'}
          </Text>
        </View>
      </View>

      <Text style={styles.todayDescription}>{workout.subtitle}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaPill}>{formatTrainingDay(workout.day)}</Text>
        <Text style={styles.metaPill}>{phaseLabel(workout.phase)}</Text>
        <Text style={styles.metaPill}>~{workout.estimatedMinutes} min</Text>
      </View>

      <View style={styles.previewList}>
        {workout.blocks.slice(0, 4).map((block, index) => (
          <View key={block.id} style={styles.previewRow}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepCircleText}>{index + 1}</Text>
            </View>
            <View style={styles.previewCopy}>
              <Text style={styles.previewTitle}>{block.title}</Text>
              <Text style={styles.previewPrescription}>{block.prescription}</Text>
            </View>
          </View>
        ))}
      </View>

      {workout.guardrails[0] && (
        <View style={styles.guardrailBox}>
          <Text style={styles.guardrailText}>{workout.guardrails[0]}</Text>
        </View>
      )}

      <Pressable style={styles.startButton} onPress={() => router.push('/active-workout')}>
        <Text style={styles.startButtonText}>Start Today’s Workout</Text>
      </Pressable>
    </View>
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
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function strengthLabel(profile: UserProfile) {
  return profile.strengthComponent === 'hand-release-push-ups'
    ? 'Hand-Release Push-Ups'
    : 'Push-Ups';
}

function coreLabel(profile: UserProfile) {
  if (profile.coreComponent === 'sit-ups') return 'Sit-Ups';
  if (profile.coreComponent === 'cross-leg-reverse-crunch') return 'Cross-Leg Reverse Crunch';
  return 'Plank';
}

function cardioLabel(profile: UserProfile) {
  if (profile.cardioComponent === 'two-mile-run') return '2-Mile Run';
  if (profile.cardioComponent === 'two-km-walk') return '2 km Walk';
  return 'HAMR';
}

function phaseLabel(phase?: PlannedWorkout['phase']) {
  if (phase === 'foundation') return 'Foundation';
  if (phase === 'build') return 'Build';
  if (phase === 'sharpen') return 'Sharpen';
  if (phase === 'taper') return 'Taper';
  return '-';
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
  titleColumn: {
    flex: 1,
  },
  cardEyebrow: {
    fontSize: 11,
    letterSpacing: 1.3,
    fontWeight: '900',
    color: '#718078',
  },
  todayTitle: {
    fontSize: 25,
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
    marginTop: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  metaPill: {
    backgroundColor: '#F0F4F1',
    color: '#536158',
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
  },
  previewList: {
    marginTop: 18,
    gap: 14,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 11,
    alignItems: 'flex-start',
  },
  stepCircle: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#E5F1E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleText: {
    color: '#236B46',
    fontWeight: '900',
    fontSize: 12,
  },
  previewCopy: {
    flex: 1,
  },
  previewTitle: {
    color: '#26332C',
    fontWeight: '900',
  },
  previewPrescription: {
    color: '#657169',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  guardrailBox: {
    backgroundColor: '#FFF8E6',
    borderRadius: 10,
    padding: 11,
    marginTop: 16,
  },
  guardrailText: {
    color: '#6E5B28',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
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
    textAlign: 'center',
  },
  emptyProgress: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyProgressTitle: {
    color: '#2A382F',
    fontSize: 17,
    fontWeight: '900',
  },
  noData: {
    color: '#69766E',
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 20,
  },
  logSummary: {
    color: '#718078',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
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
