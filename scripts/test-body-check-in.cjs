const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
function modules(storage = {}) {
  const cache = new Map();
  function load(name) {
    if (cache.has(name)) return cache.get(name);
    const filename = path.resolve(__dirname, '../src/lib', `${name}.ts`);
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    vm.runInNewContext(output, { exports, require: (request) => {
      if (request === '@react-native-async-storage/async-storage') return { __esModule: true, default: storage };
      if (request.startsWith('./')) return load(request.slice(2));
      throw new Error(`Unexpected dependency: ${request}`);
    } }, { filename });
    cache.set(name, exports);
    return exports;
  }
  return load;
}
const { getWeekStart, isCheckInDay, isCheckInDue, createBodyCheckIn } = modules()('body-check-in');
const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const local = (text) => new Date(`${text}T12:00:00`);
const friday = local('2026-09-18');

test('prompt follows the final scheduled day, including weekend schedules', () => {
  assert.equal(isCheckInDay(days, friday), true);
  assert.equal(isCheckInDay(days, local('2026-09-17')), false);
  assert.equal(isCheckInDay(days, local('2026-09-19')), false);
  assert.equal(isCheckInDay([], friday), false);
  const weekend = ['sunday', 'wednesday', 'monday', 'saturday', 'friday'];
  assert.equal(isCheckInDay(weekend, friday), false);
  assert.equal(isCheckInDay(weekend, local('2026-09-20')), true);
});
test('local Monday week keys handle Sunday, year boundaries, and DST weeks', () => {
  assert.equal(getWeekStart(local('2026-09-20')), '2026-09-14');
  assert.equal(getWeekStart(local('2026-09-21')), '2026-09-21');
  assert.equal(getWeekStart(local('2027-01-01')), '2026-12-28');
  assert.equal(getWeekStart(local('2026-03-08')), '2026-03-02');
  assert.equal(getWeekStart(local('2026-11-01')), '2026-10-26');
});
test('saved check-in suppresses the week even if the training schedule changes', () => {
  const records = [createBodyCheckIn('180.5', '34.25', friday)];
  assert.equal(isCheckInDue(days, records, friday), false);
  assert.equal(isCheckInDue(['monday', 'tuesday', 'thursday', 'friday', 'sunday'], records, local('2026-09-20')), false);
  assert.equal(isCheckInDue(days, records, local('2026-09-25')), true);
});
test('weight is required, waist is optional, and invalid measurements are rejected', () => {
  const record = createBodyCheckIn(' 180.5 ', '', friday);
  assert.equal(record.weightLb, 180.5);
  assert.equal(record.waistInches, undefined);
  assert.equal(createBodyCheckIn('180', '34.25', friday).waistInches, 34.25);
  for (const value of ['', '0', '-1', 'Infinity', 'NaN', '1e3', '12abc', '1,5']) {
    assert.throws(() => createBodyCheckIn(value, '', friday), /positive number/);
  }
  for (const value of ['0', '-2', 'abc']) {
    assert.throws(() => createBodyCheckIn('180', value, friday), /positive number/);
  }
});
test('saves are isolated from profile/workout data and duplicate requests create one entry', async () => {
  const data = new Map([['workouts', '[{"id":1}]'], ['loadtoad.profile.v1', '{"weightLb":"170"}']]);
  const api = modules({ getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); } })('body-check-in-storage');
  const results = await Promise.allSettled([
    api.saveBodyCheckIn(days, '180', '', friday), api.saveBodyCheckIn(days, '181', '', friday),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal((await api.loadBodyCheckIns()).length, 1);
  assert.equal(data.get('workouts'), '[{"id":1}]');
  assert.equal(data.get('loadtoad.profile.v1'), '{"weightLb":"170"}');
  await api.saveBodyCheckIn(days, '182', '35', local('2026-09-25'));
  assert.equal((await api.loadBodyCheckIns()).length, 2);
});
test('off-day saves are rejected, including when a form remains open past midnight', async () => {
  let writes = 0;
  const api = modules({ getItem: async () => null, setItem: async () => { writes++; } })('body-check-in-storage');
  await assert.rejects(api.saveBodyCheckIn(days, '180', '', local('2026-09-19')), /final training day/);
  assert.equal(writes, 0);
});
test('corrupt history is not overwritten and a failed write can be retried', async () => {
  let writes = 0;
  const corrupt = modules({ getItem: async () => '{}', setItem: async () => { writes++; } })('body-check-in-storage');
  await assert.rejects(corrupt.saveBodyCheckIn(days, '180', '', friday), /history/);
  assert.equal(writes, 0);
  let fail = true;
  let saved = null;
  const api = modules({ getItem: async () => saved, setItem: async (_, value) => {
    if (fail) throw new Error('Storage full');
    saved = value;
  } })('body-check-in-storage');
  await assert.rejects(api.saveBodyCheckIn(days, '180', '', friday), /Storage full/);
  assert.equal(saved, null);
  fail = false;
  await api.saveBodyCheckIn(days, '180', '', friday);
  assert.equal((await api.loadBodyCheckIns()).length, 1);
});
