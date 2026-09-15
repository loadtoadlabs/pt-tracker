import { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Workout = {
  id: number;
  date: string;
  pushUps: string;
  plank: string;
  hamr: string;
  weight: string;
  notes: string;
};

export default function HomeScreen() {
  const [lastWorkout, setLastWorkout] = useState<Workout | null>(null);
  const [workoutCount, setWorkoutCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  async function loadDashboard() {
    try {
      const savedWorkouts = await AsyncStorage.getItem('workouts');

      if (savedWorkouts) {
        const workouts: Workout[] = JSON.parse(savedWorkouts);

        setWorkoutCount(workouts.length);

        if (workouts.length > 0) {
          setLastWorkout(workouts[workouts.length - 1]);
        } else {
          setLastWorkout(null);
        }
      } else {
        setWorkoutCount(0);
        setLastWorkout(null);
      }
    } catch (error) {
      console.log('Could not load dashboard:', error);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.logo}>🐸</Text>
      <Text style={styles.title}>LoadToadLabs</Text>
      <Text style={styles.subtitle}>Air Force PT Tracker</Text>

      <View style={styles.dashboard}>
        <Text style={styles.sectionTitle}>Current Progress</Text>

        {lastWorkout ? (
          <>
            <Text style={styles.lastWorkout}>
              Last Workout:{' '}
              {new Date(lastWorkout.date).toLocaleDateString()}
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {lastWorkout.pushUps || '-'}
                </Text>
                <Text style={styles.statLabel}>Push-Ups</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {lastWorkout.plank || '-'}
                </Text>
                <Text style={styles.statLabel}>Plank</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {lastWorkout.hamr || '-'}
                </Text>
                <Text style={styles.statLabel}>HAMR</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {lastWorkout.weight || '-'}
                </Text>
                <Text style={styles.statLabel}>Weight</Text>
              </View>
            </View>

            <Text style={styles.workoutCount}>
              {workoutCount} workout{workoutCount === 1 ? '' : 's'} logged
            </Text>
          </>
        ) : (
          <Text style={styles.noData}>
            No workouts logged yet.
          </Text>
        )}
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={() => router.push('/log-workout')}
      >
        <Text style={styles.buttonText}>Log Workout</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.push('/workout-history')}
      >
        <Text style={styles.buttonText}>Workout History</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 24,
  },

  logo: {
    fontSize: 64,
    marginTop: 30,
  },

  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 8,
  },

  subtitle: {
    fontSize: 18,
    marginTop: 4,
    marginBottom: 28,
  },

  dashboard: {
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },

  lastWorkout: {
    textAlign: 'center',
    marginBottom: 16,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },

  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },

  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },

  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },

  workoutCount: {
    textAlign: 'center',
    marginTop: 8,
    fontWeight: 'bold',
  },

  noData: {
    textAlign: 'center',
    padding: 20,
  },

  primaryButton: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#2E8B57',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  secondaryButton: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#4A5568',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },

  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});