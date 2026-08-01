/**
 * recurringEventInput.js
 * 繰り返し予定の一括登録パーサー（GAS版 RecurringEventInput.gs の移植）
 *
 * 入力例:
 * - "毎日 8:00 薬を飲む 30日間"
 * - "毎週 月,木 19:00-20:00 ゴミ出し 12/31まで"
 * - "隔週 水曜 14:00 ピアノ 20回"
 * - "毎月15日 10:00 家賃振込"（終了条件省略 → 無期限）
 */

const dateUtils = require('./dateUtils');

const WEEKDAY_MAP = { 日: 'SUNDAY', 月: 'MONDAY', 火: 'TUESDAY', 水: 'WEDNESDAY', 木: 'THURSDAY', 金: 'FRIDAY', 土: 'SATURDAY' };

function parseWeekdayList(str) {
  return str
    .split(/[,、]/)
    .map((s) => s.trim().replace(/曜日?$/, ''))
    .filter((s) => WEEKDAY_MAP[s]);
}

function parseTimeRange(text) {
  const m = text.match(/^(\d{1,2}):(\d{2})(?:-(\d{1,2}):(\d{2}))?\s+(.+)$/);
  if (!m) return null;
  return {
    startHour: Number(m[1]),
    startMin: Number(m[2]),
    endHour: m[3] !== undefined ? Number(m[3]) : null,
    endMin: m[4] !== undefined ? Number(m[4]) : null,
    rest: m[5],
  };
}

function extractRecurrenceEnd(text) {
  let m = text.match(/^(.*?)\s+(\d+)(回|日間)$/);
  if (m) {
    return { title: m[1].trim(), end: { type: 'count', value: Number(m[2]) }, endLabel: `${m[2]}${m[3]}` };
  }

  m = text.match(/^(.*?)\s+(\d{4})\/(\d{1,2})\/(\d{1,2})まで$/);
  if (m) {
    const untilDate = new Date(Number(m[2]), Number(m[3]) - 1, Number(m[4]), 23, 59, 59);
    return { title: m[1].trim(), end: { type: 'until', value: untilDate.toISOString() }, endLabel: `${m[2]}/${Number(m[3])}/${Number(m[4])}まで` };
  }

  m = text.match(/^(.*?)\s+(\d{1,2})\/(\d{1,2})まで$/);
  if (m) {
    const now = new Date();
    const untilDate = new Date(now.getFullYear(), Number(m[2]) - 1, Number(m[3]), 23, 59, 59);
    if (untilDate < now) untilDate.setFullYear(untilDate.getFullYear() + 1);
    return { title: m[1].trim(), end: { type: 'until', value: untilDate.toISOString() }, endLabel: `${untilDate.getFullYear()}/${Number(m[2])}/${Number(m[3])}まで` };
  }

  return { title: text.trim(), end: { type: 'none' }, endLabel: '無期限' };
}

const RecurringEventParser = {
  TRIGGER_PATTERN: /^(毎日|毎週|隔週|毎月)/,

  isRecurringInput(text) {
    return this.TRIGGER_PATTERN.test((text || '').trim());
  },

  parse(text) {
    const trimmed = (text || '').trim();

    if (trimmed.startsWith('毎日')) return this.parseDaily(trimmed);
    if (trimmed.startsWith('隔週')) return this.parseWeekly(trimmed, '隔週', 2);
    if (trimmed.startsWith('毎週')) return this.parseWeekly(trimmed, '毎週', 1);
    if (trimmed.startsWith('毎月')) return this.parseMonthly(trimmed);

    return null;
  },

  parseDaily(text) {
    const afterPrefix = text.replace(/^毎日\s*/, '');
    const time = parseTimeRange(afterPrefix);
    const titleRaw = time ? time.rest : afterPrefix;
    const { title, end, endLabel } = extractRecurrenceEnd(titleRaw);
    if (!title) return null;

    return { ruleType: 'daily', interval: 1, title, time, end, endLabel };
  },

  parseWeekly(text, prefix, interval) {
    const afterPrefix = text.replace(new RegExp(`^${prefix}\\s*`), '');
    const wm = afterPrefix.match(/^([月火水木金土日](?:曜日?)?(?:[,、]\s*[月火水木金土日](?:曜日?)?)*)\s+(.+)$/);
    if (!wm) return null;

    const weekdays = parseWeekdayList(wm[1]);
    if (weekdays.length === 0) return null;

    const time = parseTimeRange(wm[2]);
    const titleRaw = time ? time.rest : wm[2];
    const { title, end, endLabel } = extractRecurrenceEnd(titleRaw);
    if (!title) return null;

    const weekdayLabel = weekdays.map((w) => `${w}曜`).join('・');

    return { ruleType: 'weekly', interval, weekdays, weekdayLabel, title, time, end, endLabel };
  },

  parseMonthly(text) {
    const afterPrefix = text.replace(/^毎月\s*/, '');
    const dm = afterPrefix.match(/^(\d{1,2})日\s+(.+)$/);
    if (!dm) return null;

    const dayOfMonth = Number(dm[1]);
    const time = parseTimeRange(dm[2]);
    const titleRaw = time ? time.rest : dm[2];
    const { title, end, endLabel } = extractRecurrenceEnd(titleRaw);
    if (!title) return null;

    return { ruleType: 'monthly', interval: 1, dayOfMonth, title, time, end, endLabel };
  },

  computeStartDate(parsed) {
    const today = dateUtils.getTodayStart();

    if (parsed.ruleType === 'monthly') {
      const d = new Date(today.getFullYear(), today.getMonth(), parsed.dayOfMonth);
      if (d < today) d.setMonth(d.getMonth() + 1);
      return d;
    }

    return today;
  },
};

module.exports = { RecurringEventParser, WEEKDAY_MAP };
