/**
 * sendTodaySchedule.js
 * 今日の予定のcronエントリーポイント（GAS版 ScheduledFunctions.gs の sendTodaySchedule 相当）
 * Pi上のcronから毎日8時に実行する想定
 *
 * 実行方法:
 *   node src/sendTodaySchedule.js           … 本番送信（NOTIFY_USER_IDSの2人へ）
 *   node src/sendTodaySchedule.js --debug   … デバッグ送信（DEBUG_USER_IDの1人のみ）
 */
const { ScheduleMessageFactory } = require('./messageFactories');
const lineService = require('./lineService');
const { notifyFailure } = require('./notifyFailure');

const debug = process.argv.includes('--debug');

ScheduleMessageFactory.createToday()
  .then((message) => lineService.push(message, debug))
  .then(() => {
    console.log('今日の予定送信完了');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ 今日の予定送信失敗:', err);
    await notifyFailure('今日の予定送信', err);
    process.exit(1);
  });
