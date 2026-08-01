const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createStore } = require('../src/store');

function tempStorePath() {
  return path.join(os.tmpdir(), `calendar-store-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
}

test('getLastCheck: 未保存時はdefaultHoursAgo時間前を返す', () => {
  const store = createStore(tempStorePath());
  const before = Date.now();
  const result = store.getLastCheck(12);
  const expectedMs = before - 12 * 60 * 60 * 1000;
  // 実行時間のブレを許容して概ね12時間前であることを確認
  assert.ok(Math.abs(result.getTime() - expectedMs) < 5000);
});

test('setLastCheck/getLastCheckが往復する', () => {
  const filePath = tempStorePath();
  const store = createStore(filePath);
  const date = new Date('2026-07-25T10:00:00+09:00');
  store.setLastCheck(date);
  assert.equal(store.getLastCheck(12).getTime(), date.getTime());
  fs.unlinkSync(filePath);
});

test('setSnapshot/getSnapshotが往復する', () => {
  const filePath = tempStorePath();
  const store = createStore(filePath);
  const snapshot = { ev1: { title: 'テスト', start: '2026-08-01T01:00:00.000Z', end: '2026-08-01T02:00:00.000Z', isAllDay: false, colorId: null } };
  store.setSnapshot(snapshot);
  assert.deepEqual(store.getSnapshot(), snapshot);
  fs.unlinkSync(filePath);
});

test('lastCheck/snapshotは互いに独立して保存される', () => {
  const filePath = tempStorePath();
  const store = createStore(filePath);
  store.setSnapshot({ a: 1 });
  store.setLastCheck(new Date('2026-07-25T00:00:00+09:00'));

  assert.deepEqual(store.getSnapshot(), { a: 1 });
  fs.unlinkSync(filePath);
});

test('getCustomIcons: 未保存時は空配列を返す', () => {
  const store = createStore(tempStorePath());
  assert.deepEqual(store.getCustomIcons(), []);
});

test('addCustomIcon/getCustomIconsが往復し、複数回の追加が積み上がる', () => {
  const filePath = tempStorePath();
  const store = createStore(filePath);
  store.addCustomIcon('サッカー', '⚽');
  store.addCustomIcon('野球', '⚾');

  assert.deepEqual(store.getCustomIcons(), [
    { keyword: 'サッカー', icon: '⚽' },
    { keyword: '野球', icon: '⚾' },
  ]);
  fs.unlinkSync(filePath);
});

test('customIconsはlastCheck/snapshotと互いに独立して保存される', () => {
  const filePath = tempStorePath();
  const store = createStore(filePath);
  store.setSnapshot({ a: 1 });
  store.addCustomIcon('サッカー', '⚽');

  assert.deepEqual(store.getSnapshot(), { a: 1 });
  assert.deepEqual(store.getCustomIcons(), [{ keyword: 'サッカー', icon: '⚽' }]);
  fs.unlinkSync(filePath);
});
