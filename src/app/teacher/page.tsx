import Link from "@/components/pending-link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, EmptyState, PageHeading, Stat, dateLabel } from "@/components/ui";

export default async function TeacherOverview() {
  const teacher = await requireRole("TEACHER");
  const now = new Date();

  const [needsGrading, upcomingClasses, dueHomework, students] = await Promise.all([
    // Short answers a student has submitted that nobody has scored yet.
    db.response.findMany({
      where: { score: null, attempt: { status: "SUBMITTED", deletedAt: null, assignment: { teacherId: teacher.id, archivedAt: null } } },
      include: { attempt: { include: { assignment: { include: { student: true } } } } },
      orderBy: { updatedAt: "asc" },
    }),
    db.assignment.findMany({
      where: { kind: "CLASS_PLAN", archivedAt: null, scheduledAt: { gte: now } },
      orderBy: { scheduledAt: "asc" }, take: 5, include: { student: true },
    }),
    db.assignment.findMany({
      where: { kind: "HOMEWORK", archivedAt: null, dueAt: { not: null }, attempts: { none: { status: "SUBMITTED", deletedAt: null } } },
      orderBy: { dueAt: "asc" }, take: 5, include: { student: true },
    }),
    db.user.findMany({ where: { role: "STUDENT", archivedAt: null }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  // One row per submitted attempt, not per unscored question.
  const gradingQueue = [...new Map(needsGrading.map((response) => [response.attempt.assignment.id, {
    assignment: response.attempt.assignment,
    submittedAt: response.attempt.submittedAt,
    count: needsGrading.filter((item) => item.attempt.assignment.id === response.attempt.assignment.id).length,
  }])).values()];

  return <>
    <PageHeading eyebrow="Overview" title={`Welcome back, ${teacher.displayName}`}>Everything waiting on you, in one place.</PageHeading>

    <div className="stat-grid">
      <Stat value={gradingQueue.length} label="Waiting to be marked" />
      <Stat value={upcomingClasses.length} label="Upcoming classes" />
      <Stat value={dueHomework.length} label="Homework outstanding" />
    </div>

    <section className="section">
      <div className="row-between"><h2>Needs your marking</h2>{gradingQueue.length > 0 && <Badge tone="amber">{gradingQueue.length}</Badge>}</div>
      {gradingQueue.length ? <div className="list">{gradingQueue.map((row) => <div className="list-row" key={row.assignment.id}>
        <div className="grow"><Link className="row-title" href={`/teacher/assignments/${row.assignment.id}`}>{row.assignment.title}</Link>
          <p className="row-meta">{row.assignment.student.displayName} · submitted {dateLabel(row.submittedAt)}</p></div>
        <Badge tone="amber">{row.count} answer{row.count === 1 ? "" : "s"}</Badge>
        <Link className="button subtle" href={`/teacher/assignments/${row.assignment.id}`}>Mark</Link>
      </div>)}</div> : <EmptyState>Nothing to mark. You are all caught up.</EmptyState>}
    </section>

    <div className="two-column">
      <section className="section"><h2>Upcoming classes</h2>
        {upcomingClasses.length ? <div className="list">{upcomingClasses.map((item) => <div className="list-row" key={item.id}>
          <div className="grow"><Link className="row-title" href={`/teacher/assignments/${item.id}`}>{item.title}</Link>
            <p className="row-meta">{item.student.displayName} · {dateLabel(item.scheduledAt)}</p></div>
        </div>)}</div> : <EmptyState>No classes scheduled. <Link className="small-link" href="/teacher/assignments">Schedule one</Link>.</EmptyState>}
      </section>

      <section className="section"><h2>Homework outstanding</h2>
        {dueHomework.length ? <div className="list">{dueHomework.map((item) => {
          const overdue = item.dueAt != null && item.dueAt < now;
          return <div className="list-row" key={item.id}>
            <div className="grow"><Link className="row-title" href={`/teacher/assignments/${item.id}`}>{item.title}</Link>
              <p className="row-meta">{item.student.displayName} · due {dateLabel(item.dueAt)}</p></div>
            {overdue && <Badge tone="amber">Overdue</Badge>}
          </div>;
        })}</div> : <EmptyState>Nothing outstanding.</EmptyState>}
      </section>
    </div>

    <section className="section">
      <div className="row-between"><h2>Students</h2><Link className="small-link" href="/teacher/students">All students &rarr;</Link></div>
      {students.length ? <div className="list">{students.map((student) => <div className="list-row" key={student.id}>
        <div className="grow"><Link className="row-title" href={`/teacher/students/${student.id}`}>{student.displayName}</Link><p className="row-meta">{student.login}</p></div>
        <Badge tone={student.active ? "green" : "amber"}>{student.active ? "Active" : "Paused"}</Badge>
      </div>)}</div> : <EmptyState>No students yet. <Link className="small-link" href="/teacher/students">Add your first one</Link>.</EmptyState>}
    </section>
  </>;
}
