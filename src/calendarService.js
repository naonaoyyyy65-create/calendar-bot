/**
 * calendarService.js
 * Google Calendar API操作（GAS版 Services.gs の CalendarService の移植）
 *
 * GAS版はCalendarApp（GAS組み込みのカレンダーAPIラッパー）を使っていたが、
 * Node.js版はgoogleapisのCalendar API v3を直接呼ぶ。認証はkakeibo同様、
 * サービスアカウントに対象カレンダーを共有（予定の変更権限）してもらう方式。
 */

const { google } = require('googleapis');
const config = require('./config');

let calendarClientPromise = null;

function getCalendarClient() {
  if (!calendarClientPromise) {
    const auth = new google.auth.GoogleAuth({
      keyFile: config.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    calendarClientPromise = Promise.resolve(google.calendar({ version: 'v3', auth }));
  }
  return calendarClientPromise;
}

/**
 * Calendar APIのイベントリソースを、EventHandlers.js等で扱いやすい形に正規化する
 */
function normalizeEvent(ev) {
  const isAllDay = !!(ev.start && ev.start.date);
  const start = isAllDay ? new Date(`${ev.start.date}T00:00:00`) : new Date(ev.start.dateTime);
  const end = isAllDay ? new Date(`${ev.end.date}T00:00:00`) : new Date(ev.end.dateTime);

  return {
    id: ev.id,
    title: ev.summary || '(タイトルなし)',
    start,
    end,
    isAllDay,
    colorId: ev.colorId || null,
    creatorEmail: (ev.creator && ev.creator.email) || null,
    created: ev.created ? new Date(ev.created) : null,
    location: ev.location || null,
    description: ev.description || null,
  };
}

// normalizeEvent()が実際に使うフィールドのみ取得し、レスポンスサイズを減らす（応答速度の軽微な改善）
const EVENTS_LIST_FIELDS = 'items(id,summary,start,end,colorId,creator/email,created,location,description)';

/**
 * 期間内のイベントを取得（繰り返し予定は個別の発生インスタンスに展開された状態で返る）
 */
async function getEvents(startDate, endDate) {
  const calendar = await getCalendarClient();
  const res = await calendar.events.list({
    calendarId: config.GOOGLE_CALENDAR_ID,
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
    fields: EVENTS_LIST_FIELDS,
  });
  return (res.data.items || []).map(normalizeEvent);
}

const WEEKDAY_RRULE = { 日: 'SU', 月: 'MO', 火: 'TU', 水: 'WE', 木: 'TH', 金: 'FR', 土: 'SA' };

/**
 * RecurringEventParser.parse() の結果からRRULE文字列を構築する
 */
function buildRRule(parsed) {
  let rule;

  if (parsed.ruleType === 'daily') {
    rule = 'FREQ=DAILY';
  } else if (parsed.ruleType === 'weekly') {
    const byday = parsed.weekdays.map((w) => WEEKDAY_RRULE[w]).join(',');
    rule = `FREQ=WEEKLY;BYDAY=${byday}`;
    if (parsed.interval > 1) rule += `;INTERVAL=${parsed.interval}`;
  } else if (parsed.ruleType === 'monthly') {
    rule = `FREQ=MONTHLY;BYMONTHDAY=${parsed.dayOfMonth}`;
  } else {
    throw new Error(`Unknown ruleType: ${parsed.ruleType}`);
  }

  if (parsed.end.type === 'count') {
    rule += `;COUNT=${parsed.end.value}`;
  } else if (parsed.end.type === 'until') {
    const untilStr = new Date(parsed.end.value)
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');
    rule += `;UNTIL=${untilStr}`;
  }

  return `RRULE:${rule}`;
}

/**
 * 繰り返し予定を一括登録する
 * @param {Object} parsed - RecurringEventParser.parse() の結果
 * @param {string} [lineUserId] - 登録依頼を送ったLINEユーザーID。CONFIG.CREATORSに対応する
 *   作成者が見つかれば、その担当者用の色を予定に設定する
 */
async function createRecurringEvent(parsed, startDate, lineUserId) {
  const calendar = await getCalendarClient();
  const recurrence = [buildRRule(parsed)];

  const requestBody = {
    summary: parsed.title,
    recurrence,
  };

  if (!parsed.time) {
    const dateStr = startDate.toISOString().slice(0, 10);
    requestBody.start = { date: dateStr };
    requestBody.end = { date: dateStr };
  } else {
    const startTime = new Date(startDate);
    startTime.setHours(parsed.time.startHour, parsed.time.startMin, 0, 0);

    const endTime = new Date(startTime);
    if (parsed.time.endHour !== null && parsed.time.endHour !== undefined) {
      endTime.setHours(parsed.time.endHour, parsed.time.endMin, 0, 0);
    } else {
      endTime.setHours(endTime.getHours() + 1);
    }

    requestBody.start = { dateTime: startTime.toISOString(), timeZone: config.TZ };
    requestBody.end = { dateTime: endTime.toISOString(), timeZone: config.TZ };
  }

  const creator = config.getCreatorByLineUserId(lineUserId);
  if (creator && creator.calendarColorId) {
    requestBody.colorId = creator.calendarColorId;
  }

  const res = await calendar.events.insert({
    calendarId: config.GOOGLE_CALENDAR_ID,
    requestBody,
  });

  return res.data;
}

module.exports = {
  normalizeEvent,
  getEvents,
  buildRRule,
  createRecurringEvent,
};
