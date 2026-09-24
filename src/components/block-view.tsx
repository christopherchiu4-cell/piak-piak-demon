import { ReadingPanel } from "@/components/reading-panel";
import type { Block } from "@/content/blocks";
import { fillSegments } from "@/lib/blocks";

/** Read-only rendering of a document: class plans, previews, and post-submission review. */
export function BlockView({ blocks, showAnswers = false }: { blocks: Block[]; showAnswers?: boolean }) {
  if (!blocks.length) return <p className="empty-work">Nothing in here yet.</p>;
  let questionNumber = 0;
  return <div className="block-view">{blocks.map((block) => {
    if (block.type === "heading") return <h3 key={block.id}>{block.text}</h3>;
    if (block.type === "text") return <div className="prose" key={block.id}>{block.body.split(/\n+/).map((line, index) => <p key={index}>{line}</p>)}</div>;
    if (block.type === "passage") return <ReadingPanel key={block.id} passage={block.body} title={block.title} />;
    questionNumber += 1;
    return <div className="review-item" key={block.id}>
      <p className="eyebrow">Question {questionNumber} · {block.topic || "General"} · {block.points} point{block.points === 1 ? "" : "s"}</p>
      <p className="question-heading">{block.type === "fill" ? fillSegments(block).map((segment, index) => "text" in segment ? <span key={index}>{segment.text}</span> : <span className="blank-slot" key={index}>____</span>) : block.prompt}</p>
      {block.type === "mcq" && <ul className="option-preview">{block.options.map((option) => <li key={option.id} className={showAnswers && option.id === block.correctOptionId ? "correct" : ""}>{option.text}{showAnswers && option.id === block.correctOptionId ? " ✓" : ""}</li>)}</ul>}
      {showAnswers && block.type === "fill" && <p className="muted">Accepted: {block.blanks.map((blank) => blank.accepted.join(" or ")).join(" · ")}</p>}
      {showAnswers && block.type === "short" && block.rubric.length > 0 && <ul className="muted">{block.rubric.map((line) => <li key={line}>{line}</li>)}</ul>}
      {showAnswers && block.explanation && <p className="muted">{block.explanation}</p>}
    </div>;
  })}</div>;
}
