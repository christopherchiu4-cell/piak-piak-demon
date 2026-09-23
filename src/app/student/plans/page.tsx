import Link from "@/components/pending-link";
import { getPlan } from "@/content/catalog";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, PageHeading, dateLabel } from "@/components/ui";

export default async function PlansPage() {
  const student = await requireRole("STUDENT");
  const classes = await db.classSession.findMany({ where: { studentId: student.id }, orderBy: { startsAt: "desc" } });
  return <><PageHeading eyebrow="Before and after class" title="Class plans">Read the plan before class. Published lesson notes appear afterward.</PageHeading>
    {classes.length ? <div className="card-grid">{classes.map((item) => <Link className="card assignment-card" key={item.id} href={`/student/plans/${item.id}`}><div className="row-between"><Badge tone="blue">Math + English</Badge><Badge tone={item.notesPublishedAt ? "green" : "neutral"}>{item.notesPublishedAt ? "Notes available" : "Plan available"}</Badge></div><h2>{getPlan(item.planKey, item.planVersion)?.title ?? item.title}</h2><p className="muted">{dateLabel(item.startsAt)}</p><div className="assignment-card-foot"><span>2 hours Math · 1 hour English</span><strong>Open →</strong></div></Link>)}</div> : <section className="card"><p className="muted">No class plan is scheduled for you yet.</p></section>}
  </>;
}
