import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
} from 'react-native';
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

export default function WorkoutHistoryScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    loadWorkouts();
  }, []);

  async function loadWorkouts() {
    try {
      const savedWorkouts = await AsyncStorage.getItem('workouts');

      if (savedWorkouts) {
        const parsedWorkouts: Workout[] = JSON.parse(savedWorkouts);

        setWorkouts([...parsedWorkouts].reverse());
      }
    } catch (error) {
      console.log('Could not load workouts:', error);
    }
  }

  async function deleteWorkout(id: number) {
    try {
      const updatedWorkouts = workouts.filter(
        (workout) => workout.id !== id
      );

      setWorkouts(updatedWorkouts);

      await AsyncStorage.setItem(
        'workouts',
        JSON.stringify([...updatedWorkouts].reverse())
      );
    } catch (error) {
      console.log('Could not delete workout:', error);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Workout History</Text>

      {workouts.length === 0 ? (
        <Text style={styles.emptyText}>No workouts saved yet.</Text>
      ) : (
        workouts.map((workout) => (
          <View key={workout.id} style={styles.card}>
            <Text style={styles.date}>
              {new Date(workout.date).toLocaleString()}
            </Text>

            <Text>Push-Ups: {workout.pushUps || '-'}</Text>
            <Text>Plank: {workout.plank || '-'}</Text>
            <Text>HAMR: {workout.hamr || '-'}</Text>
            <Text>Weight: {workout.weight || '-'}</Text>

            {workout.notes !== '' && (
              <Text style={styles.notes}>
                Notes: {workout.notes}
              </Text>
            )}

            <Pressable
              style={styles.deleteButton}
              onPress={() => deleteWorkout(workout.id)}
            >
              <Text style={styles.deleteButtonText}>
                Delete Workout
              </Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
  },

  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 24,
  },

  emptyText: {
    fontSize: 16,
    marginTop: 30,
  },

  card: {
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  date: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  notes: {
    marginTop: 10,
  },

  deleteButton: {
    marginTop: 16,
    backgroundColor: '#B22222',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },

  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});