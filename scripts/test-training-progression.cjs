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
    if (!name.startsWith('./')) throw new Error(`Unexpected import: ${name}`);
    return load(`src/lib/${name.slice(2)}.ts`);
  } }, { filename });
  return exports;
}
const { buildAdaptiveWorkout } = load('src/lib/training-progression.ts');
const { createSessionRecord } = load('src/lib/workout-session.ts');
const { emptyUserProfile } = load('src/types/profile.ts');
const profile = { ...emptyUserProfile, testDate: '2027-06-15',
  equipment: ['bodyweight'], movementRestrictions: [],
  cardioComponent: 'hamr', strengthComponent: 'push-ups', coreComponent: 'plank',
  baseline: { ...emptyUserProfile.baseline, strengthReps: '40', plankTime: '2:00' } };
const normal = { energy: 4, soreness: 1, pain: 1 };
const schedule = { kind: 'pfa-technique', type: 'pfa', day: 'monday' };
const date = (n) => new Date(Date.UTC(2026, 8, 15 + n, 12));
const get = (history, p = profile, s = schedule, now = date(history.length + 1)) => buildAdaptiveWorkout(p, s, history, now);
const block = (plan, id = 'pfa-strength') => plan.blocks.find((b) => b.id === id);
function add(history, status = 'completed', options = {}) {
  const p = options.profile || profile;
  const s = options.schedule || schedule;
  const plan = get(history, p, s);
  const readiness = options.readiness || normal;
  const { prepareSession } = load('src/lib/workout-session.ts');
  const performed = prepareSession(plan, readiness);
  const outcomes = performed.blocks.map((b) => ({ blockId: b.id, status,
    clean: options.clean === undefined ? status === 'completed' : options.clean, actual: '' }));
  history.push(createSessionRecord(history.length + 1, date(history.length + 1).toISOString(), plan, readiness, outcomes, ''));
}

test('two clean sessions increase once, then require two at the new target', () => {
  const history = [];
  assert.equal(block(get(history)).progression.value, 22);
  add(history);
  assert.equal(block(get(history)).progression.value, 22);
  add(history);
  assert.equal(block(get(history)).progression.value, 23);
  assert.match(block(get(history)).prescription, /23 reps/);
  assert.doesNotMatch(block(get(history)).prescription, /55%/);
  assert.equal(block(get(history)).progression.value, 23, 'rendering again must not increase again');
  add(history);
  assert.equal(block(get(history)).progression.value, 23);
  add(history);
  assert.equal(block(get(history)).progression.value, 24);
});
test('two misses reduce the current target and successes recover from the reduced target', () => {
  const history = [];
  add(history, 'missed'); add(history, 'missed');
  assert.equal(block(get(history)).progression.value, 21);
  add(history); add(history);
  assert.equal(block(get(history)).progression.value, 22);
});
test('skips, unconfirmed completions, and low readiness break success streaks', () => {
  for (const options of [{ status: 'skipped' }, { clean: false },
    { readiness: { energy: 1, soreness: 1, pain: 1 } },
    { readiness: { energy: 4, soreness: 1, pain: 4 } }]) {
    const history = [];
    add(history); add(history, options.status || 'completed', options); add(history);
    assert.equal(block(get(history)).progression.value, 22);
    add(history);
    assert.equal(block(get(history)).progression.value, 23);
  }
});
test('duplicate IDs, future records, and legacy logs cannot earn increases', () => {
  const history = [];
  add(history);
  assert.equal(block(get([history[0], history[0]])).progression.value, 22);
  assert.equal(block(get([history[0], { ...history[0], id: 2, date: '2030-01-01' }])).progression.value, 22);
  const legacy = { id: 88, date: date(1).toISOString(), pushUps: '40' };
  assert.equal(block(get([legacy, { ...legacy, id: 89 }, null])).progression.value, 22);
});
test('changed profile, phase, exercise, and session kind do not inherit a streak', () => {
  const history = []; add(history); add(history);
  for (const updated of [{ ...profile, equipment: ['dumbbells'] },
    { ...profile, strengthComponent: 'hand-release-push-ups' },
    { ...profile, movementRestrictions: ['wrist-loading'], equipment: ['dumbbells'] }]) {
    const adjusted = get(history, updated);
    const fresh = get([], updated);
    assert.equal(block(adjusted).progression.value, block(fresh).progression.value);
  }
  const controlled = { ...schedule, kind: 'pfa-controlled' };
  assert.equal(block(get(history, profile, controlled)).progression.value, 24);
  const buildPhase = get(history, profile, schedule, new Date('2027-05-01T12:00:00'));
  assert.equal(block(buildPhase).progression.value, 22);
});
test('taper and true mocks do not apply earned progression', () => {
  const history = []; add(history); add(history);
  const taper = get(history, profile, schedule, new Date('2027-06-12T12:00:00'));
  assert.ok(taper.blocks.every((b) => !b.progression));
  const mock = get(history, profile, { ...schedule, kind: 'pfa-quality' }, new Date('2027-05-18T12:00:00'));
  assert.equal(mock.isMock, true);
  assert.ok(mock.blocks.every((b) => !b.progression));
});
test('planks and easy walks use existing five-unit steps', () => {
  const history = []; add(history); add(history);
  assert.equal(block(get(history), 'pfa-core').progression.value, 71);
  assert.match(block(get(history), 'pfa-core').prescription, /71 sec/);
  assert.equal(block(get(history), 'recovery').progression.value, 35);
});
test('quality intervals cap at four and technique intervals stay within their ceiling', () => {
  const quality = { ...schedule, kind: 'pfa-quality' };
  const history = [];
  for (let i = 0; i < 6; i++) add(history, 'completed', { schedule: quality });
  assert.equal(block(get(history, profile, quality), 'cardio-quality').progression.value, 4);
  const technique = []; add(technique); add(technique);
  assert.equal(block(get(technique), 'cardio-technique').progression.value, 10);
});
test('misses never create zero or negative targets', () => {
  const p = { ...profile, baseline: { ...profile.baseline, strengthReps: '2' } };
  const history = [];
  for (let i = 0; i < 6; i++) add(history, 'missed', { profile: p });
  assert.equal(block(get(history, p)).progression.value, 1);
});
test('unmeasured HAMR practice and unresisted substitutions remain unchanged', () => {
  const p = { ...profile, movementRestrictions: ['wrist-loading'] };
  assert.equal(block(get([], p)).progression, undefined);
  const controlled = get([], profile, { ...schedule, kind: 'pfa-controlled' });
  assert.equal(block(controlled, 'cardio-controlled').progression, undefined);
});
