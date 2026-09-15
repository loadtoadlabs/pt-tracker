import { evaluateReadiness } from './training-adaptation';
import type { BlockOutcome, DailyReadiness, PlannedWorkout, SessionRecord } from '../types/training';

export function prepareSession(plan: PlannedWorkout, readiness: DailyReadiness): PlannedWorkout {
  const decision = evaluateReadiness(readiness);
  if (decision.action === 'normal') return plan;
  if (decision.action === 'recovery') {
    return {
      ...plan, title: 'Recovery Movement', subtitle: decision.message,
      intensity: 'easy', isMock: false, estimatedMinutes: 10,
      blocks: [{ id: 'recovery-mobility', title: 'Gentle Recovery Movement',
        prescription: 'Up to 10 minutes of comfortable, pain-free movement or gentle mobility. Skip any movement that hurts; stop if symptoms worsen.',
        purpose: 'Recover without hard training or painful patterns.' }],
      guardrails: [decision.message, 'Rest if comfortable movement is not possible.'],
    };
  }
  return {
    ...plan, title: `Reduced Session — ${plan.title}`, subtitle: decision.message,
    intensity: 'easy', isMock: false,
    estimatedMinutes: Math.ceil(plan.estimatedMinutes * decision.volumeMultiplier),
    blocks: plan.blocks.map((block) => {
      if (block.id === 'warmup' || block.id === 'mobility') return block;
      if (plan.isMock && block.id.startsWith('mock-')) {
        return { ...block, progression: undefined, prescription: 'Brief, easy technique practice only. Stop well before strain; do not perform a test-effort attempt.',
          purpose: 'Maintain comfortable event practice without testing.', coaching: 'No max-effort result today.' };
      }
      // Reduce the first volume quantity (sets, intervals, minutes, or holds),
      // leaving rep targets and interval recovery periods intact.
      const prescription = block.prescription.replace(/^(\d+)(?:[–-](\d+))?(?=\s*(?:sets|submaximal|×|min))/, (_, low, high) => {
        const scale = (value: string) => Math.max(1, Math.floor(Number(value) * decision.volumeMultiplier));
        return high ? `${scale(low)}–${scale(high)}` : String(scale(low));
      });
      return { ...block,
        progression: undefined,
        prescription: prescription === block.prescription
          ? 'Short, easy technique practice only. Stop well before fatigue or strain.'
          : prescription.replace(/^1 sets\b/, '1 set').replace(/hard/g, 'comfortable').replace(/When all holds.*$/, ''),
        coaching: 'Keep effort easy and stop before strain. No extra work or progression today.',
      };
    }),
    guardrails: [decision.message, 'Keep all work easy. No max-effort testing or added volume today.'],
  };
}

export function createSessionRecord(id: number, date: string, plan: PlannedWorkout,
  readiness: DailyReadiness, outcomes: BlockOutcome[], notes: string): SessionRecord {
  const performedWorkout = prepareSession(plan, readiness);
  if (outcomes.length !== performedWorkout.blocks.length ||
      performedWorkout.blocks.some((block) => outcomes.filter((outcome) => outcome.blockId === block.id).length !== 1) ||
      outcomes.some((outcome) => !['completed', 'missed', 'skipped'].includes(outcome.status))) {
    throw new Error('Choose an outcome for every workout block.');
  }
  return { id, date, sessionTitle: performedWorkout.title, sessionKind: plan.kind,
    readiness, readinessAction: evaluateReadiness(readiness).action,
    plannedWorkout: plan, performedWorkout, outcomes, notes: notes.trim() };
}
