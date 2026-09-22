import Link from "next/link";
import { notFound } from "next/navigation";
import { saveClassNotes } from "@/app/actions/teacher";
import { getActivity, getPlan } from "@/content/catalog";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Badge, PageHeading, dateLabel } from "@/components/ui";

export default async function ClassDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("TEACHER");
  const { id } = await params;
  const session = await db.classSession.findUnique({ where: { id }, include: { assignments: true } });
  if (!session) notFound();
  const plan = getPlan(session.planKey, session.planVersion);
  return <><PageHeading eyebrow={dateLabel(session.startsAt)} title={session.title}>Class plan and follow-up notes</PageHeading>
    {!plan && <p className="alert">The referenced plan version is missing from this deployment. Restore it in the content catalog.</p>}
    {plan && <div className="two-column"><section className="card"><Badge tone="blue">Math · 2 hours</Badge><h2>Math plan</h2><ul>{plan.math.map((item) => <li key={item}>{item}</li>)}</ul></section><section className="card"><Badge tone="green">English · 1 hour</Badge><h2>English plan</h2><ul>{plan.english.map((item) => <li key={item}>{item}</li>)}</ul></section></div>}
    {plan && <section className="card section"><h2>Preparation</h2><ul>{plan.preparation.map((item) => <li key={item}>{item}</li>)}</ul></section>}
    <div className="two-column section"><section className="card"><div className="row-between"><h2>After-lesson notes</h2><Badge tone={session.notesPublishedAt ? "green" : "amber"}>{session.notesPublishedAt ? "Published" : "Draft"}</Badge></div><form action={saveClassNotes} className="form-stack"><input type="hidden" name="classSessionId" value={id} /><label>Notes for the student<textarea name="notes" rows={9} defaultValue={session.notes} placeholder="What we covered, strengths, next steps…" /></label><div className="button-row"><button className="button secondary" name="publish" value="no">Save draft</button><button className="button primary" name="publish" value="yes">Publish notes</button></div></form><p className="hint">Draft notes are visible only to you. Published notes appear in the student&apos;s class plan.</p></section>
    <section className="card"><h2>Linked work</h2>{session.assignments.length ? <div className="list">{session.assignments.map((assignment) => <Link className="list-row" href={`/teacher/assignments/${assignment.id}`} key={assignment.id}><span><strong>{getActivity(assignment.contentKey, assignment.contentVersion)?.title ?? "Missing content"}</strong><small>{assignment.kind === "HOMEWORK" ? "Homework" : "Classwork"}</small></span><span>→</span></Link>)}</div> : <p className="muted">No activities linked yet.</p>}<Link className="button secondary" href={`/teacher/assignments?classSessionId=${id}`}>Link an assignment</Link></section></div>
  </>;
}
