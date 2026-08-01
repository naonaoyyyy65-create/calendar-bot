/**
 * notifyFailure.js
 * cronスクリプト失敗時に監視通知Bot経由でLINE通知する共通ヘルパー
 * （GAS版`ErrorHandler.notify`/`runOrNotify`の移植。GAS版は全トリガー関数をラップし
 * 失敗時にLINE通知していたが、Node.js版移行時にこの部分が漏れていたため2026-07-29追加）。
 */
const NOTIFY_URL = process.env.NOTIFY_BOT_URL || 'http://127.0.0.1:3004';

async function notifyFailure(context, err) {
  try {
    const res = await fetch(`${NOTIFY_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg: `⚠️ カレンダーBot: ${context}でエラーが発生しました\n${err.message}` }),
    });
    if (!res.ok) console.error(`notify-bot returned ${res.status}`);
  } catch (notifyErr) {
    console.error('notify-botへの通知に失敗:', notifyErr.message);
  }
}

module.exports = { notifyFailure };
