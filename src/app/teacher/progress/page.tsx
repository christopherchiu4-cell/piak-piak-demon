import Link from "@/components/pending-link";
import { getActivity } from "@/content/catalog";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { summaryByTopic } from "@/lib/grading";
import { Badge, PageHeading } from "@/components/ui";

type Score = { earned: number; graded: number; pending: number; attempts: number };
const empty = (): Score => ({ earned: 0, graded: 0, pending: 0, attempts: 0 });

export default async function ProgressPage() {
  await requireRole("TEACHER");
  const students = await db.user.findMany({ where: { role: "STUDENT" }, include: {
    studentAssignments: { include: { attempts: { where: { status: "SUBMITTED", deletedAt: null }, orderBy: { number: "desc" }, include: { responses: true } } } },
  }, orderBy: { displayName: "asc" } });
  return <><PageHeading eyebrow="Learning progress" title="Results by subject and topic">This overview uses the most recent submitted attempt for each assignment. Open an assignment to see every attempt and question.</PageHeading>
    {students.length ? students.map((student) => {
      const subjects = new Map<string, Score>();
      const topics = new Map<string, Score>();
      const recent: Array<{ id: string; title: string; subject: string; earned: number; graded: number; pending: number }> = [];
      for (const assignment of student.studentAssignments) {
        const attempt = assignment.attempts[0];
        const activity = getActivity(assignment.contentKey, assignment.contentVersion);
        if (!attempt || !activity) continue;
        const rows = summaryByTopic(activity, attempt.responses);
        const subject = subjects.get(assignment.subject) ?? empty();
        subject.attempts += 1;
        let assignmentEarned = 0, assignmentGraded = 0, assignmentPending = 0;
        for (const row of rows) {
          const graded = row.total - row.pending;
          subject.earned += row.earned; subject.graded += graded; subject.pending += row.pending;
          assignmentEarned += row.earned; assignmentGraded += graded; assignmentPending += row.pending;
          const key = `${assignment.subject}:${row.topic}`;
          const topic = topics.get(key) ?? empty();
          topic.earned += row.earned; topic.graded += graded; topic.pending += row.pending; topic.attempts += 1;
          topics.set(key, topic);
        }
        subjects.set(assignment.subject, subject);
        recent.push({ id: assignment.id, title: activity.title, subject: assignment.subject, earned: assignmentEarned, graded: assignmentGraded, pending: assignmentPending });
      }
      return <section className="section" key={student.id}><h2>{student.displayName}</h2><div className="two-column">{["MATH", "ENGLISH"].map((name) => { const score = subjects.get(name) ?? empty(); return <div className="card" key={name}><Badge tone={name === "MATH" ? "blue" : "green"}>{name === "MATH" ? "Math" : "English"}</Badge><h3>{score.earned} / {score.graded} graded points</h3><p className="muted">{score.attempts} submitted assignments · {score.pending} points pending review</p></div>; })}</div><div className="two-column section"><div className="card"><h3>Topics</h3>{topics.size ? <div className="list">{[...topics.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([key, score]) => <div className="list-row" key={key}><span><strong>{key.split(":")[1]}</strong><small>{key.startsWith("MATH") ? "Math" : "English"} · {score.attempts} assignments</small></span><span>{score.earned}/{score.graded}{score.pending ? ` · ${score.pending} pending` : ""}</span></div>)}</div> : <p className="muted">No submitted work yet.</p>}</div><div className="card"><h3>Submitted assignments</h3>{recent.length ? <div className="list">{recent.map((item) => <Link href={`/teacher/assignments/${item.id}`} className="list-row" key={item.id}><span><strong>{item.title}</strong><small>{item.subject === "MATH" ? "Math" : "English"}</small></span><span>{item.earned}/{item.graded}{item.pending ? " + review" : ""}</span></Link>)}</div> : <p className="muted">No submitted work yet.</p>}</div></div></section>;
    }) : <section className="card"><p className="muted">Create a student account to begin tracking progress.</p></section>}
  </>;
}
