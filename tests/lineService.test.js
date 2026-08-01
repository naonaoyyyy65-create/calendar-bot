process.env.LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || 'dummy';
process.env.LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || 'dummy';
process.env.GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'dummy';
process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './credentials/service-account.json';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pushWith } = require('../src/lineService');

// pushWithはLINE送信関数（pushMessageFn）を外から渡す設計のため、@line/bot-sdk実物には
// 一切触れずにテストできる（`@line/bot-sdk`はデュアルパッケージでnode:testのmock.module()が
// 効かないため、この分離自体が回避策。詳細はlineService.js冒頭コメント参照）。

function fakePush(calls, failFor) {
  return async (to) => {
    calls.push(to);
    if (to === failFor) throw new Error('push failed (test)');
  };
}

test('pushWith: debug=trueはdebugUserIdのみへ送る', async () => {
  const calls = [];
  await pushWith(fakePush(calls), ['Uc1', 'Uc2'], 'Uc1', { type: 'text', text: 'hi' }, true);
  assert.deepEqual(calls, ['Uc1']);
});

test('pushWith: debug=false（本番）はnotifyUserIds全員へ送る', async () => {
  const calls = [];
  await pushWith(fakePush(calls), ['Uc1', 'Uc2'], 'Uc1', { type: 'text', text: 'hi' }, false);
  assert.deepEqual(calls, ['Uc1', 'Uc2']);
});

test('pushWith: debug=trueでdebugUserIdが未設定なら例外を投げる', async () => {
  const calls = [];
  await assert.rejects(
    () => pushWith(fakePush(calls), ['Uc1', 'Uc2'], null, { type: 'text', text: 'hi' }, true),
    /DEBUG_USER_ID/
  );
  assert.deepEqual(calls, []);
});

test('pushWith: notifyUserIdsが空でも例外を投げず何もしない', async () => {
  const calls = [];
  await assert.doesNotReject(pushWith(fakePush(calls), [], 'Uc1', { type: 'text', text: 'hi' }, false));
  assert.deepEqual(calls, []);
});

test('pushWith: 1人への送信が失敗しても例外を投げず、他の1人には送信される', async () => {
  const calls = [];
  await assert.doesNotReject(pushWith(fakePush(calls, 'Uc2'), ['Uc1', 'Uc2'], 'Uc1', { type: 'text', text: 'hi' }, false));
  assert.deepEqual(calls, ['Uc1', 'Uc2']);
});

test('pushWith: 全員への送信が失敗しても例外を投げない', async () => {
  const calls = [];
  const alwaysFail = async (to) => {
    calls.push(to);
    throw new Error('push failed (test)');
  };
  await assert.doesNotReject(pushWith(alwaysFail, ['Uc1', 'Uc2'], 'Uc1', { type: 'text', text: 'hi' }, false));
  assert.deepEqual(calls, ['Uc1', 'Uc2']);
});
