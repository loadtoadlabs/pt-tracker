import type { UserProfile } from '@/types/profile';
import type {
  PlannedWorkout,
  ScheduledTrainingDay,
  TrainingPhase,
  WorkoutBlock,
} from '@/types/training';

const DAY_MS = 86_400_000;

export function getTrainingPhase(testDate: string, now = new Date()): TrainingPhase {
  const days = getDaysUntil(testDate, now);

  if (days <= 7) return 'taper';
  if (days <= 28) return 'sharpen';
  if (days <= 56) return 'build';
  return 'foundation';
}

export function buildPlannedWorkout(
  profile: UserProfile,
  scheduled: ScheduledTrainingDay,
  now = new Date()
): PlannedWorkout {
  const phase = getTrainingPhase(profile.testDate, now);
  const mockWeek = shouldRunMock(profile.testDate, now, phase);

  if (scheduled.kind === 'strength-a') {
    return buildStrengthA(profile, scheduled, phase);
  }

  if (scheduled.kind === 'strength-b') {
    return buildStrengthB(profile, scheduled, phase);
  }

  if (scheduled.kind === 'pfa-technique') {
    return buildPfaTechnique(profile, scheduled, phase);
  }

  if (scheduled.kind === 'pfa-controlled') {
    return buildPfaControlled(profile, scheduled, phase);
  }

  return mockWeek
    ? buildMock(profile, scheduled, phase)
    : buildPfaQuality(profile, scheduled, phase);
}

function buildPfaTechnique(
  profile: UserProfile,
  scheduled: ScheduledTrainingDay,
  phase: TrainingPhase
): PlannedWorkout {
  return {
    ...baseWorkout(scheduled, phase),
    title: cardioTechniqueTitle(profile),
    subtitle: 'Specific practice without turning every session into a test.',
    intensity: phase === 'taper' ? 'moderate' : 'hard-controlled',
    estimatedMinutes: phase === 'taper' ? 35 : 50,
    isMock: false,
    blocks: [
      warmupBlock(profile),
      cardioTechniqueBlock(profile, phase),
      strengthComponentBlock(profile, 0.55, 3),
      coreComponentBlock(profile, 0.55, 3),
      recoveryWalkBlock(profile, phase === 'taper' ? 15 : 30),
    ],
    guardrails: commonGuardrails(profile),
  };
}

function buildPfaControlled(
  profile: UserProfile,
  scheduled: ScheduledTrainingDay,
  phase: TrainingPhase
): PlannedWorkout {
  return {
    ...baseWorkout(scheduled, phase),
    title: `${cardioLabel(profile)} — Controlled Specific Practice`,
    subtitle: 'Practice the event hard enough to adapt, but stop before form falls apart.',
    intensity: phase === 'taper' ? 'moderate' : 'moderate-hard',
    estimatedMinutes: phase === 'taper' ? 35 : 50,
    isMock: false,
    blocks: [
      warmupBlock(profile),
      cardioControlledBlock(profile, phase),
      strengthComponentBlock(profile, 0.6, 2),
      coreComponentBlock(profile, 0.6, 2),
      recoveryWalkBlock(profile, 20),
    ],
    guardrails: [
      ...commonGuardrails(profile),
      'Finish with something left in the tank. This is not a max-effort test day.',
    ],
  };
}

function buildPfaQuality(
  profile: UserProfile,
  scheduled: ScheduledTrainingDay,
  phase: TrainingPhase
): PlannedWorkout {
  return {
    ...baseWorkout(scheduled, phase),
    title: `${cardioLabel(profile)} — Quality Intervals`,
    subtitle: 'High-value conditioning with controlled volume and clean PFA work.',
    intensity: phase === 'taper' ? 'moderate' : 'hard-controlled',
    estimatedMinutes: phase === 'taper' ? 30 : 55,
    isMock: false,
    blocks: [
      warmupBlock(profile),
      cardioQualityBlock(profile, phase),
      strengthComponentBlock(profile, 0.5, 3),
      coreQualityBlock(profile, phase),
      recoveryWalkBlock(profile, phase === 'taper' ? 10 : 20),
    ],
    guardrails: [
      ...commonGuardrails(profile),
      'Do not add extra max-effort work because the session felt good.',
    ],
  };
}

