---
name: work-report
description: Generate a Japanese Markdown work report for ChatGPT Work from the current Codex task and repository state. Use for automatic end-of-task reports and when the user explicitly invokes $work-report.
---

## Invocation policy

This skill may be used for the repository's automatic end-of-task report as well as for an explicit `$work-report` request. Automatic reports should be concise; explicit `$work-report` requests should use the detailed format below.

The report remains read-only: do not edit files, create commits, push, install dependencies, or rerun test, lint, or build solely for reporting. Use the most recent verified results from the task and mark unknown information as `未確認`.

# Work向け作業報告書

## 目的

現在のCodex作業を読み取り専用で確認し、ユーザーがそのままChatGPT Workへ貼り付けられる日本語の作業報告書を生成する。

## 実行条件

- ユーザーがスキル一覧から選択した場合、`$work-report` を明示した場合、またはリポジトリの終了時自動報告として実行する。
- 作業対象は `D:\projects\conversation-heatmap-app` に限定する。
- ファイルを作成・編集・削除しない。
- commit、push、ブランチ変更を行わない。
- `npm install` を実行しない。
- lint、build、testを勝手に再実行しない。現在のタスクの会話、ツール出力、既存の報告に検証結果がある場合だけ利用し、確認できない項目は「未確認」と記載する。
- `D:\chatgpt-exports` へアクセスしない。

## 読み取り手順

1. まず現在のタスク内で確認済みの作業内容、検証結果、エラー、制限事項を整理する。
2. 不足するリポジトリ情報だけを、次の読み取り専用Gitコマンドで補完する。Gitを使う場合は必ず指定形式を使う。

```powershell
$git = "C:\Program Files\Git\cmd\git.exe"
$repo = "D:/projects/conversation-heatmap-app"

& $git -c "safe.directory=$repo" -C $repo status --short
& $git -c "safe.directory=$repo" -C $repo branch --show-current
& $git -c "safe.directory=$repo" -C $repo remote -v
& $git -c "safe.directory=$repo" -C $repo log -1 --oneline
& $git -c "safe.directory=$repo" -C $repo diff --stat
& $git -c "safe.directory=$repo" -C $repo diff --name-status
& $git -c "safe.directory=$repo" -C $repo diff --cached --stat
& $git -c "safe.directory=$repo" -C $repo diff --cached --name-status
```

3. 必要な場合だけ、対象リポジトリ内のファイル一覧や差分を読み取る。ファイル本文の大量転載はしない。
4. 確認済み事実と推測を分ける。確認できない値を補完・推測しない。
5. エラー、失敗、未確認事項を省略せず報告する。

## プライバシー

報告書には次を含めない。

- `conversations.json` の内容、ChatGPTエクスポートの生ログ
- ファイル本文の大量転載
- `.env` の内容
- 認証トークン、認証コード、Cookie、GitHub資格情報
- 個人情報
- `D:\chatgpt-exports` の内容

ファイル名や概要は、機密情報を含まない範囲で記載する。

## 出力規則

- 出力は必ず単一のMarkdownコードブロックだけにする。
- コードブロックの中身は次の見出し・順序・表形式を維持する。
- 完了状態は `完了`、`一部完了`、`未完了`、`中断` のいずれかにする。
- 変更がない箇所、問題がない箇所、判断事項がない箇所は「なし」と明記する。
- 検証項目は `成功`、`失敗`、`未確認` のいずれかで記載する。
- Workへの依頼は最後に1文で記載する。

```markdown
# CODEX_WORK_REPORT

## 1. 作業概要
- 依頼内容:
- 完了状態: 完了 / 一部完了 / 未完了 / 中断
- 作業対象:
- 現在ブランチ:
- HEAD:

## 2. 実施内容
- 実際に行った作業を箇条書き

## 3. 作成・変更ファイル
| 状態 | ファイル | 変更概要 |
|---|---|---|

変更がない場合は「なし」と明記する。

## 4. 検証結果
| 確認項目 | 結果 | 詳細 |
|---|---|---|
| lint | 成功 / 失敗 / 未確認 | |
| build | 成功 / 失敗 / 未確認 | |
| test | 成功 / 失敗 / 未確認 | |
| 手動確認 | 成功 / 失敗 / 未確認 | |

## 5. Git状態
- 作業ツリー:
- ステージ:
- commit:
- push:
- remote:

## 6. エラー・制限事項
- 残っているエラー
- 未確認事項
- MVP上の既知の制限

問題がなければ「なし」と明記する。

## 7. セキュリティ確認
- 本物ログへのアクセス:
- 外部API通信:
- 機密ファイルの変更:
- GitHubへの送信:
- その他:

## 8. 判断が必要なこと
ユーザーまたはChatGPT Workに判断してほしい項目を記載する。
なければ「なし」。

## 9. 次の推奨作業
次に実施すべき作業を1～3件だけ、優先順に記載する。

## 10. Workへの依頼
ChatGPT Workに何を判断・作成してほしいかを1文で記載する。
```

## 品質確認

出力前に、対象外パスへアクセスしていないこと、変更操作をしていないこと、検証結果を再実行で捏造していないこと、機密情報を含めていないこと、単一コードブロックであることを確認する。
