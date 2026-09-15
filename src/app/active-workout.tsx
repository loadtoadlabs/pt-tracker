import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadUserProfile } from '@/lib/profile-storage';
import { evaluateReadiness } from '@/lib/training-adaptation';
import { buildPlannedWorkout } from '@/lib/training-program';
import { getTodayTrainingDay } from '@/lib/training-schedule';
import type { UserProfile } from '@/types/profile';
import type { DailyReadiness, PlannedWorkout } from '@/types/training';

const SESSION_KEY = 'loadtoad.training-sessions.v1';

type BlockStatus = 'pending' | 'complete' | 'skipped';

type StoredTrainingSession = {
  id: number;
  date: string;
  sessionKind: PlannedWorkout['kind'];
  sessionTitle: string;
  phase: PlannedWorkout['phase'];
  readiness: DailyReadiness;
  readinessAction: 'normal' | 'reduce' | 'recovery';
  completedBlocks: number;
  skippedBlocks: number;
  totalBlocks: number;
};

export default function ActiveWorkoutScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [energy, setEnergy] = useState<DailyReadiness['energy'] | null>(null);
  const [soreness, setSoreness] = useState<DailyReadiness['soreness'] | null>(null);
  const [pain, setPain] = useState<DailyReadiness['pain'] | null>(null);
  const [blockStatus, setBlockStatus] = useState<Record<string, BlockStatus>>({});

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

  const workout = useMemo(() => {
    if (!profile) return null;
    const scheduled = getTodayTrainingDay(profile.trainingDays);
    return scheduled ? buildPlannedWorkout(profile, scheduled) : null;
  }, [profile]);

  const readiness =
    energy && soreness && pain
      ? ({ energy, soreness, pain } as DailyReadiness)
      : null;

  const readinessDecision = readiness ? evaluateReadiness(readiness) : null;

  if (loading || !profile) {
    return (
      <View style={styles.loadingPage}>
        <Text style={styles.loadingLogo}>🐸</Text>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={styles.centerPage}>
        <Text style={styles.logo}>🐸</Text>
        <Text style={styles.title}>Recovery Day</Text>
        <Text style={styles.bodyCopy}>There is no scheduled training session today.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace('/')}>
          <Text style={styles.primaryButtonText}>Back to Today</Text>
        </Pressable>
      </View>
    );
  }

  function setStatus(blockId: string, status: BlockStatus) {
    setBlockStatus((current) => ({ ...current, [blockId]: status }));
  }

  function beginWorkout() {
    if (!readiness) return;
    setStarted(true);
  }

  async function finishWorkout() {
    if (!readiness || !readinessDecision) return;

    const statuses = workout.blocks.map((block) => blockStatus[block.id] ?? 'pending');
    const completedBlocks = statuses.filter((status) => status === 'complete').length;
    const skippedBlocks = statuses.filter((status) => status === 'skipped').length;

    setSaving(true);

    try {
      const existing = await AsyncStorage.getItem(SESSION_KEY);
      const sessions: StoredTrainingSession[] = existing ? JSON.parse(existing) : [];

      sessions.push({
        id: Date.now(),
        date: new Date().toISOString(),
        sessionKind: workout.kind,
        sessionTitle: workout.title,
        phase: workout.phase,
        readiness,
        readinessAction: readinessDecision.action,
        completedBlocks,
        skippedBlocks,
        totalBlocks: workout.blocks.length,
      });

      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
      router.replace('/');
    } catch (error) {
      console.log('Could not save training session:', error);
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.shell}>
        <Text style={styles.eyebrow}>LOADTOAD PT</Text>
        <Text style={styles.title}>{workout.title}</Text>
        <Text style={styles.bodyCopy}>{workout.subtitle}</Text>

        {!started ? (
          <>
            <View style={styles.readinessCard}>
              <Text style={styles.cardEyebrow}>QUICK READINESS CHECK</Text>
              <Text style={styles.cardTitle}>How are you showing up today?</Text>
              <Text style={styles.readinessHelp}>
                This does not diagnose anything. It only changes today’s training dose when your body is telling us to back off.
              </Text>

              <ReadinessRow label="Energy" value={energy} onChange={setEnergy} lowLabel="Empty" highLabel="Great" />
              <ReadinessRow label="Soreness" value={soreness} onChange={setSoreness} lowLabel="None" highLabel="Very sore" />
              <ReadinessRow label="Pain" value={pain} onChange={setPain} lowLabel="None" highLabel="High" />

              {readinessDecision && (
                <View
                  style={[
                    styles.decisionBox,
                    readinessDecision.action === 'recovery' && styles.recoveryDecision,
                    readinessDecision.action === 'reduce' && styles.reducedDecision,
                  ]}
                >
                  <Text style={styles.decisionTitle}>
                    {readinessDecision.action === 'normal'
                      ? 'Plan stays intact'
                      : readinessDecision.action === 'reduce'
                        ? 'Reduced-volume day'
                        : 'Recovery mode'}
                  </Text>
                  <Text style={styles.decisionText}>{readinessDecision.message}</Text>
                </View>
              )}
            </View>

            <Pressable
              style={[styles.primaryButton, !readiness && styles.disabledButton]}
              onPress={beginWorkout}
              disabled={!readiness}
            >
              <Text style={styles.primaryButtonText}>Begin Session</Text>
            </Pressable>
          </>
        ) : (
          <>
            {readinessDecision && (
              <View style={styles.sessionBanner}>
                <Text style={styles.sessionBannerTitle}>
                  {readinessDecision.action === 'normal'
                    ? 'Normal volume'
                    : readinessDecision.action === 'reduce'
                      ? `${Math.round(readinessDecision.volumeMultiplier * 100)}% volume target`
                      : 'Recovery mode'}
                </Text>
                <Text style={styles.sessionBannerText}>{readinessDecision.message}</Text>
              </View>
            )}

            {readinessDecision?.action === 'recovery' ? (
              <RecoveryReplacement />
            ) : (
              <View style={styles.blocksList}>
                {workout.blocks.map((block, index) => {
                  const status = blockStatus[block.id] ?? 'pending';

                  return (
                    <View key={block.id} style={styles.blockCard}>
                      <View style={styles.blockHeader}>
                        <View style={styles.numberCircle}>
                          <Text style={styles.numberText}>{index + 1}</Text>
                        </View>
                        <View style={styles.blockHeadingCopy}>
                          <Text style={styles.blockTitle}>{block.title}</Text>
                          <Text style={styles.prescription}>{block.prescription}</Text>
                        </View>
                      </View>

                      {block.coaching && <Text style={styles.coaching}>Cue: {block.coaching}</Text>}
                      {block.purpose && <Text style={styles.purpose}>Why: {block.purpose}</Text>}

                      <View style={styles.blockActions}>
                        <Pressable
                          style={[styles.completeButton, status === 'complete' && styles.completeButtonSelected]}
                          onPress={() => setStatus(block.id, status === 'complete' ? 'pending' : 'complete')}
                        >
                          <Text style={[styles.completeButtonText, status === 'complete' && styles.completeButtonTextSelected]}>
                            {status === 'complete' ? '✓ Complete' : 'Complete'}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={[styles.skipButton, status === 'skipped' && styles.skipButtonSelected]}
                          onPress={() => setStatus(block.id, status === 'skipped' ? 'pending' : 'skipped')}
                        >
                          <Text style={styles.skipButtonText}>{status === 'skipped' ? 'Skipped' : 'Skip'}</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.guardrailCard}>
              <Text style={styles.guardrailTitle}>Guardrails</Text>
              {workout.guardrails.map((rule) => (
                <Text key={rule} style={styles.guardrailText}>• {rule}</Text>
              ))}
            </View>

            <Pressable style={styles.primaryButton} onPress={finishWorkout} disabled={saving}>
              <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Finish Session'}</Text>
            </Pressable>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function ReadinessRow({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  label: string;
  value: DailyReadiness['energy'] | null;
  onChange: (value: 1 | 2 | 3 | 4 | 5) => void;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <View style={styles.readinessRow}>
      <Text style={styles.readinessLabel}>{label}</Text>
      <View style={styles.scaleRow}>
        {([1, 2, 3, 4, 5] as const).map((number) => (
          <Pressable
            key={number}
            style={[styles.scaleButton, value === number && styles.scaleButtonSelected]}
            onPress={() => onChange(number)}
          >
            <Text style={[styles.scaleButtonText, value === number && styles.scaleButtonTextSelected]}>{number}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.scaleLabels}>
        <Text style={styles.scaleLabel}>{lowLabel}</Text>
        <Text style={styles.scaleLabel}>{highLabel}</Text>
      </View>
    </View>
  );
}

function RecoveryReplacement() {
  return (
    <View style={styles.recoveryCard}>
      <Text style={styles.recoveryTitle}>Today becomes recovery work</Text>
      <Text style={styles.recoveryItem}>• 10–20 minutes of easy, pain-free movement</Text>
      <Text style={styles.recoveryItem}>• Gentle mobility in comfortable ranges</Text>
      <Text style={styles.recoveryItem}>• Skip painful or high-impact patterns</Text>
      <Text style={styles.recoveryItem}>• No “make-up” max sets later today</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F7F5',
  },
  loadingLogo: {
    fontSize: 56,
    marginBottom: 12,
  },
  centerPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F4F7F5',
  },
  page: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#F4F7F5',
    padding: 20,
    paddingBottom: 50,
  },
  shell: {
    width: '100%',
    maxWidth: 650,
  },
  logo: {
    fontSize: 54,
  },
  eyebrow: {
    color: '#2E8B57',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginTop: 10,
  },
  title: {
    color: '#17211C',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 4,
  },
  bodyCopy: {
    color: '#647168',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 6,
  },
  readinessCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE4DF',
    borderRadius: 18,
    padding: 18,
    marginTop: 20,
  },
  cardEyebrow: {
    color: '#718078',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  cardTitle: {
    color: '#26332C',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  readinessHelp: {
    color: '#69766E',
    lineHeight: 20,
    marginTop: 7,
    marginBottom: 8,
  },
  readinessRow: {
    marginTop: 18,
  },
  readinessLabel: {
    color: '#334139',
    fontWeight: '900',
    marginBottom: 7,
  },
  scaleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scaleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#BEC9C2',
    backgroundColor: '#F9FBFA',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  scaleButtonSelected: {
    backgroundColor: '#2E8B57',
    borderColor: '#2E8B57',
  },
  scaleButtonText: {
    color: '#47554D',
    fontWeight: '900',
  },
  scaleButtonTextSelected: {
    color: '#FFFFFF',
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  scaleLabel: {
    color: '#88928C',
    fontSize: 11,
  },
  decisionBox: {
    backgroundColor: '#EDF8F1',
    borderRadius: 11,
    padding: 12,
    marginTop: 18,
  },
  reducedDecision: {
    backgroundColor: '#FFF8E6',
  },
  recoveryDecision: {
    backgroundColor: '#FCEDED',
  },
  decisionTitle: {
    color: '#26332C',
    fontWeight: '900',
  },
  decisionText: {
    color: '#58655D',
    lineHeight: 19,
    marginTop: 3,
  },
  sessionBanner: {
    backgroundColor: '#EAF5EE',
    borderRadius: 13,
    padding: 14,
    marginTop: 18,
  },
  sessionBannerTitle: {
    color: '#235F3F',
    fontWeight: '900',
    fontSize: 16,
  },
  sessionBannerText: {
    color: '#4D6858',
    lineHeight: 19,
    marginTop: 3,
  },
  blocksList: {
    gap: 12,
    marginTop: 14,
  },
  blockCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE4DF',
    borderRadius: 15,
    padding: 15,
  },
  blockHeader: {
    flexDirection: 'row',
    gap: 11,
    alignItems: 'flex-start',
  },
  numberCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5F1E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    color: '#236B46',
    fontWeight: '900',
  },
  blockHeadingCopy: {
    flex: 1,
  },
  blockTitle: {
    color: '#25312B',
    fontWeight: '900',
    fontSize: 17,
  },
  prescription: {
    color: '#5E6B63',
    lineHeight: 20,
    marginTop: 3,
  },
  coaching: {
    color: '#695C35',
    backgroundColor: '#FFF8E8',
    borderRadius: 8,
    padding: 9,
    marginTop: 10,
    lineHeight: 18,
  },
  purpose: {
    color: '#68756D',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 9,
  },
  blockActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 13,
  },
  completeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#9DC6AD',
    borderRadius: 9,
    alignItems: 'center',
    paddingVertical: 9,
  },
  completeButtonSelected: {
    backgroundColor: '#2E8B57',
    borderColor: '#2E8B57',
  },
  completeButtonText: {
    color: '#267149',
    fontWeight: '900',
  },
  completeButtonTextSelected: {
    color: '#FFFFFF',
  },
  skipButton: {
    width: 88,
    borderWidth: 1,
    borderColor: '#CDD5D0',
    borderRadius: 9,
    alignItems: 'center',
    paddingVertical: 9,
  },
  skipButtonSelected: {
    backgroundColor: '#F0F1F0',
  },
  skipButtonText: {
    color: '#6D7771',
    fontWeight: '800',
  },
  recoveryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0C8C8',
    borderRadius: 15,
    padding: 17,
    marginTop: 14,
  },
  recoveryTitle: {
    color: '#5F3030',
    fontWeight: '900',
    fontSize: 18,
    marginBottom: 7,
  },
  recoveryItem: {
    color: '#655454',
    lineHeight: 21,
    marginTop: 2,
  },
  guardrailCard: {
    backgroundColor: '#FFF8E6',
    borderRadius: 13,
    padding: 14,
    marginTop: 16,
  },
  guardrailTitle: {
    color: '#6D5926',
    fontWeight: '900',
    marginBottom: 4,
  },
  guardrailText: {
    color: '#766432',
    lineHeight: 19,
    marginTop: 2,
  },
  primaryButton: {
    backgroundColor: '#2E8B57',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 18,
  },
  disabledButton: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
});
