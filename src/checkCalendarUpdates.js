/**
 * checkCalendarUpdates.js
 * カレンダー変更検知のcronエントリーポイント（GAS版 CalendarUpdateChecker.check の移植）
 * Pi上のcronから8時・12時・20時の3回実行する想定
 *
 * 実行方法:
 *   node src/checkCalendarUpdates.js           … 本番送信（NOTIFY_USER_IDSの2人へ）
 *   node src/checkCalendarUpdates.js --debug   … デバッグ送信（DEBUG_USER_IDの1人のみ）
 */
const config = require('./config');
const dateUtils = require('./dateUtils');
const calendarService = require('./calendarService');
const changeDetector = require('./changeDetector');
const { ChangeNotificationBuilder } = require('./flexBuilders');
const lineService = require('./lineService');
const store = require('./store');
const { notifyFailure } = require('./notifyFailure');

const debug = process.argv.includes('--debug');

async function main() {
  const now = new Date();
  const lastCheck = store.getLastCheck(config.CHECK_INTERVAL_HOURS);
  const checkStart = dateUtils.getTodayStart();
  const checkEnd = dateUtils.addDays(checkStart, config.SCHEDULE.FUTURE_DAYS);

  const currentEvents = await calendarService.getEvents(checkStart, checkEnd);
  const lastSnapshot = store.getSnapshot();
  const currentSnapshot = changeDetector.createSnapshot(currentEvents);

  const changes = changeDetector.detectAll(lastSnapshot, currentSnapshot, currentEvents, lastCheck, checkStart);

  if (changes.added.length > 0 || changes.modified.length > 0 || changes.deleted.length > 0) {
    const message = ChangeNotificationBuilder.build(changes);
    await lineService.push(message, debug);
  }

  store.setSnapshot(currentSnapshot);
  store.setLastCheck(now);

  console.log(`カレンダー更新チェック完了: 追加${changes.added.length}件 変更${changes.modified.length}件 削除${changes.deleted.length}件`);
}

main()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('❌ カレンダー更新チェック失敗:', err);
    await notifyFailure('カレンダー更新チェック', err);
    process.exit(1);
  });
