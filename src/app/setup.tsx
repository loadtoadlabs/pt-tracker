import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { loadUserProfile, saveUserProfile } from '@/lib/profile-storage';
import { buildWeeklySchedule, formatTrainingDay } from '@/lib/training-schedule';
import {
  emptyUserProfile,
  type CardioComponent,
  type CoreComponent,
  type EquipmentOption,
  type MovementRestriction,
  type StrengthComponent,
  type TrainingDay,
  type UserProfile,
} from '@/types/profile';
import type { TrainingSessionKind } from '@/types/training';

const TOTAL_STEPS = 8;

const CARDIO_OPTIONS: { value: CardioComponent; label: string; detail: string }[] = [
  { value: 'hamr', label: '20m HAMR', detail: 'Shuttle run' },
  { value: 'two-mile-run', label: '2-Mile Run', detail: 'Timed run' },
  { value: 'two-km-walk', label: '2 km Walk', detail: 'Medical alternative — pass/fail' },
];

const STRENGTH_OPTIONS: { value: StrengthComponent; label: string; detail: string }[] = [
  { value: 'push-ups', label: 'Push-Ups', detail: '1 minute' },
  { value: 'hand-release-push-ups', label: 'Hand-Release Push-Ups', detail: '2 minutes' },
];

const CORE_OPTIONS: { value: CoreComponent; label: string; detail: string }[] = [
  { value: 'plank', label: 'Forearm Plank', detail: 'Timed hold' },
  { value: 'sit-ups', label: 'Sit-Ups', detail: '1 minute' },
  { value: 'cross-leg-reverse-crunch', label: 'Cross-Leg Reverse Crunch', detail: '2 minutes' },
];

const EQUIPMENT_OPTIONS: { value: EquipmentOption; label: string }[] = [
  { value: 'full-gym', label: 'Full Gym' },
  { value: 'basic-gym', label: 'Basic Gym' },
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'resistance-bands', label: 'Resistance Bands' },
  { value: 'bodyweight', label: 'Bodyweight Only' },
  { value: 'track', label: 'Track' },
  { value: 'treadmill', label: 'Treadmill' },
  { value: 'bike', label: 'Bike' },
  { value: 'elliptical', label: 'Elliptical' },
  { value: 'rower', label: 'Rower' },
  { value: 'stair-climber', label: 'Stair Climber' },
];

const TRAINING_DAYS: { value: TrainingDay; label: string }[] = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];

const RESTRICTIONS: { value: MovementRestriction; label: string; detail: string }[] = [
  { value: 'squat', label: 'Squatting', detail: 'Avoid or substitute squat-pattern work' },
  { value: 'lunge', label: 'Lunging', detail: 'Avoid split-stance/lunge work' },
  { value: 'kneel', label: 'Kneeling', detail: 'Avoid kneeling positions' },
  { value: 'run', label: 'Running', detail: 'Use lower-impact conditioning when possible' },
  { value: 'jump', label: 'Jumping', detail: 'Avoid plyometric impact' },
  { value: 'high-impact', label: 'High-Impact Work', detail: 'Prefer bike, elliptical, rower, or walking' },
  { value: 'hip-hinge', label: 'Hip Hinging', detail: 'Avoid RDL/deadlift-style patterns' },
  { value: 'spinal-loading', label: 'Heavy Back/Spinal Loading', detail: 'Prefer supported or machine variations' },
  { value: 'overhead-press', label: 'Overhead Pressing', detail: 'Avoid pressing overhead' },
  { value: 'wrist-loading', label: 'Wrist Loading', detail: 'Prefer neutral-grip or machine options' },
];

