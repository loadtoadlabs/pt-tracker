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

const TOTAL_STEPS = 8;

const CARDIO_OPTIONS: { value: CardioComponent; label: string; detail: string }[] = [
  { value: 'hamr', label: '20m HAMR', detail: 'Shuttle run' },
  { value: 'two-mile-run', label: '2-Mile Run', detail: 'Timed run' },
  {
    value: 'two-km-walk',
    label: '2 km Walk',
    detail: 'Medical alternative — pass/fail',
  },
];

const STRENGTH_OPTIONS: { value: StrengthComponent; label: string; detail: string }[] = [
  { value: 'push-ups', label: 'Push-Ups', detail: '1 minute' },
  {
    value: 'hand-release-push-ups',
    label: 'Hand-Release Push-Ups',
    detail: '2 minutes',
  },
];

const CORE_OPTIONS: { value: CoreComponent; label: string; detail: string }[] = [
  { value: 'plank', label: 'Forearm Plank', detail: 'Timed hold' },
  { value: 'sit-ups', label: 'Sit-Ups', detail: '1 minute' },
  {
    value: 'cross-leg-reverse-crunch',
    label: 'Cross-Leg Reverse Crunch',
    detail: '2 minutes',
  },
];

const EQUIPMENT_OPTIONS: { value: EquipmentOption; label: string }[] = [
  { value: 'full-gym', label: 'Full Gym' },
  { value: 'basic-gym', label: 'Basic Gym' },
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'bodyweight', label: 'Bodyweight Only' },
  { value: 'track', label: 'Track' },
  { value: 'treadmill', label: 'Treadmill' },
  { value: 'bike', label: 'Bike' },
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

const RESTRICTIONS: { value: MovementRestriction; label: string }[] = [
  { value: 'squat', label: 'Squatting' },
  { value: 'lunge', label: 'Lunging' },
  { value: 'kneel', label: 'Kneeling' },
  { value: 'run', label: 'Running' },
  { value: 'jump', label: 'Jumping' },
  { value: 'overhead-press', label: 'Overhead Pressing' },
  { value: 'high-impact', label: 'High-Impact Work' },
];

