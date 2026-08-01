/**
 * store.js
 * カレンダー更新チェックが使う永続データの保存（GAS版 PropertyStorage の一部を移植）
 * GAS版のPropertiesServiceに相当するものとして、ローカルJSONファイルで代替する
 * （メール転送Node.js雛形のstore.jsと同じ設計。キャッシュを持たず読み書きのたびにファイルを都度読み込む）。
 */
const fs = require('fs');
const path = require('path');

function createStore(filePath) {
  const resolvedPath = path.resolve(filePath);

  function load() {
    try {
      const raw = fs.readFileSync(resolvedPath, 'utf8');
      const data = JSON.parse(raw);
      return {
        lastCheck: data.lastCheck ?? null,
        snapshot: data.snapshot && typeof data.snapshot === 'object' ? data.snapshot : {},
        customIcons: Array.isArray(data.customIcons) ? data.customIcons : [],
      };
    } catch {
      return { lastCheck: null, snapshot: {}, customIcons: [] };
    }
  }

  function save(data) {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    fs.writeFileSync(resolvedPath, JSON.stringify(data, null, 2), 'utf8');
  }

  return {
    /**
     * @param {number} defaultHoursAgo 未保存時のデフォルト遡り時間（GAS版と同じ挙動）
     */
    getLastCheck(defaultHoursAgo) {
      const { lastCheck } = load();
      if (lastCheck) return new Date(lastCheck);
      return new Date(Date.now() - defaultHoursAgo * 60 * 60 * 1000);
    },
    setLastCheck(date) {
      const data = load();
      data.lastCheck = date.toISOString();
      save(data);
    },
    getSnapshot() {
      return load().snapshot;
    },
    setSnapshot(snapshot) {
      const data = load();
      data.snapshot = snapshot;
      save(data);
    },
    getCustomIcons() {
      return load().customIcons;
    },
    /**
     * LINEの「絵文字追加」コマンドで登録したキーワード→絵文字を追加保存する
     * @param {string} keyword
     * @param {string} icon
     */
    addCustomIcon(keyword, icon) {
      const data = load();
      data.customIcons = [...data.customIcons, { keyword, icon }];
      save(data);
    },
  };
}

const config = require('./config');

module.exports = createStore(config.DATA_FILE_PATH);
module.exports.createStore = createStore;
