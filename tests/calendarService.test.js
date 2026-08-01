process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './credentials/service-account.json';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildRRule } = require('../src/calendarService');

test('daily: 終了条件なし', () => {
  assert.equal(buildRRule({ ruleType: 'daily', interval: 1, end: { type: 'none' } }), 'RRULE:FREQ=DAILY');
});

test('daily: N日間（COUNT）', () => {
  assert.equal(buildRRule({ ruleType: 'daily', interval: 1, end: { type: 'count', value: 30 } }), 'RRULE:FREQ=DAILY;COUNT=30');
});

test('weekly: 複数曜日・interval=1', () => {
  const rule = buildRRule({ ruleType: 'weekly', interval: 1, weekdays: ['月', '木'], end: { type: 'none' } });
  assert.equal(rule, 'RRULE:FREQ=WEEKLY;BYDAY=MO,TH');
});

test('weekly: 隔週（interval=2）', () => {
  const rule = buildRRule({ ruleType: 'weekly', interval: 2, weekdays: ['水'], end: { type: 'count', value: 20 } });
  assert.equal(rule, 'RRULE:FREQ=WEEKLY;BYDAY=WE;INTERVAL=2;COUNT=20');
});

test('weekly: UNTIL（UTC・記号除去済み）', () => {
  const until = new Date(2026, 11, 31, 23, 59, 59).toISOString();
  const rule = buildRRule({ ruleType: 'weekly', interval: 1, weekdays: ['月'], end: { type: 'until', value: until } });
  assert.match(rule, /^RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=\d{8}T\d{6}Z$/);
});

test('monthly: 日付指定', () => {
  assert.equal(buildRRule({ ruleType: 'monthly', dayOfMonth: 15, end: { type: 'none' } }), 'RRULE:FREQ=MONTHLY;BYMONTHDAY=15');
});

test('未知のruleTypeは例外', () => {
  assert.throws(() => buildRRule({ ruleType: 'yearly', end: { type: 'none' } }));
});