function buildMock(
  profile: UserProfile,
  scheduled: ScheduledTrainingDay,
  phase: TrainingPhase
): PlannedWorkout {
  return {
    ...baseWorkout(scheduled, phase),
    title: 'Mock PFA',
    subtitle: 'One true test-effort session. Use official order, standards, and clean form.',
    intensity: 'test',
    estimatedMinutes: 60,
    isMock: true,
    blocks: [
      warmupBlock(profile),
      {
        id: 'mock-strength',
        title: strengthLabel(profile),
        prescription: 'Perform one official test-effort attempt.',
        purpose: 'Measure current PFA strength performance.',
      },
      {
        id: 'mock-core',
        title: coreLabel(profile),
        prescription: 'Perform one official test-effort attempt.',
        purpose: 'Measure current PFA core performance.',
      },
      {
        id: 'mock-cardio',
        title: cardioLabel(profile),
        prescription: mockCardioPrescription(profile),
        purpose: 'Measure current PFA cardio performance.',
      },
      recoveryWalkBlock(profile, 20),
    ],
    guardrails: [
      'This is the only true max-effort PFA session in the training week.',
      ...commonGuardrails(profile),
    ],
  };
}

function buildStrengthA(
  profile: UserProfile,
  scheduled: ScheduledTrainingDay,
  phase: TrainingPhase
): PlannedWorkout {
  const volume = phase === 'taper' ? '2' : '3';

  return {
    ...baseWorkout(scheduled, phase),
    title: 'Strength A — Lower Body + Trunk',
    subtitle: 'Build the legs, posterior chain, and trunk that support the selected PFA path.',
    intensity: phase === 'taper' ? 'easy' : 'moderate',
    estimatedMinutes: phase === 'taper' ? 35 : 55,
    isMock: false,
    blocks: [
      {
        id: 'knee-dominant',
        title: kneeDominantExercise(profile),
        prescription: `${volume} sets × 8–12 clean reps. Finish each set with 2–3 reps in reserve.`,
        coaching: 'Controlled lowering. No grinding reps.',
        purpose: 'Lower-body strength without adding unnecessary fatigue.',
      },
      {
        id: 'posterior-chain',
        title: posteriorChainExercise(profile),
        prescription: `${volume} sets × 10–15 reps at a controlled effort.`,
        purpose: 'Hamstring and hip support for running, shuttles, and durability.',
      },
      {
        id: 'calves',
        title: calfExercise(profile),
        prescription: `${volume} sets × 12–20 reps. Pause briefly at the top.`,
        purpose: 'Ankle stiffness and lower-leg endurance for running and change of direction.',
      },
      trunkSupportBlock(profile, phase),
      mobilityBlock(profile),
    ],
    guardrails: [
      'No hard running on strength-support days.',
      'Progress load only after all prescribed reps are clean for two sessions.',
      ...commonGuardrails(profile),
    ],
  };
}

function buildStrengthB(
  profile: UserProfile,
  scheduled: ScheduledTrainingDay,
  phase: TrainingPhase
): PlannedWorkout {
  const volume = phase === 'taper' ? '2' : '3';

  return {
    ...baseWorkout(scheduled, phase),
    title: 'Strength B — Upper Body + Durability',
    subtitle: 'Support push performance, posture, trunk control, and whole-body durability.',
    intensity: phase === 'taper' ? 'easy' : 'moderate',
    estimatedMinutes: phase === 'taper' ? 35 : 55,
    isMock: false,
    blocks: [
      {
        id: 'press',
        title: pressExercise(profile),
        prescription: `${volume} sets × 8–12 reps. Stop 2–3 reps before failure.`,
        purpose: `Build strength that transfers to ${strengthLabel(profile)} without maxing out daily.`,
      },
      {
        id: 'pull',
        title: pullExercise(profile),
        prescription: `${volume} sets × 8–15 controlled reps.`,
        purpose: 'Balance pressing volume and support shoulder positioning.',
      },
      {
        id: 'single-leg-or-hip',
        title: secondaryLowerExercise(profile),
        prescription: `${volume} sets × 8–12 reps per side or 10–15 bilateral reps.`,
        purpose: 'Build lower-body capacity while respecting movement restrictions.',
      },
      trunkSupportBlock(profile, phase),
      mobilityBlock(profile),
    ],
    guardrails: [
      'No hard running on strength-support days.',
      'Strength work should support PFA practice, not leave you wrecked for the next session.',
      ...commonGuardrails(profile),
    ],
  };
}

