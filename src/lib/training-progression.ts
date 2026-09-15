import type { UserProfile } from '../types/profile';
import type { PlannedWorkout, ScheduledTrainingDay, SessionRecord, WorkoutBlock } from '../types/training';
import { progressionFor, type ProgressMetric } from './training-adaptation';
import { buildPlannedWorkout } from './training-program';

type Target = {
  metric: ProgressMetric;
  value: number;
  maximum: number;
  render: (value: number) => string;
};

// Only explicit numeric prescriptions can progress. Narrative practice and
// unresisted substitutions do not establish a measurable strength target.
function targetFor(block: WorkoutBlock, plan: PlannedWorkout, profile: UserProfile): Target | null {
  const text = block.prescription;
  if (/Unresisted|Scapular Retraction/i.test(block.title)) return null;
  const reps = text.match(/^(\d+ sets × )(\d+)(?:–(\d+))?( (?:controlled )?reps.*)$/);
  if (reps) {
    const base = Number(reps[2]);
    const width = reps[3] ? Number(reps[3]) - base : 0;
    const baseline = block.id === 'pfa-strength' && !profile.movementRestrictions.includes('wrist-loading')
      ? Number(profile.baseline.strengthReps)
      : block.id === 'pfa-core' ? Number(profile.baseline.coreReps) : 0;
    return { metric: 'reps', value: base,
      maximum: baseline > 0 ? Math.max(base, baseline - 1) : Infinity,
      render: (value) => `${reps[1]}${value}${width ? `–${value + width}` : ''}${reps[4].replace(/ \(\d+% of current baseline\)/, '')}` };
  }
  if (block.title === 'Forearm Plank') {
    const hold = text.match(/^(\d+(?: sets)? × )(\d+):(\d{2})(.*)$/);
    const seconds = text.match(/^(\d+ × )(\d+) sec\.(.*)$/);
    if (hold || seconds) {
      const value = hold ? Number(hold[2]) * 60 + Number(hold[3]) : Number(seconds![2]);
      const baselineParts = profile.baseline.plankTime.match(/^(\d+):(\d{2})$/);
      const baseline = baselineParts ? Number(baselineParts[1]) * 60 + Number(baselineParts[2]) : 0;
      return { metric: 'plank-seconds', value, maximum: baseline ? Math.max(value, baseline - 1) : value,
        render: (target) => `${hold ? hold[1] : seconds![1]}${target} sec. Keep every hold clean and submaximal.` };
    }
  }
  const intervals = text.match(/^(\d+)( × \d+ (?:sec|min).*)$/);
  if (block.id.startsWith('cardio-') && intervals) {
    const value = Number(intervals[1]);
    // The documented quality ceiling is four 4-minute intervals. Preserve the
    // existing technique volume ceiling and do not add intervals in sharpen.
    const quality = / × 4 min/.test(text);
    const maximum = quality && ['foundation', 'build'].includes(plan.phase) ? 4 : value;
    return { metric: 'intervals', value, maximum, render: (target) => `${target}${intervals[2]}` };
  }
  const walk = text.match(/^(\d+)( min easy (?:brisk walk|walking) at conversational effort\.)$/);
  if (block.id === 'recovery' && walk) {
    return { metric: 'walking-minutes', value: Number(walk[1]), maximum: Infinity,
      render: (target) => `${target}${walk[2]}` };
  }
  return null;
}

function isSession(value: unknown): value is SessionRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<SessionRecord>;
  return typeof record.id === 'number' && typeof record.date === 'string' &&
    Number.isFinite(Date.parse(record.date)) && !!record.plannedWorkout &&
    !!record.performedWorkout && Array.isArray(record.outcomes) &&
    Array.isArray(record.performedWorkout.blocks);
}

export function buildAdaptiveWorkout(profile: UserProfile, scheduled: ScheduledTrainingDay,
  history: unknown[], now = new Date()): PlannedWorkout {
  const plan = buildPlannedWorkout(profile, scheduled, now);
  const context = JSON.stringify([profile.testDate, profile.cardioComponent, profile.strengthComponent,
    profile.coreComponent, profile.baseline, [...profile.equipment].sort(),
    [...profile.movementRestrictions].sort(), profile.mobilityNotes]);
  plan.progressionContext = context;
  if (plan.isMock || plan.phase === 'taper') return plan;
  const records = history.filter(isSession).filter((record) => Date.parse(record.date) <= now.getTime())
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  return { ...plan, blocks: plan.blocks.map((block) => {
    const target = targetFor(block, plan, profile);
    if (!target) return block;
    const signature = JSON.stringify([context, plan.phase, plan.kind, block.id, block.title, block.prescription]);
    let value = target.value;
    let successes = 0;
    let misses = 0;
    let reason = 'Hold this target until two sessions are completed cleanly.';
    const seen = new Set<number>();
    for (const record of records) {
      if (seen.has(record.id)) continue;
      seen.add(record.id);
      if (record.plannedWorkout.kind !== plan.kind) continue;
      const performed = record.performedWorkout.blocks.find((b) => b.id === block.id);
      if (record.plannedWorkout.progressionContext !== context || record.plannedWorkout.phase !== plan.phase ||
          record.plannedWorkout.isMock || record.readinessAction !== 'normal' ||
          performed?.progression?.signature !== signature || performed.progression.value !== value) {
        successes = 0; misses = 0;
        reason = 'Hold this target until two comparable sessions are completed cleanly.';
        continue;
      }
      const outcomes = record.outcomes.filter((o) => o.blockId === block.id);
      const outcome = outcomes.length === 1 ? outcomes[0] : undefined;
      if (outcome?.status === 'completed' && outcome.clean === true) { successes++; misses = 0; }
      else if (outcome?.status === 'missed') { misses++; successes = 0; }
      else { successes = 0; misses = 0; reason = 'Hold this target until two sessions are completed cleanly.'; }
      const decision = progressionFor(target.metric, successes, misses);
      if (decision.change !== 0) {
        const next = Math.min(target.maximum, Math.max(1, value + decision.change));
        reason = next === value ? 'Hold this target at the current training limit.' : decision.reason;
        value = next;
        successes = 0; misses = 0;
      } else if (successes === 1) {
        reason = 'One clean session at this target. Complete it cleanly once more before increasing.';
      } else if (misses === 1) {
        reason = 'One missed target. Hold for now; a second miss will reduce the target.';
      }
    }
    return { ...block, prescription: value === target.value ? block.prescription : target.render(value),
      progression: { signature, value, canIncrease: value < target.maximum, reason } };
  }) };
}
