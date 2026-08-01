/**
 * sendMonthlyCalendar.js
 * 月間カレンダーのcronエントリーポイント（GAS版 ScheduledFunctions.gs の sendMonthlyCalendar 相当）
 * Pi上のcronから毎週月曜8時に実行する想定
 *
 * 実行方法:
 *   node src/sendMonthlyCalendar.js           … 本番送信（NOTIFY_USER_IDSの2人へ）
 *   node src/sendMonthlyCalendar.js --debug   … デバッグ送信（DEBUG_USER_IDの1人のみ）
 */
const { MonthlyCalendarFactory } = require('./messageFactories');
const lineService = require('./lineService');
const { notifyFailure } = require('./notifyFailure');

const debug = process.argv.includes('--debug');

MonthlyCalendarFactory.create()
  .then((message) => lineService.push(message, debug))
  .then(() => {
    console.log('月間カレンダー送信完了');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ 月間カレンダー送信失敗:', err);
    await notifyFailure('月間カレンダー送信', err);
    process.exit(1);
  });
