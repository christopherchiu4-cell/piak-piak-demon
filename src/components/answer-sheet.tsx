"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { saveResponse, submitAttempt } from "@/app/actions/student";
import type { PublicBlock } from "@/lib/grading";
import { paginateBlocks, parseFill, serializeFill } from "@/lib/blocks";
import { AutosaveQueue, type SaveStatus } from "@/lib/autosave";
import { Spinner } from "./loading-indicator";
import { ReadingPanel } from "./reading-panel";

type PublicMcq = Extract<PublicBlock, { type: "mcq" }>;
type PublicFill = Extract<PublicBlock, { type: "fill" }>;

function NumberLine({ line }: { line: NonNullable<PublicMcq["numberLine"]> }) {
  const x = (value: number) => 45 + ((value - line.min) / (line.max - line.min)) * 590;
  return <figure className="number-line"><svg viewBox="0 0 680 145" role="img" aria-label={`Number line from ${line.min} to ${line.max} with points ${line.points.map((point) => `${point.label} at ${point.value}`).join(", ")}`}><line x1="30" y1="78" x2="650" y2="78" stroke="currentColor" strokeWidth="2" />{line.ticks.map((tick) => <g key={tick}><line x1={x(tick)} x2={x(tick)} y1="70" y2="86" stroke="currentColor" /><text x={x(tick)} y="115" textAnchor="middle">{tick}</text></g>)}{line.points.map((point) => <g key={point.label}><circle cx={x(point.value)} cy="78" r="6" fill="currentColor" /><text x={x(point.value)} y="48" textAnchor="middle" fill="currentColor" fontWeight="700">{point.label}</text></g>)}</svg><figcaption>Read the scale carefully.</figcaption></figure>;
}

/** Renders {{n}} markers as inline inputs; a marker-free prompt gets one trailing blank. */
function FillAnswer({ block, answer, onChange }: { block: PublicFill; answer: string; onChange: (value: string) => void }) {
  const values = parseFill(block as never, answer);
  const update = (blankId: string, value: string) => onChange(serializeFill(block as never, { ...values, [blankId]: value }));
  const pattern = /\{\{(\d+)\}\}/g;
  const pieces: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let found = false;
  while ((match = pattern.exec(block.prompt)) !== null) {
    found = true;
    if (match.index > cursor) pieces.push(<span key={`t${cursor}`}>{block.prompt.slice(cursor, match.index)}</span>);
    const blank = block.blanks[Number(match[1]) - 1];
    if (blank) pieces.push(<input className="fill-input" key={blank.id} value={values[blank.id] ?? ""} onChange={(event) => update(blank.id, event.target.value)} aria-label={`Blank ${match[1]}`} />);
    cursor = match.index + match[0].length;
  }
  if (found && cursor < block.prompt.length) pieces.push(<span key="tail">{block.prompt.slice(cursor)}</span>);
  if (!found) {
    const blank = block.blanks[0];
    return <label className="answer-label">Your answer<input className="number-answer" value={blank ? values[blank.id] ?? "" : ""} onChange={(event) => blank && update(blank.id, event.target.value)} placeholder="Type your answer" /></label>;
  }
  return <p className="fill-sentence">{pieces}</p>;
}

