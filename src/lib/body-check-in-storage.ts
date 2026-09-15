import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TrainingDay } from '../types/profile';
import { createBodyCheckIn, isCheckInDue, type BodyCheckIn } from './body-check-in';

const KEY = 'loadtoad.body-check-ins.v1';

export async function loadBodyCheckIns(): Promise<BodyCheckIn[]> {
  const saved = await AsyncStorage.getItem(KEY);
  const records: unknown = saved ? JSON.parse(saved) : [];
  if (!Array.isArray(records) || records.some((record) => !record ||
      typeof record.weekStart !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.weekStart) ||
      typeof record.date !== 'string' || !Number.isFinite(Date.parse(record.date)) ||
      typeof record.weightLb !== 'number' || !Number.isFinite(record.weightLb) || record.weightLb <= 0 ||
      (record.waistInches !== undefined && (typeof record.waistInches !== 'number' ||
        !Number.isFinite(record.waistInches) || record.waistInches <= 0)))) {
    throw new Error('Could not read weekly check-in history.');
  }
  return records;
}

// Serialize saves so repeated taps or mounted screens cannot create two entries
// for the same week. A failed write leaves the stored history unchanged.
let pending: Promise<unknown> = Promise.resolve();
export function saveBodyCheckIn(days: TrainingDay[], weight: string, waist: string, now = new Date()): Promise<void> {
  const operation = pending.then(async () => {
    const records = await loadBodyCheckIns();
    if (!isCheckInDue(days, records, now)) {
      throw new Error('Check-ins are available once per week, on your final training day.');
    }
    const record = createBodyCheckIn(weight, waist, now);
    await AsyncStorage.setItem(KEY, JSON.stringify([...records, record]));
  });
  pending = operation.catch(() => undefined);
  return operation;
}
