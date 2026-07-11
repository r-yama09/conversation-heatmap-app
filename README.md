# ChatGPT Conversation Heatmap

ChatGPTのエクスポートデータを、端末内のブラウザで分析するローカルファーストなWebアプリです。基本統計、会話タイトル一覧、曜日×時間帯ヒートマップを表示します。

現在はMVP開発中です。将来的にはChatGPT WrappedやSecond Brain型の分析基盤へ発展させることを目指しています。

## 主な機能

- `conversations.json`の手動アップロード
- ChatGPTエクスポートの`mapping`構造解析
- `current_node`から現在の会話経路を復元
- user／assistantの基本統計
- 会話タイトル一覧
- 非同期の分割解析
- 解析進捗表示
- 解析停止
- 途中結果の表示・破棄
- 曜日×時間帯ヒートマップ（Asia/Tokyo）
- システム／ライト／ダークテーマ
- レスポンシブ対応
- 架空サンプルデータ

## セキュリティ・プライバシー

- 解析はブラウザ内で行います。
- 会話ログを外部APIやクラウドへ送信しません。
- OpenAI APIは使用していません。
- クラウドDBは使用していません。
- 本物の`conversations.json`やエクスポートZIPをGitへ追加しないでください。
- `.env`、認証情報、個人情報をコミットしないでください。
- 公開前の確認には、架空サンプルデータか十分に匿名化したデータを使用してください。

## 対応データ形式

- ChatGPTエクスポートに含まれる`conversations.json`
- `mapping`構造を持つ会話データ
- 現在はJSONの手動アップロードのみ対応しています。
- ZIPの直接読込は未対応です。
- 本物ログを使った大規模な動作確認はまだ実施していません。

## セットアップ

必要環境はNode.jsとnpmです。Windows 11、PowerShellでの例です。

```powershell
git clone <repository-url>
cd conversation-heatmap-app
npm install
npm run dev
```

ブラウザで`http://localhost:3000`を開いてください。

## 品質確認

```powershell
npm test
npm run lint
npm run build
```

## サンプルデータ

`public/sample-conversations.json`には、動作確認用の完全架空サンプルを収録しています。実在人物、実会話、本物のログは含みません。

サンプルの期待統計は次のとおりです。

- 会話: 4
- 総メッセージ: 11
- user: 6
- assistant: 5

## 現在の制限

- ZIPの直接読込は未対応です。
- IndexedDB保存は未対応です。
- Web Workerは使用していません。
- 単一会話が極端に大きい場合、処理中の停止反映が遅れる可能性があります。
- 本物ログを使った大規模な動作確認は未実施です。
- 頻出ワード、月別推移、話題分類は未実装です。

## 技術構成

- Next.js 16.2.10
- React
- TypeScript
- Tailwind CSS
- Vitest

## 依存関係に関する注意

現在、Next.jsが内部で利用するPostCSSについてmoderate advisoryが検出されています。このアプリはユーザー入力CSSを処理しないため、直接的な露出は限定的と考えられますが、依存関係のリスクとして管理しています。互換性を保てる安定版の更新方法が確認できた時点で対応します。

`npm audit fix --force`は互換性を壊す可能性があるため使用していません。

## ライセンス

MIT Licenseです。詳細は`LICENSE`を参照してください。

## 開発状況

- 現在はMVP開発中です。
- GitHub公開用v0.1の準備段階です。
- APIやクラウドサービスを使わないローカルファースト版を優先しています。
