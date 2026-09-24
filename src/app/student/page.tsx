import Link from "@/components/pending-link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, EmptyState, PageHeading, dateLabel } from "@/components/ui";

export default async function StudentOverview() {
  const student = await requireRole("STUDENT");
  const now = new Date();

  const [nextClasses, homework] = await Promise.all([
    db.assignment.findMany({
      where: { studentId: student.id, kind: "CLASS_PLAN", archivedAt: null, scheduledAt: { gte: now } },
      orderBy: { scheduledAt: "asc" }, take: 3,
    }),
    db.assignment.findMany({
      where: { studentId: student.id, kind: "HOMEWORK", archivedAt: null, availableAt: { lte: now } },
      include: { attempts: { where: { deletedAt: null } } }, orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const todo = homework.filter((item) => !item.attempts.some((attempt) => attempt.status === "SUBMITTED"));
  const recent = homework.filter((item) => item.attempts.some((attempt) => attempt.status === "SUBMITTED")).slice(0, 3);
  const nextClass = nextClasses[0];

  return <>
    <PageHeading eyebrow="Your portal" title={`Hi ${student.displayName}`}>Here is what is coming up and what needs doing.</PageHeading>

    {nextClass && <section className="card result-hero">
      <div><p className="eyebrow">Your next class</p><h2>{nextClass.title}</h2><p className="muted">{dateLabel(nextClass.scheduledAt)}</p></div>
      <Link className="button primary" href={`/student/assignments/${nextClass.id}`}>See the plan</Link>
    </section>}

    <section className="section">
      <div className="row-between"><h2>Homework to do</h2><Link className="small-link" href="/student/homework">All homework &rarr;</Link></div>
      {todo.length ? <div className="list">{todo.map((item) => {
        const overdue = item.dueAt != null && item.dueAt < now;
        const started = item.attempts.some((attempt) => attempt.status === "IN_PROGRESS");
        return <div className="list-row" key={item.id}>
          <div className="grow"><Link className="row-title" href={`/student/assignments/${item.id}`}>{item.title}</Link>
            <p className="row-meta">{item.dueAt ? `Due ${dateLabel(item.dueAt)}` : "No due date"}</p></div>
          {overdue && <Badge tone="amber">Overdue</Badge>}
          <Link className="button subtle" href={`/student/assignments/${item.id}`}>{started ? "Continue" : "Start"}</Link>
        </div>;
      })}</div> : <EmptyState>Nothing due right now. Well done.</EmptyState>}
    </section>

    {nextClasses.length > 1 && <section className="section">
      <div className="row-between"><h2>Also coming up</h2><Link className="small-link" href="/student/classes">All classes &rarr;</Link></div>
      <div className="list">{nextClasses.slice(1).map((item) => <div className="list-row" key={item.id}>
        <div className="grow"><Link className="row-title" href={`/student/assignments/${item.id}`}>{item.title}</Link><p className="row-meta">{dateLabel(item.scheduledAt)}</p></div>
      </div>)}</div>
    </section>}

    {recent.length > 0 && <section className="section"><h2>Recently marked</h2>
      <div className="list">{recent.map((item) => <div className="list-row" key={item.id}>
        <div className="grow"><Link className="row-title" href={`/student/assignments/${item.id}`}>{item.title}</Link><p className="row-meta">Submitted</p></div>
        <Badge tone="green">Done</Badge>
      </div>)}</div>
    </section>}
  </>;
}
