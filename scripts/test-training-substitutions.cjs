const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

// Compile the pure training module in memory; no app runtime or generated files.
function loadTypescript(relativePath) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports }, { filename });
  return exports;
}

const { buildPlannedWorkout } = loadTypescript('src/lib/training-program.ts');
const { emptyUserProfile } = loadTypescript('src/types/profile.ts');
const now = new Date('2026-09-15T12:00:00');
function workout(kind, equipment = ['bodyweight'], movementRestrictions = [], extra = {}) {
  return buildPlannedWorkout({
    ...emptyUserProfile,
    cardioComponent: 'hamr', strengthComponent: 'push-ups', coreComponent: 'plank',
    baseline: { ...emptyUserProfile.baseline, strengthReps: '40' },
    testDate: '2026-12-15', equipment, movementRestrictions, ...extra,
  }, { day: 'monday', kind, type: kind.startsWith('pfa') ? 'pfa' : 'strength' }, now);
}
const block = (session, id) => session.blocks.find((entry) => entry.id === id);

test('wrist restrictions replace pressing across routine and mock sessions', () => {
  for (const equipment of [['bodyweight'], ['dumbbells'], ['resistance-bands'], ['full-gym']]) {
    for (const kind of ['pfa-technique', 'pfa-controlled', 'pfa-quality', 'strength-b']) {
      const session = workout(kind, equipment, ['wrist-loading']);
      const press = block(session, kind === 'strength-b' ? 'press' : 'pfa-strength');
      assert.doesNotMatch(press.title, /push-ups/i);
      assert.doesNotMatch(press.prescription, /baseline|20 reps|22 reps|24 reps/);
    }
    const mock = workout('pfa-quality', equipment, ['wrist-loading'], { testDate: '2026-10-13' });
    assert.equal(mock.isMock, false);
    assert.notEqual(mock.intensity, 'test');
  }
});

test('equipment-free strength days do not assume bands, cables, weights, or a step', () => {
  for (const restrictions of [[], ['squat', 'lunge'], ['spinal-loading'], ['wrist-loading']]) {
    for (const kind of ['strength-a', 'strength-b']) {
      const session = workout(kind, ['bodyweight'], restrictions);
      assert.doesNotMatch(session.blocks.map((b) => b.title + b.prescription).join(' '),
        /Pallof|Band |Cable|Dumbbell|Machine|Step-Up|Towel|Hip Thrust/i);
    }
  }
});

test('combined restrictions avoid conflicting lower-body and pulling options', () => {
  const restrictions = ['squat', 'lunge', 'hip-hinge', 'spinal-loading', 'kneel', 'wrist-loading'];
  for (const equipment of [['bodyweight'], ['dumbbells'], ['resistance-bands'], ['full-gym']]) {
    for (const kind of ['strength-a', 'strength-b']) {
      const session = workout(kind, equipment, restrictions);
      assert.doesNotMatch(session.blocks.map((b) => b.title).join(' '),
        /Goblet|Romanian|Step-Up|Split Squat|Lunge|Torture|Push-Ups|Standing.*Dumbbell Row/i);
    }
  }
});

test('restricted rowing and stair climbing fall back to walking', () => {
  for (const restriction of ['hip-hinge', 'spinal-loading', 'squat', 'wrist-loading']) {
    const session = workout('pfa-technique', ['rower'], ['run', restriction]);
    assert.match(block(session, 'cardio-low-impact').title, /walk/i);
    assert.match(block(session, 'recovery').prescription, /walk/i);
  }
  for (const restriction of ['squat', 'lunge']) {
    const session = workout('pfa-technique', ['stair-climber'], ['run', restriction]);
    assert.match(block(session, 'cardio-low-impact').title, /walk/i);
  }
});

test('impact restrictions apply to mock weeks for both running events', () => {
  for (const cardioComponent of ['hamr', 'two-mile-run']) {
    for (const restriction of ['run', 'jump', 'high-impact']) {
      const session = workout('pfa-quality', ['bike'], [restriction], {
        cardioComponent, testDate: '2026-10-13',
      });
      assert.equal(session.isMock, false);
      assert.match(block(session, 'cardio-low-impact-quality').title, /bike/i);
      assert.ok(!session.blocks.some((b) => b.id.startsWith('mock-')));
    }
  }
});

test('unrestricted baselines and mock sessions remain available', () => {
  assert.match(block(workout('pfa-technique'), 'pfa-strength').prescription, /22 reps/);
  const mock = workout('pfa-quality', ['bodyweight'], [], { testDate: '2026-10-13' });
  assert.equal(mock.isMock, true);
  assert.equal(mock.intensity, 'test');
  assert.equal(block(mock, 'mock-cardio').title, '20m HAMR');
  const walkMock = workout('pfa-quality', ['bodyweight'], ['run'], {
    testDate: '2026-10-13', cardioComponent: 'two-km-walk',
  });
  assert.equal(walkMock.isMock, true);
});

test('available bands retain trunk resistance without kneeling or restricted twists', () => {
  const session = workout('strength-a', ['resistance-bands'], ['kneel', 'hip-hinge']);
  assert.match(block(session, 'trunk').title, /Standing Pallof/);
  assert.doesNotMatch(block(session, 'trunk').prescription, /Torture/i);
});
