import type { TrainingDay } from '../types/profile';
import { buildWeeklySchedule, getTodayTrainingDay } from './training-schedule';

export type BodyCheckIn = {
  weekStart: string;
  date: string;
  weightLb: number;
  waistInches?: number;
};

export function getWeekStart(now = new Date()): string {
  const monday = new Date(now);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

export function isCheckInDay(days: TrainingDay[], now = new Date()): boolean {
  const schedule = buildWeeklySchedule(days);
  const last = schedule[schedule.length - 1];
  return !!last && getTodayTrainingDay(days, now)?.day === last.day;
}

export function isCheckInDue(days: TrainingDay[], records: BodyCheckIn[], now = new Date()): boolean {
  return isCheckInDay(days, now) && !records.some((record) => record.weekStart === getWeekStart(now));
}

export function createBodyCheckIn(weight: string, waist: string, now = new Date()): BodyCheckIn {
  const parse = (value: string, label: string) => {
    const text = value.trim();
    if (!/^\d+(?:\.\d+)?$/.test(text) || !Number.isFinite(Number(text)) || Number(text) <= 0) {
      throw new Error(`Enter a positive number for ${label}.`);
    }
    return Number(text);
  };
  return { weekStart: getWeekStart(now), date: now.toISOString(),
    weightLb: parse(weight, 'weight'),
    ...(waist.trim() ? { waistInches: parse(waist, 'waist') } : {}) };
}
