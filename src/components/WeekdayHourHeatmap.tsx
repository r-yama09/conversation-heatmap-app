import type { WeekdayHourHeatmapResult } from "@/lib/analytics/types";

const weekdayLabels = ["月", "火", "水", "木", "金", "土", "日"];

function intensityClass(count: number, maxCount: number): string {
  if (maxCount === 0 || count === 0) return "heat-0";
  const ratio = count / maxCount;
  if (ratio <= 0.25) return "heat-1";
  if (ratio <= 0.5) return "heat-2";
  if (ratio <= 0.75) return "heat-3";
  return "heat-4";
}

function cellLabel(weekdayLabel: string, hour: number, count: number): string {
  return `${weekdayLabel}曜日 ${hour}時台 ${count}件`;
}

export default function WeekdayHourHeatmap({ heatmap, isPartial }: { heatmap: WeekdayHourHeatmapResult; isPartial: boolean }) {
  return <section className="panel heatmap-panel" aria-labelledby="heatmap-heading">
    <div className="heatmap-heading"><div><h2 id="heatmap-heading">曜日×時間帯</h2><p>自分の発言数・日本時間（{heatmap.timeZone}）</p></div><p className="result-status">最大値 {heatmap.maxCount}件</p></div>
    {isPartial && <p className="partial-banner">途中結果です。全データの解析結果ではありません。</p>}
    <p className="heatmap-scroll-hint">横にスクロールして0時〜23時を確認できます。</p>
    <div
      className="heatmap-scroller"
      role="region"
      tabIndex={0}
      aria-label={`曜日と時間帯のヒートマップ。最大値 ${heatmap.maxCount}件、対象 ${heatmap.includedMessageCount}件`}
      aria-describedby="heatmap-keyboard-note"
    >
      <table className="heatmap-table" aria-label="曜日と時間帯ごとの自分の発言数">
        <thead><tr><th scope="col" className="sticky-cell">曜日</th>{Array.from({ length: 24 }, (_, hour) => <th key={hour} scope="col">{hour}</th>)}</tr></thead>
        <tbody>{weekdayLabels.map((label, weekday) => <tr key={label}><th scope="row" className="sticky-cell">{label}</th>{heatmap.cells.slice(weekday * 24, weekday * 24 + 24).map((cell) => <td key={cell.hour} aria-label={cellLabel(label, cell.hour, cell.count)}><span className={`heat-cell ${intensityClass(cell.count, heatmap.maxCount)}`}>{cell.count === 0 ? "·" : cell.count}</span></td>)}</tr>)}</tbody>
      </table>
    </div>
    <div className="heatmap-legend" aria-label="色の凡例"><span>凡例</span>{["0件", "少ない", "やや少ない", "やや多い", "多い"].map((label, index) => <span key={label} className="legend-item"><i aria-hidden className={`legend-swatch heat-${index}`} />{label}</span>)}</div>
    <dl className="file-details heatmap-summary"><div className="data-tile"><dt>集計対象メッセージ数</dt><dd>{heatmap.includedMessageCount}件</dd></div><div className="data-tile"><dt>日時不明で除外</dt><dd>{heatmap.excludedMessageCount}件</dd></div></dl>
    <p id="heatmap-keyboard-note" className="heatmap-note">キーボードではセルごとのTab移動はありません。表の行・列ナビゲーションまたは上のヒートマップ領域で全体の傾向を確認できます。</p>
  </section>;
}
