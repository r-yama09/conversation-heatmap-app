"use client";

import { useEffect, useState } from "react";
import type { ParsedExport } from "@/lib/chatgpt-export/types";
import {
  clearStoredConversations,
  emptyStorageSummary,
  getStorageSummary,
  loadConversations,
  saveConversations,
} from "@/lib/storage/indexedDb";
import { IndexedDbStorageError, type SaveResult, type StorageSummary } from "@/lib/storage/types";

type LocalStoragePanelProps = {
  result: ParsedExport | null;
  isPartial: boolean;
  onLoaded: (result: ParsedExport) => void;
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof IndexedDbStorageError ? error.message : fallback;
}

function formatSavedAt(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ja-JP");
}

function summaryFromSave(result: SaveResult): StorageSummary {
  return {
    storedConversationCount: result.totalStoredConversationCount,
    storedMessageCount: result.totalStoredMessageCount,
    lastSavedAt: result.savedAt,
    lastSave: result,
  };
}

export default function LocalStoragePanel({ result, isPartial, onLoaded }: LocalStoragePanelProps) {
  const [summary, setSummary] = useState<StorageSummary>(() => emptyStorageSummary());
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getStorageSummary().then((nextSummary) => {
      if (!active) return;
      setSummary(nextSummary);
      setIsSummaryLoading(false);
    }).catch((caught) => {
      if (!active) return;
      setError(errorMessage(caught, "IndexedDBの保存状態を確認できませんでした。"));
      setIsSummaryLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function handleSave() {
    if (!result || isPartial || isBusy) return;
    setIsBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const saveResult = await saveConversations(result);
      setSummary(summaryFromSave(saveResult));
      setFeedback(`保存しました。追加 ${saveResult.addedConversationCount}件、更新 ${saveResult.updatedConversationCount}件、重複 ${saveResult.unchangedConversationCount}件。`);
    } catch (caught) {
      setError(errorMessage(caught, "保存に失敗しました。現在の解析結果はそのまま表示しています。"));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLoad() {
    if (isBusy) return;
    setIsBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const loaded = await loadConversations();
      onLoaded(loaded);
      setFeedback(`保存済みデータを読み込みました（${loaded.conversations.length}会話）。`);
    } catch (caught) {
      setError(errorMessage(caught, "読み込みに失敗しました。現在の解析結果はそのまま表示しています。"));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleClear() {
    if (isBusy || !window.confirm("保存済みデータをすべて削除しますか？")) return;
    setIsBusy(true);
    setError(null);
    setFeedback(null);
    try {
      await clearStoredConversations();
      setSummary(emptyStorageSummary());
      setFeedback("保存済みデータをすべて削除しました。");
    } catch (caught) {
      setError(errorMessage(caught, "削除に失敗しました。現在の解析結果はそのまま表示しています。"));
    } finally {
      setIsBusy(false);
    }
  }

  return <section className="panel storage-panel" aria-labelledby="storage-heading">
    <div className="storage-heading">
      <div>
        <h2 id="storage-heading">ブラウザ内保存</h2>
        <p>解析結果をこのブラウザのIndexedDBへ明示的に保存します。元ファイルは保存しません。</p>
      </div>
      <span className="result-status">自動保存なし</span>
    </div>
    <dl className="storage-summary">
      <div className="data-tile"><dt>保存済み会話</dt><dd>{isSummaryLoading ? "確認中…" : summary.storedConversationCount.toLocaleString("ja-JP")}件</dd></div>
      <div className="data-tile"><dt>保存済みメッセージ</dt><dd>{isSummaryLoading ? "確認中…" : summary.storedMessageCount.toLocaleString("ja-JP")}件</dd></div>
      <div className="data-tile"><dt>最終保存日時</dt><dd>{formatSavedAt(summary.lastSavedAt)}</dd></div>
      <div className="data-tile"><dt>前回保存</dt><dd>{summary.lastSave ? `追加${summary.lastSave.addedConversationCount} / 更新${summary.lastSave.updatedConversationCount} / 重複${summary.lastSave.unchangedConversationCount}` : "—"}</dd></div>
    </dl>
    {summary.storedConversationCount === 0 && !isSummaryLoading && <p className="storage-empty">保存データはありません。</p>}
    {isPartial && <p className="storage-note">途中結果は保存できません。解析完了後に保存を選択してください。</p>}
    <div className="storage-actions">
      <button type="button" className="button button-primary" onClick={handleSave} disabled={!result || isPartial || isBusy}>{isBusy ? "処理中…" : "ブラウザに保存"}</button>
      <button type="button" className="button button-secondary" onClick={handleLoad} disabled={isBusy}>保存済みデータを読み込む</button>
      <button type="button" className="button button-danger" onClick={handleClear} disabled={isBusy || summary.storedConversationCount === 0}>保存済みデータをすべて削除</button>
    </div>
    {feedback && <p className="storage-feedback" role="status">{feedback}</p>}
    {error && <p className="storage-error" role="alert">{error}</p>}
  </section>;
}
