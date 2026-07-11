"use client";

import { useEffect, useRef, useState } from "react";
import { parseChatGptExportAsync } from "@/lib/chatgpt-export/parser";
import type { AnalysisProgress, ParsedExport } from "@/lib/chatgpt-export/types";

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

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-50 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8"><p className="mb-3 inline-flex rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">MVP · ローカル解析</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">ChatGPT 会話ヒートマップ</h1><p className="mt-3 max-w-2xl leading-7 text-slate-600 dark:text-slate-300">conversations.json をブラウザ内で解析します。</p></header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-7" aria-labelledby="upload-heading">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"><div className="min-w-0 flex-1"><h2 id="upload-heading" className="text-xl font-bold">会話ファイルを選択</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">ファイルは外部へ送信されず、このブラウザ内で処理されます。</p><label htmlFor="conversation-file" className="mt-5 block text-sm font-semibold">conversations.json</label><input ref={inputRef} id="conversation-file" type="file" accept=".json,application/json" disabled={isAnalyzing} onChange={handleFileChange} className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 file:mr-4 file:border-0 file:bg-slate-900 file:px-4 file:py-3 file:font-semibold file:text-white focus:ring-2 focus:ring-indigo-500" /><dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800"><dt className="text-slate-500 dark:text-slate-400">選択ファイル名</dt><dd className="mt-0.5 truncate font-medium">{file?.name ?? "未選択"}</dd></div><div className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800"><dt className="text-slate-500 dark:text-slate-400">ファイルサイズ</dt><dd className="mt-0.5 font-medium">{file ? formatFileSize(file.size) : "—"}</dd></div></dl></div><button type="button" onClick={handleAnalyze} disabled={!file || isAnalyzing || phase === "error"} className="w-full rounded-xl bg-indigo-700 px-6 py-3 font-bold text-white hover:bg-indigo-800 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400 md:w-auto">解析する</button></div>
          <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">手元にファイルがない場合は、<a href="/sample-conversations.json" download className="font-semibold text-indigo-700 underline underline-offset-4 dark:text-indigo-300">架空のサンプルJSON</a>をお試しください。</p>
        </section>

        {isAnalyzing && progress && <section className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm dark:border-indigo-900 dark:bg-slate-900" aria-labelledby="progress-heading"><div className="flex flex-wrap items-baseline justify-between gap-3"><h2 id="progress-heading" className="text-lg font-bold">{phase === "stopping" ? "停止しています…" : "解析中"}</h2><p className="font-semibold tabular-nums">{progress.percentage}%</p></div><progress className="mt-4 h-3 w-full accent-indigo-700" value={progress.percentage} max={100} aria-label="解析の進捗" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percentage}>{progress.percentage}%</progress><div className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-2"><p>処理済み: {progress.processedConversations} / {progress.totalConversations} 会話</p><p>抽出済み: {progress.extractedMessageCount} メッセージ</p></div><button type="button" onClick={requestStop} disabled={phase === "stopping"} className="mt-5 rounded-xl border border-slate-400 bg-white px-4 py-2 font-semibold text-slate-900 hover:bg-slate-100 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-500 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">{phase === "stopping" ? "停止要求を送信しました" : "分析を停止する"}</button></section>}

        {phase === "partial-ready" && partialResult && <section className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50" aria-labelledby="partial-heading"><h2 id="partial-heading" className="text-lg font-bold">解析を停止しました</h2><p className="mt-2 text-sm leading-6">途中結果を表示できます。全データの解析結果ではありません。</p>{progress && <p className="mt-2 text-sm font-medium">処理済み {progress.processedConversations} / {progress.totalConversations} 会話</p>}<div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={showPartialResult} className="rounded-xl bg-amber-800 px-4 py-2 font-semibold text-white hover:bg-amber-900 focus:ring-2 focus:ring-amber-700 focus:ring-offset-2">途中結果を表示する</button><button type="button" onClick={discardPartialResult} className="rounded-xl border border-amber-700 bg-white px-4 py-2 font-semibold hover:bg-amber-100 focus:ring-2 focus:ring-amber-700 focus:ring-offset-2 dark:bg-slate-900 dark:hover:bg-slate-800">途中結果を破棄する</button></div></section>}

        {error && <div role="alert" className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900"><p className="font-bold">解析できませんでした</p><p className="mt-1 text-sm leading-6">{error}</p></div>}

        {result && <><section className="mt-8" aria-labelledby="stats-heading"><div className="flex flex-wrap items-end justify-between gap-3"><h2 id="stats-heading" className="text-2xl font-bold">基本統計</h2><p className="text-sm font-medium text-slate-600 dark:text-slate-300">{isPartial ? "途中結果" : "解析完了"}</p></div>{isPartial && <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-950 dark:bg-amber-950 dark:text-amber-50">途中結果です。全データの解析結果ではありません。{progress && ` 処理済み ${progress.processedConversations} / ${progress.totalConversations} 会話`}</p>}<div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">{statLabels.map(([key, label]) => <article key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5"><p className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</p><p className="mt-2 text-3xl font-bold tabular-nums">{result.stats[key].toLocaleString("ja-JP")}<span className="ml-1 text-sm font-medium text-slate-500">件</span></p></article>)}</div><p className="mt-3 text-sm text-slate-600 dark:text-slate-300">会話メッセージ数は、自分＋AI（自分の発言数＋AI返信数）の合計です。</p></section><section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-7" aria-labelledby="titles-heading"><div className="flex items-baseline justify-between gap-4"><h2 id="titles-heading" className="text-2xl font-bold">会話タイトル</h2><span className="text-sm text-slate-500">{result.conversations.length}件</span></div><ol className="mt-5 divide-y divide-slate-200 dark:divide-slate-700">{result.conversations.map((conversation, index) => <li key={conversation.conversationId} className="flex gap-3 py-4 first:pt-0 last:pb-0"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">{index + 1}</span><div className="min-w-0"><p className="break-words font-semibold">{conversation.title}</p><p className="mt-1 text-sm text-slate-500">統計対象 {conversation.messageCount}件（自分 {conversation.userMessageCount}件 / AI {conversation.assistantMessageCount}件）</p></div></li>)}</ol></section></>}
      </div>
    </main>
  );
}
