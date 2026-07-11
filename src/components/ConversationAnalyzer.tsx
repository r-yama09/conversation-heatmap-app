"use client";

import { useState } from "react";
import { parseChatGptExport } from "@/lib/chatgpt-export/parser";
import type { ParsedExport } from "@/lib/chatgpt-export/types";

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

export default function ConversationAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ParsedExport | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setError(selected && !selected.name.toLowerCase().endsWith(".json") ? "JSONファイル（.json）を選択してください。" : null);
  }

  async function handleAnalyze() {
    setResult(null);
    setError(null);
    if (!file) return setError("解析するJSONファイルを選択してください。");
    if (!file.name.toLowerCase().endsWith(".json")) return setError("JSONファイル（.json）を選択してください。");

    let text: string;
    try {
      text = await file.text();
    } catch {
      return setError("ファイルを読み込めませんでした。ファイルの状態を確認して、もう一度お試しください。");
    }
    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      return setError("JSONの構文が正しくありません。ファイル内容を確認してください。");
    }
    try {
      setResult(parseChatGptExport(json));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "解析中に予期しないエラーが発生しました。");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="mb-3 inline-flex rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-800">MVP · ローカル解析</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">ChatGPT 会話ヒートマップ</h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">conversations.json を読み込み、会話数とメッセージ数を確認します。</p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="upload-heading">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 flex-1">
              <h2 id="upload-heading" className="text-xl font-bold">会話ファイルを選択</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">選択したファイルはブラウザ内だけで処理され、外部サーバーには送信されません。</p>
              <label htmlFor="conversation-file" className="mt-5 block text-sm font-semibold">conversations.json</label>
              <input id="conversation-file" type="file" accept=".json,application/json" onChange={handleFileChange} className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 text-sm file:mr-4 file:border-0 file:bg-slate-900 file:px-4 file:py-3 file:font-semibold file:text-white focus:ring-2 focus:ring-indigo-500" />
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-slate-100 px-3 py-2"><dt className="text-slate-500">選択ファイル名</dt><dd className="mt-0.5 truncate font-medium">{file?.name ?? "未選択"}</dd></div>
                <div className="rounded-lg bg-slate-100 px-3 py-2"><dt className="text-slate-500">ファイルサイズ</dt><dd className="mt-0.5 font-medium">{file ? formatFileSize(file.size) : "—"}</dd></div>
              </dl>
            </div>
            <button type="button" onClick={handleAnalyze} disabled={!file || Boolean(file && !file.name.toLowerCase().endsWith(".json"))} className="w-full rounded-xl bg-indigo-700 px-6 py-3 font-bold text-white hover:bg-indigo-800 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400 md:w-auto">解析する</button>
          </div>
          <p className="mt-5 text-sm text-slate-600">手元にファイルがない場合は、<a href="/sample-conversations.json" download className="font-semibold text-indigo-700 underline underline-offset-4">架空のサンプルJSON</a>をお試しください。</p>
        </section>

        {error && <div role="alert" className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900"><p className="font-bold">解析できませんでした</p><p className="mt-1 text-sm leading-6">{error}</p></div>}

        <section className="mt-8" aria-labelledby="stats-heading">
          <div className="flex items-end justify-between gap-4"><h2 id="stats-heading" className="text-2xl font-bold">基本統計</h2><p className="text-sm font-medium text-slate-500">{result ? "解析完了" : "未解析"}</p></div>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {statLabels.map(([key, label]) => <article key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><p className="text-sm font-medium text-slate-600">{label}</p><p className="mt-2 text-3xl font-bold tabular-nums">{result ? result.stats[key].toLocaleString("ja-JP") : "—"}{result && <span className="ml-1 text-sm font-medium text-slate-500">件</span>}</p></article>)}
          </div>
          <p className="mt-3 text-sm text-slate-600">会話メッセージ数は、自分＋AI（自分の発言数＋AI返信数）の合計です。</p>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="titles-heading">
          <div className="flex items-baseline justify-between gap-4"><h2 id="titles-heading" className="text-2xl font-bold">会話タイトル</h2>{result && <span className="text-sm text-slate-500">{result.conversations.length}件</span>}</div>
          {result ? <ol className="mt-5 divide-y divide-slate-200">{result.conversations.map((conversation, index) => <li key={conversation.conversationId} className="flex gap-3 py-4 first:pt-0 last:pb-0"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-800">{index + 1}</span><div className="min-w-0"><p className="break-words font-semibold">{conversation.title}</p><p className="mt-1 text-sm text-slate-500">統計対象 {conversation.messageCount}件（自分 {conversation.userMessageCount}件 / AI {conversation.assistantMessageCount}件）</p></div></li>)}</ol> : <p className="mt-4 rounded-xl bg-slate-100 px-4 py-6 text-center text-sm text-slate-600">JSONを解析すると、ここにタイトル一覧が表示されます。</p>}
        </section>
      </div>
    </main>
  );
}
