import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeading } from "@/components/ui";
import { StudentAssignmentList } from "@/components/student-assignment-list";

export default async function HomeworkPage() {
  const student = await requireRole("STUDENT");
  const assignments = await db.assignment.findMany({ where: { studentId: student.id, kind: "HOMEWORK", availableAt: { lte: new Date() } }, include: { attempts: { where: { deletedAt: null } } }, orderBy: { createdAt: "desc" } });
  return <><PageHeading eyebrow="Work between lessons" title="Homework">Complete your assignments and review each submitted attempt.</PageHeading><StudentAssignmentList assignments={assignments} /></>;
}
