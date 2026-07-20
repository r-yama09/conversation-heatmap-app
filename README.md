# ChatGPT Conversation Heatmap

ChatGPTエクスポートの`conversations.json`を、ブラウザ内で解析するローカルファーストのWebアプリです。基本統計、会話タイトル、曜日・時間帯ヒートマップ、月別利用推移、頻出ワード、Wrapped表示、途中停止、IndexedDB保存、AI引き継ぎJSON出力に対応しています。

## プライバシーと外部通信

- アプリ実行時、会話データを外部API、クラウドDB、分析サービスへ送信しません。
- 「外部送信なし」は、ユーザーがブラウザでアプリを実行している間に会話データを外部へ送信しない、という意味です。
- `next/font/google`を使用しているため、アプリをビルドするときにフォント取得の外部通信が発生する可能性があります。会話データはこの通信へ含まれません。
- 「ブラウザに保存」を明示的に選択した場合、解析済みの会話タイトルとメッセージ本文をブラウザ内のIndexedDBへ保存します。元のJSONファイル自体は保存しません。
- 共有端末では保存を避けるか、利用後に「保存済みデータをすべて削除」を実行してください。
- AI引き継ぎJSONには元の会話本文、メッセージ本文、会話タイトル、会話ID、元ファイル名、ローカルパスを含めません。ただし、本文から抽出した頻出語は集計結果として含まれます。
- 実在のログ、個人情報、認証情報、`.env`ファイルをリポジトリへ追加しないでください。

## 対応データ

- ChatGPTエクスポートの`conversations.json`
- `mapping`構造と`current_node`から現在の会話経路を復元
- JSONの手動ファイル選択のみ対応（ZIPの直接読込は未対応）
- 動作確認用の架空サンプルは`public/sample-conversations.json`にあります

## セットアップ

```powershell
git clone <repository-url>
cd conversation-heatmap-app
npm install
npm run dev
```

ブラウザで`http://localhost:3000`を開き、`conversations.json`を選択してください。

## 検証

通常の検証コマンドは次のとおりです。

```powershell
npm test
npm run lint
npm run build
git diff --check
```

Windows環境でVitestの起動時に`spawn EPERM`が発生する場合は、単一workerで再実行してください。

```powershell
npm test -- --pool=threads --no-file-parallelism --maxWorkers=1
```

GitHub Actionsは、pull requestと`main`へのpushで同じ単一workerテスト、lint、build、`git diff --check`を実行します。

## 大容量データの確認

100会話・1,000会話の架空データは通常テストで確認します。10,000会話の負荷テストは通常テストから分離しています。実行方法と測定方針は[大容量ログの確認手順](docs/large-log-resilience.md)を参照してください。

解析は会話単位の非同期チャンクで進み、進捗表示と停止操作に対応します。ただし、極端に大きい単一JSONの`JSON.parse`中や、極端に大きい単一会話の正規化中は、停止操作の反映に遅延する可能性があります。これは現在のv0.1の制限です。

## 監査時点の依存関係

2026-07-20時点で、`npm audit --omit=dev`と`npm audit`を実行した結果、本番依存・開発依存とも既知の脆弱性は0件でした。この結果は、その時点の依存関係に対する確認であり、将来も安全であることを保証するものではありません。依存関係を更新した際は、再度`npm audit`とCIを実行してください。

## 現在の制限

- ZIPの直接読込は未対応
- Web Workerは使用していません
- 極端に大きい単一JSONまたは単一会話では停止反映が遅れる可能性があります
- 期間比較機能は未対応です
- AI APIとの直接接続やクラウドへのアップロードは行いません

## ライセンス

MIT Licenseです。詳細は[LICENSE](LICENSE)を参照してください。
