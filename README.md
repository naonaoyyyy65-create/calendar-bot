# calendar-bot

Googleカレンダーと連携し、LINEのトーク上で予定確認・繰り返し予定の一括登録・変更通知ができるLINE Bot。Node.js（Express）製で、Raspberry Pi上でsystemdサービスとして常時稼働している本番システムです。

もとは Google Apps Script（GAS）版として作り始め、機能パリティを達成した段階でNode.js版に全面移行しました。

## 主な機能

- **予定確認**: 「今日」「1週間」「2週間」「月間」などのキーワードでLINEに予定一覧・月間カレンダー（4週間グリッド）を返信
- **繰り返し予定の一括登録**: 「毎週 月,木 19:00-20:00 ゴミ出し 12/31まで」のような自然文をパースし、確認カード→postbackで登録
- **変更通知**: 定期チェックでカレンダーの追加・変更・削除を検知し、LINEへプッシュ通知
- **絵文字凡例のカスタマイズ**: 予定タイトルに応じたアイコン表示のキーワード↔絵文字マッピングを、LINEから直接確認・追加できる
- **LINE無料メッセージ枠の週次レポート**: 使用量を集計し、監視用Botへ集約通知

## 技術スタック

- Node.js / Express
- Google Calendar API v3（`googleapis`）
- LINE Messaging API（`@line/bot-sdk`）
- `node:test`（標準テストランナー、外部依存なし）
- 実行環境: Linux（systemd常駐）、cron

## アーキテクチャ / 設計上の工夫

- **RRULE構築**: 「毎日/毎週/隔週/毎月」＋曜日・時刻・終了条件（回数/日付/無期限）を表す日本語の自然文パーサー（`recurringEventInput.js`）を実装し、Calendar API v3のRRULE文字列へ変換（`calendarService.buildRRule`）。
- **確認待ち状態の管理**: 繰り返し予定登録・絵文字追加はどちらも「パース→確認カード→postbackで確定/キャンセル」という同一フローのため、TTL付きメモリMapを`createPendingStore()`ファクトリーに共通化して2種類の確認待ち状態（`PendingRecurringEvent`/`PendingIconAdd`）を管理。
- **`@line/bot-sdk` v9の破壊的変更への対応**: `Client`コンストラクタ廃止・メソッドの引数形式変更に対し、呼び出し側（`webhookHandler.js`）を書き換えずに済むよう`lineService.js`に旧シグネチャ互換の薄いラッパーを実装。
- **SDKがモックできない問題の回避**: `@line/bot-sdk`はESM/CJSのデュアルパッケージ構成のため`node:test`の`mock.module()`で正しくモックできず、実際に本物のLINE APIへリクエストが飛んでしまう問題に遭遇。実際の送信関数を引数として受け取る`pushWith(pushMessageFn, ...)`の形にロジックを切り出し、SDK実体に一切触れずにテストできる設計に変更。
- **送信先の複数人・デバッグ切り替え**: 本番は複数の通知先ユーザーへ、`--debug`実行時は1人だけに絞り込む。ユーザー一覧を総当たりでbroadcastする方式は開発時の残留テストIDが混入しうるため採用せず、`.env`で明示的にユーザーIDを指定する方式にしている。
- **失敗時のLINE通知**: cronで動く定期実行スクリプト（月間カレンダー送信・今日の予定送信・変更検知）の失敗はログに残るだけでなく、別Bot経由でLINEにも通知されるようにし、気づけないまま止まり続けることを防止。

## フォルダ構成

```
.
├── package.json
├── .env.example          # 必要な環境変数の一覧
├── src/
│   ├── config.js              # 環境変数の読み込み・定数
│   ├── server.js              # Expressエントリポイント（LINE Webhook受信）
│   ├── dateUtils.js           # 日付操作
│   ├── calendarService.js     # Google Calendar API操作・RRULE構築
│   ├── eventHandlers.js       # イベントの色/アイコン判定・フィルタ・グルーピング
│   ├── recurringEventInput.js # 繰り返し予定の自然文パーサー
│   ├── iconInput.js           # 「絵文字追加 キーワード 絵文字」パーサー
│   ├── flexBuilders.js        # LINE Flex Message部品
│   ├── messageFactories.js    # 完成メッセージの組み立て
│   ├── errorHandler.js        # ログ記録・フォールバックメッセージ
│   ├── state.js               # 確認待ち状態管理（TTL付きメモリMap）
│   ├── lineService.js         # LINE APIクライアント・署名検証middleware
│   ├── webhookHandler.js      # イベントルーティング
│   ├── changeDetector.js      # カレンダー変更検知（純粋関数）
│   ├── store.js               # ローカルJSONへの永続化
│   ├── sendMonthlyCalendar.js # cron: 月間カレンダー送信
│   ├── sendTodaySchedule.js   # cron: 今日の予定送信
│   ├── checkCalendarUpdates.js# cron: 変更チェック・通知
│   ├── checkLineQuota.js      # cron: LINE無料枠の週次レポート送信
│   └── notifyFailure.js       # cronスクリプト失敗時のLINE通知ヘルパー
├── tests/                 # node:testによるユニットテスト
└── deploy/
    ├── calendar-bot.service   # systemdユニットファイル
    └── deploy_calendar.ps1    # デプロイスクリプト（PC→サーバー、scp+ssh）
```

## セットアップ

1. LINE Developersでチャネルを作成し、アクセストークン・チャネルシークレットを取得
2. GCPプロジェクトでサービスアカウントを作成し、Calendar APIを有効化。JSONキーを`credentials/service-account.json`に配置
3. 対象のGoogleカレンダーの共有設定で、サービスアカウントに「予定の変更権限」を付与
4. `.env.example`を`.env`にコピーし、各値を設定
5. `npm install`
6. `npm test` でユニットテストを実行
7. `node src/server.js` でローカル起動、または`deploy/`のsystemdユニットファイルを参考にサーバーへ配置

cronでの定期実行（月間カレンダー送信・今日の予定送信・変更チェック・LINE無料枠レポート）が必要な場合は、`deploy/deploy_calendar.ps1`のコメントを参照してください。

## テスト・静的解析

```
npm test              # ユニットテスト
npm run test:coverage # カバレッジ計測付き
npm run lint          # ESLint
```

`node:test`（Node.js標準のテストランナー、追加依存なし）を使用。LINE APIやGoogle Calendar APIなど外部サービスへの実際の呼び出しはテスト対象外とし、パーサー・変更検知・送信ロジックの分離部分（`pushWith`）などロジックが決定的な部分を中心にユニットテストしています。

- テスト: 46件 pass
- カバレッジ（行）: 全体75.95%（純粋関数中心の`changeDetector.js`/`iconInput.js`/`store.js`は100%、外部API呼び出しを含む層は意図的に対象範囲を絞っている）
- ESLint: 0 errors
