import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CardioComponent, CoreComponent, StrengthComponent } from '@/types/profile';

type Workout = {
  id: number;
  date: string;
  sessionTitle?: string;
  strengthComponent?: StrengthComponent;
  strengthResult?: string;
  coreComponent?: CoreComponent;
  coreResult?: string;
  cardioComponent?: CardioComponent;
  cardioResult?: string;
  pushUps?: string;
  plank?: string;
  hamr?: string;
  weight?: string;
  notes?: string;
};

export default function WorkoutHistoryScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    loadWorkouts();
  }, []);

  async function loadWorkouts() {
    try {
      const savedWorkouts = await AsyncStorage.getItem('workouts');
      const parsed: Workout[] = savedWorkouts ? JSON.parse(savedWorkouts) : [];
      setWorkouts([...parsed].reverse());
    } catch (error) {
      console.log('Could not load workouts:', error);
    }
  }

  async function deleteWorkout(id: number) {
    try {
      const newestFirst = workouts.filter((workout) => workout.id !== id);
      setWorkouts(newestFirst);
      await AsyncStorage.setItem('workouts', JSON.stringify([...newestFirst].reverse()));
    } catch (error) {
      console.log('Could not delete workout:', error);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.shell}>
        <Text style={styles.eyebrow}>LOADTOAD PT</Text>
        <Text style={styles.title}>Workout History</Text>

        {workouts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nothing logged yet</Text>
            <Text style={styles.emptyText}>Completed sessions will show up here.</Text>
          </View>
        ) : (
          workouts.map((workout) => (
            <View key={workout.id} style={styles.card}>
              <Text style={styles.date}>{new Date(workout.date).toLocaleString()}</Text>
              {workout.sessionTitle && <Text style={styles.sessionTitle}>{workout.sessionTitle}</Text>}

              <MetricRow
                label={strengthLabel(workout.strengthComponent)}
                value={workout.strengthResult || workout.pushUps || '-'}
              />
              <MetricRow
                label={coreLabel(workout.coreComponent)}
                value={workout.coreResult || workout.plank || '-'}
              />
              <MetricRow
                label={cardioLabel(workout.cardioComponent)}
                value={workout.cardioResult || workout.hamr || '-'}
              />

              {workout.notes ? <Text style={styles.notes}>Notes: {workout.notes}</Text> : null}

              <Pressable style={styles.deleteButton} onPress={() => deleteWorkout(workout.id)}>
                <Text style={styles.deleteButtonText}>Delete Workout</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function strengthLabel(component?: StrengthComponent) {
  return component === 'hand-release-push-ups' ? 'Hand-Release Push-Ups' : 'Push-Ups';
}

function coreLabel(component?: CoreComponent) {
  if (component === 'sit-ups') return 'Sit-Ups';
  if (component === 'cross-leg-reverse-crunch') return 'Cross-Leg Reverse Crunch';
  return 'Forearm Plank';
}

function cardioLabel(component?: CardioComponent) {
  if (component === 'two-mile-run') return '2-Mile Run';
  if (component === 'two-km-walk') return '2 km Walk';
  return '20m HAMR';
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#F4F7F5',
    padding: 20,
    paddingBottom: 50,
  },
  shell: {
    width: '100%',
    maxWidth: 600,
  },
  eyebrow: {
    color: '#2E8B57',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginTop: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#17211C',
    marginTop: 3,
    marginBottom: 18,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE4DF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#26332C',
  },
  emptyText: {
    color: '#6C7971',
    marginTop: 5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE4DF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  date: {
    color: '#748078',
    fontSize: 13,
    fontWeight: '700',
  },
  sessionTitle: {
    color: '#26332C',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 4,
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2EF',
  },
  metricLabel: {
    color: '#59675F',
    flex: 1,
  },
  metricValue: {
    color: '#223028',
    fontWeight: '900',
  },
  notes: {
    color: '#536158',
    marginTop: 12,
    lineHeight: 20,
  },
  deleteButton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#D9A7A7',
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#9B2C2C',
    fontWeight: '900',
  },
});