function baseWorkout(scheduled: ScheduledTrainingDay, phase: TrainingPhase) {
  return {
    day: scheduled.day,
    type: scheduled.type,
    kind: scheduled.kind,
    phase,
  };
}

function cardioTechniqueTitle(profile: UserProfile) {
  if (profile.cardioComponent === 'hamr') return 'HAMR Acceleration + Turns';
  if (profile.cardioComponent === 'two-mile-run') return 'Run Mechanics + Speed';
  return 'Walk Mechanics + Pace';
}

function cardioTechniqueBlock(profile: UserProfile, phase: TrainingPhase): WorkoutBlock {
  const reduced = phase === 'taper';

  if (profile.cardioComponent === 'hamr') {
    if (avoidImpact(profile)) return lowImpactIntervalBlock(profile, reduced ? 6 : 10);

    return {
      id: 'cardio-technique',
      title: 'HAMR Acceleration Intervals',
      prescription: `${reduced ? 6 : 10} × 20 sec hard / 40 sec walk. Practice clean line touches and controlled turns.`,
      coaching: 'Fast and crisp, not an all-out sprint.',
      purpose: 'Build acceleration, braking, and repeatable shuttle mechanics.',
    };
  }

  if (profile.cardioComponent === 'two-mile-run') {
    if (avoidImpact(profile)) return lowImpactIntervalBlock(profile, reduced ? 6 : 8);

    return {
      id: 'cardio-technique',
      title: 'Strides + Running Mechanics',
      prescription: `${reduced ? 4 : 6} × 20 sec relaxed-fast strides with 60–90 sec easy walking between reps.`,
      coaching: 'Stay tall, relaxed, and smooth. Do not sprint.',
      purpose: 'Improve running economy and leg turnover with very little fatigue.',
    };
  }

  return {
    id: 'cardio-technique',
    title: '2 km Walk Technique',
    prescription: `${reduced ? 4 : 6} × 2 min brisk / 1 min easy. Practice legal, efficient walking mechanics.`,
    purpose: 'Build event-specific pace and walking economy.',
  };
}

function cardioControlledBlock(profile: UserProfile, phase: TrainingPhase): WorkoutBlock {
  if (profile.cardioComponent === 'hamr') {
    if (avoidImpact(profile)) return lowImpactIntervalBlock(profile, phase === 'taper' ? 6 : 8);

    return {
      id: 'cardio-controlled',
      title: 'Controlled HAMR',
      prescription:
        phase === 'taper'
          ? 'Run a short controlled HAMR segment and stop well before strain or missed lines.'
          : 'Run the HAMR and stop 2–4 shuttles before expected failure. No missed-line grinding.',
      coaching: 'The goal is specificity, not proving fitness today.',
      purpose: 'Practice pacing and accumulating quality shuttles without full-test fatigue.',
    };
  }

  if (profile.cardioComponent === 'two-mile-run') {
    if (avoidImpact(profile)) return lowImpactIntervalBlock(profile, phase === 'taper' ? 5 : 8);

    return {
      id: 'cardio-controlled',
      title: 'Controlled Tempo Run',
      prescription:
        phase === 'taper'
          ? '12–15 min comfortably hard, then stop.'
          : '20–25 min comfortably hard, or 3 × 6 min with 2 min easy recovery.',
      coaching: 'Hard enough to focus, easy enough to finish without a kick-to-survive.',
      purpose: 'Improve sustainable pace for the 2-mile without racing in training.',
    };
  }

  return {
    id: 'cardio-controlled',
    title: 'Controlled 2 km Walk',
    prescription:
      phase === 'taper'
        ? '10–12 min at controlled test rhythm.'
        : '20 min at a brisk, sustainable pace. Finish knowing you could continue.',
    purpose: 'Build sustainable event-specific walking pace.',
  };
}

