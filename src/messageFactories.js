/**
 * messageFactories.js
 * メッセージファクトリー（GAS版 MessageFactories.gs の移植）
 *
 * ScheduleMessageFactory / MonthlyCalendarFactory（月間グリッドのみ、2週間グリッド版は
 * GAS版でもcronから呼ばれない未使用機能のため対象外） / ColorLegendFactory /
 * RecurringEventMessageFactory / HelpMessageFactory を移植する。
 * 統計機能（StatisticsFactory）はユーザー判断により2026-07-25に廃止済み。
 */

const config = require('./config');
const dateUtils = require('./dateUtils');
const calendarService = require('./calendarService');
const { EventFilter, EventGrouper } = require('./eventHandlers');
const { FlexBuilder, CalendarFlexBuilder, ColorLegendBuilder, IconLegendBuilder } = require('./flexBuilders');
const errorHandler = require('./errorHandler');

async function getFilteredEvents(start, end) {
  const events = await calendarService.getEvents(start, end);
  return EventFilter.filter(events);
}

const ScheduleMessageFactory = {
  async create(days, title, altText, includeLegend = false, maxEvents = 15, maxGroups = 7) {
    try {
      const start = dateUtils.getTodayStart();
      const end = dateUtils.addDays(start, days);
      const events = await getFilteredEvents(start, end);

      if (events.length === 0) {
        return FlexBuilder.bubble(
          title,
          [
            FlexBuilder.box(
              'vertical',
              [
                FlexBuilder.text('📭', { size: 'xxl', align: 'center' }),
                FlexBuilder.text('予定はありません', { size: 'md', color: config.COLORS.textMuted, align: 'center', margin: 'md' }),
              ],
              { justifyContent: 'center', alignItems: 'center', paddingAll: 'xl' }
            ),
          ],
          { headerIcon: '📅', headerColor: config.COLORS.primary }
        );
      }

      const limitedEvents = events.slice(0, maxEvents);
      const grouped = EventGrouper.groupByDate(limitedEvents);
      const bodyContents = [];

      // 件数サマリーカードは廃止（2026-07-25、情報量削減のため）。件数はヘッダーのsubtitleで確認できる
      if (events.length > maxEvents) {
        bodyContents.push(FlexBuilder.infoBox(`全${events.length}件中${maxEvents}件を表示しています`, 'info'));
      }

      const sortedGroups = EventGrouper.sortGroups(grouped);

      sortedGroups.slice(0, maxGroups).forEach(({ dateObj, events: dayEvents }) => {
        bodyContents.push(FlexBuilder.dateHeader(dateObj));
        dayEvents.slice(0, 5).forEach((event) => bodyContents.push(FlexBuilder.eventRow(event)));

        if (dayEvents.length > 5) {
          bodyContents.push(
            FlexBuilder.box('horizontal', [FlexBuilder.text(`+${dayEvents.length - 5}件`, { size: 'xs', color: config.COLORS.textMuted, align: 'center' })], {
              justifyContent: 'center',
              margin: 'sm',
              paddingAll: 'sm',
              backgroundColor: config.COLORS.weekendBg,
              cornerRadius: 'md',
            })
          );
        }
      });

      if (includeLegend && Object.keys(config.getEventColorMapping()).length <= 3) {
        bodyContents.push(...ColorLegendBuilder.build({ includeCategory: false }));
      }

      return FlexBuilder.bubble(title, bodyContents, { headerIcon: '📅', headerColor: config.COLORS.primary, subtitle: `${events.length}件の予定` });
    } catch (err) {
      errorHandler.log('ScheduleMessageFactory.create', err);
      return errorHandler.buildFallbackMessage(altText);
    }
  },

  createToday() {
    return this.create(1, '今日の予定', '📅 今日の予定', true);
  },
  createWeekly() {
    return this.create(7, '1週間の予定', '📅 1週間の予定', false);
  },
  createTwoWeeks() {
    return this.create(14, '2週間の予定', '📅 2週間の予定', false, 30, 14);
  },
};

