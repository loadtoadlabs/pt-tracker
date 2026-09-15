const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
function load(relativePath) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: (name) => {
    if (name === './training-adaptation') return load('src/lib/training-adaptation.ts');
    throw new Error(`Unexpected runtime dependency: ${name}`);
  } }, { filename });
  return exports;
}
const { prepareSession, createSessionRecord } = load('src/lib/workout-session.ts');
const { buildPlannedWorkout } = load('src/lib/training-program.ts');
const { emptyUserProfile } = load('src/types/profile.ts');
const normal = { energy: 4, soreness: 1, pain: 1 };
const reduced = { energy: 2, soreness: 2, pain: 1 };
const recovery = { energy: 4, soreness: 1, pain: 4 };
const now = new Date('2026-09-15T12:00:00');
function plan(kind = 'pfa-technique', testDate = '2026-12-15') {
  return buildPlannedWorkout({ ...emptyUserProfile, testDate,
    equipment: ['bodyweight'], movementRestrictions: ['wrist-loading'],
    cardioComponent: 'hamr', strengthComponent: 'push-ups', coreComponent: 'plank',
  }, { kind, day: 'monday', type: kind.startsWith('pfa') ? 'pfa' : 'strength' }, now);
}

test('normal readiness preserves the complete plan and substitutions', () => {
  const original = plan();
  assert.equal(prepareSession(original, normal), original);
  assert.equal(original.blocks.find((b) => b.id === 'pfa-strength').title, 'Unresisted Standing Chest Press');
});
test('reduced readiness lowers work count without shortening interval rest or changing original plan', () => {
  const original = plan();
  const before = JSON.stringify(original);
  const adjusted = prepareSession(original, reduced);
  assert.match(adjusted.blocks.find((b) => b.id === 'cardio-technique').prescription, /^7 × 20 sec comfortable \/ 40 sec walk/);
  assert.match(adjusted.blocks.find((b) => b.id === 'pfa-strength').prescription, /^2 sets/);
  assert.equal(JSON.stringify(original), before);
  assert.equal(adjusted.intensity, 'easy');
  const moreReduced = prepareSession(original, { energy: 1, soreness: 5, pain: 1 });
  assert.match(moreReduced.blocks.find((b) => b.id === 'cardio-technique').prescription, /^6 ×/);
});
test('high pain replaces every training kind with optional recovery movement', () => {
  for (const kind of ['pfa-technique', 'pfa-controlled', 'pfa-quality', 'strength-a', 'strength-b']) {
    const adjusted = prepareSession(plan(kind), recovery);
    assert.equal(adjusted.blocks.length, 1);
    assert.equal(adjusted.blocks[0].id, 'recovery-mobility');
    assert.equal(adjusted.intensity, 'easy');
    assert.equal(adjusted.isMock, false);
    assert.match(adjusted.blocks[0].prescription, /Skip any movement that hurts/);
  }
});
test('reduced mock sessions do not retain test-effort prescriptions', () => {
  const original = { ...plan(), isMock: true, intensity: 'test', blocks: [
    { id: 'mock-cardio', title: '20m HAMR', prescription: 'Perform one official test-effort attempt.' },
  ] };
  const adjusted = prepareSession(original, reduced);
  assert.equal(adjusted.isMock, false);
  assert.equal(adjusted.intensity, 'easy');
  assert.match(adjusted.blocks[0].prescription, /do not perform a test-effort attempt/);
  assert.doesNotMatch(adjusted.blocks[0].prescription, /^Perform/);
});
test('saving requires exactly one explicit outcome for each performed block', () => {
  const original = plan();
  const outcomes = original.blocks.map((b, i) => ({ blockId: b.id,
    status: ['completed', 'missed', 'skipped'][i % 3], actual: '2 sets of 8' }));
  const record = createSessionRecord(123, now.toISOString(), original, normal, outcomes, ' notes ');
  assert.equal(record.notes, 'notes');
  assert.equal(record.outcomes[1].status, 'missed');
  assert.equal(record.outcomes[2].status, 'skipped');
  assert.equal(record.outcomes[0].actual, '2 sets of 8');
  assert.equal(record.plannedWorkout, original);
  assert.equal(record.performedWorkout, original);
  assert.equal(record.readinessAction, 'normal');
  for (const invalid of [[], outcomes.slice(1), [...outcomes, outcomes[0]],
    outcomes.map((o) => ({ ...o, status: undefined }))]) {
    assert.throws(() => createSessionRecord(123, now.toISOString(), original, normal, invalid, ''), /every workout block/);
  }
});
test('recovery records store adjusted blocks and never claim PFA results', () => {
  const original = plan();
  const record = createSessionRecord(123, now.toISOString(), original, recovery,
    [{ blockId: 'recovery-mobility', status: 'skipped', actual: 'Rested' }], '');
  assert.equal(record.readinessAction, 'recovery');
  assert.equal(record.sessionTitle, 'Recovery Movement');
  assert.equal(record.plannedWorkout.blocks.length, original.blocks.length);
  assert.equal(record.performedWorkout.blocks.length, 1);
  assert.equal(record.strengthResult, undefined);
  assert.equal(record.cardioResult, undefined);
});