function cardioQualityBlock(profile: UserProfile, phase: TrainingPhase): WorkoutBlock {
  const intervals = phase === 'taper' ? 2 : phase === 'foundation' ? 3 : 4;

  if (profile.cardioComponent === 'two-km-walk') {
    return {
      id: 'cardio-quality',
      title: 'Brisk Walk Intervals',
      prescription: `${intervals} × 4 min hard / 3 min easy walking.`,
      coaching: 'Stay within legal walking mechanics.',
      purpose: 'Raise aerobic capacity while staying specific to the selected event.',
    };
  }

  if (avoidImpact(profile)) return lowImpactFourMinuteBlock(profile, intervals);

  return {
    id: 'cardio-quality',
    title: 'VO₂ Intervals',
    prescription: `${intervals} × 4 min hard / 3 min easy. Keep the hard work repeatable rather than sprinting the first rep.`,
    coaching: 'Use a pace you can reproduce across every interval.',
    purpose: `Raise aerobic power for ${cardioLabel(profile)}.`,
  };
}

function strengthComponentBlock(profile: UserProfile, percent: number, sets: number): WorkoutBlock {
  const baseline = Number(profile.baseline.strengthReps);
  const reps = Number.isFinite(baseline) && baseline > 0
    ? Math.max(1, Math.floor(baseline * percent))
    : null;

  return {
    id: 'pfa-strength',
    title: strengthLabel(profile),
    prescription: reps
      ? `${sets} sets × ${reps} reps (${Math.round(percent * 100)}% of current baseline). Stop with clean form.`
      : `${sets} submaximal sets at roughly ${Math.round(percent * 100)}% of your current max.`,
    coaching: 'Do not take routine work sets to failure.',
    purpose: 'Accumulate event-specific volume without burning out.',
  };
}

function coreComponentBlock(profile: UserProfile, percent: number, sets: number): WorkoutBlock {
  if (profile.coreComponent === 'plank') {
    const baselineSeconds = parseTimeToSeconds(profile.baseline.plankTime);
    const target = baselineSeconds ? Math.max(10, Math.floor(baselineSeconds * percent)) : null;

    return {
      id: 'pfa-core',
      title: 'Forearm Plank',
      prescription: target
        ? `${sets} sets × ${formatSeconds(target)} (${Math.round(percent * 100)}% of current baseline).`
        : `${sets} submaximal holds at roughly ${Math.round(percent * 100)}% of your current max.`,
      coaching: 'Brace, breathe, and end the set if position breaks down.',
      purpose: 'Build specific trunk endurance without maxing every session.',
    };
  }

  const baseline = Number(profile.baseline.coreReps);
  const reps = Number.isFinite(baseline) && baseline > 0
    ? Math.max(1, Math.floor(baseline * percent))
    : null;

  return {
    id: 'pfa-core',
    title: coreLabel(profile),
    prescription: reps
      ? `${sets} sets × ${reps} reps (${Math.round(percent * 100)}% of current baseline).`
      : `${sets} submaximal sets at roughly ${Math.round(percent * 100)}% of your current max.`,
    coaching: 'Keep every rep clean and stop before technique deteriorates.',
    purpose: 'Build event-specific core endurance with recoverable volume.',
  };
}

function coreQualityBlock(profile: UserProfile, phase: TrainingPhase): WorkoutBlock {
  if (profile.coreComponent === 'plank') {
    const base = phase === 'taper' ? 40 : 60;
    return {
      id: 'pfa-core-quality',
      title: 'Forearm Plank',
      prescription: `3 × ${base} sec. When all holds are clean, add 5 sec per set the following week.`,
      coaching: 'Steady breathing. Stop for sharp back or shoulder pain.',
      purpose: 'Simple progressive overload without a max hold.',
    };
  }

  return coreComponentBlock(profile, phase === 'taper' ? 0.4 : 0.5, phase === 'taper' ? 2 : 3);
}

