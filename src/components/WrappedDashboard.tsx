import type { WrappedSummary } from "@/lib/analytics/types";

const weekdayLabels = ["月曜", "火曜", "水曜", "木曜", "金曜", "土曜", "日曜"];

function formatNumber(value: number): string {
  return value.toLocaleString("ja-JP");
}

function formatDate(value: number | null): string {
  if (value === null) return "期間不明";
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value * 1000));
}

function percentage(value: number): string {
  return `${Math.round(value)}%`;
}

export default function WrappedDashboard({ summary, isPartial }: { summary: WrappedSummary; isPartial: boolean }) {
  const { totals, peakMonth, peakUsage, topWords, messageRatio, longestConversation, period, insights } = summary;
  return <section className="wrapped-dashboard" aria-labelledby="wrapped-heading">
    <div className="wrapped-hero">
      <div>
        <p className="wrapped-eyebrow">LOCAL SUMMARY · ASIA/TOKYO</p>
        <h2 id="wrapped-heading">Your ChatGPT Wrapped</h2>
        <p className="wrapped-period">{period.startAt === null ? "対象期間：期間不明" : `対象期間：${formatDate(period.startAt)} — ${formatDate(period.endAt)}`}</p>
        <p className="wrapped-comment">この期間、あなたはChatGPTと{formatNumber(totals.conversationCount)}件の会話を重ねました。</p>
      </div>
      <dl className="wrapped-hero-stats">
        <div><dt>総会話数</dt><dd>{formatNumber(totals.conversationCount)}<small>件</small></dd></div>
        <div><dt>総メッセージ</dt><dd>{formatNumber(totals.messageCount)}<small>件</small></dd></div>
        <div><dt>user</dt><dd>{formatNumber(totals.userMessageCount)}<small>件</small></dd></div>
        <div><dt>assistant</dt><dd>{formatNumber(totals.assistantMessageCount)}<small>件</small></dd></div>
      </dl>
    </div>
    {isPartial && <p className="partial-banner wrapped-partial">これは途中まで解析したデータによる結果です。</p>}
    <div className="wrapped-grid">
      <article className="wrapped-card wrapped-card-featured">
        <p className="wrapped-card-kicker">MOST ACTIVE MONTH</p><h3>最も活発だった月</h3>
        {peakMonth ? <><p className="wrapped-primary-value">{peakMonth.label}</p><p className="wrapped-big-number">{formatNumber(peakMonth.totalMessageCount)}<small> メッセージ</small></p><p className="wrapped-supporting">user {formatNumber(peakMonth.userMessageCount)}件 · assistant {formatNumber(peakMonth.assistantMessageCount)}件</p><p className="wrapped-supporting">全期間の {percentage(peakMonth.share * 100)}</p></> : <p className="wrapped-empty">日時のある会話メッセージがないため、ピーク月を表示できません。</p>}
      </article>
      <article className="wrapped-card">
        <p className="wrapped-card-kicker">YOUR RHYTHM</p><h3>よく使った曜日・時間帯</h3>
        {peakUsage.weekday !== null && peakUsage.hour !== null ? <dl className="wrapped-detail-list"><div><dt>最も多い曜日</dt><dd>{weekdayLabels[peakUsage.weekday]} <small>{peakUsage.weekdayMessageCount}件</small></dd></div><div><dt>最も多い時間</dt><dd>{peakUsage.hour}時台 <small>{peakUsage.hourMessageCount}件</small></dd></div><div><dt>ピークの組み合わせ</dt><dd>{weekdayLabels[peakUsage.weekday]} {peakUsage.hour}時台 <small>{peakUsage.messageCount}件・{peakUsage.daypart}</small></dd></div></dl> : <p className="wrapped-empty">日時のあるuserメッセージがないため、利用時間帯を表示できません。</p>}
      </article>
      <article className="wrapped-card wrapped-words-card">
        <p className="wrapped-card-kicker">TOP WORDS</p><h3>頻出ワードTOP5</h3>
        {topWords.length ? <ol className="wrapped-words">{topWords.map((word, index) => <li key={word.token} className={index === 0 ? "wrapped-word-first" : ""}><span>{index + 1}</span><strong>{word.token}</strong><small>出現 {word.count}回 · {word.messageCount}メッセージ</small></li>)}</ol> : <p className="wrapped-empty">表示できる頻出ワードがありません。</p>}
      </article>
      <article className="wrapped-card">
        <p className="wrapped-card-kicker">MESSAGE BALANCE</p><h3>user／assistant 比率</h3>
        <div className="wrapped-ratio-bar" role="img" aria-label={`user ${messageRatio.user}件 ${percentage(messageRatio.userPercentage)}、assistant ${messageRatio.assistant}件 ${percentage(messageRatio.assistantPercentage)}`}><span className="wrapped-ratio-user" style={{ width: `${messageRatio.userPercentage}%` }} /><span className="wrapped-ratio-assistant" style={{ width: `${messageRatio.assistantPercentage}%` }} /></div>
        <dl className="wrapped-ratio-values"><div><dt>user</dt><dd>{formatNumber(messageRatio.user)}件 <small>{percentage(messageRatio.userPercentage)}</small></dd></div><div><dt>assistant</dt><dd>{formatNumber(messageRatio.assistant)}件 <small>{percentage(messageRatio.assistantPercentage)}</small></dd></div></dl>
      </article>
      <article className="wrapped-card wrapped-card-wide">
        <p className="wrapped-card-kicker">LONGEST CONVERSATION</p><h3>最長会話</h3>
        {longestConversation ? <div className="wrapped-longest"><div><p className="wrapped-primary-value">{longestConversation.title}</p><p className="wrapped-supporting">開始：{formatDate(longestConversation.startedAt)}</p></div><dl><div><dt>総メッセージ</dt><dd>{formatNumber(longestConversation.messageCount)}件</dd></div><div><dt>user／assistant</dt><dd>{formatNumber(longestConversation.userMessageCount)}件／{formatNumber(longestConversation.assistantMessageCount)}件</dd></div><div><dt>総文字数</dt><dd>{formatNumber(longestConversation.characterCount)}文字</dd></div></dl></div> : <p className="wrapped-empty">会話データがないため、最長会話を表示できません。</p>}
      </article>
      <article className="wrapped-card wrapped-card-wide">
        <p className="wrapped-card-kicker">YOUR STYLE</p><h3>利用スタイル</h3>
        {insights.length ? <ul className="wrapped-insights">{insights.map((insight) => <li key={insight}>{insight}</li>)}</ul> : <p className="wrapped-empty">十分な傾向を判断できるデータがまだありません。</p>}
      </article>
    </div>
    <p className="wrapped-footnote">対象月数 {period.monthCount}か月 · すべての集計はこの端末内で行われます。</p>
  </section>;
}
