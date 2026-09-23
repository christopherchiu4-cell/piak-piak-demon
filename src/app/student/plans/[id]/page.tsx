import Link from "@/components/pending-link";
import { notFound } from "next/navigation";
import { getActivity, getPlan } from "@/content/catalog";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, PageHeading, dateLabel } from "@/components/ui";

export default async function StudentPlan({ params }: { params: Promise<{ id: string }> }) {
  const student = await requireRole("STUDENT");
  const { id } = await params;
  const session = await db.classSession.findFirst({ where: { id, studentId: student.id }, include: { assignments: { where: { studentId: student.id } } } });
  if (!session) notFound();
  const plan = getPlan(session.planKey, session.planVersion);
  if (!plan) return <p className="alert">This plan version is unavailable. Ask your tutor to restore it.</p>;
  return <><PageHeading eyebrow={dateLabel(session.startsAt)} title={plan.title}>{plan.summary}</PageHeading>
    <div className="two-column"><section className="card"><Badge tone="blue">Math · 2 hours</Badge><h2>Math</h2><ul>{plan.math.map((item) => <li key={item}>{item}</li>)}</ul></section><section className="card"><Badge tone="green">English · 1 hour</Badge><h2>English</h2><ul>{plan.english.map((item) => <li key={item}>{item}</li>)}</ul></section></div>
    <div className="two-column section"><section className="card"><h2>Before class</h2><ul>{plan.preparation.map((item) => <li key={item}>{item}</li>)}</ul></section><section className="card"><h2>After-lesson notes</h2>{session.notesPublishedAt ? <p className="prose">{session.notes}</p> : <p className="muted">Your tutor has not published notes for this class yet.</p>}</section></div>
    <section className="card section"><h2>Linked activities</h2>{session.assignments.length ? <div className="list">{session.assignments.map((assignment) => <Link className="list-row" key={assignment.id} href={`/student/assignments/${assignment.id}`}><span><strong>{getActivity(assignment.contentKey, assignment.contentVersion)?.title ?? "Unavailable activity"}</strong><small>{assignment.kind === "HOMEWORK" ? "Homework" : "Classwork"}</small></span><span>→</span></Link>)}</div> : <p className="muted">No activities linked yet.</p>}</section>
  </>;
}