function formatTimeShorthand(value: string) {
  const clean = value.trim().replace(':', '');

  if (clean === '') return '';
  if (!/^\d+$/.test(clean)) return value;

  if (clean.length <= 2) {
    const seconds = Number(clean);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  }

  const minutes = Number(clean.slice(0, -2));
  const seconds = Number(clean.slice(-2));
  const totalSeconds = minutes * 60 + seconds;

  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function isValidTime(value: string) {
  return /^\d+:[0-5]\d$/.test(value.trim());
}

function isFutureDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const target = new Date(`${value}T12:00:00`);
  if (Number.isNaN(target.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return target.getTime() >= today.getTime();
}

function labelFor<T extends string>(
  options: { value: T; label: string }[],
  value: T | ''
) {
  return options.find((option) => option.value === value)?.label ?? 'Not selected';
}

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

      if (!Number.isInteger(age) || age < 17 || age > 100) {
        return 'Enter your age on test day.';
      }

      if (!profile.sex) return 'Select the scoring standard you use.';
      if (!Number.isFinite(height) || height < 48 || height > 90) {
        return 'Enter a valid height in inches.';
      }
      if (!Number.isFinite(weight) || weight <= 0) return 'Enter your current weight.';
    }

    if (step === 1 && !isFutureDate(profile.testDate)) {
      return 'Enter a valid test date using YYYY-MM-DD.';
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

      if (
        profile.cardioComponent === 'two-mile-run' &&
        !isValidTime(profile.baseline.twoMileRunTime)
      ) {
        return 'Enter your current 2-mile time.';
      }

      if (
        profile.cardioComponent === 'two-km-walk' &&
        !isValidTime(profile.baseline.twoKmWalkTime)
      ) {
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
          <View>
            <Text style={styles.brand}>LoadToad PT</Text>
            <Text style={styles.muted}>Build your plan once. Adjust as you improve.</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} />
        </View>
        <Text style={styles.stepText}>Step {step + 1} of {TOTAL_STEPS}</Text>

        {step === 0 && (
          <View>
            <Text style={styles.heading}>Start with the basics</Text>
            <Text style={styles.bodyCopy}>
              We use this to choose the correct scoring bracket and scale training appropriately.
            </Text>

            <Text style={styles.label}>Age on your test date</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="36"
              value={profile.ageOnTestDate}
              onChangeText={(value) => updateProfile('ageOnTestDate', value)}
            />

            <Text style={styles.label}>Scoring standard</Text>
            <View style={styles.choiceRow}>
              {(['male', 'female'] as const).map((sex) => (
                <Pressable
                  key={sex}
                  style={[styles.choiceChip, profile.sex === sex && styles.choiceChipSelected]}
                  onPress={() => updateProfile('sex', sex)}
                >
                  <Text style={[styles.choiceText, profile.sex === sex && styles.choiceTextSelected]}>
                    {sex === 'male' ? 'Male' : 'Female'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Height (inches)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="67"
              value={profile.heightInches}
              onChangeText={(value) => updateProfile('heightInches', value)}
            />

            <Text style={styles.label}>Current weight (lb)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="225"
              value={profile.weightLb}
              onChangeText={(value) => updateProfile('weightLb', value)}
            />

            <Text style={styles.label}>Current waist (inches) — optional</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="38.5"
              value={profile.waistInches}
              onChangeText={(value) => updateProfile('waistInches', value)}
            />
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={styles.heading}>When do you test?</Text>
            <Text style={styles.bodyCopy}>
              Your exact date controls progression, mock assessments, and the taper before test day.
            </Text>
            <Text style={styles.label}>PFA date</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-10-15"
              autoCapitalize="none"
              value={profile.testDate}
              onChangeText={(value) => updateProfile('testDate', value)}
            />
            <Text style={styles.helper}>Use YYYY-MM-DD for now. A calendar picker comes later.</Text>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.heading}>Choose your test components</Text>
            <Text style={styles.bodyCopy}>
              LoadToad will build the plan around the exact events you intend to perform.
            </Text>

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
            <Text style={styles.bodyCopy}>
              Use your best recent honest result. This is how LoadToad decides where your program should start.
            </Text>

            {profile.cardioComponent === 'hamr' && (
              <>
                <Text style={styles.sectionLabel}>20m HAMR</Text>
                <View style={styles.twoColumn}>
                  <View style={styles.flexField}>
                    <Text style={styles.label}>Level</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="5"
                      value={profile.baseline.hamrLevel}
                      onChangeText={(value) => updateBaseline('hamrLevel', value)}
                    />
                  </View>
                  <View style={styles.flexField}>
                    <Text style={styles.label}>Shuttle</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="6"
                      value={profile.baseline.hamrShuttle}
                      onChangeText={(value) => updateBaseline('hamrShuttle', value)}
                    />
                  </View>
                </View>
              </>
            )}

            {profile.cardioComponent === 'two-mile-run' && (
              <TimeInput
                label="Current 2-mile time"
                value={profile.baseline.twoMileRunTime}
                placeholder="1830 → 18:30"
                onChangeText={(value) => updateBaseline('twoMileRunTime', value)}
                onFormat={(value) => updateBaseline('twoMileRunTime', value)}
              />
            )}

            {profile.cardioComponent === 'two-km-walk' && (
              <TimeInput
                label="Current 2 km walk time"
                value={profile.baseline.twoKmWalkTime}
                placeholder="1610 → 16:10"
                onChangeText={(value) => updateBaseline('twoKmWalkTime', value)}
                onFormat={(value) => updateBaseline('twoKmWalkTime', value)}
              />
            )}

            <Text style={styles.sectionLabel}>
              {labelFor(STRENGTH_OPTIONS, profile.strengthComponent)}
            </Text>
            <Text style={styles.label}>Reps</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="25"
              value={profile.baseline.strengthReps}
              onChangeText={(value) => updateBaseline('strengthReps', value)}
            />

            <Text style={styles.sectionLabel}>{labelFor(CORE_OPTIONS, profile.coreComponent)}</Text>
            {profile.coreComponent === 'plank' ? (
              <TimeInput
                label="Plank time"
                value={profile.baseline.plankTime}
                placeholder="115 → 1:15"
                onChangeText={(value) => updateBaseline('plankTime', value)}
                onFormat={(value) => updateBaseline('plankTime', value)}
              />
            ) : (
              <>
                <Text style={styles.label}>Reps</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="30"
                  value={profile.baseline.coreReps}
                  onChangeText={(value) => updateBaseline('coreReps', value)}
                />
              </>
            )}
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={styles.heading}>What can you train with?</Text>
            <Text style={styles.bodyCopy}>
              Pick everything you reliably have access to. The plan will substitute around what you do not have.
            </Text>
            <View style={styles.wrapRow}>
              {EQUIPMENT_OPTIONS.map((option) => {
                const selected = profile.equipment.includes(option.value);
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.choiceChip, selected && styles.choiceChipSelected]}
                    onPress={() =>
                      updateProfile(
                        'equipment',
                        toggleArrayValue(profile.equipment, option.value)
                      )
                    }
                  >
                    <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {step === 5 && (
          <View>
            <Text style={styles.heading}>Pick five training days</Text>
            <Text style={styles.bodyCopy}>
              You choose the days. LoadToad automatically preserves three PFA-focused sessions and two strength-support sessions.
            </Text>
            <Text style={styles.counter}>{profile.trainingDays.length}/5 selected</Text>
            <View style={styles.wrapRow}>
              {TRAINING_DAYS.map((option) => {
                const selected = profile.trainingDays.includes(option.value);
                const disabled = !selected && profile.trainingDays.length >= 5;
                return (
                  <Pressable
                    key={option.value}
                    disabled={disabled}
                    style={[
                      styles.dayChip,
                      selected && styles.choiceChipSelected,
                      disabled && styles.disabled,
                    ]}
                    onPress={() =>
                      updateProfile(
                        'trainingDays',
                        toggleArrayValue(profile.trainingDays, option.value)
                      )
                    }
                  >
                    <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {profile.trainingDays.length === 5 && (
              <View style={styles.schedulePreview}>
                {schedule.map((entry) => (
                  <View key={entry.day} style={styles.scheduleRow}>
                    <Text style={styles.scheduleDay}>{formatTrainingDay(entry.day)}</Text>
                    <Text style={entry.type === 'pfa' ? styles.pfaTag : styles.strengthTag}>
                      {entry.type === 'pfa' ? 'PFA Focus' : 'Strength'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {step === 6 && (
          <View>
            <Text style={styles.heading}>Movement & mobility</Text>
            <Text style={styles.bodyCopy}>
              Select movements you need LoadToad to avoid or substitute. This changes exercise selection — it does not diagnose injuries.
            </Text>
            <Text style={styles.sectionLabel}>Avoid or modify</Text>
            <View style={styles.wrapRow}>
              {RESTRICTIONS.map((option) => {
                const selected = profile.movementRestrictions.includes(option.value);
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.choiceChip, selected && styles.warningChipSelected]}
                    onPress={() =>
                      updateProfile(
                        'movementRestrictions',
                        toggleArrayValue(profile.movementRestrictions, option.value)
                      )
                    }
                  >
                    <Text style={[styles.choiceText, selected && styles.warningTextSelected]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Anything else LoadToad should avoid?</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              multiline
              placeholder="Example: Deep knee flexion bothers my left knee. Heavy spinal loading irritates my back."
              value={profile.mobilityNotes}
              onChangeText={(value) => updateProfile('mobilityNotes', value)}
            />
          </View>
        )}

        {step === 7 && (
          <View>
            <Text style={styles.heading}>Ready to build your plan</Text>
            <Text style={styles.bodyCopy}>
              LoadToad will use this profile to calculate your starting level, prioritize weak components, and build the first 3/2 training week.
            </Text>

            <ReviewRow label="Test date" value={profile.testDate} />
            <ReviewRow label="Cardio" value={labelFor(CARDIO_OPTIONS, profile.cardioComponent)} />
            <ReviewRow label="Strength" value={labelFor(STRENGTH_OPTIONS, profile.strengthComponent)} />
            <ReviewRow label="Core" value={labelFor(CORE_OPTIONS, profile.coreComponent)} />
            <ReviewRow label="Training days" value={profile.trainingDays.map(formatTrainingDay).join(', ')} />
            <ReviewRow label="Equipment" value={`${profile.equipment.length} selected`} />
            <ReviewRow
              label="Movement restrictions"
              value={profile.movementRestrictions.length ? `${profile.movementRestrictions.length} selected` : 'None selected'}
            />

            <Pressable style={styles.finishButton} onPress={finishSetup} disabled={saving}>
              <Text style={styles.primaryButtonText}>
                {saving ? 'Saving…' : 'Build My Plan'}
              </Text>
            </Pressable>
          </View>
        )}

        {message !== '' && <Text style={styles.error}>{message}</Text>}

        {step < TOTAL_STEPS - 1 && (
          <View style={styles.navigationRow}>
            {step > 0 ? (
              <Pressable style={styles.backButton} onPress={previousStep}>
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
            ) : (
              <View style={styles.navigationSpacer} />
            )}
            <Pressable style={styles.nextButton} onPress={nextStep}>
              <Text style={styles.primaryButtonText}>Continue</Text>
            </Pressable>
          </View>
        )}

        {step === TOTAL_STEPS - 1 && (
          <Pressable style={styles.reviewBackButton} onPress={previousStep}>
            <Text style={styles.backButtonText}>Back and Edit</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

type OptionCardProps = {
  label: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
};

function OptionCard({ label, detail, selected, onPress }: OptionCardProps) {
  return (
    <Pressable style={[styles.optionCard, selected && styles.optionCardSelected]} onPress={onPress}>
      <View style={styles.optionTextBlock}>
        <Text style={styles.optionTitle}>{label}</Text>
        <Text style={styles.optionDetail}>{detail}</Text>
      </View>
      <Text style={styles.optionCheck}>{selected ? '✓' : '○'}</Text>
    </Pressable>
  );
}

type TimeInputProps = {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  onFormat: (value: string) => void;
};

function TimeInput({ label, value, placeholder, onChangeText, onFormat }: TimeInputProps) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onBlur={() => onFormat(formatTimeShorthand(value))}
      />
    </>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    backgroundColor: '#F4F7F5',
    padding: 20,
    alignItems: 'center',
  },
  shell: {
    width: '100%',
    maxWidth: 620,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    marginVertical: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  logo: {
    fontSize: 42,
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
  },
  muted: {
    color: '#66736C',
    marginTop: 2,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E3E9E5',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2E8B57',
  },
  stepText: {
    color: '#66736C',
    fontSize: 13,
    marginTop: 8,
    marginBottom: 20,
  },
  heading: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#17211C',
  },
  bodyCopy: {
    fontSize: 16,
    lineHeight: 23,
    color: '#5A6760',
    marginTop: 8,
    marginBottom: 18,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 7,
    color: '#26322C',
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#26322C',
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD4CF',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  notesInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  helper: {
    color: '#748078',
    fontSize: 13,
    marginTop: 7,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choiceChip: {
    borderWidth: 1,
    borderColor: '#CBD4CF',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#FAFCFA',
  },
  dayChip: {
    minWidth: 64,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD4CF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FAFCFA',
  },
  choiceChipSelected: {
    backgroundColor: '#E4F3EA',
    borderColor: '#2E8B57',
  },
  warningChipSelected: {
    backgroundColor: '#FFF0E8',
    borderColor: '#B85C2C',
  },
  choiceText: {
    color: '#34413A',
    fontWeight: '600',
  },
  choiceTextSelected: {
    color: '#1F6A43',
  },
  warningTextSelected: {
    color: '#91431F',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D5DDD8',
    borderRadius: 14,
    padding: 15,
    marginBottom: 9,
  },
  optionCardSelected: {
    borderColor: '#2E8B57',
    backgroundColor: '#EEF8F2',
  },
  optionTextBlock: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#25312B',
  },
  optionDetail: {
    color: '#6C776F',
    marginTop: 3,
  },
  optionCheck: {
    fontSize: 22,
    color: '#2E8B57',
    marginLeft: 10,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 12,
  },
  flexField: {
    flex: 1,
  },
  counter: {
    fontWeight: '800',
    color: '#2E8B57',
    marginBottom: 14,
  },
  disabled: {
    opacity: 0.35,
  },
  schedulePreview: {
    marginTop: 22,
    borderTopWidth: 1,
    borderTopColor: '#E1E7E3',
    paddingTop: 12,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  scheduleDay: {
    fontWeight: '700',
    color: '#26322C',
  },
  pfaTag: {
    color: '#1F6A43',
    fontWeight: '800',
  },
  strengthTag: {
    color: '#4E5D87',
    fontWeight: '800',
  },
  reviewRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#E6EBE8',
    paddingVertical: 12,
  },
  reviewLabel: {
    color: '#748078',
    fontSize: 13,
  },
  reviewValue: {
    color: '#25312B',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 3,
  },
  error: {
    color: '#B42318',
    backgroundColor: '#FFF1F0',
    borderRadius: 10,
    padding: 11,
    marginTop: 16,
    fontWeight: '700',
  },
  navigationRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 26,
  },
  navigationSpacer: {
    flex: 1,
  },
  backButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#BCC7C0',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#334039',
    fontSize: 16,
    fontWeight: '800',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#2E8B57',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  finishButton: {
    backgroundColor: '#2E8B57',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  reviewBackButton: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 10,
  },
});
