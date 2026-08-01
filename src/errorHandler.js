/**
 * errorHandler.js
 * エラー処理（GAS版 ErrorHandler.gs の一部を移植。雛形段階ではログ記録とフォールバック生成のみ）
 */

const config = require('./config');
const { FlexBuilder } = require('./flexBuilders');

function log(context, err) {
  console.error(`[${context}]`, err && err.message, err && err.stack);
}

function buildFallbackMessage(title) {
  return FlexBuilder.bubble(title, [FlexBuilder.infoBox('一時的に情報を取得できませんでした。しばらくしてからもう一度お試しください。', 'warning')], {
    headerIcon: '⚠️',
    headerColor: config.COLORS.warning,
  });
}

module.exports = { log, buildFallbackMessage };
