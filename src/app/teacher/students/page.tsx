import { ActionForm, SubmitButton } from "@/components/action-form";
import { createStudent } from "@/app/actions/teacher";
import { CodeField } from "@/components/code-field";
import { Modal } from "@/components/modal";
import { StudentDirectory, type StudentRow } from "@/components/student-directory";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PageHeading } from "@/components/ui";

export default async function StudentsPage() {
  await requireRole("TEACHER");
  const students = await db.user.findMany({
    where: { role: "STUDENT" },
    orderBy: [{ archivedAt: "asc" }, { displayName: "asc" }],
    include: { _count: { select: { studentAssignments: true } } },
  });
  // Dates are serialised for the client component; it re-hydrates them for display.
  const rows: StudentRow[] = students.map((student) => ({
    id: student.id, displayName: student.displayName, login: student.login,
    accessCode: student.accessCode, active: student.active,
    archivedAt: student.archivedAt?.toISOString() ?? null,
    createdAt: student.createdAt.toISOString(),
    assignedCount: student._count.studentAssignments,
  }));

  return <>
    <div className="row-between page-heading-row">
      <PageHeading eyebrow="People" title="Students">Add a student, open one to see their progress, or manage their access.</PageHeading>
      <Modal label="Add student" title="Add a student" className="button primary" description="They sign in with this username and code.">
        <ActionForm action={createStudent} className="form-stack" closeOnSuccess successMessage="Student added.">
          <label className="field">Student name<input name="displayName" required autoFocus /></label>
          <label className="field">Username<input name="login" minLength={3} required autoCapitalize="none" autoComplete="off" placeholder="lowercase, no spaces" /></label>
          <CodeField />
          <SubmitButton className="button primary" pendingLabel="Creating…">Create access</SubmitButton>
        </ActionForm>
      </Modal>
    </div>
    <StudentDirectory students={rows} />
  </>;
}
