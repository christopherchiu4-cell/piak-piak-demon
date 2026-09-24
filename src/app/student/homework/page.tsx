import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeading } from "@/components/ui";
import { StudentAssignmentList } from "@/components/student-assignment-list";

export default async function StudentHomeworkPage() {
  const student = await requireRole("STUDENT");
  const assignments = await db.assignment.findMany({
    where: { studentId: student.id, kind: "HOMEWORK", archivedAt: null, availableAt: { lte: new Date() } },
    include: { attempts: { where: { deletedAt: null } } }, orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
  });
  const todo = assignments.filter((item) => !item.attempts.some((attempt) => attempt.status === "SUBMITTED"));
  const done = assignments.filter((item) => item.attempts.some((attempt) => attempt.status === "SUBMITTED"));
  return <>
    <PageHeading eyebrow="Work between lessons" title="Homework">Finish what is due, then review your marked work.</PageHeading>
    <section className="section"><h2>To do</h2><StudentAssignmentList assignments={todo} emptyMessage="Nothing due. Nice work." /></section>
    {done.length > 0 && <section className="section"><h2>Submitted</h2><StudentAssignmentList assignments={done} /></section>}
  </>;
}
