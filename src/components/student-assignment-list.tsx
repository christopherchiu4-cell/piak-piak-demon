import Link from "@/components/pending-link";
import { Badge, dateLabel } from "@/components/ui";

type AssignmentRow = {
  id: string; title: string; summary: string; subject: "MATH" | "ENGLISH"; kind: "CLASS_PLAN" | "HOMEWORK";
  dueAt: Date | null; scheduledAt: Date | null; attempts: Array<{ status: "IN_PROGRESS" | "SUBMITTED" }>;
};

export function StudentAssignmentList({ assignments, emptyMessage = "Nothing assigned here yet." }: { assignments: AssignmentRow[]; emptyMessage?: string }) {
  if (!assignments.length) return <section className="card"><p className="empty-work">{emptyMessage}</p></section>;
  const now = Date.now();
  return <div className="card-grid">{assignments.map((item) => {
    const submitted = item.attempts.some((attempt) => attempt.status === "SUBMITTED");
    const inProgress = item.attempts.some((attempt) => attempt.status === "IN_PROGRESS");
    const overdue = !submitted && item.dueAt != null && item.dueAt.getTime() < now;
    const when = item.kind === "CLASS_PLAN"
      ? (item.scheduledAt ? dateLabel(item.scheduledAt) : "Not scheduled")
      : (item.dueAt ? `Due ${dateLabel(item.dueAt)}` : "No due date");
    return <Link className={`card assignment-card${overdue ? " overdue" : ""}`} key={item.id} href={`/student/assignments/${item.id}`}>
      <div className="row-between"><Badge tone="blue">{item.subject === "MATH" ? "Math" : "English"}</Badge>
        <Badge tone={submitted ? "green" : overdue ? "amber" : inProgress ? "amber" : "neutral"}>{overdue ? "Overdue" : inProgress ? "In progress" : submitted ? "Done" : "To do"}</Badge></div>
      <h2>{item.title}</h2>
      {item.summary && <p className="muted">{item.summary}</p>}
      <div className="assignment-card-foot"><span>{when}</span><strong>Open →</strong></div>
    </Link>;
  })}</div>;
}
