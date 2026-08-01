const { test } = require('node:test');
const assert = require('node:assert/strict');
const changeDetector = require('../src/changeDetector');

function makeEvent(overrides = {}) {
  return {
    id: 'ev1',
    title: 'テスト予定',
    start: new Date('2026-08-01T10:00:00+09:00'),
    end: new Date('2026-08-01T11:00:00+09:00'),
    isAllDay: false,
    colorId: null,
    created: new Date('2026-07-20T00:00:00+09:00'),
    ...overrides,
  };
}

test('createSnapshot: イベントIDをキーにしたスナップショットを作る', () => {
  const events = [makeEvent({ id: 'a' }), makeEvent({ id: 'b', title: '別の予定' })];
  const snapshot = changeDetector.createSnapshot(events);

  assert.deepEqual(Object.keys(snapshot).sort(), ['a', 'b']);
  assert.equal(snapshot.a.title, 'テスト予定');
  assert.equal(snapshot.b.title, '別の予定');
  assert.equal(snapshot.a.start, events[0].start.toISOString());
});

test('isModified: タイトル・開始・終了・色のいずれかが変われば true', () => {
  const base = { title: 'A', start: '2026-08-01T01:00:00.000Z', end: '2026-08-01T02:00:00.000Z', colorId: '9' };
  assert.equal(changeDetector.isModified(base, { ...base }), false);
  assert.equal(changeDetector.isModified(base, { ...base, title: 'B' }), true);
  assert.equal(changeDetector.isModified(base, { ...base, start: '2026-08-01T03:00:00.000Z' }), true);
  assert.equal(changeDetector.isModified(base, { ...base, colorId: '11' }), true);
});

test('detectAdded: 未知のIDかつlastCheck以降に作成されたものだけを新規とみなす', () => {
  const lastCheck = new Date('2026-07-25T00:00:00+09:00');
  const known = makeEvent({ id: 'known', created: new Date('2026-07-01T00:00:00+09:00') });
  const newSinceLastCheck = makeEvent({ id: 'new1', created: new Date('2026-07-26T00:00:00+09:00') });
  // IDはlastSnapshotに無いが、作成日時がlastCheckより前(=スナップショット取得前から存在した予定)
  const oldButUntracked = makeEvent({ id: 'old-untracked', created: new Date('2026-07-01T00:00:00+09:00') });

  const lastSnapshot = { known: changeDetector.createSnapshotEntry(known) };
  const added = changeDetector.detectAdded([known, newSinceLastCheck, oldButUntracked], lastSnapshot, lastCheck);

  assert.deepEqual(added.map((e) => e.id), ['new1']);
});

test('detectModified: lastSnapshotに存在し内容が変わったイベントのみ抽出', () => {
  const unchanged = makeEvent({ id: 'u' });
  const changed = makeEvent({ id: 'c', title: '変更後のタイトル' });

  const lastSnapshot = {
    u: changeDetector.createSnapshotEntry(makeEvent({ id: 'u' })),
    c: changeDetector.createSnapshotEntry(makeEvent({ id: 'c', title: '変更前のタイトル' })),
  };
  const currentSnapshot = changeDetector.createSnapshot([unchanged, changed]);

  const modified = changeDetector.detectModified([unchanged, changed], lastSnapshot, currentSnapshot);

  assert.equal(modified.length, 1);
  assert.equal(modified[0].event.id, 'c');
  assert.equal(modified[0].old.title, '変更前のタイトル');
  assert.equal(modified[0].new.title, '変更後のタイトル');
});

test('detectDeleted: checkStart以降に開始予定だったイベントのみ削除とみなす（過去予定は対象外）', () => {
  const checkStart = new Date('2026-07-25T00:00:00+09:00');
  const futureDeleted = makeEvent({ id: 'future', start: new Date('2026-08-01T10:00:00+09:00') });
  const pastDeleted = makeEvent({ id: 'past', start: new Date('2026-07-01T10:00:00+09:00') });

  const lastSnapshot = {
    future: changeDetector.createSnapshotEntry(futureDeleted),
    past: changeDetector.createSnapshotEntry(pastDeleted),
  };
  const currentSnapshot = {}; // 両方ともカレンダーから消えている

  const deleted = changeDetector.detectDeleted(lastSnapshot, currentSnapshot, checkStart);

  assert.deepEqual(deleted.map((d) => d.id), ['future']);
});

test('detectAll: added/modified/deletedをまとめて返す', () => {
  const lastCheck = new Date('2026-07-20T00:00:00+09:00');
  const checkStart = new Date('2026-07-25T00:00:00+09:00');

  const stillThere = makeEvent({ id: 'same' });
  const newEvent = makeEvent({ id: 'new', created: new Date('2026-07-26T00:00:00+09:00') });

  const lastSnapshot = {
    same: changeDetector.createSnapshotEntry(stillThere),
    removed: changeDetector.createSnapshotEntry(makeEvent({ id: 'removed', start: new Date('2026-08-01T00:00:00+09:00') })),
  };
  const currentEvents = [stillThere, newEvent];
  const currentSnapshot = changeDetector.createSnapshot(currentEvents);

  const result = changeDetector.detectAll(lastSnapshot, currentSnapshot, currentEvents, lastCheck, checkStart);

  assert.deepEqual(result.added.map((e) => e.id), ['new']);
  assert.equal(result.modified.length, 0);
  assert.deepEqual(result.deleted.map((d) => d.id), ['removed']);
});
