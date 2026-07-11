import ConversationAnalyzer from "@/components/ConversationAnalyzerProgress";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-container app-header-content">
          <a className="app-brand" href="#main-content" aria-label="メインコンテンツへ移動">
            <span className="app-brand-mark" aria-hidden>CH</span>
            <span>Conversation Heatmap</span>
          </a>
          <div className="app-header-actions">
            <p className="privacy-badge"><span aria-hidden>●</span> ローカル処理・外部送信なし</p>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="main-content" className="app-container dashboard-main" tabIndex={-1}>
        <section className="dashboard-hero" aria-labelledby="page-title">
          <div className="hero-copy">
            <p className="eyebrow">PRIVATE CONVERSATION ANALYTICS</p>
            <h1 id="page-title">ChatGPTとの会話を、<span>ローカルで振り返る。</span></h1>
            <p className="hero-description">会話エクスポートから、発言数や曜日・時間帯ごとの傾向を、端末の外へ送信せずに見える化します。</p>
            <ul className="hero-assurances" aria-label="プライバシー上の特徴">
              <li><span aria-hidden>✓</span> ブラウザ内で完結</li>
              <li><span aria-hidden>✓</span> 外部API不使用</li>
              <li><span aria-hidden>✓</span> ファイルを保存しない</li>
            </ul>
          </div>
          <div className="hero-visual" aria-hidden>
            <div className="hero-visual-header"><span /><span /><span /></div>
            <div className="hero-visual-body">
              <div className="hero-metric"><small>CONVERSATIONS</small><strong>128</strong></div>
              <div className="hero-mini-heatmap">{Array.from({ length: 35 }, (_, index) => <i key={index} className={`hero-cell hero-cell-${index % 5}`} />)}</div>
            </div>
          </div>
        </section>
        <ConversationAnalyzer />
      </main>
    </div>
  );
}
