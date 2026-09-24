import { AssignmentBoard, type BoardRow } from "@/components/assignment-board";
import { AssignPanel } from "@/components/assign-panel";
import { Modal } from "@/components/modal";
import { isAssignable, questionBlocks, totalPoints } from "@/content/blocks";
import { readBlocks } from "@/lib/blocks";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeading } from "@/components/ui";

export default async function AssignmentsPage() {
  await requireRole("TEACHER");
  const [students, materials, assignments] = await Promise.all([
    db.user.findMany({ where: { role: "STUDENT", active: true, archivedAt: null }, orderBy: { displayName: "asc" } }),
    db.material.findMany({ where: { archivedAt: null }, orderBy: { createdAt: "desc" } }),
    db.assignment.findMany({
      where: { archivedAt: null }, orderBy: { createdAt: "desc" }, take: 500,
      include: { student: true, attempts: { where: { deletedAt: null } } },
    }),
  ]);

  const rows: BoardRow[] = assignments.map((item) => ({
    id: item.id, title: item.title, kind: item.kind, subject: item.subject,
    studentId: item.studentId, studentName: item.student.displayName,
    scheduledAt: item.scheduledAt?.toISOString() ?? null,
    dueAt: item.dueAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    attendedAt: item.attendedAt?.toISOString() ?? null,
    submitted: item.attempts.some((attempt) => attempt.status === "SUBMITTED"),
    started: item.attempts.length > 0,
  }));

  // `ready` mirrors what assignHomework enforces, so a draft is visible before submitting.
  const toOption = (material: (typeof materials)[number]) => {
    const blocks = readBlocks(material.blocks);
    return {
      id: material.id, title: material.title, summary: material.summary, subject: material.subject,
      ready: isAssignable(blocks), questionCount: questionBlocks(blocks).length, points: totalPoints(blocks),
      createdAt: material.createdAt.toISOString(),
    };
  };

  return <>
    <div className="row-between page-heading-row">
      <PageHeading eyebrow="Scheduling" title="Assignments">What is coming up, across every student.</PageHeading>
      <Modal label="Assign" title="Assign work" className="button primary" wide description="Pick what to give, and to whom.">
        <AssignPanel
          students={students.map((student) => ({ id: student.id, displayName: student.displayName }))}
          homework={materials.filter((item) => item.kind === "HOMEWORK").map(toOption)}
          plans={materials.filter((item) => item.kind === "CLASS_PLAN").map(toOption)}
        />
      </Modal>
    </div>
    <AssignmentBoard rows={rows} />
  </>;
}
