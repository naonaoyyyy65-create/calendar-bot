/**
 * eventHandlers.js
 * イベント処理（GAS版 EventHandlers.gs の移植）
 *
 * GAS版はCalendarEventオブジェクトのメソッド（getTitle()等）を直接扱っていたが、
 * Node.js版はcalendarService.normalizeEvent()で正規化したプレーンオブジェクト
 * （{id, title, start, end, isAllDay, colorId, creatorEmail, created, ...}）を扱う。
 */

const config = require('./config');
const dateUtils = require('./dateUtils');
const store = require('./store');

const EventColorManager = {
  getColorStyle(colorId) {
    if (!colorId || !config.EVENT_COLORS_ENABLED) return null;
    return config.getEventColorMapping()[colorId] || null;
  },
  getStyleFromEvent(event) {
    return this.getColorStyle(event.colorId);
  },
};

const EventStyler = {
  getStyle(event) {
    if (config.EVENT_COLORS_ENABLED) {
      const colorStyle = EventColorManager.getStyleFromEvent(event);
      if (colorStyle) return colorStyle;
    }
    const styles = config.getCreatorStyles();
    return styles[event.creatorEmail] || styles.default;
  },

  getIcon(event) {
    if (config.EVENT_COLORS_ENABLED) {
      const colorStyle = EventColorManager.getStyleFromEvent(event);
      if (colorStyle && colorStyle.icon) return colorStyle.icon;
    }

    const title = event.title;
    for (const { keyword, icon } of store.getCustomIcons()) {
      if (title.includes(keyword)) return icon;
    }
    for (const { keywords, icon } of config.ICON_KEYWORD_MAP) {
      if (keywords.some((keyword) => title.includes(keyword))) return icon;
    }
    return '';
  },

  getLabel(event) {
    if (config.EVENT_COLORS_ENABLED) {
      const colorStyle = EventColorManager.getStyleFromEvent(event);
      if (colorStyle && colorStyle.label) return colorStyle.label;
    }
    return null;
  },
};

const EventFormatter = {
  formatTime(event) {
    if (event.isAllDay) return '終日';
    const start = dateUtils.format(event.start, 'HH:mm');
    const end = dateUtils.format(event.end, 'HH:mm');
    return `${start}〜${end}`;
  },

  formatDetails(event) {
    const details = [];
    if (event.location) details.push(`📍 ${event.location}`);
    if (event.description) {
      const truncated = event.description.length > 100 ? `${event.description.substring(0, 100)}...` : event.description;
      details.push(`📝 ${truncated}`);
    }
    return details.join('\n');
  },

  /**
   * 削除済みイベント（スナップショットのプレーンデータのみ）の時間帯を文字列化
   * （GAS版 EventFormatter.formatTimeFromData の移植。ChangeNotificationBuilderの削除セクションで使用）
   */
  formatTimeFromData(data) {
    if (data.isAllDay) return '終日';
    const start = dateUtils.format(new Date(data.start), 'HH:mm');
    const end = dateUtils.format(new Date(data.end), 'HH:mm');
    return `${start}〜${end}`;
  },
};

const EventFilter = {
  filter(events) {
    // GAS版のEXCLUDE_KEYWORDS/ALL_DAY_ONLYはデフォルト未使用のため、雛形では素通しのみ実装
    return events;
  },
};

const EventGrouper = {
  groupByDate(events) {
    const grouped = {};
    events.forEach((event) => {
      const key = dateUtils.toDateKey(event.start);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(event);
    });
    return grouped;
  },

  sortGroups(grouped) {
    return Object.keys(grouped)
      .map((dateKey) => ({ dateKey, dateObj: grouped[dateKey][0].start, events: grouped[dateKey] }))
      .sort((a, b) => a.dateObj - b.dateObj);
  },

  groupByCreator(events) {
    const grouped = {};
    events.forEach((event) => {
      const creator = event.creatorEmail || 'unknown';
      if (!grouped[creator]) grouped[creator] = [];
      grouped[creator].push(event);
    });
    return grouped;
  },

  groupByIcon(events) {
    const grouped = {};
    events.forEach((event) => {
      const icon = EventStyler.getIcon(event) || 'その他';
      if (!grouped[icon]) grouped[icon] = [];
      grouped[icon].push(event);
    });
    return grouped;
  },

  groupByColor(events) {
    const grouped = {};
    events.forEach((event) => {
      const label = EventStyler.getLabel(event) || '未分類';
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(event);
    });
    return grouped;
  },
};

module.exports = { EventColorManager, EventStyler, EventFormatter, EventFilter, EventGrouper };
