import { ActionForm, SubmitButton } from "@/components/action-form";
import Link from "@/components/pending-link";
import { notFound } from "next/navigation";
import { startAttempt } from "@/app/actions/student";
import { questionBlocks } from "@/content/blocks";
import { requireRole } from "@/lib/auth";
import { readBlocks, fillSegments, parseFill } from "@/lib/blocks";
import { db } from "@/lib/db";
import { studentBlocks, summaryByTopic } from "@/lib/grading";
import { BlockView } from "@/components/block-view";
import { AnswerSheet } from "@/components/answer-sheet";
import { Badge, PageHeading, dateLabel } from "@/components/ui";

export default async function StudentAssignment({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ attempt?: string }> }) {
  const student = await requireRole("STUDENT");
  const { id } = await params;
  const query = await searchParams;
  const assignment = await db.assignment.findFirst({
    where: { id, studentId: student.id, archivedAt: null, availableAt: { lte: new Date() } },
    include: { attempts: { where: { deletedAt: null }, orderBy: { number: "desc" }, include: { responses: true } } },
  });
  if (!assignment) notFound();

  const blocks = readBlocks(assignment.blocks);
  const questions = questionBlocks(blocks);
  const isClass = assignment.kind === "CLASS_PLAN";
  const selected = query.attempt
    ? assignment.attempts.find((item) => item.id === query.attempt)
    : assignment.attempts.find((item) => item.status === "IN_PROGRESS") ?? assignment.attempts[0];
  if (query.attempt && !selected) notFound();
  const canStart = questions.length > 0 && !assignment.attempts.some((item) => item.status === "IN_PROGRESS") && assignment.attempts.length < assignment.maxAttempts;

  return <>
    <PageHeading eyebrow={`${isClass ? "Class" : "Homework"} · ${assignment.subject === "MATH" ? "Math" : "English"}`} title={assignment.title}>
      {isClass ? dateLabel(assignment.scheduledAt) : assignment.dueAt ? `Due ${dateLabel(assignment.dueAt)}` : "No due date"}{assignment.summary ? ` · ${assignment.summary}` : ""}
    </PageHeading>

    {isClass && selected?.status !== "IN_PROGRESS" && <section className="section"><h2>What we are covering</h2>
      <div className="card"><BlockView blocks={blocks.filter((block) => !questionBlocks([block]).length)} /></div>
    </section>}

    {isClass && <section className="card section"><h2>Notes from your tutor</h2>
      {assignment.notesPublishedAt ? <div className="prose">{assignment.notes.split(/\n+/).map((line, index) => <p key={index}>{line}</p>)}</div> : <p className="muted">Your tutor has not published notes for this class yet.</p>}
    </section>}

    {questions.length > 0 && <div className="attempt-bar">
      <div><strong>Attempts</strong><div className="attempt-links">{assignment.attempts.map((item) => <Link key={item.id} className={selected?.id === item.id ? "active" : ""} href={`/student/assignments/${id}?attempt=${item.id}`}>Attempt {item.number} · {item.status === "SUBMITTED" ? "submitted" : "in progress"}</Link>)}</div></div>
      {canStart && <ActionForm action={startAttempt}><input type="hidden" name="assignmentId" value={id} /><SubmitButton className="button secondary" pendingLabel="Starting…">Start {assignment.attempts.length ? "another" : "first"} attempt</SubmitButton></ActionForm>}
    </div>}

    {questions.length > 0 && !selected && <section className="card empty-work"><h2>Ready to begin?</h2>
      <p>There {questions.length === 1 ? "is 1 question" : `are ${questions.length} questions`}. Your answers save as you work.</p>
      <ActionForm action={startAttempt}><input type="hidden" name="assignmentId" value={id} /><SubmitButton className="button primary" pendingLabel="Starting…">Start now</SubmitButton></ActionForm>
    </section>}

    {selected?.status === "IN_PROGRESS" && <AnswerSheet key={selected.id} attemptId={selected.id}
      activity={{ title: assignment.title, subject: assignment.subject, blocks: studentBlocks(blocks) }}
      initialAnswers={Object.fromEntries(selected.responses.map((response) => [response.questionId, response.answer]))} />}

    {selected?.status === "SUBMITTED" && (() => {
      const responses = new Map(selected.responses.map((response) => [response.questionId, response]));
      const topics = summaryByTopic(blocks, selected.responses);
      const earned = topics.reduce((sum, item) => sum + item.earned, 0);
      const total = topics.reduce((sum, item) => sum + item.total, 0);
      const pending = topics.reduce((sum, item) => sum + item.pending, 0);
      return <>
        <section className="card result-hero">
          <div><p className="eyebrow">Attempt {selected.number} submitted</p><h2>Your review</h2><p className="muted">Submitted {dateLabel(selected.submittedAt)}. Explanations are available now.</p></div>
          <div className="result-score"><strong>{earned} / {total - pending}</strong>{pending ? <span>{pending} points awaiting your tutor</span> : <span>Final score</span>}</div>
        </section>
        <div className="topic-grid section">{topics.map((item) => <div className="topic-card" key={item.topic}><strong>{item.topic}</strong><span>{item.earned} / {item.total - item.pending}{item.pending ? ` · ${item.pending} pending` : ""}</span></div>)}</div>
        <section className="section"><h2>Questions and explanations</h2><div className="review-list">{questions.map((question, index) => {
          const response = responses.get(question.id);
          const given = response?.answer ?? "";
          const correct = question.type === "mcq"
            ? question.options.find((option) => option.id === question.correctOptionId)?.text
            : question.type === "fill" ? question.blanks.map((blank) => blank.accepted.join(" or ")).join(" · ") : null;
          const studentAnswer = question.type === "mcq"
            ? question.options.find((option) => option.id === given)?.text ?? "No answer"
            : question.type === "fill"
              ? question.blanks.map((blank, position) => `${position + 1}. ${parseFill(question, given)[blank.id] || "—"}`).join("   ") || "No answer"
              : given || "No answer";
          return <article className="card review-item" key={question.id}>
            <div className="row-between"><h3>{index + 1}. {question.type === "fill" ? fillSegments(question).map((segment, position) => "text" in segment ? <span key={position}>{segment.text}</span> : <span className="blank-slot" key={position}>____</span>) : question.prompt}</h3>
              <Badge tone={response?.score == null ? "amber" : response.score === question.points ? "green" : "neutral"}>{response?.score == null ? "Awaiting review" : `${response.score}/${question.points}`}</Badge></div>
            <p className="hint">{question.topic || "General"}</p>
            <p><strong>Your answer</strong></p><div className="answer-box">{studentAnswer}</div>
            {correct && <p><strong>Correct answer:</strong> {correct}</p>}
            {question.explanation && <p><strong>Explanation:</strong> {question.explanation}</p>}
            {question.type === "short" && <>
              {question.rubric.length > 0 && <><p><strong>What your tutor looks for</strong></p><ul>{question.rubric.map((item) => <li key={item}>{item}</li>)}</ul></>}
              {response?.reviewedAt && <p className="teacher-feedback"><strong>Tutor feedback:</strong> {response.feedback || "Reviewed"}</p>}
            </>}
          </article>;
        })}</div></section>
      </>;
    })()}
  </>;
}
