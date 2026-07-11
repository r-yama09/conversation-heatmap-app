import type { FrequentWordsResult } from "@/lib/analytics/types";

export default function FrequentWordsPanel({ result, isPartial }: { result: FrequentWordsResult; isPartial: boolean }) {
  return <section className="panel frequent-words-panel" aria-labelledby="frequent-words-heading">
    <div className="frequent-words-heading">
      <div>
        <h2 id="frequent-words-heading">よく使う言葉</h2>
        <p>自分のメッセージを端末内で簡易集計しています</p>
      </div>
      <p className="result-status">{result.words.length}件表示</p>
    </div>
    {isPartial && <p className="partial-banner">途中結果です。全データの解析結果ではありません。</p>}
    <dl className="frequent-words-summary">
      <div className="data-tile"><dt>対象userメッセージ</dt><dd>{result.analyzedMessageCount}件</dd></div>
      <div className="data-tile"><dt>有効な単語があるメッセージ</dt><dd>{result.matchedMessageCount}件</dd></div>
      <div className="data-tile"><dt>単語がないメッセージ</dt><dd>{result.excludedMessageCount}件</dd></div>
    </dl>
    {result.words.length ? <ol className="frequent-words-list" aria-label="よく使う言葉の一覧">{result.words.map((word, index) => <li key={word.token}>
      <span className="frequent-word-rank" aria-hidden>{index + 1}</span>
      <span className="frequent-word-token">{word.token}</span>
      <span className="frequent-word-count">出現 {word.count}回 / 登場メッセージ {word.messageCount}件</span>
    </li>)}</ol> : <p className="frequent-words-empty">表示できる単語がありません。</p>}
  </section>;
}