const MonthlyCalendarFactory = {
  async create(weekOffset = 0) {
    try {
      const now = new Date();
      const todayWeekStart = dateUtils.getWeekStart(now);
      const calendarStart = dateUtils.addDays(todayWeekStart, weekOffset * 7);
      const calendarEnd = dateUtils.addDays(calendarStart, config.MONTHLY_CALENDAR.NUM_WEEKS * 7 - 1);
      calendarEnd.setHours(23, 59, 59, 999);

      const events = await getFilteredEvents(calendarStart, new Date(calendarEnd.getTime() + 1));
      const groupedEvents = EventGrouper.groupByDate(events);

      const calendarBody = CalendarFlexBuilder.grid(calendarStart, config.MONTHLY_CALENDAR.NUM_WEEKS, groupedEvents, now);

      const title = this.buildTitle(calendarStart, calendarEnd);
      const subtitle = `${events.length}件の予定`;

      return {
        type: 'flex',
        altText: title,
        contents: {
          type: 'bubble',
          size: 'mega',
          header: FlexBuilder.createModernHeader(title, '📅', subtitle),
          body: FlexBuilder.box('vertical', calendarBody, { spacing: 'sm', paddingAll: 'md' }),
          styles: { header: { backgroundColor: config.COLORS.primary }, body: { backgroundColor: config.COLORS.bodyBg } },
        },
      };
    } catch (err) {
      errorHandler.log('MonthlyCalendarFactory.create', err);
      return errorHandler.buildFallbackMessage('月間カレンダー');
    }
  },

  buildTitle(startDate, endDate) {
    const startMonth = startDate.getMonth() + 1;
    const endMonth = endDate.getMonth() + 1;
    const year = startDate.getFullYear();
    return startMonth === endMonth ? `${year}年${startMonth}月` : `${year}年${startMonth}月〜${endMonth}月`;
  },
};

const ColorLegendFactory = {
  create() {
    const contents = ColorLegendBuilder.build();
    return FlexBuilder.bubble('カラー凡例', contents, { headerIcon: '🎨', headerColor: config.COLORS.primaryLight });
  },
};

const IconLegendFactory = {
  create() {
    const contents = IconLegendBuilder.build();
    return FlexBuilder.bubble('絵文字凡例', contents, { headerIcon: '🏷️', headerColor: config.COLORS.primaryLight });
  },
};

const IconAddMessageFactory = {
  buildConfirmCard(parsed) {
    const rows = [
      FlexBuilder.box(
        'horizontal',
        [FlexBuilder.text(parsed.icon, { size: 'xxl', flex: 0 }), FlexBuilder.text(parsed.keyword, { size: 'lg', weight: 'bold', color: config.COLORS.textDark, wrap: true, margin: 'md' })],
        { alignItems: 'center' }
      ),
      FlexBuilder.infoBox('このキーワードを含む予定タイトルに、この絵文字を表示します', 'info'),
    ];

    return FlexBuilder.bubble('この内容で登録しますか？', rows, {
      headerIcon: '🏷️',
      headerColor: config.COLORS.primary,
      buttons: [FlexBuilder.postbackButton('登録する', 'act=confirm_icon', 'primary', config.COLORS.primary), FlexBuilder.postbackButton('キャンセル', 'act=cancel_icon', 'secondary')],
    });
  },

  buildSuccessCard(parsed) {
    const rows = [FlexBuilder.infoBox(`「${parsed.keyword}」→ ${parsed.icon} を登録しました`, 'success')];
    return FlexBuilder.bubble('登録しました', rows, { headerIcon: '✅', headerColor: config.COLORS.success });
  },
};

