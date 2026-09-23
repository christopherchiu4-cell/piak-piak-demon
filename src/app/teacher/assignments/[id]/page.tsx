import { ActionForm, SubmitButton } from "@/components/action-form";
import { notFound } from "next/navigation";
import { gradeWritten, reopenAssignment, trashSubmission } from "@/app/actions/teacher";
import { getActivity } from "@/content/catalog";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { summaryByTopic } from "@/lib/grading";
import { Badge, PageHeading, dateLabel } from "@/components/ui";

export default async function AssignmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const teacher = await requireRole("TEACHER");
  const { id } = await params;
  const assignment = await db.assignment.findFirst({ where: { id, teacherId: teacher.id }, include: {
    student: true, classSession: true, attempts: { where: { deletedAt: null }, orderBy: { number: "desc" }, include: { responses: true } },
  } });
  if (!assignment) notFound();
  const activity = getActivity(assignment.contentKey, assignment.contentVersion);
  if (!activity) return <p className="alert">Content version {assignment.contentKey}@{assignment.contentVersion} is missing. Restore it in source and redeploy.</p>;
  return <><PageHeading eyebrow={`${assignment.kind === "HOMEWORK" ? "Homework" : "Classwork"} · ${assignment.subject === "MATH" ? "Math" : "English"}`} title={activity.title}>Assigned to {assignment.student.displayName} · {assignment.dueAt ? `Due ${dateLabel(assignment.dueAt)}` : "No due date"}</PageHeading>
    <div className="card row-between"><div><strong>Attempts allowed: {assignment.maxAttempts}</strong><p className="muted">{assignment.attempts.length} started · {assignment.attempts.filter((item) => item.status === "SUBMITTED").length} submitted</p></div><ActionForm action={reopenAssignment}><input type="hidden" name="assignmentId" value={id} /><SubmitButton className="button secondary" pendingLabel="Reopening…">Allow another attempt</SubmitButton></ActionForm></div>
    {assignment.attempts.length ? assignment.attempts.map((attempt) => {
      const responses = new Map(attempt.responses.map((response) => [response.questionId, response]));
      const topics = summaryByTopic(activity, attempt.responses);
      const pending = topics.reduce((sum, topic) => sum + topic.pending, 0);
      const earned = topics.reduce((sum, topic) => sum + topic.earned, 0);
      const total = topics.reduce((sum, topic) => sum + topic.total, 0);
      return <section key={attempt.id} className="section"><div className="row-between"><h2>Attempt {attempt.number}</h2><div className="attempt-actions"><Badge tone={attempt.status === "SUBMITTED" ? "green" : "amber"}>{attempt.status === "SUBMITTED" ? `Submitted ${dateLabel(attempt.submittedAt)}` : "In progress"}</Badge>{attempt.status === "SUBMITTED" && <ActionForm action={trashSubmission} confirmMessage={`Move attempt ${attempt.number} to Trash? It will be hidden from the student and progress reports. You can restore it later.`} successMessage="Submission moved to Trash."><input type="hidden" name="attemptId" value={attempt.id} /><SubmitButton className="button danger subtle" pendingLabel="Moving…">Move to Trash</SubmitButton></ActionForm>}</div></div>
        {attempt.status === "SUBMITTED" && <><div className="card score-summary"><strong>{earned} / {total - pending}</strong><span>{pending ? `${pending} points awaiting review` : "Final score"}</span></div><div className="topic-grid">{topics.map((topic) => <div className="topic-card" key={topic.topic}><strong>{topic.topic}</strong><span>{topic.earned} / {topic.total - topic.pending}{topic.pending ? ` · ${topic.pending} pending` : ""}</span></div>)}</div></>}
        <div className="review-list">{activity.questions.map((question, index) => {
          const response = responses.get(question.id);
          const studentAnswer = question.type === "choice"
            ? question.options.find((option) => option.id === response?.answer)?.text ?? "No answer"
            : response?.answer || "No answer";
          const correctAnswer = question.type === "choice"
            ? question.options.find((option) => option.id === question.correctOptionId)?.text
            : question.type === "number" ? question.acceptedAnswers.join(" or ") : null;
          const result = attempt.status === "IN_PROGRESS" ? "In progress"
            : response?.score == null ? "Pending review"
            : question.type === "written" ? `${response.score}/${question.points}`
            : response.score === question.points ? "Correct" : "Incorrect";
          return <article className="card review-item" key={question.id}>
            <div className="row-between"><h3>{index + 1}. {question.prompt}</h3><Badge tone={response?.score == null ? "amber" : response.score === question.points ? "green" : "neutral"}>{result}</Badge></div>
            <p className="hint">{question.topic}</p><p><strong>Student answer</strong></p><div className="answer-box">{studentAnswer}</div>
            {attempt.status === "SUBMITTED" && <>
              {correctAnswer && <p><strong>Correct answer:</strong> {correctAnswer}</p>}
              <p><strong>Explanation:</strong> {question.explanation}</p>
              {question.type === "written" && <><p><strong>Review criteria:</strong></p><ul>{question.rubric.map((item) => <li key={item}>{item}</li>)}</ul>
                <ActionForm action={gradeWritten} className="grade-form"><input type="hidden" name="responseId" value={response?.id ?? ""} /><label>Score (0–{question.points})<input type="number" min="0" max={question.points} name="score" defaultValue={response?.score ?? ""} required /></label><label>Feedback<textarea name="feedback" rows={3} defaultValue={response?.feedback ?? ""} /></label><SubmitButton className="button primary" disabled={!response} pendingLabel="Saving grade…">Save grade</SubmitButton></ActionForm>
              </>}
            </>}
          </article>;
        })}</div>
      </section>;
    }) : <section className="card section"><p className="muted">No active attempts. Removed submissions can be restored from Trash.</p></section>}
  </>;
}
