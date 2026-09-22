import Link from "next/link";
import { notFound } from "next/navigation";
import { startAttempt } from "@/app/actions/student";
import { getActivity } from "@/content/catalog";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { studentActivity, summaryByTopic } from "@/lib/grading";
import { AnswerSheet } from "@/components/answer-sheet";
import { Badge, PageHeading, dateLabel } from "@/components/ui";

export default async function StudentAssignment({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ attempt?: string }> }) {
  const student = await requireRole("STUDENT");
  const { id } = await params;
  const query = await searchParams;
  const assignment = await db.assignment.findFirst({ where: { id, studentId: student.id, availableAt: { lte: new Date() } }, include: { attempts: { orderBy: { number: "desc" }, include: { responses: true } } } });
  if (!assignment) notFound();
  const activity = getActivity(assignment.contentKey, assignment.contentVersion);
  if (!activity) return <p className="alert">This activity version is temporarily unavailable. Ask your tutor to restore it.</p>;
  const selected = query.attempt ? assignment.attempts.find((item) => item.id === query.attempt) : assignment.attempts.find((item) => item.status === "IN_PROGRESS") ?? assignment.attempts[0];
  const canStart = !assignment.attempts.some((item) => item.status === "IN_PROGRESS") && assignment.attempts.length < assignment.maxAttempts;
  return <><PageHeading eyebrow={`${assignment.kind === "HOMEWORK" ? "Homework" : "Classwork"} · ${activity.subject === "MATH" ? "Math" : "English"}`} title={activity.title}>{activity.instructions}</PageHeading>
    {activity.passage && selected?.status === "SUBMITTED" && <section className="card passage-main"><h2>Reading passage</h2><p>{activity.passage}</p></section>}
    <div className="attempt-bar"><div><strong>Attempts</strong><div className="attempt-links">{assignment.attempts.map((item) => <Link key={item.id} className={selected?.id === item.id ? "active" : ""} href={`/student/assignments/${id}?attempt=${item.id}`}>Attempt {item.number} · {item.status === "SUBMITTED" ? "submitted" : "in progress"}</Link>)}</div></div>{canStart && <form action={startAttempt}><input type="hidden" name="assignmentId" value={id} /><button className="button secondary">Start {assignment.attempts.length ? "another" : "first"} attempt</button></form>}</div>
    {!selected && <section className="card empty-work"><h2>Ready to begin?</h2><p>This activity has {activity.questions.length} questions. Your answers will save as you work.</p><form action={startAttempt}><input type="hidden" name="assignmentId" value={id} /><button className="button primary">Start assignment</button></form></section>}
    {selected?.status === "IN_PROGRESS" && <AnswerSheet attemptId={selected.id} activity={studentActivity(activity)} initialAnswers={Object.fromEntries(selected.responses.map((response) => [response.questionId, response.answer]))} />}
    {selected?.status === "SUBMITTED" && (() => {
      const responses = new Map(selected.responses.map((response) => [response.questionId, response]));
      const topics = summaryByTopic(activity, selected.responses);
      const earned = topics.reduce((sum, item) => sum + item.earned, 0);
      const total = topics.reduce((sum, item) => sum + item.total, 0);
      const pending = topics.reduce((sum, item) => sum + item.pending, 0);
      return <><section className="card result-hero"><div><p className="eyebrow">Attempt {selected.number} submitted</p><h2>Your review</h2><p className="muted">Submitted {dateLabel(selected.submittedAt)}. Explanations are available now.</p></div><div className="result-score"><strong>{earned} / {total - pending}</strong>{pending ? <span>{pending} points awaiting teacher review</span> : <span>Final score</span>}</div></section>
        <div className="topic-grid section">{topics.map((item) => <div className="topic-card" key={item.topic}><strong>{item.topic}</strong><span>{item.earned} / {item.total - item.pending}{item.pending ? ` · ${item.pending} pending` : ""}</span></div>)}</div>
        <section className="section"><h2>Questions and explanations</h2><div className="review-list">{activity.questions.map((question, index) => {
          const response = responses.get(question.id);
          const correct = question.type === "choice" ? question.options.find((option) => option.id === question.correctOptionId)?.text : question.type === "number" ? question.acceptedAnswers.join(" or ") : null;
          const studentAnswer = question.type === "choice" ? question.options.find((option) => option.id === response?.answer)?.text ?? "No answer" : response?.answer || "No answer";
          return <article className="card review-item" key={question.id}><div className="row-between"><h3>{index + 1}. {question.prompt}</h3><Badge tone={response?.score == null ? "amber" : response.score === question.points ? "green" : "neutral"}>{response?.score == null ? "Awaiting review" : `${response.score}/${question.points}`}</Badge></div><p className="hint">{question.topic}</p><p><strong>Your answer</strong></p><div className="answer-box">{studentAnswer}</div>{correct && <p><strong>Correct answer:</strong> {correct}</p>}<p><strong>Explanation:</strong> {question.explanation}</p>{question.type === "written" && <><p><strong>Review checklist</strong></p><ul>{question.rubric.map((item) => <li key={item}>{item}</li>)}</ul>{response?.reviewedAt && <p className="teacher-feedback"><strong>Teacher feedback:</strong> {response.feedback || "Reviewed"}</p>}</>}</article>;
        })}</div></section></>;
    })()}
  </>;
}
