const { test } = require('node:test');
const assert = require('node:assert/strict');
const dateUtils = require('../src/dateUtils');

test('format: 各パターン', () => {
  const d = new Date(2026, 6, 25, 9, 5); // 2026-07-25 09:05 (JST想定)
  assert.equal(dateUtils.format(d, 'yyyy-MM-dd'), '2026-07-25');
  assert.equal(dateUtils.format(d, 'MM/dd'), '07/25');
  assert.equal(dateUtils.format(d, 'HH:mm'), '09:05');
});

test('getWeekStart / getWeekEnd: 日曜始まり', () => {
  const wed = new Date(2026, 6, 22); // 2026-07-22は水曜
  const start = dateUtils.getWeekStart(wed);
  const end = dateUtils.getWeekEnd(wed);
  assert.equal(start.getDay(), 0);
  assert.equal(end.getDay(), 6);
  assert.ok(start <= wed && wed <= end);
});

test('isWeekend', () => {
  assert.equal(dateUtils.isWeekend(new Date(2026, 6, 25)), true); // 2026-07-25は土曜日
  assert.equal(dateUtils.isWeekend(new Date(2026, 6, 27)), false); // 2026-07-27は月曜日
});

test('getRelativeDateText: 今日/明日/昨日', () => {
  const today = dateUtils.getTodayStart();
  assert.equal(dateUtils.getRelativeDateText(today), '今日');
  assert.equal(dateUtils.getRelativeDateText(dateUtils.addDays(today, 1)), '明日');
  assert.equal(dateUtils.getRelativeDateText(dateUtils.addDays(today, -1)), '昨日');
  assert.equal(dateUtils.getRelativeDateText(dateUtils.addDays(today, 3)), '3日後');
  assert.equal(dateUtils.getRelativeDateText(dateUtils.addDays(today, -3)), '3日前');
  assert.equal(dateUtils.getRelativeDateText(dateUtils.addDays(today, 10)), null);
});
