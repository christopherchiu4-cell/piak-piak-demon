import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActivity } from "@/content/catalog";
import { restoreSubmission } from "@/app/actions/teacher";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { PageHeading, Badge, dateLabel } from "@/components/ui";
import Link from "@/components/pending-link";

export default async function TrashPage() {
  const teacher = await requireRole("TEACHER");
  const attempts = await db.attempt.findMany({ where: { deletedAt: { not: null }, assignment: { teacherId: teacher.id } }, include: { assignment: { include: { student: true } } }, orderBy: { deletedAt: "desc" } });
  return <><PageHeading eyebrow="Room to reconsider" title="Submission trash">Removed submissions stay here until you restore them. Their answers, scores, and feedback are kept together.</PageHeading>
    <p className="info-note">Trashed submissions are hidden from the student and excluded from progress reports. Restoring one makes its original results visible again.</p>
    {attempts.length ? <div className="review-list">{attempts.map((attempt) => <article className="card trash-item" key={attempt.id}><div><Badge tone="amber">Removed {dateLabel(attempt.deletedAt)}</Badge><h2>{getActivity(attempt.assignment.contentKey, attempt.assignment.contentVersion)?.title ?? "Assignment"}</h2><p className="muted">{attempt.assignment.student.displayName} · Attempt {attempt.number} · Submitted {dateLabel(attempt.submittedAt)}</p><Link className="small-link" href={`/teacher/assignments/${attempt.assignmentId}`}>View assignment →</Link></div><ActionForm action={restoreSubmission} successMessage="Submission restored."><input type="hidden" name="attemptId" value={attempt.id} /><SubmitButton className="button secondary" pendingLabel="Restoring…">Restore submission</SubmitButton></ActionForm></article>)}</div> : <section className="card empty-work"><span className="empty-symbol" aria-hidden="true">↺</span><h2>Nothing in the trash.</h2><p className="muted">Submissions you remove from an assignment will appear here.</p><Link className="button secondary" href="/teacher/assignments">Back to assignments</Link></section>}
  </>;
}
