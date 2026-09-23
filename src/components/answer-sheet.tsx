"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { saveResponse, submitAttempt } from "@/app/actions/student";
import type { PublicQuestion, StudentActivity } from "@/lib/grading";
import { AutosaveQueue, type SaveStatus } from "@/lib/autosave";
import { Spinner } from "./loading-indicator";
import { ReadingPanel } from "./reading-panel";

function NumberLine({ line }: { line: NonNullable<PublicQuestion["numberLine"]> }) {
  const x = (value: number) => 45 + ((value - line.min) / (line.max - line.min)) * 590;
  return <figure className="number-line"><svg viewBox="0 0 680 145" role="img" aria-label={`Number line from ${line.min} to ${line.max} with points ${line.points.map((point) => `${point.label} at ${point.value}`).join(", ")}`}><line x1="30" y1="78" x2="650" y2="78" stroke="currentColor" strokeWidth="2" />{line.ticks.map((tick) => <g key={tick}><line x1={x(tick)} x2={x(tick)} y1="70" y2="86" stroke="currentColor" /><text x={x(tick)} y="115" textAnchor="middle">{tick}</text></g>)}{line.points.map((point) => <g key={point.label}><circle cx={x(point.value)} cy="78" r="6" fill="currentColor" /><text x={x(point.value)} y="48" textAnchor="middle" fill="currentColor" fontWeight="700">{point.label}</text></g>)}</svg><figcaption>Read the scale carefully.</figcaption></figure>;
}

export function AnswerSheet({ attemptId, activity, initialAnswers }: { attemptId: string; activity: StudentActivity; initialAnswers: Record<string, string> }) {
  const [answers, setAnswers] = useState(initialAnswers);
  const [index, setIndex] = useState(0);
  const [saveState, setSaveState] = useState<SaveStatus>("idle");
  const [submitError, setSubmitError] = useState("");
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
  const question = activity.questions[index];
  const answered = activity.questions.filter((item) => (answers[item.id] ?? "").trim()).length;

  function change(questionId: string, answer: string) {
    if (submitting.current) return;
    setAnswers((current) => ({ ...current, [questionId]: answer }));
    queue.current?.enqueue(questionId, answer);
  }

  function submit() {
    if (submitting.current || pending) return;
    if (!window.confirm(`Submit ${answered} of ${activity.questions.length} answered questions? Explanations will appear after submission.`)) return;
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
  return <div className={`work-layout${activity.subject === "ENGLISH" ? " work-layout-english" : ""}`} aria-busy={pending}>{activity.passage && <ReadingPanel passage={activity.passage} />}<section className="card work-card"><div className="row-between"><p className="eyebrow">Question {index + 1} of {activity.questions.length} · {question.topic}</p><span className="save-state" role="status" aria-live="polite">{(saveState === "saving" || pending) && <Spinner />}{pending ? "Submitting your answers…" : saveLabels[saveState]}{saveState === "error" && !pending && <button className="text-button" onClick={() => void queue.current?.flush()}>Retry save</button>}</span></div><div className="progress" role="progressbar" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={activity.questions.length} aria-valuenow={answered}><div style={{ width: `${answered / activity.questions.length * 100}%` }} /></div><h2 className="question-heading">{question.prompt}</h2>
    <fieldset className="answer-controls" disabled={pending || saveState === "closed"}><legend className="sr-only">Your response</legend>
    {question.numberLine && <NumberLine line={question.numberLine} />}
    {question.type === "choice" && <fieldset className="choice-list"><legend className="sr-only">Choose one answer</legend>{question.options?.map((option) => <label className={`choice ${answers[question.id] === option.id ? "selected" : ""}`} key={option.id}><input type="radio" name={question.id} value={option.id} checked={answers[question.id] === option.id} onChange={() => change(question.id, option.id)} /><span>{option.text}</span></label>)}</fieldset>}
    {question.type === "number" && <label className="answer-label">Your answer<input className="number-answer" inputMode="decimal" value={answers[question.id] ?? ""} onChange={(event) => change(question.id, event.target.value)} placeholder="Enter a number" /></label>}
    {question.type === "written" && <label className="answer-label">Your response<textarea rows={10} value={answers[question.id] ?? ""} onChange={(event) => change(question.id, event.target.value)} placeholder="Write your response here…" /><small>Your tutor will review and score this response.</small></label>}
    </fieldset><div className="question-navigation"><button className="button secondary" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0 || pending}>Previous</button><button className="button primary" onClick={() => setIndex(Math.min(activity.questions.length - 1, index + 1))} disabled={index === activity.questions.length - 1 || pending}>Next</button></div></section>
    <aside className="card work-sidebar"><div className="navigator-group"><h3>Question navigator</h3><p className="muted">{answered} of {activity.questions.length} answered</p><div className="question-grid">{activity.questions.map((item, position) => <button key={item.id} disabled={pending} className={`${position === index ? "current" : ""} ${(answers[item.id] ?? "").trim() ? "answered" : ""}`} onClick={() => setIndex(position)} aria-label={`Question ${position + 1}${(answers[item.id] ?? "").trim() ? ", answered" : ""}`}>{position + 1}</button>)}</div></div><div className="submit-panel"><button className="button primary full" disabled={pending || saveState === "closed"} aria-busy={pending} onClick={submit}>{pending && <Spinner />}{pending ? "Submitting…" : "Submit assignment"}</button>{submitError && <p className="alert" role="alert">{submitError}</p>}<p className="hint">You can review your answers before submitting. Blank answers receive 0 points.</p></div></aside></div>;
}
