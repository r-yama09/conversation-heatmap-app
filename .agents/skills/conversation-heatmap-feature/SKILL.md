---
name: conversation-heatmap-feature
description: "conversation-heatmap-appの機能実装で共通して使う、アプリ固有の設計・UI・テスト規約。"
---

# Conversation Heatmap Feature

`conversation-heatmap-app`の機能実装時に、機能固有の仕様に加えて必ず適用する共通規約。
Gitの安全手順と完了報告は、それぞれ`safe-repo-workflow`と`work-report`へ委譲する。

## プロジェクト前提

- Next.js、TypeScript、Tailwind CSS、Vitest、IndexedDBを使用する。
- 処理は完全ローカルとし、外部API、クラウドDB、telemetryを使用しない。
- 実ログを使用せず、`D:\chatgpt-exports`へアクセスしない。
- 元ファイル名やローカルパスを保存しない。

## 実装ルール

- 実装前に既存のディレクトリ構造、型、データフロー、関連テストを確認する。
- parser本体を不用意に変更せず、正規化済みデータを利用する。
- 集計・変換ロジックはUIから分離し、純粋関数を優先する。
- 同じ入力から同じ結果を返す。日付・時刻は`Asia/Tokyo`を基準にする。
- SSR中にブラウザAPIへアクセスしない。IndexedDBはクライアント側で扱う。
- 外部依存を追加せず、大規模・無関係なリファクタリングを避ける。
- `any`を安易に使わず、無関係なファイルや既存解析結果を変更しない。

## UIルール

- 既存のApple風UIを維持し、可読性を最優先する。
- ライト・ダークテーマとスマホ幅を維持する。
- 色だけに意味を持たせず、補助文字を薄くしすぎない。
- 数値にはラベルを付け、適切な見出し階層を使う。
- 必要に応じてARIA属性を付ける。
- 空状態とエラーは日本語で表示し、途中解析結果には注意表示を出す。
- 既存解析結果を壊さない。

## テストルール

機能固有テストに加え、次を確認する。

- 空入力、欠損値、日時不明
- userのみ、assistantのみ
- 決定的な並び順と、同率時の決定的選択
- 既存の架空サンプルとの互換性
- 既存テストを壊さないこと
- `NaN`、`Infinity`、クラッシュを発生させないこと

標準検証は次の順で実行する。

```powershell
npm test
npm run lint
npm run build
git diff --check
git status --short --branch
```

標準テストで既知の`spawn EPERM`が出た場合のみ、次を代替実行する。

```powershell
npm test -- --pool=threads --no-file-parallelism --maxWorkers=1
```

## Git・報告

- 指定されたfeatureブランチ上で実装する。
- 検証成功後、機能指示で指定されたメッセージで1コミットする。
- コミット後はworking treeをcleanにする。
- 指示がない限りpush、main統合、ブランチ削除を行わない。
- 既存コミットを書き換えない。
- Git操作の詳細は`safe-repo-workflow`、報告形式は`work-report`に従う。
