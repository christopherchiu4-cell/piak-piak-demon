import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeading } from "@/components/ui";
import { StudentAssignmentList } from "@/components/student-assignment-list";

export default async function ClassworkPage() {
  const student = await requireRole("STUDENT");
  const assignments = await db.assignment.findMany({ where: { studentId: student.id, kind: "CLASSWORK", availableAt: { lte: new Date() } }, include: { attempts: { where: { deletedAt: null } } }, orderBy: { createdAt: "desc" } });
  return <><PageHeading eyebrow="Work during lessons" title="Classwork">Activities your tutor has assigned for class.</PageHeading><StudentAssignmentList assignments={assignments} /></>;
}
