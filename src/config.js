require('dotenv').config();

const TZ = 'Asia/Tokyo';

// LINE風のクリーンなグリーン系パレット（2026-07-25、旧ブラウン・ベージュ系から刷新）
const COLORS = {
  primary: '#06C755',
  primaryLight: '#3DD879',
  primaryPale: '#E1F7E9',
  textDefault: '#1A1A1A',
  textDark: '#1A1A1A',
  textMuted: '#8E8E93',
  textFaint: '#C7C7CC',
  white: '#FFFFFF',
  bodyBg: '#F5F6F8',
  weekendBg: '#FDECEC',
  weekendBgAlt: '#FFF6F6',
  weekendText: '#E5484D',
  border: '#E5E7EB',
  divider: '#E5E7EB',
  headerSubtitle: '#D9F7E4',
  shared: '#3D7FE0',
  sharedBar: '#2F66B8',
  creator2: '#F5A623',
  creator2Light: '#FBCE7E',
  defaultBar: '#B0B4BA',
  danger: '#E5484D',
  dangerBg: '#FDECEC',
  info: '#3D7FE0',
  infoBg: '#EAF2FD',
  warning: '#F5A623',
  warningBg: '#FFF6E5',
  success: '#06C755',
  successBg: '#E1F7E9',
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function getCreatorList() {
  const creators = [];

  if (process.env.CREATOR1_EMAIL) {
    creators.push({
      email: process.env.CREATOR1_EMAIL,
      name: process.env.CREATOR1_NAME || 'Creator1',
      color: COLORS.primary,
      barColor: COLORS.primaryLight,
      lineUserId: process.env.CREATOR1_LINE_USER_ID || null,
      calendarColorId: process.env.CREATOR1_COLOR_ID || '9',
    });
  }

  if (process.env.CREATOR2_EMAIL) {
    creators.push({
      email: process.env.CREATOR2_EMAIL,
      name: process.env.CREATOR2_NAME || 'Creator2',
      color: COLORS.creator2,
      barColor: COLORS.creator2Light,
      lineUserId: process.env.CREATOR2_LINE_USER_ID || null,
      calendarColorId: process.env.CREATOR2_COLOR_ID || '11',
    });
  }

  return creators;
}

function getCreatorByLineUserId(lineUserId) {
  if (!lineUserId) return null;
  return getCreatorList().find((c) => c.lineUserId === lineUserId) || null;
}

function getCreatorStyles() {
  const styles = {};
  getCreatorList().forEach((creator) => {
    styles[creator.email] = { color: creator.color, barColor: creator.barColor, icon: '' };
  });
  styles.default = { color: COLORS.textDefault, barColor: COLORS.defaultBar, icon: '' };
  return styles;
}

function getEventColorMapping() {
  const mapping = {
    7: { label: '共通予定', color: COLORS.shared, barColor: COLORS.sharedBar, icon: '👥', description: '共通予定' },
  };

  getCreatorList().forEach((creator) => {
    if (!creator.calendarColorId) return;
    mapping[creator.calendarColorId] = {
      label: creator.name,
      color: creator.color,
      barColor: creator.barColor,
      icon: '👤',
      description: `${creator.name}の予定`,
    };
  });

  return mapping;
}

const ICON_KEYWORD_MAP = [
  { keywords: ['病院', '通院', '診察', '受診', 'クリニック', '医者'], icon: '🏥' },
  { keywords: ['歯'], icon: '🦷' },
  { keywords: ['出社'], icon: '🏢' },
  { keywords: ['出勤'], icon: '🏰' },
  { keywords: ['ご飯', 'ごはん', 'ランチ'], icon: '🍴' },
  { keywords: ['麺', '麻辣', '七宝', '楊国福'], icon: '🍜' },
  { keywords: ['喫茶店', 'スタバ', 'コメダ', 'ドトール'], icon: '☕' },
  { keywords: ['飲み会', '飲み', '居酒屋'], icon: '🍻' },
  { keywords: ['旅行', '出張', '大阪', '甲府', '韓国'], icon: '✈️' },
  { keywords: ['遅番', '夜勤'], icon: '🌙' },
  { keywords: ['休み', '休日', '有給'], icon: '🏖️' },
  { keywords: ['会議', 'ミーティング'], icon: '📅' },
  { keywords: ['タスク', '作業', 'ToDo'], icon: '📝' },
  { keywords: ['誕生日', '記念日', 'バースデー'], icon: '🎂' },
  { keywords: ['ジム', 'フィットネス'], icon: '🏋️' },
  { keywords: ['ピラティス'], icon: '🤸' },
  { keywords: ['サロン', '美容院'], icon: '💇‍♀️' },
  { keywords: ['ダラダラ'], icon: '😴' },
  { keywords: ['掃除', '片付け'], icon: '🧹' },
  { keywords: ['買い物', 'ショッピング'], icon: '🛍️' },
  { keywords: ['遊び', '遊ぶ', 'デート'], icon: '👟' },
];

module.exports = {
  TZ,
  COLORS,
  WEEKDAYS,
  ICON_KEYWORD_MAP,
  getCreatorList,
  getCreatorByLineUserId,
  getCreatorStyles,
  getEventColorMapping,
  EVENT_COLORS_ENABLED: true,
  MONTHLY_CALENDAR: { MAX_EVENTS_PER_DAY: 3, CELL_HEIGHT: '100px', NUM_WEEKS: 4 },
  SCHEDULE: { FUTURE_DAYS: 90 },
  // LAST_CHECK未保存時のデフォルト遡り幅（時間）。カレンダー更新チェックは2026-07-29〜cron固定時刻(8/12/20時)実行のため
  // 均等間隔ではなくなったが、最大ギャップ（20時→翌8時の12時間）をカバーできるようこの値のまま維持する
  CHECK_INTERVAL_HOURS: 12,
  LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET,
  // 本番プッシュ通知の送信先（利用者2人。単一LINE_USER_IDから変更）
  NOTIFY_USER_IDS: [process.env.CREATOR1_LINE_USER_ID, process.env.CREATOR2_LINE_USER_ID].filter(Boolean),
  // デバッグ実行（--debug）時の送信先1名。家計簿BotのREMINDER_USER_IDS（テスト用1名）と同一人物
  DEBUG_USER_ID: process.env.CREATOR1_LINE_USER_ID || null,
  GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
  GOOGLE_SERVICE_ACCOUNT_KEY_PATH: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  DATA_FILE_PATH: process.env.DATA_FILE_PATH || './data/store.json',
  PORT: process.env.PORT || 3001,
};
