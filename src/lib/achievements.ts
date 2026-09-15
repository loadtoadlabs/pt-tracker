import type { SessionRecord } from '../types/training';
import type { BodyCheckIn } from './body-check-in';

export type Achievement = {
  id: string;
  title: string;
  description: string;
  category: 'Training' | 'LoadToad';
  current: number;
  target: number;
  earnedOn?: string;
};

function isSession(value: unknown): value is SessionRecord {
  if (!value || typeof value !== 'object') return false;
  const s = value as SessionRecord;
  return Number.isFinite(s.id) && typeof s.date === 'string' && Number.isFinite(Date.parse(s.date)) &&
    !!s.plannedWorkout && !!s.performedWorkout && Array.isArray(s.performedWorkout.blocks) &&
    s.performedWorkout.blocks.length > 0 && s.performedWorkout.blocks.every((b) => b && typeof b.id === 'string') &&
    Array.isArray(s.outcomes) && s.outcomes.every((o) => o && typeof o.blockId === 'string');
}

function complete(s: SessionRecord, clean = false): boolean {
  const blocks = s.performedWorkout.blocks;
  return new Set(blocks.map((b) => b.id)).size === blocks.length && s.outcomes.length === blocks.length &&
    blocks.every((b) => {
      const outcomes = s.outcomes.filter((o) => o.blockId === b.id);
      return outcomes.length === 1 && outcomes[0].status === 'completed' && (!clean || outcomes[0].clean === true);
    });
}

function firstIncrease(sessions: SessionRecord[]): string | undefined {
  const streaks = new Map<string, { signature: string; value: number; count: number }>();
  for (const s of sessions) {
    const prefix = `${s.plannedWorkout.kind}:`;
    if (s.readinessAction !== 'normal' || s.plannedWorkout.isMock || s.plannedWorkout.phase === 'taper') {
      for (const key of streaks.keys()) if (key.startsWith(prefix)) streaks.delete(key);
      continue;
    }
    const present = new Set(s.performedWorkout.blocks.map((b) => `${prefix}${b.id}`));
    for (const key of streaks.keys()) if (key.startsWith(prefix) && !present.has(key)) streaks.delete(key);
    for (const b of s.performedWorkout.blocks) {
      const key = `${prefix}${b.id}`;
      const p = b.progression;
      const outcomes = s.outcomes.filter((o) => o.blockId === b.id);
      if (!p?.canIncrease || !Number.isFinite(p.value) || typeof p.signature !== 'string' ||
          outcomes.length !== 1 || outcomes[0].status !== 'completed' || outcomes[0].clean !== true) {
        streaks.delete(key); continue;
      }
      const previous = streaks.get(key);
      const count = previous?.signature === p.signature && previous.value === p.value ? previous.count + 1 : 1;
      if (count >= 2) return s.date;
      streaks.set(key, { signature: p.signature, value: p.value, count });
    }
  }
  return undefined;
}

export function getAchievements(history: unknown[], checkIns: BodyCheckIn[], now = new Date()): Achievement[] {
  const seen = new Set<number>();
  const sessions = history.filter(isSession).filter((s) => Date.parse(s.date) <= now.getTime())
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date)).filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id); return true;
    });
  const finished = sessions.filter((s) => s.readinessAction !== 'recovery' && complete(s));
  const clean = finished.find((s) => complete(s, true));
  const mock = finished.find((s) => s.readinessAction === 'normal' && s.performedWorkout.isMock &&
    s.performedWorkout.intensity === 'test' && ['mock-strength', 'mock-core', 'mock-cardio'].every((id) =>
      s.performedWorkout.blocks.some((b) => b.id === id)));
  const recovery = sessions.find((s) => s.readinessAction === 'recovery' && complete(s));
  const increase = firstIncrease(sessions);
  const weeks = new Set<string>();
  const weekly = [...checkIns].filter((c) => Number.isFinite(Date.parse(c.date)) && Date.parse(c.date) <= now.getTime())
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date)).filter((c) => {
      if (weeks.has(c.weekStart)) return false;
      weeks.add(c.weekStart); return true;
    });
  const milestone = (id: string, title: string, target: number): Achievement => ({
    id, title, category: 'Training', target, current: Math.min(finished.length, target),
    description: `Complete every block of ${target} planned training session${target === 1 ? '' : 's'}.`,
    earnedOn: finished[target - 1]?.date,
  });
  const single = (id: string, title: string, description: string, category: Achievement['category'], earnedOn?: string): Achievement =>
    ({ id, title, description, category, current: earnedOn ? 1 : 0, target: 1, earnedOn });
  return [
    milestone('first-session', 'First Session', 1),
    milestone('five-sessions', 'Five Sessions Strong', 5),
    milestone('ten-sessions', 'Ten Sessions Strong', 10),
    single('clean-session', 'Clean Finish', 'Complete every block of a training session cleanly.', 'Training', clean?.date),
    single('earned-increase', 'Progress Earned', 'Earn a target increase through two comparable clean completions.', 'Training', increase),
    single('mock-pfa', 'Mock PFA Complete', 'Complete a full mock PFA session. This badge does not certify an official score.', 'Training', mock?.date),
    single('recovery', 'Toad Takes a Breather', 'Complete a recovery session when it is part of your plan. Rest when movement hurts.', 'LoadToad', recovery?.date),
    { id: 'weekly-regular', title: 'Pond Regular', description: 'Save a weekly check-in in four different weeks.',
      category: 'LoadToad', current: Math.min(weekly.length, 4), target: 4, earnedOn: weekly[3]?.date },
  ];
}
