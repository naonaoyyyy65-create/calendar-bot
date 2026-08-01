const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventFormatter } = require('../src/eventHandlers');

test('formatTimeFromData: 終日イベントは「終日」を返す', () => {
  assert.equal(EventFormatter.formatTimeFromData({ isAllDay: true, start: '2026-08-01T00:00:00.000Z', end: '2026-08-01T00:00:00.000Z' }), '終日');
});

test('formatTimeFromData: 時刻付きイベントはHH:mm〜HH:mmを返す', () => {
  const data = {
    isAllDay: false,
    start: new Date('2026-08-01T10:00:00+09:00').toISOString(),
    end: new Date('2026-08-01T11:30:00+09:00').toISOString(),
  };
  assert.equal(EventFormatter.formatTimeFromData(data), '10:00〜11:30');
});
