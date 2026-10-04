import { MathText } from "./math-text";

export function ReadingPanel({ passage, title = "Reading passage" }: { passage: string; title?: string }) {
  return <section className="card reading-panel"><header className="reading-heading"><div><p className="eyebrow">Read & explore</p><h2><MathText>{title || "Reading passage"}</MathText></h2></div><span className="reading-hint">Read at your own pace · Questions below</span></header>
    <div className="reading-scroll" role="region" aria-label="Reading passage" tabIndex={0}>{passage.split(/\n\s*\n/).map((paragraph, index) => <p key={index}><MathText>{paragraph}</MathText></p>)}</div>
  </section>;
}
