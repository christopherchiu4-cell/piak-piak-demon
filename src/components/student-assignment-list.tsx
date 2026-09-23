import Link from "@/components/pending-link";
import { getActivity } from "@/content/catalog";
import { Badge, dateLabel } from "@/components/ui";

type AssignmentRow = {
  id: string; contentKey: string; contentVersion: number; subject: "MATH" | "ENGLISH";
  dueAt: Date | null; attempts: Array<{ status: "IN_PROGRESS" | "SUBMITTED" }>;
};

export function StudentAssignmentList({ assignments }: { assignments: AssignmentRow[] }) {
  if (!assignments.length) return <section className="card"><p className="muted">Nothing assigned here yet.</p></section>;
  return <div className="card-grid">{assignments.map((item) => {
    const activity = getActivity(item.contentKey, item.contentVersion);
    const submitted = item.attempts.some((attempt) => attempt.status === "SUBMITTED");
    const inProgress = item.attempts.some((attempt) => attempt.status === "IN_PROGRESS");
    return <Link className="card assignment-card" key={item.id} href={`/student/assignments/${item.id}`}><div className="row-between"><Badge tone="blue">{item.subject === "MATH" ? "Math" : "English"}</Badge><Badge tone={submitted ? "green" : inProgress ? "amber" : "neutral"}>{inProgress ? "In progress" : submitted ? "Submitted" : "Ready"}</Badge></div><h2>{activity?.title ?? "Content unavailable"}</h2><p className="muted">{activity?.summary}</p><div className="assignment-card-foot"><span>{item.dueAt ? `Due ${dateLabel(item.dueAt)}` : "No due date"}</span><strong>Open →</strong></div></Link>;
  })}</div>;
}
