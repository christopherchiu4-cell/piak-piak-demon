import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActivity, getPlan } from "@/content/catalog";
import { Badge, PageHeading, dateLabel } from "@/components/ui";

export default async function StudentHome() {
  const student = await requireRole("STUDENT");
  const [assignments, classes] = await Promise.all([
    db.assignment.findMany({ where: { studentId: student.id, availableAt: { lte: new Date() } }, include: { attempts: true }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.classSession.findMany({ where: { studentId: student.id }, orderBy: { startsAt: "desc" }, take: 3 }),
  ]);
  return <><PageHeading eyebrow="Student overview" title={`Hello, ${student.displayName}`}>Your lessons and assignments are ready when you are.</PageHeading>
    <div className="student-feature"><div><p className="eyebrow">Your learning space</p><h2>Plan the lesson. Do the work. See your progress.</h2><p>Class plans, in-class practice, and homework each have their own place.</p></div><div className="feature-links"><Link href="/student/plans">Class plans →</Link><Link href="/student/classwork">Classwork →</Link><Link href="/student/homework">Homework →</Link></div></div>
    <div className="two-column section"><section className="card"><div className="row-between"><h2>Recent assignments</h2><Link href="/student/homework" className="small-link">View homework</Link></div>{assignments.length ? <div className="list">{assignments.map((item) => <Link key={item.id} href={`/student/assignments/${item.id}`} className="list-row"><span><strong>{getActivity(item.contentKey, item.contentVersion)?.title ?? "Unavailable content"}</strong><small>{item.kind === "HOMEWORK" ? "Homework" : "Classwork"} · {item.subject === "MATH" ? "Math" : "English"}</small></span><Badge tone={item.attempts.some((attempt) => attempt.status === "SUBMITTED") ? "green" : "blue"}>{item.attempts.some((attempt) => attempt.status === "SUBMITTED") ? "Submitted" : "To do"}</Badge></Link>)}</div> : <p className="muted">No assignments yet.</p>}</section><section className="card"><h2>Class plans</h2>{classes.length ? <div className="list">{classes.map((item) => <Link key={item.id} href={`/student/plans/${item.id}`} className="list-row"><span><strong>{getPlan(item.planKey, item.planVersion)?.title ?? item.title}</strong><small>{dateLabel(item.startsAt)}</small></span><span>→</span></Link>)}</div> : <p className="muted">A class plan will appear here when it is linked to your work.</p>}</section></div>
  </>;
}
