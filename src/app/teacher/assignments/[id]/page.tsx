import Link from "@/components/pending-link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { notFound } from "next/navigation";
import { archiveAssignment, gradeWritten, markAttendance, refreshAssignmentContent, reopenAssignment, restoreSubmission, saveClassNotes, trashSubmission } from "@/app/actions/teacher";
import { BlockView } from "@/components/block-view";
import { questionBlocks } from "@/content/blocks";
import { readBlocks, fillSegments, parseFill } from "@/lib/blocks";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { summaryByTopic } from "@/lib/grading";
import { Badge, EmptyState, PageHeading, dateLabel } from "@/components/ui";

export default async function AssignmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const teacher = await requireRole("TEACHER");
  const { id } = await params;
  const assignment = await db.assignment.findFirst({ where: { id, teacherId: teacher.id }, include: {
    student: true, material: true, attempts: { orderBy: { number: "desc" }, include: { responses: true } },
  } });
  if (!assignment) notFound();

  const blocks = readBlocks(assignment.blocks);
  const questions = questionBlocks(blocks);
  const attempts = assignment.attempts.filter((attempt) => !attempt.deletedAt);
  const trashed = assignment.attempts.filter((attempt) => attempt.deletedAt);
  const isClass = assignment.kind === "CLASS_PLAN";
  const stale = assignment.material && assignment.material.version !== assignment.materialVersion && attempts.length === 0;

  return <>
    <PageHeading
      eyebrow={<Link className="small-link" href={`/teacher/students/${assignment.studentId}`}>&larr; {assignment.student.displayName}</Link>}
      title={assignment.title}>
      {isClass ? "Class" : "Homework"} · {assignment.subject === "MATH" ? "Math" : "English"} · {isClass ? dateLabel(assignment.scheduledAt) : assignment.dueAt ? `Due ${dateLabel(assignment.dueAt)}` : "No due date"}
    </PageHeading>

    <div className="card row-between">
      <div><strong>{isClass ? (assignment.attendedAt ? `Attended ${dateLabel(assignment.attendedAt)}` : "Not marked as attended") : `Attempts allowed: ${assignment.maxAttempts}`}</strong>
        <p className="muted">{questions.length} question{questions.length === 1 ? "" : "s"} · {attempts.length} started · {attempts.filter((item) => item.status === "SUBMITTED").length} submitted</p></div>
      <div className="attempt-actions">
        {isClass && <ActionForm action={markAttendance} feedbackPlacement="toast" successMessage="Attendance updated."><input type="hidden" name="assignmentId" value={id} /><SubmitButton className="button secondary" pendingLabel="Saving…">{assignment.attendedAt ? "Unmark attendance" : "Mark attended"}</SubmitButton></ActionForm>}
        {questions.length > 0 && <ActionForm action={reopenAssignment} feedbackPlacement="toast" successMessage="Another attempt allowed."><input type="hidden" name="assignmentId" value={id} /><SubmitButton className="button secondary" pendingLabel="Reopening…">Allow another attempt</SubmitButton></ActionForm>}
        <ActionForm action={archiveAssignment} feedbackPlacement="toast" successMessage="Removed." confirmMessage="Remove this from the student's list? Their submitted work is kept."><input type="hidden" name="assignmentId" value={id} /><SubmitButton className="button danger subtle" pendingLabel="Removing…">{assignment.archivedAt ? "Restore" : "Remove"}</SubmitButton></ActionForm>
      </div>
    </div>

    {stale && <div className="card info-note"><p>The source material has changed since this was handed out (assigned v{assignment.materialVersion}, library is at v{assignment.material!.version}). Nothing has been attempted yet, so it is safe to update.</p>
      <ActionForm action={refreshAssignmentContent} feedbackPlacement="toast" successMessage="Updated to the latest version."><input type="hidden" name="assignmentId" value={id} /><SubmitButton className="button subtle" pendingLabel="Updating…">Update to latest</SubmitButton></ActionForm>
    </div>}

    {isClass && <>
      <section className="section"><h2>Plan</h2><div className="card"><BlockView blocks={blocks.filter((block) => !questionBlocks([block]).length)} /></div></section>
      <section className="card section"><h2>After-lesson notes</h2>
        <ActionForm action={saveClassNotes} className="form-stack" successMessage="Notes saved.">
          <input type="hidden" name="assignmentId" value={id} />
          <label className="field">Notes<textarea name="notes" rows={6} defaultValue={assignment.notes} placeholder="What you covered, what to work on next." /></label>
          <div className="attempt-actions">
            <SubmitButton className="button secondary" name="publish" value="no" pendingLabel="Saving…">Save draft</SubmitButton>
            <SubmitButton className="button primary" name="publish" value="yes" pendingLabel="Publishing…">Publish to student</SubmitButton>
          </div>
          <p className="hint">{assignment.notesPublishedAt ? `Published ${dateLabel(assignment.notesPublishedAt)}. The student can see these.` : "Drafts are private until you publish."}</p>
        </ActionForm>
      </section>
    </>}

    {questions.length === 0 ? (!isClass && <EmptyState>This has no questions yet.</EmptyState>) : attempts.length ? attempts.map((attempt) => {
      const responses = new Map(attempt.responses.map((response) => [response.questionId, response]));
      const topics = summaryByTopic(blocks, attempt.responses);
      const pending = topics.reduce((sum, topic) => sum + topic.pending, 0);
      const earned = topics.reduce((sum, topic) => sum + topic.earned, 0);
      const total = topics.reduce((sum, topic) => sum + topic.total, 0);
      return <section key={attempt.id} className="section">
        <div className="row-between"><h2>Attempt {attempt.number}</h2><div className="attempt-actions">
          <Badge tone={attempt.status === "SUBMITTED" ? "green" : "amber"}>{attempt.status === "SUBMITTED" ? `Submitted ${dateLabel(attempt.submittedAt)}` : "In progress"}</Badge>
          {attempt.status === "SUBMITTED" && <ActionForm action={trashSubmission} confirmMessage={`Move attempt ${attempt.number} to the bin? It is hidden from the student and from progress until you restore it.`} feedbackPlacement="toast" successMessage="Moved to the bin."><input type="hidden" name="attemptId" value={attempt.id} /><SubmitButton className="button danger subtle" pendingLabel="Moving…">Move to bin</SubmitButton></ActionForm>}
        </div></div>
        {attempt.status === "SUBMITTED" && <>
          <div className="card score-summary"><strong>{earned} / {total - pending}</strong><span>{pending ? `${pending} points awaiting your marking` : "Final score"}</span></div>
          <div className="topic-grid">{topics.map((topic) => <div className="topic-card" key={topic.topic}><strong>{topic.topic}</strong><span>{topic.earned} / {topic.total - topic.pending}{topic.pending ? ` · ${topic.pending} pending` : ""}</span></div>)}</div>
        </>}
        <div className="review-list">{questions.map((question, index) => {
          const response = responses.get(question.id);
          const given = response?.answer ?? "";
          const studentAnswer = question.type === "mcq"
            ? question.options.find((option) => option.id === given)?.text ?? "No answer"
            : question.type === "fill"
              ? question.blanks.map((blank, position) => `${position + 1}. ${parseFill(question, given)[blank.id] || "—"}`).join("   ") || "No answer"
              : given || "No answer";
          const correctAnswer = question.type === "mcq"
            ? question.options.find((option) => option.id === question.correctOptionId)?.text
            : question.type === "fill" ? question.blanks.map((blank) => blank.accepted.join(" or ")).join(" · ") : null;
          const result = attempt.status === "IN_PROGRESS" ? "In progress"
            : response?.score == null ? "Needs marking"
            : question.type === "short" ? `${response.score}/${question.points}`
            : response.score === question.points ? "Correct" : response.score > 0 ? `${response.score}/${question.points}` : "Incorrect";
          return <article className="card review-item" key={question.id}>
            <div className="row-between"><h3>{index + 1}. {question.type === "fill" ? fillSegments(question).map((segment, position) => "text" in segment ? <span key={position}>{segment.text}</span> : <span className="blank-slot" key={position}>____</span>) : question.prompt}</h3>
              <Badge tone={response?.score == null ? "amber" : response.score === question.points ? "green" : "neutral"}>{result}</Badge></div>
            <p className="hint">{question.topic || "General"}</p>
            <p><strong>Student answer</strong></p><div className="answer-box">{studentAnswer}</div>
            {attempt.status === "SUBMITTED" && <>
              {correctAnswer && <p><strong>Correct answer:</strong> {correctAnswer}</p>}
              {question.explanation && <p><strong>Explanation:</strong> {question.explanation}</p>}
              {question.type === "short" && <>
                {question.rubric.length > 0 && <><p><strong>Marking criteria:</strong></p><ul>{question.rubric.map((item) => <li key={item}>{item}</li>)}</ul></>}
                <ActionForm action={gradeWritten} className="grade-form" successMessage="Grade saved.">
                  <input type="hidden" name="responseId" value={response?.id ?? ""} />
                  <label>Score (0–{question.points})<input type="number" min="0" max={question.points} name="score" defaultValue={response?.score ?? ""} required /></label>
                  <label>Feedback<textarea name="feedback" rows={3} defaultValue={response?.feedback ?? ""} /></label>
                  <SubmitButton className="button primary" disabled={!response} pendingLabel="Saving…">Save grade</SubmitButton>
                </ActionForm>
              </>}
            </>}
          </article>;
        })}</div>
      </section>;
    }) : <EmptyState>Not started yet.</EmptyState>}

    {trashed.length > 0 && <details className="card"><summary>{trashed.length} attempt{trashed.length === 1 ? "" : "s"} in the bin</summary>
      <div className="list">{trashed.map((attempt) => <div className="list-row" key={attempt.id}>
        <div className="grow"><strong>Attempt {attempt.number}</strong><p className="row-meta">Removed {dateLabel(attempt.deletedAt)}</p></div>
        <ActionForm action={restoreSubmission} feedbackPlacement="toast" successMessage="Restored."><input type="hidden" name="attemptId" value={attempt.id} /><SubmitButton className="text-button" pendingLabel="Restoring…">Restore</SubmitButton></ActionForm>
      </div>)}</div>
    </details>}
  </>;
}
