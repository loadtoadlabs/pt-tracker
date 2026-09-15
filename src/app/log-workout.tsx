import { useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

function formatPlankTime(value: string) {
  const clean = value.trim();

  if (clean === '') {
    return '';
  }

  let totalSeconds = 0;

  // Already entered like 1:15
  if (/^\d+:\d{1,2}$/.test(clean)) {
    const [minutes, seconds] = clean.split(':').map(Number);
    totalSeconds = minutes * 60 + seconds;
  }

  // Entered shorthand like 50, 115, 205
  else if (/^\d+$/.test(clean)) {
    if (clean.length <= 2) {
      totalSeconds = Number(clean);
    } else {
      const minutes = Number(clean.slice(0, -2));
      const seconds = Number(clean.slice(-2));

      totalSeconds = minutes * 60 + seconds;
    }
  }

  else {
    return null;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
export default function LogWorkoutScreen() {
  const [pushUps, setPushUps] = useState('');
  const [plank, setPlank] = useState('');
  const [hamrLevel, setHamrLevel] = useState('');
  const [hamrShuttle, setHamrShuttle] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');

  const [message, setMessage] = useState('');
  const [hasError, setHasError] = useState(false);

  async function saveWorkout() {
    setMessage('');
    setHasError(false);

    if (
      pushUps.trim() === '' &&
      plank.trim() === '' &&
      hamrLevel.trim() === '' &&
      hamrShuttle.trim() === '' &&
      weight.trim() === ''
    ) {
      setHasError(true);
      setMessage('Enter at least one workout result.');
      return;
    }

    if (pushUps && !/^\d+$/.test(pushUps)) {
      setHasError(true);
      setMessage('Push-ups must be a whole number.');
      return;
    }

    if (plank && !/^\d+:[0-5]\d$/.test(plank)) {
      setHasError(true);
      setMessage('Plank time must use M:SS format. Example: 1:15');
      return;
    }

    if (hamrLevel && !/^\d+$/.test(hamrLevel)) {
      setHasError(true);
      setMessage('HAMR level must be a whole number.');
      return;
    }

    if (hamrShuttle && !/^\d+$/.test(hamrShuttle)) {
      setHasError(true);
      setMessage('HAMR shuttle must be a whole number.');
      return;
    }

    if (
      (hamrLevel && !hamrShuttle) ||
      (!hamrLevel && hamrShuttle)
    ) {
      setHasError(true);
      setMessage('Enter both HAMR level and shuttle.');
      return;
    }

    if (weight && !/^\d+(\.\d{1,2})?$/.test(weight)) {
      setHasError(true);
      setMessage('Weight must be a number. Example: 229 or 229.5');
      return;
    }

    const hamrResult =
      hamrLevel && hamrShuttle
        ? `${hamrLevel}-${hamrShuttle}`
        : '';

    const workout = {
      id: Date.now(),
      date: new Date().toISOString(),

      pushUps: pushUps.trim(),
      plank: plank.trim(),

      hamr: hamrResult,
      hamrLevel: hamrLevel.trim(),
      hamrShuttle: hamrShuttle.trim(),

      weight: weight.trim(),
      notes: notes.trim(),
    };

    try {
      const existingWorkouts = await AsyncStorage.getItem('workouts');

      const workouts = existingWorkouts
        ? JSON.parse(existingWorkouts)
        : [];

      workouts.push(workout);

      await AsyncStorage.setItem(
        'workouts',
        JSON.stringify(workouts)
      );

      setHasError(false);
      setMessage('Workout saved!');

      setPushUps('');
      setPlank('');
      setHamrLevel('');
      setHamrShuttle('');
      setWeight('');
      setNotes('');
    } catch (error) {
      setHasError(true);
      setMessage('Could not save workout.');
      console.log(error);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Log Workout</Text>
      <Text style={styles.subtitle}>Air Force PT Training</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Push-Ups</Text>
        <TextInput
          style={styles.input}
          placeholder="Example: 25"
          keyboardType="numeric"
          value={pushUps}
          onChangeText={setPushUps}
        />

        <Text style={styles.label}>Plank Time</Text>
        <TextInput
          style={styles.input}
          placeholder="Example: 1:15"
          value={plank}
          onChangeText={setPlank}
        />

        <Text style={styles.label}>HAMR Result</Text>

        <View style={styles.hamrRow}>
          <View style={styles.hamrField}>
            <Text style={styles.smallLabel}>Level</Text>
            <TextInput
              style={styles.input}
              placeholder="5"
              keyboardType="numeric"
              value={hamrLevel}
              onChangeText={setHamrLevel}
            />
          </View>

          <View style={styles.hamrField}>
            <Text style={styles.smallLabel}>Shuttle</Text>
            <TextInput
              style={styles.input}
              placeholder="6"
              keyboardType="numeric"
              value={hamrShuttle}
              onChangeText={setHamrShuttle}
            />
          </View>
        </View>

        <Text style={styles.label}>Weight (lb)</Text>
        <TextInput
          style={styles.input}
          placeholder="Example: 229.5"
          keyboardType="decimal-pad"
          value={weight}
          onChangeText={setWeight}
        />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="How did the workout feel?"
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        <Pressable style={styles.button} onPress={saveWorkout}>
          <Text style={styles.buttonText}>Save Workout</Text>
        </Pressable>

        {message !== '' && (
          <Text
            style={[
              styles.message,
              hasError
                ? styles.errorMessage
                : styles.successMessage,
            ]}
          >
            {message}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
  },

  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 20,
  },

  subtitle: {
    fontSize: 16,
    marginTop: 6,
    marginBottom: 30,
  },

  form: {
    width: '100%',
    maxWidth: 500,
  },

  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 16,
  },

  smallLabel: {
    fontSize: 14,
    marginBottom: 6,
  },

  hamrRow: {
    flexDirection: 'row',
    gap: 12,
  },

  hamrField: {
    flex: 1,
  },

  input: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    width: '100%',
  },

  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  button: {
    marginTop: 30,
    backgroundColor: '#2E8B57',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },

  message: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },

  errorMessage: {
    color: '#B22222',
  },

  successMessage: {
    color: '#2E8B57',
  },
});