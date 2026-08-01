/**
 * flexBuilders.js
 * Flexメッセージビルダー（GAS版 FlexBuilders.gs の移植）
 *
 * 雛形では FlexBuilder（基本部品）・CalendarFlexBuilder（月間/2週間グリッド）・
 * ColorLegendBuilder（凡例）を移植する。統計機能（StatisticsFlexBuilder）はユーザー判断により2026-07-25に廃止済み。
 * ChangeNotificationBuilder（変更通知）はcron/変更検知と合わせて次回対応。
 */

const config = require('./config');
const dateUtils = require('./dateUtils');
const { EventStyler, EventFormatter } = require('./eventHandlers');
const store = require('./store');

const FlexBuilder = {
  text(text, options = {}) {
    return { type: 'text', text, ...options };
  },

  box(layout, contents, options = {}) {
    return { type: 'box', layout, contents, ...options };
  },

  separator() {
    return { type: 'separator', margin: 'md', color: config.COLORS.border };
  },

  filler() {
    return { type: 'filler' };
  },

  bubble(title, bodyContents, options = {}) {
    const contents = {
      type: 'bubble',
      size: 'mega',
      header: this.createModernHeader(title, options.headerIcon, options.subtitle),
      body: this.box('vertical', bodyContents, { spacing: 'md', paddingAll: '20px' }),
      styles: {
        header: { backgroundColor: options.headerColor || config.COLORS.primary },
        body: { backgroundColor: config.COLORS.bodyBg },
      },
    };

    if (options.buttons && options.buttons.length > 0) {
      contents.footer = this.box('vertical', options.buttons, { spacing: 'sm', paddingAll: '20px' });
    }

    return { type: 'flex', altText: title, contents };
  },

  postbackButton(label, data, style = 'secondary', color = null) {
    const btn = { type: 'button', style, action: { type: 'postback', label, data } };
    if (color) btn.color = color;
    return btn;
  },

  createModernHeader(title, icon = '📅', subtitle = null) {
    const contents = [
      this.box('horizontal', [this.text(`${icon} ${title}`, { color: config.COLORS.white, weight: 'bold', size: 'xl', flex: 0 })]),
    ];
    if (subtitle) {
      contents.push(this.text(subtitle, { color: config.COLORS.headerSubtitle, size: 'xs', margin: 'sm' }));
    }
    return this.box('vertical', contents, { paddingAll: '20px', paddingBottom: '16px' });
  },

  dateHeader(dateObj) {
    const dateStr = dateUtils.format(dateObj, 'MM/dd');
    const dayStr = config.WEEKDAYS[dateObj.getDay()];
    const relativeText = dateUtils.getRelativeDateText(dateObj);
    const isWeekend = dateUtils.isWeekend(dateObj);
    const isToday = dateUtils.isSameDay(dateObj, new Date());

    let backgroundColor = config.COLORS.white;
    let textColor = config.COLORS.textDark;
    let badgeColor = config.COLORS.border;

    if (isToday) {
      backgroundColor = config.COLORS.primary;
      textColor = config.COLORS.white;
      badgeColor = config.COLORS.primaryLight;
    } else if (isWeekend) {
      backgroundColor = config.COLORS.weekendBg;
      textColor = config.COLORS.weekendText;
    }

    const headerContents = [this.text(`${dateStr} ${dayStr}`, { size: 'md', weight: 'bold', color: textColor, flex: 0 })];

    if (relativeText) {
      headerContents.push(
        this.box('vertical', [this.text(relativeText, { size: 'xs', color: textColor, align: 'center' })], {
          backgroundColor: badgeColor,
          cornerRadius: 'md',
          paddingAll: 'xs',
          paddingStart: 'sm',
          paddingEnd: 'sm',
          flex: 0,
        })
      );
    }

    return this.box('horizontal', headerContents, {
      spacing: 'md',
      backgroundColor,
      cornerRadius: 'md',
      paddingAll: 'md',
      margin: 'lg',
      alignItems: 'center',
    });
  },

  /**
   * イベント1件を1行で表示するコンパクト版（2026-07-25、情報量削減のため2行構成から変更）
   */
  eventRow(event) {
    const style = EventStyler.getStyle(event);
    const timeText = EventFormatter.formatTime(event);
    const icon = EventStyler.getIcon(event);
    const label = EventStyler.getLabel(event);

    const rowContents = [
      icon ? this.text(icon, { size: 'xs', flex: 0 }) : null,
      this.text(timeText, { size: 'xxs', color: config.COLORS.textMuted, flex: 0 }),
      this.text(event.title, { size: 'sm', color: style.color, weight: 'bold', wrap: true, flex: 1 }),
    ].filter(Boolean);

    if (label) {
      rowContents.push(
        this.box('vertical', [this.text(label, { size: 'xxs', color: config.COLORS.white, align: 'center' })], {
          backgroundColor: style.barColor,
          cornerRadius: 'sm',
          paddingAll: 'xs',
          paddingStart: 'sm',
          paddingEnd: 'sm',
          flex: 0,
        })
      );
    }

    return this.box(
      'horizontal',
      [
        this.box('vertical', [], { width: '3px', backgroundColor: style.barColor, cornerRadius: 'sm' }),
        this.box('horizontal', rowContents, { spacing: 'xs', alignItems: 'center', paddingStart: 'sm', flex: 1 }),
      ],
      { spacing: 'sm', backgroundColor: config.COLORS.white, cornerRadius: 'sm', paddingAll: 'sm', margin: 'xs', alignItems: 'center' }
    );
  },

  sectionDivider(text, icon = null) {
    const contents = [];
    if (icon) contents.push(this.text(icon, { size: 'sm', flex: 0 }));
    contents.push(this.text(text, { size: 'sm', color: config.COLORS.primary, weight: 'bold', flex: 0 }));
    contents.push(this.filler());
    contents.push(this.box('vertical', [], { height: '2px', backgroundColor: config.COLORS.divider, flex: 1 }));
    return this.box('horizontal', contents, { spacing: 'sm', margin: 'xl', alignItems: 'center' });
  },

  infoBox(text, type = 'info') {
    const styles = {
      info: { bg: config.COLORS.infoBg, color: config.COLORS.info, icon: 'ℹ️' },
      warning: { bg: config.COLORS.warningBg, color: config.COLORS.warning, icon: '⚠️' },
      success: { bg: config.COLORS.successBg, color: config.COLORS.success, icon: '✓' },
    };
    const style = styles[type] || styles.info;

    return this.box(
      'horizontal',
      [this.text(style.icon, { size: 'md', flex: 0 }), this.text(text, { size: 'xs', color: style.color, wrap: true, flex: 1 })],
      { spacing: 'sm', backgroundColor: style.bg, cornerRadius: 'md', paddingAll: 'md', margin: 'md' }
    );
  },
};

