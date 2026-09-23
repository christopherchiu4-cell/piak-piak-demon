import Link from "@/components/pending-link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PageHeading, Badge, dateLabel } from "@/components/ui";

export default async function TeacherHome() {
  await requireRole("TEACHER");
  const [students, assignments, classes, pending] = await Promise.all([
    db.user.count({ where: { role: "STUDENT", active: true } }),
    db.assignment.count(),
    db.classSession.findMany({ orderBy: { startsAt: "desc" }, take: 3 }),
    db.response.count({ where: { score: null, attempt: { status: "SUBMITTED", deletedAt: null } } }),
  ]);
  return <><PageHeading eyebrow="Teacher overview" title="Your tutoring workspace">Plan a class, assign work, and review the student&apos;s progress.</PageHeading>
    <div className="stat-grid"><div className="stat"><span>Active students</span><strong>{students}</strong></div><div className="stat"><span>Assignments</span><strong>{assignments}</strong></div><div className="stat"><span>Written answers to grade</span><strong>{pending}</strong></div></div>
    <div className="two-column"><section className="card"><h2>Quick actions</h2><div className="action-stack"><Link className="button primary" href="/teacher/assignments">Assign deployed content</Link><Link className="button secondary" href="/teacher/classes">Schedule a class</Link><Link className="button secondary" href="/teacher/students">Manage student access</Link></div></section><section className="card"><h2>Recent classes</h2>{classes.length ? <div className="list">{classes.map((item) => <Link className="list-row" href={`/teacher/classes/${item.id}`} key={item.id}><span><strong>{item.title}</strong><small>{dateLabel(item.startsAt)}</small></span><Badge tone={item.notesPublishedAt ? "green" : "amber"}>{item.notesPublishedAt ? "Notes published" : "Notes pending"}</Badge></Link>)}</div> : <p className="muted">No classes scheduled yet.</p>}</section></div>
  </>;
}
