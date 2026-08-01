/**
 * dateUtils.js
 * 日付操作ユーティリティ（GAS版 Utils.gs の DateUtils 部分の移植）
 *
 * GASの Utilities.formatDate(date, 'Asia/Tokyo', pattern) 相当を、
 * 実行環境のタイムゾーン設定に関わらず常にAsia/Tokyoで解釈するIntlベースの実装に置き換える。
 */

const { TZ, WEEKDAYS } = require('./config');

function parts(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .formatToParts(date)
    .reduce((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
}

/**
 * 対応パターン: yyyy-MM-dd, MM/dd, MM/dd(E), MM/dd HH:mm, HH:mm
 */
function format(date, pattern) {
  const p = parts(date);
  const weekday = WEEKDAYS[date.getDay()];
  return pattern
    .replace('yyyy', p.year)
    .replace('MM', p.month)
    .replace('dd', p.day)
    .replace('HH', p.hour)
    .replace('mm', p.minute)
    .replace('(E)', `(${weekday})`);
}

function toDateKey(date) {
  return format(date, 'yyyy-MM-dd');
}

function getTodayStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addHours(date, hours) {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

function getWeekStart(date) {
  const result = new Date(date);
  result.setDate(result.getDate() - result.getDay());
  result.setHours(0, 0, 0, 0);
  return result;
}

function getWeekEnd(date) {
  const result = getWeekStart(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

function isSameDay(date1, date2) {
  return toDateKey(date1) === toDateKey(date2);
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getRelativeDateText(date) {
  const today = getTodayStart();
  const tomorrow = addDays(today, 1);
  const yesterday = addDays(today, -1);

  if (isSameDay(date, today)) return '今日';
  if (isSameDay(date, tomorrow)) return '明日';
  if (isSameDay(date, yesterday)) return '昨日';

  const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24));
  if (diffDays > 0 && diffDays <= 7) return `${diffDays}日後`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)}日前`;

  return null;
}

module.exports = {
  format,
  toDateKey,
  getTodayStart,
  addDays,
  addHours,
  getWeekStart,
  getWeekEnd,
  isSameDay,
  isWeekend,
  getRelativeDateText,
};