const CalendarFlexBuilder = {
  weekdayHeader() {
    return FlexBuilder.box(
      'horizontal',
      config.WEEKDAYS.map((day, index) => {
        const isWeekend = index === 0 || index === 6;
        return FlexBuilder.text(day, { size: 'xs', color: isWeekend ? config.COLORS.weekendText : config.COLORS.primary, align: 'center', flex: 1 });
      }),
      { spacing: 'xs', margin: 'md' }
    );
  },

  dayCell(day, events, isCurrentMonth, isToday, isWeekend, maxEvents = config.MONTHLY_CALENDAR.MAX_EVENTS_PER_DAY, cellHeight = config.MONTHLY_CALENDAR.CELL_HEIGHT) {
    let backgroundColor = config.COLORS.white;
    let textColor = config.COLORS.textDark;
    let badgeColor = config.COLORS.primaryLight;

    if (isToday) {
      backgroundColor = config.COLORS.primary;
      textColor = config.COLORS.white;
      badgeColor = config.COLORS.weekendBg;
    } else if (isWeekend && isCurrentMonth) {
      backgroundColor = config.COLORS.weekendBgAlt;
      textColor = config.COLORS.weekendText;
    } else if (!isCurrentMonth) {
      textColor = config.COLORS.textFaint;
    }

    const isTwoWeeksView = parseInt(cellHeight, 10) > 60;

    const cellContents = [
      FlexBuilder.box('horizontal', [FlexBuilder.text(String(day), { size: isTwoWeeksView ? 'md' : 'sm', color: textColor, weight: isToday ? 'bold' : 'regular', align: 'center' })], {
        justifyContent: 'center',
      }),
    ];

    if (events.length > 0 && isCurrentMonth) {
      cellContents.push(
        FlexBuilder.box(
          'horizontal',
          [
            FlexBuilder.box('vertical', [FlexBuilder.text(String(events.length), { size: 'xxs', color: isToday ? config.COLORS.primary : config.COLORS.white, align: 'center', weight: 'bold' })], {
              backgroundColor: badgeColor,
              cornerRadius: 'xl',
              paddingAll: 'xs',
              width: '18px',
              height: '18px',
              justifyContent: 'center',
              alignItems: 'center',
            }),
          ],
          { justifyContent: 'center', margin: 'xs' }
        )
      );

      const icons = events.slice(0, maxEvents).map((event) => EventStyler.getIcon(event)).filter(Boolean);

      if (icons.length > 0) {
        if (isTwoWeeksView) {
          cellContents.push(FlexBuilder.text(icons.join(' '), { size: 'sm', align: 'center', wrap: true, flex: 0 }));
        } else {
          const iconBoxes = icons.map((icon) => FlexBuilder.text(icon, { size: 'xs', align: 'center', flex: 0 }));
          cellContents.push(FlexBuilder.box('horizontal', iconBoxes, { spacing: 'xs', justifyContent: 'center', wrap: true, flex: 0 }));
        }
      }
    }

    return FlexBuilder.box('vertical', cellContents, {
      spacing: 'xs',
      backgroundColor,
      cornerRadius: 'sm',
      paddingAll: isTwoWeeksView ? 'md' : 'sm',
      height: cellHeight,
      flex: 1,
      justifyContent: 'flex-start',
      alignItems: 'center',
    });
  },

  weekRow(startDate, groupedEvents, today, maxEvents = config.MONTHLY_CALENDAR.MAX_EVENTS_PER_DAY, cellHeight = config.MONTHLY_CALENDAR.CELL_HEIGHT) {
    const cells = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < 7; i += 1) {
      const dateKey = dateUtils.toDateKey(currentDate);
      const dayEvents = groupedEvents[dateKey] || [];
      const isToday = dateUtils.isSameDay(currentDate, today);
      const isWeekend = dateUtils.isWeekend(currentDate);

      cells.push(this.dayCell(currentDate.getDate(), dayEvents, true, isToday, isWeekend, maxEvents, cellHeight));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return FlexBuilder.box('horizontal', cells, { spacing: 'xs', margin: 'xs' });
  },

  grid(startDate, numWeeks, groupedEvents, today, maxEvents = config.MONTHLY_CALENDAR.MAX_EVENTS_PER_DAY, cellHeight = config.MONTHLY_CALENDAR.CELL_HEIGHT) {
    const contents = [this.weekdayHeader()];
    let currentDate = new Date(startDate);
    for (let week = 0; week < numWeeks; week += 1) {
      contents.push(this.weekRow(currentDate, groupedEvents, today, maxEvents, cellHeight));
      currentDate.setDate(currentDate.getDate() + 7);
    }
    return contents;
  },
};

