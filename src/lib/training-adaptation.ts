import type { DailyReadiness, TrainingSessionKind } from '@/types/training';

export type ReadinessAction = 'normal' | 'reduce' | 'recovery';

export type ReadinessDecision = {
  action: ReadinessAction;
  volumeMultiplier: number;
  message: string;
};

export type ProgressMetric = 'reps' | 'plank-seconds' | 'hamr-shuttles' | 'intervals' | 'walking-minutes';

export type ProgressDecision = {
  change: number;
  reason: string;
};

export function evaluateReadiness(readiness: DailyReadiness): ReadinessDecision {
  if (readiness.pain >= 4) {
    return {
      action: 'recovery',
      volumeMultiplier: 0,
      message: 'High pain reported. Replace hard training with recovery movement and mobility, and avoid painful movements.',
    };
  }

  if (readiness.energy <= 2 && readiness.soreness >= 4) {
    return {
      action: 'reduce',
      volumeMultiplier: 0.6,
      message: 'Low energy plus high soreness: cut planned volume by about 40% and keep all work submaximal.',
    };
  }

  if (readiness.energy <= 2 || readiness.soreness >= 4 || readiness.pain === 3) {
    return {
      action: 'reduce',
      volumeMultiplier: 0.75,
      message: 'Readiness is below normal. Reduce volume by about 25% and avoid extra hard work.',
    };
  }

  return {
    action: 'normal',
    volumeMultiplier: 1,
    message: 'Readiness looks normal. Follow the planned session.',
  };
}

export function progressionFor(
  metric: ProgressMetric,
  successfulSessionsInRow: number,
  missedTargetsInRow: number
): ProgressDecision {
  if (missedTargetsInRow >= 2) {
    if (metric === 'plank-seconds') {
      return { change: -5, reason: 'Two missed targets: reduce the next hold slightly and rebuild cleanly.' };
    }

    if (metric === 'hamr-shuttles') {
      return { change: -2, reason: 'Two missed targets: reduce the next shuttle target and rebuild quality.' };
    }

    if (metric === 'walking-minutes') {
      return { change: -5, reason: 'Recovery is slipping: shorten the next walk.' };
    }

    return { change: -1, reason: 'Two missed targets: step back slightly instead of forcing progression.' };
  }

  if (successfulSessionsInRow < 2) {
    return { change: 0, reason: 'Hold the current target until it is completed cleanly twice.' };
  }

  if (metric === 'reps') {
    return { change: 1, reason: 'Two clean sessions: add one rep to each work set.' };
  }

  if (metric === 'plank-seconds') {
    return { change: 5, reason: 'Two clean sessions: add five seconds to each work set.' };
  }

  if (metric === 'hamr-shuttles') {
    return { change: 2, reason: 'Successful specific work: add about two shuttles next time.' };
  }

  if (metric === 'intervals') {
    return { change: 1, reason: 'Quality intervals were completed cleanly: add one interval when the phase allows it.' };
  }

  return { change: 5, reason: 'Recovery remains good: add five minutes of easy walking.' };
}

export function shouldAllowTrueMax(kind: TrainingSessionKind, isMock: boolean) {
  return kind === 'pfa-quality' && isMock;
}
