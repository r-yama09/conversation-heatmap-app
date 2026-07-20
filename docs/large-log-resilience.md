# 大量架空データの確認

`syntheticConversations.ts`は実ログを使わない決定的なテスト用生成器です。通常テストでは100会話と1,000会話を確認します。

10,000会話の負荷テストは通常実行から分離しています。

```powershell
$env:RUN_LARGE_LOG_TESTS = "1"
npm.cmd test -- src/lib/chatgpt-export/largeLog.load.test.ts --pool=threads --no-file-parallelism --maxWorkers=1
Remove-Item Env:RUN_LARGE_LOG_TESTS
```

成功時は外部送信を行わず、会話数・メッセージ数・経過時間をローカル標準出力へ出力します。経過時間は実行環境に依存するため、絶対的な合格基準には使用しません。

現行の解析は会話単位で25件ずつ処理し、チャンクごとにブラウザへ制御を返します。停止要求は次の会話を処理する前に確認され、途中結果は保存対象にしません。`JSON.parse`と単一会話内の正規化は中断できないため、非常に大きな単一JSON文字列または単一会話では短時間の停止遅延が残ります。