const ColorLegendBuilder = {
  build({ includeCategory = true } = {}) {
    const contents = [];
    const mapping = config.getEventColorMapping();

    if (includeCategory && config.EVENT_COLORS_ENABLED && Object.keys(mapping).length > 0) {
      contents.push(FlexBuilder.sectionDivider('カテゴリ', '🏷️'));
      Object.values(mapping).forEach((entry) => {
        contents.push(
          FlexBuilder.box(
            'horizontal',
            [
              FlexBuilder.box('vertical', [], { width: '4px', backgroundColor: entry.barColor, cornerRadius: 'sm' }),
              FlexBuilder.text(entry.icon, { size: 'md', flex: 0 }),
              FlexBuilder.box('vertical', [FlexBuilder.text(entry.description, { size: 'sm', color: config.COLORS.textDark, weight: 'bold' })], { flex: 1 }),
            ],
            { spacing: 'sm', backgroundColor: config.COLORS.white, cornerRadius: 'md', paddingAll: 'md', margin: 'sm', alignItems: 'center' }
          )
        );
      });
    }

    const creatorList = config.getCreatorList();
    if (creatorList.length > 0) {
      contents.push(FlexBuilder.sectionDivider('作成者', '👤'));
      creatorList.forEach((creator) => {
        contents.push(
          FlexBuilder.box(
            'horizontal',
            [
              FlexBuilder.box('vertical', [], { width: '4px', backgroundColor: creator.barColor, cornerRadius: 'sm' }),
              FlexBuilder.box('vertical', [FlexBuilder.text(creator.name, { size: 'sm', color: creator.color, weight: 'bold' })], { flex: 1 }),
            ],
            { spacing: 'sm', backgroundColor: config.COLORS.white, cornerRadius: 'md', paddingAll: 'md', margin: 'sm', alignItems: 'center' }
          )
        );
      });
    }

    return contents;
  },
};

