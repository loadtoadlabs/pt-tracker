import type { TrainingDay } from '@/types/profile';
import type { ScheduledTrainingDay, TrainingSessionKind } from '@/types/training';

const DAY_ORDER: TrainingDay[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const FIVE_DAY_PATTERN: TrainingSessionKind[] = [
  'pfa-technique',
  'strength-a',
  'pfa-controlled',
  'strength-b',
  'pfa-quality',
];

export function buildWeeklySchedule(trainingDays: TrainingDay[]): ScheduledTrainingDay[] {
  const ordered = [...trainingDays].sort(
    (a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)
  );

  return ordered.slice(0, 5).map((day, index) => {
    const kind = FIVE_DAY_PATTERN[index];

    return {
      day,
      kind,
      type: kind.startsWith('pfa-') ? 'pfa' : 'strength',
    };
  });
}

export function getTodayTrainingDay(
  trainingDays: TrainingDay[],
  now = new Date()
): ScheduledTrainingDay | null {
  const lookup: Record<number, TrainingDay> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  };

  const today = lookup[now.getDay()];
  return buildWeeklySchedule(trainingDays).find((entry) => entry.day === today) ?? null;
}

export function formatTrainingDay(day: TrainingDay) {
  return day.charAt(0).toUpperCase() + day.slice(1);
}