function warmupBlock(profile: UserProfile): WorkoutBlock {
  const impactNote = avoidImpact(profile)
    ? 'Use easy low-impact cardio instead of jogging.'
    : 'Use easy walking or jogging as tolerated.';

  return {
    id: 'warmup',
    title: 'Warm-Up',
    prescription: `5–10 min easy movement + dynamic mobility. ${impactNote}`,
    purpose: 'Raise temperature and prepare the exact joints and movement patterns used today.',
  };
}

function recoveryWalkBlock(profile: UserProfile, minutes: number): WorkoutBlock {
  return {
    id: 'recovery',
    title: 'Easy Recovery Movement',
    prescription: avoidImpact(profile)
      ? `${minutes} min easy ${lowImpactModality(profile)} at conversational effort.`
      : `${minutes} min easy walking at conversational effort.`,
    purpose: 'Add low-cost aerobic work and support recovery.',
  };
}

function mobilityBlock(profile: UserProfile): WorkoutBlock {
  const notes = profile.movementRestrictions.length > 0
    ? 'Stay inside pain-free ranges and respect your saved movement restrictions.'
    : 'Use controlled pain-free ranges.';

  return {
    id: 'mobility',
    title: 'Mobility Reset',
    prescription: `8–10 min focused mobility. ${notes}`,
    purpose: 'Leave the session moving better than you started.',
  };
}

function trunkSupportBlock(profile: UserProfile, phase: TrainingPhase): WorkoutBlock {
  if (profile.movementRestrictions.includes('spinal-loading')) {
    return {
      id: 'trunk',
      title: 'Pallof Press / Anti-Rotation',
      prescription: `${phase === 'taper' ? 2 : 3} sets × 8–12 controlled reps per side.`,
      purpose: 'Train trunk stiffness without heavy spinal loading.',
    };
  }

  return {
    id: 'trunk',
    title: 'Pallof Press + Optional Torture Twist',
    prescription: `${phase === 'taper' ? 2 : 3} sets of Pallof press. If completely pain-free, finish with 1–2 controlled minimum-effective-dose rounds of Torture Twists.`,
    coaching: 'The optional finisher is never worth aggravating the back. Skip it if position or comfort is questionable.',
    purpose: 'Build anti-rotation control with a small dose of targeted trunk work.',
  };
}

function kneeDominantExercise(profile: UserProfile) {
  if (profile.movementRestrictions.includes('squat')) {
    if (hasGym(profile)) return 'Leg Press (pain-free range)';
    if (!profile.movementRestrictions.includes('lunge')) return 'Supported Step-Up';
    return 'Glute Bridge + Band Knee Extension';
  }

  if (hasGym(profile)) return 'Leg Press or Goblet Squat';
  if (profile.equipment.includes('dumbbells')) return 'Goblet Squat';
  return 'Controlled Bodyweight Squat';
}

function posteriorChainExercise(profile: UserProfile) {
  if (profile.movementRestrictions.includes('hip-hinge') || profile.movementRestrictions.includes('spinal-loading')) {
    if (hasGym(profile)) return 'Seated / Lying Leg Curl';
    return 'Glute Bridge / Hip Thrust';
  }

  if (hasGym(profile)) return 'Leg Curl or Romanian Deadlift';
  if (profile.equipment.includes('dumbbells')) return 'Dumbbell Romanian Deadlift';
  return 'Glute Bridge / Hip Thrust';
}

function calfExercise(profile: UserProfile) {
  if (hasGym(profile)) return 'Calf Raise';
  return 'Standing Calf Raise';
}

