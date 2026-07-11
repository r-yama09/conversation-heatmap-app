import { formatMonthlyActivityLabel } from "@/lib/analytics/monthlyActivity";
import type { MonthlyActivityResult } from "@/lib/analytics/types";

function percentage(value: number, max: number): string {
  return `${max > 0 ? Math.round((value / max) * 100) : 0}%`;
}

export default function MonthlyActivityPanel({ result, isPartial }: { result: MonthlyActivityResult; isPartial: boolean }) {
  const maxTotal = Math.max(0, ...result.months.map((month) => month.totalMessageCount));
  const firstMonth = result.months[0];
  const lastMonth = result.months.at(-1);

  return <section className="panel monthly-activity-panel" aria-labelledby="monthly-activity-heading">
    <div className="monthly-activity-heading">
      <div>
        <h2 id="monthly-activity-heading">月別利用推移</h2>
        <p>会話メッセージを日本時間の月ごとにローカル集計しています。</p>
      </div>
      <p className="result-status">{result.analyzedMonthCount}か月</p>
    </div>
    {isPartial && <p className="partial-banner">途中結果です。全データの解析結果ではありません。</p>}
    <dl className="monthly-activity-summary">
      <div className="data-tile"><dt>対象期間</dt><dd>{firstMonth && lastMonth ? `${formatMonthlyActivityLabel(firstMonth.month)} — ${formatMonthlyActivityLabel(lastMonth.month)}` : "—"}</dd></div>
      <div className="data-tile"><dt>最も利用が多い月</dt><dd>{result.peakTotalMonth ? `${formatMonthlyActivityLabel(result.peakTotalMonth.month)}（${result.peakTotalMonth.totalMessageCount}件）` : "—"}</dd></div>
      <div className="data-tile"><dt>userが最も多い月</dt><dd>{result.peakUserMonth ? `${formatMonthlyActivityLabel(result.peakUserMonth.month)}（${result.peakUserMonth.userMessageCount}件）` : "—"}</dd></div>
      <div className="data-tile"><dt>日時不明で除外</dt><dd>{result.excludedUnknownDateCount}件</dd></div>
    </dl>
    {result.months.length ? <div className="monthly-activity-chart" role="list" aria-label="月別利用推移一覧">{result.months.map((month) => <article className="monthly-activity-row" key={month.month} role="listitem" aria-label={`${formatMonthlyActivityLabel(month.month)}: 総メッセージ ${month.totalMessageCount}件、user ${month.userMessageCount}件、assistant ${month.assistantMessageCount}件、会話 ${month.conversationCount}件`}>
      <div className="monthly-activity-row-heading"><strong>{formatMonthlyActivityLabel(month.month)}</strong><span>{month.totalMessageCount}件</span></div>
      <div className="monthly-activity-bar" aria-hidden="true"><span className="monthly-activity-user-bar" style={{ width: percentage(month.userMessageCount, maxTotal) }} /><span className="monthly-activity-assistant-bar" style={{ width: percentage(month.assistantMessageCount, maxTotal) }} /></div>
      <div className="monthly-activity-details"><span>自分 {month.userMessageCount}件</span><span>AI {month.assistantMessageCount}件</span><span>会話 {month.conversationCount}件</span></div>
    </article>)}</div> : <p className="monthly-activity-empty">日時のある会話メッセージがないため、月別推移を表示できません。</p>}
    <p className="monthly-activity-note">日時あり {result.datedMessageCount}件 · 集計タイムゾーン: Asia/Tokyo</p>
  </section>;
}
