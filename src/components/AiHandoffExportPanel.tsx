"use client";

import { useState } from "react";
import type { ParsedExport } from "@/lib/chatgpt-export/types";
import { serializeAiHandoffJson } from "@/lib/analytics/aiHandoff";

const HANDOFF_FILENAME = "chatgpt-ai-handoff-v0.1.json";

export default function AiHandoffExportPanel({ result, isPartial }: { result: ParsedExport | null; isPartial: boolean }) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function download() {
    if (!result) {
      setError("解析結果または保存済みデータを読み込むと、引き継ぎJSONをダウンロードできます。");
      return;
    }
    try {
      const blob = new Blob([serializeAiHandoffJson(result, { isPartial })], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = HANDOFF_FILENAME;
      link.click();
      URL.revokeObjectURL(url);
      setError(null);
      setFeedback(isPartial ? "途中結果であることを明記した引き継ぎJSONをダウンロードしました。" : "AI向け引き継ぎJSONをダウンロードしました。");
    } catch {
      setFeedback(null);
      setError("引き継ぎJSONを生成できませんでした。解析結果を確認してもう一度お試しください。");
    }
  }

  return <section className="panel ai-handoff-panel" aria-labelledby="ai-handoff-heading">
    <div className="ai-handoff-heading"><div><h2 id="ai-handoff-heading">AI向け引き継ぎJSON</h2><p>会話本文を含めず、集計結果だけを機械可読なJSONとしてこの端末で生成します。</p></div><span className="result-status">schema v0.1</span></div>
    {isPartial && result && <p className="partial-banner">途中結果であることをJSONにも明記して出力します。</p>}
    {!result && <p className="ai-handoff-note">解析結果または保存済みデータが未読込のため、まだダウンロードできません。</p>}
    <button type="button" className="button button-secondary" onClick={download} disabled={!result} aria-describedby="ai-handoff-privacy-note">引き継ぎJSONをダウンロード</button>
    <p id="ai-handoff-privacy-note" className="ai-handoff-note">元会話本文、メッセージ本文、元ファイル名、ローカルパスは出力しません。</p>
    {feedback && <p className="ai-handoff-feedback" role="status">{feedback}</p>}
    {error && <p className="ai-handoff-error" role="alert">{error}</p>}
  </section>;
}