const RecurringEventMessageFactory = {
  buildConfirmCard(parsed, lineUserId) {
    const rows = [
      FlexBuilder.text(parsed.title, { size: 'lg', weight: 'bold', color: config.COLORS.textDark, wrap: true }),
      FlexBuilder.separator(),
      this.detailRow_('繰り返し', this.describeRule_(parsed)),
      this.detailRow_('時間', this.describeTime_(parsed)),
      this.detailRow_('終了条件', parsed.endLabel),
    ];
    this.pushAssigneeRow_(rows, lineUserId);

    return FlexBuilder.bubble('この内容で登録しますか？', rows, {
      headerIcon: '🔁',
      headerColor: config.COLORS.primary,
      buttons: [FlexBuilder.postbackButton('登録する', 'act=confirm_recurring', 'primary', config.COLORS.primary), FlexBuilder.postbackButton('キャンセル', 'act=cancel_recurring', 'secondary')],
    });
  },

  buildSuccessCard(parsed, lineUserId) {
    const rows = [
      FlexBuilder.infoBox(`「${parsed.title}」を登録しました`, 'success'),
      this.detailRow_('繰り返し', this.describeRule_(parsed)),
      this.detailRow_('時間', this.describeTime_(parsed)),
      this.detailRow_('終了条件', parsed.endLabel),
    ];
    this.pushAssigneeRow_(rows, lineUserId);

    return FlexBuilder.bubble('登録しました', rows, { headerIcon: '✅', headerColor: config.COLORS.success });
  },

  detailRow_(label, value) {
    return FlexBuilder.box(
      'horizontal',
      [FlexBuilder.text(label, { size: 'sm', color: config.COLORS.textMuted, flex: 2 }), FlexBuilder.text(value, { size: 'sm', color: config.COLORS.textDark, flex: 5, wrap: true })],
      { margin: 'sm' }
    );
  },

  pushAssigneeRow_(rows, lineUserId) {
    const creator = config.getCreatorByLineUserId(lineUserId);
    if (creator) rows.push(this.detailRow_('担当', creator.name));
  },

  describeRule_(parsed) {
    if (parsed.ruleType === 'daily') return '毎日';
    if (parsed.ruleType === 'weekly') return `${parsed.interval === 2 ? '隔週' : '毎週'} ${parsed.weekdayLabel}`;
    if (parsed.ruleType === 'monthly') return `毎月${parsed.dayOfMonth}日`;
    return '';
  },

  describeTime_(parsed) {
    if (!parsed.time) return '終日';
    const start = `${String(parsed.time.startHour).padStart(2, '0')}:${String(parsed.time.startMin).padStart(2, '0')}`;
    if (parsed.time.endHour === null || parsed.time.endHour === undefined) return `${start}〜（1時間）`;
    const end = `${String(parsed.time.endHour).padStart(2, '0')}:${String(parsed.time.endMin).padStart(2, '0')}`;
    return `${start}〜${end}`;
  },
};

const HelpMessageFactory = {
  create() {
    const contents = [
      FlexBuilder.sectionDivider('予定を見る', '📅'),
      this.commandRow_('今日 / 1週間 / 2週間', '期間の予定を一覧表示'),
      this.commandRow_('月間', 'カレンダー形式で月間の予定を表示'),
      this.commandRow_('凡例 / 色 / カラー', '色分けの意味を表示'),
      this.commandRow_('絵文字凡例', 'キーワード→絵文字の対応一覧を表示'),
      FlexBuilder.sectionDivider('絵文字を追加', '🏷️'),
      FlexBuilder.text('「絵文字追加 キーワード 絵文字」を送ると、内容を確認した上で登録します', { size: 'xs', color: config.COLORS.textMuted, wrap: true, margin: 'sm' }),
      this.exampleBox_('絵文字追加 サッカー ⚽'),
      FlexBuilder.sectionDivider('繰り返し予定を登録', '🔁'),
      FlexBuilder.text('「毎日」「毎週」「隔週」「毎月」で始まる1行を送ると、内容を確認した上でまとめて登録します', { size: 'xs', color: config.COLORS.textMuted, wrap: true, margin: 'sm' }),
      this.exampleBox_('毎日 8:00 薬を飲む 30日間'),
      this.exampleBox_('毎週 月,木 19:00-20:00 ゴミ出し 12/31まで'),
      this.exampleBox_('隔週 水曜 14:00 ピアノ 20回'),
      this.exampleBox_('毎月15日 10:00 家賃振込'),
      FlexBuilder.infoBox('終了条件（○回 / ○日間 / MM・DDまで）を省略すると無期限に繰り返します', 'info'),
    ];

    return FlexBuilder.bubble('使い方ガイド', contents, { headerIcon: '❓', headerColor: config.COLORS.primary });
  },

  commandRow_(command, description) {
    return FlexBuilder.box(
      'horizontal',
      [FlexBuilder.text(command, { size: 'sm', weight: 'bold', color: config.COLORS.textDark, flex: 4, wrap: true }), FlexBuilder.text(description, { size: 'xs', color: config.COLORS.textMuted, flex: 5, wrap: true })],
      { margin: 'sm', spacing: 'sm' }
    );
  },

  exampleBox_(text) {
    return FlexBuilder.box('vertical', [FlexBuilder.text(text, { size: 'xs', color: config.COLORS.textDark })], {
      backgroundColor: config.COLORS.bodyBg,
      cornerRadius: 'sm',
      paddingAll: 'sm',
      margin: 'xs',
    });
  },
};

module.exports = { ScheduleMessageFactory, MonthlyCalendarFactory, ColorLegendFactory, IconLegendFactory, IconAddMessageFactory, RecurringEventMessageFactory, HelpMessageFactory };
