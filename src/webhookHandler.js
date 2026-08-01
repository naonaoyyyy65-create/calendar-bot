/**
 * webhookHandler.js
 * イベントハンドラーとルーティング（GAS版 LineWebhook.gs の移植）
 *
 * 対応コマンド: 今日/1週間/2週間/月間/凡例/絵文字凡例/ヘルプ、繰り返し予定の一括登録・絵文字追加
 * （いずれもパース→確認カード→登録/キャンセル）。
 * 統計機能（コマンド・週次送信cronとも）はユーザー判断により2026-07-25に廃止済み。
 */

const { client } = require('./lineService');
const { RecurringEventParser } = require('./recurringEventInput');
const { IconAddParser } = require('./iconInput');
const { PendingRecurringEvent, PendingIconAdd } = require('./state');
const calendarService = require('./calendarService');
const store = require('./store');
const errorHandler = require('./errorHandler');
const {
  ScheduleMessageFactory,
  MonthlyCalendarFactory,
  ColorLegendFactory,
  IconLegendFactory,
  IconAddMessageFactory,
  RecurringEventMessageFactory,
  HelpMessageFactory,
} = require('./messageFactories');

const QUICK_REPLY_ITEMS = [
  { type: 'action', action: { type: 'message', label: '今日', text: '今日' } },
  { type: 'action', action: { type: 'message', label: '1週間', text: '1週間' } },
  { type: 'action', action: { type: 'message', label: '2週間', text: '2週間' } },
  { type: 'action', action: { type: 'message', label: '月間', text: '月間' } },
  { type: 'action', action: { type: 'message', label: '絵文字凡例', text: '絵文字凡例' } },
  { type: 'action', action: { type: 'message', label: 'ヘルプ', text: 'ヘルプ' } },
];

async function replyWithQuickReplies(replyToken, message) {
  message.quickReply = { items: QUICK_REPLY_ITEMS };
  await client.replyMessage(replyToken, message);
}

function parsePostbackData(dataStr) {
  return (dataStr || '').split('&').reduce((obj, pair) => {
    if (!pair) return obj;
    const [key, ...rest] = pair.split('=');
    obj[key] = decodeURIComponent(rest.join('='));
    return obj;
  }, {});
}

async function handleEvents(events) {
  await Promise.all(events.map((ev) => handleEvent(ev).catch((err) => errorHandler.log('handleEvent', err))));
}

async function handleEvent(ev) {
  if (ev.type === 'postback') {
    await handlePostbackEvent(ev);
    return;
  }

  if (ev.type !== 'message' || ev.message.type !== 'text') return;

  const text = ev.message.text || '';
  const replyToken = ev.replyToken;
  const userId = ev.source && ev.source.userId;

  let response;

  try {
    if (userId && RecurringEventParser.isRecurringInput(text)) {
      const parsed = RecurringEventParser.parse(text);
      if (parsed) {
        PendingRecurringEvent.set(userId, parsed);
        response = RecurringEventMessageFactory.buildConfirmCard(parsed, userId);
      } else {
        response = { type: 'text', text: '繰り返し予定の形式を認識できませんでした。\n例: 毎週 月,木 19:00-20:00 ゴミ出し 12/31まで' };
      }
    } else if (userId && IconAddParser.isIconAddInput(text)) {
      const parsed = IconAddParser.parse(text);
      if (parsed) {
        PendingIconAdd.set(userId, parsed);
        response = IconAddMessageFactory.buildConfirmCard(parsed);
      } else {
        response = { type: 'text', text: '絵文字追加の形式を認識できませんでした。\n例: 絵文字追加 サッカー ⚽' };
      }
    } else if (text.includes('月間') || text.includes('カレンダー') || text.includes('今月')) {
      response = await MonthlyCalendarFactory.create();
    } else if (text.includes('2週間') || text.includes('二週間') || text.includes('2week')) {
      response = await ScheduleMessageFactory.createTwoWeeks();
    } else if (text.includes('今日')) {
      response = await ScheduleMessageFactory.createToday();
    } else if (text.includes('絵文字')) {
      response = IconLegendFactory.create();
    } else if (text.includes('凡例') || text.includes('色') || text.includes('カラー')) {
      response = ColorLegendFactory.create();
    } else if (text.includes('ヘルプ') || text.toLowerCase().includes('help') || text.includes('使い方')) {
      response = HelpMessageFactory.create();
    } else {
      response = await ScheduleMessageFactory.createWeekly();
    }
  } catch (msgErr) {
    errorHandler.log('handleEvent(メッセージ生成)', msgErr);
    response = errorHandler.buildFallbackMessage('エラー');
  }

  try {
    await replyWithQuickReplies(replyToken, response);
  } catch (lineErr) {
    errorHandler.log('handleEvent(LINE返信)', lineErr);
  }
}

async function handlePostbackEvent(ev) {
  const data = parsePostbackData(ev.postback.data || '');
  const replyToken = ev.replyToken;
  const userId = ev.source && ev.source.userId;
  if (!userId) return;

  if (data.act === 'confirm_recurring') {
    const parsed = PendingRecurringEvent.get(userId);
    if (!parsed) {
      await client.replyMessage(replyToken, { type: 'text', text: '登録内容の有効期限が切れました。もう一度入力してください。' });
      return;
    }

    try {
      const startDate = RecurringEventParser.computeStartDate(parsed);
      await calendarService.createRecurringEvent(parsed, startDate, userId);
      PendingRecurringEvent.clear(userId);
      await client.replyMessage(replyToken, RecurringEventMessageFactory.buildSuccessCard(parsed, userId));
    } catch (err) {
      errorHandler.log('handlePostbackEvent(confirm_recurring)', err);
      PendingRecurringEvent.clear(userId);
      await client.replyMessage(replyToken, errorHandler.buildFallbackMessage('登録エラー'));
    }
    return;
  }

  if (data.act === 'cancel_recurring') {
    PendingRecurringEvent.clear(userId);
    await client.replyMessage(replyToken, { type: 'text', text: 'キャンセルしました' });
    return;
  }

  if (data.act === 'confirm_icon') {
    const parsed = PendingIconAdd.get(userId);
    if (!parsed) {
      await client.replyMessage(replyToken, { type: 'text', text: '登録内容の有効期限が切れました。もう一度入力してください。' });
      return;
    }

    try {
      store.addCustomIcon(parsed.keyword, parsed.icon);
      PendingIconAdd.clear(userId);
      await client.replyMessage(replyToken, IconAddMessageFactory.buildSuccessCard(parsed));
    } catch (err) {
      errorHandler.log('handlePostbackEvent(confirm_icon)', err);
      PendingIconAdd.clear(userId);
      await client.replyMessage(replyToken, errorHandler.buildFallbackMessage('登録エラー'));
    }
    return;
  }

  if (data.act === 'cancel_icon') {
    PendingIconAdd.clear(userId);
    await client.replyMessage(replyToken, { type: 'text', text: 'キャンセルしました' });
  }
}

module.exports = { handleEvents };