export default function SetupScreen() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>(emptyUserProfile);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserProfile().then(setProfile);
  }, []);

  function updateProfile<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    setMessage('');
  }

  function updateBaseline<K extends keyof UserProfile['baseline']>(
    key: K,
    value: UserProfile['baseline'][K]
  ) {
    setProfile((current) => ({
      ...current,
      baseline: { ...current.baseline, [key]: value },
    }));
    setMessage('');
  }

  function toggleArrayValue<T extends string>(current: T[], value: T) {
    return current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
  }

  function validateCurrentStep() {
    if (step === 0) {
      const age = Number(profile.ageOnTestDate);
      const height = Number(profile.heightInches);
      const weight = Number(profile.weightLb);

      if (!Number.isInteger(age) || age < 17 || age > 100) return 'Enter your age on test day.';
      if (!profile.sex) return 'Select the scoring standard you use.';
      if (!Number.isFinite(height) || height < 48 || height > 90) return 'Enter a valid height in inches.';
      if (!Number.isFinite(weight) || weight <= 0) return 'Enter your current weight.';
    }

    if (step === 1 && !isFutureDate(profile.testDate)) {
      return 'Enter a valid future test date using YYYY-MM-DD.';
    }

    if (
      step === 2 &&
      (!profile.cardioComponent || !profile.strengthComponent || !profile.coreComponent)
    ) {
      return 'Choose one cardio, strength, and core component.';
    }

    if (step === 3) {
      if (profile.cardioComponent === 'hamr') {
        if (!/^\d+$/.test(profile.baseline.hamrLevel) || !/^\d+$/.test(profile.baseline.hamrShuttle)) {
          return 'Enter your current HAMR level and shuttle.';
        }
      }

      if (profile.cardioComponent === 'two-mile-run' && !isValidTime(profile.baseline.twoMileRunTime)) {
        return 'Enter your current 2-mile time.';
      }

      if (profile.cardioComponent === 'two-km-walk' && !isValidTime(profile.baseline.twoKmWalkTime)) {
        return 'Enter your current 2 km walk time.';
      }

      if (!/^\d+$/.test(profile.baseline.strengthReps)) {
        return 'Enter your current strength-component reps.';
      }

      if (profile.coreComponent === 'plank') {
        if (!isValidTime(profile.baseline.plankTime)) return 'Enter your current plank time.';
      } else if (!/^\d+$/.test(profile.baseline.coreReps)) {
        return 'Enter your current core-component reps.';
      }
    }

    if (step === 4 && profile.equipment.length === 0) {
      return 'Select at least one equipment option.';
    }

    if (step === 5 && profile.trainingDays.length !== 5) {
      return 'Choose exactly five training days.';
    }

    return '';
  }

  function nextStep() {
    const error = validateCurrentStep();
    if (error) {
      setMessage(error);
      return;
    }

    setMessage('');
    setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1));
  }

  function previousStep() {
    setMessage('');
    setStep((current) => Math.max(current - 1, 0));
  }

  async function finishSetup() {
    setSaving(true);
    setMessage('');

    try {
      await saveUserProfile({ ...profile, onboardingComplete: true });
      router.replace('/');
    } catch (error) {
      console.log('Could not save setup:', error);
      setMessage('Could not save your profile. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const schedule = buildWeeklySchedule(profile.trainingDays);

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.shell}>
        <View style={styles.brandRow}>
          <Text style={styles.logo}>🐸</Text>
          <View style={styles.brandCopy}>
            <Text style={styles.brand}>LoadToad PT</Text>
            <Text style={styles.muted}>Set it up once. Let the plan do the thinking.</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} />
        </View>
        <Text style={styles.stepText}>Step {step + 1} of {TOTAL_STEPS}</Text>

        {step === 0 && (
          <View>
            <Text style={styles.heading}>Start with the basics</Text>
            <Text style={styles.bodyCopy}>We use this for scoring, body-composition trends, and training scale.</Text>

            <Field label="Age on your test date">
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={profile.ageOnTestDate}
                onChangeText={(value) => updateProfile('ageOnTestDate', value)}
              />
            </Field>

            <Text style={styles.label}>Scoring standard</Text>
            <View style={styles.choiceRow}>
              {(['male', 'female'] as const).map((sex) => (
                <ChoiceChip
                  key={sex}
                  label={sex === 'male' ? 'Male' : 'Female'}
                  selected={profile.sex === sex}
                  onPress={() => updateProfile('sex', sex)}
                />
              ))}
            </View>

            <Field label="Height (inches)">
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={profile.heightInches}
                onChangeText={(value) => updateProfile('heightInches', value)}
              />
            </Field>

            <Field label="Current weight (lb)">
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={profile.weightLb}
                onChangeText={(value) => updateProfile('weightLb', value)}
              />
            </Field>

            <Field label="Current waist (inches) — optional">
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={profile.waistInches}
                onChangeText={(value) => updateProfile('waistInches', value)}
              />
            </Field>
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={styles.heading}>When do you test?</Text>
            <Text style={styles.bodyCopy}>The exact date controls progression, mock-test timing, and the taper.</Text>
            <Field label="PFA date">
              <TextInput
                style={styles.input}
                autoCapitalize="none"
                keyboardType="number-pad"
                accessibilityLabel="PFA date, year month day"
                value={profile.testDate}
                onChangeText={(value) => updateProfile('testDate', formatDateInput(value))}
              />
            </Field>
            <Text style={styles.helper}>Enter year, month, then day. Hyphens are added automatically.</Text>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.heading}>Choose your test components</Text>
            <Text style={styles.bodyCopy}>Your plan will train the exact events you intend to perform.</Text>

            <Text style={styles.sectionLabel}>Cardio</Text>
            {CARDIO_OPTIONS.map((option) => (
              <OptionCard
                key={option.value}
                label={option.label}
                detail={option.detail}
                selected={profile.cardioComponent === option.value}
                onPress={() => updateProfile('cardioComponent', option.value)}
              />
            ))}

            <Text style={styles.sectionLabel}>Strength</Text>
            {STRENGTH_OPTIONS.map((option) => (
              <OptionCard
                key={option.value}
                label={option.label}
                detail={option.detail}
                selected={profile.strengthComponent === option.value}
                onPress={() => updateProfile('strengthComponent', option.value)}
              />
            ))}

            <Text style={styles.sectionLabel}>Core</Text>
            {CORE_OPTIONS.map((option) => (
              <OptionCard
                key={option.value}
                label={option.label}
                detail={option.detail}
                selected={profile.coreComponent === option.value}
                onPress={() => updateProfile('coreComponent', option.value)}
              />
            ))}
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.heading}>Set your baseline</Text>
            <Text style={styles.bodyCopy}>Use your best recent honest result. LoadToad uses it to set submaximal work targets instead of maxing you out every day.</Text>

            {profile.cardioComponent === 'hamr' && (
              <>
                <Text style={styles.sectionLabel}>20m HAMR</Text>
                <View style={styles.twoColumn}>
                  <Field label="Level" flex>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={profile.baseline.hamrLevel}
                      onChangeText={(value) => updateBaseline('hamrLevel', value)}
                    />
                  </Field>
                  <Field label="Shuttle" flex>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={profile.baseline.hamrShuttle}
                      onChangeText={(value) => updateBaseline('hamrShuttle', value)}
                    />
                  </Field>
                </View>
              </>
            )}

            {profile.cardioComponent === 'two-mile-run' && (
              <Field label="Current 2-mile time">
                <TimeInput
                  value={profile.baseline.twoMileRunTime}
                  onChange={(value) => updateBaseline('twoMileRunTime', value)}
                />
              </Field>
            )}

            {profile.cardioComponent === 'two-km-walk' && (
              <Field label="Current 2 km walk time">
                <TimeInput
                  value={profile.baseline.twoKmWalkTime}
                  onChange={(value) => updateBaseline('twoKmWalkTime', value)}
                />
              </Field>
            )}

            <Field label={`${labelFor(STRENGTH_OPTIONS, profile.strengthComponent)} reps`}>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={profile.baseline.strengthReps}
                onChangeText={(value) => updateBaseline('strengthReps', value)}
              />
            </Field>

            {profile.coreComponent === 'plank' ? (
              <Field label="Forearm plank time">
                <TimeInput
                  value={profile.baseline.plankTime}
                  onChange={(value) => updateBaseline('plankTime', value)}
                />
              </Field>
            ) : (
              <Field label={`${labelFor(CORE_OPTIONS, profile.coreComponent)} reps`}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={profile.baseline.coreReps}
                  onChangeText={(value) => updateBaseline('coreReps', value)}
                />
              </Field>
            )}
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={styles.heading}>What can you train with?</Text>
            <Text style={styles.bodyCopy}>Pick everything you normally have access to. The plan will choose substitutions from this list.</Text>
            <View style={styles.wrapRow}>
              {EQUIPMENT_OPTIONS.map((option) => (
                <ChoiceChip
                  key={option.value}
                  label={option.label}
                  selected={profile.equipment.includes(option.value)}
                  onPress={() =>
                    updateProfile('equipment', toggleArrayValue(profile.equipment, option.value))
                  }
                />
              ))}
            </View>
          </View>
        )}

        {step === 5 && (
          <View>
            <Text style={styles.heading}>Pick five training days</Text>
            <Text style={styles.bodyCopy}>You choose the days. LoadToad preserves the 3 PFA / 2 strength structure and assigns each day a purpose.</Text>

            <View style={styles.wrapRow}>
              {TRAINING_DAYS.map((option) => (
                <ChoiceChip
                  key={option.value}
                  label={option.label}
                  selected={profile.trainingDays.includes(option.value)}
                  disabled={profile.trainingDays.length === 5 && !profile.trainingDays.includes(option.value)}
                  onPress={() =>
                    updateProfile('trainingDays', toggleArrayValue(profile.trainingDays, option.value))
                  }
                />
              ))}
            </View>

            <Text style={styles.counter}>{profile.trainingDays.length} / 5 selected</Text>

            {schedule.length === 5 && (
              <View style={styles.scheduleCard}>
                <Text style={styles.scheduleTitle}>Your weekly structure</Text>
                {schedule.map((entry) => (
                  <View key={entry.day} style={styles.scheduleRow}>
                    <Text style={styles.scheduleDay}>{formatTrainingDay(entry.day)}</Text>
                    <Text style={entry.type === 'pfa' ? styles.pfaText : styles.strengthText}>
                      {scheduleKindLabel(entry.kind)}
                    </Text>
                  </View>
                ))}
                <Text style={styles.scheduleHelper}>Routine PFA work stays submaximal. Mock-test effort is limited and scheduled intentionally.</Text>
              </View>
            )}
          </View>
        )}

        {step === 6 && (
          <View>
            <Text style={styles.heading}>Movement & mobility</Text>
            <Text style={styles.bodyCopy}>Select movements you need LoadToad to avoid or substitute. This is about training around restrictions, not diagnosing them.</Text>

            {RESTRICTIONS.map((option) => {
              const selected = profile.movementRestrictions.includes(option.value);
              return (
                <Pressable
                  key={option.value}
                  style={[styles.restrictionCard, selected && styles.restrictionCardSelected]}
                  onPress={() =>
                    updateProfile(
                      'movementRestrictions',
                      toggleArrayValue(profile.movementRestrictions, option.value)
                    )
                  }
                >
                  <View style={styles.restrictionCopy}>
                    <Text style={[styles.restrictionTitle, selected && styles.restrictionTitleSelected]}>{option.label}</Text>
                    <Text style={styles.restrictionDetail}>{option.detail}</Text>
                  </View>
                  <Text style={styles.check}>{selected ? '✓' : ''}</Text>
                </Pressable>
              );
            })}

            <Field label="Anything else LoadToad should avoid? — optional">
              <TextInput
                style={[styles.input, styles.notesInput]}
                multiline
                placeholder="Example: deep knee bend bothers me; lower back gets tight with heavy loading"
                value={profile.mobilityNotes}
                onChangeText={(value) => updateProfile('mobilityNotes', value)}
              />
            </Field>
          </View>
        )}

        {step === 7 && (
          <View>
            <Text style={styles.heading}>Ready to build your plan</Text>
            <Text style={styles.bodyCopy}>LoadToad will start conservative, use your baseline to set submax targets, and increase work only when you earn it.</Text>

            <ReviewRow label="Test date" value={profile.testDate} />
            <ReviewRow label="Cardio" value={labelFor(CARDIO_OPTIONS, profile.cardioComponent)} />
            <ReviewRow label="Strength" value={labelFor(STRENGTH_OPTIONS, profile.strengthComponent)} />
            <ReviewRow label="Core" value={labelFor(CORE_OPTIONS, profile.coreComponent)} />
            <ReviewRow label="Training days" value={profile.trainingDays.map(formatTrainingDay).join(', ')} />
            <ReviewRow label="Equipment" value={`${profile.equipment.length} option${profile.equipment.length === 1 ? '' : 's'}`} />
            <ReviewRow label="Restrictions" value={profile.movementRestrictions.length ? `${profile.movementRestrictions.length} saved` : 'None selected'} />

            <View style={styles.programRules}>
              <Text style={styles.programRulesTitle}>Program rules</Text>
              <Text style={styles.rule}>• 3 PFA-specific days + 2 strength-support days</Text>
              <Text style={styles.rule}>• Routine PFA sets stay submaximal</Text>
              <Text style={styles.rule}>• One true max-effort mock at most in a training week</Text>
              <Text style={styles.rule}>• Strength days do not stack hard running</Text>
              <Text style={styles.rule}>• Progression is earned by clean successful sessions</Text>
              <Text style={styles.rule}>• Pain/restriction flags trigger substitutions</Text>
            </View>
          </View>
        )}

        {message !== '' && <Text style={styles.error}>{message}</Text>}

        <View style={styles.navRow}>
          {step > 0 ? (
            <Pressable style={styles.backButton} onPress={previousStep}>
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
          ) : (
            <View style={styles.backSpacer} />
          )}

          {step < TOTAL_STEPS - 1 ? (
            <Pressable style={styles.nextButton} onPress={nextStep}>
              <Text style={styles.nextButtonText}>Continue</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.nextButton} onPress={finishSetup} disabled={saving}>
              <Text style={styles.nextButtonText}>{saving ? 'Saving…' : 'Build My Plan'}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function Field({ label, children, flex = false }: { label: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <View style={[styles.field, flex && styles.flexField]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <TextInput
      style={styles.input}
      keyboardType="numeric"
      value={value}
      onChangeText={onChange}
      onBlur={() => {
        const formatted = formatTimeShorthand(value);
        if (formatted) onChange(formatted);
      }}
    />
  );
}

function ChoiceChip({ label, selected, onPress, disabled = false }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      style={[
        styles.choiceChip,
        selected && styles.choiceChipSelected,
        disabled && styles.choiceChipDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function OptionCard({ label, detail, selected, onPress }: { label: string; detail: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.optionCard, selected && styles.optionCardSelected]} onPress={onPress}>
      <View>
        <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{label}</Text>
        <Text style={styles.optionDetail}>{detail}</Text>
      </View>
      <Text style={styles.check}>{selected ? '✓' : ''}</Text>
    </Pressable>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value || '-'}</Text>
    </View>
  );
}

function scheduleKindLabel(kind: TrainingSessionKind) {
  if (kind === 'pfa-technique') return 'PFA — Technique / Acceleration';
  if (kind === 'pfa-controlled') return 'PFA — Controlled Specific';
  if (kind === 'pfa-quality') return 'PFA — Quality / Mock';
  if (kind === 'strength-a') return 'Strength A — Lower + Trunk';
  return 'Strength B — Upper + Durability';
}

function formatTimeShorthand(value: string) {
  const clean = value.trim().replace(':', '');
  if (clean === '' || !/^\d+$/.test(clean)) return '';

  let totalSeconds = 0;
  if (clean.length <= 2) {
    totalSeconds = Number(clean);
  } else {
    const minutes = Number(clean.slice(0, -2));
    const seconds = Number(clean.slice(-2));
    totalSeconds = minutes * 60 + seconds;
  }

  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function isValidTime(value: string) {
  return /^\d+:[0-5]\d$/.test(value.trim());
}

function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)]
    .filter(Boolean)
    .join('-');
}

function isFutureDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const target = new Date(`${value}T12:00:00`);
  if (Number.isNaN(target.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return target.getTime() >= today.getTime();
}

function labelFor<T extends string>(options: { value: T; label: string }[], value: T | '') {
  return options.find((option) => option.value === value)?.label ?? 'Not selected';
}

const styles = StyleSheet.create({
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 18,
  },
  brandCopy: {
    flex: 1,
  },
  logo: {
    fontSize: 48,
  },
  brand: {
    color: '#17211C',
    fontSize: 25,
    fontWeight: '900',
  },
  muted: {
    color: '#68756D',
    marginTop: 2,
  },
  progressTrack: {
    height: 7,
    backgroundColor: '#DDE5E0',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2E8B57',
  },
  stepText: {
    color: '#6E7A73',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 7,
    marginBottom: 22,
  },
  heading: {
    color: '#17211C',
    fontSize: 30,
    fontWeight: '900',
  },
  bodyCopy: {
    color: '#647168',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 7,
    marginBottom: 14,
  },
  field: {
    marginTop: 14,
  },
  flexField: {
    flex: 1,
  },
  label: {
    color: '#47554D',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#BBC7C0',
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helper: {
    color: '#748078',
    fontSize: 12,
    marginTop: 7,
  },
  sectionLabel: {
    color: '#2B3831',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 18,
    marginBottom: 8,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6DED9',
    borderRadius: 13,
    padding: 14,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionCardSelected: {
    borderColor: '#2E8B57',
    backgroundColor: '#EDF8F1',
  },
  optionTitle: {
    color: '#26332C',
    fontWeight: '900',
    fontSize: 16,
  },
  optionTitleSelected: {
    color: '#1F6A43',
  },
  optionDetail: {
    color: '#718078',
    marginTop: 2,
  },
  check: {
    color: '#2E8B57',
    fontSize: 20,
    fontWeight: '900',
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 9,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 10,
  },
  choiceChip: {
    borderWidth: 1,
    borderColor: '#BBC7C0',
    backgroundColor: '#FFFFFF',
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  choiceChipSelected: {
    backgroundColor: '#2E8B57',
    borderColor: '#2E8B57',
  },
  choiceChipDisabled: {
    opacity: 0.35,
  },
  choiceText: {
    color: '#47554D',
    fontWeight: '800',
  },
  choiceTextSelected: {
    color: '#FFFFFF',
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 10,
  },
  counter: {
    color: '#6E7A73',
    marginTop: 11,
    fontWeight: '700',
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8E0DB',
    borderRadius: 14,
    padding: 15,
    marginTop: 16,
  },
  scheduleTitle: {
    color: '#27342D',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 7,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2EF',
  },
  scheduleDay: {
    color: '#58655D',
    fontWeight: '800',
  },
  pfaText: {
    color: '#267149',
    fontWeight: '900',
    textAlign: 'right',
  },
  strengthText: {
    color: '#535F92',
    fontWeight: '900',
    textAlign: 'right',
  },
  scheduleHelper: {
    color: '#718078',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  restrictionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6DED9',
    borderRadius: 13,
    padding: 13,
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },
  restrictionCardSelected: {
    borderColor: '#2E8B57',
    backgroundColor: '#EDF8F1',
  },
  restrictionCopy: {
    flex: 1,
  },
  restrictionTitle: {
    color: '#2F3B35',
    fontWeight: '900',
  },
  restrictionTitleSelected: {
    color: '#1F6A43',
  },
  restrictionDetail: {
    color: '#718078',
    fontSize: 12,
    marginTop: 2,
  },
  reviewRow: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E7ECE9',
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  reviewLabel: {
    color: '#6C7971',
    fontWeight: '700',
  },
  reviewValue: {
    color: '#26332C',
    fontWeight: '900',
    flex: 1,
    textAlign: 'right',
  },
  programRules: {
    backgroundColor: '#EDF8F1',
    borderRadius: 14,
    padding: 15,
    marginTop: 16,
  },
  programRulesTitle: {
    color: '#205F3F',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 7,
  },
  rule: {
    color: '#3D5A49',
    lineHeight: 21,
    marginTop: 2,
  },
  error: {
    color: '#A62B2B',
    fontWeight: '800',
    marginTop: 14,
  },
  navRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  backSpacer: {
    flex: 1,
  },
  backButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#BFCAC3',
    borderRadius: 11,
    alignItems: 'center',
    paddingVertical: 13,
  },
  backButtonText: {
    color: '#47554D',
    fontWeight: '900',
  },
  nextButton: {
    flex: 1.4,
    backgroundColor: '#2E8B57',
    borderRadius: 11,
    alignItems: 'center',
    paddingVertical: 13,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
