import Link from "@/components/pending-link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { markAttendance, restoreSubmission } from "@/app/actions/teacher";
import { requireRole } from "@/lib/auth";
import { readBlocks } from "@/lib/blocks";
import { db } from "@/lib/db";
import { summaryByTopic } from "@/lib/grading";
import { Badge, PageHeading, dateLabel } from "@/components/ui";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("TEACHER");
  const { id } = await params;
  const student = await db.user.findUnique({ where: { id } });
  if (!student || student.role !== "STUDENT") notFound();

  const assignments = await db.assignment.findMany({
    where: { studentId: id, archivedAt: null },
    orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
    include: { attempts: { orderBy: { number: "asc" }, include: { responses: true } } },
  });

  const now = Date.now();
  const classes = assignments.filter((item) => item.kind === "CLASS_PLAN");
  const homework = assignments.filter((item) => item.kind === "HOMEWORK");
  const upcomingClasses = classes.filter((item) => item.scheduledAt && item.scheduledAt.getTime() >= now).reverse();
  const pastClasses = classes.filter((item) => !item.scheduledAt || item.scheduledAt.getTime() < now);
  const attended = classes.filter((item) => item.attendedAt).length;

  // The latest non-trashed submitted attempt is what counts for every rollup.
  const graded = homework.map((item) => {
    const submitted = item.attempts.filter((attempt) => attempt.status === "SUBMITTED" && !attempt.deletedAt);
    return { assignment: item, attempt: submitted.at(-1) ?? null };
  });
  const done = graded.filter((row) => row.attempt);
  const awaiting = done.filter((row) => row.attempt!.responses.some((response) => response.score == null)).length;
  const outstanding = homework.length - done.length;

  const topicTotals = new Map<string, { topic: string; earned: number; total: number; pending: number }>();
  for (const row of done) {
    for (const item of summaryByTopic(readBlocks(row.assignment.blocks), row.attempt!.responses)) {
      const existing = topicTotals.get(item.topic) ?? { topic: item.topic, earned: 0, total: 0, pending: 0 };
      topicTotals.set(item.topic, { topic: item.topic, earned: existing.earned + item.earned, total: existing.total + item.total, pending: existing.pending + item.pending });
    }
  }
  const trashed = assignments.flatMap((item) => item.attempts.filter((attempt) => attempt.deletedAt).map((attempt) => ({ attempt, title: item.title })));

  return <>
    <PageHeading eyebrow={<><Link className="small-link" href="/teacher/students">&larr; All students</Link></>} title={student.displayName}>
      {student.login}{student.archivedAt ? " · deleted" : student.active ? "" : " · access paused"}
    </PageHeading>

    <div className="stat-grid">
      <div className="card stat"><strong>{attended}</strong><span>Classes attended</span></div>
      <div className="card stat"><strong>{done.length}</strong><span>Homework submitted</span></div>
      <div className="card stat"><strong>{outstanding}</strong><span>Still outstanding</span></div>
      <div className="card stat"><strong>{awaiting}</strong><span>Waiting on your marking</span></div>
    </div>

    <section className="section"><h2>Upcoming classes</h2>
      {upcomingClasses.length ? <div className="list">{upcomingClasses.map((item) => <div className="list-row" key={item.id}>
        <div className="grow"><Link className="row-title" href={`/teacher/assignments/${item.id}`}>{item.title}</Link><p className="row-meta">{dateLabel(item.scheduledAt)}</p></div>
        <Badge tone="blue">{item.subject === "MATH" ? "Math" : "English"}</Badge>
      </div>)}</div> : <section className="card"><p className="empty-work">No classes scheduled. <Link className="small-link" href="/teacher/assignments">Schedule one</Link>.</p></section>}
    </section>

    <section className="section"><h2>Class history</h2>
      {pastClasses.length ? <div className="list">{pastClasses.map((item) => <div className="list-row" key={item.id}>
        <div className="grow"><Link className="row-title" href={`/teacher/assignments/${item.id}`}>{item.title}</Link><p className="row-meta">{dateLabel(item.scheduledAt)}{item.notesPublishedAt ? " · notes published" : item.notes ? " · notes in draft" : ""}</p></div>
        <Badge tone={item.attendedAt ? "green" : "neutral"}>{item.attendedAt ? "Attended" : "Not marked"}</Badge>
        <ActionForm action={markAttendance} feedbackPlacement="toast" successMessage="Attendance updated.">
          <input type="hidden" name="assignmentId" value={item.id} />
          <SubmitButton className="text-button" pendingLabel="Saving…">{item.attendedAt ? "Unmark" : "Mark attended"}</SubmitButton>
        </ActionForm>
      </div>)}</div> : <section className="card"><p className="empty-work">No classes yet.</p></section>}
    </section>

    <section className="section"><h2>Homework</h2>
      {homework.length ? <div className="list">{graded.map(({ assignment, attempt }) => {
        const earned = attempt?.responses.reduce((sum, response) => sum + (response.score ?? 0), 0) ?? 0;
        const total = attempt?.responses.reduce((sum, response) => sum + response.maxPoints, 0) ?? 0;
        const pending = attempt?.responses.some((response) => response.score == null) ?? false;
        const overdue = !attempt && assignment.dueAt != null && assignment.dueAt.getTime() < now;
        return <div className="list-row" key={assignment.id}>
          <div className="grow"><Link className="row-title" href={`/teacher/assignments/${assignment.id}`}>{assignment.title}</Link>
            <p className="row-meta">{assignment.dueAt ? `Due ${dateLabel(assignment.dueAt)}` : "No due date"}{attempt ? ` · submitted ${dateLabel(attempt.submittedAt)}` : ""}</p></div>
          {attempt ? <Badge tone={pending ? "amber" : "green"}>{pending ? `${earned}/${total} · needs marking` : `${earned}/${total}`}</Badge>
            : <Badge tone={overdue ? "amber" : "neutral"}>{overdue ? "Overdue" : "Not started"}</Badge>}
        </div>;
      })}</div> : <section className="card"><p className="empty-work">No homework assigned yet.</p></section>}
    </section>

    {topicTotals.size > 0 && <section className="section"><h2>Strengths by topic</h2>
      <div className="topic-grid">{[...topicTotals.values()].map((row) => <div className="card topic-card" key={row.topic}>
        <p className="eyebrow">{row.topic}</p>
        <strong>{row.earned}/{row.total}</strong>
        {row.pending > 0 && <p className="muted">{row.pending} point{row.pending === 1 ? "" : "s"} awaiting marking</p>}
      </div>)}</div>
    </section>}

    {trashed.length > 0 && <details className="card"><summary>{trashed.length} submission{trashed.length === 1 ? "" : "s"} in the bin</summary>
      <div className="list">{trashed.map(({ attempt, title }) => <div className="list-row" key={attempt.id}>
        <div className="grow"><strong>{title}</strong><p className="row-meta">Attempt {attempt.number} · removed {dateLabel(attempt.deletedAt)}</p></div>
        <ActionForm action={restoreSubmission} feedbackPlacement="toast" successMessage="Restored.">
          <input type="hidden" name="attemptId" value={attempt.id} />
          <SubmitButton className="text-button" pendingLabel="Restoring…">Restore</SubmitButton>
        </ActionForm>
      </div>)}</div>
    </details>}
  </>;
}
