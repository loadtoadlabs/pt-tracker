import type { TrainingDay } from '@/types/profile';

export type TrainingDayType = 'pfa' | 'strength';

export type ScheduledTrainingDay = {
  day: TrainingDay;
  type: TrainingDayType;
};
