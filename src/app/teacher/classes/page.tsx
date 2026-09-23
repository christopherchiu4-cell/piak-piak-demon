import { ActionForm, SubmitButton } from "@/components/action-form";
import Link from "@/components/pending-link";
import { createClassSession } from "@/app/actions/teacher";
import { plans } from "@/content/catalog";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Badge, PageHeading, dateLabel } from "@/components/ui";

export default async function ClassesPage() {
  await requireRole("TEACHER");
  const [classes, students] = await Promise.all([
    db.classSession.findMany({ orderBy: { startsAt: "desc" } }),
    db.user.findMany({ where: { role: "STUDENT", active: true }, orderBy: { displayName: "asc" } }),
  ]);
  return <><PageHeading eyebrow="Lesson planning" title="Classes">Schedule a three-hour class using a deployed plan. Add lesson notes afterward.</PageHeading>
    <div className="two-column"><section className="card"><h2>Schedule class</h2><ActionForm action={createClassSession} className="form-stack"><label>Student<select name="studentId" required>{students.map((student) => <option key={student.id} value={student.id}>{student.displayName}</option>)}</select></label><label>Class date and time<input type="datetime-local" name="startsAt" required /></label><label>Title<input name="title" placeholder="Optional custom title" /></label><label>Deployed plan<select name="plan" required>{plans.map((plan) => <option value={`${plan.key}@${plan.version}`} key={`${plan.key}@${plan.version}`}>{plan.title} · v{plan.version}</option>)}</select></label><p className="hint">The class plan includes a two-hour Math block and one-hour English block. Times use China Standard Time.</p><SubmitButton className="button primary" disabled={!students.length} pendingLabel="Scheduling…">Schedule class</SubmitButton></ActionForm></section><section className="card"><h2>Scheduled classes</h2>{classes.length ? <div className="list">{classes.map((item) => <Link key={item.id} href={`/teacher/classes/${item.id}`} className="list-row"><span><strong>{item.title}</strong><small>{dateLabel(item.startsAt)}</small></span><Badge tone={item.notesPublishedAt ? "green" : "blue"}>{item.notesPublishedAt ? "Notes live" : "Plan live"}</Badge></Link>)}</div> : <p className="muted">No classes scheduled yet.</p>}</section></div>
  </>;
}