const IconLegendBuilder = {
  entryRow_(keywordText, icon) {
    return FlexBuilder.box(
      'horizontal',
      [
        FlexBuilder.text(icon, { size: 'md', flex: 0 }),
        FlexBuilder.box('vertical', [FlexBuilder.text(keywordText, { size: 'sm', color: config.COLORS.textDark, wrap: true })], { flex: 1 }),
      ],
      { spacing: 'sm', backgroundColor: config.COLORS.white, cornerRadius: 'md', paddingAll: 'md', margin: 'sm', alignItems: 'center' }
    );
  },

  /**
   * 標準（config.ICON_KEYWORD_MAP）とカスタム追加分（store.getCustomIcons）を
   * 同じ絵文字ごとにまとめる（例: 標準「ピラティス→🤸」＋追加「パーソナル→🤸」を
   * 「ピラティス / パーソナル → 🤸」の1行に統合して表示する）
   */
  groupByIcon_() {
    const grouped = new Map();
    const builtinIcons = new Set();

    config.ICON_KEYWORD_MAP.forEach(({ keywords, icon }) => {
      if (!grouped.has(icon)) grouped.set(icon, []);
      const list = grouped.get(icon);
      keywords.forEach((keyword) => {
        if (!list.includes(keyword)) list.push(keyword);
      });
      builtinIcons.add(icon);
    });

    store.getCustomIcons().forEach(({ keyword, icon }) => {
      if (!grouped.has(icon)) grouped.set(icon, []);
      const list = grouped.get(icon);
      if (!list.includes(keyword)) list.push(keyword);
    });

    return { grouped, builtinIcons };
  },

  build() {
    const { grouped, builtinIcons } = this.groupByIcon_();

    const contents = [FlexBuilder.sectionDivider('標準', '🏷️')];
    for (const [icon, keywords] of grouped) {
      if (builtinIcons.has(icon)) contents.push(this.entryRow_(keywords.join(' / '), icon));
    }

    const customOnly = [...grouped].filter(([icon]) => !builtinIcons.has(icon));
    if (customOnly.length > 0) {
      contents.push(FlexBuilder.sectionDivider('追加分', '➕'));
      customOnly.forEach(([icon, keywords]) => contents.push(this.entryRow_(keywords.join(' / '), icon)));
    }

    return contents;
  },
};

const ChangeNotificationBuilder = {
  buildAddedSection(events) {
    if (events.length === 0) return [];
    const contents = [FlexBuilder.sectionDivider('新規追加', '✨')];
    events.slice(0, 5).forEach((event) => {
      contents.push(FlexBuilder.dateHeader(event.start));
      contents.push(FlexBuilder.eventRow(event));
    });
    if (events.length > 5) {
      contents.push(FlexBuilder.infoBox(`他 ${events.length - 5}件の予定が追加されました`, 'info'));
    }
    return contents;
  },

  buildModifiedSection(modifications) {
    if (modifications.length === 0) return [];
    const contents = [FlexBuilder.sectionDivider('変更', '📝')];
    modifications.slice(0, 3).forEach(({ event }) => {
      contents.push(FlexBuilder.dateHeader(event.start));
      contents.push(FlexBuilder.eventRow(event));
    });
    if (modifications.length > 3) {
      contents.push(FlexBuilder.infoBox(`他 ${modifications.length - 3}件の予定が変更されました`, 'warning'));
    }
    return contents;
  },

  buildDeletedSection(deletions) {
    if (deletions.length === 0) return [];
    const contents = [FlexBuilder.sectionDivider('削除', '🗑️')];
    deletions.slice(0, 3).forEach(({ data }) => {
      const deletedDate = new Date(data.start);
      const dateStr = dateUtils.format(deletedDate, 'MM/dd');
      const dayStr = config.WEEKDAYS[deletedDate.getDay()];
      const timeText = EventFormatter.formatTimeFromData(data);

      contents.push(
        FlexBuilder.box(
          'horizontal',
          [
            FlexBuilder.box('vertical', [], { width: '4px', backgroundColor: config.COLORS.danger, cornerRadius: 'sm' }),
            FlexBuilder.box(
              'vertical',
              [
                FlexBuilder.text(`${dateStr}(${dayStr}) ${timeText}`, { size: 'xs', color: config.COLORS.textMuted }),
                FlexBuilder.text(data.title, { size: 'sm', color: config.COLORS.danger, wrap: true, decoration: 'line-through' }),
              ],
              { spacing: 'xs', paddingStart: 'md', flex: 1 }
            ),
          ],
          { spacing: 'sm', backgroundColor: config.COLORS.dangerBg, cornerRadius: 'md', paddingAll: 'md', margin: 'sm' }
        )
      );
    });
    if (deletions.length > 3) {
      contents.push(FlexBuilder.infoBox(`他 ${deletions.length - 3}件の予定が削除されました`, 'warning'));
    }
    return contents;
  },

  build(changes) {
    const totalChanges = changes.added.length + changes.modified.length + changes.deleted.length;
    const contents = [
      ...this.buildAddedSection(changes.added),
      ...this.buildModifiedSection(changes.modified),
      ...this.buildDeletedSection(changes.deleted),
    ];
    return FlexBuilder.bubble('カレンダー更新', contents, { headerIcon: '🔔', headerColor: config.COLORS.primary, subtitle: `${totalChanges}件の変更` });
  },
};

module.exports = { FlexBuilder, CalendarFlexBuilder, ColorLegendBuilder, IconLegendBuilder, ChangeNotificationBuilder };
