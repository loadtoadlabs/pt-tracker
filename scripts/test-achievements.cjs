const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../src/lib/achievements.ts');
const exported = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: exported }, { filename });
const { getAchievements } = exported;
const now = new Date('2026-12-01T12:00:00Z');
function session(id, options = {}) {
  const blocks = options.blocks || [{ id: 'press', title: 'Push-Ups', prescription: '3 sets × 10 reps',
    progression: { signature: 'same-target', value: 10, canIncrease: true } }];
  const plan = { kind: 'strength-b', phase: 'foundation', isMock: false, intensity: 'moderate', blocks, ...options.plan };
  return { id, date: `2026-09-${String(id).padStart(2, '0')}T12:00:00Z`,
    plannedWorkout: plan, performedWorkout: plan, readinessAction: 'normal',
    outcomes: blocks.map((b) => ({ blockId: b.id, status: 'completed', clean: true, actual: '' })),
    ...options.record };
}
const badges = (history = [], checkIns = []) => getAchievements(history, checkIns, now);
const badge = (history, id) => badges(history).find((b) => b.id === id);
test('eight badges maintain six training and two personality milestones', () => {
  const result = badges();
  assert.equal(result.length, 8);
  assert.equal(result.filter((b) => b.category === 'Training').length, 6);
  assert.equal(result.filter((b) => b.category === 'LoadToad').length, 2);
  assert.ok(result.every((b) => !b.earnedOn && b.current === 0));
});
test('session thresholds and earning dates are derived from unique complete sessions', () => {
  const history = Array.from({ length: 10 }, (_, i) => session(i + 1));
  assert.equal(badge(history.slice(0, 4), 'five-sessions').current, 4);
  assert.equal(badge(history, 'first-session').earnedOn, history[0].date);
  assert.equal(badge(history, 'five-sessions').earnedOn, history[4].date);
  assert.equal(badge([...history].reverse(), 'ten-sessions').earnedOn, history[9].date);
  assert.equal(badge([history[0], history[0]], 'five-sessions').current, 1);
});
test('manual, malformed, future, missed, and skipped records cannot earn session badges', () => {
  const skipped = session(1); skipped.outcomes[0].status = 'skipped';
  const missed = session(2); missed.outcomes[0].status = 'missed';
  const future = session(3, { record: { date: '2030-01-01' } });
  assert.equal(badge([null, {}, { id: 4, pushUps: '30' }, skipped, missed, future], 'first-session').earnedOn, undefined);
  const missing = session(5, { record: { outcomes: [] } });
  assert.equal(badge([missing], 'first-session').earnedOn, undefined);
});
test('clean finish requires explicit clean confirmation on all blocks', () => {
  const old = session(1); delete old.outcomes[0].clean;
  assert.equal(badge([old], 'clean-session').earnedOn, undefined);
  assert.equal(badge([session(1)], 'clean-session').earnedOn, session(1).date);
});
test('recovery earns its own badge without counting as a planned training session', () => {
  const recovery = session(1, { record: { readinessAction: 'recovery' } });
  assert.equal(badge([recovery], 'recovery').earnedOn, recovery.date);
  assert.equal(badge([recovery], 'first-session').earnedOn, undefined);
  assert.equal(badge([recovery], 'clean-session').earnedOn, undefined);
  recovery.outcomes[0].status = 'skipped';
  assert.equal(badge([recovery], 'recovery').earnedOn, undefined);
});
test('mock badge requires all three real mock components and normal readiness', () => {
  const blocks = ['mock-strength', 'mock-core', 'mock-cardio'].map((id) => ({ id }));
  const mock = session(1, { blocks, plan: { isMock: true, intensity: 'test' } });
  assert.equal(badge([mock], 'mock-pfa').earnedOn, mock.date);
  assert.equal(badge([session(1)], 'mock-pfa').earnedOn, undefined);
  assert.equal(badge([{ ...mock, readinessAction: 'reduce' }], 'mock-pfa').earnedOn, undefined);
  mock.outcomes[1].status = 'missed';
  assert.equal(badge([mock], 'mock-pfa').earnedOn, undefined);
});
test('earned increase triggers on the second qualifying completion, excluding capped or interrupted streaks', () => {
  assert.equal(badge([session(1)], 'earned-increase').earnedOn, undefined);
  assert.equal(badge([session(1), session(2)], 'earned-increase').earnedOn, session(2).date);
  for (const readinessAction of ['reduce', 'recovery']) {
    assert.equal(badge([session(1), session(2, { record: { readinessAction } }), session(3)], 'earned-increase').earnedOn, undefined);
  }
  const capped = session(2); capped.performedWorkout.blocks[0].progression.canIncrease = false;
  assert.equal(badge([session(1), capped], 'earned-increase').earnedOn, undefined);
  const changed = session(2); changed.performedWorkout.blocks[0].progression.signature = 'new-equipment';
  assert.equal(badge([session(1), changed], 'earned-increase').earnedOn, undefined);
});
test('Pond Regular counts four distinct weeks and ignores future entries', () => {
  const entries = [1, 8, 15, 22].map((day) => ({ weekStart: `2026-09-${day}`, date: `2026-09-${String(day).padStart(2, '0')}T12:00:00Z`, weightLb: 180 }));
  assert.equal(badges([], entries).find((b) => b.id === 'weekly-regular').earnedOn, entries[3].date);
  assert.equal(badges([], [entries[0], entries[0], { ...entries[1], date: '2030-01-01' }]).find((b) => b.id === 'weekly-regular').current, 1);
});
test('deleting evidence recomputes badges without stale awards', () => {
  assert.ok(badge([session(1)], 'first-session').earnedOn);
  assert.equal(badge([], 'first-session').earnedOn, undefined);
});
