"use client";

import { useRef, useState, useTransition } from "react";
import { saveResponse, submitAttempt } from "@/app/actions/student";
import type { PublicQuestion, StudentActivity } from "@/lib/grading";

function NumberLine({ line }: { line: NonNullable<PublicQuestion["numberLine"]> }) {
  const x = (value: number) => 45 + ((value - line.min) / (line.max - line.min)) * 590;
  return <figure className="number-line"><svg viewBox="0 0 680 145" role="img" aria-label={`Number line from ${line.min} to ${line.max} with points ${line.points.map((point) => `${point.label} at ${point.value}`).join(", ")}`}><line x1="30" y1="78" x2="650" y2="78" stroke="currentColor" strokeWidth="2" />{line.ticks.map((tick) => <g key={tick}><line x1={x(tick)} x2={x(tick)} y1="70" y2="86" stroke="currentColor" /><text x={x(tick)} y="115" textAnchor="middle">{tick}</text></g>)}{line.points.map((point) => <g key={point.label}><circle cx={x(point.value)} cy="78" r="6" fill="#3158d3" /><text x={x(point.value)} y="48" textAnchor="middle" fill="#3158d3" fontWeight="700">{point.label}</text></g>)}</svg><figcaption>Read the scale carefully.</figcaption></figure>;
}

export function AnswerSheet({ attemptId, activity, initialAnswers }: { attemptId: string; activity: StudentActivity; initialAnswers: Record<string, string> }) {
  const [answers, setAnswers] = useState(initialAnswers);
  const [index, setIndex] = useState(0);
  const [saveState, setSaveState] = useState("Answers save automatically");
  const [pending, startTransition] = useTransition();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const question = activity.questions[index];
  const answered = activity.questions.filter((item) => (answers[item.id] ?? "").trim()).length;

  function change(questionId: string, answer: string) {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
    setSaveState("Saving…");
    const previous = timers.current.get(questionId);
    if (previous) clearTimeout(previous);
    timers.current.set(questionId, setTimeout(() => {
      startTransition(async () => {
        try {
          const result = await saveResponse(attemptId, questionId, answer);
          setSaveState(result.saved ? "Saved" : "This attempt is closed");
        } catch {
          setSaveState("Could not save. Check your connection before leaving.");
        }
      });
    }, 500));
  }

  function submit() {
    if (!window.confirm(`Submit ${answered} of ${activity.questions.length} answered questions? Explanations will appear after submission.`)) return;
    for (const timer of timers.current.values()) clearTimeout(timer);
    startTransition(() => { void submitAttempt(attemptId, answers); });
  }

  return <div className="work-layout"><section className="card work-card"><div className="row-between"><p className="eyebrow">Question {index + 1} of {activity.questions.length} · {question.topic}</p><span className="save-state" aria-live="polite">{saveState}</span></div><div className="progress" role="progressbar" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={activity.questions.length} aria-valuenow={answered}><div style={{ width: `${answered / activity.questions.length * 100}%` }} /></div><h2 className="question-heading">{question.prompt}</h2>
    {question.numberLine && <NumberLine line={question.numberLine} />}
    {question.type === "choice" && <fieldset className="choice-list"><legend className="sr-only">Choose one answer</legend>{question.options?.map((option) => <label className={`choice ${answers[question.id] === option.id ? "selected" : ""}`} key={option.id}><input type="radio" name={question.id} value={option.id} checked={answers[question.id] === option.id} onChange={() => change(question.id, option.id)} /><span>{option.text}</span></label>)}</fieldset>}
    {question.type === "number" && <label className="answer-label">Your answer<input className="number-answer" inputMode="decimal" value={answers[question.id] ?? ""} onChange={(event) => change(question.id, event.target.value)} placeholder="Enter a number" /></label>}
    {question.type === "written" && <label className="answer-label">Your response<textarea rows={10} value={answers[question.id] ?? ""} onChange={(event) => change(question.id, event.target.value)} placeholder="Write your response here…" /><small>Your tutor will review and score this response.</small></label>}
    <div className="question-navigation"><button className="button secondary" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}>Previous</button><button className="button primary" onClick={() => setIndex(Math.min(activity.questions.length - 1, index + 1))} disabled={index === activity.questions.length - 1}>Next</button></div></section>
    <aside className="card work-sidebar"><h3>Question navigator</h3><p className="muted">{answered} of {activity.questions.length} answered</p><div className="question-grid">{activity.questions.map((item, position) => <button key={item.id} className={`${position === index ? "current" : ""} ${(answers[item.id] ?? "").trim() ? "answered" : ""}`} onClick={() => setIndex(position)} aria-label={`Question ${position + 1}${(answers[item.id] ?? "").trim() ? ", answered" : ""}`}>{position + 1}</button>)}</div>{activity.passage && <details className="passage-panel" open><summary>Reading passage</summary><p>{activity.passage}</p></details>}<button className="button primary full" disabled={pending} onClick={submit}>{pending ? "Submitting…" : "Submit assignment"}</button><p className="hint">You can review your answers before submitting. Blank answers receive 0 points.</p></aside></div>;
}
