"use client";

import { useEffect, useRef, useState } from "react";
import { parseChatGptExportAsync } from "@/lib/chatgpt-export/parser";
import type { AnalysisProgress, ParsedExport } from "@/lib/chatgpt-export/types";
import { createWeekdayHourHeatmap } from "@/lib/analytics/heatmap";
import { createFrequentWords } from "@/lib/analytics/frequentWords";
import WeekdayHourHeatmap from "@/components/WeekdayHourHeatmap";
import FrequentWordsPanel from "@/components/FrequentWordsPanel";

type AnalyzerPhase = "idle" | "ready" | "analyzing" | "stopping" | "partial-ready" | "complete" | "partial" | "error";

const statLabels = [
  ["conversationCount", "総会話数"],
  ["messageCount", "会話メッセージ数"],
  ["userMessageCount", "自分の発言数"],
  ["assistantMessageCount", "AI返信数"],
] as const;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes.toLocaleString("ja-JP")} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function emptyProgress(): AnalysisProgress {
  return { processedConversations: 0, totalConversations: 0, extractedMessageCount: 0, percentage: 0 };
}

export default function ConversationAnalyzerProgress() {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<AnalyzerPhase>("idle");
  const [result, setResult] = useState<ParsedExport | null>(null);
  const [partialResult, setPartialResult] = useState<ParsedExport | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);
  const mountedRef = useRef(true);
  const isAnalyzing = phase === "analyzing" || phase === "stopping";
  const isPartial = phase === "partial";
  const heatmap = result ? createWeekdayHourHeatmap(result.messages) : null;
  const frequentWords = result ? createFrequentWords(result.messages) : null;

  useEffect(() => () => {
    mountedRef.current = false;
    controllerRef.current?.abort();
  }, []);

  function resetResults() {
    setResult(null);
    setPartialResult(null);
    setProgress(null);
    setError(null);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    controllerRef.current?.abort();
    runIdRef.current += 1;
    setFile(selected);
    resetResults();
    if (selected && !selected.name.toLowerCase().endsWith(".json")) {
      setPhase("error");
      setError("JSONファイル（.json）を選択してください。");
      return;
    }
    setPhase(selected ? "ready" : "idle");
  }

  async function handleAnalyze() {
    if (!file || isAnalyzing) return;
    resetResults();
    let json: unknown;
    try {
      json = JSON.parse(await file.text()) as unknown;
    } catch {
      setPhase("error");
      setError("JSONの構文が正しくありません。ファイル内容を確認してください。");
      return;
    }

    const controller = new AbortController();
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setPhase("analyzing");
    setProgress(emptyProgress());

    try {
      const parsed = await parseChatGptExportAsync(json, {
        signal: controller.signal,
        onProgress: (nextProgress) => {
          if (mountedRef.current && runIdRef.current === runId) setProgress(nextProgress);
        },
      });
      if (!mountedRef.current || runIdRef.current !== runId) return;
      if (parsed.aborted) {
        setResult(null);
        setPartialResult(parsed.result);
        setPhase("partial-ready");
      } else {
        setPartialResult(null);
        setResult(parsed.result);
        setPhase("complete");
      }
    } catch (caught) {
      if (!mountedRef.current || runIdRef.current !== runId) return;
      setPhase("error");
      setProgress(null);
      setError(caught instanceof Error ? caught.message : "解析中に予期しないエラーが発生しました。");
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  function requestStop() {
    if (phase !== "analyzing" || !controllerRef.current) return;
    setPhase("stopping");
    controllerRef.current.abort();
  }

  function showPartialResult() {
    if (!partialResult) return;
    setResult(partialResult);
    setPartialResult(null);
    setPhase("partial");
  }

  function discardPartialResult() {
    runIdRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setFile(null);
    resetResults();
    setPhase("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  return <>
    <section className="panel upload-panel" aria-labelledby="upload-heading">
      <div className="upload-layout"><div>
        <h2 id="upload-heading" className="section-heading">会話ファイルを選択</h2>
        <p className="section-description">最初にChatGPTエクスポートの conversations.json を選択してください。ファイルはこのブラウザ内でのみ処理されます。</p>
        <label htmlFor="conversation-file" className="field-label">conversations.json</label>
        <input ref={inputRef} id="conversation-file" type="file" accept=".json,application/json" disabled={isAnalyzing} onChange={handleFileChange} className="file-input" />
        <dl className="file-details"><div className="data-tile"><dt>選択済みファイル</dt><dd>{file?.name ?? "未選択"}</dd></div><div className="data-tile"><dt>ファイルサイズ</dt><dd>{file ? formatFileSize(file.size) : "—"}</dd></div></dl>
      </div><button type="button" onClick={handleAnalyze} disabled={!file || isAnalyzing || phase === "error"} className="button button-primary">分析する</button></div>
      <p className="sample-link">形式を確認したい場合は、<a href="/sample-conversations.json" download>架空のサンプルJSON</a>をお試しください。</p>
    </section>
    {isAnalyzing && progress && <section className="panel status-panel" aria-labelledby="progress-heading"><div className="status-row"><h2 id="progress-heading">{phase === "stopping" ? "停止しています…" : "分析中"}</h2><p className="status-value">{progress.percentage}%</p></div><progress value={progress.percentage} max={100} aria-label="分析の進捗" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percentage}>{progress.percentage}%</progress><div className="progress-details"><p>処理済み: {progress.processedConversations} / {progress.totalConversations} 会話</p><p>抽出済み: {progress.extractedMessageCount} メッセージ</p></div><div className="status-actions"><button type="button" onClick={requestStop} disabled={phase === "stopping"} className="button button-secondary">{phase === "stopping" ? "停止要求を処理中" : "分析を停止する"}</button></div></section>}
    {phase === "partial-ready" && partialResult && <section className="panel notice-panel" aria-labelledby="partial-heading"><h2 id="partial-heading">分析を停止しました</h2><p>途中結果を表示できます。全データの解析結果ではありません。</p>{progress && <p>処理済み {progress.processedConversations} / {progress.totalConversations} 会話</p>}<div className="notice-actions"><button type="button" onClick={showPartialResult} className="button button-warning">途中結果を表示する</button><button type="button" onClick={discardPartialResult} className="button button-secondary">途中結果を破棄する</button></div></section>}
    {error && <section role="alert" className="panel error-panel"><p><strong>分析できませんでした</strong></p><p>{error}</p></section>}
    {result && <div className="results-section"><section aria-labelledby="stats-heading"><div className="result-heading"><h2 id="stats-heading">基本統計</h2><p className="result-status">{isPartial ? "途中結果" : "分析完了"}</p></div>{isPartial && <p className="partial-banner">途中結果です。全データの解析結果ではありません。{progress && ` 処理済み ${progress.processedConversations} / ${progress.totalConversations} 会話`}</p>}<div className="stats-grid">{statLabels.map(([key, label]) => <article key={key} className="stat-card"><p>{label}</p><p className="stat-value">{result.stats[key].toLocaleString("ja-JP")}<span className="stat-unit">件</span></p><p>{key === "messageCount" ? "自分＋AI" : key === "userMessageCount" ? "ヒートマップの対象" : key === "assistantMessageCount" ? "会話経路上の返信" : "解析した会話の数"}</p></article>)}</div><p className="stats-note">会話メッセージ数は、自分の発言数とAI返信数の合計です。system・tool・空メッセージは含みません。</p></section>{heatmap && <WeekdayHourHeatmap heatmap={heatmap} isPartial={isPartial} />}{frequentWords && <FrequentWordsPanel result={frequentWords} isPartial={isPartial} />}<section className="panel titles-panel" aria-labelledby="titles-heading"><div className="titles-heading"><h2 id="titles-heading">会話タイトル</h2><span className="titles-count">{result.conversations.length}件</span></div><ol className="titles-list">{result.conversations.map((conversation, index) => <li key={conversation.conversationId}><span className="title-index">{index + 1}</span><div className="title-text"><p>{conversation.title}</p><small>会話メッセージ {conversation.messageCount}件 · 自分 {conversation.userMessageCount}件 / AI {conversation.assistantMessageCount}件</small></div></li>)}</ol></section></div>}
  </>;

}