export function AnswerSheet({ attemptId, activity, initialAnswers }: {
  attemptId: string;
  activity: { title: string; subject: "MATH" | "ENGLISH"; blocks: PublicBlock[] };
  initialAnswers: Record<string, string>;
}) {
  const [answers, setAnswers] = useState(initialAnswers);
  const [index, setIndex] = useState(0);
  const [saveState, setSaveState] = useState<SaveStatus>("idle");
  const [submitError, setSubmitError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);
  const queue = useRef<AutosaveQueue | null>(null);
  useEffect(() => {
    const saver = new AutosaveQueue((questionId, answer) => saveResponse(attemptId, questionId, answer), setSaveState);
    queue.current = saver;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (saver.hasPending || submitting.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => { void saver.finishPending(); window.removeEventListener("beforeunload", warnBeforeLeaving); };
  }, [attemptId]);

  const { passages, pages } = paginateBlocks(activity.blocks as never);
  const page = pages[index];
  const question = page?.question as unknown as PublicBlock | undefined;
  const answered = pages.filter((item) => (answers[item.question.id] ?? "").trim()).length;

  function change(questionId: string, answer: string) {
    if (submitting.current) return;
    setAnswers((current) => ({ ...current, [questionId]: answer }));
    queue.current?.enqueue(questionId, answer);
  }

  function submit() {
    if (submitting.current || pending) return;
    setConfirming(false);
    submitting.current = true;
    setSubmitError("");
    startTransition(async () => {
      try {
        await queue.current?.cancelPending();
        await submitAttempt(attemptId, answers);
      } catch (error) {
        unstable_rethrow(error);
        setSubmitError("Submission didn’t finish. Your answers are still here. Check your connection and try again.");
        for (const [questionId, answer] of Object.entries(answers)) queue.current?.enqueue(questionId, answer);
      } finally {
        submitting.current = false;
      }
    });
  }

  const saveLabels: Record<SaveStatus, string> = { idle: "Answers save automatically", waiting: "Unsaved changes…", saving: "Saving answers…", saved: "All answers saved", error: "Couldn’t save your latest changes.", closed: "This attempt is closed" };
  if (!question || !page) return <section className="card"><p className="empty-work">This activity has no questions to answer.</p></section>;
  const current = answers[question.id] ?? "";
  return <div className={`work-layout${passages.length ? " work-layout-english" : ""}`} aria-busy={pending}>
    {passages.map((passage) => <ReadingPanel key={passage.id} passage={passage.body} title={passage.title} />)}
    <section className="card work-card">
      <div className="row-between"><p className="eyebrow">Question {index + 1} of {pages.length}{"topic" in question && question.topic ? ` · ${question.topic}` : ""}</p><span className="save-state" role="status" aria-live="polite">{(saveState === "saving" || pending) && <Spinner />}{pending ? "Submitting your answers…" : saveLabels[saveState]}{saveState === "error" && !pending && <button className="text-button" onClick={() => void queue.current?.flush()}>Retry save</button>}</span></div>
      <div className="progress" role="progressbar" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={pages.length} aria-valuenow={answered}><div style={{ width: `${answered / pages.length * 100}%` }} /></div>
      {page.context.map((block) => block.type === "heading" ? <h3 key={block.id}>{block.text}</h3> : block.type === "text" ? <div className="prose" key={block.id}>{block.body.split(/\n+/).map((line, position) => <p key={position}>{line}</p>)}</div> : null)}
      {question.type !== "fill" && <h2 className="question-heading">{"prompt" in question ? question.prompt : ""}</h2>}
      <fieldset className="answer-controls" disabled={pending || saveState === "closed"}><legend className="sr-only">Your response</legend>
        {question.type === "mcq" && question.numberLine && <NumberLine line={question.numberLine} />}
        {question.type === "mcq" && <fieldset className="choice-list"><legend className="sr-only">Choose one answer</legend>{question.options.map((option) => <label className={`choice ${current === option.id ? "selected" : ""}`} key={option.id}><input type="radio" name={question.id} value={option.id} checked={current === option.id} onChange={() => change(question.id, option.id)} /><span>{option.text}</span></label>)}</fieldset>}
        {question.type === "fill" && <><h2 className="question-heading sr-only">{question.prompt}</h2><FillAnswer block={question} answer={current} onChange={(value) => change(question.id, value)} /></>}
        {question.type === "short" && <label className="answer-label">Your response<textarea rows={10} value={current} onChange={(event) => change(question.id, event.target.value)} placeholder="Write your response here…" /><small>Your tutor will review and score this response.</small></label>}
      </fieldset>
      <div className="question-navigation"><button className="button secondary" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0 || pending}>Previous</button><button className="button primary" onClick={() => setIndex(Math.min(pages.length - 1, index + 1))} disabled={index === pages.length - 1 || pending}>Next</button></div>
    </section>
    <aside className="card work-sidebar">
      <div className="navigator-group"><h3>Question navigator</h3><p className="muted">{answered} of {pages.length} answered</p><div className="question-grid">{pages.map((item, position) => <button key={item.question.id} disabled={pending} className={`${position === index ? "current" : ""} ${(answers[item.question.id] ?? "").trim() ? "answered" : ""}`} onClick={() => setIndex(position)} aria-label={`Question ${position + 1}${(answers[item.question.id] ?? "").trim() ? ", answered" : ""}`}>{position + 1}</button>)}</div></div>
      <div className="submit-panel"><button className="button primary full" disabled={pending || saveState === "closed"} aria-busy={pending} onClick={() => setConfirming(true)}>{pending && <Spinner />}{pending ? "Submitting…" : "Submit assignment"}</button>{submitError && <p className="alert" role="alert">{submitError}</p>}<p className="hint">You can review your answers before submitting. Blank answers receive 0 points.</p></div>
    </aside>
    {confirming && <div className="modal-shim" role="dialog" aria-modal="true" aria-label="Confirm submission"><div className="modal-card">
      <h2>Submit this work?</h2>
      <p className="muted">You have answered {answered} of {pages.length} questions. Explanations appear once you submit.</p>
      <div className="modal-actions"><button type="button" className="button subtle" onClick={() => setConfirming(false)}>Keep working</button><button type="button" className="button primary" onClick={submit}>Submit</button></div>
    </div></div>}
  </div>;
}
