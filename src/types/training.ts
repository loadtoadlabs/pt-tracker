import type { TrainingDay } from '@/types/profile';

export type TrainingDayType = 'pfa' | 'strength';

export type TrainingSessionKind =
  | 'pfa-technique'
  | 'strength-a'
  | 'pfa-controlled'
  | 'strength-b'
  | 'pfa-quality';

export type TrainingPhase = 'foundation' | 'build' | 'sharpen' | 'taper';

export type SessionIntensity =
  | 'easy'
  | 'moderate'
  | 'moderate-hard'
  | 'hard-controlled'
  | 'test';

export type ScheduledTrainingDay = {
  day: TrainingDay;
  type: TrainingDayType;
  kind: TrainingSessionKind;
};

export type WorkoutBlock = {
  id: string;
  title: string;
  prescription: string;
  coaching?: string;
  purpose?: string;
  progression?: {
    signature: string;
    value: number;
    canIncrease?: boolean;
    reason: string;
  };
};

export type PlannedWorkout = {
  progressionContext?: string;
  day: TrainingDay;
  type: TrainingDayType;
  kind: TrainingSessionKind;
  phase: TrainingPhase;
  title: string;
  subtitle: string;
  intensity: SessionIntensity;
  estimatedMinutes: number;
  isMock: boolean;
  blocks: WorkoutBlock[];
  guardrails: string[];
};

export type DailyReadiness = {
  energy: 1 | 2 | 3 | 4 | 5;
  soreness: 1 | 2 | 3 | 4 | 5;
  pain: 1 | 2 | 3 | 4 | 5;
};

export type BlockOutcome = {
  blockId: string;
  status: 'completed' | 'missed' | 'skipped';
  actual: string;
  clean?: boolean;
};

export type SessionRecord = {
  id: number;
  date: string;
  sessionTitle: string;
  sessionKind: TrainingSessionKind;
  readiness: DailyReadiness;
  readinessAction: 'normal' | 'reduce' | 'recovery';
  plannedWorkout: PlannedWorkout;
  performedWorkout: PlannedWorkout;
  outcomes: BlockOutcome[];
  notes: string;
};
