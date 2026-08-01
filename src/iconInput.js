/**
 * iconInput.js
 * 「絵文字追加 キーワード 絵文字」形式の入力パーサー
 *
 * 入力例: "絵文字追加 サッカー ⚽"
 */

const PREFIX = '絵文字追加';

const IconAddParser = {
  isIconAddInput(text) {
    return text.trim().startsWith(PREFIX);
  },

  /**
   * @returns {{keyword: string, icon: string} | null} 形式が不正な場合はnull
   */
  parse(text) {
    const tokens = text.trim().split(/[\s　]+/);
    if (tokens.length !== 3 || tokens[0] !== PREFIX) return null;

    const [, keyword, icon] = tokens;
    if (!keyword || !icon) return null;

    return { keyword, icon };
  },
};

module.exports = { IconAddParser };
