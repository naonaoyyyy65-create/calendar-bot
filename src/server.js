/**
 * server.js
 * Expressサーバーのエントリポイント（GAS版 doPost 相当）
 */

const express = require('express');
const config = require('./config');
const { middleware: lineMiddleware } = require('./lineService');
const { handleEvents } = require('./webhookHandler');

const app = express();

app.get('/health', (_req, res) => res.status(200).send('ok'));

// 注意: line.middleware は署名検証のため生のリクエストボディを必要とする。
// このルートより前にexpress.json()等のbody parserを挟まないこと。
// パスは/webhook（家計簿Botと同じ構成）。当初は同一Funnelホスト上でのパス分割
// （/calendar-webhook）を試みたが、Tailscale Funnelの公開レイヤーではパス多重化が
// うまく機能しなかった（後述「ハマったポイント」参照）ため、独立ポート(10000)方式に変更した。
app.post('/webhook', lineMiddleware, (req, res) => {
  res.status(200).send('OK');
  const events = req.body.events || [];
  console.log(`webhook received: ${events.length}件のイベント`);
  handleEvents(events).catch((err) => {
    console.error('webhook handling failed:', err);
  });
});

app.listen(config.PORT, () => {
  console.log(`calendar-bot listening on port ${config.PORT}`);
});