function pressExercise(profile: UserProfile) {
  if (profile.movementRestrictions.includes('wrist-loading')) {
    if (hasGym(profile)) return 'Machine Chest Press';
    if (profile.equipment.includes('resistance-bands')) return 'Band Chest Press';
  }

  if (hasGym(profile)) return 'Bench Press / Machine Chest Press';
  if (profile.equipment.includes('dumbbells')) return 'Dumbbell Floor Press';
  return profile.strengthComponent === 'hand-release-push-ups'
    ? 'Submax Hand-Release Push-Ups'
    : 'Submax Push-Ups';
}

function pullExercise(profile: UserProfile) {
  if (hasGym(profile)) return 'Lat Pulldown or Cable Row';
  if (profile.equipment.includes('dumbbells')) return 'One-Arm Dumbbell Row';
  if (profile.equipment.includes('resistance-bands')) return 'Band Row';
  return 'Bodyweight Scapular Pull / Towel Row Variation';
}

function secondaryLowerExercise(profile: UserProfile) {
  if (profile.movementRestrictions.includes('lunge')) return posteriorChainExercise(profile);
  if (hasGym(profile)) return 'Supported Split Squat or Step-Up';
  return 'Supported Reverse Lunge or Step-Up';
}

function lowImpactIntervalBlock(profile: UserProfile, reps: number): WorkoutBlock {
  return {
    id: 'cardio-low-impact',
    title: `Low-Impact Intervals — ${capitalize(lowImpactModality(profile))}`,
    prescription: `${reps} × 20 sec hard / 40 sec easy.`,
    coaching: 'Match the intended cardiovascular effort without forcing painful impact.',
    purpose: 'Preserve the conditioning stimulus while respecting movement restrictions.',
  };
}

function lowImpactFourMinuteBlock(profile: UserProfile, intervals: number): WorkoutBlock {
  return {
    id: 'cardio-low-impact-quality',
    title: `Low-Impact VO₂ — ${capitalize(lowImpactModality(profile))}`,
    prescription: `${intervals} × 4 min hard / 3 min easy.`,
    coaching: 'Keep every hard interval repeatable.',
    purpose: 'Build aerobic power while reducing impact stress.',
  };
}

function lowImpactModality(profile: UserProfile) {
  if (profile.equipment.includes('bike')) return 'bike';
  if (profile.equipment.includes('elliptical')) return 'elliptical';
  if (profile.equipment.includes('rower')) return 'rower';
  if (profile.equipment.includes('stair-climber')) return 'stair climber';
  return 'brisk walk';
}

function mockCardioPrescription(profile: UserProfile) {
  if (profile.cardioComponent === 'hamr') return 'Perform one official HAMR test-effort attempt.';
  if (profile.cardioComponent === 'two-mile-run') return 'Perform one timed 2-mile test-effort run.';
  return 'Perform one timed 2 km walk using required walking mechanics.';
}

function commonGuardrails(profile: UserProfile) {
  const rules = [
    'Routine work sets stay submaximal. Clean reps beat failure reps.',
    'Stop or substitute any movement that causes sharp pain or worsening symptoms.',
  ];

  if (avoidImpact(profile)) {
    rules.push('High-impact cardio is restricted in your profile; use the listed low-impact substitute.');
  }

  if (profile.mobilityNotes.trim()) {
    rules.push(`Profile note: ${profile.mobilityNotes.trim()}`);
  }

  return rules;
}

function shouldRunMock(testDate: string, now: Date, phase: TrainingPhase) {
  if (phase === 'foundation' || phase === 'taper') return false;
  const weeksRemaining = Math.floor(getDaysUntil(testDate, now) / 7);
  return weeksRemaining % 2 === 0;
}

function getDaysUntil(testDate: string, now: Date) {
  const target = new Date(`${testDate}T12:00:00`);
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / DAY_MS));
}

function parseTimeToSeconds(value: string) {
  const match = value.trim().match(/^(\d+):(\d{2})$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatSeconds(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
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

function hasGym(profile: UserProfile) {
  return profile.equipment.includes('full-gym') || profile.equipment.includes('basic-gym');
}

function avoidImpact(profile: UserProfile) {
  return (
    profile.movementRestrictions.includes('run') ||
    profile.movementRestrictions.includes('jump') ||
    profile.movementRestrictions.includes('high-impact')
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
