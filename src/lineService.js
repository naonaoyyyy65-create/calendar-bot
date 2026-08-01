/**
 * lineService.js
 * LINE API通信（GAS版 Services.gs の LineMessageService 相当。@line/bot-sdkを使用）
 *
 * GAS版はWebhook署名検証を行っていなかったが、家計簿bot同様@line/bot-sdkのmiddlewareで標準対応する。
 */

const { LineBotClient, middleware } = require('@line/bot-sdk');
const config = require('./config');

const lineConfig = {
  channelAccessToken: config.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: config.LINE_CHANNEL_SECRET,
};

const rawClient = LineBotClient.fromChannelAccessToken({ channelAccessToken: config.LINE_CHANNEL_ACCESS_TOKEN });

// @line/bot-sdk v9以降、replyMessage/pushMessage/broadcastは位置引数から
// {replyToken, messages}等のオブジェクト引数に変更された。webhookHandler.js側の
// 呼び出し（旧位置引数シグネチャ）を書き換えずに済むよう、旧シグネチャのまま使える
// 薄いラッパーとしてclientを再定義する（v11アップグレードの動機・詳細はCLAUDE.md参照）。
const client = {
  replyMessage: (replyToken, messages) =>
    rawClient.replyMessage({ replyToken, messages: Array.isArray(messages) ? messages : [messages] }),
  pushMessage: (to, messages) =>
    rawClient.pushMessage({ to, messages: Array.isArray(messages) ? messages : [messages] }),
};

/**
 * push()の中核ロジック。実際に使うLINE送信関数（`pushMessageFn`）を外から渡す形にすることで、
 * `@line/bot-sdk`実物に依存せずユニットテスト可能にしている。
 *
 * `@line/bot-sdk`はpackage.jsonの`exports`条件で`require`と`import`が別ファイル
 * （`dist/cjs/index.js` / `dist/index.js`）を指すデュアルパッケージのため、
 * node:testの`mock.module()`によるモック差し替えが効かない（ESM解決経路とCJS解決経路が
 * 一致せずモックが素通りし、実際にLINE APIへ本物のリクエストが飛んで401になることを
 * 2026-07-29に実際に確認した）。この関数分離はその回避策。
 *
 * 本番は`notifyUserIds`（利用者2人）へ、`debug=true`時は`debugUserId`（1人）のみへ送る
 * （2026-07-29、「本番は2人・デバッグ時は1人」に変更）。
 * 本番送信は1人ずつ結果を見て失敗をログするのみで、他の宛先への送信や呼び出し元への
 * 復帰は妨げない（家計簿Botの`monthlyReminder`と同じ方針。当初`Promise.all`で実装していたが、
 * それだと1人への送信失敗だけで両者への送信結果自体が例外になってしまうため2026-07-29に修正）。
 */
async function pushWith(pushMessageFn, notifyUserIds, debugUserId, message, debug) {
  if (debug) {
    if (!debugUserId) throw new Error('DEBUG_USER_ID (CREATOR1_LINE_USER_ID) is not configured');
    return pushMessageFn(debugUserId, message);
  }

  const results = await Promise.allSettled(notifyUserIds.map((userId) => pushMessageFn(userId, message)));
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`push to ${notifyUserIds[i]} failed:`, result.reason && result.reason.message);
    }
  });
}

/**
 * プッシュメッセージを送信（GAS版 LineMessageService.push 相当。cronスクリプトから使用）。
 * 実際の送信先・SDK呼び出しを`pushWith`に委譲する薄いラッパー。
 */
function push(message, debug = false) {
  return pushWith(client.pushMessage, config.NOTIFY_USER_IDS, config.DEBUG_USER_ID, message, debug);
}

module.exports = { client, middleware: middleware(lineConfig), push, pushWith };
