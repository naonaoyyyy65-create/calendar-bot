const { test } = require('node:test');
const assert = require('node:assert/strict');
const { RecurringEventParser } = require('../src/recurringEventInput');

test('isRecurringInput: 毎日/毎週/隔週/毎月で始まる文のみtrue', () => {
  assert.equal(RecurringEventParser.isRecurringInput('毎日 8:00 薬を飲む'), true);
  assert.equal(RecurringEventParser.isRecurringInput('毎週 月 会議'), true);
  assert.equal(RecurringEventParser.isRecurringInput('隔週 水曜 ピアノ'), true);
  assert.equal(RecurringEventParser.isRecurringInput('毎月15日 家賃'), true);
  assert.equal(RecurringEventParser.isRecurringInput('今日の予定'), false);
});

test('毎日 8:00 薬を飲む 30日間', () => {
  const r = RecurringEventParser.parse('毎日 8:00 薬を飲む 30日間');
  assert.equal(r.ruleType, 'daily');
  assert.equal(r.title, '薬を飲む');
  assert.deepEqual(r.time, { startHour: 8, startMin: 0, endHour: null, endMin: null, rest: '薬を飲む 30日間' });
  assert.deepEqual(r.end, { type: 'count', value: 30 });
  assert.equal(r.endLabel, '30日間');
});

test('毎週 月,木 19:00-20:00 ゴミ出し 12/31まで', () => {
  const r = RecurringEventParser.parse('毎週 月,木 19:00-20:00 ゴミ出し 12/31まで');
  assert.equal(r.ruleType, 'weekly');
  assert.equal(r.interval, 1);
  assert.deepEqual(r.weekdays, ['月', '木']);
  assert.equal(r.weekdayLabel, '月曜・木曜');
  assert.equal(r.title, 'ゴミ出し');
  assert.equal(r.time.startHour, 19);
  assert.equal(r.time.endHour, 20);
  assert.equal(r.end.type, 'until');
});

test('隔週 水曜 14:00 ピアノ 20回', () => {
  const r = RecurringEventParser.parse('隔週 水曜 14:00 ピアノ 20回');
  assert.equal(r.ruleType, 'weekly');
  assert.equal(r.interval, 2);
  assert.deepEqual(r.weekdays, ['水']);
  assert.equal(r.title, 'ピアノ');
  assert.deepEqual(r.end, { type: 'count', value: 20 });
});

test('毎月15日 10:00 家賃振込（終了条件省略→無期限）', () => {
  const r = RecurringEventParser.parse('毎月15日 10:00 家賃振込');
  assert.equal(r.ruleType, 'monthly');
  assert.equal(r.dayOfMonth, 15);
  assert.equal(r.title, '家賃振込');
  assert.deepEqual(r.end, { type: 'none' });
  assert.equal(r.endLabel, '無期限');
});

test('時間省略時は終日扱い（time=null）', () => {
  const r = RecurringEventParser.parse('毎日 掃除 7日間');
  assert.equal(r.time, null);
  assert.equal(r.title, '掃除');
});

test('曜日を認識できない場合はnull', () => {
  assert.equal(RecurringEventParser.parse('毎週 あ 19:00 テスト'), null);
});

test('日付部分が無い毎月入力はnull', () => {
  assert.equal(RecurringEventParser.parse('毎月 家賃'), null);
});

test('繰り返しでない文はparseもnull', () => {
  assert.equal(RecurringEventParser.parse('今日の予定'), null);
});
