import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadUserProfile } from '@/lib/profile-storage';
import { buildPlannedWorkout } from '@/lib/training-program';
import { getTodayTrainingDay } from '@/lib/training-schedule';
import type { UserProfile } from '@/types/profile';

function formatTimeShorthand(value: string) {
  const clean = value.trim().replace(':', '');

  if (clean === '') return '';
  if (!/^\d+$/.test(clean)) return null;

  let totalSeconds = 0;

  if (clean.length <= 2) {
    totalSeconds = Number(clean);
  } else {
    const minutes = Number(clean.slice(0, -2));
    const seconds = Number(clean.slice(-2));
    totalSeconds = minutes * 60 + seconds;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function LogWorkoutScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [strengthReps, setStrengthReps] = useState('');
  const [coreValue, setCoreValue] = useState('');
  const [hamrLevel, setHamrLevel] = useState('');
  const [hamrShuttle, setHamrShuttle] = useState('');
  const [cardioTime, setCardioTime] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile()
      .then((saved) => {
        if (!saved.onboardingComplete) {
          router.replace('/setup');
          return;
        }
        setProfile(saved);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !profile) {
    return (
      <View style={styles.loadingPage}>
        <Text style={styles.loadingLogo}>🐸</Text>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const scheduled = getTodayTrainingDay(profile.trainingDays);
  const planned = scheduled ? buildPlannedWorkout(profile, scheduled) : null;

  async function saveWorkout() {
    if (!profile) return;

    setMessage('');
    setHasError(false);

    if (!/^\d+$/.test(strengthReps.trim())) {
      return showError(`Enter your ${strengthLabel(profile)} reps.`);
    }

    let formattedCore = coreValue.trim();

    if (profile.coreComponent === 'plank') {
      const formatted = formatTimeShorthand(coreValue);
      if (formatted === null || formatted === '') {
        return showError('Enter a valid plank time. Example: 50 or 115.');
      }
      formattedCore = formatted;
      setCoreValue(formatted);
    } else if (!/^\d+$/.test(coreValue.trim())) {
      return showError(`Enter your ${coreLabel(profile)} reps.`);
    }

    let formattedCardio = cardioTime.trim();
    let hamrResult = '';

    if (profile.cardioComponent === 'hamr') {
      if (!/^\d+$/.test(hamrLevel.trim()) || !/^\d+$/.test(hamrShuttle.trim())) {
        return showError('Enter both HAMR level and shuttle.');
      }
      hamrResult = `${hamrLevel.trim()}-${hamrShuttle.trim()}`;
      formattedCardio = hamrResult;
    } else {
      const formatted = formatTimeShorthand(cardioTime);
      if (formatted === null || formatted === '') {
        return showError(`Enter a valid ${cardioLabel(profile)} time.`);
      }
      formattedCardio = formatted;
      setCardioTime(formatted);
    }

    const workout = {
      id: Date.now(),
      date: new Date().toISOString(),
      sessionKind: planned?.kind ?? 'manual',
      sessionTitle: planned?.title ?? 'Manual Workout',
      strengthComponent: profile.strengthComponent,
      strengthResult: strengthReps.trim(),
      coreComponent: profile.coreComponent,
      coreResult: formattedCore,
      cardioComponent: profile.cardioComponent,
      cardioResult: formattedCardio,
      hamrLevel: hamrLevel.trim(),
      hamrShuttle: hamrShuttle.trim(),
      notes: notes.trim(),

      // Legacy fields stay populated where applicable so old prototype data remains readable.
      pushUps: profile.strengthComponent === 'push-ups' ? strengthReps.trim() : '',
      plank: profile.coreComponent === 'plank' ? formattedCore : '',
      hamr: profile.cardioComponent === 'hamr' ? hamrResult : '',
      weight: '',
    };

    try {
      const existing = await AsyncStorage.getItem('workouts');
      const workouts = existing ? JSON.parse(existing) : [];
      workouts.push(workout);
      await AsyncStorage.setItem('workouts', JSON.stringify(workouts));

      setStrengthReps('');
      setCoreValue('');
      setHamrLevel('');
      setHamrShuttle('');
      setCardioTime('');
      setNotes('');
      setMessage('Workout saved!');
    } catch (error) {
      console.log('Could not save workout:', error);
      showError('Could not save workout.');
    }
  }

  function showError(value: string) {
    setHasError(true);
    setMessage(value);
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.shell}>
        <Text style={styles.eyebrow}>LOADTOAD PT</Text>
        <Text style={styles.title}>Log Workout</Text>
        <Text style={styles.subtitle}>
          {planned ? planned.title : 'Record your selected PFA components'}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Strength</Text>
          <Text style={styles.label}>{strengthLabel(profile)} reps</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="25"
            value={strengthReps}
            onChangeText={setStrengthReps}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Core</Text>
          <Text style={styles.label}>
            {profile.coreComponent === 'plank'
              ? 'Forearm plank time'
              : `${coreLabel(profile)} reps`}
          </Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder={profile.coreComponent === 'plank' ? '115 → 1:15' : '35'}
            value={coreValue}
            onChangeText={setCoreValue}
            onBlur={() => {
              if (profile.coreComponent !== 'plank') return;
              const formatted = formatTimeShorthand(coreValue);
              if (formatted) setCoreValue(formatted);
            }}
          />
          {profile.coreComponent === 'plank' && (
            <Text style={styles.helper}>Shorthand works: 50 = 0:50, 115 = 1:15, 90 = 1:30.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cardio</Text>
          {profile.cardioComponent === 'hamr' ? (
            <>
              <Text style={styles.label}>HAMR result</Text>
              <View style={styles.row}>
                <View style={styles.flexField}>
                  <Text style={styles.smallLabel}>Level</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="5"
                    value={hamrLevel}
                    onChangeText={setHamrLevel}
                  />
                </View>
                <View style={styles.flexField}>
                  <Text style={styles.smallLabel}>Shuttle</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="6"
                    value={hamrShuttle}
                    onChangeText={setHamrShuttle}
                  />
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.label}>{cardioLabel(profile)} time</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="1530 → 15:30"
                value={cardioTime}
                onChangeText={setCardioTime}
                onBlur={() => {
                  const formatted = formatTimeShorthand(cardioTime);
                  if (formatted) setCardioTime(formatted);
                }}
              />
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="How did it feel? Any pain, fatigue, or form issues?"
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <Pressable style={styles.button} onPress={saveWorkout}>
          <Text style={styles.buttonText}>Save Workout</Text>
        </Pressable>

        {message !== '' && (
          <Text style={[styles.message, hasError ? styles.error : styles.success]}>{message}</Text>
        )}
      </View>
    </ScrollView>
  );
}

function strengthLabel(profile: UserProfile) {
  return profile.strengthComponent === 'hand-release-push-ups'
    ? 'Hand-Release Push-Ups'
    : 'Push-Ups';
}

function coreLabel(profile: UserProfile) {
  if (profile.coreComponent === 'sit-ups') return 'Sit-Ups';
  if (profile.coreComponent === 'cross-leg-reverse-crunch') return 'Cross-Leg Reverse Crunch';
  return 'Forearm Plank';
}

function cardioLabel(profile: UserProfile) {
  if (profile.cardioComponent === 'two-mile-run') return '2-Mile Run';
  if (profile.cardioComponent === 'two-km-walk') return '2 km Walk';
  return '20m HAMR';
}

const styles = StyleSheet.create({
  loadingPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F7F5',
  },
  loadingLogo: {
    fontSize: 54,
    marginBottom: 12,
  },
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
    color: '#17211C',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 3,
  },
  subtitle: {
    color: '#657169',
    fontSize: 16,
    marginTop: 6,
    marginBottom: 8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE4DF',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
  },
  sectionTitle: {
    color: '#26332C',
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 10,
  },
  label: {
    color: '#47554D',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  smallLabel: {
    color: '#657169',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 5,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#BFCAC3',
    backgroundColor: '#FCFDFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flexField: {
    flex: 1,
  },
  helper: {
    color: '#748078',
    fontSize: 12,
    marginTop: 7,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#2E8B57',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: 18,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  message: {
    textAlign: 'center',
    fontWeight: '800',
    marginTop: 14,
  },
  error: {
    color: '#A62B2B',
  },
  success: {
    color: '#237348',
  },
});
