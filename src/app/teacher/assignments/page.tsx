import Link from "next/link";
import { createAssignment } from "@/app/actions/teacher";
import { activities, getActivity } from "@/content/catalog";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Badge, PageHeading, dateLabel } from "@/components/ui";

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<{ classSessionId?: string }> }) {
  await requireRole("TEACHER");
  const selectedClass = (await searchParams).classSessionId;
  const [students, classes, assignments] = await Promise.all([
    db.user.findMany({ where: { role: "STUDENT", active: true }, orderBy: { displayName: "asc" } }),
    db.classSession.findMany({ orderBy: { startsAt: "desc" } }),
    db.assignment.findMany({ include: { student: true, attempts: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return <><PageHeading eyebrow="Assign work" title="Assignments">Choose deployed content for homework or classwork. Each new assignment starts with one allowed attempt.</PageHeading>
    <div className="two-column"><section className="card"><h2>New assignment</h2><form action={createAssignment} className="form-stack"><label>Student<select name="studentId" required>{students.map((student) => <option key={student.id} value={student.id}>{student.displayName}</option>)}</select></label><label>Content<select name="content" required>{activities.map((item) => <option key={`${item.key}@${item.version}`} value={`${item.key}@${item.version}`}>{item.subject === "MATH" ? "Math" : "English"} · {item.title} · v{item.version}</option>)}</select></label><label>Work type<select name="kind"><option value="HOMEWORK">Homework</option><option value="CLASSWORK">Classwork</option></select></label><label>Related class (optional)<select name="classSessionId" defaultValue={selectedClass ?? ""}><option value="">No class link</option>{classes.map((item) => <option value={item.id} key={item.id}>{item.title} · {dateLabel(item.startsAt)}</option>)}</select></label><label>Due date (optional)<input type="datetime-local" name="dueAt" /></label><button className="button primary" disabled={!students.length}>Assign activity</button></form>{!students.length && <p className="hint">Create a student account before assigning work.</p>}</section>
    <section className="card"><h2>Assigned work</h2>{assignments.length ? <div className="list">{assignments.map((item) => <Link key={item.id} href={`/teacher/assignments/${item.id}`} className="list-row"><span><strong>{getActivity(item.contentKey, item.contentVersion)?.title ?? "Missing content"}</strong><small>{item.student.displayName} · {item.kind === "HOMEWORK" ? "Homework" : "Classwork"} · {dateLabel(item.createdAt)}</small></span><Badge tone={item.attempts.some((attempt) => attempt.status === "SUBMITTED") ? "green" : "blue"}>{item.attempts.filter((attempt) => attempt.status === "SUBMITTED").length} submitted</Badge></Link>)}</div> : <p className="muted">No assignments yet.</p>}</section></div>
  </>;
}
